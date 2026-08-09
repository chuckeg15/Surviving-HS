/**
 * Audio verification. Neither the author nor any reviewer of this project can
 * hear the game, so "it sounds good" is not a claim we are entitled to make.
 * Measurement is the only evidence anyone gets.
 *
 * This drives a real Chromium with a fake audio device, unlocks the context,
 * taps the bus *after* the compressor — which is what actually reaches the
 * DAC — and for every cue reports:
 *
 *   peak / RMS in dBFS      so a cue that is wildly louder than its neighbours
 *                           shows up as a number instead of a surprise
 *   spectral centroid       so "the confirm blip and the bass do not collide"
 *   low / high band share   is checkable rather than asserted
 *   clipped samples         so a mix that only sounds fine because the limiter
 *                           is working shows up too
 *
 * Plus, for music: the voice budget each piece actually used, and whether the
 * loop's end and start match in level.
 *
 * None of this says anything about whether the result is good. It says the mix
 * is deliberate and the graph is sane.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5178;

const SFX_IDS = [
  'ui.move', 'ui.select', 'ui.back', 'ui.error', 'ui.open', 'ui.close', 'text.blip',
  'step.metal', 'step.grate', 'step.carpet', 'step.tile', 'step.soil',
  'door.open', 'door.close', 'door.locked', 'hatch',
  'terminal.on', 'terminal.key', 'terminal.deny',
  'clue.found', 'clue.link', 'quest.update', 'pickup', 'relation.up', 'relation.down',
  'loom.project', 'battle.start', 'battle.win', 'battle.lose', 'scan',
  'hit.kinetic', 'hit.thermal', 'hit.field', 'hit.cognitive', 'hit.corrosive',
  'shield', 'heal', 'status.apply', 'revenant.collapse', 'alarm.short', 'klaxon',
];

const MUSIC_IDS = [
  'title', 'charcreate', 'explore', 'tense', 'investigate',
  'weight', 'battle', 'battleBoss', 'reveal', 'chapterEnd',
];

const AMB_IDS = ['hab', 'commons', 'spine', 'medical', 'registry', 'cargo', 'watch', 'silence', 'alarm'];

/**
 * Loudness tiers. Cues are mixed against each other, not individually, so the
 * check is "is this cue in the band its job puts it in" — not "is it loud".
 * Peak dBFS at the default channel volumes, measured post-compressor.
 */
const TIER = {
  bed: { lo: -46, hi: -30, of: ['text.blip', 'terminal.key', 'ui.move'] },
  step: { lo: -42, hi: -26, of: ['step.metal', 'step.grate', 'step.carpet', 'step.tile', 'step.soil'] },
  ui: { lo: -38, hi: -22, of: ['ui.select', 'ui.back', 'ui.error', 'ui.open', 'ui.close'] },
  world: {
    lo: -38, hi: -20,
    of: ['door.open', 'door.close', 'door.locked', 'hatch', 'terminal.on', 'terminal.deny', 'scan', 'status.apply'],
  },
  event: {
    lo: -34, hi: -18,
    of: ['clue.found', 'clue.link', 'quest.update', 'pickup', 'relation.up', 'relation.down', 'shield', 'heal'],
  },
  hit: {
    lo: -32, hi: -18,
    of: ['hit.kinetic', 'hit.thermal', 'hit.field', 'hit.cognitive', 'hit.corrosive'],
  },
  punct: {
    lo: -30, hi: -14,
    of: ['loom.project', 'battle.start', 'battle.win', 'battle.lose', 'revenant.collapse', 'alarm.short', 'klaxon'],
  },
};

/**
 * Register discipline. A cue whose job is feedback must sit above the music's
 * bass voice or it will be masked by it and mask it back. The floor is a
 * spectral centroid, in Hz.
 */
const MIN_CENTROID = {
  'text.blip': 900, 'terminal.key': 900, 'ui.move': 900, 'ui.select': 900,
  'ui.back': 700, 'ui.error': 700, 'ui.open': 900, 'ui.close': 700,
  'clue.found': 700, 'clue.link': 800, 'quest.update': 600, 'pickup': 900,
  'scan': 900, 'terminal.deny': 500, 'status.apply': 700,
};

/** Cues whose job IS the bottom of the spectrum. Nothing else may live there. */
const SUB_CUES = new Set(['battle.start', 'revenant.collapse', 'hit.kinetic', 'battle.lose', 'klaxon', 'door.close']);

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined;
}

