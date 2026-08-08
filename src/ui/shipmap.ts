/**
 * Ship map.
 *
 * Shows only rooms the player has actually stood in. A map that reveals the
 * whole ship on turn one answers the question the exploration is asking, and
 * an unvisited deck rendered as a grey blank is a much better prompt than a
 * labelled room the player has never seen.
 *
 * Each entry carries its landmark — the sentence that tells a lost player
 * where they are. That is the map's real job on a ship where six of the
 * fourteen rooms are grey corridors.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { audio } from '@/core/audio';
import { ROOMS } from '@/data/rooms';
import { LIFT_STOPS } from '@/data/lifts';
import { settings } from '@/core/settings';

interface Row {
  id: string;
  name: string;
  deck: string;
  landmark: string;
  here: boolean;
}

export class ShipMapScene implements Scene {
  readonly id = 'shipmap';
  readonly modal = true;
  private rows: Row[] = [];
  private index = 0;

  enter(app: App): void {
    const visited = app.state.visitedRooms();
    // Deck order follows the lift panel, so the map and the lift agree about
    // how the ship is stacked.
    const deckOrder = LIFT_STOPS.map((s) => s.deck);
    this.rows = Object.values(ROOMS)
      .filter((r) => visited.includes(r.id))
      .sort((a, b) => {
        const d = deckOrder.indexOf(a.deck) - deckOrder.indexOf(b.deck);
        return d !== 0 ? d : a.name.localeCompare(b.name);
      })
      .map((r) => ({
        id: r.id,
        name: r.name,
        deck: r.deck,
        landmark: r.landmark,
        here: r.id === app.state.room,
      }));
    const h = this.rows.findIndex((r) => r.here);
    this.index = h >= 0 ? h : 0;
    audio.sfx('ui.open');
  }

  update(app: App, _dt: number): void {
    const input = app.input;
    if (input.pressed('cancel') || input.pressed('map') || input.pressed('menu')) {
      audio.sfx('ui.close');
      app.pop();
      return;
    }
    if (!this.rows.length) return;
    if (input.repeated('down')) {
      this.index = (this.index + 1) % this.rows.length;
      audio.sfx('ui.move');
    }
    if (input.repeated('up')) {
      this.index = (this.index - 1 + this.rows.length) % this.rows.length;
      audio.sfx('ui.move');
    }
  }

  draw(app: App, p: Painter): void {
    const st = settings.get();
    p.scrim(PAL.void0, 0.86);
    p.panel(6, 6, VW - 12, VH - 12, 'terminal');
    p.text('SHIP MAP', 14, 12, { color: PAL.halo3 });
    p.text(`RV CANDLEWAKE \x7f ${app.state.clock()}`, VW - 14, 12, {
      color: PAL.iron4,
      align: 'right',
    });
    p.dotRule(12, 24, VW - 24, PAL.iron2);

    if (!this.rows.length) {
      p.text('No compartments recorded.', 16, 40, { color: PAL.iron5 });
      return;
    }

    // list on the left, landmark for the highlighted room on the right
    // Wide enough for the longest room name; truncating mid-word made the
    // list read as broken rather than abbreviated.
    const listW = 176;
    const top = 30;
    const visible = Math.floor((VH - top - 26) / 12);
    const start = Math.max(0, Math.min(this.index - (visible >> 1), this.rows.length - visible));

    let lastDeck = '';
    let y = top;
    for (let i = start; i < Math.min(this.rows.length, start + visible); i++) {
      const r = this.rows[i];
      if (r.deck !== lastDeck) {
        p.text(`DECK ${r.deck}`, 14, y, { color: PAL.amber3 });
        lastDeck = r.deck;
        y += 11;
      }
      const sel = i === this.index;
      if (sel) p.rect(12, y - 2, listW, 11, mix(PAL.void2, PAL.halo1, 0.4));
      const label = r.here ? PAL.amber3 : sel ? PAL.bone3 : PAL.bone1;
      p.text(sel ? '\x05' : ' ', 14, y, { color: PAL.halo3 });
      p.text(r.name.slice(0, 27), 22, y, { color: label });
      if (r.here) {
        p.text(st.symbolMarkers ? '\x06' : '*', listW + 4, y, { color: PAL.amber3 });
      }
      y += 12;
    }

    const sel = this.rows[this.index];
    const rx = listW + 22;
    const rw = VW - rx - 16;
    p.panel(rx - 6, top - 6, rw + 12, 96, 'inset');
    p.text(sel.name.slice(0, 24), rx, top, { color: PAL.halo3 });
    p.text(`DECK ${sel.deck}`, rx, top + 11, { color: PAL.iron5 });
    p.dotRule(rx, top + 22, rw, PAL.iron2);
    p.textBlock(sel.landmark, rx, top + 28, rw, { color: PAL.bone2, maxLines: 5 });
    if (sel.here) {
      p.text('\x06 YOU ARE HERE', rx, top + 78, { color: PAL.amber3 });
    }

    p.text(
      `${this.rows.length} of ${Object.keys(ROOMS).length} compartments recorded`,
      14,
      VH - 20,
      { color: PAL.iron4 },
    );
    p.text('\x01\x02 select    X close', VW - 14, VH - 20, { color: PAL.iron4, align: 'right' });
  }
}
