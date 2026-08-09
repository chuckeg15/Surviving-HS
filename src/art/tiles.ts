/**
 * CANDLEWAKE tile atlas.
 *
 * Every environment pixel in the game is generated here, once, into a single
 * canvas that the world renderer uploads as a texture. Nothing in this file
 * invents a colour (see `@/art/palette`) or a drawing operation (see
 * `@/art/pixel`); local helpers below are compositions of those primitives.
 *
 * ART DIRECTION SUMMARY (the rules this file is trying to obey)
 *
 *  Value structure. Floors live in the dark-mid band (iron1 / rust1 / brine1 /
 *  moss1 / void2). Wall faces are one to two ramp steps LIGHTER than the floor
 *  they meet, so a room reads as a lit box rather than a soup. Props separate
 *  from their deck by hue AND value, and carry a void1 keyline plus a contact
 *  shadow so nothing floats.
 *
 *  Department identity. Each family owns a ramp: habitation = rust, commons =
 *  iron warmed with rust, medical = bone + brine, registry = brine, spine =
 *  iron over void (the darkest family), hydroponics = moss, engineering props =
 *  rust + amber. Plain iron/plate is the neutral connective tissue.
 *
 *  Accent scarcity. halo (cyan) appears ONLY on live lattice: console screens,
 *  terminals, the muster board readout and the tessera crate. bruise (violet)
 *  appears ONLY on prop.cradle — the memory-smoothing cradle — and on the
 *  debug grid, which never ships in a room.
 *
 *  Seamless tiling. Field tiles carry their structure on the top and left edge
 *  only, so butting two together produces exactly one seam and never a doubled
 *  line. Variants (.a/.b/.c) keep the STRUCTURE identical and vary only the
 *  wear detail, which is what lets the map interleave them without the pattern
 *  breaking. Anything periodic uses a period that divides 16.
 *
 *  Perspective. Floors are pure top-down. Walls are drawn as three stacked
 *  slices (cap / face / base) and show their vertical face. Props show their
 *  top surface plus a two-pixel sliver of front. No tile mixes those.
 *
 * DELIBERATE DEVIATION — `tall`. TileMeta keeps the `tall` flag for the engine,
 * but no tile in this file sets it. Every cell is exactly 16x16 and tall
 * objects (lockers, crate stacks, the cradle, plants, medbeds, bunks) are drawn
 * to read as a single top-down-ish object inside one cell. Introducing 16x32
 * cells would break the packing contract with the renderer, which insets UVs by
 * half a texel on a uniform grid.
 */

import { PAL, mix } from '@/art/palette';
import { Rng } from '@/core/rng';
import {
  Surface,
  bevel,
  box,
  clearAll,
  dither,
  hline,
  inset,
  outline,
  px,
  rect,
  scuff,
  speckle,
  stamp,
  surface,
  vline,
} from '@/art/pixel';

export const TILE_PX = 16;
export const ATLAS_COLS = 16;

export type StepSound = 'metal' | 'grate' | 'carpet' | 'tile' | 'soil';

export interface TileMeta {
  solid?: boolean; // blocks movement
  over?: boolean; // drawn ABOVE actors (upper wall faces, ceiling pipes)
  step?: StepSound; // footstep sound when walked on
  light?: { r: number; color: string; i: number; flicker?: number }; // r in pixels, color is a PAL hex, i is 0..1
  anim?: { frames: string[]; fps: number }; // ids of the other frames, this tile is frame 0
  tall?: boolean; // occupies the tile above visually (prop rendered 16x32)
}

export interface TileAtlas {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
  index: Map<string, number>; // tile id -> cell index (row * cols + col)
  meta: Map<string, TileMeta>;
  order: string[]; // insertion order, index order
}

type Draw = (s: Surface) => void;

interface TileDef {
  id: string;
  draw: Draw;
  meta?: TileMeta;
}

// =====================================================================
// LOCAL HELPERS — compositions of the pixel.ts primitives only
// =====================================================================

/** A domed bolt: one lit pixel over one shadowed pixel. Punctuation, not texture. */
function bolt(s: Surface, x: number, y: number, hi: string, lo: string): void {
  px(s, x, y, hi);
  px(s, x, y + 1, lo);
}

/**
 * Diagonal hazard paint. Uses absolute tile coordinates for the stripe phase so
 * two hazard tiles side by side continue the same chevron.
 */
function hazardPaint(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  stripe: string,
  gap: string,
  edge: string,
): void {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const d = (x + xx + y + yy) & 7;
      px(s, x + xx, y + yy, d < 4 ? stripe : gap);
      if (d === 0) px(s, x + xx, y + yy, edge);
    }
  }
}

/** 1px dark keyline around a prop so it never dissolves into the deck. */
function keyline(s: Surface): void {
  outline(s, PAL.void1);
}

/** Contact shadow: props sit on the deck, they do not hover over it. */
function contact(s: Surface, x: number, w: number, y: number): void {
  dither(s, x, y, w, 1, PAL.void0, 3);
  if (y + 1 < 16) dither(s, x + 1, y + 1, Math.max(0, w - 2), 1, PAL.void0, 1);
}

/**
 * A live lattice display. This is the ONLY function permitted to emit halo
 * (cyan). If you are tempted to call it from something that is not a screen,
 * the answer is no — cyan has to keep meaning "this is live data".
 */
function latticeScreen(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string,
  bright: boolean,
): void {
  const rng = new Rng(seed);
  rect(s, x, y, w, h, PAL.halo0);
  dither(s, x, y, w, h, PAL.halo1, 2);
  for (let i = 0; i < h; i += 2) {
    const len = 1 + rng.int(w - 1);
    hline(s, x, y + i, len, bright ? PAL.halo3 : PAL.halo2);
  }
  px(s, x + w - 1, y + h - 1, bright ? PAL.halo4 : PAL.halo3);
}

/** Pipe run drawn along X: shadow / body / specular / shadow, four rows tall. */
function pipeH(s: Surface, x: number, y: number, w: number, dark: string, body: string, hi: string): void {
  hline(s, x, y, w, dark);
  hline(s, x, y + 1, w, hi);
  hline(s, x, y + 2, w, body);
  hline(s, x, y + 3, w, dark);
}

/** Pipe run drawn along Y. */
function pipeV(s: Surface, x: number, y: number, h: number, dark: string, body: string, hi: string): void {
  vline(s, x, y, h, dark);
  vline(s, x + 1, y, h, hi);
  vline(s, x + 2, y, h, body);
  vline(s, x + 3, y, h, dark);
}

// =====================================================================
// FLOORS
// =====================================================================

/**
 * The shared deck-plate substrate. One plate per tile: seam on the top and left
 * edge, a lit lip just inside it, and a broken shade line on the far side. The
 * shade is dithered rather than solid so a 6x6 field reads as plating and not
 * as a chequerboard.
 */
/**
 * Deck plating.
 *
 * The seam is the single most-repeated mark in the game: it is on every deck
 * tile of every room. Softening its contrast was not enough on its own — while
 * every variant carried a seam on its top AND left edge, every tile in the ship
 * was outlined, and a wide room came out as graph paper at 5x however gentle
 * the line was.
 *
 * Plating is laid in panels, not in squares. Each variant now carries the seam
 * on a different pair of edges, so neighbouring tiles merge into runs of two
 * and three and the grid stops being uniform. The variants are chosen per tile
 * from the room's floor list, so the panel joins fall irregularly without any
 * room having to author them.
 */
function plateGround(s: Surface, edges: 'both' | 'top' | 'left' | 'none' = 'both'): void {
  const seam = mix(PAL.iron0, PAL.iron1, 0.5);
  const lip = mix(PAL.iron1, PAL.iron2, 0.6);
  rect(s, 0, 0, 16, 16, PAL.iron1);
  if (edges === 'both' || edges === 'top') {
    hline(s, 0, 0, 16, seam);
    dither(s, 1, 1, 15, 1, lip, 3);
    dither(s, 1, 15, 15, 1, seam, 2);
  }
  if (edges === 'both' || edges === 'left') {
    vline(s, 0, 1, 15, seam);
    dither(s, 1, 2, 1, 14, lip, 3);
    dither(s, 15, 1, 1, 14, seam, 2);
  }
}

function drawPlateA(s: Surface): void {
  plateGround(s);
  const rng = new Rng('floor.plate.a');
  scuff(s, 3, 5, 9, 7, PAL.iron2, 4, rng);
  speckle(s, 3, 4, 10, 9, PAL.iron0, 0.03, rng);
}

function drawPlateB(s: Surface): void {
  plateGround(s, 'left');
  // A weld bead: alternating pixels read as a bead, the broken line under it
  // as the heat shadow. Same average value as .a, different placement.
  for (let x = 4; x < 13; x++) px(s, x, 9, x % 2 ? PAL.iron2 : PAL.iron0);
  dither(s, 4, 10, 9, 1, PAL.iron0, 2);
  const rng = new Rng('floor.plate.b');
  speckle(s, 3, 3, 10, 5, PAL.iron0, 0.03, rng);
}

function drawPlateC(s: Surface): void {
  plateGround(s, 'top');
  // Stencilled registration mark, mostly walked off.
  hline(s, 9, 5, 4, PAL.iron2);
  vline(s, 9, 5, 4, PAL.iron2);
  dither(s, 9, 5, 4, 4, PAL.iron1, 2);
  const rng = new Rng('floor.plate.c');
  scuff(s, 3, 9, 8, 5, PAL.iron2, 3, rng);
}

function drawPlateWorn(s: Surface): void {
  plateGround(s, 'none');
  const rng = new Rng('floor.plate.worn');
  // Equal parts ground-in grime and polished-through metal, so the mean value
  // stays with the other plate variants instead of going blotchy.
  dither(s, 4, 4, 8, 8, PAL.iron0, 1);
  speckle(s, 2, 2, 12, 12, PAL.iron0, 0.06, rng);
  scuff(s, 2, 3, 12, 11, PAL.iron2, 7, rng);
}

function drawRivetPlate(s: Surface): void {
  plateGround(s);
  // Structural plate: the seam is solid on all four sides and the corners are
  // bolted. This is the punctuation tile — the field plates stay calm.
  hline(s, 1, 15, 15, PAL.iron0);
  vline(s, 15, 1, 14, PAL.iron0);
  bolt(s, 3, 3, PAL.iron3, PAL.iron0);
  bolt(s, 12, 3, PAL.iron3, PAL.iron0);
  bolt(s, 3, 12, PAL.iron3, PAL.iron0);
  bolt(s, 12, 12, PAL.iron3, PAL.iron0);
}

/** Walkway grating: 2px bearing bars over a void, cross rods every 8. */
function grateGround(s: Surface): void {
  // The void under a grating is dark but not black — the player has to be able
  // to tell a walkway from a hole in the deck.
  rect(s, 0, 0, 16, 16, PAL.void3);
  dither(s, 0, 0, 16, 16, PAL.void1, 2);
  for (let x = 0; x < 16; x += 4) {
    vline(s, x, 0, 16, PAL.iron2);
    vline(s, x + 1, 0, 16, PAL.iron1);
  }
  for (let y = 3; y < 16; y += 8) {
    hline(s, 0, y, 16, PAL.iron2);
    hline(s, 0, y + 1, 16, PAL.iron0);
  }
}

function drawGrateA(s: Surface): void {
  grateGround(s);
  const rng = new Rng('floor.grate.a');
  speckle(s, 0, 0, 16, 16, PAL.iron0, 0.03, rng);
}

