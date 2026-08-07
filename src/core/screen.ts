/**
 * Screen: fixed internal resolution with integer-only upscaling.
 *
 * 384x216 was chosen because it is exactly 1920x1080 / 5, so on the most common
 * desktop display the game lands on a whole-number scale with no resampling at
 * all. At 16px tiles that is a 24 x 13.5 tile viewport — roughly double the
 * field of view of a Game Boy screen, which the mystery needs because rooms
 * have to be readable as *places*, not as keyholes.
 *
 * Non-integer scales are never used. If the window cannot fit a whole multiple
 * we letterbox rather than blur, because blurred pixel art is the single
 * fastest way to make this kind of game look cheap.
 */

export const VW = 384;
export const VH = 216;
export const TILE = 16;

export interface ScreenLayout {
  scale: number;
  cssW: number;
  cssH: number;
}

export class Screen {
  readonly world: HTMLCanvasElement;
  readonly ui: HTMLCanvasElement;
  readonly uiCtx: CanvasRenderingContext2D;
  private frame: HTMLElement;
  private layout: ScreenLayout = { scale: 1, cssW: VW, cssH: VH };
  private listeners = new Set<(l: ScreenLayout) => void>();
  private ro: ResizeObserver | null = null;
  private onWinResize = () => this.relayout();

  constructor(frame: HTMLElement, world: HTMLCanvasElement, ui: HTMLCanvasElement) {
    this.frame = frame;
    this.world = world;
    this.ui = ui;
    world.width = VW;
    world.height = VH;
    ui.width = VW;
    ui.height = VH;
    const ctx = ui.getContext('2d', { alpha: true, desynchronized: false });
    if (!ctx) throw new Error('2D context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.uiCtx = ctx;
    window.addEventListener('resize', this.onWinResize);
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(this.onWinResize);
      this.ro.observe(document.body);
    }
    this.relayout();
  }

  get current(): ScreenLayout {
    return this.layout;
  }

  onLayout(fn: (l: ScreenLayout) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  relayout(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.max(1, Math.floor(Math.min(w / VW, h / VH)));
    const cssW = VW * scale;
    const cssH = VH * scale;
    if (
      scale === this.layout.scale &&
      cssW === this.layout.cssW &&
      cssH === this.layout.cssH
    )
      return;
    this.layout = { scale, cssW, cssH };
    this.frame.style.width = cssW + 'px';
    this.frame.style.height = cssH + 'px';
    for (const fn of this.listeners) fn(this.layout);
  }

  /** Convert a client-space point (mouse/touch) into virtual pixels. */
  toVirtual(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.frame.getBoundingClientRect();
    return {
      x: Math.floor(((clientX - r.left) / r.width) * VW),
      y: Math.floor(((clientY - r.top) / r.height) * VH),
    };
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWinResize);
    this.ro?.disconnect();
    this.ro = null;
    this.listeners.clear();
  }
}
