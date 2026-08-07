/**
 * Exploration: the room the player is standing in, everyone in it, and every
 * way of talking to it.
 *
 * The dialogue overlay lives here rather than in its own scene because it is
 * not a separate mode — the ship keeps running behind it, NPCs keep breathing,
 * lights keep flickering, and that continuity is most of what makes a place
 * feel inhabited.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { TILE, VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { CELL_H, CELL_W, Expression, FACING_ROW, Facing, getPortrait } from '@/art/actors';
import { Actor, NpcBrain, RUN_SPEED, WALK_SPEED } from '@/world/actor';
import {
  BuiltRoom,
  buildRoom,
  doorAt,
  interactAt,
  stepSoundAt,
} from '@/world/map';
import { ROOMS } from '@/data/rooms';
import { NPCS, npcRoom } from '@/data/npcs';
import { INTERACTABLES, CLUES, clearancesOf } from '@/data/content';
import { DialogueRunner, TONE_LABEL } from '@/game/dialogue';
import { audio } from '@/core/audio';
import { settings, TEXT_CPS } from '@/core/settings';
import { getTileAtlas, TILE_PX } from '@/art/tiles';
import { bus } from '@/core/events';
import { openJournal, openPause } from '@/ui/menus';

const PLAYER_KEY = 'player';

interface NpcInstance {
  id: string;
  actor: Actor;
  brain: NpcBrain;
  regionKey: string;
}

type Mode = 'walk' | 'examine' | 'dialogue';

export class ExploreScene implements Scene {
  readonly id = 'explore';
  private room!: BuiltRoom;
  private player!: Actor;
  private npcs: NpcInstance[] = [];
  private mode: Mode = 'walk';
  private animTime = 0;

  // examine box
  private lines: string[] = [];
  private lineIndex = 0;
  private reveal = 0;

  // dialogue
  private runner: DialogueRunner | null = null;
  private choiceIndex = 0;
  private pendingBattle: string | null = null;

  // presentation
  private bannerTimer = 0;
  private hintTarget: { x: number; y: number; label: string } | null = null;
  /**
   * A door's arrival spawn is the door tile itself, so without this the player
   * would land on a door and be sent straight back where they came from. The
   * tile is armed again the moment they step off it.
   */
  private doorCooldown: { x: number; y: number } | null = null;

  enter(app: App): void {
    this.loadRoom(app, app.state.room, null);
  }

  // --- room loading -----------------------------------------------------

  loadRoom(app: App, roomId: string, spawn: string | null): void {
    const def = ROOMS[roomId];
    if (!def) throw new Error(`unknown room "${roomId}"`);
    this.room = buildRoom(def);
    const atlas = getTileAtlas();
    app.renderer.setTileAtlas(atlas.canvas);
    app.renderer.floorLayer.build(this.room.floorQuads, atlas.canvas.width, atlas.canvas.height);
    app.renderer.propLayer.build(this.room.propQuads, atlas.canvas.width, atlas.canvas.height);
    app.renderer.overLayer.build(this.room.overQuads, atlas.canvas.width, atlas.canvas.height);
    app.renderer.setAmbient(def.ambient.color, def.ambient.level);
    app.renderer.setVignette(0.22);

    audio.setAmbience(def.ambience, 1.2);
    if (def.music) audio.setMusic(def.music, { fade: 1.5 });

    // player placement
    const s = app.state;
    let px = s.x;
    let py = s.y;
    const point = spawn ? this.room.spawns[spawn] : this.room.spawns['default'];
    if (spawn || !this.player) {
      const p = point ?? this.room.spawns['default'] ?? { x: 2, y: 2 };
      px = p.x * TILE + TILE / 2;
      py = p.y * TILE + TILE;
    }
    if (!this.player) {
      this.player = new Actor({ id: PLAYER_KEY, look: s.profile.look, x: px, y: py });
    } else {
      this.player.x = px;
      this.player.y = py;
    }
    this.player.look = s.profile.look;
    app.sheetRegion(PLAYER_KEY, s.profile.look);

    s.room = roomId;
    this.doorCooldown = { x: Math.floor(px / TILE), y: Math.floor((py - 1) / TILE) };
    this.spawnNpcs(app);
    this.bannerTimer = 3.0;
    bus.emit('room:enter', { room: roomId });
  }

  private spawnNpcs(app: App): void {
    this.npcs = [];
    const s = app.state;
    for (const def of Object.values(NPCS)) {
      if (npcRoom(def, s) !== s.room) continue;
      const post = def.post[s.room] ?? [4, 4];
      const key = `npc:${def.id}`;
      app.sheetRegion(key, def.look);
      const actor = new Actor({
        id: def.id,
        name: def.name,
        look: def.look,
        x: post[0] * TILE + TILE / 2,
        y: post[1] * TILE + TILE,
        facing: 'down',
      });
      this.npcs.push({
        id: def.id,
        actor,
        brain: new NpcBrain(actor.x, actor.y, 22),
        regionKey: key,
      });
      s.npc(def.id).room = s.room;
    }
  }

  // --- update -----------------------------------------------------------

  update(app: App, dt: number): void {
    this.animTime += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    if (this.mode === 'dialogue') this.updateDialogue(app, dt);
    else if (this.mode === 'examine') this.updateExamine(app, dt);
    else this.updateWalk(app, dt);

    for (const n of this.npcs) {
      if (this.mode === 'walk') n.brain.update(n.actor, this.room, dt);
      else n.actor.update(dt);
    }
    this.player.update(dt);
    this.updateAnimatedTiles(app);
    this.submitDraw(app);
  }

  private updateWalk(app: App, dt: number): void {
    const input = app.input;
    const st = settings.get();

    if (input.pressed('menu')) {
      audio.sfx('ui.open');
      openPause(app, this);
      return;
    }
    if (input.pressed('journal')) {
      audio.sfx('ui.open');
      openJournal(app);
      return;
    }

    const ax = input.axis();
    const running = st.runMode === 'hold' ? input.down('run') : app.state.has('run-toggled');
    if (st.runMode === 'toggle' && input.pressed('run')) {
      app.state.setFlag('run-toggled', !app.state.has('run-toggled'));
    }
    const speed = running ? RUN_SPEED : WALK_SPEED;
    this.player.move(this.room, ax.x, ax.y, speed, dt);

    if (this.player.consumeStep()) {
      audio.sfx(`step.${stepSoundAt(this.room, this.player.tileX, this.player.tileY)}` as never, {
        pitch: 0.94 + Math.random() * 0.12,
        gain: running ? 0.9 : 0.65,
      });
    }

    // doors trigger on standing over them
    if (
      this.doorCooldown &&
      (this.doorCooldown.x !== this.player.tileX || this.doorCooldown.y !== this.player.tileY)
    ) {
      this.doorCooldown = null;
    }
    const d = this.doorCooldown ? undefined : doorAt(this.room, this.player.tileX, this.player.tileY);
    if (d) {
      if (d.locked && !clearancesOf(app.state).includes(d.locked)) {
        if (!app.state.has(`refused:${d.to}`)) {
          app.state.setFlag(`refused:${d.to}`, true);
          audio.sfx('door.locked');
          this.showLines([d.refuse ?? 'It does not open for you.']);
          // push the player back off the door so it does not retrigger
          this.player.y += this.player.facing === 'up' ? TILE : -TILE * 0.4;
        }
      } else {
        audio.sfx('door.open');
        const to = d.to;
        const spawn = d.spawn;
        app.state.setFlag(`refused:${to}`, false);
        app.fadeTo(1, '#04070a', () => {
          this.loadRoom(app, to, spawn);
          app.fadeTo(0);
        });
        return;
      }
    }

    // interaction target
    this.hintTarget = this.findTarget(app);
    if (input.pressed('confirm') && this.hintTarget) {
      this.interact(app);
    }
  }

  private findTarget(app: App): { x: number; y: number; label: string } | null {
    const f = this.player.facingTile();
    for (const n of this.npcs) {
      if (n.actor.tileX === f.x && n.actor.tileY === f.y) {
        return { x: n.actor.x, y: n.actor.y, label: NPCS[n.id].name };
      }
      // also allow talking to someone standing on the same tile band nearby
      if (this.player.distanceTo(n.actor) < 20) {
        return { x: n.actor.x, y: n.actor.y, label: NPCS[n.id].name };
      }
    }
    const it = interactAt(this.room, f.x, f.y) ?? this.nearestInteractable();
    if (it) {
      const def = INTERACTABLES[it.id];
      return { x: it.x * TILE + 8, y: it.y * TILE + 12, label: def?.label ?? 'Examine' };
    }
    void app;
    return null;
  }

  /**
   * Falls back to the closest interactable within reach when the player is
   * beside a thing but not squarely facing its tile. Demanding exact facing
   * alignment is the difference between "investigating a room" and "fighting
   * the controls", and an investigation game asks the player to do this
   * hundreds of times.
   */
  private nearestInteractable(): { id: string; x: number; y: number } | undefined {
    let best: { id: string; x: number; y: number } | undefined;
    let bestD = 22;
    for (const it of this.room.interactables) {
      const d = Math.hypot(it.x * TILE + 8 - this.player.x, it.y * TILE + 8 - (this.player.y - 8));
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  private interact(app: App): void {
    const f = this.player.facingTile();
    this.player.act();
    for (const n of this.npcs) {
      const near = this.player.distanceTo(n.actor) < 20;
      if ((n.actor.tileX === f.x && n.actor.tileY === f.y) || near) {
        n.actor.faceTowards(this.player.x, this.player.y);
        n.brain.freeze();
        this.startDialogue(app, n.id);
        return;
      }
    }
    const it = interactAt(this.room, f.x, f.y) ?? this.nearestInteractable();
    if (!it) return;
    const def = INTERACTABLES[it.id];
    if (!def) return;
    const res = def.run(app.state);
    if (res.battle) {
      this.launchBattle(app, res.battle);
      return;
    }
    audio.sfx(it.id.includes('terminal') || it.id.includes('muster') ? 'terminal.on' : 'ui.select');
    if (res.flag === 'enter-duct') {
      app.fadeTo(1, '#04070a', () => {
        this.loadRoom(app, 'spine-duct', 'default');
        app.fadeTo(0);
      });
      return;
    }
    if (res.flag) app.state.setFlag(res.flag, true);
    if (res.flag === 'took-trave-key') app.state.addItem('trave-key');
    if (res.clue) {
      const isNew = app.state.findClue(res.clue);
      if (isNew) {
        const c = CLUES[res.clue];
        app.toast(`Evidence: ${c.title}`, '\x09', PAL.amber3);
      }
    }
    if (res.lines.length) this.showLines(res.lines);
  }

  private launchBattle(app: App, encounterId: string): void {
    void import('@/combat/battle').then(({ BattleScene }) => {
      app.push(new BattleScene(encounterId, this));
    });
  }

  // --- examine box ------------------------------------------------------

  private showLines(lines: string[]): void {
    this.lines = lines.filter(Boolean);
    this.lineIndex = 0;
    this.reveal = 0;
    this.mode = this.lines.length ? 'examine' : 'walk';
  }

  private updateExamine(app: App, dt: number): void {
    const cps = TEXT_CPS[settings.get().textSpeed];
    const line = this.lines[this.lineIndex] ?? '';
    if (this.reveal < line.length) {
      this.reveal = cps === Infinity ? line.length : this.reveal + cps * dt;
      if (Math.floor(this.reveal) % 3 === 0) audio.sfx('text.blip', { gain: 0.25 });
    }
    if (app.input.pressed('confirm') || app.input.pressed('cancel')) {
      if (this.reveal < line.length) {
        this.reveal = line.length;
      } else if (this.lineIndex < this.lines.length - 1) {
        this.lineIndex++;
        this.reveal = 0;
        audio.sfx('ui.move', { gain: 0.4 });
      } else {
        this.mode = 'walk';
        this.lines = [];
      }
    }
  }

  // --- dialogue ---------------------------------------------------------

  startDialogue(app: App, npcId: string): void {
    const def = NPCS[npcId];
    if (!def) return;
    const entry = def.dialogue.entry(app.state);
    this.runner = new DialogueRunner(def.dialogue.nodes, entry, app.state, npcId);
    this.mode = 'dialogue';
    this.choiceIndex = 0;
    this.reveal = 0;
    audio.setMusic('weight', { fade: 1.2 });
    bus.emit('dialogue:start', { npc: npcId, node: entry });
  }

  private endDialogue(app: App): void {
    const npcId = this.runner?.npcId ?? '';
    this.runner = null;
    this.mode = 'walk';
    for (const n of this.npcs) n.brain.thaw();
    const def = ROOMS[app.state.room];
    audio.setMusic(def.music ?? 'explore', { fade: 2 });
    bus.emit('dialogue:end', { npc: npcId });
    if (this.pendingBattle) {
      const b = this.pendingBattle;
      this.pendingBattle = null;
      this.launchBattle(app, b);
    }
  }

  private updateDialogue(app: App, dt: number): void {
    const r = this.runner;
    if (!r) {
      this.mode = 'walk';
      return;
    }
    for (const t of r.drainToasts()) app.toast(t.text, '\x09', PAL.halo3);
    if (r.pendingBattle) {
      this.pendingBattle = r.pendingBattle;
      r.pendingBattle = null;
    }

    const cps = TEXT_CPS[settings.get().textSpeed];
    const full = r.text;
    if (this.reveal < full.length) {
      this.reveal = cps === Infinity ? full.length : this.reveal + cps * dt;
      if (Math.floor(this.reveal) % 2 === 0) audio.sfx('text.blip', { gain: 0.22 });
    }

    const done = this.reveal >= full.length;
    if (!done) {
      if (app.input.pressed('confirm') || app.input.pressed('cancel') || app.input.down('skip')) {
        this.reveal = full.length;
      }
      return;
    }

    if (r.awaitingChoice) {
      const n = r.visible.length;
      if (app.input.repeated('down')) {
        this.choiceIndex = (this.choiceIndex + 1) % n;
        audio.sfx('ui.move');
      }
      if (app.input.repeated('up')) {
        this.choiceIndex = (this.choiceIndex - 1 + n) % n;
        audio.sfx('ui.move');
      }
      if (app.input.pressed('confirm')) {
        const v = r.visible[this.choiceIndex];
        if (!v.enabled) {
          audio.sfx('ui.error');
          return;
        }
        audio.sfx('ui.select');
        r.choose(this.choiceIndex);
        this.choiceIndex = 0;
        this.reveal = 0;
        if (r.finished) this.endDialogue(app);
      }
      return;
    }

    if (app.input.pressed('confirm')) {
      audio.sfx('ui.select', { gain: 0.5 });
      r.advance();
      this.reveal = 0;
      if (r.finished) this.endDialogue(app);
    }
  }

  // --- rendering --------------------------------------------------------

  private updateAnimatedTiles(app: App): void {
    const atlas = getTileAtlas();
    for (const a of this.room.anim) {
      const frame = Math.floor(this.animTime * a.fps) % a.cells.length;
      const cell = a.cells[frame];
      const sx = (cell % atlas.cols) * TILE_PX;
      const sy = Math.floor(cell / atlas.cols) * TILE_PX;
      const layer =
        a.layer === 'floor'
          ? app.renderer.floorLayer
          : a.layer === 'over'
            ? app.renderer.overLayer
            : app.renderer.propLayer;
      layer.setQuadSource(a.index, sx, sy, TILE_PX, TILE_PX);
    }
  }

  private submitDraw(app: App): void {
    // camera follows, clamped so we never show void past the room edge
    const halfW = VW / 2;
    const halfH = VH / 2;
    let cx = this.player.x - halfW;
    let cy = this.player.y - halfH - 8;
    cx = Math.max(0, Math.min(this.room.pixelW - VW, cx));
    cy = Math.max(0, Math.min(this.room.pixelH - VH, cy));
    if (this.room.pixelW < VW) cx = (this.room.pixelW - VW) / 2;
    if (this.room.pixelH < VH) cy = (this.room.pixelH - VH) / 2;
    app.renderer.setCamera(cx, cy);

    for (const l of this.room.lights) app.renderer.addLight(l);

    const drawActor = (a: Actor, key: string) => {
      const reg = app.atlas.get(key);
      if (!reg || !a.visible) return;
      const row = FACING_ROW[a.facing as Facing];
      app.renderer.drawSprite({
        x: Math.round(a.x - CELL_W / 2 - cx),
        y: Math.round(a.y - CELL_H - cy) + a.bobOffset,
        w: CELL_W,
        h: CELL_H,
        sx: reg.x + a.pose * CELL_W,
        sy: reg.y + row * CELL_H,
        sw: CELL_W,
        sh: CELL_H,
        sort: a.y,
      });
    };
    for (const n of this.npcs) drawActor(n.actor, n.regionKey);
    drawActor(this.player, PLAYER_KEY);
  }

  draw(app: App, p: Painter): void {
    if (this.mode === 'walk') {
      this.drawInteractHint(app, p);
      this.drawHud(app, p);
    }
    if (this.bannerTimer > 0 && this.mode === 'walk') this.drawBanner(p);
    if (this.mode === 'examine') this.drawExamine(p);
    if (this.mode === 'dialogue') this.drawDialogue(app, p);
  }

  private drawInteractHint(_app: App, p: Painter): void {
    if (!this.hintTarget) return;
    const halfW = VW / 2;
    const halfH = VH / 2;
    let cx = this.player.x - halfW;
    let cy = this.player.y - halfH - 8;
    cx = Math.max(0, Math.min(this.room.pixelW - VW, cx));
    cy = Math.max(0, Math.min(this.room.pixelH - VH, cy));
    const sx = Math.round(this.hintTarget.x - cx);
    const sy = Math.round(this.hintTarget.y - cy);
    const bob = Math.sin(this.animTime * 6) > 0 ? 0 : 1;
    p.text('\x02', sx - 3, sy - 30 + bob, { color: PAL.halo3, shadow: PAL.void0 });
    const label = this.hintTarget.label;
    const w = label.length * 6 + 6;
    p.alpha(0.9, () => p.panel(sx - w / 2, sy - 22, w, 11, 'plate'));
    p.text(label, sx - w / 2 + 3, sy - 19, { color: PAL.bone3 });
  }

  private drawBanner(p: Painter): void {
    const a = Math.min(1, this.bannerTimer / 0.6);
    const def = this.room.def;
    p.alpha(a, () => {
      const w = Math.max(def.name.length * 6 + 14, 120);
      p.panel(6, 6, w, 22, 'terminal');
      p.text(def.name, 12, 10, { color: PAL.halo3 });
      p.text(`DECK ${def.deck}`, 12, 19, { color: PAL.iron5 });
    });
  }

  private drawHud(app: App, p: Painter): void {
    const s = app.state;
    const st = settings.get();
    // clock strip, bottom-left: unobtrusive but always answers "when is this"
    p.alpha(0.85, () => p.panel(6, VH - 16, 52, 11, 'plate'));
    p.text(s.clock(), 11, VH - 13, { color: PAL.bone2 });

    if (st.objectiveHud) {
      const obj = currentObjective(app);
      if (obj) {
        const w = Math.min(VW - 70, obj.length * 6 + 14);
        p.alpha(0.85, () => p.panel(VW - w - 6, VH - 16, w, 11, 'plate'));
        p.text('\x09', VW - w, VH - 13, { color: PAL.amber3 });
        p.text(obj, VW - w + 9, VH - 13, { color: PAL.bone2 });
      }
    }
  }

  private drawExamine(p: Painter): void {
    const line = this.lines[this.lineIndex] ?? '';
    const st = settings.get();
    const scale = st.largeText ? 2 : 1;
    const boxH = 46;
    p.panel(6, VH - boxH - 6, VW - 12, boxH, 'dialogue');
    p.textBlock(line, 14, VH - boxH + 2, VW - 28, {
      color: st.highContrastText ? PAL.bone3 : PAL.bone2,
      shadow: PAL.void0,
      limit: Math.floor(this.reveal),
      scale,
      maxLines: 4,
    });
    if (this.reveal >= line.length) {
      const more = this.lineIndex < this.lines.length - 1;
      p.text(more ? '\x02' : '\x05', VW - 18, VH - 18, {
        color: PAL.halo3,
        shadow: PAL.void0,
      });
    }
  }

  private drawDialogue(_app: App, p: Painter): void {
    const r = this.runner;
    if (!r) return;
    const st = settings.get();
    const npcId = r.speaker;
    const npcDef = npcId && npcId !== 'player' ? NPCS[npcId] : undefined;

    const choices = r.awaitingChoice ? r.visible : [];
    const choiceH = choices.length ? choices.length * 11 + 8 : 0;
    const boxH = 52;
    const top = VH - boxH - 6 - choiceH;

    // portrait
    if (npcDef) {
      const port = getPortrait(npcDef.look, (r.node.expr as Expression) ?? 'neutral');
      p.panel(6, top - 44, 44, 46, 'plate');
      p.blit(port, 0, 0, 40, 48, 8, top - 42, 40, 42);
      const nameW = npcDef.name.length * 6 + 8;
      p.panel(6, top - 54, nameW, 11, 'terminal');
      p.text(npcDef.name, 10, top - 51, { color: PAL.halo3 });
    }

    p.panel(6, top, VW - 12, boxH, 'dialogue');
    p.textBlock(r.text, 14, top + 8, VW - 28, {
      color: st.highContrastText ? PAL.bone3 : PAL.bone2,
      shadow: PAL.void0,
      limit: Math.floor(this.reveal),
      scale: st.largeText ? 2 : 1,
      maxLines: st.largeText ? 2 : 5,
    });

    if (this.reveal < r.text.length) {
      p.text('\x04', VW - 18, top + boxH - 12, { color: PAL.iron4 });
      return;
    }

    if (!choices.length) {
      const blink = Math.sin(this.animTime * 5) > 0;
      if (blink) p.text('\x02', VW - 18, top + boxH - 12, { color: PAL.halo3 });
      return;
    }

    // choices
    const cy = VH - choiceH - 4;
    p.panel(6, cy, VW - 12, choiceH, 'plate');
    choices.forEach((v, i) => {
      const y = cy + 5 + i * 11;
      const sel = i === this.choiceIndex;
      const col = !v.enabled ? PAL.iron3 : sel ? PAL.bone3 : PAL.bone0;
      if (sel) {
        p.rect(9, y - 2, VW - 18, 10, mix(PAL.iron2, PAL.halo1, 0.35));
        p.text('\x05', 11, y, { color: PAL.halo3 });
      }
      const tone = v.choice.tone && v.choice.tone !== 'neutral' ? TONE_LABEL[v.choice.tone] : '';
      const label = v.label;
      p.text(label, 19, y, { color: col });
      if (tone) {
        p.text(`[${tone}]`, VW - 14 - (tone.length + 2) * 6, y, {
          color: v.enabled ? PAL.amber2 : PAL.iron3,
        });
      }
    });
  }
}

/** The one-line objective shown in the HUD corner. */
export function currentObjective(app: App): string | null {
  const s = app.state;
  if (s.has('chapter-decided')) return 'Report what you found';
  if (s.hasDeduction('D3')) return 'Decide who to tell';
  if (s.hasClue('cold-registry')) return 'Get out of the duct';
  if (s.has('duct-open')) return 'Search duct 9-C';
  if (s.hasClue('stray-testimony')) return 'Reach the duct above the Cold Registry';
  if (s.hasClue('transfer-record')) return 'Ask the crew about Hessa';
  return 'Find out where Hessa Quill went';
}