async function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch { /* not up */ }
    await sleep(250);
  }
  return false;
}

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`);
};

const dbf = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '  -inf');
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

function table(title, rows) {
  console.log(`\n${title}`);
  console.log('  ' + pad('cue', 20) + lpad('peak', 8) + lpad('rms', 8) + lpad('centroid', 10) + lpad('<200Hz', 9) + lpad('>3kHz', 8) + lpad('clip', 6));
  for (const r of rows) {
    console.log(
      '  ' + pad(r.id, 20) + lpad(dbf(r.peak), 8) + lpad(dbf(r.rms), 8) +
      lpad(r.centroid ? r.centroid.toFixed(0) + 'Hz' : '-', 10) +
      lpad((r.low * 100).toFixed(0) + '%', 9) + lpad((r.high * 100).toFixed(0) + '%', 8) +
      lpad(r.clip, 6),
    );
  }
}

/** Installed in the page: everything that needs an AudioContext lives here. */
const RIG = `(async () => {
  const { audio } = await import('/src/core/audio.ts');
  const { settings } = await import('/src/core/settings.ts');
  await Promise.race([audio.resume(), new Promise((r) => setTimeout(r, 3000))]);
  await new Promise((r) => setTimeout(r, 250));
  const graph = audio.debugGraph;
  if (!graph) return { ok: false };
  const ctx = graph.ctx;
  // post-compressor: the signal that actually leaves the graph
  const tap = graph.out || graph.master;

  const sink = ctx.createGain();
  sink.gain.setValueAtTime(0, ctx.currentTime);
  sink.connect(ctx.destination);
  const sp = ctx.createScriptProcessor(1024, 1, 1);
  tap.connect(sp);
  sp.connect(sink);
  const an = ctx.createAnalyser();
  an.fftSize = 4096;
  an.smoothingTimeConstant = 0;
  tap.connect(an);

  const acc = { on: false, peak: 0, sum2: 0, n: 0, clip: 0, blocks: null };
  sp.onaudioprocess = (e) => {
    if (!acc.on) return;
    const d = e.inputBuffer.getChannelData(0);
    let bp = 0, bs = 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      const a = v < 0 ? -v : v;
      if (a > bp) bp = a;
      bs += v * v;
      if (a >= 0.999) acc.clip++;
    }
    if (bp > acc.peak) acc.peak = bp;
    acc.sum2 += bs;
    acc.n += d.length;
    if (acc.blocks) acc.blocks.push({ t: ctx.currentTime, rms: Math.sqrt(bs / d.length), peak: bp });
  };

  const binHz = ctx.sampleRate / an.fftSize;
  const spec = new Float32Array(an.frequencyBinCount);
  const energy = new Float64Array(an.frequencyBinCount);

  async function measure(fn, ms, recordBlocks) {
    acc.on = false; acc.peak = 0; acc.sum2 = 0; acc.n = 0; acc.clip = 0;
    acc.blocks = recordBlocks ? [] : null;
    energy.fill(0);
    acc.on = true;
    if (fn) fn();
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      an.getFloatFrequencyData(spec);
      for (let i = 1; i < spec.length; i++) {
        const m = Math.pow(10, spec[i] / 20);
        energy[i] += m * m;
      }
      await new Promise((r) => setTimeout(r, 12));
    }
    acc.on = false;
    let tot = 0, num = 0, low = 0, high = 0;
    for (let i = 1; i < energy.length; i++) {
      const f = i * binHz;
      tot += energy[i];
      num += energy[i] * f;
      if (f < 200) low += energy[i];
      if (f > 3000) high += energy[i];
    }
    return {
      peak: acc.peak,
      rms: acc.n ? Math.sqrt(acc.sum2 / acc.n) : 0,
      centroid: tot > 0 ? num / tot : 0,
      low: tot > 0 ? low / tot : 0,
      high: tot > 0 ? high / tot : 0,
      clip: acc.clip,
      blocks: acc.blocks,
    };
  }

  window.__rig = { audio, settings, ctx, measure };
  return { ok: true, state: ctx.state, rate: ctx.sampleRate, unlocked: audio.unlocked, hasPost: !!graph.out };
})()`;

async function main() {
  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write('[vite] ' + d));
  if (!(await waitForServer(`http://localhost:${PORT}/`))) throw new Error('server down');

  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: [
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--no-sandbox', '--disable-dev-shm-usage',
      // a fake device means the context actually runs instead of staying suspended
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-device-for-media-stream',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(0);
  // The run takes minutes and spans several evaluates. Vite's HMR client would
  // reload the page the moment anything under src/ is touched, destroying the
  // execution context mid-measurement, so it is stubbed out entirely.
  await page.route('**/@vite/client', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body:
        'export const createHotContext=()=>({accept(){},acceptExports(){},dispose(){},prune(){},' +
        'decline(){},invalidate(){},on(){},off(){},send(){},data:{}});' +
        'export const updateStyle=()=>{};export const removeStyle=()=>{};' +
        'export const injectQuery=(u)=>u;export class ErrorOverlay{}',
    }),
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const boot = await page.evaluate(RIG);
  if (!boot.ok) throw new Error('audio graph never came up');

  // -- per-cue measurement -------------------------------------------------

  const sfx = await page.evaluate(async (ids) => {
    const { audio, measure } = window.__rig;
    const out = [];
    for (const id of ids) {
      await new Promise((r) => setTimeout(r, 220)); // let the previous tail die
      const m = await measure(() => audio.sfx(id), 750);
      delete m.blocks;
      out.push({ id, ...m });
    }
    return out;
  }, SFX_IDS);

  const music = await page.evaluate(async (ids) => {
    const { audio, measure } = window.__rig;
    const out = [];
    for (const id of ids) {
      audio.setMusic(id, { fade: 0.02 });
      // skip the intro: the body is what a player hears for twenty minutes
      const info = audio.debugMusic ? audio.debugMusic.info : null;
      if (info) audio.debugMusic.seek(info.intro);
      await new Promise((r) => setTimeout(r, 700));
      const m = await measure(null, 6000);
      delete m.blocks;
      const budget = audio.debugMusic ? audio.debugMusic.peakVoices() : null;
      out.push({ id, ...m, budget });
      audio.setMusic(null, { fade: 0.05 });
      await new Promise((r) => setTimeout(r, 500));
    }
    return out;
  }, MUSIC_IDS);

  const amb = await page.evaluate(async (ids) => {
    const { audio, measure } = window.__rig;
    const out = [];
    for (const id of ids) {
      audio.setAmbience(id, 0.05);
      await new Promise((r) => setTimeout(r, 700));
      const m = await measure(null, 3000);
      delete m.blocks;
      out.push({ id, ...m });
      audio.setAmbience(null, 0.05);
      await new Promise((r) => setTimeout(r, 400));
    }
    return out;
  }, AMB_IDS);

  // -- loop seams ----------------------------------------------------------

  const seams = await page.evaluate(async (ids) => {
    const { audio, measure } = window.__rig;
    if (!audio.debugMusic) return null;
    const out = [];
    for (const id of ids) {
      audio.setMusic(id, { fade: 0.02 });
      const info = audio.debugMusic.info;
      if (!info) continue;
      const lead = Math.ceil(1.6 / info.stepDur);
      // the transport is a pure function of the step index, so jump to just
      // before the loop point rather than wait a hundred seconds for it
      audio.debugMusic.seek(info.intro + info.loop - lead);
      const boundary = window.__rig.ctx.currentTime + 0.08 + lead * info.stepDur;
      const m = await measure(null, (lead * info.stepDur + 1.6) * 1000 + 200, true);
      const before = m.blocks.filter((b) => b.t < boundary && b.t > boundary - 1.5);
      const after = m.blocks.filter((b) => b.t >= boundary && b.t < boundary + 1.5);
      const rms = (a) => (a.length ? Math.sqrt(a.reduce((s, b) => s + b.rms * b.rms, 0) / a.length) : 0);
      // the largest block-to-block jump anywhere, and the one at the seam:
      // a seam that steps harder than the music ever does is an audible edge
      const deltas = [];
      for (let i = 1; i < m.blocks.length; i++) {
        const a = m.blocks[i - 1].rms, b = m.blocks[i].rms;
        if (a > 1e-6 && b > 1e-6) deltas.push({ t: m.blocks[i].t, d: Math.abs(20 * Math.log10(b / a)) });
      }
      deltas.sort((x, y) => x.d - y.d);
      const p95 = deltas.length ? deltas[Math.floor(deltas.length * 0.95)].d : 0;
      let seamStep = 0;
      for (const d of deltas) if (Math.abs(d.t - boundary) < 0.06 && d.d > seamStep) seamStep = d.d;
      out.push({ id, before: rms(before), after: rms(after), p95, seamStep, blocks: m.blocks.length });
      audio.setMusic(null, { fade: 0.05 });
      await new Promise((r) => setTimeout(r, 400));
    }
    return out;
  }, MUSIC_IDS);

  // -- worst case ----------------------------------------------------------

  const stress = await page.evaluate(async () => {
    const { audio, measure } = window.__rig;
    audio.setMusic('battleBoss', { fade: 0.02, intensity: 1 });
    audio.setAmbience('alarm', 0.05);
    await new Promise((r) => setTimeout(r, 900));
    const m = await measure(() => {
      audio.sfx('klaxon');
      audio.sfx('battle.start');
      audio.sfx('revenant.collapse');
      audio.sfx('hit.kinetic');
      audio.sfx('loom.project');
      audio.sfx('alarm.short');
    }, 2200);
    delete m.blocks;
    audio.setMusic(null, { fade: 0.05 });
    audio.setAmbience(null, 0.05);
    return m;
  });

  // -- the original liveness suite ----------------------------------------

  const live = await page.evaluate(async (arg) => {
    const { audio, settings, ctx, measure } = window.__rig;
    const out = { sfxThrew: [], musicThrew: [], ambThrew: [] };
    for (const id of arg.sfx) {
      try { audio.sfx(id); } catch (e) { out.sfxThrew.push(id + ': ' + e.message); }
    }
    for (const id of arg.music) {
      try { audio.setMusic(id, { fade: 0.01 }); } catch (e) { out.musicThrew.push(id + ': ' + e.message); }
    }
    for (const id of arg.amb) {
      try { audio.setAmbience(id, 0.01); } catch (e) { out.ambThrew.push(id + ': ' + e.message); }
    }
    audio.setMusic(null, { fade: 0.01 });
    audio.setAmbience(null, 0.01);
    await new Promise((r) => setTimeout(r, 600));

    settings.patch({ masterVolume: 0 });
    await new Promise((r) => setTimeout(r, 250));
    out.muted = (await measure(() => audio.sfx('klaxon'), 500)).peak;
    settings.patch({ masterVolume: 0.75 });
    await new Promise((r) => setTimeout(r, 250));

    const before = ctx.currentTime;
    for (let i = 0; i < 400; i++) audio.sfx('text.blip');
    await new Promise((r) => setTimeout(r, 1200));
    out.survived = ctx.currentTime - before > 0.5;
    return out;
  }, { sfx: SFX_IDS, music: MUSIC_IDS, amb: AMB_IDS });

  const caps = await page.evaluate(async () => {
    const m = await import('/src/core/music.ts');
    return m.VOICE_CAP ?? null;
  });

  await browser.close();
  server.kill('SIGTERM');

  // -- report --------------------------------------------------------------

  console.log('\naudio engine verification');
  console.log(`context ${boot.state} @ ${boot.rate}Hz, post-compressor tap: ${boot.hasPost ? 'yes' : 'NO (pre-comp)'}`);

  const byId = Object.fromEntries(sfx.map((r) => [r.id, r]));
  for (const [name, t] of Object.entries(TIER)) {
    table(`sfx tier "${name}"  (target peak ${t.lo}..${t.hi} dBFS)`, t.of.map((id) => byId[id]).filter(Boolean));
  }
  table('music  (6 s of the loop body, default intensity 0.5)', music);
  table('ambience  (3 s of the bed)', amb);

  if (music[0]?.budget) {
    console.log('\nvoice budget actually used  (carriers per channel, cap in brackets)');
    const chans = ['lead', 'counter', 'bass', 'perc', 'drone'];
    console.log('  ' + pad('piece', 14) + chans.map((c) => lpad(c, 10)).join(''));
    for (const m of music) {
      console.log('  ' + pad(m.id, 14) + chans.map((c) => lpad(m.budget[c] === undefined ? '-' : m.budget[c], 10)).join(''));
    }
    console.log('  ' + pad('cap', 14) + chans.map((c) => lpad(caps ? caps[c] * 2 : '?', 10)).join('') + '   (2x cap = the release overlap of a stolen note)');
  }

  if (seams) {
    console.log('\nloop seams  (level 1.5 s before vs 1.5 s after the loop point)');
    console.log('  ' + pad('piece', 14) + lpad('before', 9) + lpad('after', 9) + lpad('delta', 8) + lpad('seam step', 11) + lpad('p95 step', 10));
    for (const s of seams) {
      const d = s.before > 0 && s.after > 0 ? 20 * Math.log10(s.after / s.before) : NaN;
      console.log('  ' + pad(s.id, 14) + lpad(dbf(s.before), 9) + lpad(dbf(s.after), 9) +
        lpad(isNaN(d) ? '-' : d.toFixed(1) + 'dB', 8) + lpad(s.seamStep.toFixed(1) + 'dB', 11) + lpad(s.p95.toFixed(1) + 'dB', 10));
    }
  }

  console.log(`\nworst case (boss music + alarm bed + 6 loud one-shots): peak ${dbf(stress.peak)} dBFS, ${stress.clip} clipped samples`);

  console.log('\nchecks\n');
  check('engine reports unlocked', boot.unlocked === true, boot.state + ' @ ' + boot.rate + 'Hz');
  check('tap is post-compressor', boot.hasPost === true);
  check(`all ${SFX_IDS.length} sfx cues fire without throwing`, live.sfxThrew.length === 0, live.sfxThrew.join('; '));
  check('all music cues fire without throwing', live.musicThrew.length === 0, live.musicThrew.join('; '));
  check('all ambience beds fire without throwing', live.ambThrew.length === 0, live.ambThrew.join('; '));

  const silent = sfx.filter((r) => r.peak < 0.0015);
  check('every sfx cue emits signal', silent.length === 0, silent.map((r) => r.id).join(', '));
  const mSilent = music.filter((r) => r.peak < 0.0015);
  check('every music cue emits signal', mSilent.length === 0, mSilent.map((r) => r.id).join(', '));
  const aSilent = amb.filter((r) => r.peak < 0.0015);
  check('every ambience bed emits signal', aSilent.length === 0, aSilent.map((r) => r.id).join(', '));

  const offTier = [];
  for (const [name, t] of Object.entries(TIER)) {
    for (const id of t.of) {
      const r = byId[id];
      if (!r) continue;
      const db = 20 * Math.log10(r.peak || 1e-9);
      if (db < t.lo || db > t.hi) offTier.push(`${id} ${db.toFixed(1)} (${name} ${t.lo}..${t.hi})`);
    }
  }
  check('every sfx cue sits in its loudness tier', offTier.length === 0, offTier.slice(0, 6).join('; '));

  const hits = TIER.hit.of.map((id) => 20 * Math.log10(byId[id].peak || 1e-9));
  const hitSpread = Math.max(...hits) - Math.min(...hits);
  check('the five aspect hits are within 5 dB of each other', hitSpread <= 5, hitSpread.toFixed(1) + ' dB spread');

  const badReg = [];
  for (const [id, lo] of Object.entries(MIN_CENTROID)) {
    const r = byId[id];
    if (r && r.centroid < lo) badReg.push(`${id} ${r.centroid.toFixed(0)}Hz < ${lo}Hz`);
  }
  check('feedback cues stay above the bass register', badReg.length === 0, badReg.slice(0, 6).join('; '));

  const intruders = sfx.filter((r) => !SUB_CUES.has(r.id) && r.low > 0.5);
  check('only the cues that own the sub live there', intruders.length === 0,
    intruders.map((r) => `${r.id} ${(r.low * 100).toFixed(0)}%`).join(', '));

  const clipped = [...sfx, ...music, ...amb].filter((r) => r.clip > 0 || r.peak >= 1);
  check('no cue clips', clipped.length === 0, clipped.map((r) => r.id).join(', '));
  check('worst case does not clip', stress.clip === 0 && stress.peak < 1, dbf(stress.peak) + ' dBFS');

  if (music[0]?.budget && caps) {
    const over = [];
    for (const m of music) {
      for (const [c, n] of Object.entries(m.budget)) if (n > caps[c] * 2) over.push(`${m.id}.${c}=${n}`);
    }
    check('no piece exceeds its voice budget', over.length === 0, over.join(', '));
  }

  if (seams) {
    const bad = seams.filter((s) => {
      const d = s.before > 0 && s.after > 0 ? Math.abs(20 * Math.log10(s.after / s.before)) : 99;
      return d > 6;
    });
    check('loop end and start match in level', bad.length === 0, bad.map((s) => s.id).join(', '));
    const edgy = seams.filter((s) => s.seamStep > Math.max(s.p95, 6));
    check('no loop point steps harder than the music does', edgy.length === 0, edgy.map((s) => s.id).join(', '));
  }

  // ambience must not be buried by music: canon §1 says the ship is the score
  const hab = amb.find((r) => r.id === 'hab');
  const explore = music.find((r) => r.id === 'explore');
  if (hab && explore) {
    const d = 20 * Math.log10(hab.rms / (explore.rms || 1e-9));
    check('the room is louder than the exploration music', d > 0, d.toFixed(1) + ' dB');
  }

  check('masterVolume 0 actually silences output', live.muted <= 0.001, 'peak ' + live.muted.toFixed(5));
  check('400 rapid blips do not break the graph', live.survived === true);
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  console.log('\nNOTE: these are measurements, not judgements. They show the mix is');
  console.log('deliberate and the graph is sane. NOBODY HAS LISTENED TO ANY OF IT.');
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
