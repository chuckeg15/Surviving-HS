/**
 * Screenshot harness. Boots the dev server, drives the real game in Chromium,
 * and writes PNGs to shots/. Used for the visual review loop — the point is
 * that every visual claim in this project is backed by an image somebody
 * actually looked at.
 *
 *   node tools/capture.mjs                  # default scene list
 *   node tools/capture.mjs --url /smoke.html --name smoke
 *   node tools/capture.mjs --scenario title,charcreate,explore
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = 5173;

/** Finds a preinstalled full Chromium (not headless_shell — we need WebGL). */
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse();
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined;
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

async function startServer() {
  const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', (d) => process.stderr.write('[vite] ' + d));
  const ok = await waitForServer(`http://localhost:${PORT}/`);
  if (!ok) {
    proc.kill('SIGTERM');
    throw new Error('dev server did not start');
  }
  return proc;
}

async function main() {
  if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({
    // The preinstalled Chromium revision may not match the npm playwright
    // build's expectation; point at it explicitly rather than downloading.
    executablePath: process.env.CHROMIUM_PATH || findChromium(),
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('[console] ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  const url = arg('url', '/');
  const name = arg('name', 'shot');
  const scenario = arg('scenario', null);

  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  if (scenario) {
    // Scenario driving is delegated to the game's own debug hook so this file
    // never needs to know about menus or key mappings.
    for (const step of scenario.split(',')) {
      const ok = await page.evaluate(async (s) => {
        const dbg = window.__candlewake;
        if (!dbg || typeof dbg.gotoScene !== 'function') return false;
        await dbg.gotoScene(s);
        return true;
      }, step.trim());
      if (!ok) {
        console.error(`  ! scenario hook unavailable for "${step}"`);
        break;
      }
      await page.waitForTimeout(900);
      const out = path.join(SHOTS, `${name}-${step.trim()}.png`);
      await page.screenshot({ path: out });
      console.log('  wrote', path.relative(ROOT, out));
    }
  } else {
    const out = path.join(SHOTS, `${name}.png`);
    await page.screenshot({ path: out, fullPage: process.argv.includes('--full') });
    console.log('  wrote', path.relative(ROOT, out));
  }

  // Also grab a 1:1 crop of the game frame so pixel work can be inspected
  // without display scaling in the way.
  const frame = await page.$('#frame');
  if (frame) {
    const out = path.join(SHOTS, `${name}-frame.png`);
    await frame.screenshot({ path: out });
    console.log('  wrote', path.relative(ROOT, out));
  }

  const perf = await page.evaluate(() => {
    const d = window.__candlewake;
    return d && d.perf ? d.perf() : null;
  });
  if (perf) console.log('  perf', JSON.stringify(perf));

  await browser.close();
  server.kill('SIGTERM');

  if (errors.length) {
    console.error('\nPAGE ERRORS:');
    for (const e of errors) console.error('  ' + e);
  } else {
    console.log('\nno page errors');
  }
  // npx keeps a child alive past SIGTERM often enough that waiting for a clean
  // exit costs more than it is worth in a capture tool.
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
