/**
 * Render pipeline smoke test. Not shipped with the game — it exists so the
 * lowest layers (pixel scaling, tile batching, sprite atlas, lightmap
 * compositing, bitmap font) can be proven independently of any gameplay.
 *
 * Served at /smoke.html by the dev server.
 */

import { Painter } from '@/ui/painter';
import { Screen, TILE, VH, VW } from '@/core/screen';
import { WorldRenderer } from '@/render/renderer';
import { SpriteAtlas } from '@/render/atlas';
import { DEFAULT_LOOK, CELL_H, CELL_W, POSE, getActorSheet } from '@/art/actors';
import { PAL } from '@/art/palette';
import { bevel, dither, rect, speckle, surface } from '@/art/pixel';
import { Rng } from '@/core/rng';

// --- placeholder tile atlas (real one is src/art/tiles.ts) -----------------
function placeholderAtlas(): { canvas: HTMLCanvasElement; cols: number } {
  const cols = 4;
  const s = surface(cols * TILE, TILE);
  const rng = new Rng(7);
  // 0: deck plate
  rect(s, 0, 0, TILE, TILE, PAL.iron1);
  bevel(s, 0, 0, TILE, TILE, 'iron', 2);
  speckle(s, 1, 1, 14, 14, PAL.iron0, 0.05, rng);
  // 1: wall face
  rect(s, TILE, 0, TILE, TILE, PAL.iron3);
  rect(s, TILE, 0, TILE, 2, PAL.iron4);
  rect(s, TILE, TILE - 2, TILE, 2, PAL.iron1);
  dither(s, TILE + 2, 4, 12, 8, PAL.iron2, 2);
  // 2: grate
  rect(s, TILE * 2, 0, TILE, TILE, PAL.void2);
  for (let i = 1; i < TILE; i += 3) rect(s, TILE * 2 + 1, i, TILE - 2, 1, PAL.iron2);
  // 3: console (lit)
  bevel(s, TILE * 3, 0, TILE, TILE, 'iron', 2);
  rect(s, TILE * 3 + 3, 3, 10, 7, PAL.void0);
  rect(s, TILE * 3 + 4, 4, 8, 5, PAL.halo1);
  rect(s, TILE * 3 + 4, 4, 8, 1, PAL.halo3);
  return { canvas: s.canvas, cols };
}

