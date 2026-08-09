/**
 * The projection field a Revenant fight happens inside.
 *
 * Nothing here is a photographic backdrop. A revenant is a field-body cast off
 * a wrist loom, so the space it stands in is the loom's own working volume:
 * a lattice the caster lays down over whatever deck the crew happen to be
 * standing on, bright where it is holding and thin where it is not. The real
 * compartment is still there, but the projection washes it out to silhouettes.
 *
 * Two rules keep it from competing with the combatants:
 *
 *  - Everything is drawn in the two darkest steps of a single family, so the
 *    only saturated colour on screen belongs to a body or a readout.
 *  - The lattice is densest at the two caster plates and thins toward the
 *    edges, which puts the brightest ground exactly under the figures.
 *
 * The arena is drawn from a seed so a given encounter always looks the same
 * \x7f the player should recognise the Loom hall when they are dragged back
 * into it, and a field that reshuffles every frame reads as noise.
 */

import { PAL, mix } from '@/art/palette';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';

/** Where the lattice converges. Also the line the far combatant stands on. */
const HORIZON = 96;

/**
 * Where the two revenants stand. This is the ONE source of truth: battle.ts
 * draws the bodies from it and the arena puts the caster plates under them.
 *
 * They were separate numbers to begin with and the plates promptly drifted a
 * dozen pixels off the feet, which read as two glowing puddles the fighters
 * happened to be standing near.
 */
export const STANCE = {
  /** Body draw origin. The figure is BODY_H tall and its feet are at y + 44. */
  foe: { x: 150, y: 40 },
  me: { x: 284, y: 92 },
} as const;
export const BODY_H = 46;
const FEET = BODY_H - 2;

/** x centre, y at the feet, radius. */
const PLATES: [number, number, number][] = [
  [STANCE.foe.x, STANCE.foe.y + FEET, 30],
  [STANCE.me.x, STANCE.me.y + FEET, 34],
];

export interface ArenaLook {
  /** Bled in from the room the fight started in, so the Loom is not the Ward. */
  tint: string;
  /** 0 = a quiet corridor scuffle, 1 = the payoff room. */
  weight: number;
  seed: number;
}

export const DEFAULT_ARENA: ArenaLook = { tint: PAL.brine1, weight: 0.5, seed: 1 };

/** Deterministic, cheap, and good enough for placing silhouettes. */
function hash(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15;
  x = (x * 2246822519) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

/**
 * How strongly the lattice is holding at a point. Peaks at the caster plates
 * and falls off with distance, which is what puts light under the feet of the
 * things the player is actually looking at.
 */
function hold(x: number, y: number): number {
  let h = 0;
  for (const [px, py, r] of PLATES) {
    const dx = (x - px) / r;
    const dy = (y - py) / (r * 0.42); // the field is flatter than it is wide
    h = Math.max(h, 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy)));
  }
  return h;
}

