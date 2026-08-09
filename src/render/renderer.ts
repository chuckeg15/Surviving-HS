/**
 * WorldRenderer — orthographic, pixel-locked, single-pass-lit.
 *
 * Design decisions worth stating:
 *
 * 1. World units ARE screen pixels. The camera is an ortho box of exactly
 *    384x216 with y pointing down, so a tile at map (3,4) sits at (48,64) and
 *    nothing is ever off by a subpixel.
 *
 * 2. The camera position is snapped to whole pixels every frame. This is the
 *    single most important line in the file: a camera at x=100.5 turns crisp
 *    pixel art into shimmering mush the moment the player walks.
 *
 * 3. Depth testing is off everywhere. Draw order is scene order, and actors are
 *    y-sorted into one batch. A depth buffer would fight the transparency and
 *    buy nothing in a 2D game.
 *
 * 4. Lighting is a half-resolution lightmap composited multiplicatively in a
 *    final pass, and QUANTISED to a small number of steps in the shader. Smooth
 *    gradients over pixel art look like a filter; banded pools of light look
 *    authored.
 */

import * as THREE from 'three';
import { VH, VW } from '@/core/screen';
import { QuadBatch, TileMesh } from '@/render/batch';
import { rgb } from '@/art/palette';

export interface Light {
  x: number;
  y: number;
  r: number;
  color: string;
  i: number;
  /** 0 = steady. Higher values flicker harder; suppressed by reduceFlashing. */
  flicker?: number;
}

export interface SpriteDraw {
  x: number;
  y: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Sort key — normally the actor's feet position. */
  sort: number;
  tint?: [number, number, number];
  alpha?: number;
}

const LIGHT_DIV = 2; // lightmap is half resolution

/**
 * The lightmap canvas can only hold 0..1, but a lit room needs to sit at 1.0
 * (texture shown as authored) with lamps pushing *above* it. So the canvas
 * stores brightness/LIGHT_GAIN and the shader multiplies it back out. Without
 * this the brightest a room can ever be is "the raw texture, undimmed", which
 * makes every scene look like a power failure.
 */
const LIGHT_GAIN = 1.7;

const compositeVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const compositeFrag = /* glsl */ `
precision mediump float;
uniform sampler2D tScene;
uniform sampler2D tLight;
uniform float uSteps;
uniform float uGain;
uniform float uLightMix;
uniform vec3  uFlashColor;
uniform float uFlashAmt;
uniform vec3  uFadeColor;
uniform float uFade;
uniform float uScan;
uniform float uVignette;
uniform vec2  uRes;
varying vec2 vUv;

void main() {
  vec3 scene = texture2D(tScene, vUv).rgb;
  vec3 light = texture2D(tLight, vUv).rgb;

  light *= uGain;
  // Banding the light is what keeps this reading as pixel art rather than as a
  // 2D game with a lighting filter bolted on.
  light = floor(light * uSteps + 0.5) / uSteps;
  light = mix(vec3(1.0), light, uLightMix);

  vec3 c = scene * light;

  // Scanlines are applied to the *lit* image so they darken bright areas more,
  // which is how a real CRT behaves.
  float line = mod(floor(vUv.y * uRes.y), 2.0);
  c *= 1.0 - uScan * line;

  vec2 d = vUv - 0.5;
  float vig = 1.0 - uVignette * dot(d, d) * 1.6;
  c *= vig;

  c = mix(c, uFlashColor, uFlashAmt);
  c = mix(c, uFadeColor, uFade);
  gl_FragColor = vec4(c, 1.0);
}
`;

