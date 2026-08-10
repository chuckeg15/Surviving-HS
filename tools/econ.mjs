/**
 * Coherence economy probe.
 *
 * The full balance tool spins a browser and runs hundreds of matches across
 * every pair, and it does not finish in this container. This asks one much
 * narrower question fast: does a fight CONVERGE, and in how many turns.
 *
 * A fight that never resolves is not a balance problem, it is a broken game,
 * and it needs an answer in seconds rather than in an overnight run.
 *
 *   node tools/econ.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5187;
function findChromium() {
  const base = '/opt/pw-browsers';
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
}
async function waitFor(url, ms = 40000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up */ }
    await sleep(250);
  }
  return false;
}
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
server.stderr.on('data', (d) => { if (String(d).includes('Error')) process.stderr.write('[vite] ' + d); });
if (!(await waitFor(`http://localhost:${PORT}/`))) { server.kill(); throw new Error('no dev server'); }

const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2000);

const rows = await page.evaluate(async () => {
  const { BattleScene, ENCOUNTERS, TESSERAE } = await import('/src/combat/battle.ts');
  // "Considered": strike when it can, mend when badly hurt, otherwise recover.
  // Deliberately not optimal - it is the play a thoughtful human actually makes.
  const considered = (me, foe, kit) => {
    const afford = kit.filter((a) => a.cost <= me.coherence);
    if (!afford.length) return kit.find((a) => a.cost === 0) ?? kit[0];
    if (me.integrity < me.maxIntegrity * 0.35) {
      const heal = afford.find((a) => a.kind === 'mend');
      if (heal) return heal;
    }
    // Anything with power is an attack. Filtering on kind === 'strike' meant
    // this policy never once attacked with TALLYMAN, whose damage is carried
    // by two `disrupt` abilities \u2014 and it duly reported that tessera as
    // losing every encounter. The kit was fine; the instrument was not.
    const hit = afford.filter((a) => a.power > 0).sort((a, b) => b.power - a.power);
    if (hit.length) return hit[0];
    return afford.find((a) => a.cost === 0) ?? afford[0];
  };
  const out = [];
  for (const encId of Object.keys(ENCOUNTERS)) {
    for (const tid of Object.keys(TESSERAE)) {
      let wins = 0, turns = 0, unresolved = 0;
      const N = 40;
      for (let i = 0; i < N; i++) {
        const sc = new BattleScene(encId, null);
        sc.simTessera = TESSERAE[tid];
        const r = sc.simulate(considered, 1000 + i, 60);
        if (r.result === 'win') wins++;
        if (!r.result || r.turns >= 60) unresolved++;
        turns += r.turns;
      }
      out.push({ enc: encId, tess: tid, win: wins / N, turns: turns / N, unresolved: unresolved / N });
    }
  }
  return out;
});

let stalls = 0;
console.log('\nencounter            tessera        win%   turns  unresolved%');
for (const r of rows) {
  if (r.unresolved > 0) stalls++;
  console.log(
    `  ${r.enc.padEnd(20)} ${r.tess.padEnd(14)} ` +
    `${String(Math.round(r.win * 100)).padStart(4)}  ${r.turns.toFixed(1).padStart(6)}` +
    `  ${String(Math.round(r.unresolved * 100)).padStart(6)}`,
  );
}
const avg = rows.reduce((a, r) => a + r.turns, 0) / rows.length;
console.log(`\naverage fight ${avg.toFixed(1)} turns; ${stalls} of ${rows.length} pairings stall`);
await browser.close();
server.kill('SIGTERM');
process.exit(stalls ? 1 : 0);
