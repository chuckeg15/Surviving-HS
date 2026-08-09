/**
 * Audio engine. Everything is synthesized with the Web Audio API at runtime —
 * the game ships no audio files and never will.
 *
 * Shape of the thing:
 *
 *   sfx voices ─────────────────────────────┐
 *   music (MusicDirector) ─► musicGain ─┐   │
 *   ambience bed ─────────► ambGain ────┴─► duck ─┐
 *                                                 ├─► master ─► comp ─► out
 *   sfx ───────────────────► sfxGain ─────────────┘
 *
 * `duck` sits above music+ambience only, so a reveal sting can push the world
 * down without pushing itself down with it. The compressor is a safety net for
 * the case where a klaxon, a battle and six footsteps land on the same frame,
 * not a mastering tool.
 *
 * The context is built lazily on the first `resume()` (which must come from a
 * user gesture). Before that every method is a no-op that records intent: the
 * title screen can ask for music before the browser allows any, and it starts
 * when the player presses a key. Intent is one slot per channel, never a queue.
 */

import { MusicDirector, type NoiseBuffers } from '@/core/music';
import { Rng } from '@/core/rng';
import { settings, type SettingsStore } from '@/core/settings';

export type { MusicId } from '@/core/music';
import type { MusicId } from '@/core/music';

export type SfxId =
  | 'ui.move' | 'ui.select' | 'ui.back' | 'ui.error' | 'ui.open' | 'ui.close' | 'text.blip'
  | 'step.metal' | 'step.grate' | 'step.carpet' | 'step.tile' | 'step.soil'
  | 'door.open' | 'door.close' | 'door.locked' | 'hatch'
  | 'terminal.on' | 'terminal.key' | 'terminal.deny'
  | 'clue.found' | 'clue.link' | 'quest.update' | 'pickup' | 'relation.up' | 'relation.down'
  | 'loom.project' | 'battle.start' | 'battle.win' | 'battle.lose' | 'scan'
  | 'hit.kinetic' | 'hit.thermal' | 'hit.field' | 'hit.cognitive' | 'hit.corrosive'
  | 'shield' | 'heal' | 'status.apply' | 'revenant.collapse'
  | 'alarm.short' | 'klaxon';

export type AmbienceId =
  | 'hab' | 'commons' | 'spine' | 'medical' | 'registry' | 'cargo' | 'watch' | 'silence' | 'alarm';

/** Output trim. Leaves the compressor something to work with. */
const HEADROOM = 0.85;
/** Concurrent sfx voices. Past this, new non-blip sfx are dropped. */
const MAX_VOICES = 28;
/** Ambience one-shots are scheduled this far ahead by the bed ticker. */
const AMB_LOOKAHEAD = 0.6;
const AMB_TICK_MS = 120;
/** Per-id minimum spacing. Stops repeat-callers from stacking into mush. */
const SFX_GAP: Partial<Record<SfxId, number>> = {
  'text.blip': 0.024, // dialogue calls this per character at up to ~80 cps
  'terminal.key': 0.03,
  'step.metal': 0.07,
  'step.grate': 0.07,
  'step.carpet': 0.07,
  'step.tile': 0.07,
  'step.soil': 0.07,
  'ui.move': 0.03,
  'hit.kinetic': 0.04,
  'hit.thermal': 0.04,
  'hit.field': 0.04,
  'hit.cognitive': 0.04,
  'hit.corrosive': 0.04,
  scan: 0.15,
  klaxon: 1.5,
};

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

// ---------------------------------------------------------------------------
// noise
// ---------------------------------------------------------------------------

/**
 * One buffer per colour, generated once and shared by every burst and bed.
 * The head is cross-faded against material sampled just past the end so the
 * loop point is continuous — raw noise loops click once per period.
 */
function makeNoise(ctx: AudioContext, seconds: number, pink: boolean, seed: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const n = Math.floor(seconds * rate);
  const fade = Math.floor(0.05 * rate);
  const rng = new Rng(seed);
  const tmp = new Float32Array(n + fade);
  if (pink) {
    // Kellet's economical pink filter: close enough to -3 dB/oct for a ship
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < tmp.length; i++) {
      const w = rng.next() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      tmp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    for (let i = 0; i < tmp.length; i++) tmp[i] = rng.next() * 2 - 1;
  }
  const buf = ctx.createBuffer(1, n, rate);
  const d = buf.getChannelData(0);
  d.set(tmp.subarray(0, n));
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    d[i] = tmp[i] * w + tmp[n + i] * (1 - w);
  }
  return buf;
}

// ---------------------------------------------------------------------------
// sfx voice
// ---------------------------------------------------------------------------

/**
 * One `sfx()` call. Holds the per-call gain (and panner, only if asked for) and
 * refcounts its sources: when the last one ends, the whole chain is
 * disconnected. Nothing survives its own sound.
 */
class SfxVoice {
  readonly out: GainNode;
  private panner: StereoPannerNode | null = null;
  private extra: AudioNode[] = [];
  private srcs: AudioScheduledSourceNode[] = [];
  private pending = 0;
  private done = false;

  constructor(ctx: AudioContext, dest: AudioNode, level: number, pan: number, private onDone: () => void) {
    const now = ctx.currentTime;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(clamp(level, 0, 4), now);
    if (pan !== 0) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(clamp(pan, -1, 1), now);
      this.out.connect(p);
      p.connect(dest);
      this.panner = p;
    } else {
      this.out.connect(dest);
    }
  }

  own<T extends AudioNode>(n: T): T {
    this.extra.push(n);
    return n;
  }

  play(src: AudioScheduledSourceNode, t: number, stopAt: number, offset?: number): void {
    this.pending++;
    this.srcs.push(src);
    src.onended = () => {
      src.disconnect();
      if (--this.pending === 0) this.finish();
    };
    if (offset !== undefined && src instanceof AudioBufferSourceNode) src.start(t, offset);
    else src.start(t);
    src.stop(stopAt);
  }

  /** Called once the sfx has been rendered; catches the zero-source case. */
  seal(): void {
    if (this.pending === 0) this.finish();
  }

  /** Hard cut for stopAll/dispose. The bus is ramped first so it does not click. */
  cut(ctx: AudioContext, at: number): void {
    const now = ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, at);
    for (const s of this.srcs) {
      try {
        s.stop(at);
      } catch {
        /* already stopped */
      }
    }
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    for (const n of this.extra) n.disconnect();
    this.extra.length = 0;
    this.srcs.length = 0;
    this.out.disconnect();
    this.panner?.disconnect();
    this.onDone();
  }
}

