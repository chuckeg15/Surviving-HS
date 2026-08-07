/**
 * Painter: every pixel of UI in CANDLEWAKE is drawn here, on a 2D canvas that
 * shares the world's 384x216 grid. Nothing in the interface is a DOM element,
 * which means the UI can never scale differently from the game, never
 * anti-aliases, and never picks up a system font.
 */

import { PAL, mix } from '@/art/palette';
import { ADVANCE, GLYPH_H, GLYPH_W, LINE_H, glyphRows, wrapText } from '@/art/font';
import { VH, VW } from '@/core/screen';

const ATLAS_CHARS = 127;

/** Cached one-colour font atlases, keyed by css colour. */
const atlasCache = new Map<string, HTMLCanvasElement>();

function fontAtlas(color: string): HTMLCanvasElement {
  const hit = atlasCache.get(color);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = ATLAS_CHARS * ADVANCE;
  c.height = GLYPH_H;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = color;
  for (let code = 1; code < ATLAS_CHARS; code++) {
    const rows = glyphRows(code);
    const ox = code * ADVANCE;
    for (let y = 0; y < GLYPH_H; y++) {
      const bits = rows[y];
      if (!bits) continue;
      for (let x = 0; x < GLYPH_W; x++) {
        if (bits & (1 << (GLYPH_W - 1 - x))) g.fillRect(ox + x, y, 1, 1);
      }
    }
  }
  atlasCache.set(color, c);
  return c;
}

export type PanelStyle = 'terminal' | 'plate' | 'dialogue' | 'inset' | 'ghost';

export interface TextOpts {
  color?: string;
  // NOTE: PAL is `as const`, so callers passing PAL values need widening.
  /** Draws a 1px offset copy underneath so text stays legible over art. */
  shadow?: string | null;
  /** Integer scale for headings. Keeps pixels square. */
  scale?: number;
  align?: 'left' | 'center' | 'right';
  /** Render only the first N characters (for typewriter reveal). */
  limit?: number;
  /** Extra pixels between characters. */
  tracking?: number;
}

