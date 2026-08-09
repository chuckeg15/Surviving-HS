/**
 * KIT — the list of what the player is carrying, what each thing is, and the
 * one verb any of it takes.
 *
 * Built as list-and-detail because the evidence board already taught the player
 * that shape: cursor on the left, the full record on the right, Z acts on the
 * selection. The one thing this screen does that the board does not is refuse,
 * and it refuses out loud \x7f the reason USE is unavailable is printed under
 * the verb before the key is pressed, because a menu that swallows a press and
 * then explains itself has already spent the player's attention for nothing.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { audio } from '@/core/audio';
import { Cursor, footer, header } from '@/ui/widgets';
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  ItemDef,
  heldItems,
  useBlockedBy,
  useItem,
} from '@/data/items';

/** Left column ends here; the detail panel owns everything to the right. */
const LIST_W = 150;
const DETAIL_X = 160;
const ROWS = 13;

export class KitScene implements Scene {
  readonly id = 'kit';
  readonly modal = true;
  private cursor = new Cursor(1);
  private scroll = 0;
  /**
   * What the last USE actually did, held on screen until the cursor moves. A
   * toast is three seconds and the outcome of spending a thing is worth more
   * reading than that.
   */
  private echo: { name: string; lines: string[] } | null = null;

  enter(app: App): void {
    this.refresh(app);
  }

  private refresh(app: App): void {
    this.cursor.length = Math.max(1, heldItems(app.state).length);
    this.cursor.clamp();
  }

  update(app: App, _dt: number): void {
    if (app.input.pressed('cancel') || app.input.pressed('menu')) {
      audio.sfx('ui.close');
      app.pop();
      return;
    }

    const wasAt = this.cursor.index;
    this.cursor.nav(app);
    if (this.cursor.index !== wasAt) this.echo = null;

    if (app.input.pressed('confirm')) this.tryUse(app);

    if (this.cursor.index < this.scroll) this.scroll = this.cursor.index;
    if (this.cursor.index >= this.scroll + ROWS) this.scroll = this.cursor.index - ROWS + 1;
    void _dt;
  }

  private tryUse(app: App): void {
    const entry = heldItems(app.state)[this.cursor.index];
    if (!entry) {
      audio.sfx('ui.error');
      return;
    }
    const why = useBlockedBy(app.state, entry.def);
    if (why) {
      audio.sfx('ui.error');
      app.toast(why, '\x0A', PAL.iron5);
      return;
    }
    const out = useItem(app.state, entry.def.id);
    if (!out) {
      audio.sfx('ui.error');
      return;
    }
    audio.sfx('ui.select');
    app.toast(out.message, '\x0B', PAL.halo3);
    this.echo = { name: entry.def.name, lines: out.lines };
    this.refresh(app);
  }

  draw(app: App, p: Painter): void {
    const s = app.state;
    p.rect(0, 0, VW, VH, PAL.void1);
    header(p, 'KIT \x7f WHAT YOU ARE CARRYING', s.clock());

    const held = heldItems(s);
    if (!held.length) {
      p.textBlock(
        'You are carrying nothing at all. Stores would consider that an administrative impossibility, ' +
          'and would be right.',
        12,
        34,
        VW - 24,
        { color: PAL.iron4 },
      );
      footer(p, ['X close']);
      return;
    }

    for (let i = 0; i < ROWS; i++) {
      const idx = this.scroll + i;
      if (idx >= held.length) break;
      const { def, count } = held[idx];
      const y = 30 + i * 12;
      const sel = idx === this.cursor.index;
      if (sel) p.rect(6, y - 2, LIST_W, 11, mix(PAL.void2, PAL.halo1, 0.35));
      const ready = useBlockedBy(s, def) === null;
      p.text(ready ? '\x09' : '\x0C', 9, y, { color: ready ? PAL.amber3 : PAL.iron3 });
      p.text(def.name.slice(0, 21), 19, y, { color: sel ? PAL.bone3 : PAL.bone0 });
      if (count > 1) {
        p.text(`x${count}`, 6 + LIST_W - 4, y, { color: PAL.iron5, align: 'right' });
      }
    }
    if (this.scroll > 0) p.text('\x01', 152, 30, { color: PAL.iron4 });
    if (this.scroll + ROWS < held.length) p.text('\x02', 152, VH - 26, { color: PAL.iron4 });

    p.panel(DETAIL_X, 28, VW - DETAIL_X - 8, VH - 44, 'terminal');
    if (this.echo) this.drawEcho(p);
    else this.drawDetail(app, p, held[this.cursor.index].def);

    footer(
      p,
      this.echo
        ? ['\x01\x02 select', 'X close']
        : ['\x01\x02 select', 'Z use', 'X close'],
    );
  }

  private drawDetail(app: App, p: Painter, def: ItemDef): void {
    const w = VW - DETAIL_X - 20;
    p.text(def.name, DETAIL_X + 6, 33, { color: PAL.halo3 });
    p.text(CATEGORY_LABEL[def.category], VW - 14, 33, {
      color: CATEGORY_COLOR[def.category],
      align: 'right',
    });
    p.text(def.stamp, DETAIL_X + 6, 43, { color: PAL.iron5 });
    p.dotRule(DETAIL_X + 4, 53, VW - DETAIL_X - 16, PAL.iron2, 3);
    p.textBlock(def.text, DETAIL_X + 6, 59, w, { color: PAL.bone2, maxLines: 11, ellipsis: true });

    p.dotRule(DETAIL_X + 4, 160, VW - DETAIL_X - 16, PAL.iron2, 3);
    const why = useBlockedBy(app.state, def);
    if (!def.use) {
      p.text('\x07 USE', DETAIL_X + 6, 168, { color: PAL.iron3 });
      p.textBlock(why ?? '', DETAIL_X + 6, 178, w, { color: PAL.iron4, maxLines: 2 });
      return;
    }
    p.text(why ? '\x07 USE' : '\x06 USE', DETAIL_X + 6, 168, {
      color: why ? PAL.iron3 : PAL.halo3,
    });
    p.textBlock(why ?? def.use.prompt, DETAIL_X + 6, 178, w, {
      color: why ? PAL.amber2 : PAL.bone2,
      maxLines: 2,
    });
  }

  private drawEcho(p: Painter): void {
    const echo = this.echo!;
    const w = VW - DETAIL_X - 20;
    p.text(echo.name, DETAIL_X + 6, 33, { color: PAL.halo3 });
    p.text('DONE', VW - 14, 33, { color: PAL.halo2, align: 'right' });
    p.dotRule(DETAIL_X + 4, 43, VW - DETAIL_X - 16, PAL.iron2, 3);
    let y = 49;
    for (const line of echo.lines) {
      if (y > 180) break;
      const n = p.textBlock(line, DETAIL_X + 6, y, w, { color: PAL.bone2 });
      y += n * 9 + 5;
    }
  }
}