// ---------------------------------------------------------------------------
// ambience beds
// ---------------------------------------------------------------------------

interface BedEvent {
  next: number;
  min: number;
  max: number;
  fire(t: number): void;
}

interface LoopOpts {
  pink?: boolean;
  type?: BiquadFilterType;
  freq: number;
  q?: number;
  gain: number;
  /** playbackRate; below 1 drags the noise down into rumble */
  rate?: number;
  lfoRate?: number;
  lfoDepth?: number;
}

interface ToneOpts {
  freq: number;
  gain: number;
  type?: OscillatorType;
  /** vibrato/drift in Hz applied to the oscillator frequency */
  lfoRate?: number;
  lfoDepth?: number;
  /** amplitude pulsing, 0..1 of the layer gain */
  pulseRate?: number;
  pulseDepth?: number;
  pulseShape?: OscillatorType;
  cutoff?: number;
}

/**
 * A continuous place-sound. Continuous layers live for the bed's whole life;
 * sparse one-shots are scheduled by the engine's ticker from `events`, which is
 * a fixed list — a bed can never grow more generators than it was built with.
 */
class Bed {
  readonly out: GainNode;
  readonly events: BedEvent[] = [];
  /** Level this bed fades up to; keeps rooms balanced against each other. */
  level = 1;
  private srcs: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private t0: number;
  private stopped = false;