function drawGrateB(s: Surface): void {
  grateGround(s);
  const rng = new Rng('floor.grate.b');
  // Same lattice, different wear: a chewed bar and a little dust in the gaps.
  vline(s, 8, 5, 6, PAL.iron0);
  speckle(s, 0, 0, 16, 16, PAL.iron1, 0.04, rng);
}

/** Spine mesh: a diamond lattice over the void. Period 4, so it always tiles. */
function meshGround(s: Surface): void {
  // The spine is the darkest family in the game, but "darkest" still has to be
  // walkable — the lattice itself carries enough value to navigate by.
  rect(s, 0, 0, 16, 16, PAL.iron0);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const a = (x + y) & 3;
      const b = (x - y + 16) & 3;
      if (a === 0 || b === 0) px(s, x, y, PAL.iron2);
      if (a === 0 && b === 0) px(s, x, y, PAL.iron3);
    }
  }
}

function drawMeshA(s: Surface): void {
  meshGround(s);
  const rng = new Rng('floor.mesh.a');
  speckle(s, 0, 0, 16, 16, PAL.void1, 0.04, rng);
}

function drawMeshB(s: Surface): void {
  meshGround(s);
  const rng = new Rng('floor.mesh.b');
  // A patch where the mesh has been walked flat, plus a little corrosion.
  dither(s, 4, 6, 8, 6, PAL.void1, 2);
  speckle(s, 2, 2, 12, 12, PAL.rust1, 0.02, rng);
}

/** Habitation carpet: a 50% weave with a soft pile band every 8 rows. */
function carpetGround(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.rust1);
  dither(s, 0, 0, 16, 16, PAL.rust0, 2);
  dither(s, 0, 0, 16, 2, PAL.rust2, 1);
  dither(s, 0, 8, 16, 2, PAL.rust2, 1);
}

function drawCarpetA(s: Surface): void {
  carpetGround(s);
  const rng = new Rng('floor.carpet.a');
  speckle(s, 2, 3, 12, 11, PAL.rust0, 0.03, rng);
}

function drawCarpetB(s: Surface): void {
  carpetGround(s);
  const rng = new Rng('floor.carpet.b');
  speckle(s, 1, 2, 13, 12, PAL.rust2, 0.03, rng);
  speckle(s, 3, 4, 10, 9, PAL.rust0, 0.02, rng);
}

function drawCarpetWorn(s: Surface): void {
  carpetGround(s);
  const rng = new Rng('floor.carpet.worn');
  // Worn carpet loses its weave before it loses its colour: flatten the
  // stipple rather than darkening, so the value still matches .a and .b.
  dither(s, 0, 0, 16, 16, PAL.rust1, 3);
  speckle(s, 0, 0, 16, 16, PAL.rust0, 0.05, rng);
  scuff(s, 2, 2, 12, 12, PAL.rust2, 4, rng);
}

/** Medical: 8x8 sheet vinyl, cold and high-value. Grout is iron, not brine —
 *  brine at this size reads as a hole rather than a joint. */
function medGround(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.bone0);
  dither(s, 0, 0, 16, 16, PAL.iron4, 1);
  hline(s, 0, 0, 16, PAL.iron3);
  vline(s, 0, 1, 15, PAL.iron3);
  dither(s, 0, 8, 16, 1, PAL.iron3, 3);
  dither(s, 8, 0, 1, 16, PAL.iron3, 3);
}

function drawMedA(s: Surface): void {
  medGround(s);
  // Polish: the light sits in the same corner of every sheet.
  dither(s, 2, 2, 4, 3, PAL.bone2, 1);
  dither(s, 10, 10, 4, 3, PAL.bone2, 1);
}

function drawMedB(s: Surface): void {
  medGround(s);
  dither(s, 10, 2, 4, 3, PAL.bone2, 1);
  dither(s, 2, 10, 4, 3, PAL.bone2, 1);
  // Hairline crack — the one thing in Medical that is not perfect.
  px(s, 5, 5, PAL.iron3);
  px(s, 6, 6, PAL.iron3);
  px(s, 6, 7, PAL.iron3);
}

function drawMedDrain(s: Surface): void {
  medGround(s);
  inset(s, 5, 5, 6, 6, 'iron', 2);
  rect(s, 6, 6, 4, 4, PAL.void2);
  hline(s, 6, 7, 4, PAL.iron1);
  hline(s, 6, 9, 4, PAL.iron1);
  px(s, 5, 5, PAL.bone2);
  px(s, 10, 10, PAL.iron0);
}

/** Hydroponics soil: moss over moss, furrowed every 8 rows. */
function soilGround(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.moss1);
  dither(s, 0, 0, 16, 16, PAL.moss0, 2);
  dither(s, 0, 3, 16, 1, PAL.moss0, 3);
  dither(s, 0, 11, 16, 1, PAL.moss0, 3);
  dither(s, 0, 4, 16, 1, PAL.moss2, 1);
  dither(s, 0, 12, 16, 1, PAL.moss2, 1);
}

function drawSoilA(s: Surface): void {
  soilGround(s);
  const rng = new Rng('floor.soil.a');
  speckle(s, 0, 0, 16, 16, PAL.moss2, 0.05, rng);
  speckle(s, 0, 0, 16, 16, PAL.moss0, 0.05, rng);
  speckle(s, 2, 2, 12, 12, PAL.rust1, 0.02, rng);
}

function drawSoilB(s: Surface): void {
  soilGround(s);
  const rng = new Rng('floor.soil.b');
  speckle(s, 0, 0, 16, 16, PAL.moss2, 0.05, rng);
  speckle(s, 0, 0, 16, 16, PAL.moss0, 0.05, rng);
  // A grit stone turned up by the tilling.
  px(s, 10, 6, PAL.iron2);
  px(s, 11, 6, PAL.iron1);
  px(s, 10, 7, PAL.iron1);
}

function drawHazard(s: Surface): void {
  hazardPaint(s, 0, 0, 16, 16, PAL.amber1, PAL.iron0, PAL.amber2);
  // The paint is ON the deck, so the plate seam still shows through it.
  dither(s, 0, 0, 16, 1, PAL.iron0, 2);
  dither(s, 0, 0, 1, 16, PAL.iron0, 2);
  const rng = new Rng('floor.hazard');
  scuff(s, 1, 2, 14, 12, PAL.iron1, 8, rng);
  speckle(s, 1, 1, 14, 14, PAL.amber0, 0.04, rng);
}

/**
 * Commons decking: composite panel, warmer than plate. The grain alternates by
 * 8x8 quadrant; .a and .b carry opposite phases so laying them in a chequer
 * produces a proper parquet with no change in average value.
 */
function commonsGround(s: Surface, swapPhase: boolean): void {
  // A full-tile speckle was flattening this into noise. The decking needs its
  // plank structure to read; the grime is a light pass on top, not the base.
  rect(s, 0, 0, 16, 16, PAL.iron1);
  for (let by = 0; by < 16; by += 8) {
    for (let bx = 0; bx < 16; bx += 8) {
      const horiz = ((bx === 0 ? 0 : 1) ^ (by === 0 ? 0 : 1)) === (swapPhase ? 1 : 0);
      if (horiz) {
        dither(s, bx + 1, by + 2, 6, 1, PAL.iron2, 2);
        dither(s, bx + 1, by + 5, 6, 1, PAL.iron2, 2);
      } else {
        dither(s, bx + 2, by + 1, 1, 6, PAL.iron2, 2);
        dither(s, bx + 5, by + 1, 1, 6, PAL.iron2, 2);
      }
    }
  }
  // Seams only, and softly. An earlier version drew a hard tile border AND a
  // mid-tile cross, which stacked into two visible grids the moment the floor
  // covered more than a few tiles.
  dither(s, 0, 0, 16, 1, PAL.rust1, 3);
  dither(s, 0, 1, 1, 15, PAL.rust1, 3);
  dither(s, 1, 1, 15, 1, PAL.iron2, 2);
}

function drawCommonsA(s: Surface): void {
  commonsGround(s, false);
  const rng = new Rng('floor.commons.a');
  scuff(s, 2, 3, 12, 11, PAL.iron2, 3, rng);
}

function drawCommonsB(s: Surface): void {
  commonsGround(s, true);
  const rng = new Rng('floor.commons.b');
  speckle(s, 2, 2, 12, 12, PAL.rust0, 0.03, rng);
}

/** Registry: cold, precise, gridded. Nothing here is worn — that is the point. */
function registryGround(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.brine1);
  dither(s, 0, 0, 16, 16, PAL.brine0, 1);
  hline(s, 0, 0, 16, PAL.brine2);
  vline(s, 0, 1, 15, PAL.brine2);
  dither(s, 0, 8, 16, 1, PAL.brine2, 3);
  dither(s, 8, 0, 1, 16, PAL.brine2, 3);
}

function drawRegistryA(s: Surface): void {
  registryGround(s);
  // An access cover set flush into one cell of the grid.
  inset(s, 3, 11, 4, 4, 'brine', 1);
  px(s, 4, 12, PAL.brine2);
}

function drawRegistryB(s: Surface): void {
  registryGround(s);
  // A scribed alignment line — surveyed, not scuffed.
  for (let i = 0; i < 5; i++) px(s, 10 + i, 3 + i, PAL.brine2);
  px(s, 10, 11, PAL.brine2);
  px(s, 12, 11, PAL.brine2);
}

// =====================================================================
// WALLS
//
// A wall is three stacked tiles: cap (the top surface seen in the camera's
// slight forward tilt, ending in a lit lip), face (the vertical face), base
// (skirting plus the shadow it throws onto the deck).
//
// `over` reasoning: cap and face are marked over:true so an actor standing on
// the far side of a wall is occluded by it and a tall sprite standing in FRONT
// of a wall can push its head into the face without popping in front of the
// lip. The base slice is deliberately NOT over — an actor standing on the deck
// immediately below a wall must draw on top of the skirting and its shadow, or
// they read as being embedded in the wall. That is exactly what the third slice
// exists for.
// =====================================================================

function ironCap(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron3);
  hline(s, 0, 0, 16, PAL.iron1); // far edge falls into shadow
  hline(s, 0, 1, 16, PAL.iron2);
  dither(s, 0, 5, 16, 1, PAL.iron2, 2); // a joint across the top surface
  hline(s, 0, 12, 16, PAL.iron4);
  hline(s, 0, 13, 16, PAL.iron5); // the lit lip: brightest line on the wall
  hline(s, 0, 14, 16, PAL.iron2);
  hline(s, 0, 15, 16, PAL.iron1); // hard shadow under the lip
  vline(s, 0, 1, 11, PAL.iron2); // panel joint
}

function ironFace(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron2);
  hline(s, 0, 0, 16, PAL.iron3); // light gathers at the top of the face
  vline(s, 0, 0, 16, PAL.iron1); // panel joint on the tile edge only
  vline(s, 1, 1, 15, PAL.iron3);
  dither(s, 0, 10, 16, 6, PAL.iron1, 1); // falls away toward the deck
  dither(s, 0, 13, 16, 3, PAL.iron1, 2);
}

