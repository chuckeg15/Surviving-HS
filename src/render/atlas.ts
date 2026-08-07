/**
 * Runtime sprite packer. Actor sheets, effect sheets and world icons are all
 * generated as separate canvases and then packed into one texture so the whole
 * scene draws in a single call. Shelf packing is enough here: every input is a
 * small, similar-sized sheet, so the fancy algorithms buy nothing.
 */

export interface AtlasRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class SpriteAtlas {
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private regions = new Map<string, AtlasRegion>();
  private shelfX = 0;
  private shelfY = 0;
  private shelfH = 0;
  private dirty = true;

  constructor(
    readonly size = 512,
    private padding = 1,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    const g = this.canvas.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    this.g = g;
  }

  has(key: string): boolean {
    return this.regions.has(key);
  }

  get(key: string): AtlasRegion | undefined {
    return this.regions.get(key);
  }

  /** Adds (or replaces in place, if the size matches) a sheet. */
  add(key: string, src: CanvasImageSource, w: number, h: number): AtlasRegion {
    const existing = this.regions.get(key);
    if (existing && existing.w === w && existing.h === h) {
      this.g.clearRect(existing.x, existing.y, existing.w, existing.h);
      this.g.drawImage(src, existing.x, existing.y);
      this.dirty = true;
      return existing;
    }
    if (this.shelfX + w + this.padding > this.size) {
      this.shelfX = 0;
      this.shelfY += this.shelfH + this.padding;
      this.shelfH = 0;
    }
    if (this.shelfY + h > this.size) {
      throw new Error(`SpriteAtlas full: cannot fit "${key}" (${w}x${h})`);
    }
    const r: AtlasRegion = { x: this.shelfX, y: this.shelfY, w, h };
    this.g.clearRect(r.x, r.y, w, h);
    this.g.drawImage(src, r.x, r.y);
    this.shelfX += w + this.padding;
    if (h > this.shelfH) this.shelfH = h;
    this.regions.set(key, r);
    this.dirty = true;
    return r;
  }

  consumeDirty(): boolean {
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  markDirty(): void {
    this.dirty = true;
  }

  clear(): void {
    this.g.clearRect(0, 0, this.size, this.size);
    this.regions.clear();
    this.shelfX = this.shelfY = this.shelfH = 0;
    this.dirty = true;
  }

  get usage(): number {
    return this.shelfY / this.size;
  }
}
