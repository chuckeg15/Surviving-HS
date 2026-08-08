/**
 * App — the shell everything else plugs into.
 *
 * Owns the frame loop, the scene stack, and the shared services (renderer,
 * painter, input, audio, state). Scenes are a stack rather than a single
 * current scene so that the pause menu, the journal and dialogue can sit on top
 * of live exploration without any of them having to know about each other.
 */

import { Screen, VH, VW } from '@/core/screen';
import { Painter } from '@/ui/painter';
import { WorldRenderer } from '@/render/renderer';
import { SpriteAtlas } from '@/render/atlas';
import { Input } from '@/core/input';
import { settings } from '@/core/settings';
import { audio } from '@/core/audio';
import { GameState } from '@/game/state';
import { bus } from '@/core/events';
import { PAL } from '@/art/palette';
import { getActorSheet, type ActorLook } from '@/art/actors';
import { writeSlot, AUTOSAVE_SLOT } from '@/game/save';

/** Set by the explore scene so modal scenes can move the world without
 *  reaching into it. */
export type Traveller = (room: string, spawn: string) => void;

export interface Scene {
  readonly id: string;
  /** Scenes below a modal scene keep drawing but stop updating. */
  readonly modal?: boolean;
  /** Suppresses the world layer entirely (menus on a black field). */
  readonly hidesWorld?: boolean;
  enter?(app: App): void;
  exit?(app: App): void;
  update(app: App, dt: number): void;
  draw(app: App, p: Painter): void;
}

export interface Toast {
  text: string;
  icon: string;
  color: string;
  life: number;
}

const TOAST_LIFE = 3.2;

export class App {
  readonly screen: Screen;
  readonly painter: Painter;
  readonly renderer: WorldRenderer;
  readonly input: Input;
  readonly atlas = new SpriteAtlas(1024);
  state = new GameState();

  private stack: Scene[] = [];
  private raf = 0;
  private lastTime = 0;
  private frames = 0;
  private fpsTimer = 0;
  fps = 60;
  /** Rolling worst frame time in ms, for the performance readout. */
  worstFrame = 0;

  toasts: Toast[] = [];
  /** Screen fade, driven by transitions. 0 = clear. */
  private fade = 0;
  private fadeTarget = 0;
  private fadeSpeed = 4;
  private fadeCb: (() => void) | null = null;
  private disposed = false;

  constructor(frame: HTMLElement, world: HTMLCanvasElement, ui: HTMLCanvasElement) {
    this.screen = new Screen(frame, world, ui);
    this.painter = new Painter(this.screen.uiCtx);
    this.renderer = new WorldRenderer(world);
    this.input = new Input();
    this.renderer.setSpriteAtlas(this.atlas.canvas);
    this.applySettings();
    settings.onChange(() => this.applySettings());

    bus.on('toast', ({ text, icon, tone }) => {
      const color =
        tone === 'good' ? PAL.halo3 : tone === 'bad' ? PAL.ember3 : tone === 'clue' ? PAL.amber3 : PAL.bone2;
      this.toast(text, icon ?? '\x09', color);
    });
    bus.on('clue:found', ({ id, silent }) => {
      if (!silent) audio.sfx('clue.found');
      void id;
    });
  }

  // --- services ---------------------------------------------------------

  applySettings(): void {
    const s = settings.get();
    this.renderer.setScanlines(s.scanlines ? 0.06 : 0);
    this.renderer.setLightSteps(8);
    this.input.setBindings(s.bindings);
  }

  /** Registers a look in the shared sprite atlas and returns its region. */
  sheetRegion(key: string, look: ActorLook) {
    if (!this.atlas.has(key)) {
      const sheet = getActorSheet(look);
      this.atlas.add(key, sheet, sheet.width, sheet.height);
      this.renderer.refreshSpriteAtlas();
    }
    return this.atlas.get(key)!;
  }

  /** Replaces a look already in the atlas (character creation preview). */
  updateSheet(key: string, look: ActorLook): void {
    const sheet = getActorSheet(look);
    this.atlas.add(key, sheet, sheet.width, sheet.height);
    this.renderer.refreshSpriteAtlas();
  }

  // --- scene stack ------------------------------------------------------