function drawIronBase(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron1);
  vline(s, 0, 0, 16, PAL.iron0);
  vline(s, 1, 0, 9, PAL.iron2);
  dither(s, 0, 0, 16, 3, PAL.iron2, 1);
  hline(s, 0, 9, 16, PAL.iron2); // top edge of the skirting catches light
  rect(s, 0, 10, 16, 4, PAL.iron0);
  bolt(s, 3, 11, PAL.iron2, PAL.void1);
  bolt(s, 8, 11, PAL.iron2, PAL.void1);
  bolt(s, 13, 11, PAL.iron2, PAL.void1);
  dither(s, 0, 14, 16, 1, PAL.void1, 3); // contact shadow on the deck
  dither(s, 0, 15, 16, 1, PAL.void1, 2);
}

function drawIronPanel(s: Surface): void {
  ironFace(s);
  inset(s, 3, 3, 10, 9, 'iron', 1);
  px(s, 4, 4, PAL.iron3);
  px(s, 11, 4, PAL.iron3);
  px(s, 4, 10, PAL.iron3);
  px(s, 11, 10, PAL.iron3);
  hline(s, 5, 7, 6, PAL.iron0);
}

function drawIronVent(s: Surface): void {
  ironFace(s);
  inset(s, 3, 2, 10, 11, 'iron', 1);
  for (let y = 4; y <= 10; y += 2) {
    hline(s, 4, y, 8, PAL.void1);
    hline(s, 4, y + 1, 8, PAL.iron3);
  }
  bolt(s, 3, 2, PAL.iron3, PAL.iron0);
  bolt(s, 12, 2, PAL.iron3, PAL.iron0);
}

function drawIronPipe(s: Surface): void {
  ironFace(s);
  pipeV(s, 6, 0, 16, PAL.iron1, PAL.iron3, PAL.iron4);
  rect(s, 5, 3, 6, 2, PAL.iron2);
  hline(s, 5, 3, 6, PAL.iron3);
  rect(s, 5, 11, 6, 2, PAL.iron2);
  hline(s, 5, 11, 6, PAL.iron3);
}

function drawIronCable(s: Surface): void {
  ironFace(s);
  vline(s, 4, 0, 16, PAL.rust0);
  vline(s, 5, 0, 16, PAL.rust1);
  vline(s, 9, 0, 16, PAL.void1);
  vline(s, 10, 0, 16, PAL.iron1);
  hline(s, 3, 5, 9, PAL.iron3);
  hline(s, 3, 6, 9, PAL.iron1);
  hline(s, 3, 12, 9, PAL.iron3);
  hline(s, 3, 13, 9, PAL.iron1);
}

function drawHabCap(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.rust3);
  hline(s, 0, 0, 16, PAL.rust1);
  hline(s, 0, 1, 16, PAL.rust2);
  dither(s, 0, 5, 16, 1, PAL.rust2, 2);
  hline(s, 0, 12, 16, PAL.rust3);
  hline(s, 0, 13, 16, PAL.amber2); // top of the rust ramp, used as specular only
  hline(s, 0, 14, 16, PAL.rust2);
  hline(s, 0, 15, 16, PAL.rust1);
}

function drawHabFace(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.rust2);
  hline(s, 0, 0, 16, PAL.rust3);
  vline(s, 0, 0, 16, PAL.rust1);
  vline(s, 1, 1, 15, PAL.rust3);
  hline(s, 0, 9, 16, PAL.rust3); // chair rail — habitation is lived in
  hline(s, 0, 10, 16, PAL.rust1);
  dither(s, 0, 12, 16, 4, PAL.rust1, 2);
  const rng = new Rng('wall.hab.face');
  speckle(s, 2, 2, 12, 7, PAL.rust1, 0.04, rng);
  scuff(s, 2, 11, 12, 4, PAL.rust3, 3, rng);
}

function drawHabBase(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.rust1);
  vline(s, 0, 0, 16, PAL.rust0);
  hline(s, 0, 9, 16, PAL.rust2);
  rect(s, 0, 10, 16, 4, PAL.rust0);
  bolt(s, 5, 11, PAL.rust2, PAL.void1);
  bolt(s, 11, 11, PAL.rust2, PAL.void1);
  dither(s, 0, 14, 16, 1, PAL.void1, 3);
  dither(s, 0, 15, 16, 1, PAL.void1, 2);
}

function drawMedCap(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.bone2);
  hline(s, 0, 0, 16, PAL.bone0);
  hline(s, 0, 1, 16, PAL.bone1);
  dither(s, 0, 5, 16, 1, PAL.bone1, 2);
  hline(s, 0, 12, 16, PAL.bone2);
  hline(s, 0, 13, 16, PAL.bone3);
  hline(s, 0, 14, 16, PAL.bone1);
  hline(s, 0, 15, 16, PAL.bone0);
}

function drawMedFace(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.bone1);
  hline(s, 0, 0, 16, PAL.bone2);
  vline(s, 0, 0, 16, PAL.bone0);
  vline(s, 1, 1, 15, PAL.bone2);
  hline(s, 0, 6, 16, PAL.brine2); // bumper rail: the one cold band on the wall
  hline(s, 0, 7, 16, PAL.brine1);
  dither(s, 0, 12, 16, 4, PAL.bone0, 2);
}

function drawRegCap(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.brine3);
  hline(s, 0, 0, 16, PAL.brine1);
  hline(s, 0, 1, 16, PAL.brine2);
  dither(s, 0, 5, 16, 1, PAL.brine2, 2);
  hline(s, 0, 12, 16, PAL.brine3);
  hline(s, 0, 13, 16, PAL.brine4);
  hline(s, 0, 14, 16, PAL.brine2);
  hline(s, 0, 15, 16, PAL.brine1);
}

function drawRegFace(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.brine2);
  hline(s, 0, 0, 16, PAL.brine3);
  vline(s, 0, 0, 16, PAL.brine1);
  vline(s, 1, 1, 15, PAL.brine3);
  inset(s, 3, 2, 10, 5, 'brine', 1);
  inset(s, 3, 8, 10, 6, 'brine', 1);
  px(s, 12, 2, PAL.brine4); // index tick, top right of each panel
  px(s, 12, 8, PAL.brine4);
}

function drawSpineCap(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron2);
  hline(s, 0, 0, 16, PAL.void2);
  hline(s, 0, 1, 16, PAL.iron1);
  for (let x = 0; x < 16; x += 4) px(s, x, 12, PAL.iron3); // rib ends
  hline(s, 0, 13, 16, PAL.iron3);
  hline(s, 0, 14, 16, PAL.iron1);
  hline(s, 0, 15, 16, PAL.void2);
}

function drawSpineFace(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron1);
  for (let x = 0; x < 16; x += 4) {
    vline(s, x, 0, 16, PAL.iron2);
    vline(s, x + 1, 0, 16, PAL.iron0);
  }
  hline(s, 0, 7, 16, PAL.iron2); // stringer
  hline(s, 0, 8, 16, PAL.void1);
  dither(s, 0, 13, 16, 3, PAL.void2, 2);
}

function windowGround(s: Surface, lit: boolean): void {
  ironFace(s);
  box(s, 1, 1, 14, 13, PAL.iron3);
  rect(s, 2, 2, 12, 11, PAL.void0);
  hline(s, 2, 2, 12, PAL.void1);
  vline(s, 2, 2, 11, PAL.void1);
  // Stars. .lit drifts them one pixel — the port is turning, very slowly.
  const d = lit ? 1 : 0;
  px(s, 4 + d, 5, PAL.bone0);
  px(s, 9 + d, 4, PAL.iron5);
  px(s, 11 + d, 9, PAL.bone0);
  px(s, 6 + d, 11, PAL.iron4);
  if (lit) {
    px(s, 9 + d, 4, PAL.bone2);
    dither(s, 3, 3, 10, 9, PAL.brine0, 1);
  }
  // Reflection on the pane and the sill below it.
  for (let i = 0; i < 5; i++) px(s, 3 + i, 10 - i, PAL.void2);
  hline(s, 1, 13, 14, PAL.iron4);
  hline(s, 1, 14, 14, PAL.iron2);
  bolt(s, 1, 1, PAL.iron4, PAL.iron1);
  bolt(s, 14, 1, PAL.iron4, PAL.iron1);
}

function drawSign(s: Surface): void {
  ironFace(s);
  bevel(s, 2, 4, 12, 8, 'iron', 2);
  rect(s, 3, 5, 10, 6, PAL.void1);
  hline(s, 4, 6, 5, PAL.amber2);
  hline(s, 4, 8, 8, PAL.amber1);
  hline(s, 4, 9, 3, PAL.amber1);
  px(s, 11, 6, PAL.bone2);
  bolt(s, 2, 4, PAL.iron4, PAL.iron1);
  bolt(s, 13, 4, PAL.iron4, PAL.iron1);
}

// =====================================================================
// STRUCTURE
//
// Doors are drawn for a wall running east-west: the leaves slide sideways and
// the player walks north-south through them.
// =====================================================================

/**
 * The jamb, and the reason it is this bright.
 *
 * A door tile sits inside a wall band drawn from the same iron family, and the
 * shell used to be `iron1` — the wall's own value. The result was that the four
 * doors off the habitation ring read as lockers bolted to the bulkhead, and the
 * only reason a player could find an exit at all was the signage beside it.
 *
 * A door has to break the wall's silhouette to read as a way out. Two values
 * the wall never uses do that: a hard `iron4` jamb, and a `void0` recess behind
 * the leaves so the opening reads as depth rather than as another flat panel.
 */
function doorShell(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.void0);
  vline(s, 0, 0, 16, PAL.iron0);
  vline(s, 1, 0, 16, PAL.iron4); // jamb, lit
  vline(s, 14, 0, 16, PAL.iron3);
  vline(s, 15, 0, 16, PAL.iron0);
  hline(s, 0, 0, 16, PAL.iron4); // lintel
  hline(s, 0, 1, 16, PAL.iron2);
  hline(s, 0, 15, 16, PAL.iron0); // sill, in shadow
}

function doorLeaf(s: Surface, x: number, w: number): void {
  bevel(s, x, 2, w, 13, 'iron', 2);
  hline(s, x, 6, w, PAL.iron3);
  hline(s, x, 7, w, PAL.iron1);
}

function drawDoorClosed(s: Surface): void {
  doorShell(s);
  doorLeaf(s, 2, 6);
  doorLeaf(s, 8, 6);
  // The parting line, two pixels of void. One pixel disappeared under the
  // lightmap in a dim room, which is where knowing an exit exists matters most.
  rect(s, 7, 2, 2, 13, PAL.void0);
  hazardPaint(s, 2, 11, 12, 3, PAL.amber1, PAL.iron1, PAL.amber2);
  rect(s, 7, 11, 2, 3, PAL.void0);
  hline(s, 6, 2, 4, PAL.void0);
  hline(s, 6, 3, 4, PAL.amber2); // status tell-tale: shut and powered
}

function drawDoorOpening(s: Surface): void {
  doorShell(s);
  rect(s, 4, 2, 8, 13, PAL.void0);
  dither(s, 4, 12, 8, 3, PAL.iron1, 2); // deck appearing in the gap
  doorLeaf(s, 2, 3);
  doorLeaf(s, 11, 3);
  vline(s, 4, 2, 13, PAL.iron4); // leading edges catch the corridor light
  vline(s, 11, 2, 13, PAL.iron4);
  hline(s, 6, 2, 4, PAL.void0);
  hline(s, 6, 3, 4, PAL.amber3);
}

