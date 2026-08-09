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
import { LINE_H, Painter } from '@/ui/painter';
import { TILE, VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { CELL_H, CELL_W, Expression, FACING_ROW, Facing, getPortrait } from '@/art/actors';
import { Actor, NpcBrain, RUN_STEP, WALK_STEP } from '@/world/actor';
import {
  BuiltRoom,
  buildRoom,
  doorAt,
  interactAt,
  stepSoundAt,
} from '@/world/map';
import { ROOMS } from '@/data/rooms';
import { NPCS, npcPost, npcRoom } from '@/data/npcs';
import { installShipTime } from '@/world/shiptime';
import { INTERACTABLES, CLUES, clearancesOf } from '@/data/content';
import { DialogueRunner, TONE_LABEL } from '@/game/dialogue';
import { LiftScene } from '@/ui/lift';
import { ShipMapScene } from '@/ui/shipmap';
import { ChapterDecisionScene } from '@/ui/chapter';
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

/**
 * What a confirm press would reach.
 *
 * The hint and the action used to derive their target separately \x7f
 * drawInteractHint from one search, interact() from its own copy of the same
 * logic. Two searches that are meant to agree eventually do not, and the
 * failure mode is the worst kind: the game labels one object and activates a
 * different one. There is now a single findTarget(), and both the label and
 * the press read it.
 */
type Target =
  | { kind: 'npc'; id: string; x: number; y: number; label: string }
  | { kind: 'thing'; id: string; x: number; y: number; label: string };

function npcTarget(n: NpcInstance): Target {
  return {
    kind: 'npc',
    id: n.id,
    x: n.actor.x,
    y: n.actor.y,
    label: NPCS[n.id]?.name ?? n.id.toUpperCase(),
  };
}

function thingTarget(it: { id: string; x: number; y: number }): Target {
  return {
    kind: 'thing',
    id: it.id,
    x: it.x * TILE + 8,
    y: it.y * TILE + 8,
    label: INTERACTABLES[it.id]?.label ?? it.id,
  };
}

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
  private hintTarget: Target | null = null;
  /**
   * A door's arrival spawn is the door tile itself, so without this the player
   * would land on a door and be sent straight back where they came from. The
   * tile is armed again the moment they step off it.
   */
  private doorCooldown: { x: number; y: number } | null = null;
  /** Seconds left on the clock's turn-of-the-block highlight. */
  private clockPulse = 0;
  /**
   * Set when the block turns, applied when the player is next standing still in
   * the world. Rebuilding the cast mid-conversation would delete the person
   * being spoken to, and a clue found inside a dialogue tree is itself a beat.
   */
  private crewDirty = false;
  private teardown: (() => void)[] = [];

  enter(app: App): void {
    // Modal scenes (lift, ship map) move the player through this, so they never
    // need to know how rooms are loaded.
    app.traveller = (room, spawn) => this.loadRoom(app, room, spawn);
    this.teardown = [
      installShipTime(app.state),
      bus.on('time:tick', () => {
        this.crewDirty = true;
        this.clockPulse = 3.0;
        app.toast(`Ship time ${app.state.clock()}`, '\x0B', PAL.halo3);
      }),
    ];
    this.loadRoom(app, app.state.room, null);
  }

  exit(): void {
    for (const off of this.teardown) off();
    this.teardown = [];
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
    app.state.visitRoom(roomId);

    audio.setAmbience(def.ambience, 1.2);
    if (def.music) audio.setMusic(def.music, { fade: 1.5 });

    // Player placement, in tiles: with quantised movement a spawn is a tile,
    // never a pixel, so there is no arrival that lands anyone off the grid.
    const s = app.state;
    const point = spawn ? this.room.spawns[spawn] : this.room.spawns['default'];
    const p = point ?? this.room.spawns['default'] ?? { x: 2, y: 2 };
    const tx = spawn || !this.player ? p.x : this.player.tileX;
    const ty = spawn || !this.player ? p.y : this.player.tileY;
    if (!this.player) {
      this.player = new Actor({ id: PLAYER_KEY, look: s.profile.look, tileX: tx, tileY: ty });
    } else {
      this.player.placeAt(tx, ty);
    }
    this.player.look = s.profile.look;
    app.sheetRegion(PLAYER_KEY, s.profile.look);

    s.room = roomId;
    this.doorCooldown = { x: tx, y: ty };
    this.npcs = [];
    this.crewDirty = false;
    this.syncNpcs(app);
    this.bannerTimer = 3.0;
    bus.emit('room:enter', { room: roomId });
  }

  /**
   * Reconciles who is standing in this room against the schedule.
   *
   * Run on every room load and again whenever the block turns, because the
   * player can stand in the Commons across a whole block and has to see Fen
   * walk out rather than discover her missing three rooms later. Anyone whose
   * room did not change keeps the actor they already had, so the crew are not
   * snapped back to their posts every twenty minutes.
   */
  private syncNpcs(app: App): void {
    const s = app.state;
    const here = new Set<string>();
    for (const def of Object.values(NPCS)) {
      // Every record, not only this room's: the journal and the map read these,
      // and a stale room on someone two decks away is a lie with no symptom.
      const room = npcRoom(def, s);
      s.npc(def.id).room = room;
      if (room === s.room) here.add(def.id);
    }
    this.npcs = this.npcs.filter((n) => here.has(n.id));
    for (const id of here) {
      if (this.npcs.some((n) => n.id === id)) continue;
      const def = NPCS[id];
      const post = npcPost(def, s.room);
      const key = `npc:${def.id}`;
      app.sheetRegion(key, def.look);
      const actor = new Actor({
        id: def.id,
        name: def.name,
        look: def.look,
        tileX: post[0],
        tileY: post[1],
        facing: 'down',
      });
      this.npcs.push({
        id: def.id,
        actor,
        brain: new NpcBrain(post[0], post[1], 2),
        regionKey: key,
      });
      bus.emit('npc:moved', { id, room: s.room });
    }
  }

  // --- update -----------------------------------------------------------

  update(app: App, dt: number): void {
    this.animTime += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.clockPulse > 0) this.clockPulse -= dt;
    if (this.crewDirty && this.mode === 'walk') {
      this.crewDirty = false;
      this.syncNpcs(app);
    }

    // A step already begun always finishes, whatever mode the scene is in.
    // Someone spoken to mid-stride must still land on the grid.
    const landed = this.player.advance(dt);

    if (this.mode === 'dialogue') this.updateDialogue(app, dt);
    else if (this.mode === 'examine') this.updateExamine(app, dt);
    else this.updateWalk(app, landed);

    for (const n of this.npcs) {
      if (this.mode === 'walk') n.brain.update(n.actor, this.room, dt);
      else n.actor.update(dt);
    }
    this.player.update(dt);
    this.updateAnimatedTiles(app);
    this.submitDraw(app);
  }

  private updateWalk(app: App, landed: boolean): void {
    const input = app.input;
    const st = settings.get();

    if (input.pressed('menu')) {
      audio.sfx('ui.open');
      openPause(app, this);
      return;
    }
    if (input.pressed('map')) {
      app.push(new ShipMapScene());
      return;
    }
    if (input.pressed('journal')) {
      audio.sfx('ui.open');
      openJournal(app);
      return;
    }

    const running = st.runMode === 'hold' ? input.down('run') : app.state.has('run-toggled');
    if (st.runMode === 'toggle' && input.pressed('run')) {
      app.state.setFlag('run-toggled', !app.state.has('run-toggled'));
    }

    // A door the player has no clearance for is not a destination, it is a
    // wall — refusing entry before the step means there is nothing to shove
    // them back off afterwards.
    const shut = (x: number, y: number): boolean => {
      const door = doorAt(this.room, x, y);
      return !!(door?.locked && !clearancesOf(app.state).includes(door.locked));
    };

    // Doors fire on arriving at the tile, or on resting there. A door the
    // player is merely crossing off must not fire, and one they land on while
    // still holding the key must, or a held walk sails straight past it.
    if (
      this.doorCooldown &&
      (this.doorCooldown.x !== this.player.tileX || this.doorCooldown.y !== this.player.tileY)
    ) {
      this.doorCooldown = null;
    }
    if (!this.doorCooldown && (landed || !this.player.moving)) {
      const d = doorAt(this.room, this.player.tileX, this.player.tileY);
      if (d && !shut(d.x, d.y)) {
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

    const outcome = this.player.steer(
      this.room,
      input.direction(),
      running ? RUN_STEP : WALK_STEP,
      shut,
    );
    if (outcome === 'walk') {
      audio.sfx(`step.${stepSoundAt(this.room, this.player.tileX, this.player.tileY)}` as never, {
        pitch: 0.94 + Math.random() * 0.12,
        gain: running ? 0.9 : 0.65,
      });
    } else if (outcome === 'bump') {
      const f = this.player.facingTile();
      const locked = doorAt(this.room, f.x, f.y);
      if (locked?.locked) {
        app.state.setFlag(`refused:${locked.to}`, true);
        audio.sfx('door.locked');
        this.showLines([locked.refuse ?? 'It does not open for you.']);
        return;
      }
      // Walking into a wall answers back: the surface underfoot, pitched down
      // to a scuff. Silence here reads as a dropped input.
      audio.sfx(`step.${stepSoundAt(this.room, this.player.tileX, this.player.tileY)}` as never, {
        pitch: 0.6,
        gain: 0.5,
      });
    }

    // interaction target
    this.hintTarget = this.findTarget();
    if (input.pressed('confirm') && this.hintTarget) {
      this.interact(app, this.hintTarget);
    }
  }

  /**
   * What confirm would reach.
   *
   * The faced tile wins outright. Turn-in-place makes aiming at one specific
   * tile a tap, so a crewmate standing beside the player must no longer shadow
   * the terminal they are squarely looking at — which is what happened while
   * proximity to a person was checked first, and it made whole rooms
   * unexaminable whenever somebody was on shift in them.
   */
  private findTarget(): Target | null {
    const f = this.player.facingTile();
    for (const n of this.npcs) {
      if (n.actor.tileX === f.x && n.actor.tileY === f.y) return npcTarget(n);
    }
    const faced = interactAt(this.room, f.x, f.y) ?? this.nearestInteractable();
    if (faced) return thingTarget(faced);
    // Nothing aimed at: talking to whoever is at the player's elbow is the
    // likeliest intent left.
    for (const n of this.npcs) {
      if (this.player.distanceTo(n.actor) < 20) return npcTarget(n);
    }
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

  private interact(app: App, t: Target): void {
    this.player.act();
    if (t.kind === 'npc') {
      const n = this.npcs.find((x) => x.id === t.id);
      if (!n) return;
      n.actor.faceTowards(this.player.x, this.player.y);
      n.brain.freeze();
      this.startDialogue(app, n.id);
      return;
    }
    const it = { id: t.id };
    const def = INTERACTABLES[it.id];
    if (!def) return;
    const res = def.run(app.state);
    if (res.battle) {
      this.launchBattle(app, res.battle);
      return;
    }
    audio.sfx(it.id.includes('terminal') || it.id.includes('muster') ? 'terminal.on' : 'ui.select');
    if (res.flag === 'open-chapter-decision') {
      app.push(new ChapterDecisionScene());
      return;
    }
    if (res.flag === 'open-lift') {
      app.push(new LiftScene(this.room.def.id));
      return;
    }
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

  /**
   * Camera follow, clamped so we never show void past the room edge, and
   * snapped to whole pixels. The renderer rounds the camera before it places
   * the tile layers; anything drawn against an unrounded copy of it would
   * shear against the floor by a pixel on half the frames.
   */
  private camera(): { x: number; y: number } {
    let cx = this.player.x - VW / 2;
    let cy = this.player.y - VH / 2 - 8;
    cx = Math.max(0, Math.min(this.room.pixelW - VW, cx));
    cy = Math.max(0, Math.min(this.room.pixelH - VH, cy));
    if (this.room.pixelW < VW) cx = (this.room.pixelW - VW) / 2;
    if (this.room.pixelH < VH) cy = (this.room.pixelH - VH) / 2;
    return { x: Math.round(cx), y: Math.round(cy) };
  }

  private submitDraw(app: App): void {
    const { x: cx, y: cy } = this.camera();
    app.renderer.setCamera(cx, cy);

    for (const l of this.room.lights) app.renderer.addLight(l);

    const drawActor = (a: Actor, key: string) => {
      const reg = app.atlas.get(key);
      if (!reg || !a.visible) return;
      const row = FACING_ROW[a.facing as Facing];
      app.renderer.drawSprite({
        x: Math.round(a.x - CELL_W / 2) - cx + a.leanX,
        y: Math.round(a.y - CELL_H) - cy + a.bobOffset + a.leanY,
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
    const { x: cx, y: cy } = this.camera();
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
    // Clock strip, bottom-left: unobtrusive but always answers "when is this".
    // It warms toward halo for three seconds when the block turns and then
    // fades back — a player cannot plan around a schedule whose changes are
    // silent, and a strobe would be a lie about how urgent twenty minutes is.
    const turn = Math.max(0, this.clockPulse / 3.0);
    p.alpha(0.85, () => p.panel(6, VH - 16, 52, 11, 'plate'));
    p.text(s.clock(), 11, VH - 13, { color: mix(PAL.bone2, PAL.halo3, turn) });

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
    // The box grows to its content instead of always claiming a fixed slab of
    // screen. A one-line reply was covering a quarter of the room behind it,
    // which is exactly the space the player needs to read who else is present.
    // Measured on the FULL line, not the revealed prefix, so it never resizes
    // mid-typewriter.
    const textScale = st.largeText ? 2 : 1;
    const maxLines = st.largeText ? 3 : 5;
    const lineH = LINE_H * textScale;
    const lines = Math.max(1, Math.min(maxLines, p.measureBlock(r.text, VW - 28, textScale)));
    const boxH = 8 + lines * lineH + 10;
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
      scale: textScale,
      maxLines,
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