  get scene(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(scene: Scene): void {
    scene.enter?.(this);
    this.stack.push(scene);
    this.input.clearHeld();
  }

  pop(): void {
    const s = this.stack.pop();
    s?.exit?.(this);
    this.input.clearHeld();
  }

  replace(scene: Scene): void {
    while (this.stack.length) this.pop();
    this.push(scene);
  }

  /** Fade out, swap, fade in. The only sanctioned way to change place. */
  transition(to: Scene, color = '#04070a'): void {
    this.fadeTo(1, color, () => {
      this.replace(to);
      this.fadeTo(0, color);
    });
  }

  /** Installed by the explore scene; the lift and map screens call it. */
  traveller: Traveller | null = null;

  travelTo(room: string, spawn: string): void {
    this.traveller?.(room, spawn);
  }

  fadeTo(target: number, color = '#04070a', cb?: () => void): void {
    this.fadeTarget = target;
    this.fadeCb = cb ?? null;
    this.renderer.setFade(this.fade, color);
  }

  get fading(): boolean {
    return Math.abs(this.fade - this.fadeTarget) > 0.001;
  }

  // --- toasts -----------------------------------------------------------

  toast(text: string, icon = '\x09', color: string = PAL.bone2): void {
    this.toasts.unshift({ text, icon, color, life: TOAST_LIFE });
    if (this.toasts.length > 4) this.toasts.length = 4;
  }

  autosave(): void {
    writeSlot(AUTOSAVE_SLOT, this.state);
    this.toast('Progress recorded', '\x0B', PAL.iron5);
  }

  // --- loop -------------------------------------------------------------

  start(): void {
    this.lastTime = performance.now();
    const step = (now: number) => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(step);
      const raw = (now - this.lastTime) / 1000;
      this.lastTime = now;
      // Clamp: a backgrounded tab returns a huge delta that teleports actors
      // through walls and burns the whole battle timeline in one frame.
      const dt = Math.min(0.05, Math.max(0, raw));
      this.frames++;
      this.fpsTimer += dt;
      this.worstFrame = Math.max(this.worstFrame * 0.995, raw * 1000);
      if (this.fpsTimer >= 0.5) {
        this.fps = this.frames / this.fpsTimer;
        this.frames = 0;
        this.fpsTimer = 0;
      }
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(step);
  }

  private frame(dt: number): void {
    this.input.beginFrame(dt);
    if (this.input.gestured) void audio.resume();

    this.state.playSeconds += dt;

    // fade
    if (this.fading) {
      const dir = Math.sign(this.fadeTarget - this.fade);
      this.fade = Math.max(0, Math.min(1, this.fade + dir * this.fadeSpeed * dt));
      this.renderer.setFade(this.fade);
      if (!this.fading && this.fadeCb) {
        const cb = this.fadeCb;
        this.fadeCb = null;
        cb();
      }
    }

    // Only the topmost scene updates; everything below is frozen but visible.
    const top = this.scene;
    if (top && !this.fading) top.update(this, dt);

    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].life -= dt;
      if (this.toasts[i].life <= 0) this.toasts.splice(i, 1);
    }

    // draw: find the lowest non-modal scene and draw upward from it
    let base = this.stack.length - 1;
    while (base > 0 && this.stack[base].modal) base--;
    this.renderer.setWorldVisible(!this.stack[this.stack.length - 1]?.hidesWorld);

    this.painter.clear();
    for (let i = base; i < this.stack.length; i++) this.stack[i].draw(this, this.painter);
    this.drawToasts();

    const s = settings.get();
    this.renderer.render(dt, {
      reduceFlashing: s.reduceFlashing,
      reduceShake: s.reduceShake,
    });

    this.input.endFrame();
  }

  private drawToasts(): void {
    const p = this.painter;
    let y = 6;
    for (const t of this.toasts) {
      const a = Math.min(1, t.life / 0.4);
      const w = Math.min(VW - 12, 18 + t.text.length * 6);
      p.alpha(a, () => {
        p.panel(VW - w - 6, y, w, 13, 'plate');
        p.text(t.icon, VW - w, y + 3, { color: t.color });
        p.text(t.text, VW - w + 10, y + 3, { color: PAL.bone2 });
      });
      y += 15;
    }
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    while (this.stack.length) this.pop();
    this.input.dispose();
    this.renderer.dispose();
    this.screen.dispose();
    audio.dispose();
    bus.clear();
  }

  get debugInfo() {
    return {
      fps: Math.round(this.fps),
      worstFrameMs: Math.round(this.worstFrame * 10) / 10,
      calls: this.renderer.info.calls,
      tris: this.renderer.info.triangles,
      scene: this.scene?.id ?? '-',
      atlas: Math.round(this.atlas.usage * 100) + '%',
    };
  }
}

export { VW, VH };
