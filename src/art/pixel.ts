/**
 * Pixel drawing primitives. All art in CANDLEWAKE is generated at runtime
 * through this module, so every sprite and tile is composed with the same
 * operations and the same dither patterns — that consistency is what stops
 * procedurally generated art from looking like several different games.
 *
 * Rules enforced here:
 *  - integer coordinates only
 *  - no alpha blending except explicit stipple (hard pixel edges)
 *  - shading is done with palette ramp steps, never with opacity
 */

import { PAL, RAMP, RampKey } from '@/art/palette';
import { Rng } from '@/core/rng';

export interface Surface {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export function surface(w: number, h: number): Surface {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: false })!;
  g.imageSmoothingEnabled = false;
  return { canvas, g, w, h };
}

export function px(s: Surface, x: number, y: number, c: string): void {
  s.g.fillStyle = c;
  s.g.fillRect(x | 0, y | 0, 1, 1);
}

export function rect(s: Surface, x: number, y: number, w: number, h: number, c: string): void {
  s.g.fillStyle = c;
  s.g.fillRect(x | 0, y | 0, w | 0, h | 0);
}

export function hline(s: Surface, x: number, y: number, w: number, c: string): void {
  rect(s, x, y, w, 1, c);
}

export function vline(s: Surface, x: number, y: number, h: number, c: string): void {
  rect(s, x, y, 1, h, c);
}

export function box(s: Surface, x: number, y: number, w: number, h: number, c: string): void {
  hline(s, x, y, w, c);
  hline(s, x, y + h - 1, w, c);
  vline(s, x, y + 1, h - 2, c);
  vline(s, x + w - 1, y + 1, h - 2, c);
}

/**
 * Bevelled block: light on the top/left, shade on the bottom/right. The single
 * most-used shape in the game — every panel, crate and machine housing is one.
 */
export function bevel(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  r: RampKey,
  base = 2,
): void {
  const R = RAMP[r];
  const at = (i: number) => PAL[R[Math.max(0, Math.min(R.length - 1, i))]];
  rect(s, x, y, w, h, at(base));
  hline(s, x, y, w, at(base + 1));
  vline(s, x, y, h, at(base + 1));
  hline(s, x, y + h - 1, w, at(base - 1));
  vline(s, x + w - 1, y, h, at(base - 1));
  px(s, x + w - 1, y, at(base));
  px(s, x, y + h - 1, at(base));
}

/** Inverse bevel — a hole, recess, or screen well. */
export function inset(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  r: RampKey,
  base = 1,
): void {
  const R = RAMP[r];
  const at = (i: number) => PAL[R[Math.max(0, Math.min(R.length - 1, i))]];
  rect(s, x, y, w, h, at(base));
  hline(s, x, y, w, at(base - 1));
  vline(s, x, y, h, at(base - 1));
  hline(s, x, y + h - 1, w, at(base + 1));
  vline(s, x + w - 1, y, h, at(base + 1));
}

/** 2x2 ordered (Bayer) dither. Level 0 = none, 4 = solid. */
const BAYER2 = [
  [0, 2],
  [3, 1],
];

export function dither(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
  level: number,
): void {
  if (level <= 0) return;
  if (level >= 4) {
    rect(s, x, y, w, h, c);
    return;
  }
  s.g.fillStyle = c;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (BAYER2[(y + yy) & 1][(x + xx) & 1] < level) {
        s.g.fillRect((x + xx) | 0, (y + yy) | 0, 1, 1);
      }
    }
  }
}

/** Deterministic speckle — wear, grime, rust, soil. Never random per frame. */
export function speckle(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
  density: number,
  rng: Rng,
): void {
  s.g.fillStyle = c;
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    s.g.fillRect((x + rng.int(w)) | 0, (y + rng.int(h)) | 0, 1, 1);
  }
}

/** Horizontal streak wear, e.g. scuffed deck plate under a doorway. */
export function scuff(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
  count: number,
  rng: Rng,
): void {
  s.g.fillStyle = c;
  for (let i = 0; i < count; i++) {
    const sx = x + rng.int(w);
    const sy = y + rng.int(h);
    const len = 1 + rng.int(3);
    s.g.fillRect(sx | 0, sy | 0, Math.min(len, x + w - sx), 1);
  }
}

/** 1px outline around every non-transparent pixel — sprite readability. */
export function outline(s: Surface, c: string, alsoDiagonal = false): void {
  const img = s.g.getImageData(0, 0, s.w, s.h);
  const d = img.data;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < s.w && y < s.h && d[(y * s.w + x) * 4 + 3] > 0;
  s.g.fillStyle = c;
  const pts: [number, number][] = [];
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (solid(x, y)) continue;
      const near =
        solid(x - 1, y) ||
        solid(x + 1, y) ||
        solid(x, y - 1) ||
        solid(x, y + 1) ||
        (alsoDiagonal &&
          (solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)));
      if (near) pts.push([x, y]);
    }
  }
  for (const [x, y] of pts) s.g.fillRect(x, y, 1, 1);
}

/** Replace one exact colour with another (palette swapping for uniforms/hair). */
export function swap(s: Surface, from: string, to: string): void {
  const img = s.g.getImageData(0, 0, s.w, s.h);
  const d = img.data;
  const f = parseInt(from.slice(1), 16);
  const t = parseInt(to.slice(1), 16);
  const fr = (f >> 16) & 255,
    fg = (f >> 8) & 255,
    fb = f & 255;
  const tr = (t >> 16) & 255,
    tg = (t >> 8) & 255,
    tb = t & 255;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 0 && d[i] === fr && d[i + 1] === fg && d[i + 2] === fb) {
      d[i] = tr;
      d[i + 1] = tg;
      d[i + 2] = tb;
    }
  }
  s.g.putImageData(img, 0, 0);
}

/** Blit one surface onto another at an offset. */
export function stamp(dst: Surface, src: Surface, x: number, y: number): void {
  dst.g.drawImage(src.canvas, x | 0, y | 0);
}

/** Mirror a surface horizontally — used to build left/right facings from one. */
export function mirrorX(src: Surface): Surface {
  const out = surface(src.w, src.h);
  out.g.save();
  out.g.translate(src.w, 0);
  out.g.scale(-1, 1);
  out.g.drawImage(src.canvas, 0, 0);
  out.g.restore();
  return out;
}

/** Shift contents by (dx,dy) — used for the walk-cycle bob. */
export function shift(src: Surface, dx: number, dy: number): Surface {
  const out = surface(src.w, src.h);
  out.g.drawImage(src.canvas, dx | 0, dy | 0);
  return out;
}

export function clearAll(s: Surface): void {
  s.g.clearRect(0, 0, s.w, s.h);
}
