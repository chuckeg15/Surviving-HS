/**
 * All non-world screens: title, character creation, pause, settings, the
 * evidence board, and the chapter-end summary.
 *
 * Everything here is keyboard/controller driven with the same list widget, so
 * navigation is identical in every menu — the fastest interface is the one the
 * player only has to learn once.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { audio } from '@/core/audio';
import { settings, TextSpeed } from '@/core/settings';
import { GameState, RELATION_ORDER } from '@/game/state';
import {
  ACCESSORIES,
  Accessory,
  BodyFrame,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  HairStyle,
  ActorLook,
  CELL_H,
  CELL_W,
  FACING_ROW,
  getActorSheet,
  getPortrait,
} from '@/art/actors';
import { BACKGROUNDS, CLUES, DEDUCTIONS, availableDeductions, reconcile, satisfiedSet } from '@/data/content';
import { NPCS } from '@/data/npcs';
import { allSlots, formatPlaytime, loadSlot, writeSlot, SLOT_COUNT } from '@/game/save';
import { ACTIONS, keyLabel } from '@/core/input';
import { Cursor, footer, header } from '@/ui/widgets';
import { KitScene } from '@/ui/inventory';

// =====================================================================
// TITLE
// =====================================================================

export class TitleScene implements Scene {
  readonly id = 'title';
  readonly hidesWorld = true;
  private cursor = new Cursor(3);
  private t = 0;
  private items: { label: string; run: (app: App) => void; enabled: boolean }[] = [];
  private slotMode = false;
  private slotCursor = new Cursor(SLOT_COUNT + 1);

  enter(app: App): void {
    audio.setMusic('title', { fade: 2 });
    audio.setAmbience('silence', 2);
    this.rebuild(app);
  }

  private rebuild(app: App): void {
    const slots = allSlots();
    const canContinue = slots.some((s) => !s.empty && !s.damaged);
    this.items = [
      { label: 'NEW GAME', enabled: true, run: (a) => a.transition(new CharCreateScene()) },
      {
        label: 'CONTINUE',
        enabled: canContinue,
        run: () => {
          this.slotMode = true;
          this.slotCursor.index = 0;
        },
      },
      { label: 'SETTINGS', enabled: true, run: (a) => a.push(new SettingsScene()) },
    ];
    this.cursor.length = this.items.length;
    void app;
  }

  update(app: App, dt: number): void {
    this.t += dt;
    if (this.slotMode) {
      this.slotCursor.nav(app);
      if (app.input.pressed('cancel')) {
        audio.sfx('ui.back');
        this.slotMode = false;
      }
      if (app.input.pressed('confirm')) {
        const info = allSlots()[this.slotCursor.index];
        if (info.empty || info.damaged) {
          audio.sfx('ui.error');
          return;
        }
        const st = loadSlot(info.slot);
        if (!st) {
          audio.sfx('ui.error');
          return;
        }
        audio.sfx('ui.select');
        app.state = st;
        void import('@/ui/explore').then(({ ExploreScene }) => {
          app.transition(new ExploreScene());
        });
      }
      return;
    }
    this.cursor.nav(app);
    if (app.input.pressed('confirm')) {
      const it = this.items[this.cursor.index];
      if (!it.enabled) {
        audio.sfx('ui.error');
        return;
      }
      audio.sfx('ui.select');
      it.run(app);
    }
  }

  draw(app: App, p: Painter): void {
    p.rect(0, 0, VW, VH, PAL.void0);
    // slow star drift — the only motion on the screen
    for (let i = 0; i < 60; i++) {
      const x = (i * 61 + Math.floor(this.t * (2 + (i % 3)))) % VW;
      const y = (i * 37) % (VH - 40);
      p.rect(x, y + 10, 1, 1, i % 5 === 0 ? PAL.bone1 : PAL.iron2);
    }
    p.rect(0, VH - 74, VW, 74, PAL.void1);
    p.rect(0, VH - 75, VW, 1, PAL.iron1);

    p.text('CANDLEWAKE', VW / 2, 44, { color: PAL.halo3, scale: 3, align: 'center' });
    p.text('RV CANDLEWAKE \x7f VERGE-CLASS \x7f REGISTRY LT-9', VW / 2, 74, {
      color: PAL.iron5,
      align: 'center',
    });
    p.dotRule(VW / 2 - 90, 84, 180, PAL.iron2, 3);
    p.text('A MYSTERY IN ONE WATCH', VW / 2, 92, { color: PAL.bone0, align: 'center' });

    if (this.slotMode) {
      this.drawSlots(p);
      footer(p, ['\x01\x02 select', 'Z load', 'X back']);
      return;
    }

    this.items.forEach((it, i) => {
      const y = VH - 62 + i * 14;
      const sel = i === this.cursor.index;
      const col = !it.enabled ? PAL.iron2 : sel ? PAL.bone3 : PAL.bone0;
      if (sel) {
        p.rect(VW / 2 - 60, y - 2, 120, 12, mix(PAL.void2, PAL.halo1, 0.4));
        p.text('\x05', VW / 2 - 56, y + 1, { color: PAL.halo3 });
      }
      p.text(it.label, VW / 2 + 4, y + 1, { color: col, align: 'center' });
    });
    footer(p, ['\x01\x02 select', 'Z confirm']);
    void app;
  }

  private drawSlots(p: Painter): void {
    const slots = allSlots();
    p.panel(40, VH - 70, VW - 80, 58, 'terminal');
    slots.forEach((s, i) => {
      const y = VH - 66 + i * 13;
      const sel = i === this.slotCursor.index;
      if (sel) p.rect(43, y - 1, VW - 86, 11, mix(PAL.void2, PAL.halo1, 0.35));
      const label = s.slot === 0 ? 'AUTO' : `SLOT ${s.slot}`;
      p.text(label, 46, y + 1, { color: sel ? PAL.halo3 : PAL.iron5 });
      if (s.damaged) {
        p.text('DAMAGED \x7f cannot be read', 90, y + 1, { color: PAL.ember3 });
      } else if (s.empty) {
        p.text('empty', 90, y + 1, { color: PAL.iron3 });
      } else {
        p.text(`${s.name}  ${s.clock}  ${s.clues} ev  ${formatPlaytime(s.playSeconds ?? 0)}`, 90, y + 1, {
          color: sel ? PAL.bone3 : PAL.bone0,
        });
      }
    });
  }
}

// =====================================================================
// CHARACTER CREATION
// =====================================================================

type CcField =
  | 'name'
  | 'pronouns'
  | 'background'
  | 'frame'
  | 'skin'
  | 'hair'
  | 'hairColor'
  | 'eyeColor'
  | 'accessory'
  | 'confirm';

const PRONOUNS = ['they/them', 'she/her', 'he/him', 'xe/xem'] as const;
const FRAMES: BodyFrame[] = ['slight', 'average', 'broad'];
const NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-\' ';

export class CharCreateScene implements Scene {
  readonly id = 'charcreate';
  readonly hidesWorld = true;
  private fields: CcField[] = [
    'name',
    'pronouns',
    'background',
    'frame',
    'skin',
    'hair',
    'hairColor',
    'eyeColor',
    'accessory',
    'confirm',
  ];
  private cursor = new Cursor(10);
  private look: ActorLook;
  private name = 'QUILLON';
  private pronounIdx = 0;
  private bgIdx = 0;
  private editingName = false;
  private nameCursor = 0;
  private t = 0;

  constructor() {
    const b = BACKGROUNDS[0];
    this.look = {
      frame: 'average',
      skin: 3,
      hair: 'crop',
      hairColor: HAIR_COLORS[3],
      eyeColor: EYE_COLORS[2],
      uniform: b.uniform,
      accent: b.accent,
      accessory: 'none',
    };
  }

  enter(app: App): void {
    audio.setMusic('charcreate', { fade: 1.5 });
    audio.setAmbience('registry', 1.5);
    app.updateSheet('cc-preview', this.look);
  }

  private syncLook(app: App): void {
    const b = BACKGROUNDS[this.bgIdx];
    this.look.uniform = b.uniform;
    this.look.accent = b.accent;
    app.updateSheet('cc-preview', this.look);
  }

  update(app: App, dt: number): void {
    this.t += dt;
    const field = this.fields[this.cursor.index];

    if (this.editingName) {
      this.updateName(app);
      return;
    }

    this.cursor.nav(app);
    const left = app.input.repeated('left');
    const right = app.input.repeated('right');
    const delta = right ? 1 : left ? -1 : 0;

    if (delta !== 0) {
      audio.sfx('ui.move');
      switch (field) {
        case 'pronouns':
          this.pronounIdx = (this.pronounIdx + delta + PRONOUNS.length) % PRONOUNS.length;
          break;
        case 'background':
          this.bgIdx = (this.bgIdx + delta + BACKGROUNDS.length) % BACKGROUNDS.length;
          this.syncLook(app);
          break;
        case 'frame':
          this.look.frame = FRAMES[(FRAMES.indexOf(this.look.frame) + delta + 3) % 3];
          this.syncLook(app);
          break;
        case 'skin':
          this.look.skin = Math.max(0, Math.min(5, this.look.skin + delta));
          this.syncLook(app);
          break;
        case 'hair': {
          const i = HAIR_STYLES.indexOf(this.look.hair as HairStyle);
          this.look.hair = HAIR_STYLES[(i + delta + HAIR_STYLES.length) % HAIR_STYLES.length];
          this.syncLook(app);
          break;
        }
        case 'hairColor': {
          const i = HAIR_COLORS.indexOf(this.look.hairColor);
          this.look.hairColor = HAIR_COLORS[(i + delta + HAIR_COLORS.length) % HAIR_COLORS.length];
          this.syncLook(app);
          break;
        }
        case 'eyeColor': {
          const i = EYE_COLORS.indexOf(this.look.eyeColor);
          this.look.eyeColor = EYE_COLORS[(i + delta + EYE_COLORS.length) % EYE_COLORS.length];
          this.syncLook(app);
          break;
        }
        case 'accessory': {
          const i = ACCESSORIES.indexOf(this.look.accessory as Accessory);
          this.look.accessory = ACCESSORIES[(i + delta + ACCESSORIES.length) % ACCESSORIES.length];
          this.syncLook(app);
          break;
        }
      }
    }

    if (app.input.pressed('confirm')) {
      if (field === 'name') {
        this.editingName = true;
        audio.sfx('ui.open');
      } else if (field === 'confirm') {
        audio.sfx('ui.select');
        this.begin(app);
      }
    }
    if (app.input.pressed('cancel')) {
      audio.sfx('ui.back');
      app.transition(new TitleScene());
    }
  }

  private updateName(app: App): void {
    if (app.input.pressed('cancel') || app.input.pressed('confirm')) {
      this.editingName = false;
      audio.sfx('ui.close');
      if (!this.name.trim()) this.name = 'QUILLON';
      return;
    }
    if (app.input.repeated('left')) {
      this.nameCursor = Math.max(0, this.nameCursor - 1);
      audio.sfx('ui.move');
    }
    if (app.input.repeated('right')) {
      this.nameCursor = Math.min(11, this.nameCursor + 1);
      audio.sfx('ui.move');
    }
    const cycle = (d: number) => {
      const chars = this.name.padEnd(12, ' ').split('');
      const cur = NAME_CHARS.indexOf(chars[this.nameCursor] ?? ' ');
      chars[this.nameCursor] = NAME_CHARS[(cur + d + NAME_CHARS.length) % NAME_CHARS.length];
      this.name = chars.join('').trimEnd();
      audio.sfx('terminal.key', { gain: 0.5 });
    };
    if (app.input.repeated('up')) cycle(1);
    if (app.input.repeated('down')) cycle(-1);
  }

  private begin(app: App): void {
    const b = BACKGROUNDS[this.bgIdx];
    const s = new GameState();
    s.profile = {
      name: this.name.trim() || 'QUILLON',
      pronouns: PRONOUNS[this.pronounIdx],
      background: b.id,
      look: { ...this.look },
    };
    s.room = b.startRoom;
    for (const it of b.items) s.addItem(it);
    s.addTessera(b.tessera);
    for (const [npc, v] of Object.entries(b.relations)) s.adjustRelation(npc, v);
    s.startQuest('find-hessa');
    s.note(`Signed on as ${b.name}.`);
    app.state = s;
    writeSlot(0, s);
    void import('@/ui/explore').then(({ ExploreScene }) => {
      app.transition(new ExploreScene());
    });
  }

  draw(app: App, p: Painter): void {
    p.rect(0, 0, VW, VH, PAL.void1);
    header(p, 'CREW INTAKE \x7f RV CANDLEWAKE', 'T&V FORM 9');

    const b = BACKGROUNDS[this.bgIdx];

    // preview column
    p.panel(8, 26, 92, 132, 'terminal');
    const port = getPortrait(this.look, 'neutral');
    p.blit(port, 0, 0, 40, 48, 30, 32, 40, 48);
    const reg = app.atlas.get('cc-preview');
    if (reg) {
      // three facings so the player sees what they will actually control
      const frame = Math.floor(this.t * 6) % 4;
      const cols = [0, 1, 0, 2][frame];
      const facings: (keyof typeof FACING_ROW)[] = ['down', 'left', 'up'];
      facings.forEach((f, i) => {
        p.blit(
          app.atlas.canvas,
          reg.x + cols * CELL_W,
          reg.y + FACING_ROW[f] * CELL_H,
          CELL_W,
          CELL_H,
          22 + i * 22,
          88,
          CELL_W * 2,
          CELL_H * 2,
        );
      });
    }
    p.dotRule(14, 140, 80, PAL.iron2, 3);
    p.text(this.name || '\x7f', 54, 146, { color: PAL.bone3, align: 'center' });

    // fields
    const rows: [string, string][] = [
      ['NAME', this.name || '(unset)'],
      ['PRONOUNS', PRONOUNS[this.pronounIdx]],
      ['POSTING', b.name],
      ['FRAME', this.look.frame],
      ['SKIN', `\x06`.repeat(this.look.skin + 1)],
      ['HAIR', this.look.hair],
      ['HAIR TONE', ''],
      ['EYES', ''],
      ['KIT', this.look.accessory],
    ];
    rows.forEach(([label, value], i) => {
      const y = 28 + i * 12;
      const sel = this.cursor.index === i;
      if (sel) p.rect(104, y - 2, VW - 112, 11, mix(PAL.void2, PAL.halo1, 0.35));
      p.text(label, 108, y, { color: sel ? PAL.halo3 : PAL.iron5 });
      if (label === 'HAIR TONE' || label === 'EYES') {
        const c = label === 'EYES' ? this.look.eyeColor : this.look.hairColor;
        p.rect(190, y, 14, 7, c);
        p.frame(189, y - 1, 16, 9, PAL.iron3);
      } else {
        p.text(value.toUpperCase(), 190, y, { color: sel ? PAL.bone3 : PAL.bone0 });
      }
      if (sel && label !== 'NAME') {
        p.text('\x03', 182, y, { color: PAL.halo3 });
        p.text('\x04', VW - 14, y, { color: PAL.halo3 });
      }
    });

    // Background detail — the honest statement of what the choice does.
    // Blurb and effects share one well, so the blurb is clamped to two lines
    // and the effects are laid out from a measured offset rather than a
    // guessed one; an earlier version overlapped all three of these.
    const wellY = 134;
    const wellH = VH - wellY - 16;
    p.panel(104, wellY, VW - 112, wellH, 'inset');
    // The blurb gets whatever rows the effects do not need, so a long blurb
    // never eats a perk line and a short one never leaves a gap.
    const blurbMax = Math.max(1, Math.floor((wellH - 6) / 9) - b.effects.length);
    const blurbLines = p.textBlock(b.blurb, 109, wellY + 4, VW - 122, {
      color: PAL.bone0,
      maxLines: blurbMax,
      ellipsis: true,
    });
    let ey = wellY + 6 + blurbLines * 9;
    for (const e of b.effects) {
      if (ey + 8 > wellY + wellH) break;
      p.text('\x09', 109, ey, { color: PAL.amber3 });
      p.textBlock(e, 118, ey, VW - 134, { color: PAL.bone2, maxLines: 1 });
      ey += 9;
    }

    // SIGN ON sits under the preview column, clear of the detail well.
    const confirmSel = this.cursor.index === 9;
    p.panel(8, VH - 28, 92, 16, confirmSel ? 'terminal' : 'plate');
    p.text('SIGN ON', 54, VH - 23, {
      color: confirmSel ? PAL.halo3 : PAL.iron5,
      align: 'center',
    });

    footer(
      p,
      this.editingName
        ? ['\x03\x04 letter', '\x01\x02 change', 'Z done']
        : ['\x01\x02 field', '\x03\x04 change', 'Z select', 'X back'],
    );
  }
}

// =====================================================================
// PAUSE
// =====================================================================

export function openPause(app: App, back: Scene): void {
  app.push(new PauseScene(back));
}
export function openJournal(app: App): void {
  app.push(new JournalScene());
}

export class PauseScene implements Scene {
  readonly id = 'pause';
  readonly modal = true;
  private cursor = new Cursor(6);
  private saved = false;

  constructor(private back: Scene) {
    void this.back;
  }

  update(app: App, _dt: number): void {
    this.cursor.nav(app);
    if (app.input.pressed('cancel') || app.input.pressed('menu')) {
      audio.sfx('ui.close');
      app.pop();
      return;
    }
    if (app.input.pressed('confirm')) {
      audio.sfx('ui.select');
      switch (this.cursor.index) {
        case 0:
          app.pop();
          break;
        case 1:
          app.push(new JournalScene());
          break;
        case 2:
          app.push(new KitScene());
          break;
        case 3:
          app.push(new SettingsScene());
          break;
        case 4:
          writeSlot(1, app.state);
          this.saved = true;
          app.toast('Saved to slot 1', '\x0B', PAL.halo3);
          break;
        case 5:
          app.transition(new TitleScene());
          break;
      }
    }
    void _dt;
  }

  draw(app: App, p: Painter): void {
    p.scrim(PAL.void0, 0.72);
    const items = [
      'RESUME',
      'EVIDENCE',
      'KIT',
      'SETTINGS',
      this.saved ? 'SAVED' : 'SAVE',
      'ABANDON WATCH',
    ];
    const w = 120;
    const h = items.length * 13 + 34;
    const x = (VW - w) / 2;
    const y = (VH - h) / 2;
    p.panel(x, y, w, h, 'terminal');
    p.text('THIRD WATCH', x + 8, y + 7, { color: PAL.halo3 });
    p.text(app.state.clock(), x + w - 8, y + 7, { color: PAL.iron5, align: 'right' });
    p.dotRule(x + 6, y + 18, w - 12, PAL.iron2, 3);
    items.forEach((it, i) => {
      const iy = y + 24 + i * 13;
      const sel = i === this.cursor.index;
      if (sel) p.rect(x + 4, iy - 2, w - 8, 11, mix(PAL.void2, PAL.halo1, 0.4));
      p.text(sel ? '\x05' : ' ', x + 7, iy, { color: PAL.halo3 });
      p.text(it, x + 16, iy, { color: sel ? PAL.bone3 : PAL.bone0 });
    });
    footer(p, ['\x01\x02 select', 'Z confirm', 'X close']);
  }
}

// =====================================================================
// SETTINGS
// =====================================================================

interface Opt {
  label: string;
  value: (s: ReturnType<typeof settings.get>) => string;
  change: (d: number) => void;
  group: string;
}

export class SettingsScene implements Scene {
  readonly id = 'settings';
  readonly modal = true;
  private cursor = new Cursor(1);
  private opts: Opt[] = [];
  private rebinding: number | null = null;
  private scroll = 0;

  enter(): void {
    this.build();
  }

  private build(): void {
    const cycle = <T,>(arr: readonly T[], cur: T, d: number): T =>
      arr[(arr.indexOf(cur) + d + arr.length) % arr.length];
    const num = (v: number, d: number, lo = 0, hi = 1, step = 0.1) =>
      Math.round(Math.max(lo, Math.min(hi, v + d * step)) * 100) / 100;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const onoff = (v: boolean) => (v ? '\x06 ON' : '\x07 OFF');

    this.opts = [
      {
        group: 'AUDIO',
        label: 'Master volume',
        value: (s) => pct(s.masterVolume),
        change: (d) => settings.set('masterVolume', num(settings.get().masterVolume, d)),
      },
      {
        group: 'AUDIO',
        label: 'Music',
        value: (s) => pct(s.musicVolume),
        change: (d) => settings.set('musicVolume', num(settings.get().musicVolume, d)),
      },
      {
        group: 'AUDIO',
        label: 'Effects',
        value: (s) => pct(s.sfxVolume),
        change: (d) => settings.set('sfxVolume', num(settings.get().sfxVolume, d)),
      },
      {
        group: 'AUDIO',
        label: 'Ship ambience',
        value: (s) => pct(s.ambienceVolume),
        change: (d) => settings.set('ambienceVolume', num(settings.get().ambienceVolume, d)),
      },
      {
        group: 'TEXT',
        label: 'Text speed',
        value: (s) => s.textSpeed.toUpperCase(),
        change: (d) =>
          settings.set(
            'textSpeed',
            cycle(['slow', 'normal', 'fast', 'instant'] as TextSpeed[], settings.get().textSpeed, d),
          ),
      },
      {
        group: 'TEXT',
        label: 'Large text',
        value: (s) => onoff(s.largeText),
        change: () => settings.set('largeText', !settings.get().largeText),
      },
      {
        group: 'TEXT',
        label: 'High contrast',
        value: (s) => onoff(s.highContrastText),
        change: () => settings.set('highContrastText', !settings.get().highContrastText),
      },
      {
        group: 'ACCESS',
        label: 'Reduce flashing',
        value: (s) => onoff(s.reduceFlashing),
        change: () => settings.set('reduceFlashing', !settings.get().reduceFlashing),
      },
      {
        group: 'ACCESS',
        label: 'Reduce screen shake',
        value: (s) => onoff(s.reduceShake),
        change: () => settings.set('reduceShake', !settings.get().reduceShake),
      },
      {
        group: 'ACCESS',
        label: 'Shape markers',
        value: (s) => onoff(s.symbolMarkers),
        change: () => settings.set('symbolMarkers', !settings.get().symbolMarkers),
      },
      {
        group: 'ACCESS',
        label: 'Minimum light',
        value: (s) => pct(s.minAmbient),
        change: (d) => settings.set('minAmbient', num(settings.get().minAmbient, d, 0.1, 0.7, 0.05)),
      },
      {
        group: 'ACCESS',
        label: 'Scanlines',
        value: (s) => onoff(s.scanlines),
        change: () => settings.set('scanlines', !settings.get().scanlines),
      },
      {
        group: 'PLAY',
        label: 'Combat speed',
        value: (s) => `${s.combatSpeed.toFixed(1)}x`,
        change: (d) => settings.set('combatSpeed', num(settings.get().combatSpeed, d, 0.5, 2, 0.25)),
      },
      {
        group: 'PLAY',
        label: 'Combat assist',
        value: (s) => onoff(s.combatAssist),
        change: () => settings.set('combatAssist', !settings.get().combatAssist),
      },
      {
        group: 'PLAY',
        label: 'Objective reminder',
        value: (s) => onoff(s.objectiveHud),
        change: () => settings.set('objectiveHud', !settings.get().objectiveHud),
      },
      {
        group: 'PLAY',
        label: 'Run',
        value: (s) => s.runMode.toUpperCase(),
        change: () =>
          settings.set('runMode', settings.get().runMode === 'hold' ? 'toggle' : 'hold'),
      },
    ];
    for (const a of ACTIONS) {
      this.opts.push({
        group: 'CONTROLS',
        label: a.toUpperCase(),
        value: () => keyLabel(settings.get().bindings[a][0] ?? '-'),
        change: () => {},
      });
    }
    this.opts.push({
      group: 'CONTROLS',
      label: 'Reset to defaults',
      value: () => '',
      change: () => {},
    });
    this.cursor.length = this.opts.length;
  }

  update(app: App, _dt: number): void {
    if (this.rebinding !== null) {
      if (!app.input.capturing) this.rebinding = null;
      return;
    }
    this.cursor.nav(app);
    const opt = this.opts[this.cursor.index];
    const isControl = opt.group === 'CONTROLS';

    if (app.input.repeated('left')) {
      opt.change(-1);
      audio.sfx('ui.move');
    }
    if (app.input.repeated('right')) {
      opt.change(1);
      audio.sfx('ui.move');
    }
    if (app.input.pressed('confirm')) {
      if (opt.label === 'Reset to defaults') {
        settings.reset();
        app.applySettings();
        audio.sfx('ui.select');
      } else if (isControl) {
        const action = ACTIONS.find((a) => a.toUpperCase() === opt.label);
        if (action) {
          this.rebinding = this.cursor.index;
          audio.sfx('ui.open');
          app.input.captureNext(action, () => {
            settings.set('bindings', app.input.getBindings());
            this.rebinding = null;
            audio.sfx('ui.select');
          });
        }
      } else {
        opt.change(1);
        audio.sfx('ui.select');
      }
    }
    if (app.input.pressed('cancel')) {
      audio.sfx('ui.close');
      app.pop();
    }

    // keep cursor visible
    const visible = 13;
    if (this.cursor.index < this.scroll) this.scroll = this.cursor.index;
    if (this.cursor.index >= this.scroll + visible) this.scroll = this.cursor.index - visible + 1;
    void _dt;
  }

  draw(app: App, p: Painter): void {
    p.scrim(PAL.void0, 0.86);
    header(p, 'SETTINGS');
    const visible = 13;
    let lastGroup = '';
    for (let i = 0; i < visible; i++) {
      const idx = this.scroll + i;
      if (idx >= this.opts.length) break;
      const o = this.opts[idx];
      const y = 26 + i * 13;
      if (o.group !== lastGroup) {
        p.text(o.group, 8, y, { color: PAL.halo2 });
        lastGroup = o.group;
      }
      const sel = idx === this.cursor.index;
      if (sel) p.rect(56, y - 2, VW - 64, 11, mix(PAL.void2, PAL.halo1, 0.35));
      p.text(o.label, 60, y, { color: sel ? PAL.bone3 : PAL.bone0 });
      const val = this.rebinding === idx ? 'PRESS A KEY' : o.value(settings.get());
      p.text(val, VW - 10, y, {
        color: this.rebinding === idx ? PAL.amber3 : sel ? PAL.halo3 : PAL.iron5,
        align: 'right',
      });
    }
    if (this.scroll > 0) p.text('\x01', VW - 6, 24, { color: PAL.iron4 });
    if (this.scroll + visible < this.opts.length) p.text('\x02', VW - 6, VH - 20, { color: PAL.iron4 });
    footer(p, ['\x01\x02 option', '\x03\x04 change', 'X back']);
    void app;
  }
}

// =====================================================================
// EVIDENCE BOARD
// =====================================================================

type JTab = 'evidence' | 'conclusions' | 'crew' | 'log';

export class JournalScene implements Scene {
  readonly id = 'journal';
  readonly modal = true;
  private tab: JTab = 'evidence';
  private tabs: JTab[] = ['evidence', 'conclusions', 'crew', 'log'];
  private cursor = new Cursor(1);
  private linkFrom: string | null = null;
  private scroll = 0;

  enter(app: App): void {
    reconcile(app.state);
    this.refresh(app);
  }

  private refresh(app: App): void {
    const s = app.state;
    this.cursor.length =
      this.tab === 'evidence'
        ? Math.max(1, s.foundClues().length)
        : this.tab === 'conclusions'
          ? Math.max(1, s.deductions.size + availableDeductions(s).length)
          : this.tab === 'crew'
            ? Math.max(1, [...s.relations.keys()].length)
            : Math.max(1, s.history.length);
    this.cursor.clamp();
  }

  update(app: App, _dt: number): void {
    const s = app.state;
    if (app.input.pressed('cancel') || app.input.pressed('journal')) {
      audio.sfx('ui.close');
      app.pop();
      return;
    }
    if (app.input.repeated('right')) {
      this.tab = this.tabs[(this.tabs.indexOf(this.tab) + 1) % this.tabs.length];
      this.cursor.index = 0;
      this.scroll = 0;
      this.linkFrom = null;
      this.refresh(app);
      audio.sfx('ui.move');
    }
    if (app.input.repeated('left')) {
      this.tab = this.tabs[(this.tabs.indexOf(this.tab) + this.tabs.length - 1) % this.tabs.length];
      this.cursor.index = 0;
      this.scroll = 0;
      this.linkFrom = null;
      this.refresh(app);
      audio.sfx('ui.move');
    }
    this.cursor.nav(app);

    if (this.tab === 'evidence' && app.input.pressed('confirm')) {
      const ids = s.foundClues();
      const id = ids[this.cursor.index];
      if (!id) return;
      s.examineClue(id);
      if (!this.linkFrom) {
        this.linkFrom = id;
        audio.sfx('ui.select');
      } else if (this.linkFrom === id) {
        this.linkFrom = null;
        audio.sfx('ui.back');
      } else {
        this.tryLink(app, this.linkFrom, id);
        this.linkFrom = null;
      }
    }

    const visible = 9;
    if (this.cursor.index < this.scroll) this.scroll = this.cursor.index;
    if (this.cursor.index >= this.scroll + visible) this.scroll = this.cursor.index - visible + 1;
    void _dt;
  }

  /**
   * Linking is the player's move, not the game's. We only confirm a link that
   * actually completes a deduction's required set — a wrong pairing is told it
   * does not connect, which keeps the board honest without punishing trying.
   */
  private tryLink(app: App, a: string, b: string): void {
    const s = app.state;
    for (const d of availableDeductions(s)) {
      const set = satisfiedSet(d, s);
      if (!set) continue;
      if (set.includes(a) && set.includes(b)) {
        s.addLink(a, b, d.id);
        reconcile(s);
        audio.sfx('clue.link');
        app.toast(d.claim, '\x0B', PAL.halo3);
        s.note(`Concluded: ${d.claim}`);
        this.refresh(app);
        return;
      }
    }
    s.addLink(a, b, null);
    audio.sfx('ui.error');
    app.toast('Those two do not connect', '\x0A', PAL.iron5);
  }

  draw(app: App, p: Painter): void {
    const s = app.state;
    p.rect(0, 0, VW, VH, PAL.void1);
    header(p, 'EVIDENCE \x7f THIRD WATCH', s.clock());

    // tabs
    this.tabs.forEach((t, i) => {
      const x = 8 + i * 68;
      const sel = t === this.tab;
      if (sel) p.rect(x - 3, 22, 66, 11, mix(PAL.void2, PAL.halo1, 0.4));
      p.text(t.toUpperCase(), x, 24, { color: sel ? PAL.halo3 : PAL.iron4 });
    });
    p.rect(0, 34, VW, 1, PAL.iron1);

    if (this.tab === 'evidence') this.drawEvidence(app, p);
    else if (this.tab === 'conclusions') this.drawConclusions(app, p);
    else if (this.tab === 'crew') this.drawCrew(app, p);
    else this.drawLog(app, p);

    footer(
      p,
      this.tab === 'evidence'
        ? ['\x03\x04 tab', '\x01\x02 select', 'Z link two items', 'X close']
        : ['\x03\x04 tab', '\x01\x02 scroll', 'X close'],
    );
  }

  private drawEvidence(app: App, p: Painter): void {
    const s = app.state;
    const ids = s.foundClues();
    if (!ids.length) {
      p.textBlock(
        'Nothing yet. Look at things. Ask people. The ship is very willing to be read.',
        12, 46, VW - 24, { color: PAL.iron4 },
      );
      return;
    }
    const visible = 9;
    for (let i = 0; i < visible; i++) {
      const idx = this.scroll + i;
      if (idx >= ids.length) break;
      const c = CLUES[ids[idx]];
      if (!c) continue;
      const y = 40 + i * 12;
      const sel = idx === this.cursor.index;
      const isFrom = this.linkFrom === c.id;
      if (sel) p.rect(6, y - 2, 150, 11, mix(PAL.void2, PAL.halo1, 0.35));
      if (isFrom) p.rect(6, y - 2, 150, 11, mix(PAL.void2, PAL.amber1, 0.45));
      const linked = s.links.some((l) => (l.a === c.id || l.b === c.id) && l.deduction);
      p.text(linked ? '\x0B' : '\x09', 9, y, { color: linked ? PAL.halo3 : PAL.amber3 });
      p.text(c.title.slice(0, 22), 19, y, { color: sel ? PAL.bone3 : PAL.bone0 });
    }

    // detail pane
    const sel = CLUES[ids[this.cursor.index]];
    if (sel) {
      p.panel(160, 38, VW - 168, VH - 54, 'terminal');
      p.text(sel.title, 166, 43, { color: PAL.halo3 });
      p.text(sel.source, 166, 53, { color: PAL.iron5 });
      p.dotRule(164, 63, VW - 176, PAL.iron2, 3);
      p.textBlock(sel.text, 166, 69, VW - 180, { color: PAL.bone2, maxLines: 12 });
    }
    if (this.linkFrom) {
      p.text(`LINK: ${CLUES[this.linkFrom]?.title ?? ''} \x04 ?`, 8, VH - 22, {
        color: PAL.amber3,
      });
    }
  }

  private drawConclusions(app: App, p: Painter): void {
    const s = app.state;
    const reached = [...s.deductions].map((id) => DEDUCTIONS[id]).filter(Boolean);
    const ready = availableDeductions(s);
    let y = 42;
    if (!reached.length && !ready.length) {
      p.textBlock(
        'You have not put anything together yet. Two pieces of evidence that agree will do it.',
        12, y, VW - 24, { color: PAL.iron4 },
      );
      return;
    }
    for (const d of reached) {
      p.text(d.false ? '\x0A' : '\x0B', 10, y, { color: d.false ? PAL.ember3 : PAL.halo3 });
      p.text(d.claim, 20, y, { color: PAL.bone3 });
      y += 9;
      p.textBlock(d.conclusion, 20, y, VW - 34, { color: PAL.iron5, maxLines: 2 });
      y += 9 * Math.min(2, p.measureBlock(d.conclusion, VW - 34)) + 5;
    }
    if (ready.length) {
      p.dotRule(10, y, VW - 20, PAL.iron2, 3);
      y += 6;
      p.text('READY TO CONNECT', 10, y, { color: PAL.amber3 });
      y += 10;
      for (const d of ready) {
        const set = satisfiedSet(d, s) ?? [];
        p.text('\x09', 10, y, { color: PAL.amber2 });
        p.text(
          set.map((c) => CLUES[c]?.title ?? c).join('  +  '),
          20, y, { color: PAL.bone1 },
        );
        y += 10;
      }
    }
    if (s.has('dx-retired')) {
      p.text('A theory was retired: the Master could not have filed it.', 10, VH - 24, {
        color: PAL.iron4,
      });
    }
  }

  private drawCrew(app: App, p: Painter): void {
    const s = app.state;
    const ids = [...s.relations.keys()].filter((id) => NPCS[id] || id === 'sabbat' || id === 'ashkar');
    let y = 42;
    if (!ids.length) {
      p.textBlock('You have not spoken to anyone yet.', 12, y, VW - 24, { color: PAL.iron4 });
      return;
    }
    for (const id of ids) {
      const def = NPCS[id];
      const level = s.relationLevel(id);
      const states = s.relationStates(id);
      if (def) {
        const port = getPortrait(def.look, 'neutral');
        p.blit(port, 0, 0, 40, 48, 10, y - 2, 20, 24);
      }
      p.text(def?.name ?? id.toUpperCase(), 34, y, { color: PAL.bone3 });
      p.text(def?.role ?? '', 34, y + 9, { color: PAL.iron5 });
      // level shown as a word plus a filled-pip row, never a number
      const idx = RELATION_ORDER.indexOf(level);
      p.text(level.toUpperCase(), 200, y, { color: PAL.halo3 });
      for (let i = 0; i < RELATION_ORDER.length; i++) {
        p.text(i <= idx ? '\x06' : '\x07', 200 + i * 7, y + 9, {
          color: i <= idx ? PAL.halo2 : PAL.iron2,
        });
      }
      if (states.length) {
        p.text(states.join(', '), 200 + RELATION_ORDER.length * 7 + 6, y + 9, {
          color: PAL.amber2,
        });
      }
      y += 26;
      if (y > VH - 26) break;
    }
  }

  private drawLog(app: App, p: Painter): void {
    const s = app.state;
    const visible = 13;
    const start = Math.max(0, s.history.length - visible - this.scroll);
    if (!s.history.length) {
      p.textBlock('Nothing has happened yet that you would want to remember.', 12, 42, VW - 24, {
        color: PAL.iron4,
      });
      return;
    }
    for (let i = 0; i < visible; i++) {
      const h = s.history[start + i];
      if (!h) break;
      p.text(h.slice(0, 62), 10, 42 + i * 11, { color: PAL.bone1 });
    }
  }
}

