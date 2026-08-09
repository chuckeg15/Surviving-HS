/**
 * The three pieces every non-world screen is built out of: a list cursor, a
 * header bar and a footer hint strip.
 *
 * They were private to menus.ts until a second file needed them. Copying them
 * would have been the shorter change and the wrong one \x7f the whole reason
 * navigation is identical in every menu is that there is exactly one
 * implementation of it to drift from.
 */

import { App } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL } from '@/art/palette';
import { audio } from '@/core/audio';

export class Cursor {
  index = 0;
  constructor(public length: number) {}
  move(_app: App, by: number): boolean {
    if (this.length <= 0) return false;
    const n = (this.index + by + this.length) % this.length;
    if (n === this.index) return false;
    this.index = n;
    audio.sfx('ui.move');
    return true;
  }
  nav(app: App): void {
    if (app.input.repeated('down')) this.move(app, 1);
    if (app.input.repeated('up')) this.move(app, -1);
  }
  clamp(): void {
    if (this.index >= this.length) this.index = Math.max(0, this.length - 1);
  }
}

export function header(p: Painter, title: string, sub?: string): void {
  p.rect(0, 0, VW, 20, PAL.void1);
  p.rect(0, 20, VW, 1, PAL.halo1);
  p.text(title, 8, 6, { color: PAL.halo3 });
  if (sub) p.text(sub, VW - 8, 6, { color: PAL.iron5, align: 'right' });
}

export function footer(p: Painter, hints: string[]): void {
  p.rect(0, VH - 12, VW, 12, PAL.void1);
  p.rect(0, VH - 13, VW, 1, PAL.iron1);
  p.text(hints.join('   '), 8, VH - 9, { color: PAL.iron5 });
}