export function drawArena(p: Painter, look: ArenaLook, t: number): void {
  const deep = PAL.void0;
  const tint = look.tint;
  p.rect(0, 0, VW, VH, deep);

  // --- the compartment behind the field --------------------------------
  // Silhouettes only, in a value barely above the ground. This is the Alien
  // half of the room: pipework and gantries that were already there.
  const wall = mix(deep, PAL.iron1, 0.55);
  const wallLit = mix(deep, tint, 0.3);
  p.rect(0, HORIZON - 42, VW, 42, mix(deep, PAL.void2, 0.5));
  for (let i = 0; i < 11; i++) {
    const r = hash(look.seed * 131 + i);
    const x = Math.floor(r * (VW + 40)) - 20;
    const w = 6 + Math.floor(hash(look.seed + i * 7) * 16);
    const h = 10 + Math.floor(hash(look.seed + i * 13) * 30);
    p.rect(x, HORIZON - h, w, h, wall);
    p.rect(x, HORIZON - h, 1, h, wallLit); // one lit edge, always the same side
  }
  // A conduit run across the upper wall. Straight, continuous, and boring on
  // purpose: it is the one horizontal that says "this is a ship, not a void".
  p.rect(0, HORIZON - 50, VW, 3, wall);
  p.rect(0, HORIZON - 50, VW, 1, wallLit);
  for (let x = 6; x < VW; x += 37) p.rect(x, HORIZON - 52, 3, 7, mix(deep, PAL.iron1, 0.8));

  // --- the lattice ------------------------------------------------------
  // Rows converge toward the horizon. Spacing grows with distance from it,
  // which is the whole trick that makes a flat grid read as a floor.
  const rows: number[] = [];
  for (let i = 1; rows.length < 26; i++) {
    const y = HORIZON + i * i * 0.42;
    if (y > VH) break;
    rows.push(Math.round(y));
  }
  for (const y of rows) {
    const depth = (y - HORIZON) / (VH - HORIZON);
    for (let x = 0; x < VW; x += 2) {
      const h = hold(x, y);
      // The floor has to be legible as a floor before the plates make it
      // interesting. The first pass weighted the falloff so hard that the
      // lattice away from the casters vanished and the fighters read as
      // standing in unlit space.
      const a = (0.24 + h * 0.7) * (0.5 + depth * 0.5) * (0.6 + look.weight * 0.4);
      if (a < 0.06) continue;
      p.rect(x, y, 2, 1, mix(deep, tint, Math.min(0.85, a)));
    }
  }
  // Verticals fan out from the convergence point, so they agree with the rows.
  const vanish = VW / 2;
  for (let i = -9; i <= 9; i++) {
    const spread = i * 26;
    for (const y of rows) {
      const depth = (y - HORIZON) / (VH - HORIZON);
      const x = Math.round(vanish + spread * depth);
      if (x < 0 || x >= VW) continue;
      const a = (0.18 + hold(x, y) * 0.5) * (0.4 + depth * 0.6);
      if (a < 0.06) continue;
      p.rect(x, y, 1, 2, mix(deep, tint, Math.min(0.8, a)));
    }
  }

  // --- caster plates ----------------------------------------------------
  // The rings the loom actually strikes. They breathe, slightly and out of
  // phase, because two casters are never quite in step.
  PLATES.forEach(([cx, cy, r], i) => {
    const pulse = 0.82 + 0.18 * Math.sin(t * 1.6 + i * 2.1);
    for (let ring = 0; ring < 3; ring++) {
      const rr = Math.round(r * pulse) - ring * 5;
      if (rr < 4) continue;
      const a = (0.5 - ring * 0.14) * (0.6 + look.weight * 0.4);
      // A wide, flat ellipse, plotted as spans so it stays one shape at 1x.
      for (let dy = -Math.round(rr * 0.42); dy <= Math.round(rr * 0.42); dy++) {
        const k = 1 - (dy / (rr * 0.42)) ** 2;
        if (k <= 0) continue;
        const w = Math.round(rr * Math.sqrt(k));
        const y = cy + dy;
        if (y < HORIZON - 8 || y >= VH) continue;
        p.rect(cx - w, y, 1, 1, mix(deep, tint, a));
        p.rect(cx + w - 1, y, 1, 1, mix(deep, tint, a));
      }
    }
  });

  // --- horizon ----------------------------------------------------------
  // The seam where the field meets the deck it was laid on. Brightest thing
  // in the backdrop, and the only unbroken line.
  p.rect(0, HORIZON, VW, 1, mix(deep, tint, 0.55));
  p.rect(0, HORIZON - 1, VW, 1, mix(deep, tint, 0.22));

  // --- scan -------------------------------------------------------------
  // The 2001 half: one slow, clean sweep down the volume. It is the only
  // moving thing when nobody is acting, and it makes the field feel powered
  // rather than painted.
  const scanY = HORIZON + ((t * 22) % (VH - HORIZON));
  p.alpha(0.16, () => {
    p.rect(0, Math.floor(scanY), VW, 1, tint);
    p.rect(0, Math.floor(scanY) + 1, VW, 1, mix(deep, tint, 0.5));
  });
}
