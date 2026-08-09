/**
 * Room composition audit.
 *
 * The genre technique this is chasing is that rooms are built from blocks
 * rather than from individual tiles, and the practical consequence is that a
 * well-built room has no dead space: wherever the camera sits, something is in
 * frame. A room authored tile-by-tile, as these are, gets no such guarantee for
 * free \x7f it is entirely possible to write a thirty-tile-wide corridor whose
 * middle third is bare floor, and this project has done exactly that twice.
 *
 * So this measures the property the technique would have given us. It slides a
 * window over every room and reports any window that contains nothing but
 * walkable floor: no prop, no mark, no door, no wall. Those are the regions a
 * player crosses while looking at nothing.
 *
 * It also reports overall furnish density, because the opposite failure is real
 * too \x7f a room so full the player cannot read it.
 *
 *   node tools/composition.mjs           summary + findings
 *   node tools/composition.mjs --map     print every room as a density map
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'src', 'data');
const SHOW_MAP = process.argv.includes('--map');

/**
 * Window size, in tiles. The viewport is 384x216 at a 16px tile, so a screen is
 * 24x13.5 tiles. Half a screen is the useful unit: a full-screen window would
 * only catch catastrophes, and a quarter-screen flags alcoves that are empty on
 * purpose.
 */
const WIN_W = 12;
const WIN_H = 5;

/**
 * How furnished a window has to be to count as composed.
 *
 * The first version of this check asked only whether a window contained ANY
 * prop, and it passed the whole ship \u2014 including the two rooms already
 * recorded as too sparse. One crate floating in eighty-four tiles is still
 * dead space; the eye needs something roughly every few paces, not once per
 * screen. So a window now has to carry a share of its walkable area, with a
 * floor of two, and windows that are mostly wall are exempt because a wall is
 * not dead space, it is architecture.
 */
const MIN_SHARE = 0.05;
const MIN_ITEMS = 2;
const MIN_WALKABLE = 18;

/** Layout characters that are plain walkable floor and nothing else. */
const BARE = new Set(['.', ':', '_', '=', '%']);

const rooms = [];
for (const f of readdirSync(DATA)) {
  if (!/^(rooms|deck-[a-f])\.ts$/.test(f)) continue;
  const text = readFileSync(path.join(DATA, f), 'utf8');
  // id, then the layout array that follows it inside the same object literal
  for (const m of text.matchAll(
    /\n  id: '([a-z0-9-]+)',\n([\s\S]*?)\n  layout: \[\n([\s\S]*?)\n  \],/g,
  )) {
    const [, id, head, body] = m;
    if (!/\n  deck: /.test(head)) continue;
    const rows = [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((r) =>
      // The source escapes backslashes; a layout cell is one source-level char.
      r[1].replace(/\\\\/g, '\\'),
    );
    rooms.push({ file: f, id, rows });
  }
}

let findings = 0;
const report = [];

for (const r of rooms) {
  const h = r.rows.length;
  const w = Math.max(...r.rows.map((x) => x.length));
  const at = (x, y) => r.rows[y]?.[x] ?? '#';

  let floor = 0;
  let furnished = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c === '#' || c === ' ') continue;
      floor++;
      if (!BARE.has(c)) furnished++;
    }
  }
  const density = floor ? furnished / floor : 0;

  // Slide the window. A window is dead if every cell in it is bare floor.
  const dead = [];
  for (let y = 0; y + WIN_H <= h; y++) {
    for (let x = 0; x + WIN_W <= w; x++) {
      let walkable = 0;
      let items = 0;
      for (let dy = 0; dy < WIN_H; dy++) {
        for (let dx = 0; dx < WIN_W; dx++) {
          const c = at(x + dx, y + dy);
          if (c === '#' || c === ' ') continue;
          walkable++;
          if (!BARE.has(c)) items++;
        }
      }
      if (walkable < MIN_WALKABLE) continue;
      const need = Math.max(MIN_ITEMS, Math.round(walkable * MIN_SHARE));
      if (items < need) dead.push([x, y]);
    }
  }

  // Merge overlapping dead windows into one finding per region, or a wide
  // empty corridor reports forty times and nobody reads any of them.
  const regions = [];
  for (const [x, y] of dead) {
    const near = regions.find((g) => Math.abs(g.x - x) <= WIN_W && Math.abs(g.y - y) <= WIN_H);
    if (near) {
      near.x = Math.min(near.x, x);
      near.y = Math.min(near.y, y);
      near.n++;
    } else regions.push({ x, y, n: 1 });
  }

  report.push({ id: r.id, w, h, floor, density, regions });
  findings += regions.length;

  if (SHOW_MAP) {
    console.log(`\n${r.id}  ${w}x${h}  density ${(density * 100).toFixed(0)}%`);
    for (let y = 0; y < h; y++) {
      let line = '';
      for (let x = 0; x < w; x++) {
        const c = at(x, y);
        line += c === '#' || c === ' ' ? '#' : BARE.has(c) ? '.' : 'O';
      }
      console.log('  ' + line);
    }
  }
}

console.log(`\n${rooms.length} rooms measured, window ${WIN_W}x${WIN_H} tiles\n`);

report.sort((a, b) => b.regions.length - a.regions.length || a.density - b.density);
for (const r of report) {
  if (!r.regions.length) continue;
  const where = r.regions.map((g) => `(${g.x},${g.y})`).join(' ');
  console.log(
    `  DEAD SPACE  ${r.id.padEnd(12)} ${String(r.w).padStart(2)}x${String(r.h).padStart(2)}` +
      `  density ${String(Math.round(r.density * 100)).padStart(2)}%  at ${where}`,
  );
}

// Density outliers, reported separately: these are judgement calls, not defects.
const sparse = report.filter((r) => r.density < 0.06 && r.floor > 120);
const dense = report.filter((r) => r.density > 0.45);
if (sparse.length) {
  console.log('\n  thin, but no dead window:');
  for (const r of sparse) console.log(`    ${r.id.padEnd(12)} density ${Math.round(r.density * 100)}%`);
}
if (dense.length) {
  console.log('\n  busy \x7f check it still reads:');
  for (const r of dense) console.log(`    ${r.id.padEnd(12)} density ${Math.round(r.density * 100)}%`);
}

console.log(
  findings
    ? `\n${findings} region(s) a player can cross with nothing in frame`
    : '\nno room has a half-screen of dead space',
);
process.exit(findings ? 1 : 0);
