/**
 * Character sprite review page. Every facing and pose for the whole cast at 4x,
 * plus a 1x strip so silhouettes can be judged at the size they actually appear
 * in game, and a walk-cycle filmstrip.
 *
 * Served at /actors.html.
 */

import { CELL_H, CELL_W, FACINGS, FACING_ROW, POSE, WALK_SEQUENCE, getActorSheet, getPortrait, ActorLook } from '@/art/actors';
import { NPCS } from '@/data/npcs';
import { BACKGROUNDS } from '@/data/content';
import { PAL } from '@/art/palette';
import { Painter } from '@/ui/painter';

const S = Number(new URLSearchParams(location.search).get('s') ?? 4);

function main(): void {
  const cast: { name: string; look: ActorLook }[] = [
    ...BACKGROUNDS.map((b) => ({
      name: b.name,
      look: {
        frame: 'average' as const,
        skin: 3,
        hair: 'crop' as const,
        hairColor: PAL.rust1,
        eyeColor: PAL.brine3,
        uniform: b.uniform,
        accent: b.accent,
        accessory: 'none' as const,
      },
    })),
    ...Object.values(NPCS).map((n) => ({ name: n.name, look: n.look })),
  ];

  const limit = Number(new URLSearchParams(location.search).get('n') ?? 0);
  if (limit > 0) cast.length = Math.min(cast.length, limit);
  const poseNames = ['stand', 'stepA', 'stepB', 'act', 'hurt', 'down'];
  const rowH = CELL_H * S + 18;
  const blockH = rowH * 4 + 22;

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  canvas.width = 40 + CELL_W * S * 6 + 220;
  canvas.height = 30 + cast.length * blockH;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const p = new Painter(g);

  g.fillStyle = PAL.void1;
  g.fillRect(0, 0, canvas.width, canvas.height);
  p.text('CHARACTER SPRITES  4x  |  facings x poses  |  1x strip + walk cycle at right', 8, 8, {
    color: PAL.halo3,
  });

  cast.forEach((c, ci) => {
    const sheet = getActorSheet(c.look);
    const top = 24 + ci * blockH;
    p.rect(0, top - 6, canvas.width, 1, PAL.iron1);
    p.text(c.name, 8, top - 2, { color: PAL.amber3 });

    // pose labels
    poseNames.forEach((pn, i) => {
      p.text(pn, 40 + i * CELL_W * S, top + 8, { color: PAL.iron5 });
    });

    FACINGS.forEach((f, fi) => {
      const y = top + 18 + fi * rowH;
      p.text(f, 6, y + CELL_H * S / 2, { color: PAL.bone1 });
      for (let col = 0; col < 6; col++) {
        const x = 40 + col * CELL_W * S;
        // checkerboard so the silhouette and any stray pixels are obvious
        for (let yy = 0; yy < CELL_H * S; yy += 8)
          for (let xx = 0; xx < CELL_W * S; xx += 8) {
            g.fillStyle = ((xx / 8 + yy / 8) | 0) % 2 ? PAL.void2 : PAL.void0;
            g.fillRect(x + xx, y + yy, 8, 8);
          }
        g.drawImage(
          sheet,
          col * CELL_W, FACING_ROW[f] * CELL_H, CELL_W, CELL_H,
          x, y, CELL_W * S, CELL_H * S,
        );
      }
    });

    // 1x strip — the size the player actually sees
    const rx = 40 + CELL_W * S * 6 + 12;
    p.text('1x', rx, top + 8, { color: PAL.iron5 });
    FACINGS.forEach((f, fi) => {
      for (let col = 0; col < 3; col++) {
        g.drawImage(
          sheet, col * CELL_W, FACING_ROW[f] * CELL_H, CELL_W, CELL_H,
          rx + col * (CELL_W + 2), top + 18 + fi * 26, CELL_W, CELL_H,
        );
        // and at 2x beneath, the common in-game perceived size on a big display
        g.drawImage(
          sheet, col * CELL_W, FACING_ROW[f] * CELL_H, CELL_W, CELL_H,
          rx + 60 + col * (CELL_W * 2 + 2), top + 18 + fi * 26, CELL_W * 2, CELL_H * 2,
        );
      }
    });

    // walk filmstrip (down facing, real sequence)
    const wx = rx + 140;
    p.text('walk', wx, top + 8, { color: PAL.iron5 });
    WALK_SEQUENCE.forEach((col, i) => {
      g.drawImage(
        sheet, col * CELL_W, FACING_ROW.down * CELL_H, CELL_W, CELL_H,
        wx, top + 18 + i * (CELL_H + 2), CELL_W * 2, CELL_H * 2,
      );
    });

    // portrait
    const port = getPortrait(c.look, 'neutral');
    g.drawImage(port, wx + 40, top + 18, 40 * 2, 48 * 2);
    void POSE;
  });

  (window as unknown as Record<string, unknown>).__actorview = { count: cast.length };
}

main();
