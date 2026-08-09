/**
 * Tile sheet review page. Renders every generated tile at 3x with its id, plus
 * a tiling proof (each floor variant repeated in a 5x3 block) so seams and
 * strobing hot pixels are visible rather than theoretical.
 *
 * Served at /tiles.html.
 */

import { getTileAtlas, TILE_PX } from '@/art/tiles';
import { PAL } from '@/art/palette';
import { Painter } from '@/ui/painter';

const SCALE = 3;
const CELL = TILE_PX * SCALE;
const LABEL_H = 10;
const PAD = 4;
const COLS = 10;

function main(): void {
  const atlas = getTileAtlas();
  const ids = atlas.order;

  const rows = Math.ceil(ids.length / COLS);
  const gridW = COLS * (CELL + PAD) + PAD;
  const gridH = rows * (CELL + LABEL_H + PAD) + PAD + 24;

  // tiling proof strip for the field tiles that must not show seams
  const proofIds = ids.filter(
    (id) =>
      id.startsWith('floor.') ||
      id === 'wall.iron.face' ||
      id === 'wall.hab.face' ||
      id === 'wall.spine.face' ||
      id === 'wall.reg.face' ||
      id === 'wall.med.face',
  );
  const PROOF_TILES_X = 5;
  const PROOF_TILES_Y = 3;
  const proofW = PROOF_TILES_X * TILE_PX * 2;
  const proofH = PROOF_TILES_Y * TILE_PX * 2;
  const proofCols = 8;
  const proofRows = Math.ceil(proofIds.length / proofCols);
  const proofBlockH = proofH + LABEL_H + PAD;

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  canvas.width = Math.max(gridW, proofCols * (proofW + PAD) + PAD);
  canvas.height = gridH + proofRows * proofBlockH + 40;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const p = new Painter(g);

  g.fillStyle = PAL.void1;
  g.fillRect(0, 0, canvas.width, canvas.height);

  p.text(`TILE SHEET  ${ids.length} tiles  ${atlas.cols}x${atlas.rows} cells`, PAD, 6, {
    color: PAL.halo3,
  });

  ids.forEach((id, i) => {
    const cx = PAD + (i % COLS) * (CELL + PAD);
    const cy = 24 + Math.floor(i / COLS) * (CELL + LABEL_H + PAD);
    const cell = atlas.index.get(id)!;
    const sx = (cell % atlas.cols) * TILE_PX;
    const sy = Math.floor(cell / atlas.cols) * TILE_PX;
    // checkerboard behind so transparent props are obvious
    for (let yy = 0; yy < CELL; yy += 6)
      for (let xx = 0; xx < CELL; xx += 6) {
        g.fillStyle = ((xx / 6 + yy / 6) | 0) % 2 ? PAL.void2 : PAL.void0;
        g.fillRect(cx + xx, cy + yy, 6, 6);
      }
    g.drawImage(atlas.canvas, sx, sy, TILE_PX, TILE_PX, cx, cy, CELL, CELL);
    const m = atlas.meta.get(id)!;
    const flags =
      (m.solid ? '\x08' : '') + (m.over ? '^' : '') + (m.light ? '\x06' : '') + (m.anim ? '~' : '');
    p.text(id.slice(0, 9), cx, cy + CELL + 1, { color: PAL.bone1 });
    if (flags) p.text(flags, cx + CELL - 12, cy + CELL + 1, { color: PAL.amber2 });
  });

  const proofTop = gridH + 8;
  p.text('TILING PROOF  (5x3 repeat @2x — look for seams and strobing)', PAD, proofTop - 12, {
    color: PAL.halo3,
  });
  proofIds.forEach((id, i) => {
    const bx = PAD + (i % proofCols) * (proofW + PAD);
    const by = proofTop + Math.floor(i / proofCols) * proofBlockH;
    const cell = atlas.index.get(id)!;
    const sx = (cell % atlas.cols) * TILE_PX;
    const sy = Math.floor(cell / atlas.cols) * TILE_PX;
    for (let ty = 0; ty < PROOF_TILES_Y; ty++) {
      for (let tx = 0; tx < PROOF_TILES_X; tx++) {
        g.drawImage(
          atlas.canvas, sx, sy, TILE_PX, TILE_PX,
          bx + tx * TILE_PX * 2, by + ty * TILE_PX * 2, TILE_PX * 2, TILE_PX * 2,
        );
      }
    }
    p.text(id.slice(0, 15), bx, by + proofH + 1, { color: PAL.bone1 });
  });

  (window as unknown as Record<string, unknown>).__tileview = {
    count: ids.length,
    ids,
    missing: [] as string[],
  };
}

main();