function drawDoorOpen(s: Surface): void {
  doorShell(s);
  rect(s, 2, 2, 12, 13, PAL.iron1);
  dither(s, 2, 2, 12, 3, PAL.iron0, 2);
  dither(s, 2, 12, 12, 3, PAL.iron0, 2);
  vline(s, 2, 2, 13, PAL.iron0); // the leaves, stowed in the jambs
  vline(s, 3, 2, 13, PAL.iron2);
  vline(s, 12, 2, 13, PAL.iron2);
  vline(s, 13, 2, 13, PAL.iron0);
  hline(s, 4, 7, 8, PAL.iron0); // door track across the threshold
  hline(s, 4, 8, 8, PAL.iron2);
}

function drawDoorLocked(s: Surface): void {
  drawDoorClosed(s);
  rect(s, 2, 7, 12, 3, PAL.iron3);
  hline(s, 2, 7, 12, PAL.iron4);
  hline(s, 2, 9, 12, PAL.iron1);
  bolt(s, 4, 8, PAL.iron4, PAL.iron1);
  bolt(s, 11, 8, PAL.iron4, PAL.iron1);
  hline(s, 6, 3, 4, PAL.ember2);
  px(s, 7, 3, PAL.ember3);
}

function drawDoorSealed(s: Surface): void {
  doorShell(s);
  rect(s, 2, 0, 12, 16, PAL.iron1);
  hazardPaint(s, 3, 2, 10, 12, PAL.amber1, PAL.iron0, PAL.amber2);
  // Welded plate over the leaves — this door is not opening again.
  box(s, 3, 2, 10, 12, PAL.iron3);
  const rng = new Rng('door.sealed');
  speckle(s, 3, 2, 10, 12, PAL.iron2, 0.06, rng);
  hline(s, 4, 7, 8, PAL.iron2);
  hline(s, 4, 8, 8, PAL.iron0);
  hline(s, 6, 1, 4, PAL.ember0);
}

function drawDoorFrame(s: Surface): void {
  bevel(s, 0, 0, 16, 16, 'iron', 2);
  rect(s, 4, 0, 2, 16, PAL.iron1);
  vline(s, 6, 0, 16, PAL.iron3);
  rect(s, 10, 0, 2, 16, PAL.iron1);
  vline(s, 12, 0, 16, PAL.iron3);
  bolt(s, 2, 2, PAL.iron4, PAL.iron1);
  bolt(s, 2, 12, PAL.iron4, PAL.iron1);
  bolt(s, 14, 2, PAL.iron4, PAL.iron1);
  bolt(s, 14, 12, PAL.iron4, PAL.iron1);
}

function drawHatchClosed(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron1);
  dither(s, 0, 0, 16, 16, PAL.iron0, 1);
  bevel(s, 2, 2, 12, 12, 'iron', 2);
  inset(s, 4, 4, 8, 8, 'iron', 1);
  rect(s, 6, 7, 4, 2, PAL.iron2); // dog handle
  hline(s, 6, 7, 4, PAL.iron4);
  // Four dogs, one per side.
  px(s, 7, 3, PAL.iron4);
  px(s, 8, 3, PAL.iron4);
  px(s, 7, 12, PAL.iron4);
  px(s, 8, 12, PAL.iron4);
  px(s, 3, 7, PAL.iron4);
  px(s, 12, 7, PAL.iron4);
  hline(s, 5, 11, 6, PAL.amber1); // duct stencil
}

function drawHatchOpen(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.iron1);
  dither(s, 0, 0, 16, 16, PAL.iron0, 1);
  // The plate, swung up and foreshortened against the far side.
  rect(s, 2, 1, 12, 3, PAL.iron2);
  hline(s, 2, 1, 12, PAL.iron4);
  hline(s, 2, 3, 12, PAL.iron0);
  rect(s, 2, 4, 12, 10, PAL.void0);
  dither(s, 3, 4, 10, 3, PAL.iron0, 2); // the near lip of the opening
  hline(s, 5, 11, 6, PAL.iron3); // a rung, just visible
  hline(s, 5, 12, 6, PAL.iron1);
  box(s, 2, 4, 12, 10, PAL.iron0);
}

function drawLadder(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.void2);
  dither(s, 4, 0, 8, 16, PAL.void1, 2);
  vline(s, 3, 0, 16, PAL.iron1);
  vline(s, 4, 0, 16, PAL.iron3);
  vline(s, 11, 0, 16, PAL.iron3);
  vline(s, 12, 0, 16, PAL.iron1);
  for (let y = 1; y < 16; y += 4) {
    hline(s, 5, y, 6, PAL.iron2);
    hline(s, 5, y + 1, 6, PAL.iron0);
  }
}

/** Stairs: four treads, nosings lit, risers in shadow. `up` recedes away. */
function stairs(s: Surface, up: boolean): void {
  rect(s, 0, 0, 16, 16, PAL.iron2);
  for (let i = 0; i < 4; i++) {
    const y = i * 4;
    hline(s, 0, y, 16, PAL.iron0); // riser
    rect(s, 0, y + 1, 16, 2, PAL.iron2);
    hline(s, 0, y + 3, 16, PAL.iron3); // nosing
    const t = up ? i : 3 - i;
    if (t > 1) dither(s, 0, y + 1, 16, 2, PAL.iron1, t === 3 ? 2 : 1);
    else dither(s, 0, y + 1, 16, 2, PAL.iron3, t === 0 ? 2 : 1);
  }
  vline(s, 0, 0, 16, PAL.iron1);
  vline(s, 1, 0, 16, PAL.iron3);
  vline(s, 14, 0, 16, PAL.iron3);
  vline(s, 15, 0, 16, PAL.iron1);
}

function drawStairUp(s: Surface): void {
  stairs(s, true);
}

function drawStairDown(s: Surface): void {
  stairs(s, false);
  // The well at the top of the flight — the part you can fall into.
  rect(s, 2, 0, 12, 3, PAL.void1);
  hline(s, 2, 3, 12, PAL.iron0);
}

function drawLiftClosed(s: Surface): void {
  doorShell(s);
  doorLeaf(s, 2, 6);
  doorLeaf(s, 8, 6);
  vline(s, 7, 0, 16, PAL.void1);
  inset(s, 3, 8, 4, 5, 'brine', 2);
  inset(s, 9, 8, 4, 5, 'brine', 2);
  rect(s, 5, 1, 6, 3, PAL.void1);
  hline(s, 6, 2, 2, PAL.amber2); // floor indicator
  px(s, 9, 2, PAL.amber1);
}

function drawLiftOpen(s: Surface): void {
  doorShell(s);
  rect(s, 2, 0, 12, 16, PAL.iron1);
  dither(s, 2, 0, 12, 16, PAL.iron0, 1);
  rect(s, 4, 9, 8, 5, PAL.brine1); // car mat
  dither(s, 4, 9, 8, 5, PAL.brine0, 2);
  rect(s, 2, 0, 12, 4, PAL.iron2); // far wall of the car
  dither(s, 2, 0, 12, 2, PAL.bone0, 1); // ceiling light spill
  hline(s, 3, 5, 10, PAL.iron4); // handrail
  hline(s, 3, 6, 10, PAL.iron1);
  vline(s, 2, 0, 16, PAL.iron0);
  vline(s, 13, 0, 16, PAL.iron0);
}

function drawLiftPanel(s: Surface): void {
  ironFace(s);
  bevel(s, 4, 3, 8, 10, 'iron', 2);
  rect(s, 5, 4, 6, 3, PAL.void1);
  hline(s, 6, 5, 2, PAL.amber2);
  px(s, 9, 5, PAL.amber1);
  px(s, 6, 9, PAL.amber3); // call buttons — the highest values on the panel
  px(s, 6, 10, PAL.amber1);
  px(s, 9, 9, PAL.bone1);
  px(s, 9, 10, PAL.iron2);
  bolt(s, 4, 3, PAL.iron4, PAL.iron1);
  bolt(s, 11, 3, PAL.iron4, PAL.iron1);
}

// =====================================================================
// PROPS
//
// All props are drawn on a transparent cell so the deck shows around them, then
// given a void1 keyline and a dithered contact shadow. Top surface plus a two
// pixel sliver of front face, consistently, on every one of them.
// =====================================================================

function crateBody(s: Surface, body: string, hi: string, lo: string): void {
  rect(s, 2, 2, 12, 10, body);
  hline(s, 2, 2, 12, hi);
  vline(s, 2, 2, 10, hi);
  hline(s, 2, 11, 12, lo);
  rect(s, 2, 12, 12, 2, lo); // front sliver
  hline(s, 2, 12, 12, body);
}