export class Painter {
  constructor(public ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, VW, VH);
  }

  /** Solid rectangle. All coordinates are floored to keep edges hard. */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0));
  }

  /** 1px outline, drawn inside the given bounds. */
  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y + 1, 1, h - 2, color);
    this.rect(x + w - 1, y + 1, 1, h - 2, color);
  }

  /** Horizontal dotted rule — used to break dense readouts without noise. */
  dotRule(x: number, y: number, w: number, color: string, step = 2): void {
    this.ctx.fillStyle = color;
    for (let i = 0; i < w; i += step) this.ctx.fillRect((x + i) | 0, y | 0, 1, 1);
  }

  alpha(a: number, fn: () => void): void {
    const prev = this.ctx.globalAlpha;
    this.ctx.globalAlpha = a;
    fn();
    this.ctx.globalAlpha = prev;
  }

  /** Full-screen wash, used for fades and modal dimming. */
  scrim(color: string, a: number): void {
    this.alpha(a, () => this.rect(0, 0, VW, VH, color));
  }

  /**
   * Panels are the game's chrome. They are drawn, not blitted, so that any
   * size works and the corners always land on whole pixels.
   *
   * - terminal: recessed dark glass with a haloed border and corner notches.
   *   Used for anything the ship itself is saying.
   * - plate:    stamped metal with a bevel. Used for player-side menus.
   * - dialogue: high-contrast speech box, deliberately the most readable
   *   surface in the game.
   * - inset:    a shallow well for list interiors and readouts.
   * - ghost:    border only, for non-modal annotation.
   */
  panel(x: number, y: number, w: number, h: number, style: PanelStyle = 'plate'): void {
    x |= 0;
    y |= 0;
    w |= 0;
    h |= 0;
    switch (style) {
      case 'terminal': {
        this.rect(x, y, w, h, PAL.brine0);
        this.rect(x + 1, y + 1, w - 2, h - 2, PAL.void1);
        this.frame(x, y, w, h, PAL.halo1);
        // corner notches: reads as machined hardware rather than a web box
        this.rect(x, y, 3, 1, PAL.halo3);
        this.rect(x, y, 1, 3, PAL.halo3);
        this.rect(x + w - 3, y + h - 1, 3, 1, PAL.halo3);
        this.rect(x + w - 1, y + h - 3, 1, 3, PAL.halo3);
        break;
      }
      case 'plate': {
        this.rect(x, y, w, h, PAL.iron1);
        this.rect(x + 1, y + 1, w - 2, h - 2, PAL.iron0);
        this.rect(x + 1, y + 1, w - 2, 1, PAL.iron3); // top light
        this.rect(x + 1, y + 1, 1, h - 2, PAL.iron2);
        this.rect(x + 1, y + h - 2, w - 2, 1, PAL.void1); // bottom shade
        this.rect(x + w - 2, y + 1, 1, h - 2, PAL.void1);
        this.frame(x, y, w, h, PAL.void0);
        break;
      }
      case 'dialogue': {
        this.rect(x, y, w, h, PAL.void1);
        this.frame(x, y, w, h, PAL.iron4);
        this.frame(x + 1, y + 1, w - 2, h - 2, PAL.iron1);
        this.rect(x + 2, y + 2, w - 4, 1, PAL.iron2);
        break;
      }
      case 'inset': {
        this.rect(x, y, w, h, PAL.void2);
        this.rect(x, y, w, 1, PAL.void0);
        this.rect(x, y, 1, h, PAL.void0);
        this.rect(x, y + h - 1, w, 1, PAL.iron1);
        this.rect(x + w - 1, y, 1, h, PAL.iron1);
        break;
      }
      case 'ghost': {
        this.frame(x, y, w, h, PAL.iron2);
        break;
      }
    }
  }

  /** Draws text. Returns the pixel width actually consumed. */
  text(s: string, x: number, y: number, o: TextOpts = {}): number {
    const color = o.color ?? PAL.bone3;
    const scale = Math.max(1, (o.scale ?? 1) | 0);
    const tracking = o.tracking ?? 0;
    const adv = ADVANCE * scale + tracking;
    const limit = o.limit ?? s.length;
    const shown = limit >= s.length ? s : s.slice(0, Math.max(0, limit | 0));
    const w = shown.length * adv;
    let ox = x | 0;
    if (o.align === 'center') ox = (x - (s.length * adv) / 2) | 0;
    else if (o.align === 'right') ox = (x - s.length * adv) | 0;

    const paint = (col: string, dx: number, dy: number) => {
      const atlas = fontAtlas(col);
      for (let i = 0; i < shown.length; i++) {
        const code = shown.charCodeAt(i);
        if (code === 32) continue;
        if (code >= ATLAS_CHARS) continue;
        this.ctx.drawImage(
          atlas,
          code * ADVANCE,
          0,
          GLYPH_W,
          GLYPH_H,
          ox + i * adv + dx,
          (y | 0) + dy,
          GLYPH_W * scale,
          GLYPH_H * scale,
        );
      }
    };

    if (o.shadow) paint(o.shadow, scale, scale);
    paint(color, 0, 0);
    return w;
  }

  /** Word-wrapped block. Returns the number of lines drawn. */
  textBlock(
    s: string,
    x: number,
    y: number,
    maxW: number,
    o: TextOpts & { lineHeight?: number; maxLines?: number } = {},
  ): number {
    const scale = Math.max(1, (o.scale ?? 1) | 0);
    const lines = wrapText(s, maxW / scale);
    const lh = o.lineHeight ?? LINE_H * scale;
    const max = o.maxLines ?? lines.length;
    let budget = o.limit ?? Infinity;
    let drawn = 0;
    for (let i = 0; i < Math.min(lines.length, max); i++) {
      if (budget <= 0) break;
      const take = Math.min(lines[i].length, budget);
      this.text(lines[i], x, y + i * lh, { ...o, limit: take });
      budget -= lines[i].length;
      drawn++;
    }
    return drawn;
  }

  /** Total lines a block would occupy — used for layout before drawing. */
  measureBlock(s: string, maxW: number, scale = 1): number {
    return wrapText(s, maxW / scale).length;
  }

  /** A meter bar. Fill colour ramps by fraction so damage reads at a glance. */
  meter(
    x: number,
    y: number,
    w: number,
    h: number,
    frac: number,
    opts: { hi?: string; mid?: string; lo?: string; back?: string; ghost?: number } = {},
  ): void {
    const f = Math.max(0, Math.min(1, frac));
    this.rect(x, y, w, h, opts.back ?? PAL.void0);
    this.frame(x - 1, y - 1, w + 2, h + 2, PAL.iron2);
    // ghost shows the pre-hit value draining behind the live bar
    if (opts.ghost !== undefined && opts.ghost > f) {
      this.rect(x, y, Math.round(w * Math.min(1, opts.ghost)), h, PAL.ember1);
    }
    const col =
      f > 0.5 ? (opts.hi ?? PAL.halo3) : f > 0.22 ? (opts.mid ?? PAL.amber2) : (opts.lo ?? PAL.ember2);
    const fw = Math.round(w * f);
    if (fw > 0) {
      this.rect(x, y, fw, h, col);
      if (h >= 3) this.rect(x, y, fw, 1, mix(col, '#ffffff', 0.35));
    }
  }

  /** Blit from any generated canvas (sprites, portraits, icons). */
  blit(
    src: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw = sw,
    dh = sh,
  ): void {
    this.ctx.drawImage(src, sx | 0, sy | 0, sw | 0, sh | 0, dx | 0, dy | 0, dw | 0, dh | 0);
  }

  /** Clip helper that always restores. */
  clip(x: number, y: number, w: number, h: number, fn: () => void): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x | 0, y | 0, w | 0, h | 0);
    this.ctx.clip();
    fn();
    this.ctx.restore();
  }

  /**
   * Scanline + vignette pass used on terminal surfaces only. Applied to a
   * region rather than the whole screen so that gameplay readability is never
   * traded for atmosphere.
   */
  crt(x: number, y: number, w: number, h: number, strength = 0.14): void {
    this.alpha(strength, () => {
      for (let yy = 0; yy < h; yy += 2) this.rect(x, y + yy, w, 1, PAL.void0);
    });
  }
}

export { wrapText, LINE_H, ADVANCE };