// =====================================================================
// CHAPTER END
// =====================================================================

export class ChapterEndScene implements Scene {
  readonly id = 'chapter-end';
  readonly hidesWorld = true;
  private t = 0;
  private lines: string[] = [];

  constructor(
    private outcomeId: string,
    private title: string,
    body: string[],
  ) {
    this.lines = body;
  }

  enter(app: App): void {
    audio.setMusic('chapterEnd', { fade: 2 });
    audio.setAmbience('silence', 3);
    app.state.setFlag('chapter-decided', this.outcomeId);
    app.state.note(`Chapter One ended: ${this.title}`);
    writeSlot(0, app.state);
  }

  update(app: App, dt: number): void {
    this.t += dt;
    if (this.t > 1 && app.input.pressed('confirm')) {
      audio.sfx('ui.select');
      app.transition(new TitleScene());
    }
  }

  draw(app: App, p: Painter): void {
    const s = app.state;
    p.rect(0, 0, VW, VH, PAL.void0);
    p.text('CHAPTER ONE', VW / 2, 24, { color: PAL.iron5, align: 'center' });
    p.text(this.title, VW / 2, 36, { color: PAL.halo3, scale: 2, align: 'center' });
    p.dotRule(40, 58, VW - 80, PAL.iron2, 3);

    let y = 68;
    for (const l of this.lines) {
      const n = p.measureBlock(l, VW - 60);
      p.textBlock(l, 30, y, VW - 60, { color: PAL.bone2 });
      y += n * 9 + 6;
    }

    // consequence summary — states what carried forward, reveals nothing extra
    // Size to content. A fixed height let the last two facts spill outside the
    // panel border, which read as a rendering fault rather than a summary.
    y = Math.min(Math.max(y + 4, 132), VH - 78);
    p.panel(24, y, VW - 48, 4 * 10 + 24, 'terminal');
    p.text('WHAT CARRIES FORWARD', 30, y + 6, { color: PAL.halo3 });
    let cy = y + 18;
    const facts: string[] = [
      `Evidence held: ${s.foundClues().length}`,
      `Conclusions reached: ${s.deductions.size}`,
      `Hessa Quill: ${s.has('hessa-safe') ? 'alive, and out' : s.has('hessa-lost') ? 'transferred \x7f gone' : 'still in Annex Three'}`,
      `The Watch's interest in you: ${s.suspicion > 40 ? 'considerable' : s.suspicion > 15 ? 'noted' : 'none'}`,
    ];
    for (const f of facts) {
      p.text('\x09', 30, cy, { color: PAL.amber3 });
      p.text(f, 39, cy, { color: PAL.bone1 });
      cy += 10;
    }
    if (this.t > 1) {
      const blink = Math.sin(this.t * 4) > 0;
      if (blink) p.text('Z', VW - 20, VH - 18, { color: PAL.halo3 });
    }
  }
}

export { getActorSheet };