function drawCrateA(s: Surface): void {
  crateBody(s, PAL.rust2, PAL.rust3, PAL.rust1);
  // Corner brackets — iron on rust is the readable pairing at this size.
  hline(s, 3, 3, 3, PAL.iron3);
  vline(s, 3, 3, 3, PAL.iron3);
  hline(s, 10, 3, 3, PAL.iron3);
  vline(s, 12, 3, 3, PAL.iron3);
  hline(s, 3, 10, 3, PAL.iron2);
  hline(s, 10, 10, 3, PAL.iron2);
  bolt(s, 3, 13, PAL.rust3, PAL.rust0);
  bolt(s, 12, 13, PAL.rust3, PAL.rust0);
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawCrateB(s: Surface): void {
  crateBody(s, PAL.rust2, PAL.rust3, PAL.rust1);
  // Same silhouette, different marking: a banded crate with a stencil.
  rect(s, 2, 5, 12, 2, PAL.iron2);
  hline(s, 2, 5, 12, PAL.iron3);
  hline(s, 5, 9, 6, PAL.bone0);
  hline(s, 5, 10, 4, PAL.bone0);
  const rng = new Rng('prop.crate.b');
  speckle(s, 3, 3, 10, 8, PAL.rust1, 0.05, rng);
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawCrateStack(s: Surface): void {
  // Two crates in one cell: the lower one set back and to the right, the upper
  // one offset up-left. Reads as a stack without leaving the 16x16 cell.
  rect(s, 5, 5, 10, 9, PAL.rust1);
  hline(s, 5, 5, 10, PAL.rust2);
  rect(s, 1, 1, 11, 10, PAL.rust2);
  hline(s, 1, 1, 11, PAL.rust3);
  vline(s, 1, 1, 10, PAL.rust3);
  hline(s, 1, 10, 11, PAL.rust1);
  rect(s, 1, 11, 11, 2, PAL.rust1);
  hline(s, 3, 3, 7, PAL.iron3);
  hline(s, 3, 8, 7, PAL.iron2);
  hline(s, 8, 8, 6, PAL.iron2);
  keyline(s);
  contact(s, 5, 10, 14);
}

function drawBarrel(s: Surface): void {
  rect(s, 3, 2, 10, 11, PAL.rust2);
  // Round the top corners so it reads as a cylinder, not a box.
  px(s, 3, 2, PAL.void1);
  px(s, 12, 2, PAL.void1);
  hline(s, 4, 2, 8, PAL.rust3);
  vline(s, 3, 4, 8, PAL.rust3);
  vline(s, 12, 3, 10, PAL.rust1);
  rect(s, 5, 3, 6, 3, PAL.rust3); // lid, catching the deck light
  hline(s, 5, 3, 6, PAL.amber2);
  hline(s, 3, 7, 10, PAL.iron2); // hoops
  hline(s, 3, 10, 10, PAL.iron2);
  rect(s, 3, 13, 10, 1, PAL.rust1);
  keyline(s);
  contact(s, 3, 10, 14);
}

function lockerBody(s: Surface, topH: number): void {
  rect(s, 2, 1, 12, topH, PAL.iron3); // top surface
  hline(s, 2, 1, 12, PAL.iron4);
  rect(s, 2, 1 + topH, 12, 13 - topH, PAL.iron2); // front face
  hline(s, 2, 1 + topH, 12, PAL.iron1);
  vline(s, 13, 1, 13, PAL.iron1);
}

function drawLocker(s: Surface): void {
  lockerBody(s, 4);
  vline(s, 7, 6, 8, PAL.iron1); // door seam
  vline(s, 8, 6, 8, PAL.iron3);
  for (let y = 6; y <= 8; y++) {
    hline(s, 3, y, 3, PAL.iron1); // vents
    hline(s, 10, y, 3, PAL.iron1);
  }
  px(s, 6, 10, PAL.bone1); // handle — the highest value on the prop
  px(s, 6, 11, PAL.bone0);
  px(s, 9, 10, PAL.bone1);
  px(s, 9, 11, PAL.bone0);
  hline(s, 3, 12, 3, PAL.bone2); // name plate: this one opens
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawLockerOpen(s: Surface): void {
  lockerBody(s, 4);
  rect(s, 3, 6, 6, 8, PAL.void2); // interior
  dither(s, 3, 6, 6, 8, PAL.void1, 2);
  vline(s, 5, 7, 5, PAL.rust2); // a hanging cold liner
  vline(s, 6, 7, 4, PAL.rust1);
  hline(s, 4, 6, 4, PAL.iron1);
  rect(s, 9, 6, 4, 8, PAL.iron3); // the swung door, seen edge-on
  vline(s, 9, 6, 8, PAL.iron4);
  vline(s, 12, 6, 8, PAL.iron1);
  px(s, 10, 10, PAL.bone1);
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawLockerTall(s: Surface): void {
  // More front face, less top: the same object, read as a full-height bank.
  lockerBody(s, 2);
  vline(s, 7, 4, 10, PAL.iron1);
  vline(s, 8, 4, 10, PAL.iron3);
  hline(s, 2, 8, 12, PAL.iron1); // mid rail
  hline(s, 2, 9, 12, PAL.iron3);
  for (let y = 4; y <= 6; y++) {
    hline(s, 3, y, 3, PAL.iron1);
    hline(s, 10, y, 3, PAL.iron1);
  }
  px(s, 6, 11, PAL.bone1);
  px(s, 9, 11, PAL.bone1);
  hline(s, 3, 12, 4, PAL.bone2);
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawBunkHead(s: Surface): void {
  rect(s, 1, 0, 14, 16, PAL.iron2); // frame
  vline(s, 1, 0, 16, PAL.iron3);
  vline(s, 14, 0, 16, PAL.iron1);
  hline(s, 1, 0, 14, PAL.iron3);
  rect(s, 2, 2, 12, 14, PAL.rust2); // blanket
  dither(s, 2, 2, 12, 14, PAL.rust1, 1);
  rect(s, 3, 3, 10, 4, PAL.bone1); // pillow
  hline(s, 3, 3, 10, PAL.bone2);
  hline(s, 3, 6, 10, PAL.bone0);
  hline(s, 2, 9, 12, PAL.rust3); // turned-down sheet
}

function drawBunkFoot(s: Surface): void {
  rect(s, 1, 0, 14, 16, PAL.iron2);
  vline(s, 1, 0, 16, PAL.iron3);
  vline(s, 14, 0, 16, PAL.iron1);
  rect(s, 2, 0, 12, 12, PAL.rust2);
  dither(s, 2, 0, 12, 12, PAL.rust1, 1);
  hline(s, 2, 11, 12, PAL.rust1);
  rect(s, 1, 12, 14, 2, PAL.iron2); // footboard
  hline(s, 1, 12, 14, PAL.iron4);
  hline(s, 1, 14, 14, PAL.iron1);
  hline(s, 1, 15, 14, PAL.iron0);
  bolt(s, 2, 12, PAL.iron4, PAL.iron1);
  bolt(s, 13, 12, PAL.iron4, PAL.iron1);
}

function drawTable(s: Surface): void {
  // Middle segment of a run: the top surface reaches both tile edges.
  rect(s, 0, 3, 16, 9, PAL.iron3);
  hline(s, 0, 3, 16, PAL.iron4);
  hline(s, 0, 11, 16, PAL.iron1);
  rect(s, 0, 12, 16, 2, PAL.iron1); // front edge
  dither(s, 0, 5, 16, 5, PAL.iron2, 1); // brushed grain
  contact(s, 0, 16, 14);
}

function drawTableEnd(s: Surface): void {
  // Right-hand cap for a table run. There is no left-cap id in the tile set,
  // so a run is laid as [table, table, table.end].
  rect(s, 0, 3, 14, 9, PAL.iron3);
  hline(s, 0, 3, 14, PAL.iron4);
  hline(s, 0, 11, 14, PAL.iron1);
  rect(s, 0, 12, 14, 2, PAL.iron1);
  vline(s, 13, 3, 11, PAL.iron1);
  dither(s, 0, 5, 13, 5, PAL.iron2, 1);
  rect(s, 10, 12, 2, 3, PAL.iron1); // leg
  hline(s, 10, 12, 2, PAL.iron2);
  keyline(s);
  contact(s, 0, 14, 15);
}

/** Chair. `.n` means the backrest is on the north side — the seat faces south. */
function chair(s: Surface, dir: 'n' | 's' | 'e' | 'w'): void {
  rect(s, 4, 5, 8, 7, PAL.rust2); // seat
  hline(s, 4, 5, 8, PAL.rust3);
  hline(s, 4, 11, 8, PAL.rust1);
  rect(s, 4, 12, 8, 1, PAL.rust1);
  if (dir === 'n') {
    rect(s, 3, 2, 10, 3, PAL.rust1);
    hline(s, 3, 2, 10, PAL.rust3);
  } else if (dir === 's') {
    rect(s, 3, 12, 10, 3, PAL.rust1);
    hline(s, 3, 12, 10, PAL.rust3);
  } else if (dir === 'w') {
    rect(s, 2, 4, 3, 9, PAL.rust1);
    vline(s, 2, 4, 9, PAL.rust3);
  } else {
    rect(s, 11, 4, 3, 9, PAL.rust1);
    vline(s, 13, 4, 9, PAL.rust3);
  }
  px(s, 5, 13, PAL.iron2); // legs
  px(s, 10, 13, PAL.iron2);
  keyline(s);
  contact(s, 4, 8, 14);
}

function consoleBody(s: Surface): void {
  rect(s, 1, 3, 14, 9, PAL.iron2); // desk top
  hline(s, 1, 3, 14, PAL.iron3);
  hline(s, 1, 11, 14, PAL.iron1);
  rect(s, 1, 12, 14, 2, PAL.iron1); // front sliver
  bevel(s, 2, 1, 12, 6, 'iron', 2); // screen housing, tilted toward the player
  hline(s, 3, 10, 10, PAL.iron3); // keying shelf
  px(s, 4, 10, PAL.bone0);
  px(s, 7, 10, PAL.bone0);
  px(s, 10, 10, PAL.bone0);
}

function drawConsoleA(s: Surface): void {
  consoleBody(s);
  latticeScreen(s, 3, 2, 10, 4, 'console.a', false);
  keyline(s);
  contact(s, 1, 14, 14);
}

function drawConsoleB(s: Surface): void {
  consoleBody(s);
  latticeScreen(s, 3, 2, 10, 4, 'console.b', true);
  keyline(s);
  contact(s, 1, 14, 14);
}

function drawConsoleDead(s: Surface): void {
  consoleBody(s);
  rect(s, 3, 2, 10, 4, PAL.void1);
  dither(s, 3, 2, 10, 4, PAL.void0, 2);
  // A cracked pane: the only light on it is reflected.
  for (let i = 0; i < 4; i++) px(s, 5 + i, 2 + i, PAL.iron2);
  px(s, 9, 4, PAL.iron3);
  keyline(s);
  contact(s, 1, 14, 14);
}

function terminalBody(s: Surface): void {
  rect(s, 3, 1, 10, 12, PAL.iron2); // pedestal
  hline(s, 3, 1, 10, PAL.iron3);
  vline(s, 3, 1, 12, PAL.iron3);
  vline(s, 12, 1, 12, PAL.iron1);
  rect(s, 3, 13, 10, 2, PAL.iron1);
  bevel(s, 2, 2, 12, 7, 'iron', 3); // head, lighter so it separates from a wall
  hline(s, 4, 11, 8, PAL.iron4); // key shelf
  hline(s, 4, 12, 8, PAL.iron1);
}

function drawTerminal(s: Surface): void {
  terminalBody(s);
  latticeScreen(s, 3, 3, 10, 5, 'terminal.a', true);
  keyline(s);
  contact(s, 3, 10, 15);
}

function drawTerminalB(s: Surface): void {
  terminalBody(s);
  latticeScreen(s, 3, 3, 10, 5, 'terminal.b', false);
  keyline(s);
  contact(s, 3, 10, 15);
}

function drawMuster(s: Surface): void {
  // The muster board: a bank of name cards over a lattice readout. Interactive,
  // so it carries the widest value range in the room — void1 to bone3.
  bevel(s, 1, 1, 14, 13, 'iron', 2);
  rect(s, 2, 2, 12, 7, PAL.iron1);
  const rng = new Rng('prop.muster');
  for (let y = 3; y <= 7; y += 2) {
    hline(s, 3, y, 4 + rng.int(5), PAL.bone2);
    px(s, 12, y, PAL.bone0);
  }
  hline(s, 2, 9, 12, PAL.iron3);
  latticeScreen(s, 3, 10, 10, 3, 'muster', true);
  hline(s, 2, 2, 12, PAL.amber1); // header rule
  keyline(s);
  contact(s, 1, 14, 15);
}

function drawBulletin(s: Surface): void {
  // Paper, in a ship made of metal. High contrast on purpose.
  rect(s, 1, 2, 14, 12, PAL.rust1);
  hline(s, 1, 2, 14, PAL.rust2);
  hline(s, 1, 13, 14, PAL.rust0);
  rect(s, 3, 4, 5, 5, PAL.bone3);
  rect(s, 9, 3, 5, 4, PAL.bone2);
  rect(s, 8, 9, 6, 4, PAL.bone1);
  hline(s, 4, 6, 3, PAL.iron2);
  hline(s, 10, 5, 3, PAL.iron2);
  hline(s, 9, 11, 4, PAL.iron2);
  px(s, 5, 4, PAL.ember2); // pins
  px(s, 11, 3, PAL.amber2);
  px(s, 10, 9, PAL.ember2);
  keyline(s);
  contact(s, 1, 14, 15);
}

function drawBreaker(s: Surface): void {
  bevel(s, 2, 2, 12, 12, 'iron', 2);
  rect(s, 3, 3, 10, 8, PAL.iron1);
  hline(s, 3, 3, 10, PAL.iron0);
  // Two rows of breakers. Thrown ones read amber, tripped ones ember.
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 2;
    rect(s, x, 4, 1, 3, PAL.amber2);
    rect(s, x, 8, 1, 3, i === 2 ? PAL.ember2 : PAL.amber1);
  }
  hline(s, 3, 12, 8, PAL.bone2); // label strip
  px(s, 12, 12, PAL.iron3);
  keyline(s);
  contact(s, 2, 12, 15);
}

function drawPipeH(s: Surface): void {
  pipeH(s, 0, 5, 16, PAL.iron1, PAL.iron3, PAL.iron4);
  rect(s, 6, 4, 4, 6, PAL.iron2); // flange
  hline(s, 6, 4, 4, PAL.iron3);
  hline(s, 6, 9, 4, PAL.iron1);
  contact(s, 0, 16, 10);
}

function drawPipeV(s: Surface): void {
  pipeV(s, 5, 0, 16, PAL.iron1, PAL.iron3, PAL.iron4);
  rect(s, 4, 6, 6, 4, PAL.iron2);
  vline(s, 4, 6, 4, PAL.iron3);
  vline(s, 9, 6, 4, PAL.iron1);
}

function drawPipeElbow(s: Surface): void {
  // Joins WEST and SOUTH. There is one elbow id, so the map builds the other
  // three corners from pipe.h / pipe.v runs and this piece where it fits.
  pipeH(s, 0, 5, 10, PAL.iron1, PAL.iron3, PAL.iron4);
  pipeV(s, 5, 5, 11, PAL.iron1, PAL.iron3, PAL.iron4);
  hline(s, 5, 5, 4, PAL.iron1);
  px(s, 6, 6, PAL.iron4);
  px(s, 7, 7, PAL.iron3);
  rect(s, 4, 11, 6, 2, PAL.iron2);
  vline(s, 4, 11, 2, PAL.iron3);
}

function drawValve(s: Surface): void {
  pipeV(s, 6, 0, 16, PAL.rust0, PAL.rust2, PAL.rust3);
  rect(s, 4, 5, 8, 6, PAL.iron2); // body
  hline(s, 4, 5, 8, PAL.iron3);
  hline(s, 4, 10, 8, PAL.iron0);
  // Hand wheel, seen from above.
  box(s, 3, 4, 10, 8, PAL.amber2);
  px(s, 3, 4, PAL.void1);
  px(s, 12, 4, PAL.void1);
  px(s, 3, 11, PAL.void1);
  px(s, 12, 11, PAL.void1);
  hline(s, 4, 7, 8, PAL.amber1);
  vline(s, 7, 5, 6, PAL.amber1);
  px(s, 7, 7, PAL.amber3);
  keyline(s);
  contact(s, 4, 8, 14);
}

function fanBody(s: Surface): void {
  rect(s, 1, 1, 14, 14, PAL.iron1);
  box(s, 1, 1, 14, 14, PAL.iron3);
  px(s, 1, 1, PAL.void1);
  px(s, 14, 1, PAL.void1);
  px(s, 1, 14, PAL.void1);
  px(s, 14, 14, PAL.void1);
  rect(s, 3, 3, 10, 10, PAL.void2);
  bolt(s, 2, 2, PAL.iron3, PAL.iron0);
  bolt(s, 13, 2, PAL.iron3, PAL.iron0);
}

function drawFan(s: Surface): void {
  fanBody(s);
  hline(s, 4, 7, 8, PAL.iron3);
  hline(s, 4, 8, 8, PAL.iron2);
  vline(s, 7, 4, 8, PAL.iron3);
  vline(s, 8, 4, 8, PAL.iron2);
  rect(s, 7, 7, 2, 2, PAL.iron4);
  keyline(s);
}

function drawFanB(s: Surface): void {
  fanBody(s);
  // Same blades at 45 degrees — at 8fps this is all the eye needs.
  for (let i = 0; i < 8; i++) {
    px(s, 4 + i, 4 + i, PAL.iron3);
    px(s, 4 + i, 5 + i, PAL.iron2);
    px(s, 11 - i, 4 + i, PAL.iron3);
    px(s, 11 - i, 5 + i, PAL.iron2);
  }
  rect(s, 7, 7, 2, 2, PAL.iron4);
  keyline(s);
}

function planterBody(s: Surface): void {
  rect(s, 3, 8, 10, 6, PAL.rust2);
  hline(s, 3, 8, 10, PAL.rust3);
  hline(s, 3, 13, 10, PAL.rust1);
  rect(s, 4, 9, 8, 3, PAL.moss0); // soil in the tray
  dither(s, 4, 9, 8, 3, PAL.moss1, 2);
}

function drawPlantA(s: Surface): void {
  planterBody(s);
  // A full crown. Moss is the only green in the ship, so it is allowed to
  // reach moss4 — it is the brightest thing in Hydroponics.
  rect(s, 4, 2, 8, 7, PAL.moss2);
  hline(s, 5, 1, 6, PAL.moss3);
  px(s, 4, 1, PAL.moss2);
  px(s, 11, 1, PAL.moss2);
  dither(s, 4, 2, 8, 5, PAL.moss3, 1);
  px(s, 6, 3, PAL.moss4);
  px(s, 9, 5, PAL.moss4);
  vline(s, 7, 6, 3, PAL.moss1);
  keyline(s);
  contact(s, 3, 10, 14);
}

function drawPlantB(s: Surface): void {
  planterBody(s);
  // A young shoot: same planter, a quarter of the crown.
  vline(s, 7, 4, 5, PAL.moss2);
  vline(s, 8, 4, 5, PAL.moss1);
  hline(s, 5, 5, 3, PAL.moss3);
  hline(s, 8, 3, 3, PAL.moss3);
  px(s, 5, 4, PAL.moss2);
  px(s, 10, 2, PAL.moss4);
  keyline(s);
  contact(s, 3, 10, 14);
}

function drawMedbed(s: Surface): void {
  rect(s, 2, 1, 12, 14, PAL.iron3); // frame
  hline(s, 2, 1, 12, PAL.iron4);
  vline(s, 2, 1, 14, PAL.iron4);
  vline(s, 13, 1, 14, PAL.iron1);
  rect(s, 3, 2, 10, 12, PAL.bone2); // mattress
  dither(s, 3, 2, 10, 12, PAL.bone1, 1);
  rect(s, 4, 3, 8, 3, PAL.bone3); // pillow
  rect(s, 3, 8, 10, 5, PAL.brine1); // blanket
  hline(s, 3, 8, 10, PAL.brine2);
  dither(s, 3, 9, 10, 4, PAL.brine0, 1);
  hline(s, 3, 14, 10, PAL.iron1);
  keyline(s);
  contact(s, 2, 12, 15);
}

function drawMedcart(s: Surface): void {
  rect(s, 3, 3, 10, 8, PAL.bone1); // top tray
  hline(s, 3, 3, 10, PAL.bone2);
  hline(s, 3, 10, 10, PAL.bone0);
  rect(s, 3, 11, 10, 2, PAL.iron2); // front sliver
  inset(s, 5, 5, 6, 4, 'brine', 2); // instrument tray
  hline(s, 6, 6, 4, PAL.bone3);
  px(s, 7, 4, PAL.ember2); // the cross, two pixels of it
  hline(s, 6, 4, 3, PAL.ember2);
  px(s, 4, 13, PAL.iron1); // castors
  px(s, 11, 13, PAL.iron1);
  keyline(s);
  contact(s, 3, 10, 14);
}

function drawCradle(s: Surface): void {
  // The memory-smoothing cradle. The ONLY violet in the tile set: it is the
  // only object aboard that is doing something to a mind.
  rect(s, 2, 2, 12, 13, PAL.bone1);
  hline(s, 2, 2, 12, PAL.bone2);
  vline(s, 2, 2, 13, PAL.bone2);
  vline(s, 13, 2, 13, PAL.iron2);
  rect(s, 3, 3, 10, 5, PAL.bruise0); // the hood over the head end
  hline(s, 3, 3, 10, PAL.bruise1);
  box(s, 4, 4, 8, 3, PAL.bruise2);
  px(s, 7, 5, PAL.bruise3); // tell-tale: it is running
  px(s, 8, 5, PAL.bruise2);
  rect(s, 3, 9, 10, 4, PAL.brine1); // the body of the couch
  dither(s, 3, 9, 10, 4, PAL.brine0, 1);
  hline(s, 3, 13, 10, PAL.iron2);
  keyline(s);
  contact(s, 2, 12, 15);
}

function counterTop(s: Surface, x: number, w: number): void {
  rect(s, x, 4, w, 7, PAL.iron4); // work surface, light enough to read as clean
  hline(s, x, 4, w, PAL.bone0);
  hline(s, x, 10, w, PAL.iron2);
  rect(s, x, 11, w, 3, PAL.iron2); // cabinet front
  hline(s, x, 13, w, PAL.iron1);
  dither(s, x, 11, w, 2, PAL.iron1, 1);
}

function drawCounterL(s: Surface): void {
  counterTop(s, 2, 14);
  vline(s, 2, 4, 10, PAL.bone0);
  vline(s, 1, 4, 10, PAL.iron1);
  hline(s, 4, 12, 4, PAL.iron3); // a drawer pull
  contact(s, 1, 15, 14);
}

function drawCounterM(s: Surface): void {
  counterTop(s, 0, 16);
  hline(s, 3, 12, 4, PAL.iron3);
  hline(s, 10, 12, 4, PAL.iron3);
  contact(s, 0, 16, 14);
}

function drawCounterR(s: Surface): void {
  counterTop(s, 0, 14);
  vline(s, 13, 4, 10, PAL.iron2);
  vline(s, 14, 4, 10, PAL.iron1);
  hline(s, 8, 12, 4, PAL.iron3);
  contact(s, 0, 15, 14);
}

function drawKettle(s: Surface): void {
  rect(s, 4, 3, 8, 9, PAL.iron4); // urn body
  hline(s, 4, 3, 8, PAL.iron5);
  vline(s, 4, 3, 9, PAL.iron5);
  vline(s, 11, 3, 9, PAL.iron2);
  rect(s, 5, 2, 6, 2, PAL.iron3); // lid
  hline(s, 5, 2, 6, PAL.iron5);
  rect(s, 4, 12, 8, 2, PAL.iron1); // base plate
  hline(s, 5, 12, 6, PAL.amber1); // warm plate
  px(s, 7, 12, PAL.amber2);
  vline(s, 12, 5, 4, PAL.iron3); // spout
  px(s, 12, 9, PAL.iron2);
  px(s, 6, 7, PAL.bone1); // gauge
  px(s, 6, 8, PAL.amber2);
  keyline(s);
  contact(s, 4, 8, 14);
}

function drawBench(s: Surface): void {
  rect(s, 0, 5, 16, 6, PAL.rust2); // slats run through the tile so benches join
  hline(s, 0, 5, 16, PAL.rust3);
  hline(s, 0, 7, 16, PAL.rust1);
  hline(s, 0, 8, 16, PAL.rust3);
  hline(s, 0, 10, 16, PAL.rust1);
  rect(s, 0, 11, 16, 2, PAL.rust1);
  rect(s, 2, 12, 2, 2, PAL.iron2); // legs
  rect(s, 12, 12, 2, 2, PAL.iron2);
  contact(s, 0, 16, 14);
}

function drawRug(s: Surface): void {
  // Lies flat on the deck: no keyline, no contact shadow.
  rect(s, 1, 2, 14, 12, PAL.rust2);
  dither(s, 1, 2, 14, 12, PAL.rust1, 2);
  box(s, 2, 3, 12, 10, PAL.bone0);
  box(s, 4, 5, 8, 6, PAL.rust3);
  for (let x = 1; x < 15; x += 2) {
    px(s, x, 1, PAL.rust1); // fringe
    px(s, x, 14, PAL.rust1);
  }
}

function drawCrateTessera(s: Surface): void {
  // A case of tesserae. Lattice is live inside it, so this is one of the four
  // objects allowed to show cyan — and it is the brightest prop in the game.
  crateBody(s, PAL.iron2, PAL.iron3, PAL.iron1);
  hline(s, 2, 6, 12, PAL.void1); // the seam
  latticeScreen(s, 3, 7, 10, 2, 'crate.tessera', true);
  hline(s, 3, 3, 10, PAL.bone1); // stencil band
  hline(s, 3, 4, 6, PAL.bone0);
  bolt(s, 3, 12, PAL.iron4, PAL.void1);
  bolt(s, 12, 12, PAL.iron4, PAL.void1);
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawSignDept(s: Surface): void {
  rect(s, 1, 4, 14, 8, PAL.iron2);
  hline(s, 1, 4, 14, PAL.iron3);
  hline(s, 1, 11, 14, PAL.iron0);
  rect(s, 2, 5, 12, 5, PAL.void1);
  hline(s, 3, 6, 6, PAL.amber2);
  hline(s, 3, 8, 9, PAL.amber1);
  px(s, 12, 6, PAL.bone3);
  vline(s, 4, 2, 2, PAL.iron1); // hangers
  vline(s, 11, 2, 2, PAL.iron1);
  keyline(s);
}

function drawLightCeiling(s: Surface): void {
  // Seen from below. Marked over:true — actors walk under it.
  rect(s, 2, 5, 12, 6, PAL.iron2);
  hline(s, 2, 5, 12, PAL.iron3);
  hline(s, 2, 10, 12, PAL.iron0);
  rect(s, 3, 6, 10, 4, PAL.bone3); // the tube
  hline(s, 3, 6, 10, PAL.bone2);
  hline(s, 3, 9, 10, PAL.bone1);
  vline(s, 3, 6, 4, PAL.bone2);
  vline(s, 12, 6, 4, PAL.bone2);
  dither(s, 1, 4, 14, 8, PAL.bone1, 1); // spill onto the housing
  rect(s, 3, 6, 10, 4, PAL.bone3);
  hline(s, 3, 9, 10, PAL.bone2);
  keyline(s);
}

function emergencyLamp(s: Surface, lit: boolean): void {
  rect(s, 3, 4, 10, 8, PAL.iron1);
  hline(s, 3, 4, 10, PAL.iron2);
  hline(s, 3, 11, 10, PAL.iron0);
  rect(s, 4, 5, 8, 5, lit ? PAL.ember2 : PAL.ember0);
  hline(s, 4, 5, 8, lit ? PAL.ember3 : PAL.ember1);
  if (lit) {
    hline(s, 5, 6, 6, PAL.ember3);
    dither(s, 2, 3, 12, 9, PAL.ember1, 1);
    rect(s, 4, 5, 8, 2, PAL.ember3);
  }
  // The cage stays put whether it is lit or not, which is what sells the blink.
  for (let x = 4; x < 12; x += 2) vline(s, x, 5, 5, PAL.iron1);
  hline(s, 3, 7, 10, PAL.iron1);
  keyline(s);
}

function drawCableCoil(s: Surface): void {
  rect(s, 3, 4, 10, 8, PAL.iron0);
  box(s, 3, 4, 10, 8, PAL.rust1);
  px(s, 3, 4, PAL.void1);
  px(s, 12, 4, PAL.void1);
  px(s, 3, 11, PAL.void1);
  px(s, 12, 11, PAL.void1);
  box(s, 5, 6, 6, 4, PAL.rust2);
  rect(s, 7, 7, 2, 2, PAL.void2);
  px(s, 4, 5, PAL.rust2); // the loose end
  px(s, 2, 6, PAL.rust1);
  px(s, 11, 10, PAL.bone0); // tag
  keyline(s);
  contact(s, 3, 10, 12);
}

function drawExtinguisher(s: Surface): void {
  rect(s, 5, 3, 6, 10, PAL.ember2); // bottle
  hline(s, 5, 3, 6, PAL.ember3);
  vline(s, 5, 3, 10, PAL.ember3);
  vline(s, 10, 3, 10, PAL.ember1);
  hline(s, 5, 12, 6, PAL.ember0);
  rect(s, 6, 1, 4, 2, PAL.iron3); // head
  px(s, 5, 2, PAL.iron2);
  hline(s, 5, 7, 6, PAL.bone2); // label
  hline(s, 5, 8, 4, PAL.bone1);
  rect(s, 4, 4, 1, 6, PAL.iron2); // bracket
  rect(s, 11, 4, 1, 6, PAL.iron2);
  keyline(s);
  contact(s, 5, 6, 14);
}

function drawToolbox(s: Surface): void {
  rect(s, 2, 5, 12, 7, PAL.rust2);
  hline(s, 2, 5, 12, PAL.rust3);
  hline(s, 2, 11, 12, PAL.rust1);
  rect(s, 2, 12, 12, 2, PAL.rust1);
  hline(s, 2, 8, 12, PAL.rust0); // lid line
  hline(s, 2, 9, 12, PAL.rust3);
  rect(s, 6, 3, 4, 2, PAL.iron3); // handle
  px(s, 6, 4, PAL.iron1);
  px(s, 9, 4, PAL.iron1);
  px(s, 7, 9, PAL.amber2); // latch
  px(s, 8, 9, PAL.amber1);
  keyline(s);
  contact(s, 2, 12, 14);
}

function drawDebris(s: Surface): void {
  // Clutter, deliberately low contrast — it is not a thing you can pick up.
  const rng = new Rng('prop.debris');
  rect(s, 4, 6, 4, 2, PAL.iron2);
  hline(s, 4, 6, 4, PAL.iron3);
  rect(s, 9, 9, 3, 2, PAL.iron1);
  hline(s, 9, 9, 3, PAL.iron2);
  px(s, 3, 11, PAL.iron2);
  px(s, 12, 5, PAL.iron2);
  px(s, 7, 12, PAL.iron1);
  speckle(s, 2, 4, 12, 9, PAL.iron1, 0.05, rng);
  keyline(s);
}

function drawStain(s: Surface): void {
  // Reads as something spilled and half cleaned. No keyline: it is IN the deck.
  const rng = new Rng('prop.stain');
  dither(s, 3, 4, 10, 8, PAL.void1, 2);
  dither(s, 5, 6, 6, 4, PAL.void0, 3);
  speckle(s, 2, 3, 12, 10, PAL.void1, 0.08, rng);
  speckle(s, 4, 5, 8, 6, PAL.rust0, 0.06, rng);
}

// =====================================================================
// OVERLAY — drawn above actors, so everything here is lit from above and
// carries a drop shadow on its lower edge to sell the height.
// =====================================================================

function drawOverPipeH(s: Surface): void {
  pipeH(s, 0, 3, 16, PAL.iron1, PAL.iron3, PAL.iron5);
  hline(s, 0, 2, 16, PAL.iron2);
  rect(s, 5, 1, 3, 7, PAL.iron2); // hanger band
  hline(s, 5, 1, 3, PAL.iron4);
  dither(s, 0, 8, 16, 2, PAL.void0, 2); // shadow cast on whatever is below
  dither(s, 0, 10, 16, 1, PAL.void0, 1);
}

function drawOverPipeV(s: Surface): void {
  pipeV(s, 3, 0, 16, PAL.iron1, PAL.iron3, PAL.iron5);
  vline(s, 2, 0, 16, PAL.iron2);
  rect(s, 1, 5, 7, 3, PAL.iron2);
  vline(s, 1, 5, 3, PAL.iron4);
  dither(s, 8, 0, 2, 16, PAL.void0, 2);
  dither(s, 10, 0, 1, 16, PAL.void0, 1);
}

function drawOverBeam(s: Surface): void {
  rect(s, 0, 1, 16, 8, PAL.iron2);
  hline(s, 0, 1, 16, PAL.iron4); // top flange
  hline(s, 0, 2, 16, PAL.iron3);
  dither(s, 0, 4, 16, 3, PAL.iron1, 1); // web
  hline(s, 0, 7, 16, PAL.iron3); // bottom flange
  hline(s, 0, 8, 16, PAL.iron1);
  for (let x = 2; x < 16; x += 5) bolt(s, x, 5, PAL.iron4, PAL.iron0);
  dither(s, 0, 9, 16, 3, PAL.void0, 2);
  dither(s, 0, 12, 16, 1, PAL.void0, 1);
}

function drawOverDuct(s: Surface): void {
  rect(s, 0, 0, 16, 10, PAL.iron2);
  hline(s, 0, 0, 16, PAL.iron4);
  hline(s, 0, 9, 16, PAL.iron0);
  for (let x = 0; x < 16; x += 4) {
    vline(s, x, 1, 8, PAL.iron3); // ribs
    vline(s, x + 1, 1, 8, PAL.iron1);
  }
  hline(s, 0, 5, 16, PAL.iron1); // seam along the run
  dither(s, 0, 10, 16, 2, PAL.void0, 2);
  dither(s, 0, 12, 16, 1, PAL.void0, 1);
}

// =====================================================================
// UTILITY
// =====================================================================

function drawVoid(s: Surface): void {
  rect(s, 0, 0, 16, 16, PAL.void0);
}

function drawDebugGrid(s: Surface): void {
  box(s, 0, 0, 16, 16, PAL.bruise2);
  for (let i = 4; i < 16; i += 4) {
    px(s, i, 0, PAL.bruise1);
    px(s, 0, i, PAL.bruise1);
  }
  px(s, 8, 8, PAL.bruise2);
}

// =====================================================================
// REGISTRATION TABLE
// =====================================================================

const WALL_UPPER: TileMeta = { solid: true, over: true };
const WALL_BASE: TileMeta = { solid: true };
const PROP: TileMeta = { solid: true };

const TILES: TileDef[] = [
  // ---- floors -------------------------------------------------------
  { id: 'floor.plate.a', draw: drawPlateA, meta: { step: 'metal' } },
  { id: 'floor.plate.b', draw: drawPlateB, meta: { step: 'metal' } },
  { id: 'floor.plate.c', draw: drawPlateC, meta: { step: 'metal' } },
  { id: 'floor.plate.worn', draw: drawPlateWorn, meta: { step: 'metal' } },
  { id: 'floor.grate.a', draw: drawGrateA, meta: { step: 'grate' } },
  { id: 'floor.grate.b', draw: drawGrateB, meta: { step: 'grate' } },
  { id: 'floor.carpet.a', draw: drawCarpetA, meta: { step: 'carpet' } },
  { id: 'floor.carpet.b', draw: drawCarpetB, meta: { step: 'carpet' } },
  { id: 'floor.carpet.worn', draw: drawCarpetWorn, meta: { step: 'carpet' } },
  { id: 'floor.med.a', draw: drawMedA, meta: { step: 'tile' } },
  { id: 'floor.med.b', draw: drawMedB, meta: { step: 'tile' } },
  { id: 'floor.med.drain', draw: drawMedDrain, meta: { step: 'tile' } },
  { id: 'floor.soil.a', draw: drawSoilA, meta: { step: 'soil' } },
  { id: 'floor.soil.b', draw: drawSoilB, meta: { step: 'soil' } },
  { id: 'floor.mesh.a', draw: drawMeshA, meta: { step: 'grate' } },
  { id: 'floor.mesh.b', draw: drawMeshB, meta: { step: 'grate' } },
  { id: 'floor.hazard', draw: drawHazard, meta: { step: 'metal' } },
  { id: 'floor.commons.a', draw: drawCommonsA, meta: { step: 'tile' } },
  { id: 'floor.commons.b', draw: drawCommonsB, meta: { step: 'tile' } },
  { id: 'floor.registry.a', draw: drawRegistryA, meta: { step: 'tile' } },
  { id: 'floor.registry.b', draw: drawRegistryB, meta: { step: 'tile' } },
  { id: 'floor.rivet', draw: drawRivetPlate, meta: { step: 'metal' } },

  // ---- walls --------------------------------------------------------
  { id: 'wall.iron.cap', draw: ironCap, meta: WALL_UPPER },
  { id: 'wall.iron.face', draw: ironFace, meta: WALL_UPPER },
  { id: 'wall.iron.base', draw: drawIronBase, meta: WALL_BASE },
  { id: 'wall.iron.panel', draw: drawIronPanel, meta: WALL_UPPER },
  { id: 'wall.iron.vent', draw: drawIronVent, meta: WALL_UPPER },
  { id: 'wall.iron.pipe', draw: drawIronPipe, meta: WALL_UPPER },
  { id: 'wall.iron.cable', draw: drawIronCable, meta: WALL_UPPER },
  { id: 'wall.hab.cap', draw: drawHabCap, meta: WALL_UPPER },
  { id: 'wall.hab.face', draw: drawHabFace, meta: WALL_UPPER },
  { id: 'wall.hab.base', draw: drawHabBase, meta: WALL_BASE },
  { id: 'wall.med.face', draw: drawMedFace, meta: WALL_UPPER },
  { id: 'wall.med.cap', draw: drawMedCap, meta: WALL_UPPER },
  { id: 'wall.reg.face', draw: drawRegFace, meta: WALL_UPPER },
  { id: 'wall.reg.cap', draw: drawRegCap, meta: WALL_UPPER },
  { id: 'wall.spine.face', draw: drawSpineFace, meta: WALL_UPPER },
  { id: 'wall.spine.cap', draw: drawSpineCap, meta: WALL_UPPER },
  {
    id: 'wall.window',
    draw: (s) => windowGround(s, false),
    meta: { solid: true, over: true, anim: { frames: ['wall.window.lit'], fps: 0.4 } },
  },
  {
    id: 'wall.window.lit',
    draw: (s) => windowGround(s, true),
    meta: { solid: true, over: true, light: { r: 18, color: PAL.brine3, i: 0.12 } },
  },
  { id: 'wall.sign', draw: drawSign, meta: WALL_UPPER },

  // ---- structure ----------------------------------------------------
  { id: 'door.closed', draw: drawDoorClosed, meta: { solid: true } },
  { id: 'door.opening', draw: drawDoorOpening, meta: { solid: true } },
  { id: 'door.open', draw: drawDoorOpen, meta: { step: 'metal' } },
  {
    id: 'door.locked',
    draw: drawDoorLocked,
    meta: { solid: true, light: { r: 10, color: PAL.ember2, i: 0.14 } },
  },
  { id: 'door.sealed', draw: drawDoorSealed, meta: { solid: true } },
  // Not `over`: an actor standing in the doorway must draw in front of the jamb.
  { id: 'door.frame', draw: drawDoorFrame, meta: { solid: true } },
  { id: 'hatch.closed', draw: drawHatchClosed, meta: { solid: true } },
  { id: 'hatch.open', draw: drawHatchOpen, meta: { step: 'grate' } },
  { id: 'ladder', draw: drawLadder, meta: { step: 'metal' } },
  { id: 'stair.up', draw: drawStairUp, meta: { step: 'metal' } },
  { id: 'stair.down', draw: drawStairDown, meta: { step: 'metal' } },
  { id: 'lift.closed', draw: drawLiftClosed, meta: { solid: true } },
  { id: 'lift.open', draw: drawLiftOpen, meta: { step: 'metal' } },
  { id: 'lift.panel', draw: drawLiftPanel, meta: { solid: true } },

  // ---- props --------------------------------------------------------
  { id: 'prop.crate.a', draw: drawCrateA, meta: PROP },
  { id: 'prop.crate.b', draw: drawCrateB, meta: PROP },
  { id: 'prop.crate.stack', draw: drawCrateStack, meta: PROP },
  { id: 'prop.barrel', draw: drawBarrel, meta: PROP },
  { id: 'prop.locker', draw: drawLocker, meta: PROP },
  { id: 'prop.locker.open', draw: drawLockerOpen, meta: PROP },
  { id: 'prop.locker.tall', draw: drawLockerTall, meta: PROP },
  { id: 'prop.bunk.head', draw: drawBunkHead, meta: PROP },
  { id: 'prop.bunk.foot', draw: drawBunkFoot, meta: PROP },
  { id: 'prop.table', draw: drawTable, meta: PROP },
  { id: 'prop.table.end', draw: drawTableEnd, meta: PROP },
  { id: 'prop.chair.n', draw: (s) => chair(s, 'n'), meta: PROP },
  { id: 'prop.chair.s', draw: (s) => chair(s, 's'), meta: PROP },
  { id: 'prop.chair.e', draw: (s) => chair(s, 'e'), meta: PROP },
  { id: 'prop.chair.w', draw: (s) => chair(s, 'w'), meta: PROP },
  {
    id: 'prop.console.a',
    draw: drawConsoleA,
    meta: {
      solid: true,
      light: { r: 22, color: PAL.halo2, i: 0.26 },
      anim: { frames: ['prop.console.b'], fps: 2 },
    },
  },
  {
    id: 'prop.console.b',
    draw: drawConsoleB,
    meta: { solid: true, light: { r: 22, color: PAL.halo2, i: 0.3 } },
  },
  { id: 'prop.console.dead', draw: drawConsoleDead, meta: PROP },
  {
    id: 'prop.terminal',
    draw: drawTerminal,
    meta: {
      solid: true,
      light: { r: 22, color: PAL.halo2, i: 0.3 },
      anim: { frames: ['prop.terminal.b'], fps: 3 },
    },
  },
  {
    id: 'prop.terminal.b',
    draw: drawTerminalB,
    meta: { solid: true, light: { r: 22, color: PAL.halo2, i: 0.26 } },
  },
  {
    id: 'prop.muster',
    draw: drawMuster,
    meta: { solid: true, light: { r: 20, color: PAL.halo2, i: 0.2 } },
  },
  { id: 'prop.bulletin', draw: drawBulletin, meta: PROP },
  {
    id: 'prop.breaker',
    draw: drawBreaker,
    meta: { solid: true, light: { r: 12, color: PAL.amber1, i: 0.12 } },
  },
  { id: 'prop.pipe.h', draw: drawPipeH, meta: PROP },
  { id: 'prop.pipe.v', draw: drawPipeV, meta: PROP },
  { id: 'prop.pipe.elbow', draw: drawPipeElbow, meta: PROP },
  { id: 'prop.valve', draw: drawValve, meta: PROP },
  {
    id: 'prop.fan',
    draw: drawFan,
    meta: { solid: true, anim: { frames: ['prop.fan.b'], fps: 8 } },
  },
  { id: 'prop.fan.b', draw: drawFanB, meta: PROP },
  { id: 'prop.plant.a', draw: drawPlantA, meta: PROP },
  { id: 'prop.plant.b', draw: drawPlantB, meta: PROP },
  { id: 'prop.medbed', draw: drawMedbed, meta: PROP },
  { id: 'prop.medcart', draw: drawMedcart, meta: PROP },
  {
    id: 'prop.cradle',
    draw: drawCradle,
    meta: { solid: true, light: { r: 16, color: PAL.bruise2, i: 0.18 } },
  },
  { id: 'prop.counter.l', draw: drawCounterL, meta: PROP },
  { id: 'prop.counter.m', draw: drawCounterM, meta: PROP },
  { id: 'prop.counter.r', draw: drawCounterR, meta: PROP },
  {
    id: 'prop.kettle',
    draw: drawKettle,
    meta: { solid: true, light: { r: 14, color: PAL.amber1, i: 0.15 } },
  },
  { id: 'prop.bench', draw: drawBench, meta: PROP },
  { id: 'prop.rug', draw: drawRug, meta: { step: 'carpet' } },
  {
    id: 'prop.crate.tessera',
    draw: drawCrateTessera,
    meta: { solid: true, light: { r: 20, color: PAL.halo2, i: 0.24 } },
  },
  { id: 'prop.sign.dept', draw: drawSignDept, meta: {} },
  {
    id: 'prop.light.ceiling',
    draw: drawLightCeiling,
    meta: { over: true, light: { r: 52, color: PAL.bone2, i: 0.55 } },
  },
  {
    id: 'prop.light.emergency',
    draw: (s) => emergencyLamp(s, true),
    meta: {
      over: true,
      light: { r: 34, color: PAL.ember2, i: 0.5, flicker: 0.5 },
      anim: { frames: ['prop.light.emergency.b'], fps: 2 },
    },
  },
  {
    id: 'prop.light.emergency.b',
    draw: (s) => emergencyLamp(s, false),
    meta: { over: true, light: { r: 26, color: PAL.ember1, i: 0.2, flicker: 0.5 } },
  },
  { id: 'prop.cable.coil', draw: drawCableCoil, meta: {} },
  { id: 'prop.extinguisher', draw: drawExtinguisher, meta: PROP },
  { id: 'prop.toolbox', draw: drawToolbox, meta: PROP },
  { id: 'prop.debris', draw: drawDebris, meta: {} },
  { id: 'prop.stain', draw: drawStain, meta: {} },

  // ---- overlay ------------------------------------------------------
  { id: 'over.pipe.h', draw: drawOverPipeH, meta: { over: true } },
  { id: 'over.pipe.v', draw: drawOverPipeV, meta: { over: true } },
  { id: 'over.beam', draw: drawOverBeam, meta: { over: true } },
  { id: 'over.duct', draw: drawOverDuct, meta: { over: true } },

  // ---- utility ------------------------------------------------------
  { id: 'void.black', draw: drawVoid, meta: { solid: true } },
  { id: 'debug.grid', draw: drawDebugGrid, meta: {} },
];

// =====================================================================
// BUILD
// =====================================================================

/** Builds the whole atlas once. Deterministic — seeded Rng only, no Math.random. */
export function buildTileAtlas(): TileAtlas {
  const cols = ATLAS_COLS;
  const rows = Math.ceil(TILES.length / cols);
  const atlas = surface(cols * TILE_PX, rows * TILE_PX);
  const cell = surface(TILE_PX, TILE_PX);

  const index = new Map<string, number>();
  const meta = new Map<string, TileMeta>();
  const order: string[] = [];

  TILES.forEach((def, i) => {
    // Cells are packed edge to edge with no gutter; the renderer insets UVs by
    // half a texel itself.
    const cx = (i % cols) * TILE_PX;
    const cy = Math.floor(i / cols) * TILE_PX;
    clearAll(cell);
    def.draw(cell);
    stamp(atlas, cell, cx, cy);
    index.set(def.id, i);
    meta.set(def.id, def.meta ?? {});
    order.push(def.id);
  });

  return { canvas: atlas.canvas, cols, rows, index, meta, order };
}

let cached: TileAtlas | null = null;

/** Memoised accessor — the atlas is built once per page load. */
export function getTileAtlas(): TileAtlas {
  if (!cached) cached = buildTileAtlas();
  return cached;
}
