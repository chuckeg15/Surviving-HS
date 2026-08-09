/**
 * Automated playtest.
 *
 * Drives the real build with real key events through the real menus. Nothing
 * here reaches past the UI except to *read* state for assertions, so a pass
 * means a person could have done the same thing with a keyboard.
 *
 *   node tests/e2e/run.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PORT = 5199;
const SHOTS = path.join(ROOT, 'shots', 'playtest');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ' — ' + detail : ''}`);
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  for (const d of readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined;
}

async function waitForServer(url, ms = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  return false;
}

async function main() {
  if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  server.stderr.on('data', (d) => {
    const s = String(d);
    if (s.includes('Error')) process.stderr.write('[vite] ' + s);
  });
  if (!(await waitForServer(`http://localhost:${PORT}/`))) {
    server.kill();
    throw new Error('dev server did not start');
  }

  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const probe = () => page.evaluate(() => window.__candlewake.probe());
  const key = async (k, times = 1, delay = 90) => {
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(k);
      await page.waitForTimeout(delay);
    }
  };
  const hold = async (k, ms) => {
    await page.keyboard.down(k);
    await page.waitForTimeout(ms);
    await page.keyboard.up(k);
    await page.waitForTimeout(120);
  };
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });

  console.log('\nCANDLEWAKE automated playtest\n');

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__candlewake, null, { timeout: 20000 });
  await page.waitForTimeout(1200);

  // --- 1. content integrity -------------------------------------------
  console.log('content integrity');
  const report = await page.evaluate(() => window.__candlewake.validate());
  check('no content errors', report.errors.length === 0, report.errors.slice(0, 6).join(' | '));
  console.log(`    stats: ${JSON.stringify(report.stats)}`);
  if (report.warnings.length) {
    console.log(`    ${report.warnings.length} warning(s):`);
    for (const w of report.warnings.slice(0, 10)) console.log(`      - ${w}`);
  }

  // --- 2. boot + title -------------------------------------------------
  console.log('\nboot');
  check('reaches the title screen', (await probe()).scene === 'title');
  await shot('01-title');

  // --- 3. new game through the real menus ------------------------------
  console.log('\ncharacter creation (real key input)');
  await key('KeyZ'); // NEW GAME
  await page.waitForTimeout(900);
  check('opens character creation', (await probe()).scene === 'charcreate');

  // change posting: down to POSTING row, then right twice -> REGISTRY
  await key('ArrowDown', 2);
  await key('ArrowRight', 2);
  await shot('02-charcreate');
  // walk to SIGN ON and confirm
  await key('ArrowDown', 7);
  await key('KeyZ');
  await page.waitForTimeout(1400);
  const afterCreate = await probe();
  check('signs on into the world', afterCreate.scene === 'explore', afterCreate.scene);
  check('background choice took effect', afterCreate.background === 'registry', afterCreate.background);
  check('issued a tessera', afterCreate.tesserae === 1, String(afterCreate.tesserae));
  await shot('03-explore');

  // --- 4. movement ------------------------------------------------------
  console.log('\nexploration');
  const before = await page.evaluate(() => window.__candlewake.app.state.room);
  await hold('ArrowUp', 500);
  await hold('ArrowLeft', 400);
  await shot('04-moved');
  check('stays in the room while walking', (await probe()).room === before);

  // --- 5. journal -------------------------------------------------------
  console.log('\nevidence board');
  await key('KeyQ');
  await page.waitForTimeout(600);
  check('opens the evidence board', (await probe()).scene === 'journal');
  await shot('06-journal-empty');
  await key('KeyX');
  await page.waitForTimeout(400);
  check('closes back to exploration', (await probe()).scene === 'explore');

  // --- 6. pause + settings ---------------------------------------------
  console.log('\nmenus');
  await key('KeyC');
  await page.waitForTimeout(400);
  check('opens pause', (await probe()).scene === 'pause');
  // RESUME, EVIDENCE, KIT, SETTINGS — this count has to track the pause menu.
  await key('ArrowDown', 3);
  await key('KeyZ');
  await page.waitForTimeout(500);
  check('opens settings', (await probe()).scene === 'settings');
  const volBefore = await page.evaluate(() => window.__candlewake.app.state && localStorage.getItem('candlewake.settings.v1'));
  await key('ArrowRight', 3);
  const volAfter = await page.evaluate(() => localStorage.getItem('candlewake.settings.v1'));
  check('settings changes persist to storage', volBefore !== volAfter);
  await shot('07-settings');
  await key('KeyX');
  await page.waitForTimeout(300);
  await key('KeyX');
  await page.waitForTimeout(300);

  // Walking out of the berth. The door is a two-tile gap in the bottom wall,
  // and which column the earlier holds left the player standing on is a
  // property of the movement model, not of the door — a fixed hold that used
  // to land on the door landed one tile beside it the moment stepping became
  // tile-quantised. So this walks into the bottom wall and, if the wall answers
  // instead of the door, sidesteps a widening distance and comes at it again.
  // A player does exactly this without noticing. What is under test is that
  // walking into a door goes through it, not that one key sequence does.
  let moved = await probe();
  for (let i = 0; i < 6 && moved.room === before; i++) {
    await hold('ArrowDown', 2200);
    await page.waitForTimeout(1400);
    moved = await probe();
    if (moved.room !== before) break;
    await hold(i % 2 ? 'ArrowRight' : 'ArrowLeft', 300 + 260 * i);
  }
  check('walked through a door into a new room', moved.room !== before, `${before} -> ${moved.room}`);
  check('does not bounce straight back through the door', (await probe()).room === moved.room);
  await shot('05-corridor');

  // --- 7. the mystery, played -------------------------------------------
  console.log('\nmystery');
  // jump to the muster station and read the roster terminal by walking to it
  await page.evaluate(() => window.__candlewake.gotoScene('room:c-muster'));
  await page.waitForTimeout(1200);
  check('loads the muster station', (await probe()).room === 'c-muster');

  // The roster terminal sits at tile (4,4); spawn is (11,11). Walk up and left.
  //
  // This used to be a fixed path of three holds and eight left-nudges, and it
  // broke the moment the crew started keeping to their schedules: the muster
  // station now has people standing in it, which of them are present depends on
  // the time block, and the walk ran into one of them. The game was fine — a
  // player simply steps around a crewmate — but the instrument was measuring
  // "does this exact keypath still work" rather than "can evidence be found by
  // examining the world", which is the thing worth asserting.
  //
  // So it now sweeps: approach, then try the interact facing each way from a
  // few nearby tiles. A human does the same thing without noticing.
  await hold('ArrowUp', 1500);
  await hold('ArrowLeft', 1500);
  await hold('ArrowUp', 900);
  await shot('08-muster');
  let gotClue = false;
  const sweep = [
    'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight',
    'ArrowLeft', 'ArrowUp', 'ArrowLeft', 'ArrowDown',
  ];
  outer: for (let lap = 0; lap < 3 && !gotClue; lap++) {
    for (const dir of sweep) {
      await hold(dir, 170);
      await key('KeyZ');
      await page.waitForTimeout(220);
      if ((await probe()).clues > 0) { gotClue = true; break outer; }
    }
    // Nothing within reach from here. Step out one tile and come back at it
    // from a different side rather than pressing the same wall again.
    await hold('ArrowDown', 320);
    await hold('ArrowLeft', 320);
  }
  check('found evidence by examining the world', gotClue, `clues=${(await probe()).clues}`);
  await shot('09-examine');
  await key('KeyZ', 4);

  // --- 8. combat --------------------------------------------------------
  console.log('\ncombat');
  await page.evaluate(() => window.__candlewake.gotoScene('battle'));
  await page.waitForTimeout(1500);
  check('enters a battle', (await probe()).scene === 'battle');
  await shot('10-battle');
  // Messages auto-advance, so a fixed key sequence races the clock \u2014 and
  // the cursor cannot be reset by wrapping either. This used to press Up three
  // times to "return to the top", which only worked while the menu had exactly
  // three rows; adding a fourth action silently made it land one row further
  // down and the scan stopped happening. Wrapping never resets anything.
  //
  // So it reads the cursor and walks to the row it wants. That stays correct
  // however many actions the menu grows.
  const menu = () => page.evaluate(() => window.__candlewake.app.scene?.debugMenu ?? null);
  let scanned = false;
  for (let i = 0; i < 10 && !scanned; i++) {
    // Get to the top-level menu: clear messages, back out of any submenu.
    for (let g = 0; g < 12; g++) {
      const m = await menu();
      if (m?.phase === 'menu') break;
      await key(m?.phase === 'abilities' ? 'KeyX' : 'KeyZ');
      await page.waitForTimeout(220);
    }
    // Walk the cursor onto READ (index 1) rather than assuming where it is.
    for (let g = 0; g < 8; g++) {
      const m = await menu();
      if (!m || m.menuIndex === 1) break;
      await key('ArrowDown');
      await page.waitForTimeout(90);
    }
    await key('KeyZ');
    await page.waitForTimeout(700);
    await key('KeyZ', 2, 300);
    scanned = (await probe()).flags['scanned-sentinel'] === true;
  }
  const afterScan = await probe();
  check(
    'scanning a revenant yields evidence',
    scanned && afterScan.clues > 0,
    `scanned=${scanned} clues=${afterScan.clues}`,
  );
  await shot('11-battle-read');

  // Fight to a conclusion. Confirm alone is not enough: the cursor is left on
  // READ, which is free and always available, so a confirm-only loop re-reads
  // forever and the fight never advances. Each iteration backs out to the root
  // menu, moves to PROJECT, then confirms twice (ability list, then ability).
  // The budget is generous because the balance pass roughly doubled battle
  // length, from 4 turns to 8-11.
  let done = false;
  for (let i = 0; i < 90 && !done; i++) {
    await key('KeyX');
    await page.waitForTimeout(90);
    // The root menu wraps, so a fixed number of ArrowUps is a no-op on a
    // three-item list. Navigate by reading the real cursor position.
    for (let g = 0; g < 4; g++) {
      const b = (await probe()).battle;
      if (!b || b.phase !== 'menu' || b.menuIndex === 0) break;
      await key('ArrowUp');
      await page.waitForTimeout(70);
    }
    await key('KeyZ');
    await page.waitForTimeout(120);
    // Cycle which ability is picked. Slot 0 is the expensive strike, so a loop
    // that always takes slot 0 stalls on "Not enough coherence" the moment the
    // coherence economy bites - which, after the balance pass, it does.
    for (let d = 0; d < i % 4; d++) {
      await key('ArrowDown');
      await page.waitForTimeout(40);
    }
    await key('KeyZ');
    await page.waitForTimeout(140);
    const p = await probe();
    if (p.scene !== 'battle') {
      done = true;
      break;
    }
    const over = await page.evaluate(() => {
      const s = window.__candlewake.app.state;
      return s.has('sentinel-beaten');
    });
    if (over) done = true;
  }
  check('battle resolves to an outcome', done);
  await shot('12-battle-end');

  // --- 9. save / load ---------------------------------------------------
  console.log('\npersistence');
  const saved = await page.evaluate(() => {
    const w = window.__candlewake;
    w.app.state.setFlag('e2e-marker', 'yes');
    w.app.state.findClue('mass-manifest');
    return true;
  });
  await page.evaluate(async () => {
    const { writeSlot } = await import('/src/game/save.ts');
    writeSlot(2, window.__candlewake.app.state);
  });
  const reloaded = await page.evaluate(async () => {
    const { loadSlot } = await import('/src/game/save.ts');
    const s = loadSlot(2);
    return s ? { marker: s.flag('e2e-marker'), clues: s.foundClues().length } : null;
  });
  check('save round-trips state', saved && reloaded && reloaded.marker === 'yes', JSON.stringify(reloaded));
  check('save round-trips evidence', reloaded && reloaded.clues > 0, JSON.stringify(reloaded));

  const corrupt = await page.evaluate(async () => {
    localStorage.setItem('candlewake.save.3', '{not json');
    const { slotInfo } = await import('/src/game/save.ts');
    return slotInfo(3);
  });
  check('a corrupt save is reported, not crashed on', corrupt.damaged === true);

  // --- 9b. the chapter can actually be finished --------------------------
  // Regression guard: ChapterEndScene shipped for a long time with nothing
  // able to reach it. This drives the decision to a real outcome and asserts
  // the world state actually diverged, not just the text.
  console.log('\nchapter ending');
  await page.evaluate(async () => {
    await window.__candlewake.gotoScene('chapter');
  });
  await page.waitForTimeout(700);
  const atDecision = await probe();
  check('the chapter decision is reachable', atDecision.scene === 'chapter-decision',
    `scene=${atDecision.scene}`);
  await shot('13-chapter-decision');

  // choose "say nothing" - always available, so the test never depends on a gate
  for (let i = 0; i < 3; i++) { await key('ArrowDown'); await page.waitForTimeout(70); }
  await key('KeyZ'); await page.waitForTimeout(250);
  await key('KeyZ'); await page.waitForTimeout(900);
  const ended = await probe();
  check('choosing an outcome ends the chapter', ended.scene === 'chapter-end',
    `scene=${ended.scene}`);
  const endState = await page.evaluate(() => {
    const s = window.__candlewake.app.state;
    return { decided: s.flag('chapter-decided'), quiet: s.has('kept-quiet') };
  });
  check('the outcome writes distinct world state', endState.decided === 'O4' && endState.quiet,
    JSON.stringify(endState));
  await shot('14-chapter-end');

  // --- 10. performance --------------------------------------------------
  console.log('\nperformance');
  const perf = await page.evaluate(() => window.__candlewake.perf());
  console.log(`    ${JSON.stringify(perf)}`);
  check('scene draws in a single batched call', perf.calls <= 3, `calls=${perf.calls}`);

  check('no uncaught page errors during the whole run', errors.length === 0, errors.slice(0, 4).join(' | '));

  await browser.close();
  server.kill('SIGTERM');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log('  - ' + f);
  }
  console.log(`\nscreenshots: shots/playtest/`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
