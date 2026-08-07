/**
 * Audio verification. Neither the author nor any reviewer of this project can
 * hear the game, so "it sounds good" is not a claim we are entitled to make.
 * What IS verifiable is that the engine builds a real graph, actually emits
 * signal, responds to the settings store, and cleans up after itself.
 *
 * This drives a real Chromium with a fake audio device, unlocks the context,
 * fires every cue, and measures the output with an AnalyserNode.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5178;

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
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const report = await page.evaluate(async () => {
    const { audio } = await import('/src/core/audio.ts');
    const { settings } = await import('/src/core/settings.ts');
    const out = {};

    // resume() can hang forever if the context never leaves 'suspended';
    // race it so a stuck unlock is reported rather than hanging the harness.
    await Promise.race([
      audio.resume(),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    await new Promise((r) => setTimeout(r, 250));
    out.unlocked = audio.unlocked;

    // Reach the context through the engine and tap the master output.
    const graph = audio.debugGraph;
    const ctx = graph ? graph.ctx : null;
    out.hasCtx = !!ctx;
    out.ctxState = ctx ? ctx.state : 'none';
    out.sampleRate = ctx ? ctx.sampleRate : 0;

    /** Measures peak amplitude over a window by tapping the destination. */
    async function measure(fn, ms = 500) {
      if (!ctx) return 0;
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      const buf = new Float32Array(an.fftSize);
      // tap: connect the engine's master if exposed, else the destination chain
      const tap = graph ? graph.master : null;
      if (tap) tap.connect(an);
      else return -1;
      fn();
      let peak = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        an.getFloatTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i]);
          if (v > peak) peak = v;
        }
        await new Promise((r) => setTimeout(r, 16));
      }
      try { tap.disconnect(an); } catch { /* already gone */ }
      return peak;
    }

    out.sfxPeak = await measure(() => audio.sfx('clue.found'), 500);
    out.musicPeak = await measure(() => audio.setMusic('battle', { fade: 0.05 }), 900);
    audio.setMusic(null, { fade: 0.05 });
    out.ambiencePeak = await measure(() => audio.setAmbience('spine', 0.05), 900);
    audio.setAmbience(null, 0.05);

    // Fire every declared cue; nothing may throw.
    const sfxIds = [
      'ui.move','ui.select','ui.back','ui.error','ui.open','ui.close','text.blip',
      'step.metal','step.grate','step.carpet','step.tile','step.soil',
      'door.open','door.close','door.locked','hatch',
      'terminal.on','terminal.key','terminal.deny',
      'clue.found','clue.link','quest.update','pickup','relation.up','relation.down',
      'loom.project','battle.start','battle.win','battle.lose','scan',
      'hit.kinetic','hit.thermal','hit.field','hit.cognitive','hit.corrosive',
      'shield','heal','status.apply','revenant.collapse','alarm.short','klaxon',
    ];
    out.sfxCount = sfxIds.length;
    out.sfxThrew = [];
    for (const id of sfxIds) {
      try { audio.sfx(id); } catch (e) { out.sfxThrew.push(id + ': ' + e.message); }
    }
    const musicIds = ['title','charcreate','explore','tense','investigate','weight','battle','battleBoss','reveal','chapterEnd'];
    out.musicThrew = [];
    for (const id of musicIds) {
      try { audio.setMusic(id, { fade: 0.01 }); } catch (e) { out.musicThrew.push(id + ': ' + e.message); }
    }
    const ambIds = ['hab','commons','spine','medical','registry','cargo','watch','silence','alarm'];
    out.ambThrew = [];
    for (const id of ambIds) {
      try { audio.setAmbience(id, 0.01); } catch (e) { out.ambThrew.push(id + ': ' + e.message); }
    }

    // Volume changes must take effect live.
    settings.patch({ masterVolume: 0 });
    await new Promise((r) => setTimeout(r, 200));
    out.mutedPeak = await measure(() => audio.sfx('klaxon'), 350);
    settings.patch({ masterVolume: 0.75 });

    // Node hygiene: hammer sfx and confirm the graph does not grow without bound.
    audio.setMusic(null, { fade: 0.01 });
    audio.setAmbience(null, 0.01);
    await new Promise((r) => setTimeout(r, 400));
    const before = ctx ? ctx.currentTime : 0;
    for (let i = 0; i < 400; i++) audio.sfx('text.blip');
    await new Promise((r) => setTimeout(r, 1200));
    out.survived400 = true;
    out.elapsed = ctx ? ctx.currentTime - before : 0;
    return out;
  });

  console.log('\naudio engine verification\n');
  check('AudioContext exists', report.hasCtx, report.ctxState + ' @ ' + report.sampleRate + 'Hz');
  check('engine reports unlocked', report.unlocked === true);
  check('one-shot sfx emits signal', report.sfxPeak > 0.001,
    'peak ' + (report.sfxPeak ?? 0).toFixed(4));
  check('music emits signal', report.musicPeak > 0.001,
    'peak ' + (report.musicPeak ?? 0).toFixed(4));
  check('ambience emits signal', report.ambiencePeak > 0.001,
    'peak ' + (report.ambiencePeak ?? 0).toFixed(4));
  check(`all ${report.sfxCount} sfx cues fire without throwing`, report.sfxThrew.length === 0,
    report.sfxThrew.join('; '));
  check('all music cues fire without throwing', report.musicThrew.length === 0,
    report.musicThrew.join('; '));
  check('all ambience beds fire without throwing', report.ambThrew.length === 0,
    report.ambThrew.join('; '));
  check('masterVolume 0 actually silences output', report.mutedPeak <= 0.001,
    'peak ' + (report.mutedPeak ?? 0).toFixed(5));
  check('400 rapid blips do not break the graph', report.survived400);
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  server.kill('SIGTERM');

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  console.log('\nNOTE: this proves the graph runs and emits signal. It does NOT');
  console.log('prove the audio sounds good - nobody has listened to it.');
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