  constructor(
    private ctx: AudioContext,
    dest: AudioNode,
    private bufs: NoiseBuffers,
    private rng: Rng,
  ) {
    this.t0 = ctx.currentTime + 0.02;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, ctx.currentTime);
    this.out.connect(dest);
  }

  /** Uniform 0..1 from this bed's stream — beds must not touch global RNG. */
  rand(): number {
    return this.rng.next();
  }

  /** Looped filtered noise. The LFO is what stops a bed sounding like a hiss. */
  loop(o: LoopOpts): void {
    const { ctx } = this;
    const t = this.t0;
    const buf = o.pink ? this.bufs.pink : this.bufs.white;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    if (o.rate !== undefined) src.playbackRate.setValueAtTime(o.rate, t);
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq, t);
    f.Q.setValueAtTime(o.q ?? 1, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain, t);
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    this.nodes.push(f, g);
    if (o.lfoRate) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(o.lfoRate, t);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(o.lfoDepth ?? 0, t);
      lfo.connect(lg);
      lg.connect(f.frequency);
      this.nodes.push(lg);
      this.add(lfo, t);
    }
    // random start offset so two layers sharing a buffer do not phase-lock
    this.add(src, t, buf.duration * this.rng.next());
  }

  /** Steady oscillator layer: hum, sub, klaxon. */
  tone(o: ToneOpts): void {
    const { ctx } = this;
    const t = this.t0;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    let node: AudioNode = osc;
    if (o.cutoff !== undefined) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.cutoff, t);
      f.Q.setValueAtTime(4, t);
      node.connect(f);
      this.nodes.push(f);
      node = f;
    }
    const g = ctx.createGain();
    const depth = clamp(o.pulseDepth ?? 0, 0, 1);
    // bipolar LFO around a raised base, so the layer swings between
    // gain*(1-depth) and gain and never goes negative (which would invert phase)
    g.gain.setValueAtTime(o.gain * (1 - depth / 2), t);
    node.connect(g);
    g.connect(this.out);
    this.nodes.push(g);
    if (o.pulseRate && depth > 0) {
      const lfo = ctx.createOscillator();
      lfo.type = o.pulseShape ?? 'sine';
      lfo.frequency.setValueAtTime(o.pulseRate, t);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime((o.gain * depth) / 2, t);
      lfo.connect(lg);
      lg.connect(g.gain);
      this.nodes.push(lg);
      this.add(lfo, t);
    }
    if (o.lfoRate) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(o.lfoRate, t);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(o.lfoDepth ?? 1, t);
      lfo.connect(lg);
      lg.connect(osc.frequency);
      this.nodes.push(lg);
      this.add(lfo, t);
    }
    this.add(osc, t);
  }

  /**
   * Feedback delay used as a cheap cavern. A convolver would need an impulse
   * response we would have to synthesize anyway, and this costs two nodes.
   */
  tail(delay: number, feedback: number, cutoff: number, wet: number): GainNode {
    const { ctx } = this;
    const t = this.t0;
    const input = ctx.createGain();
    input.gain.setValueAtTime(1, t);
    const d = ctx.createDelay(2);
    d.delayTime.setValueAtTime(delay, t);
    const fb = ctx.createGain();
    fb.gain.setValueAtTime(clamp(feedback, 0, 0.85), t); // < 1 or it runs away
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, t);
    const w = ctx.createGain();
    w.gain.setValueAtTime(wet, t);
    input.connect(d);
    d.connect(lp);
    lp.connect(fb);
    fb.connect(d);
    lp.connect(w);
    w.connect(this.out);
    this.nodes.push(input, d, fb, lp, w);
    return input;
  }

  /** Register a sparse one-shot generator. Gaps are seconds, uniformly jittered. */
  every(min: number, max: number, fire: (t: number) => void): void {
    this.events.push({ next: this.t0 + this.rng.range(min * 0.3, max), min, max, fire });
  }

  /** Short filtered noise one-shot, optionally into the cavern send. */
  blip(
    t: number,
    dur: number,
    level: number,
    freq: number,
    q: number,
    type: BiquadFilterType = 'bandpass',
    dest: AudioNode = this.out,
    pink = false,
    to?: number,
    rate?: number,
  ): void {
    const { ctx } = this;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    f.Q.setValueAtTime(q, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.006, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(level * 0.0008, t + dur);
    g.gain.setValueAtTime(0, t + dur);
    f.connect(g);
    g.connect(dest);
    const buf = pink ? this.bufs.pink : this.bufs.white;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true; // the buffers are seamless, so a long burst cannot run dry
    if (rate !== undefined) {
      s.playbackRate.setValueAtTime(rate, t);
      s.playbackRate.linearRampToValueAtTime(rate * 0.7, t + dur);
    }
    s.connect(f);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
    s.start(t, this.rng.next() * Math.max(0, buf.duration - dur - 0.1));
    s.stop(t + dur + 0.03);
  }

  /** Sine one-shot: monitor beeps, lattice chirps, hull groans. */
  ping(t: number, freq: number, dur: number, level: number, type: OscillatorType = 'sine', to?: number, attack = 0.005): void {
    const { ctx } = this;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(attack, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(level * 0.0008, t + dur);
    g.gain.setValueAtTime(0, t + dur);
    g.connect(this.out);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(18, to), t + dur);
    o.connect(g);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  /** Schedule every pending one-shot that falls before `until`. */
  schedule(now: number, until: number): void {
    if (this.stopped) return;
    for (const e of this.events) {
      // a backgrounded tab leaves `next` far behind; resync, never catch up
      if (e.next < now - 1) e.next = now + this.rng.range(0, e.max);
      let guard = 0;
      while (e.next < until && guard++ < 4) {
        e.fire(e.next);
        e.next += this.rng.range(e.min, e.max);
      }
    }
  }

  private add(src: AudioScheduledSourceNode, t: number, offset?: number): void {
    this.srcs.push(src);
    if (offset !== undefined && src instanceof AudioBufferSourceNode) src.start(t, offset);
    else src.start(t);
  }

  /** Stop every continuous source at `at`, then unwire once the last one ends. */
  stop(at: number): void {
    if (this.stopped) return;
    this.stopped = true;
    this.events.length = 0;
    const last = this.srcs[this.srcs.length - 1];
    for (const s of this.srcs) {
      try {
        s.stop(at);
      } catch {
        /* already stopped */
      }
    }
    const teardown = (): void => {
      for (const s of this.srcs) s.disconnect();
      for (const n of this.nodes) n.disconnect();
      this.srcs.length = 0;
      this.nodes.length = 0;
      this.out.disconnect();
    };
    // every continuous source shares one stop time, so the last one is a fair
    // sentinel for "the bed has gone quiet"
    if (last) last.onended = teardown;
    else teardown();
  }
}

function buildBed(id: AmbienceId, b: Bed): void {
  switch (id) {
    case 'hab':
      // 50 Hz mains hum plus a near-unison partner: the slow beat between them
      // is what makes a hum feel like a machine rather than a test tone
      b.tone({ freq: 50, gain: 0.085 });
      b.tone({ freq: 100.7, gain: 0.026 });
      b.tone({ freq: 150.3, gain: 0.011 });
      b.loop({ pink: true, type: 'lowpass', freq: 420, q: 0.7, gain: 0.075, lfoRate: 0.045, lfoDepth: 170 });
      b.every(3, 11, (t) => b.blip(t, 0.03, 0.045, 2600, 9));
      break;

    case 'commons':
      b.tone({ freq: 50, gain: 0.06 });
      b.tone({ freq: 100.7, gain: 0.02 });
      b.loop({ pink: true, type: 'lowpass', freq: 520, q: 0.7, gain: 0.06, lfoRate: 0.05, lfoDepth: 200 });
      b.loop({ type: 'highpass', freq: 2400, gain: 0.022, lfoRate: 0.07, lfoDepth: 600 });
      b.every(6, 18, (t) => b.blip(t, 0.05, 0.035, 4200, 12)); // crockery
      b.every(9, 25, (t) => {
        // two formants and a small glide: reads as a person, carries no words
        b.ping(t, 190, 0.28, 0.02, 'sawtooth', 165, 0.05);
        b.blip(t, 0.3, 0.03, 520, 7, 'bandpass', undefined, true);
        b.blip(t + 0.05, 0.24, 0.018, 1480, 9, 'bandpass', undefined, true);
      });
      break;

    case 'spine':
      // narrow band = a duct you are inside of, not a room you are in
      b.loop({ type: 'bandpass', freq: 900, q: 1.1, gain: 0.1, lfoRate: 0.13, lfoDepth: 340 });
      b.loop({ pink: true, type: 'lowpass', freq: 180, gain: 0.03 });
      b.tone({ freq: 78, gain: 0.02 });
      // creaks bend their own playback rate — metal complaining, close by
      b.every(4, 12, (t) => b.blip(t, 0.22, 0.055, 1800, 22, 'bandpass', undefined, false, 900, 1.4));
      b.every(16, 42, (t) => {
        b.ping(t, 62, 2.6, 0.05, 'sawtooth', 44, 0.7);
        b.blip(t + 0.1, 2.2, 0.02, 260, 3, 'lowpass', undefined, true);
      });
      break;

    case 'medical':
      // almost nothing, and one thing that is exactly on time
      b.loop({ pink: true, type: 'lowpass', freq: 130, gain: 0.014 });
      b.loop({ type: 'highpass', freq: 6000, gain: 0.02, lfoRate: 0.03, lfoDepth: 900 });
      b.every(3.1, 3.1, (t) => b.ping(t, 1046, 0.09, 0.035));
      break;

    case 'registry':
      b.loop({ pink: true, type: 'bandpass', freq: 210, q: 0.6, gain: 0.038 });
      b.tone({ freq: 62, gain: 0.028 });
      b.tone({ freq: 93.5, gain: 0.011 });
      // lattice chirps: short, bright, and never on a grid
      b.every(2, 9, (t) => {
        const f = 2400 + Math.floor(b.rand() * 5) * 420;
        b.ping(t, f, 0.05, 0.03, 'sine', f * 0.92);
      });
      break;

    case 'cargo': {
      // pink noise dragged to a quarter speed is the cheapest honest sub rumble
      b.loop({ pink: true, type: 'lowpass', freq: 70, q: 0.5, gain: 0.17, rate: 0.25, lfoRate: 0.02, lfoDepth: 25 });
      b.tone({ freq: 28, gain: 0.06 });
      b.tone({ freq: 41.3, gain: 0.026, lfoRate: 0.023, lfoDepth: 0.6 });
      const cav = b.tail(0.37, 0.62, 1400, 0.5);
      b.every(7, 26, (t) => b.blip(t, 0.03, 0.06, 3200, 14, 'bandpass', cav));
      b.every(19, 55, (t) => b.blip(t, 0.8, 0.05, 150, 2, 'lowpass', cav, true));
      break;
    }

    case 'watch':
      b.tone({ freq: 50, gain: 0.085 });
      b.tone({ freq: 100.4, gain: 0.03 });
      // 100 Hz saw through a resonant band, flickering: a failing ballast
      b.tone({ freq: 100, gain: 0.022, type: 'sawtooth', cutoff: 1400, pulseRate: 7.3, pulseDepth: 0.45 });
      b.loop({ pink: true, type: 'lowpass', freq: 600, gain: 0.03, lfoRate: 0.06, lfoDepth: 200 });
      b.every(11, 34, (t) => b.blip(t, 0.02, 0.03, 1900, 14));
      break;

    case 'silence':
      // deliberate, not broken: a floor of room tone plus one distant tick, so
      // the player's ear still has something to hold on to
      b.loop({ pink: true, type: 'lowpass', freq: 200, gain: 0.013, lfoRate: 0.03, lfoDepth: 70 });
      b.loop({ type: 'highpass', freq: 9000, gain: 0.005 });
      b.tone({ freq: 44, gain: 0.017 });
      b.every(25, 70, (t) => b.blip(t, 0.025, 0.014, 1400, 10));
      break;

    case 'alarm':
      // one square LFO drives every layer, so the whole room pulses together
      b.tone({ freq: 55, gain: 0.07, pulseRate: 0.75, pulseDepth: 0.9, pulseShape: 'square' });
      b.tone({ freq: 110, gain: 0.05, type: 'sawtooth', cutoff: 700, pulseRate: 0.75, pulseDepth: 0.95, pulseShape: 'square', lfoRate: 0.75, lfoDepth: 5 });
      b.tone({ freq: 113.5, gain: 0.035, type: 'sawtooth', cutoff: 700, pulseRate: 0.75, pulseDepth: 0.95, pulseShape: 'square' });
      b.loop({ type: 'bandpass', freq: 1100, q: 1.6, gain: 0.02 });
      break;
  }
}

// ---------------------------------------------------------------------------
// engine
// ---------------------------------------------------------------------------

interface Graph {
  ctx: AudioContext;
  comp: DynamicsCompressorNode;
  master: GainNode;
  duck: GainNode;
  music: GainNode;
  sfx: GainNode;
  amb: GainNode;
  noise: NoiseBuffers;
  director: MusicDirector;
}

interface SfxOpts {
  pitch?: number;
  gain?: number;
  pan?: number;
}

interface OscOpts {
  freq: number;
  /** glide target, reached at the end of `dur` */
  to?: number;
  type?: OscillatorType;
  dur: number;
  level: number;
  attack?: number;
}

interface NoiseOpts {
  dur: number;
  level: number;
  freq: number;
  to?: number;
  q?: number;
  type?: BiquadFilterType;
  pink?: boolean;
  attack?: number;
}

interface FmOpts {
  freq: number;
  ratio: number;
  index: number;
  dur: number;
  level: number;
}

export class AudioEngine {
  private g: Graph | null = null;
  private unsupported = false;
  private disposed = false;
  private resuming: Promise<void> | null = null;
  private unsub: (() => void) | null = null;

  private rng = new Rng('candlewake.audio');
  private voices = new Set<SfxVoice>();
  private lastAt = new Map<SfxId, number>();

  // desired state, kept whether or not the context exists yet
  private wantAmb: AmbienceId | null = null;
  private wantAmbFade = 2;
  private wantMus: MusicId | null = null;
  private wantMusFade = 2;
  private intensity = 0.5;

  private bed: Bed | null = null;
  private bedId: AmbienceId | null = null;
  private ambTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private store: SettingsStore) {}

  get unlocked(): boolean {
    return !!this.g && this.g.ctx.state === 'running';
  }

  /** Call from a user-gesture handler. Safe to call repeatedly. */
  resume(): Promise<void> {
    if (this.disposed || this.unsupported) return Promise.resolve();
    if (this.resuming) return this.resuming;
    const p = (async () => {
      try {
        if (!this.g) this.build();
        const g = this.g;
        if (!g) return;
        if (g.ctx.state !== 'running') await g.ctx.resume();
        if (g.ctx.state !== 'running') return;
        this.applyVolumes();
        this.applyAmbience(this.wantAmbFade);
        g.director.set(this.wantMus, this.wantMusFade, this.intensity);
      } catch (err) {
        console.warn('[audio] could not start', err);
      } finally {
        this.resuming = null;
      }
    })();
    this.resuming = p;
    return p;
  }

  sfx(id: SfxId, opts?: SfxOpts): void {
    const g = this.g;
    if (!g || this.disposed || g.ctx.state !== 'running') return;
    const now = g.ctx.currentTime;
    const gap = SFX_GAP[id];
    if (gap !== undefined) {
      const last = this.lastAt.get(id);
      if (last !== undefined && now - last < gap) return;
      this.lastAt.set(id, now);
    }
    const pitch = opts?.pitch ?? 1;
    // dialogue blips get a dedicated two-node path: no voice object, no arrays
    if (id === 'text.blip') {
      this.blip(g, now + 0.005, pitch);
      return;
    }
    if (this.voices.size >= MAX_VOICES) return;
    const v = new SfxVoice(g.ctx, g.sfx, opts?.gain ?? 1, opts?.pan ?? 0, () => this.voices.delete(v));
    this.voices.add(v);
    // small lead so every envelope point is strictly in the future
    this.render(g, v, id, now + 0.005, pitch);
    v.seal();
  }

  /** Cross-fades. null = fade out to nothing. */
  setAmbience(id: AmbienceId | null, fadeSec = 2): void {
    if (this.disposed) return;
    this.wantAmb = id;
    this.wantAmbFade = fadeSec;
    if (!this.unlocked) return;
    this.applyAmbience(fadeSec);
  }

  setMusic(id: MusicId | null, opts?: { fade?: number; intensity?: number }): void {
    if (this.disposed) return;
    this.wantMus = id;
    this.wantMusFade = opts?.fade ?? 2;
    if (opts?.intensity !== undefined) this.intensity = clamp(opts.intensity, 0, 1);
    this.g?.director.set(id, this.wantMusFade, this.intensity);
  }

  /** 0..1 — layers instruments in/out without restarting the piece. */
  setMusicIntensity(v: number): void {
    this.intensity = clamp(v, 0, 1);
    this.g?.director.setIntensity(this.intensity);
  }

  /** Temporarily lower music+ambience (for reveals / dialogue stings). */
  duck(amount: number, seconds: number): void {
    const g = this.g;
    if (!g || this.disposed || g.ctx.state !== 'running') return;
    const now = g.ctx.currentTime;
    const target = clamp(1 - clamp(amount, 0, 1), 0, 1);
    const hold = Math.max(0.05, seconds);
    const p = g.duck.gain;
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now); // anchor the current value or the cancel steps
    p.linearRampToValueAtTime(target, now + 0.08);
    p.setValueAtTime(target, now + hold);
    p.linearRampToValueAtTime(1, now + hold + 0.5);
  }

  stopAll(): void {
    const g = this.g;
    this.wantAmb = null;
    this.wantMus = null;
    if (!g) return;
    const at = g.ctx.currentTime + 0.03;
    g.director.stop(0.3);
    if (this.bed) {
      this.fadeBedOut(g, this.bed, 0.3);
      this.bed = null;
      this.bedId = null;
      this.stopAmbTimer();
    }
    for (const v of [...this.voices]) v.cut(g.ctx, at);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsub?.();
    this.unsub = null;
    this.stopAmbTimer();
    const g = this.g;
    if (!g) return;
    const at = g.ctx.currentTime + 0.02;
    for (const v of [...this.voices]) v.cut(g.ctx, at);
    this.voices.clear();
    this.bed?.stop(at);
    this.bed = null;
    this.bedId = null;
    g.director.dispose();
    g.music.disconnect();
    g.sfx.disconnect();
    g.amb.disconnect();
    g.duck.disconnect();
    g.master.disconnect();
    g.comp.disconnect();
    this.g = null;
    g.ctx.close().catch(() => {
      /* already closed */
    });
  }

  /**
   * Test-only handle on the live graph. Nobody involved in this project can
   * hear the game, so the only honest way to claim the audio works is to tap
   * the master bus and measure it. Returns null when Web Audio is unavailable
   * or the context has not been unlocked yet.
   */
  get debugGraph(): { ctx: AudioContext; master: GainNode } | null {
    return this.g ? { ctx: this.g.ctx, master: this.g.master } : null;
  }

  // -- graph ---------------------------------------------------------------

  private build(): void {
    try {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      // gentle: this exists to catch a klaxon landing on top of a battle, not
      // to glue anything together
      comp.threshold.setValueAtTime(-18, 0);
      comp.knee.setValueAtTime(24, 0);
      comp.ratio.setValueAtTime(3, 0);
      comp.attack.setValueAtTime(0.006, 0);
      comp.release.setValueAtTime(0.25, 0);
      const master = ctx.createGain();
      const duck = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      const amb = ctx.createGain();
      master.gain.setValueAtTime(0, 0);
      duck.gain.setValueAtTime(1, 0);
      music.gain.setValueAtTime(0, 0);
      sfx.gain.setValueAtTime(0, 0);
      amb.gain.setValueAtTime(0, 0);
      music.connect(duck);
      amb.connect(duck);
      duck.connect(master);
      sfx.connect(master);
      master.connect(comp);
      comp.connect(ctx.destination);
      const noise: NoiseBuffers = {
        white: makeNoise(ctx, 2, false, 0x51ce),
        pink: makeNoise(ctx, 5, true, 0xca11),
      };
      this.g = {
        ctx,
        comp,
        master,
        duck,
        music,
        sfx,
        amb,
        noise,
        director: new MusicDirector(ctx, music, noise),
      };
      this.applyVolumes();
      this.unsub = this.store.onChange(() => this.applyVolumes());
    } catch (err) {
      // no Web Audio (or it refused to construct): the game runs silent
      this.unsupported = true;
      this.g = null;
      console.warn('[audio] unavailable', err);
    }
  }

  /** Settings changes are ramps, never assignments — assignment clicks. */
  private applyVolumes(): void {
    const g = this.g;
    if (!g) return;
    const s = this.store.get();
    const now = g.ctx.currentTime;
    g.master.gain.setTargetAtTime(clamp(s.masterVolume, 0, 1) * HEADROOM, now, 0.03);
    g.music.gain.setTargetAtTime(clamp(s.musicVolume, 0, 1), now, 0.03);
    g.sfx.gain.setTargetAtTime(clamp(s.sfxVolume, 0, 1), now, 0.03);
    g.amb.gain.setTargetAtTime(clamp(s.ambienceVolume, 0, 1), now, 0.03);
  }

  // -- ambience ------------------------------------------------------------

  private applyAmbience(fade: number): void {
    const g = this.g;
    if (!g) return;
    if (this.wantAmb === this.bedId) return;
    const f = Math.max(0.05, fade);
    if (this.bed) this.fadeBedOut(g, this.bed, f);
    this.bed = null;
    this.bedId = this.wantAmb;
    if (!this.wantAmb) {
      this.stopAmbTimer();
      return;
    }
    const bed = new Bed(g.ctx, g.amb, g.noise, new Rng(`bed.${this.wantAmb}.${this.rng.state}`));
    buildBed(this.wantAmb, bed);
    const now = g.ctx.currentTime;
    bed.out.gain.setValueAtTime(0, now);
    bed.out.gain.linearRampToValueAtTime(bed.level, now + f);
    this.bed = bed;
    this.startAmbTimer();
  }

  private fadeBedOut(g: Graph, bed: Bed, fade: number): void {
    const now = g.ctx.currentTime;
    bed.out.gain.cancelScheduledValues(now);
    bed.out.gain.setValueAtTime(bed.out.gain.value, now);
    bed.out.gain.linearRampToValueAtTime(0, now + fade);
    bed.stop(now + fade + 0.05);
  }

  private startAmbTimer(): void {
    if (this.ambTimer !== null) return;
    this.ambTimer = setInterval(this.ambTick, AMB_TICK_MS);
  }

  private stopAmbTimer(): void {
    if (this.ambTimer === null) return;
    clearInterval(this.ambTimer);
    this.ambTimer = null;
  }

  private ambTick = (): void => {
    const g = this.g;
    if (!g || !this.bed || this.disposed) return;
    const now = g.ctx.currentTime;
    this.bed.schedule(now, now + AMB_LOOKAHEAD);
  };

  // -- sfx primitives ------------------------------------------------------

  /**
   * Dialogue blip. Two nodes, one closure, ~22 ms, and a little pitch jitter so
   * a long line of text does not turn into a single sustained buzz.
   */
  private blip(g: Graph, t: number, pitch: number): void {
    const { ctx } = g;
    const dur = 0.022;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.055, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.00005, t + dur);
    gain.gain.setValueAtTime(0, t + dur);
    gain.connect(g.sfx);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1180 * pitch * (0.93 + this.rng.next() * 0.16), t);
    o.connect(gain);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
    o.start(t);
    o.stop(t + dur + 0.01);
  }

  private osc(g: Graph, v: SfxVoice, t: number, o: OscOpts): void {
    const { ctx } = g;
    const level = Math.max(0.0002, o.level);
    const gain = v.own(ctx.createGain());
    const a = Math.min(o.attack ?? 0.004, o.dur * 0.5);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + a);
    gain.gain.exponentialRampToValueAtTime(level * 0.0006, t + o.dur);
    gain.gain.setValueAtTime(0, t + o.dur);
    gain.connect(v.out);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(18, o.to), t + o.dur);
    osc.connect(gain);
    v.play(osc, t, t + o.dur + 0.02);
  }

  private nz(g: Graph, v: SfxVoice, t: number, o: NoiseOpts): void {
    const { ctx } = g;
    const level = Math.max(0.0002, o.level);
    const buf = o.pink ? g.noise.pink : g.noise.white;
    const f = v.own(ctx.createBiquadFilter());
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq, t);
    if (o.to !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + o.dur);
    f.Q.setValueAtTime(o.q ?? 1, t);
    const gain = v.own(ctx.createGain());
    const a = Math.min(o.attack ?? 0.002, o.dur * 0.5);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + a);
    gain.gain.exponentialRampToValueAtTime(level * 0.0006, t + o.dur);
    gain.gain.setValueAtTime(0, t + o.dur);
    f.connect(gain);
    gain.connect(v.out);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(f);
    v.play(s, t, t + o.dur + 0.02, this.rng.next() * buf.duration);
  }

  /** Two-operator FM. Inharmonic ratios give bells; low ratios give bodies. */
  private fm(g: Graph, v: SfxVoice, t: number, o: FmOpts): void {
    const { ctx } = g;
    const level = Math.max(0.0002, o.level);
    const gain = v.own(ctx.createGain());
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(level * 0.0006, t + o.dur);
    gain.gain.setValueAtTime(0, t + o.dur);
    gain.connect(v.out);
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.setValueAtTime(o.freq, t);
    car.connect(gain);
    const mg = v.own(ctx.createGain());
    // index collapses over the first half: bright strike, clean tail
    mg.gain.setValueAtTime(o.freq * o.index, t);
    mg.gain.exponentialRampToValueAtTime(o.freq * 0.01, t + o.dur * 0.6);
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(o.freq * o.ratio, t);
    mod.connect(mg);
    mg.connect(car.frequency);
    const stopAt = t + o.dur + 0.02;
    v.play(car, t, stopAt);
    v.play(mod, t, stopAt);
  }

  // -- sfx bank ------------------------------------------------------------

  private render(g: Graph, v: SfxVoice, id: SfxId, t: number, p: number): void {
    switch (id) {
      case 'text.blip':
        break; // handled on the fast path in sfx()

      case 'ui.move':
        this.osc(g, v, t, { freq: 680 * p, to: 610 * p, type: 'square', dur: 0.045, level: 0.07 });
        break;
      case 'ui.select':
        this.osc(g, v, t, { freq: 520 * p, to: 784 * p, type: 'triangle', dur: 0.09, level: 0.12 });
        this.nz(g, v, t, { dur: 0.03, level: 0.04, freq: 3200, q: 4 });
        break;
      case 'ui.back':
        this.osc(g, v, t, { freq: 520 * p, to: 330 * p, type: 'triangle', dur: 0.1, level: 0.11 });
        break;
      case 'ui.error':
        // two dry square pulses, slightly flat the second time; a refusal, not a buzzer
        this.osc(g, v, t, { freq: 150 * p, type: 'square', dur: 0.07, level: 0.09 });
        this.osc(g, v, t + 0.1, { freq: 138 * p, type: 'square', dur: 0.11, level: 0.09 });
        break;
      case 'ui.open':
        this.nz(g, v, t, { dur: 0.18, level: 0.06, freq: 400 * p, to: 2600 * p, q: 1.2 });
        this.osc(g, v, t, { freq: 220 * p, to: 440 * p, type: 'triangle', dur: 0.12, level: 0.05 });
        break;
      case 'ui.close':
        this.nz(g, v, t, { dur: 0.16, level: 0.06, freq: 2400 * p, to: 380 * p, q: 1.2 });
        this.osc(g, v, t, { freq: 400 * p, to: 200 * p, type: 'triangle', dur: 0.11, level: 0.05 });
        break;

      // Footsteps: a filtered impact plus, where the surface rings, a body tone.
      case 'step.metal':
        this.nz(g, v, t, { dur: 0.07, level: 0.1, freq: 2200 * p, q: 4 });
        this.osc(g, v, t, { freq: 92 * p, to: 70 * p, dur: 0.06, level: 0.08 });
        break;
      case 'step.grate':
        this.nz(g, v, t, { dur: 0.05, level: 0.09, freq: 3400 * p, q: 9 });
        this.nz(g, v, t + 0.035, { dur: 0.07, level: 0.05, freq: 2600 * p, q: 12 });
        this.osc(g, v, t, { freq: 110 * p, dur: 0.05, level: 0.04 });
        break;
      case 'step.carpet':
        this.nz(g, v, t, { dur: 0.09, level: 0.06, freq: 700 * p, q: 0.8, type: 'lowpass', pink: true, attack: 0.008 });
        break;
      case 'step.tile':
        this.nz(g, v, t, { dur: 0.045, level: 0.09, freq: 1500 * p, q: 0.9, type: 'highpass' });
        this.osc(g, v, t, { freq: 160 * p, dur: 0.035, level: 0.04 });
        break;
      case 'step.soil':
        this.nz(g, v, t, { dur: 0.11, level: 0.08, freq: 1100 * p, q: 0.7, type: 'lowpass', pink: true, attack: 0.01 });
        this.nz(g, v, t + 0.03, { dur: 0.06, level: 0.035, freq: 2000 * p, q: 1.5, pink: true });
        break;

      case 'door.open':
        this.osc(g, v, t, { freq: 58 * p, to: 96 * p, type: 'sawtooth', dur: 0.42, level: 0.045, attack: 0.05 });
        this.nz(g, v, t, { dur: 0.42, level: 0.045, freq: 300 * p, to: 900 * p, q: 1.4, attack: 0.06 });
        this.nz(g, v, t + 0.4, { dur: 0.12, level: 0.08, freq: 260, q: 0.9, type: 'lowpass' });
        break;
      case 'door.close':
        this.osc(g, v, t, { freq: 96 * p, to: 54 * p, type: 'sawtooth', dur: 0.34, level: 0.045, attack: 0.04 });
        this.nz(g, v, t, { dur: 0.34, level: 0.045, freq: 900 * p, to: 280 * p, q: 1.4, attack: 0.05 });
        this.nz(g, v, t + 0.33, { dur: 0.16, level: 0.12, freq: 200, q: 0.8, type: 'lowpass' });
        this.osc(g, v, t + 0.33, { freq: 76 * p, to: 48 * p, dur: 0.14, level: 0.09 });
        break;
      case 'door.locked':
        this.nz(g, v, t, { dur: 0.09, level: 0.1, freq: 220, q: 0.9, type: 'lowpass' });
        this.osc(g, v, t, { freq: 70, dur: 0.08, level: 0.08 });
        this.osc(g, v, t + 0.13, { freq: 172 * p, type: 'square', dur: 0.13, level: 0.05 });
        break;
      case 'hatch':
        // latch click plus two inharmonic partials: a small ring, not a bell
        this.nz(g, v, t, { dur: 0.05, level: 0.11, freq: 3000 * p, q: 6 });
        this.osc(g, v, t, { freq: 1620 * p, type: 'triangle', dur: 0.3, level: 0.045 });
        this.osc(g, v, t, { freq: 2430 * p, type: 'triangle', dur: 0.22, level: 0.022 });
        break;

      case 'terminal.on':
        this.osc(g, v, t, { freq: 180 * p, to: 760 * p, type: 'triangle', dur: 0.26, level: 0.06, attack: 0.02 });
        this.nz(g, v, t, { dur: 0.3, level: 0.045, freq: 500, to: 3000, q: 1.1, attack: 0.04 });
        this.osc(g, v, t + 0.24, { freq: 60, dur: 0.5, level: 0.045, attack: 0.05 }); // the hum it settles into
        break;
      case 'terminal.key':
        this.osc(g, v, t, { freq: 900 * p, type: 'square', dur: 0.022, level: 0.045 });
        break;
      case 'terminal.deny':
        // two falling squares a few Hz apart; the beating is what sours it
        this.osc(g, v, t, { freq: 300 * p, to: 218 * p, type: 'square', dur: 0.17, level: 0.07 });
        this.osc(g, v, t, { freq: 306 * p, to: 222 * p, type: 'square', dur: 0.17, level: 0.045 });
        break;

      case 'clue.found':
        this.fm(g, v, t, { freq: 659 * p, ratio: 2.01, index: 2.2, dur: 0.55, level: 0.11 });
        this.fm(g, v, t + 0.14, { freq: 988 * p, ratio: 2.01, index: 1.8, dur: 0.7, level: 0.085 });
        break;
      case 'clue.link':
        // three partials climbing: two facts becoming one
        this.fm(g, v, t, { freq: 587 * p, ratio: 2.01, index: 2, dur: 0.4, level: 0.095 });
        this.fm(g, v, t + 0.12, { freq: 784 * p, ratio: 2.01, index: 2, dur: 0.45, level: 0.095 });
        this.fm(g, v, t + 0.26, { freq: 1175 * p, ratio: 2.01, index: 1.6, dur: 0.9, level: 0.085 });
        break;
      case 'quest.update':
        this.fm(g, v, t, { freq: 523 * p, ratio: 1.41, index: 1.2, dur: 0.3, level: 0.085 });
        this.fm(g, v, t + 0.11, { freq: 698 * p, ratio: 1.41, index: 1, dur: 0.5, level: 0.075 });
        break;
      case 'pickup':
        this.osc(g, v, t, { freq: 880 * p, to: 1320 * p, type: 'triangle', dur: 0.13, level: 0.09 });
        this.nz(g, v, t, { dur: 0.04, level: 0.035, freq: 5000, q: 3 });
        break;
      case 'relation.up':
        this.osc(g, v, t, { freq: 392 * p, type: 'triangle', dur: 0.4, level: 0.065, attack: 0.02 });
        this.osc(g, v, t + 0.1, { freq: 588 * p, type: 'triangle', dur: 0.45, level: 0.055, attack: 0.03 });
        break;
      case 'relation.down':
        this.osc(g, v, t, { freq: 392 * p, type: 'triangle', dur: 0.45, level: 0.065, attack: 0.02 });
        this.osc(g, v, t + 0.12, { freq: 330 * p, type: 'triangle', dur: 0.6, level: 0.055, attack: 0.04 });
        this.osc(g, v, t + 0.12, { freq: 327 * p, type: 'triangle', dur: 0.6, level: 0.028, attack: 0.04 });
        break;

      case 'loom.project':
        // detuned pair swept through a rising band: a body assembling out of field
        this.osc(g, v, t, { freq: 110 * p, to: 220 * p, type: 'sawtooth', dur: 0.9, level: 0.045, attack: 0.25 });
        this.osc(g, v, t, { freq: 110.9 * p, to: 221.8 * p, type: 'sawtooth', dur: 0.9, level: 0.045, attack: 0.25 });
        this.nz(g, v, t, { dur: 1, level: 0.05, freq: 300, to: 4200, q: 3, attack: 0.3 });
        this.fm(g, v, t + 0.55, { freq: 1318 * p, ratio: 3.01, index: 1.4, dur: 0.6, level: 0.045 });
        break;
      case 'battle.start':
        this.osc(g, v, t, { freq: 150, to: 42, dur: 0.5, level: 0.12 });
        this.nz(g, v, t, { dur: 0.45, level: 0.07, freq: 600, to: 4000, q: 1.3, attack: 0.2 });
        this.osc(g, v, t + 0.3, { freq: 233 * p, type: 'sawtooth', dur: 0.4, level: 0.045 });
        this.osc(g, v, t + 0.3, { freq: 330 * p, type: 'sawtooth', dur: 0.4, level: 0.045 }); // tritone
        break;
      case 'battle.win':
        // modal and short: nobody wins a fight on this ship, they end one
        this.fm(g, v, t, { freq: 440 * p, ratio: 2.01, index: 2, dur: 0.5, level: 0.095 });
        this.fm(g, v, t + 0.16, { freq: 587 * p, ratio: 2.01, index: 1.8, dur: 0.5, level: 0.085 });
        this.fm(g, v, t + 0.32, { freq: 659 * p, ratio: 2.01, index: 1.5, dur: 1.1, level: 0.085 });
        break;
      case 'battle.lose':
        this.osc(g, v, t, { freq: 196 * p, to: 98 * p, type: 'triangle', dur: 1.2, level: 0.085, attack: 0.03 });
        this.osc(g, v, t, { freq: 194 * p, to: 97 * p, type: 'triangle', dur: 1.2, level: 0.065, attack: 0.03 });
        this.osc(g, v, t + 0.2, { freq: 62, dur: 1.4, level: 0.085, attack: 0.1 });
        break;
      case 'scan':
        this.osc(g, v, t, { freq: 1200 * p, type: 'square', dur: 0.05, level: 0.05 });
        this.osc(g, v, t + 0.09, { freq: 1500 * p, type: 'square', dur: 0.05, level: 0.05 });
        this.osc(g, v, t + 0.18, { freq: 1800 * p, type: 'square', dur: 0.09, level: 0.05 });
        break;

      // Aspects are separated by spectrum, not volume, so they stay legible
      // when three of them land inside a second.
      case 'hit.kinetic':
        this.nz(g, v, t, { dur: 0.09, level: 0.13, freq: 900 * p, q: 0.8, type: 'lowpass' });
        this.osc(g, v, t, { freq: 150 * p, to: 60 * p, dur: 0.11, level: 0.12 });
        break;
      case 'hit.thermal':
        this.nz(g, v, t, { dur: 0.28, level: 0.095, freq: 3000 * p, to: 700 * p, q: 1.1 });
        this.osc(g, v, t, { freq: 300 * p, to: 90 * p, type: 'sawtooth', dur: 0.16, level: 0.055 });
        break;
      case 'hit.field':
        // carrier against a tritone modulator: a grain with no natural analogue
        this.fm(g, v, t, { freq: 220 * p, ratio: 1.414, index: 8, dur: 0.22, level: 0.1 });
        this.nz(g, v, t, { dur: 0.1, level: 0.045, freq: 1800, q: 6 });
        break;
      case 'hit.cognitive':
        // swells backwards then stops dead — reads as wrong rather than loud
        this.nz(g, v, t, { dur: 0.2, level: 0.085, freq: 1400 * p, to: 4000 * p, q: 3, attack: 0.17 });
        this.osc(g, v, t + 0.16, { freq: 1244 * p, type: 'square', dur: 0.09, level: 0.055 });
        this.osc(g, v, t + 0.16, { freq: 1179 * p, type: 'square', dur: 0.09, level: 0.045 });
        break;
      case 'hit.corrosive':
        this.nz(g, v, t, { dur: 0.36, level: 0.085, freq: 2600 * p, to: 800 * p, q: 8, pink: true });
        this.nz(g, v, t + 0.05, { dur: 0.3, level: 0.045, freq: 5200 * p, to: 1600 * p, q: 12 });
        break;

      case 'shield':
        this.osc(g, v, t, { freq: 180 * p, to: 540 * p, type: 'triangle', dur: 0.3, level: 0.075, attack: 0.02 });
        this.nz(g, v, t, { dur: 0.3, level: 0.045, freq: 800, to: 2600, q: 5, attack: 0.05 });
        break;
      case 'heal':
        this.osc(g, v, t, { freq: 523 * p, dur: 0.45, level: 0.065, attack: 0.04 });
        this.osc(g, v, t + 0.16, { freq: 784 * p, dur: 0.55, level: 0.055, attack: 0.05 });
        break;
      case 'status.apply':
        this.nz(g, v, t, { dur: 0.05, level: 0.06, freq: 2400 * p, q: 8 });
        this.osc(g, v, t, { freq: 233 * p, to: 175 * p, type: 'square', dur: 0.16, level: 0.045 });
        break;
      case 'revenant.collapse':
        // the field losing its grip: pitch falls out from under the noise, then
        // three pieces of debris
        this.osc(g, v, t, { freq: 180, to: 28, dur: 0.8, level: 0.12, attack: 0.01 });
        this.nz(g, v, t, { dur: 0.7, level: 0.08, freq: 3000, to: 200, q: 1.2 });
        this.nz(g, v, t + 0.42, { dur: 0.04, level: 0.045, freq: 3600, q: 9 });
        this.nz(g, v, t + 0.56, { dur: 0.04, level: 0.035, freq: 2800, q: 9 });
        this.nz(g, v, t + 0.65, { dur: 0.04, level: 0.025, freq: 4400, q: 9 });
        break;

      case 'alarm.short':
        for (let i = 0; i < 2; i++) {
          const t2 = t + i * 0.3;
          this.osc(g, v, t2, { freq: 660 * p, type: 'square', dur: 0.13, level: 0.06 });
          this.osc(g, v, t2 + 0.14, { freq: 880 * p, type: 'square', dur: 0.13, level: 0.06 });
        }
        break;
      case 'klaxon':
        for (let i = 0; i < 3; i++) {
          const t2 = t + i * 0.62;
          this.osc(g, v, t2, { freq: 138 * p, to: 108 * p, type: 'sawtooth', dur: 0.5, level: 0.09, attack: 0.06 });
          this.osc(g, v, t2, { freq: 69 * p, dur: 0.5, level: 0.07, attack: 0.06 });
        }
        break;
    }
  }
}

export const audio = new AudioEngine(settings);