function main(): void {
  const frame = document.getElementById('frame') as HTMLElement;
  const worldCanvas = document.getElementById('world') as HTMLCanvasElement;
  const uiCanvas = document.getElementById('ui') as HTMLCanvasElement;
  const screen = new Screen(frame, worldCanvas, uiCanvas);
  const painter = new Painter(screen.uiCtx);
  const renderer = new WorldRenderer(worldCanvas);

  const tiles = placeholderAtlas();
  renderer.setTileAtlas(tiles.canvas);

  const atlas = new SpriteAtlas(512);
  const sheet = getActorSheet(DEFAULT_LOOK);
  const region = atlas.add('player', sheet, sheet.width, sheet.height);
  const medic = getActorSheet({
    ...DEFAULT_LOOK,
    uniform: 'medical',
    hair: 'braids',
    hairColor: PAL.void1,
    skin: 1,
    accent: PAL.brine3,
    accessory: 'glasses',
    frame: 'slight',
  });
  const medicRegion = atlas.add('medic', medic, medic.width, medic.height);
  renderer.setSpriteAtlas(atlas.canvas);

  // --- build a small room ---------------------------------------------
  const MW = 26;
  const MH = 16;
  const floorQuads: Parameters<typeof renderer.floorLayer.build>[0] = [];
  const propQuads: Parameters<typeof renderer.propLayer.build>[0] = [];
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const edge = x === 0 || y === 0 || x === MW - 1 || y === MH - 1;
      const t = edge ? 1 : (x + y) % 7 === 0 ? 2 : 0;
      floorQuads.push({
        x: x * TILE, y: y * TILE, w: TILE, h: TILE,
        sx: t * TILE, sy: 0, sw: TILE, sh: TILE,
      });
    }
  }
  for (const [px, py] of [[4, 3], [9, 3], [14, 3], [19, 3]] as [number, number][]) {
    propQuads.push({
      x: px * TILE, y: py * TILE, w: TILE, h: TILE,
      sx: 3 * TILE, sy: 0, sw: TILE, sh: TILE,
    });
  }
  renderer.floorLayer.build(floorQuads, tiles.canvas.width, tiles.canvas.height);
  renderer.propLayer.build(propQuads, tiles.canvas.width, tiles.canvas.height);
  renderer.overLayer.build([], tiles.canvas.width, tiles.canvas.height);

  const q = new URLSearchParams(location.search);
  renderer.setAmbient('#c6d6cf', Number(q.get('amb') ?? 0.62));
  renderer.setLightSteps(Number(q.get('steps') ?? 8));
  renderer.setScanlines(q.has('nofx') ? 0 : 0.04);
  renderer.setVignette(q.has('nofx') ? 0 : 0.16);
  if (q.has('nolight')) renderer.setLightMix(0);

  let t = 0;
  let last = performance.now();
  const px2 = { x: 8 * TILE, y: 8 * TILE };

  function loop(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    px2.x = 8 * TILE + Math.round(Math.sin(t * 0.7) * 60);
    px2.y = 8 * TILE + Math.round(Math.cos(t * 0.5) * 24);

    const camX = Math.round(px2.x - VW / 2);
    const camY = Math.round(px2.y - VH / 2);
    renderer.setCamera(camX, camY);

    // console lights
    for (const [cx, cy] of [[4, 3], [9, 3], [14, 3], [19, 3]] as [number, number][]) {
      renderer.addLight({
        x: cx * TILE + 8, y: cy * TILE + 8, r: 46, color: PAL.halo3, i: 0.55,
      });
    }
    renderer.addLight({ x: px2.x + 8, y: px2.y + 8, r: 70, color: PAL.amber3, i: 0.5 });
    renderer.addLight({
      x: 22 * TILE, y: 12 * TILE, r: 60, color: PAL.ember3, i: 0.7, flicker: 0.6,
    });

    const walkCol = [POSE.stand, POSE.stepA, POSE.stand, POSE.stepB][Math.floor(t * 7) % 4];
    renderer.drawSprite({
      x: px2.x - camX - CELL_W / 2 + 8, y: px2.y - camY - CELL_H + 8,
      w: CELL_W, h: CELL_H,
      sx: region.x + walkCol * CELL_W, sy: region.y + 0 * CELL_H,
      sw: CELL_W, sh: CELL_H, sort: px2.y,
    });
    renderer.drawSprite({
      x: 12 * TILE - camX, y: 9 * TILE - camY - 8,
      w: CELL_W, h: CELL_H,
      sx: medicRegion.x, sy: medicRegion.y + 2 * CELL_H,
      sw: CELL_W, sh: CELL_H, sort: 9 * TILE,
    });

    renderer.render(dt, { reduceFlashing: false, reduceShake: false });

    // --- UI layer ------------------------------------------------------
    painter.clear();
    painter.panel(6, 6, 150, 46, 'terminal');
    painter.text('CANDLEWAKE', 12, 11, { color: PAL.halo3, scale: 1 });
    painter.text('render smoke test', 12, 21, { color: PAL.bone1 });
    painter.text(`fps ${(1 / dt).toFixed(0)}  calls ${renderer.info.calls}`, 12, 31, {
      color: PAL.iron5,
    });
    painter.text('\x05 the quick brown fox 0123', 12, 41, { color: PAL.amber2 });

    painter.panel(VW - 134, 6, 128, 58, 'plate');
    painter.text('GLYPH CHECK', VW - 128, 11, { color: PAL.bone2 });
    painter.text('ABCDEFGHIJKLMNOPQRSTU', VW - 128, 21, { color: PAL.bone3 });
    painter.text('abcdefghijklmnopqrstu', VW - 128, 30, { color: PAL.bone3 });
    painter.text('0123456789 .,:;!?-()', VW - 128, 39, { color: PAL.bone3 });
    painter.text('\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C', VW - 128, 48, {
      color: PAL.halo3,
    });

    painter.panel(6, VH - 56, VW - 12, 50, 'dialogue');
    painter.textBlock(
      'The trim solution does not match the manifest. Four thousand four ' +
        'hundred and ten tonnes declared. Six thousand one hundred and twenty ' +
        'in the water.',
      12, VH - 48, VW - 24, { color: PAL.bone3, shadow: PAL.void0 },
    );
    painter.meter(12, VH - 14, 80, 4, 0.62);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // expose for the capture harness
  (window as unknown as Record<string, unknown>).__smoke = { renderer, screen };
}

main();
