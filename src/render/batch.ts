/**
 * QuadBatch — a growable, single-draw-call sprite batch.
 *
 * Every sprite in a scene (actors, effects, floating markers) shares one
 * texture atlas and one geometry, so a busy corridor with twenty crew costs one
 * draw call rather than twenty. Order within the buffer *is* draw order, which
 * is how we get y-sorting without a depth buffer.
 */

import * as THREE from 'three';

const FLOATS_PER_VERT = 4; // x, y, u, v
const VERTS_PER_QUAD = 6;

export class QuadBatch {
  readonly mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private uv: Float32Array;
  private col: Float32Array;
  private posAttr: THREE.BufferAttribute;
  private uvAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private count = 0;
  private capacity: number;
  private texW = 1;
  private texH = 1;

  constructor(material: THREE.Material, capacity = 256) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * VERTS_PER_QUAD * 3);
    this.uv = new Float32Array(capacity * VERTS_PER_QUAD * 2);
    this.col = new Float32Array(capacity * VERTS_PER_QUAD * 4);
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.uvAttr = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('uv', this.uvAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    void FLOATS_PER_VERT;
  }

  setTextureSize(w: number, h: number): void {
    this.texW = w;
    this.texH = h;
  }

  begin(): void {
    this.count = 0;
  }

  private grow(): void {
    const cap = this.capacity * 2;
    const pos = new Float32Array(cap * VERTS_PER_QUAD * 3);
    const uv = new Float32Array(cap * VERTS_PER_QUAD * 2);
    const col = new Float32Array(cap * VERTS_PER_QUAD * 4);
    pos.set(this.pos);
    uv.set(this.uv);
    col.set(this.col);
    this.pos = pos;
    this.uv = uv;
    this.col = col;
    this.capacity = cap;
    this.geo.deleteAttribute('position');
    this.geo.deleteAttribute('uv');
    this.geo.deleteAttribute('color');
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.uvAttr = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('uv', this.uvAttr);
    this.geo.setAttribute('color', this.colAttr);
  }

  /**
   * Push one sprite. Screen-space pixels, y down. Source rect is in texels.
   * Tint multiplies; alpha fades. Both are per-vertex so they cost nothing.
   */
  push(
    x: number,
    y: number,
    w: number,
    h: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    r = 1,
    g = 1,
    b = 1,
    a = 1,
    z = 0,
  ): void {
    if (this.count >= this.capacity) this.grow();
    const i = this.count++;
    const p = i * VERTS_PER_QUAD * 3;
    const t = i * VERTS_PER_QUAD * 2;
    const c = i * VERTS_PER_QUAD * 4;

    const x0 = x,
      y0 = y,
      x1 = x + w,
      y1 = y + h;
    const u0 = sx / this.texW,
      v0 = sy / this.texH,
      u1 = (sx + sw) / this.texW,
      v1 = (sy + sh) / this.texH;

    // two triangles: (0,1,2) (2,1,3) laid out as 6 verts
    const px = [x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1];
    const pu = [u0, v0, u1, v0, u0, v1, u0, v1, u1, v0, u1, v1];
    for (let k = 0; k < 6; k++) {
      this.pos[p + k * 3] = px[k * 2];
      this.pos[p + k * 3 + 1] = px[k * 2 + 1];
      this.pos[p + k * 3 + 2] = z;
      this.uv[t + k * 2] = pu[k * 2];
      this.uv[t + k * 2 + 1] = pu[k * 2 + 1];
      this.col[c + k * 4] = r;
      this.col[c + k * 4 + 1] = g;
      this.col[c + k * 4 + 2] = b;
      this.col[c + k * 4 + 3] = a;
    }
  }

  end(): void {
    const verts = this.count * VERTS_PER_QUAD;
    this.geo.setDrawRange(0, verts);
    if (verts > 0) {
      // Full-buffer upload: at our quad counts (low hundreds) the partial-range
      // bookkeeping costs more than it saves, and the API for it has churned
      // across three versions.
      this.posAttr.needsUpdate = true;
      this.uvAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
    }
  }

  get quadCount(): number {
    return this.count;
  }

  dispose(): void {
    this.geo.dispose();
  }
}

/** Static geometry for tile layers — built once per room, never per frame. */
export class TileMesh {
  readonly mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private uvAttr: THREE.BufferAttribute | null = null;
  private uvArr: Float32Array | null = null;
  private texW = 1;
  private texH = 1;

  constructor(material: THREE.Material) {
    this.geo = new THREE.BufferGeometry();
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
  }

  build(
    quads: {
      x: number;
      y: number;
      w: number;
      h: number;
      sx: number;
      sy: number;
      sw: number;
      sh: number;
      tint?: [number, number, number, number];
    }[],
    texW: number,
    texH: number,
  ): void {
    this.texW = texW;
    this.texH = texH;
    const n = quads.length;
    const pos = new Float32Array(n * VERTS_PER_QUAD * 3);
    const uv = new Float32Array(n * VERTS_PER_QUAD * 2);
    const col = new Float32Array(n * VERTS_PER_QUAD * 4);
    for (let i = 0; i < n; i++) {
      const q = quads[i];
      const p = i * VERTS_PER_QUAD * 3;
      const t = i * VERTS_PER_QUAD * 2;
      const c = i * VERTS_PER_QUAD * 4;
      const x0 = q.x,
        y0 = q.y,
        x1 = q.x + q.w,
        y1 = q.y + q.h;
      const u0 = q.sx / texW,
        v0 = q.sy / texH,
        u1 = (q.sx + q.sw) / texW,
        v1 = (q.sy + q.sh) / texH;
      const px = [x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1];
      const pu = [u0, v0, u1, v0, u0, v1, u0, v1, u1, v0, u1, v1];
      const tint = q.tint ?? [1, 1, 1, 1];
      for (let k = 0; k < 6; k++) {
        pos[p + k * 3] = px[k * 2];
        pos[p + k * 3 + 1] = px[k * 2 + 1];
        pos[p + k * 3 + 2] = 0;
        uv[t + k * 2] = pu[k * 2];
        uv[t + k * 2 + 1] = pu[k * 2 + 1];
        col[c + k * 4] = tint[0];
        col[c + k * 4 + 1] = tint[1];
        col[c + k * 4 + 2] = tint[2];
        col[c + k * 4 + 3] = tint[3];
      }
    }
    this.geo.dispose();
    this.geo = new THREE.BufferGeometry();
    this.uvArr = uv;
    this.uvAttr = new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', this.uvAttr);
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.mesh.geometry = this.geo;
  }

  /** Retarget one already-built quad to a different atlas cell (tile animation). */
  setQuadSource(index: number, sx: number, sy: number, sw: number, sh: number): void {
    if (!this.uvArr || !this.uvAttr) return;
    const t = index * VERTS_PER_QUAD * 2;
    const u0 = sx / this.texW,
      v0 = sy / this.texH,
      u1 = (sx + sw) / this.texW,
      v1 = (sy + sh) / this.texH;
    const pu = [u0, v0, u1, v0, u0, v1, u0, v1, u1, v0, u1, v1];
    for (let k = 0; k < 12; k++) this.uvArr[t + k] = pu[k];
    this.uvAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
  }
}
