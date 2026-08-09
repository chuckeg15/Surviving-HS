/**
 * Progression audit.
 *
 * Two things this project has repeatedly got wrong are invisible to the type
 * checker and to the playtest, because both failure modes compile and render
 * perfectly:
 *
 *   1. A system that is written, correct, and never driven. Ship time had a
 *      complete schedule table and an advanceTime() that nothing called, so the
 *      crew stood still for the whole game.
 *   2. Content that is built, correct, and unreachable. Deck A is five rooms
 *      behind clearances, and clearances are strings — a typo in one of them
 *      seals the deck forever and nothing complains.
 *
 * So this drives the real code and reports what a player would actually
 * experience: does the clock move, do the crew move with it, and does each
 * Chapter One outcome open the route onto Deck A that it promises.
 *
 *   node tools/progression.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5181;

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined;
}

async function waitFor(url, ms = 40000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'],
});
server.stderr.on('data', (d) => process.stderr.write('[vite] ' + d));
if (!await waitFor(`http://localhost:${PORT}/`)) {
  server.kill('SIGTERM');
  throw new Error('dev server did not start');
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const data = await page.evaluate(async () => {
  const dbg = window.__candlewake;
  await dbg.gotoScene('journal');
  const { GameState } = await import('/src/game/state.ts');
  const { clearancesOf } = await import('/src/data/content.ts');
  const { LIFT_STOPS, visibleStops } = await import('/src/data/lifts.ts');
  const { NPCS, npcRoom } = await import('/src/data/npcs.ts');
  const { OUTCOMES, openChapterTwo } = await import('/src/ui/chapter.ts');

  // --- ship time drives on gameplay, not on a wall clock ------------------
  const live = dbg.app.state;
  const clueIds = ['transfer-record', 'hessa-locker', 'stray-testimony', 'mass-manifest',
                   'duct-scuff', 'trave-flask', 'captain-watchlog', 'registry-checksum',
                   'tessera-serial'];
  const startBlock = live.timeBlock;
  for (const c of clueIds) live.findClue(c);
  const drove = { from: startBlock, to: live.timeBlock, beats: clueIds.length };

  // --- the crew relocate as the clock turns -------------------------------
  const ids = Object.keys(NPCS);
  const probeState = new GameState();
  const arrangements = [];
  for (let blk = 0; blk <= 7; blk++) {
    probeState.timeBlock = blk;
    arrangements.push({
      clock: probeState.clock(),
      where: Object.fromEntries(ids.map((id) => [id, npcRoom(NPCS[id], probeState)])),
    });
  }

  // --- Deck A opens by a different route per outcome ----------------------
  const deckA = LIFT_STOPS.find((s) => s.deck === 'A');
  const access = (outcome) => {
    const s = new GameState();
    s.profile.background = 'maintenance';
    if (outcome) {
      OUTCOMES.find((o) => o.id === outcome).apply(s);
      openChapterTwo(s, outcome);
    }
    const cl = clearancesOf(s);
    return {
      listed: visibleStops((f) => s.has(f)).some((x) => x.deck === 'A'),
      lift: cl.includes(deckA.clearance),
      spine: cl.includes('spine-command'),
      safe: cl.includes('command-safe'),
      refusal: deckA.refuse ? deckA.refuse((f) => s.has(f)) : '',
    };
  };
  const routes = { 'chapter one': access(null) };
  for (const o of OUTCOMES) routes[o.id] = access(o.id);

  return { drove, arrangements, routes, crew: ids.length };
});

let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };

// 1. The clock moves on gameplay.
const { drove } = data;
console.log(`ship time: ${drove.beats} beats moved block ${drove.from} -> ${drove.to}`);
if (drove.to <= drove.from) fail('gameplay did not advance ship time at all');

// 2. The crew move with it, and the ring is not deserted.
const shapes = new Set(data.arrangements.map((a) => JSON.stringify(a.where)));
console.log(`crew: ${data.crew} on schedule, ${shapes.size} distinct arrangements over 8 blocks`);
if (shapes.size < 4) fail(`the crew barely move (${shapes.size} arrangements)`);
const ringBlocks = data.arrangements.filter((a) =>
  Object.values(a.where).includes('c-corridor')).length;
console.log(`habitation ring occupied in ${ringBlocks}/8 blocks`);
if (ringBlocks === 0) fail('nobody ever walks the habitation ring');

// 3. Every crew member is somewhere different at least once.
const still = Object.keys(data.arrangements[0].where).filter((id) =>
  new Set(data.arrangements.map((a) => a.where[id])).size === 1);
if (still.length) console.log(`never move: ${still.join(', ')}`);

// 4. Deck A is sealed in Chapter One and opens per outcome afterwards.
console.log('\ndeck A access:');
for (const [k, v] of Object.entries(data.routes)) {
  console.log(`  ${k.padEnd(12)} listed:${String(v.listed).padEnd(6)}` +
    `lift:${String(v.lift).padEnd(6)}spine:${String(v.spine).padEnd(6)}safe:${String(v.safe)}`);
}
const one = data.routes['chapter one'];
if (one.listed || one.lift || one.spine) fail('Deck A is not sealed during Chapter One');
for (const [id, v] of Object.entries(data.routes)) {
  if (id === 'chapter one') continue;
  if (!v.listed) fail(`${id} never tells the player Deck A exists`);
  if (!v.lift && !v.spine) fail(`${id} opens no route onto Deck A`);
}
const safes = Object.entries(data.routes).filter(([, v]) => v.safe).map(([k]) => k);
console.log(`strongroom granted to: ${safes.join(', ') || '(nobody)'}`);
if (safes.length !== 1) fail(`the strongroom should be exactly one route's prize, got ${safes.length}`);
// The refusal must change once the player is on a list, or O3 reads as a bug.
if (data.routes.O3.refusal === one.refusal) fail('O3 gets the same lift refusal as a sealed deck');

if (errors.length) { console.log('\npage errors:', errors); bad += errors.length; }
console.log(bad ? `\n${bad} problem(s)` : '\nprogression is sound');

await browser.close();
server.kill('SIGTERM');
process.exit(bad ? 1 : 0);