export class WorldRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private rt: THREE.WebGLRenderTarget;
  private postScene = new THREE.Scene();
  private postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private compositeMat: THREE.ShaderMaterial;

  private tileTex: THREE.CanvasTexture | null = null;
  private spriteTex: THREE.CanvasTexture | null = null;
  private tileMat: THREE.MeshBasicMaterial;
  private spriteMat: THREE.MeshBasicMaterial;

  readonly floorLayer: TileMesh;
  readonly propLayer: TileMesh;
  readonly overLayer: TileMesh;
  private actorBatch: QuadBatch;
  private fxBatch: QuadBatch;

  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private lightTex: THREE.CanvasTexture;
  private lights: Light[] = [];
  private ambient: [number, number, number] = [0.3, 0.32, 0.35];

  private camX = 0;
  private camY = 0;
  private shakeAmt = 0;
  private shakeT = 0;
  private time = 0;

  /** Sprites collected this frame, sorted before submission. */
  private pending: SpriteDraw[] = [];
  private pendingFx: SpriteDraw[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(VW, VH, false);
    // Colour management is switched OFF end to end. Three would otherwise
    // decode the sRGB atlases to linear on sample and re-encode on output — but
    // our final composite is a raw ShaderMaterial writing straight to the
    // canvas, so the re-encode never happens and every pixel lands roughly a
    // gamma step too dark. Pixel art is authored in gamma space and should be
    // multiplied in gamma space: what the artist picked is what the screen gets.
    THREE.ColorManagement.enabled = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.sortObjects = false;
    this.renderer.autoClear = true;
    this.renderer.setClearColor(0x04070a, 1);

    // y-down orthographic box in pixel units
    this.camera = new THREE.OrthographicCamera(0, VW, 0, VH, -100, 100);
    this.camera.position.z = 10;

    this.rt = new THREE.WebGLRenderTarget(VW, VH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });

    this.tileMat = new THREE.MeshBasicMaterial({
      transparent: true,
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      alphaTest: 0.02,
    });
    this.spriteMat = new THREE.MeshBasicMaterial({
      transparent: true,
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      alphaTest: 0.02,
    });

    this.floorLayer = new TileMesh(this.tileMat);
    this.propLayer = new TileMesh(this.tileMat);
    this.overLayer = new TileMesh(this.tileMat);
    this.actorBatch = new QuadBatch(this.spriteMat, 128);
    this.fxBatch = new QuadBatch(this.spriteMat, 256);

    // scene order == draw order
    this.scene.add(this.floorLayer.mesh);
    this.scene.add(this.propLayer.mesh);
    this.scene.add(this.actorBatch.mesh);
    this.scene.add(this.overLayer.mesh);
    this.scene.add(this.fxBatch.mesh);

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = Math.ceil(VW / LIGHT_DIV);
    this.lightCanvas.height = Math.ceil(VH / LIGHT_DIV);
    this.lightCtx = this.lightCanvas.getContext('2d', { willReadFrequently: false })!;
    this.lightTex = new THREE.CanvasTexture(this.lightCanvas);
    this.lightTex.minFilter = THREE.LinearFilter;
    this.lightTex.magFilter = THREE.LinearFilter;
    this.lightTex.generateMipmaps = false;
    this.lightTex.colorSpace = THREE.NoColorSpace;

    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: this.rt.texture },
        tLight: { value: this.lightTex },
        uSteps: { value: 8.0 },
        uGain: { value: LIGHT_GAIN },
        uLightMix: { value: 1.0 },
        uFlashColor: { value: new THREE.Color(1, 1, 1) },
        uFlashAmt: { value: 0 },
        uFadeColor: { value: new THREE.Color(0, 0, 0) },
        uFade: { value: 0 },
        uScan: { value: 0.06 },
        uVignette: { value: 0.35 },
        uRes: { value: new THREE.Vector2(VW, VH) },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMat);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  // --- assets -----------------------------------------------------------

  setTileAtlas(canvas: HTMLCanvasElement): void {
    this.tileTex?.dispose();
    this.tileTex = new THREE.CanvasTexture(canvas);
    this.tileTex.minFilter = THREE.NearestFilter;
    this.tileTex.magFilter = THREE.NearestFilter;
    this.tileTex.generateMipmaps = false;
    // Atlas UVs are computed from canvas coordinates (origin top-left). Three's
    // default flipY would mirror every cell vertically and, for a partially
    // filled atlas, point at empty space.
    this.tileTex.flipY = false;
    this.tileTex.colorSpace = THREE.NoColorSpace;
    this.tileMat.map = this.tileTex;
    this.tileMat.needsUpdate = true;
  }

  setSpriteAtlas(canvas: HTMLCanvasElement): void {
    if (this.spriteTex && this.spriteTex.image === canvas) {
      this.spriteTex.needsUpdate = true;
      return;
    }
    this.spriteTex?.dispose();
    this.spriteTex = new THREE.CanvasTexture(canvas);
    this.spriteTex.minFilter = THREE.NearestFilter;
    this.spriteTex.magFilter = THREE.NearestFilter;
    this.spriteTex.generateMipmaps = false;
    this.spriteTex.flipY = false; // see setTileAtlas
    this.spriteTex.colorSpace = THREE.NoColorSpace;
    this.spriteMat.map = this.spriteTex;
    this.spriteMat.needsUpdate = true;
    this.actorBatch.setTextureSize(canvas.width, canvas.height);
    this.fxBatch.setTextureSize(canvas.width, canvas.height);
  }

  refreshSpriteAtlas(): void {
    if (this.spriteTex) this.spriteTex.needsUpdate = true;
  }

  // --- camera -----------------------------------------------------------

  setCamera(x: number, y: number): void {
    this.camX = x;
    this.camY = y;
  }

  get cameraX(): number {
    return Math.round(this.camX);
  }
  get cameraY(): number {
    return Math.round(this.camY);
  }

  shake(amount: number, seconds = 0.25): void {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
    this.shakeT = Math.max(this.shakeT, seconds);
  }

  // --- lighting ---------------------------------------------------------

  /**
   * `level` is brightness where 1.0 means "show the tiles as authored".
   * Below 1 dims the room; lamps can carry a spot above 1 up to LIGHT_GAIN.
   */
  setAmbient(color: string, level: number): void {
    const [r, g, b] = rgb(color);
    // Normalise the tint to its brightest channel so the colour only shifts hue
    // and `level` alone controls brightness. Otherwise picking a cool ambient
    // silently darkens the room and every value decision has to be re-made.
    const peak = Math.max(r, g, b) || 255;
    const k = level / LIGHT_GAIN / peak;
    this.ambient = [r * k, g * k, b * k];
  }

  /** Lights are submitted fresh each frame — nothing persists across frames. */
  addLight(l: Light): void {
    this.lights.push(l);
  }

  setLightSteps(n: number): void {
    this.compositeMat.uniforms.uSteps.value = Math.max(1, n);
  }

  /** 0 disables lighting entirely (accessibility / debug). */
  setLightMix(v: number): void {
    this.compositeMat.uniforms.uLightMix.value = Math.max(0, Math.min(1, v));
  }

  setScanlines(v: number): void {
    this.compositeMat.uniforms.uScan.value = v;
  }

  setVignette(v: number): void {
    this.compositeMat.uniforms.uVignette.value = v;
  }

  setFade(amount: number, color = '#000000'): void {
    this.compositeMat.uniforms.uFade.value = Math.max(0, Math.min(1, amount));
    const [r, g, b] = rgb(color);
    (this.compositeMat.uniforms.uFadeColor.value as THREE.Color).setRGB(
      r / 255,
      g / 255,
      b / 255,
    );
  }

  setFlash(amount: number, color = '#ffffff'): void {
    this.compositeMat.uniforms.uFlashAmt.value = Math.max(0, Math.min(1, amount));
    const [r, g, b] = rgb(color);
    (this.compositeMat.uniforms.uFlashColor.value as THREE.Color).setRGB(
      r / 255,
      g / 255,
      b / 255,
    );
  }

  // --- per-frame submission --------------------------------------------

  drawSprite(s: SpriteDraw): void {
    this.pending.push(s);
  }

  /** Effects draw above everything, unsorted, in submission order. */
  drawFx(s: SpriteDraw): void {
    this.pendingFx.push(s);
  }

  private paintLightmap(reduceFlashing: boolean): void {
    const lw = this.lightCanvas.width;
    const lh = this.lightCanvas.height;
    const g = this.lightCtx;
    const [ar, ag, ab] = this.ambient;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgb(${Math.round(ar * 255)},${Math.round(ag * 255)},${Math.round(ab * 255)})`;
    g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'lighter';

    const cx = Math.round(this.camX);
    const cy = Math.round(this.camY);
    for (const l of this.lights) {
      let i = l.i;
      if (l.flicker && !reduceFlashing) {
        // deterministic per-light flicker: two out-of-phase sines beat against
        // each other so it never looks like a repeating loop
        const p = (l.x * 0.11 + l.y * 0.07) % 6.283;
        const f =
          Math.sin(this.time * 11.3 + p) * 0.5 + Math.sin(this.time * 4.1 + p * 2.3) * 0.5;
        i *= 1 - l.flicker * (0.5 + 0.5 * f);
      }
      if (i <= 0.001) continue;
      const sx = (l.x - cx) / LIGHT_DIV;
      const sy = (l.y - cy) / LIGHT_DIV;
      const r = l.r / LIGHT_DIV;
      if (sx + r < 0 || sy + r < 0 || sx - r > lw || sy - r > lh) continue;
      const [cr, cg, cb] = rgb(l.color);
      const a = i / LIGHT_GAIN;
      const grad = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      grad.addColorStop(0.55, `rgba(${cr},${cg},${cb},${a * 0.45})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(sx, sy, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    this.lightTex.needsUpdate = true;
  }

  render(dt: number, opts: { reduceFlashing: boolean; reduceShake: boolean }): void {
    this.time += dt;

    // shake decays exponentially and is always a whole number of pixels
    let ox = 0;
    let oy = 0;
    if (this.shakeT > 0 && !opts.reduceShake) {
      this.shakeT -= dt;
      const a = this.shakeAmt * Math.max(0, this.shakeT / 0.25);
      ox = Math.round(Math.sin(this.time * 61) * a);
      oy = Math.round(Math.cos(this.time * 47) * a);
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }

    this.camera.position.x = Math.round(this.camX) + ox;
    this.camera.position.y = Math.round(this.camY) + oy;
    this.camera.updateProjectionMatrix();

    // y-sort actors; ties broken by x so the order is stable frame to frame
    this.pending.sort((a, b) => a.sort - b.sort || a.x - b.x);
    this.actorBatch.begin();
    for (const s of this.pending) {
      const t = s.tint ?? [1, 1, 1];
      this.actorBatch.push(
        s.x, s.y, s.w, s.h, s.sx, s.sy, s.sw, s.sh,
        t[0], t[1], t[2], s.alpha ?? 1,
      );
    }
    this.actorBatch.end();
    this.pending.length = 0;

    this.fxBatch.begin();
    for (const s of this.pendingFx) {
      const t = s.tint ?? [1, 1, 1];
      this.fxBatch.push(
        s.x, s.y, s.w, s.h, s.sx, s.sy, s.sw, s.sh,
        t[0], t[1], t[2], s.alpha ?? 1,
      );
    }
    this.fxBatch.end();
    this.pendingFx.length = 0;

    this.paintLightmap(opts.reduceFlashing);
    this.lights.length = 0;

    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  /** Hides the world entirely (menus, character creation on a black field). */
  setWorldVisible(v: boolean): void {
    this.floorLayer.mesh.visible = v;
    this.propLayer.mesh.visible = v;
    this.overLayer.mesh.visible = v;
    this.actorBatch.mesh.visible = v;
    this.fxBatch.mesh.visible = v;
  }

  get info(): { calls: number; triangles: number } {
    const i = this.renderer.info.render;
    return { calls: i.calls, triangles: i.triangles };
  }

  dispose(): void {
    this.floorLayer.dispose();
    this.propLayer.dispose();
    this.overLayer.dispose();
    this.actorBatch.dispose();
    this.fxBatch.dispose();
    this.tileMat.dispose();
    this.spriteMat.dispose();
    this.compositeMat.dispose();
    this.tileTex?.dispose();
    this.spriteTex?.dispose();
    this.lightTex.dispose();
    this.rt.dispose();
    this.renderer.dispose();
  }
}
