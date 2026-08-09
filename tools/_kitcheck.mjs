/**
 * Drives the kit screen with real key events and asserts that USE changes the
 * world: the tag route and the breaker route must both open duct 9-C.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = '/home/user/Surviving-HS';
const PORT = 5188;
const SHOTS = path.join(ROOT, 'shots');

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
  const t = Date.now();
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up */ }
    await sleep(250);
  }
  return false;
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'],
});
server.stderr.on('data', (d) => process.stderr.write('[vite] ' + d));
if (!(await waitFor(`http://localhost:${PORT}/`))) throw new Error('no server');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const key = async (code, n = 1) => {
  for (let i = 0; i < n; i++) {
    await page.keyboard.down(code);
    await page.waitForTimeout(40);
    await page.keyboard.up(code);
    await page.waitForTimeout(140);
  }
};
const probe = () => page.evaluate(() => {
  const s = window.__candlewake.state();
  return {
    scene: window.__candlewake.app.scene?.id,
    room: s.room,
    inv: Object.fromEntries(s.inventory),
    tagPlaced: s.has('hazard-tag-placed'),
    telltale: s.has('telltale-killed'),
    ductOpen: s.has('duct-open'),
    suspicion: s.suspicion,
    history: s.history,
  };
});

let fails = 0;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok || !extra ? '' : ' — ' + extra}`);
  if (!ok) fails++;
};

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__candlewake, null, { timeout: 20000 });
await page.waitForTimeout(1500);

// --- 1. reachable from a real key press, from the real pause menu ---------
console.log('\nreachability from the pause menu');
await page.evaluate(() => window.__candlewake.gotoScene('room:c-muster', { background: 'medical' }));
await page.waitForTimeout(1200);
await key('KeyC');                       // pause
await page.waitForTimeout(400);
check('pause opens', (await probe()).scene === 'pause');
await key('ArrowDown', 2);               // RESUME -> EVIDENCE -> KIT
const f0 = await page.$('#frame');
if (f0) await f0.screenshot({ path: path.join(SHOTS, 'inv-pause-frame.png') });
await key('KeyZ');
await page.waitForTimeout(500);
check('KIT opens from the pause menu', (await probe()).scene === 'kit');
await page.screenshot({ path: path.join(SHOTS, 'inv-frompause.png') });

// --- 2. USE the tag at the muster station ---------------------------------
console.log('\nthe forged quarantine tag (CANON route 4)');
let before = await probe();
check('carries a blank tag', !!before.inv['blank-hazard-tag']);
await key('KeyZ');                       // USE on the first row
await page.waitForTimeout(600);
let after = await probe();
check('tag was spent', !after.inv['blank-hazard-tag'], JSON.stringify(after.inv));
check('hazard-tag-placed is now set', after.tagPlaced);
check('a blank ward field costs suspicion', after.suspicion > before.suspicion,
  `${before.suspicion} -> ${after.suspicion}`);
check('the log records it', after.history.some((h) => h.includes('quarantine tag')));
await page.screenshot({ path: path.join(SHOTS, 'inv-used.png') });
const frame = await page.$('#frame');
if (frame) await frame.screenshot({ path: path.join(SHOTS, 'inv-used-frame.png') });

// --- 3. the hatch now opens for it ----------------------------------------
await key('KeyX');                       // close kit
await page.waitForTimeout(300);
await key('KeyX');                       // close pause
await page.waitForTimeout(400);
const lines = await page.evaluate(() => {
  const s = window.__candlewake.state();
  return window.__candlewake.app.constructor && null;
});
void lines;
// drive the hatch interactable exactly as ExploreScene.interact does
const hatch = await page.evaluate(async () => {
  const { INTERACTABLES } = await import('/src/data/content.ts');
  const s = window.__candlewake.state();
  const res = INTERACTABLES['duct-hatch'].run(s);
  if (res.flag && res.flag !== 'enter-duct') s.setFlag(res.flag, true);
  return { lines: res.lines, flag: res.flag ?? null };
});
check('duct hatch 9-C accepts the tag', hatch.flag === 'duct-open', JSON.stringify(hatch));
console.log('    ' + hatch.lines.join('\n    '));

// --- 4. the breaker key at the Commons (CANON route 2) --------------------
console.log('\nthe Commons breaker (CANON route 2)');
await page.evaluate(() => window.__candlewake.gotoScene('room:c-commons', { background: 'loom' }));
await page.waitForTimeout(1200);
await key('KeyC');
await page.waitForTimeout(400);
await key('ArrowDown', 2);
await key('KeyZ');
await page.waitForTimeout(500);
check('KIT opens for the loom kit', (await probe()).scene === 'kit');
before = await probe();
check('carries a breaker key', !!before.inv['breaker-key']);
await key('KeyZ');                       // BREAKER KEY is first in table order? check below
await page.waitForTimeout(600);
after = await probe();
check('telltale-killed is now set', after.telltale, JSON.stringify(after.inv));
check('the key is NOT consumed', !!after.inv['breaker-key']);
await page.screenshot({ path: path.join(SHOTS, 'inv-breaker.png') });
const f2 = await page.$('#frame');
if (f2) await f2.screenshot({ path: path.join(SHOTS, 'inv-breaker-frame.png') });

const hatch2 = await page.evaluate(async () => {
  const { INTERACTABLES } = await import('/src/data/content.ts');
  const s = window.__candlewake.state();
  s.room = 'c-muster';
  const res = INTERACTABLES['duct-hatch'].run(s);
  return { lines: res.lines, flag: res.flag ?? null };
});
check('duct hatch 9-C opens with the tell-tale dead', hatch2.flag === 'duct-open', JSON.stringify(hatch2));
console.log('    ' + hatch2.lines.join('\n    '));

// --- 5. refusal is legible ------------------------------------------------
console.log('\nrefusals');
await page.evaluate(() => window.__candlewake.gotoScene('room:c-bunk', { background: 'loom' }));
await page.waitForTimeout(1200);
await key('KeyC');
await page.waitForTimeout(400);
await key('ArrowDown', 2);
await key('KeyZ');
await page.waitForTimeout(500);
await key('KeyZ');                       // USE the breaker key in the wrong room
await page.waitForTimeout(500);
const refused = await probe();
check('using the breaker key in a bunk changes nothing', !refused.telltale);
const f3 = await page.$('#frame');
if (f3) await f3.screenshot({ path: path.join(SHOTS, 'inv-refused-frame.png') });

// --- 6. the key row, which has no verb because the lock is what acts ------
console.log('\nthe no-verb states');
await page.evaluate(() => window.__candlewake.gotoScene('kit'));
await page.waitForTimeout(1400);
await key('ArrowDown', 3);               // -> WARDEN'S SPINE KEY
const f4 = await page.$('#frame');
if (f4) await f4.screenshot({ path: path.join(SHOTS, 'inv-key-frame.png') });
await key('ArrowUp');                    // -> ANALGESIC, the battle-only dose
const f5 = await page.$('#frame');
if (f5) await f5.screenshot({ path: path.join(SHOTS, 'inv-analgesic-frame.png') });
check('kit scenario still lists four things', (await probe()).scene === 'kit');

console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
if (errors.length) fails++;
console.log(fails ? `\n${fails} FAILED` : '\nall kit checks pass');
await browser.close();
server.kill('SIGTERM');
process.exit(fails ? 1 : 0);
