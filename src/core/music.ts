/**
 * Music. Everything here is synthesized at runtime — the game ships no audio
 * assets — and every note is original material.
 *
 * Two rules shape the writing, both from CANON §9 ("the ship is loud; silence
 * is a thing that happens, and it is worse"):
 *  - Music is sparse. Pedal tones, modal cells, long gaps. Most cues are meant
 *    to be forgettable while they play; the machinery carries the tension.
 *  - Intensity never restarts a piece. A piece is a fixed set of layers whose
 *    *gains* are ramped; the note grid underneath keeps running regardless.
 *
 * Timing uses a lookahead scheduler: a coarse timer wakes every TICK_MS and
 * schedules every note falling inside the next LOOKAHEAD seconds against
 * ctx.currentTime. One setTimeout per note drifts audibly within a few bars.
 */

export type MusicId =
  | 'title'
  | 'charcreate'
  | 'explore'
  | 'tense'
  | 'investigate'
  | 'weight'
  | 'battle'
  | 'battleBoss'
  | 'reveal'
  | 'chapterEnd';

export interface NoiseBuffers {
  readonly white: AudioBuffer;
  readonly pink: AudioBuffer;
}

const LOOKAHEAD = 0.2; // seconds of music scheduled ahead of the clock
const TICK_MS = 50; // scheduler wake interval
const MAX_STEPS_PER_TICK = 48; // hard cap so a throttled tab can never flood

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** MIDI note -> Hz. Note numbers read better than frequencies in the pieces. */
const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------------------
// voices
// ---------------------------------------------------------------------------

interface PadOpts {
  detune?: number;
  cutoff?: number;
  type?: OscillatorType;
  attack?: number;
  /** cents of slow drift out and back — `reveal` uses it to sour and resolve */
  bend?: number;
}

/**
 * Note factory for one piece. Owns the set of sources it started so a piece can
 * be hard-stopped without touching the piece that is cross-fading over it.
 */
class Voices {
  private live = new Set<AudioScheduledSourceNode>();

  constructor(
    private ctx: AudioContext,
    private bufs: NoiseBuffers,
  ) {}

  /**
   * Start + stop with explicit times, then let onended tear the chain down.
   * `chain` must only be passed to the longest-lived source of a voice, or a
   * short modulator would disconnect the carrier's output early.
   */
  private play(src: AudioScheduledSourceNode, chain: AudioNode[], t: number, stopAt: number): void {
    this.live.add(src);
    src.onended = () => {
      this.live.delete(src);
      src.disconnect();
      for (const n of chain) n.disconnect();
    };
    src.start(t);
    src.stop(stopAt);
  }

