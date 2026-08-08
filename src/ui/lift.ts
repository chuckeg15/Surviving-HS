/**
 * The spine lift.
 *
 * A modal stop-picker rather than a door, because the lift is the one place the
 * player sees the whole ship at once and is told, plainly, which parts of it
 * are closed to them. A refused stop stays listed and explains itself — a
 * destination that silently vanishes teaches the player nothing.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { audio } from '@/core/audio';
import { LiftStop, visibleStops } from '@/data/lifts';
import { clearancesOf } from '@/data/content';
import { settings } from '@/core/settings';

export class LiftScene implements Scene {
  readonly id = 'lift';
  readonly modal = true;
  private index = 0;
  private stops: LiftStop[] = [];
  private message: string | null = null;
  private msgT = 0;
  private travelling = false;
  private t = 0;

  constructor(private currentRoom: string) {}

  enter(app: App): void {
    this.stops = visibleStops((f) => app.state.has(f));
    // start on the deck the player is not currently standing on
    const here = this.stops.findIndex((s) => s.room === this.currentRoom);
    this.index = here >= 0 ? (here + 1) % Math.max(1, this.stops.length) : 0;
    audio.sfx('terminal.on');
  }

  update(app: App, dt: number): void {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.travelling) return;
    const input = app.input;

    if (input.repeated('down')) {
      this.index = (this.index + 1) % this.stops.length;
      audio.sfx('ui.move');
    }
    if (input.repeated('up')) {
      this.index = (this.index - 1 + this.stops.length) % this.stops.length;
      audio.sfx('ui.move');
    }
    if (input.pressed('cancel') || input.pressed('menu')) {
      audio.sfx('ui.back');
      app.pop();
      return;
    }
    if (input.pressed('confirm')) {
      const stop = this.stops[this.index];
      if (!stop) return;
      if (stop.room === this.currentRoom) {
        this.say('You are on this deck.');
        return;
      }
      if (stop.clearance && !clearancesOf(app.state).includes(stop.clearance)) {
        audio.sfx('terminal.deny');
        this.say(stop.refuse?.((f) => app.state.has(f)) ?? 'The panel declines that deck.');
        return;
      }
      this.travelling = true;
      audio.sfx('door.close');
      app.fadeTo(1, '#04070a', () => {
        app.pop();
        // The explore scene beneath performs the actual room load, so the lift
        // never needs to know how rooms are built.
        app.travelTo(stop.room, stop.spawn);
        app.fadeTo(0);
      });
    }
  }

  private say(t: string): void {
    this.message = t;
    this.msgT = 3;
    audio.sfx('ui.error');
  }

  draw(app: App, p: Painter): void {
    const st = settings.get();
    p.scrim(PAL.void0, 0.72);

    const w = 250;
    const rows = Math.max(1, this.stops.length);
    const h = 44 + rows * 22;
    const x = ((VW - w) / 2) | 0;
    const y = ((VH - h) / 2) | 0;

    p.panel(x, y, w, h, 'terminal');
    p.text('SPINE LIFT', x + 8, y + 7, { color: PAL.halo3 });
    p.text('SELECT DECK', x + w - 8, y + 7, { color: PAL.iron4, align: 'right' });
    p.dotRule(x + 6, y + 18, w - 12, PAL.iron2);

    this.stops.forEach((s, i) => {
      const ry = y + 24 + i * 22;
      const sel = i === this.index;
      const open = !s.clearance || clearancesOf(app.state).includes(s.clearance);
      const here = s.room === this.currentRoom;

      if (sel) {
        p.rect(x + 5, ry - 2, w - 10, 20, mix(PAL.void2, PAL.halo1, 0.45));
        p.text('\x05', x + 7, ry + 3, { color: PAL.halo3 });
      }
      const label = open ? (sel ? PAL.bone3 : PAL.bone1) : PAL.iron3;
      p.text(s.label, x + 16, ry, { color: here ? PAL.amber3 : label });
      p.text(s.blurb, x + 16, ry + 9, { color: sel ? PAL.iron5 : PAL.iron3 });

      // Locked state must survive a colourblind player: a word, not a hue.
      if (!open) {
        p.text('SEALED', x + w - 8, ry, { color: PAL.ember2, align: 'right' });
      } else if (here) {
        p.text(st.symbolMarkers ? '\x06 HERE' : 'HERE', x + w - 8, ry, {
          color: PAL.amber3,
          align: 'right',
        });
      }
    });

    if (this.message && this.msgT > 0) {
      const my = y + h + 6;
      p.panel(x, my, w, 18, 'plate');
      p.text(this.message, x + 6, my + 5, { color: PAL.ember3 });
    }

    p.text('\x01\x02 select    Z travel    X close', x + 6, y + h - 11, { color: PAL.iron4 });
  }
}