  /** Attack/decay envelope. Ramps only — assigning .value on a live param clicks. */
  private env(t: number, dur: number, level: number, attack: number): GainNode {
    const g = this.ctx.createGain();
    const a = Math.min(Math.max(attack, 0.002), dur * 0.9);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + a);
    g.gain.exponentialRampToValueAtTime(level * 0.0006, t + dur);
    g.gain.setValueAtTime(0, t + dur);
    return g;
  }

  /** Soft FM bell. Inharmonic ratio keeps it glassy rather than organ-like. */
  bell(dest: AudioNode, t: number, midi: number, dur: number, level: number, ratio = 2.007, index = 2.6): void {
    const { ctx } = this;
    const f = mtof(midi);
    const g = this.env(t, dur, level, 0.008);
    g.connect(dest);
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.setValueAtTime(f, t);
    car.connect(g);
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(f * ratio, t);
    const mg = ctx.createGain();
    // modulation index collapses fast: bright strike, pure tail
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.01, t + dur * 0.5);
    mod.connect(mg);
    mg.connect(car.frequency);
    const stopAt = t + dur + 0.05;
    this.play(car, [g], t, stopAt);
    this.play(mod, [mg], t, stopAt);
  }

  /** Detuned pair per note through one shared lowpass. Slow swell by default. */
  pad(dest: AudioNode, t: number, midis: readonly number[], dur: number, level: number, opts: PadOpts = {}): void {
    const { ctx } = this;
    const detune = opts.detune ?? 5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(opts.cutoff ?? 780, t);
    lp.Q.setValueAtTime(0.7, t);
    const g = this.env(t, dur, level, opts.attack ?? dur * 0.35);
    lp.connect(g);
    g.connect(dest);
    const stopAt = t + dur + 0.05;
    let first = true;
    for (let i = 0; i < midis.length; i++) {
      for (const d of [-detune, detune]) {
        const o = ctx.createOscillator();
        o.type = opts.type ?? 'triangle';
        o.frequency.setValueAtTime(mtof(midis[i]), t);
        o.detune.setValueAtTime(d, t);
        if (opts.bend) {
          const s = i % 2 ? -1 : 1;
          o.detune.linearRampToValueAtTime(d + opts.bend * s, t + dur * 0.45);
          o.detune.linearRampToValueAtTime(d, t + dur * 0.85);
        }
        o.connect(lp);
        // all oscillators share one stop time, so the first may own the chain
        this.play(o, first ? [lp, g] : [], t, stopAt);
        first = false;
      }
    }
  }

  /** Sine sub with an optional downward pitch drop — the "pulse" of the game. */
  sub(dest: AudioNode, t: number, midi: number, dur: number, level: number, drop = 0): void {
    const f = mtof(midi);
    const g = this.env(t, dur, level, Math.min(0.05, dur * 0.2));
    g.connect(dest);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    if (drop) o.frequency.exponentialRampToValueAtTime(Math.max(18, f - drop), t + dur * 0.8);
    o.connect(g);
    this.play(o, [g], t, t + dur + 0.05);
  }

  /** Short plucked voice: triangle through a falling lowpass. Dry, ticking. */
  pluck(dest: AudioNode, t: number, midi: number, dur: number, level: number, cutoff = 2400): void {
    const { ctx } = this;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.15), t + dur);
    lp.Q.setValueAtTime(2, t);
    const g = this.env(t, dur, level, 0.004);
    lp.connect(g);
    g.connect(dest);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(mtof(midi), t);
    o.connect(lp);
    this.play(o, [lp, g], t, t + dur + 0.03);
  }

  /** Filtered noise burst — percussion, breath, ticks. Reuses shared buffers. */
  noise(
    dest: AudioNode,
    t: number,
    dur: number,
    level: number,
    freq: number,
    q: number,
    type: BiquadFilterType = 'bandpass',
    pink = false,
    attack = 0.002,
  ): void {
    const { ctx } = this;
    const buf = pink ? this.bufs.pink : this.bufs.white;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.Q.setValueAtTime(q, t);
    const g = this.env(t, dur, level, attack);
    f.connect(g);
    g.connect(dest);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true; // seamless buffers, so a long swell cannot run off the end
    // deterministic read offset: variety without an RNG call per note
    const off = ((Math.floor(t * 977) % 1000) / 1000) * buf.duration;
    s.connect(f);
    this.live.add(s);
    s.onended = () => {
      this.live.delete(s);
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
    s.start(t, off);
    s.stop(t + dur + 0.03);
  }

  /** Cut every source this piece started. The bus is already faded by then. */
  stopAll(at: number): void {
    for (const src of [...this.live]) {
      try {
        src.stop(at);
      } catch {
        /* already stopped; harmless */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

interface Layer {
  gain: GainNode;
  /** level when fully faded in */
  level: number;
  /** intensity at which this layer is fully present; 0 = always on */
  at: number;
  active: boolean;
  /** notes must be written into `dest` (the layer gain), never into the bus */
  emit(dest: AudioNode, t: number, step: number): void;
}

interface Built {
  stepDur: number;
  layers: Layer[];
}

interface Piece extends Built {
  bus: GainNode;
  voices: Voices;
}

function layer(ctx: AudioContext, bus: GainNode, level: number, at: number, emit: Layer['emit']): Layer {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.connect(bus);
  return { gain, level, at, active: false, emit };
}

/** Title: one drone, a four-note descent, and a great deal of nothing. */
function buildTitle(ctx: AudioContext, bus: GainNode, v: Voices): Built {
  const PEDAL = 38; // D2 — the whole piece leans on it
  // phrase of 24 steps ~= 33s; note positions are uneven so it never marches
  const MOTIF: Record<number, number> = { 0: 74, 3: 72, 7: 69, 12: 65 };
  return {
    stepDur: 60 / 44,
    layers: [
      layer(ctx, bus, 0.34, 0, (d, t, s) => {
        // retriggered long tones overlap into a continuous bed
        if (s % 12 === 0) v.pad(d, t, [PEDAL, PEDAL + 12], 19, 1, { cutoff: 300, detune: 4, attack: 5 });
      }),
      layer(ctx, bus, 0.5, 0, (d, t, s) => {
        const n = MOTIF[s % 24];
        if (n !== undefined) v.bell(d, t, n, 4.6, 1);
      }),
      layer(ctx, bus, 0.16, 0.45, (d, t, s) => {
        if (s % 24 === 16) v.pad(d, t, [PEDAL + 24, PEDAL + 31], 11, 1, { cutoff: 1700, detune: 9 });
      }),
    ],
  };
}

/** Character creation: two chords breathing against each other. Unhurried. */
function buildCharCreate(ctx: AudioContext, bus: GainNode, v: Voices): Built {
  const CH: readonly number[][] = [
    [45, 52, 57, 64],
    [43, 50, 55, 62],
  ];
  return {
    stepDur: 60 / 40,
    layers: [
      layer(ctx, bus, 0.17, 0, (d, t, s) => {
        if (s % 16 === 0) v.pad(d, t, CH[Math.floor(s / 16) % 2], 21, 1, { cutoff: 620, detune: 6 });
      }),
      layer(ctx, bus, 0.13, 0, (d, t, s) => {
        if (s % 32 === 9) v.bell(d, t, 76, 3.4, 1, 1.41, 1.6);
      }),
      layer(ctx, bus, 0.1, 0.5, (d, t, s) => {
        if (s % 32 === 20) v.pad(d, t, [69, 74], 9, 1, { cutoff: 1900, detune: 11 });
      }),
    ],
  };
}

/** Explore / tense share a grid: `tense` just has more of it switched on. */
function buildExplore(ctx: AudioContext, bus: GainNode, v: Voices, tense: boolean): Built {
  const CHORD = [45, 52, 57];
  const CHORD2 = [46, 53, 58];
  const layers: Layer[] = [
    // a pulse every two bars — the "is something still running?" heartbeat
    layer(ctx, bus, 0.22, 0, (d, t, s) => {
      if (s % 8 === 0) v.sub(d, t, 33, 2.4, 1, 6);
    }),
    layer(ctx, bus, 0.1, 0, (d, t, s) => {
      if (s % 32 === 4) v.pad(d, t, CHORD, 15, 1, { cutoff: 560, detune: 5 });
    }),
  ];
  if (tense) {
    // off-beat pulse: the same heartbeat with something walking beside it
    layers.push(
      layer(ctx, bus, 0.15, 0.3, (d, t, s) => {
        if (s % 8 === 5) v.sub(d, t, 34, 1.1, 1, 4);
      }),
      layer(ctx, bus, 0.09, 0.6, (d, t, s) => {
        if (s % 32 === 18) v.pad(d, t, CHORD2, 13, 1, { cutoff: 700, detune: 18 });
      }),
    );
  }
  return { stepDur: 60 / 50, layers };
}

/** Investigate: dry and curious. Three cycle lengths that never line up. */
function buildInvestigate(ctx: AudioContext, bus: GainNode, v: Voices): Built {
  const NOTES = [62, 65, 67, 69, 72, 69, 65, 67];
  // irregular meter inside a 20-step cycle
  const HITS = new Int8Array(20).fill(-1);
  [0, 3, 6, 8, 11, 14, 16, 19].forEach((k, i) => {
    HITS[k] = i;
  });
  const TICKS = new Uint8Array(18);
  for (const k of [0, 5, 9, 13, 17]) TICKS[k] = 1;
  return {
    stepDur: 0.28,
    layers: [
      layer(ctx, bus, 0.16, 0, (d, t, s) => {
        const i = HITS[s % 20];
        if (i >= 0) v.pluck(d, t, NOTES[i], 0.5, 1, 2600);
      }),
      layer(ctx, bus, 0.07, 0, (d, t, s) => {
        // 18 against 20: the ticking slides out of phase with the plucks
        if (TICKS[s % 18]) v.noise(d, t, 0.04, 1, 5200, 6);
      }),
      layer(ctx, bus, 0.18, 0.3, (d, t, s) => {
        if (s % 40 === 0) v.sub(d, t, 38, 3.6, 1);
      }),
      layer(ctx, bus, 0.09, 0.7, (d, t, s) => {
        const i = HITS[s % 13];
        if (i >= 0) v.pluck(d, t, NOTES[i] + 7, 0.35, 1, 3400);
      }),
    ],
  };
}

/** Weight: heavy dialogue. One cluster, swelling for nine seconds. */
function buildWeight(ctx: AudioContext, bus: GainNode, v: Voices): Built {
  // G3 against Ab3 — a single minor second is the whole emotional argument
  const CLUSTER = [41, 48, 55, 56, 60];
  return {
    stepDur: 2,
    layers: [
      layer(ctx, bus, 0.26, 0, (d, t, s) => {
        if (s % 12 === 0) v.pad(d, t, CLUSTER, 27, 1, { cutoff: 520, detune: 4, attack: 9 });
      }),
      layer(ctx, bus, 0.2, 0, (d, t, s) => {
        if (s % 12 === 0) v.sub(d, t, 29, 26, 1);
      }),
      layer(ctx, bus, 0.07, 0.5, (d, t, s) => {
        if (s % 12 === 6) v.pad(d, t, [67, 68], 20, 1, { cutoff: 1500, detune: 14, attack: 7 });
      }),
      layer(ctx, bus, 0.05, 0.75, (d, t, s) => {
        if (s % 12 === 3) v.noise(d, t, 9, 1, 480, 0.8, 'lowpass', true, 3.5);
      }),
    ],
  };
}

/** Battle: 6/8, restrained, an eight-bar harmonic cycle so it loops seamlessly. */
function buildBattle(ctx: AudioContext, bus: GainNode, v: Voices, boss: boolean): Built {
  // D aeolian: i i VI VI VII VII v v
  const ROOTS = [38, 38, 34, 34, 36, 36, 33, 33];
  const ARP = [12, 19, 24, 19, 15, 19];
  const root = (s: number): number => ROOTS[Math.floor(s / 6) % 8];
  const layers: Layer[] = [
    layer(ctx, bus, 0.3, 0, (d, t, s) => {
      const b = s % 6;
      const r = root(s);
      if (b === 0) v.sub(d, t, r, 0.5, 1, 3);
      else if (b === 3) v.sub(d, t, r, 0.42, 0.85);
      else if (b === 5 && Math.floor(s / 6) % 2 === 1) v.sub(d, t, r + 7, 0.2, 0.6);
    }),
    layer(ctx, bus, 0.22, 0, (d, t, s) => {
      const b = s % 6;
      const bar = Math.floor(s / 6);
      if (b === 0) v.noise(d, t, 0.2, 1, 240, 0.9, 'lowpass');
      else if (b === 3) v.noise(d, t, 0.09, 0.8, 1900, 3);
      // ghost hits derived from the bar index: variation that still loops at 48
      else if ((b === 1 || b === 4) && (bar * 3 + b) % 5 === 1) v.noise(d, t, 0.05, 0.35, 4200, 5);
    }),
    layer(ctx, bus, 0.13, 0.3, (d, t, s) => {
      if (s % 12 === 0) v.pad(d, t, [root(s) + 12, root(s) + 19], 3.4, 1, { cutoff: 900, detune: 7, attack: 0.6 });
    }),
    layer(ctx, bus, 0.14, 0.65, (d, t, s) => {
      v.pluck(d, t, root(s) + ARP[s % 6], 0.16, 1, 2800);
    }),
  ];
  if (boss) {
    layers.push(
      // tritone stack over the root — sour, and always present in a boss fight
      layer(ctx, bus, 0.09, 0, (d, t, s) => {
        if (s % 12 === 6) v.pad(d, t, [root(s) + 18, root(s) + 25], 3.2, 1, { cutoff: 2200, detune: 22, attack: 0.4 });
      }),
      layer(ctx, bus, 0.18, 0, (d, t, s) => {
        if (s % 6 === 0) v.sub(d, t, root(s) - 12, 1.3, 1);
      }),
    );
  }
  return { stepDur: 60 / 252, layers };
}

/** Reveal: one chord that sours and then resolves. Nothing else happens. */
function buildReveal(ctx: AudioContext, bus: GainNode, v: Voices): Built {
  const CH = [45, 52, 56, 59, 64];
  return {
    stepDur: 1,
    layers: [
      layer(ctx, bus, 0.3, 0, (d, t, s) => {
        if (s % 26 === 0) v.pad(d, t, CH, 23, 1, { cutoff: 1000, detune: 4, attack: 6, bend: 38 });
      }),
      layer(ctx, bus, 0.18, 0, (d, t, s) => {
        if (s % 26 === 0) v.sub(d, t, 33, 23, 1);
      }),
      layer(ctx, bus, 0.09, 0.6, (d, t, s) => {
        if (s % 26 === 11) v.bell(d, t, 81, 6, 1, 3.01, 1.4);
      }),
    ],
  };
}

/** Chapter end: the title motif, down a fourth, slower, falling further. */
function buildChapterEnd(ctx: AudioContext, bus: GainNode, v: Voices): Built {
  const PEDAL = 33; // A1
  const MOTIF: Record<number, number> = { 0: 69, 4: 67, 9: 64, 15: 60, 21: 57 };
  return {
    stepDur: 60 / 34,
    layers: [
      layer(ctx, bus, 0.32, 0, (d, t, s) => {
        if (s % 14 === 0) v.pad(d, t, [PEDAL, PEDAL + 12], 22, 1, { cutoff: 280, detune: 4, attack: 6 });
      }),
      layer(ctx, bus, 0.46, 0, (d, t, s) => {
        const n = MOTIF[s % 28];
        if (n !== undefined) v.bell(d, t, n, 5.2, 1, 2.007, 2.2);
      }),
      layer(ctx, bus, 0.2, 0, (d, t, s) => {
        if (s % 28 === 21) v.sub(d, t, PEDAL - 5, 12, 1);
      }),
    ],
  };
}

function build(id: MusicId, ctx: AudioContext, bus: GainNode, v: Voices): Built {
  switch (id) {
    case 'title':
      return buildTitle(ctx, bus, v);
    case 'charcreate':
      return buildCharCreate(ctx, bus, v);
    case 'explore':
      return buildExplore(ctx, bus, v, false);
    case 'tense':
      return buildExplore(ctx, bus, v, true);
    case 'investigate':
      return buildInvestigate(ctx, bus, v);
    case 'weight':
      return buildWeight(ctx, bus, v);
    case 'battle':
      return buildBattle(ctx, bus, v, false);
    case 'battleBoss':
      return buildBattle(ctx, bus, v, true);
    case 'reveal':
      return buildReveal(ctx, bus, v);
    case 'chapterEnd':
      return buildChapterEnd(ctx, bus, v);
  }
}

// ---------------------------------------------------------------------------
// director
// ---------------------------------------------------------------------------

/**
 * Owns the transport. One instance per AudioEngine; the engine hands it the
 * music channel gain to play into and the shared noise buffers to hit.
 */
export class MusicDirector {
  private piece: Piece | null = null;
  private id: MusicId | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cleanups = new Set<ReturnType<typeof setTimeout>>();
  private step = 0;
  private nextStepTime = 0;
  private intensity = 0.5;
  private disposed = false;

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
    private noise: NoiseBuffers,
  ) {}

  get current(): MusicId | null {
    return this.id;
  }

  set(id: MusicId | null, fade = 2, intensity?: number): void {
    if (this.disposed) return;
    if (intensity !== undefined) this.intensity = clamp01(intensity);
    if (id === this.id) {
      this.applyIntensity();
      return;
    }
    const now = this.ctx.currentTime;
    const f = Math.max(0.02, fade);
    if (this.piece) this.retire(this.piece, now, f);
    this.piece = null;
    this.id = id;
    if (!id) {
      this.stopTimer();
      return;
    }
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + f);
    bus.connect(this.out);
    const voices = new Voices(this.ctx, this.noise);
    const built = build(id, this.ctx, bus, voices);
    this.piece = { ...built, bus, voices };
    this.applyIntensity();
    this.step = 0;
    this.nextStepTime = now + 0.08; // a little headroom before the first note
    this.startTimer();
  }

  setIntensity(v: number): void {
    if (this.disposed) return;
    this.intensity = clamp01(v);
    this.applyIntensity();
  }

  stop(fade = 0.6): void {
    this.set(null, fade);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTimer();
    for (const t of this.cleanups) clearTimeout(t);
    this.cleanups.clear();
    if (this.piece) {
      const at = this.ctx.currentTime + 0.02;
      this.piece.voices.stopAll(at);
      this.piece.bus.disconnect();
      for (const l of this.piece.layers) l.gain.disconnect();
      this.piece = null;
    }
    this.id = null;
  }

  /** Fade a piece out, hard-stop its sources after the tail, then unwire it. */
  private retire(p: Piece, now: number, fade: number): void {
    p.bus.gain.cancelScheduledValues(now);
    p.bus.gain.setValueAtTime(Math.max(p.bus.gain.value, 0.0001), now);
    p.bus.gain.linearRampToValueAtTime(0, now + fade);
    const at = now + fade + 0.05;
    p.voices.stopAll(at);
    const h = setTimeout(
      () => {
        this.cleanups.delete(h);
        p.bus.disconnect();
        for (const l of p.layers) l.gain.disconnect();
      },
      (fade + 0.3) * 1000,
    );
    this.cleanups.add(h);
  }

  /**
   * Layers cross-fade over a 0.25-wide window ending at their threshold, so
   * intensity is continuous rather than a set of switches.
   */
  private applyIntensity(): void {
    const p = this.piece;
    if (!p) return;
    const now = this.ctx.currentTime;
    for (const l of p.layers) {
      const k = l.at <= 0 ? 1 : clamp01((this.intensity - (l.at - 0.25)) / 0.25);
      const target = l.level * k;
      l.gain.gain.setTargetAtTime(target, now, 0.35);
      // silent layers stop scheduling entirely; already-sounding notes ring out
      l.active = target > 0.0015;
    }
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(this.tick, TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private tick = (): void => {
    const p = this.piece;
    if (!p || this.disposed) return;
    const now = this.ctx.currentTime;
    // A backgrounded tab throttles this timer; resync instead of trying to
    // schedule every step that was missed (which would be unbounded work).
    if (this.nextStepTime < now - 0.5) this.nextStepTime = now + 0.05;
    let n = 0;
    while (this.nextStepTime < now + LOOKAHEAD && n++ < MAX_STEPS_PER_TICK) {
      for (const l of p.layers) if (l.active) l.emit(this.nextStepTime, this.step);
      this.step++;
      this.nextStepTime += p.stepDur;
    }
  };
}
