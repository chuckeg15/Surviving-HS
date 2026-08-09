/**
 * Character art generation.
 *
 * Every person aboard the Candlewake — player and crew alike — is assembled
 * from the same layered parts at the same 16x24 cell, so a stranger in a
 * corridor reads as the same *kind of thing* the player is. Customisation is a
 * set of layer choices, which means the player's chosen appearance can appear
 * in the world sprite, the portrait, menus and combat without any of those
 * being drawn separately.
 *
 * Cell: 16 wide x 24 tall, feet on row 22, one row of contact shadow below.
 * Sheet: 6 columns (stand, stepA, stepB, act, hurt, down) x 4 rows
 * (facing down, up, left, right). Right is mirrored from left, which keeps the
 * silhouette identical in both directions — asymmetric mirroring is a classic
 * source of "the sprite pops when I turn around".
 */

import { PAL, PaletteKey, RAMP, mix } from '@/art/palette';
import { Surface, dither, mirrorX, outline, px, rect, stamp, surface } from '@/art/pixel';

export const CELL_W = 16;
export const CELL_H = 24;
export const SHEET_COLS = 6;
export const SHEET_ROWS = 4;

export type Facing = 'down' | 'up' | 'left' | 'right';
export const FACINGS: Facing[] = ['down', 'up', 'left', 'right'];
export const FACING_ROW: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 };

/** Column meanings within a facing row. */
export const POSE = { stand: 0, stepA: 1, stepB: 2, act: 3, hurt: 4, down: 5 } as const;
export type PoseName = keyof typeof POSE;

/** The animation controller plays this column sequence for walking. */
export const WALK_SEQUENCE = [POSE.stand, POSE.stepA, POSE.stand, POSE.stepB];

export type BodyFrame = 'slight' | 'average' | 'broad';
export type HairStyle =
  | 'crop'
  | 'bob'
  | 'tail'
  | 'shaved'
  | 'braids'
  | 'long'
  | 'wave'
  | 'bald'
  | 'topknot';
export type Accessory =
  | 'none'
  | 'visor'
  | 'respirator'
  | 'cap'
  | 'earpiece'
  | 'glasses'
  | 'scarf'
  | 'hood';
export type UniformId =
  | 'spinehand'
  | 'medical'
  | 'registry'
  | 'watch'
  | 'loom'
  | 'galley'
  | 'vestibule'
  | 'board'
  | 'civ';

export interface ActorLook {
  frame: BodyFrame;
  /** Index into RAMP.skin — 0 darkest, 5 lightest. Uses 3 adjacent steps. */
  skin: number;
  hair: HairStyle;
  hairColor: string;
  eyeColor: string;
  uniform: UniformId;
  /** Department trim colour — the one hue that identifies a crew member's post. */
  accent: string;
  accessory: Accessory;
}

interface UniformPalette {
  body: PaletteKey;
  shade: PaletteKey;
  light: PaletteKey;
  collar: PaletteKey;
  boot: PaletteKey;
}

/**
 * Uniform colours. Value separation matters more than hue here: the player
 * must be able to pick a watch officer out of a crowd on a dim deck, and that
 * is done with a light collar and a hard trim band, not with a different blue.
 */
const UNIFORMS: Record<UniformId, UniformPalette> = {
  spinehand: { body: 'iron2', shade: 'iron1', light: 'iron3', collar: 'iron4', boot: 'void2' },
  medical: { body: 'bone1', shade: 'bone0', light: 'bone3', collar: 'brine2', boot: 'iron1' },
  registry: { body: 'brine2', shade: 'brine1', light: 'brine3', collar: 'bone2', boot: 'void2' },
  watch: { body: 'iron1', shade: 'void2', light: 'iron3', collar: 'iron4', boot: 'void1' },
  loom: { body: 'rust2', shade: 'rust1', light: 'rust3', collar: 'amber1', boot: 'void2' },
  galley: { body: 'moss2', shade: 'moss1', light: 'moss3', collar: 'bone2', boot: 'iron1' },
  vestibule: { body: 'bone2', shade: 'bone1', light: 'bone3', collar: 'bruise2', boot: 'iron1' },
  board: { body: 'void3', shade: 'void1', light: 'iron2', collar: 'bone2', boot: 'void0' },
  civ: { body: 'iron3', shade: 'iron2', light: 'iron4', collar: 'rust2', boot: 'void2' },
};

export const HAIR_STYLES: HairStyle[] = [
  'crop',
  'bob',
  'tail',
  'shaved',
  'braids',
  'long',
  'wave',
  'topknot',
  'bald',
];

export const ACCESSORIES: Accessory[] = [
  'none',
  'visor',
  'respirator',
  'cap',
  'earpiece',
  'glasses',
  'scarf',
  'hood',
];

export const HAIR_COLORS: string[] = [
  PAL.void1,
  PAL.rust0,
  PAL.rust1,
  PAL.rust2,
  PAL.rust3,
  PAL.amber1,
  PAL.amber3,
  PAL.bone0,
  PAL.bone2,
  PAL.iron2,
  PAL.moss2,
  PAL.brine2,
  PAL.bruise2,
  PAL.ember1,
];

export const EYE_COLORS: string[] = [
  PAL.void1,
  PAL.rust1,
  PAL.brine3,
  PAL.moss3,
  PAL.iron4,
  PAL.amber2,
  PAL.halo2,
];

/**
 * A skin tone and its shading steps.
 *
 * Clamping the index was wrong at both ends of the ramp: at the darkest skin,
 * base, dark and darker all resolved to skin0, so the face had no shading at
 * all and read as a silhouette with eyes. Past the ends the step continues
 * into void or bone instead, which keeps every tone equally legible \x7f the
 * darkest character must be as readable as the lightest.
 */
export function skinTone(i: number, step: number): string {
  const r = RAMP.skin;
  const idx = i + step;
  if (idx < 0) return mix(PAL[r[0]], PAL.void0, Math.min(0.75, -idx * 0.3));
  const top = r.length - 1;
  if (idx > top) return mix(PAL[r[top]], PAL.bone3, Math.min(0.7, (idx - top) * 0.32));
  return PAL[r[idx]];
}

/**
 * Body metrics.
 *
 * The head must never be wider than the shoulders. That single rule is the
 * difference between a character and a bobblehead: arms sit two pixels outside
 * the torso, so the shoulder span is bodyW + 4, and headW is kept below it in
 * every frame. Head height is 7 of the 20 rows the figure actually occupies —
 * about 1:3 — with the crown of hair reading as part of the head rather than
 * as extra skull.
 *
 * A 16px cell cannot hold a naturalistic 1:7 figure (the head would be two
 * pixels across and could not carry a face), so this sits where the readable
 * top-down references sit: stylised, but with the body clearly the larger
 * shape.
 */
function metrics(f: BodyFrame) {
  switch (f) {
    case 'slight':
      return { headW: 7, bodyW: 7, legW: 3 };
    case 'broad':
      return { headW: 8, bodyW: 10, legW: 4 };
    default:
      return { headW: 8, bodyW: 8, legW: 3 };
  }
}

/**
 * Vertical layout, in cell rows. Hair occupies row 2, the head rows 3-9, the
 * torso 10-16, the legs 17-22, and the contact shadow row 23.
 */
const HEAD_TOP = 3;
const HEAD_H = 7;
const TORSO_TOP = 10;
const TORSO_H = 7;
const LEG_TOP = 17;
const LEG_H = 6;
const SHADOW_ROW = 23;
const CX = 8;

/** Erase pixels — used to round the head and cut the silhouette. */
function clr(s: Surface, x: number, y: number, w = 1, h = 1): void {
  s.g.clearRect(x | 0, y | 0, w, h);
}

function isSide(dir: Facing): boolean {
  return dir === 'left' || dir === 'right';
}

// --------------------------------------------------------------------------
// layer painters
// --------------------------------------------------------------------------

/** Contact shadow. Drawn after the outline so it never gets a black rim. */
function drawShadow(s: Surface, m: ReturnType<typeof metrics>): void {
  const w = m.bodyW + 2;
  dither(s, CX - (w >> 1), SHADOW_ROW, w, 1, PAL.void0, 3);
  dither(s, CX - (w >> 1) + 1, SHADOW_ROW - 1, w - 2, 1, PAL.void0, 1);
}

function drawLegs(
  s: Surface,
  look: ActorLook,
  m: ReturnType<typeof metrics>,
  pose: number,
  dir: Facing,
): void {
  const u = UNIFORMS[look.uniform];
  // Trousers are pushed a clear step below the tunic. When they share a value
  // the torso and legs fuse into one tall slab and the figure stops having a
  // waist — the single biggest reason a built sprite reads as assembled.
  const trouser = mix(PAL[u.shade], PAL.void0, 0.3);
  const trouserLit = mix(PAL[u.body], PAL.void0, 0.2);
  // Boots are pushed almost to black. They are the sprite's contact with the
  // deck, and a dark foot is what stops a walking figure looking like it hovers.
  const boot = mix(PAL[u.boot], PAL.void0, 0.45);
  const bootLit = mix(PAL[u.boot], PAL.iron5, 0.35);

  if (isSide(dir)) {
    // Profile legs scissor along x rather than stacking, and the far leg is a
    // step darker so the two never merge into one block. Even standing still
    // they are offset by a pixel — legs perfectly aligned in profile read as a
    // skirt, which is exactly what this looked like before.
    const f = pose === POSE.stepA ? 2 : pose === POSE.stepB ? -2 : 1;
    const back = CX - 2 - f;
    const front = CX - 2 + f;
    rect(s, back, LEG_TOP, 4, LEG_H, mix(trouser, PAL.void0, 0.4));
    rect(s, back, LEG_TOP + LEG_H - 2, 4, 2, mix(boot, PAL.void0, 0.35));
    rect(s, front, LEG_TOP, 4, LEG_H, trouser);
    rect(s, front, LEG_TOP, 4, 1, trouserLit);
    rect(s, front, LEG_TOP, 1, LEG_H, mix(trouser, PAL.void0, 0.45)); // seam
    rect(s, front, LEG_TOP + LEG_H - 2, 4, 2, boot);
    rect(s, front, LEG_TOP + LEG_H - 2, 4, 1, bootLit);
    return;
  }

  const bx = CX - (m.bodyW >> 1);
  const lw = m.legW;
  let lx = bx;
  let rx = bx + m.bodyW - lw;
  let lh = LEG_H;
  let rh = LEG_H;
  // A step is a stride, not a twitch: the trailing leg is a pixel shorter and
  // both shift outward, which is what sells motion at this size.
  if (pose === POSE.stepA) {
    lx -= 1;
    rx += 1;
    rh -= 1;
  } else if (pose === POSE.stepB) {
    lx += 1;
    rx -= 1;
    lh -= 1;
  }

  rect(s, lx, LEG_TOP, lw, lh, trouser);
  rect(s, lx, LEG_TOP, lw, 1, trouserLit);
  rect(s, lx, LEG_TOP + lh - 2, lw, 2, boot);
  rect(s, lx, LEG_TOP + lh - 2, lw, 1, bootLit);

  rect(s, rx, LEG_TOP, lw, rh, mix(trouser, PAL.void0, 0.2));
  rect(s, rx, LEG_TOP, lw, 1, trouser);
  rect(s, rx, LEG_TOP + rh - 2, lw, 2, mix(boot, PAL.void0, 0.2));
  rect(s, rx, LEG_TOP + rh - 2, lw, 1, boot);
}

function drawTorso(
  s: Surface,
  look: ActorLook,
  m: ReturnType<typeof metrics>,
  pose: number,
  dir: Facing,
): void {
  const u = UNIFORMS[look.uniform];
  const body = PAL[u.body];
  const shade = PAL[u.shade];
  const light = PAL[u.light];
  const collar = PAL[u.collar];
  const skin = skinTone(look.skin, 0);
  const skinDark = skinTone(look.skin, -1);

  const bw = isSide(dir) ? m.bodyW - 1 : m.bodyW;
  const bx = CX - (bw >> 1);

  rect(s, bx, TORSO_TOP, bw, TORSO_H, body);
  // Sloped shoulders. A square-cornered torso is a crate; clipping the two top
  // corners is the cheapest pixel there is for making it a person.
  clr(s, bx, TORSO_TOP);
  clr(s, bx + bw - 1, TORSO_TOP);
  rect(s, bx + 1, TORSO_TOP, bw - 2, 1, collar); // collar catches the deck lights
  rect(s, bx, TORSO_TOP + 1, 1, TORSO_H - 1, light);
  rect(s, bx + bw - 1, TORSO_TOP + 1, 1, TORSO_H - 1, shade);
  // waist: the hem sits in shadow so the tunic ends somewhere definite
  rect(s, bx, TORSO_TOP + TORSO_H - 1, bw, 1, mix(shade, PAL.void0, 0.35));

  // department band — the one mark that says which post someone holds
  if (dir === 'down') {
    rect(s, bx + 1, TORSO_TOP + 3, bw - 2, 1, look.accent);
    rect(s, bx + 1, TORSO_TOP + 4, bw - 2, 1, mix(look.accent, PAL.void0, 0.4));
  } else if (dir === 'up') {
    rect(s, bx + 1, TORSO_TOP + 3, bw - 2, 1, mix(look.accent, PAL.void0, 0.25));
  } else {
    rect(s, bx, TORSO_TOP + 3, bw, 1, look.accent);
  }

  const swing = pose === POSE.stepA ? 1 : pose === POSE.stepB ? -1 : 0;
  // The act pose reaches, it does not surrender. Four rows put the hands level
  // with the face; two puts them out in front of the chest, which is what
  // "operating a panel" looks like from above.
  const raise = pose === POSE.act ? 2 : 0;
  const armTop = TORSO_TOP + 1;
  const armH = 5;

  if (isSide(dir)) {
    // One arm, in front of the body, swinging with the stride. It needs a step
    // of separation from the tunic behind it or the profile is a flat plank.
    const ax = bx + 1 + swing;
    rect(s, ax, armTop - raise, 2, armH, mix(shade, PAL.void0, 0.3));
    rect(s, ax, armTop - raise, 1, armH, shade);
    rect(s, ax, armTop - raise, 2, 1, body);
    rect(s, ax, armTop + armH - raise, 2, 1, skin);
    return;
  }

  // Arms sit flush against the torso, so they need their own value or the
  // whole upper body reads as one slab. The inner column is darkest — that
  // single line of separation is what makes the arm legible.
  const arm = mix(shade, PAL.void0, 0.3);
  const lax = bx - 2;
  const rax = bx + bw;
  rect(s, lax, armTop + swing - raise, 2, armH, arm);
  rect(s, lax, armTop + swing - raise, 1, armH, shade);
  rect(s, lax, armTop + swing - raise, 2, 1, body);
  rect(s, rax, armTop - swing - raise, 2, armH, arm);
  rect(s, rax + 1, armTop - swing - raise, 1, armH, shade);
  rect(s, rax, armTop - swing - raise, 2, 1, body);
  // hands
  rect(s, lax, armTop + armH + swing - raise, 2, 1, skin);
  rect(s, rax, armTop + armH - swing - raise, 2, 1, skinDark);
}

function drawHead(s: Surface, look: ActorLook, m: ReturnType<typeof metrics>, dir: Facing): void {
  const base = skinTone(look.skin, 0);
  const dark = skinTone(look.skin, -1);
  const darker = skinTone(look.skin, -2);
  const lite = skinTone(look.skin, 1);

  const hw = isSide(dir) ? m.headW - 1 : m.headW;
  const hx = CX - (hw >> 1);

  // neck first, so the jaw overlaps it
  rect(s, CX - 2, HEAD_TOP + HEAD_H - 1, 4, 2, darker);

  rect(s, hx, HEAD_TOP, hw, HEAD_H, base);
  // rounded skull — square heads read as boxes, not faces
  clr(s, hx, HEAD_TOP);
  clr(s, hx + hw - 1, HEAD_TOP);
  clr(s, hx, HEAD_TOP + HEAD_H - 1);
  clr(s, hx + hw - 1, HEAD_TOP + HEAD_H - 1);

  rect(s, hx, HEAD_TOP + 1, 1, HEAD_H - 2, lite);
  rect(s, hx + hw - 1, HEAD_TOP + 1, 1, HEAD_H - 2, dark);
  rect(s, hx + 1, HEAD_TOP + HEAD_H - 1, hw - 2, 1, dark); // jaw in shadow

  if (dir === 'up') return; // back of the head carries no features

  const ey = HEAD_TOP + 3;
  /**
   * A face four rows tall can hold two marks. Any more and it turns to mud —
   * the earlier version had a brow band, a nose, a cheek and a mouth crammed
   * into the same space and the result read as a smear rather than a face.
   * Eyes and mouth, nothing else.
   *
   * The iris is darkened before it is drawn. A saturated eye colour at one
   * pixel has almost no contrast against skin; the tint still comes through,
   * but the pixel reads as an eye first.
   */
  const iris = mix(look.eyeColor, PAL.void0, 0.45);
  if (dir === 'down') {
    for (const ex of [hx + 1, hx + hw - 3]) {
      rect(s, ex, ey, 2, 1, iris);
      px(s, ex + 1, ey, mix(look.eyeColor, PAL.void0, 0.2));
    }
    rect(s, CX - 1, HEAD_TOP + 5, 2, 1, darker); // mouth
  } else {
    // Profile: one eye set forward, a nose breaking the front edge of the
    // silhouette, and an ear behind it. The nose is what tells the player which
    // way a side-facing sprite is looking without reading the eye at all.
    const ex = dir === 'left' ? hx + 1 : hx + hw - 3;
    rect(s, ex, ey, 2, 1, iris);
    px(s, ex + (dir === 'left' ? 0 : 1), ey, mix(look.eyeColor, PAL.void0, 0.2));
    px(s, dir === 'left' ? hx - 1 : hx + hw, HEAD_TOP + 4, base); // nose
    px(s, hx + (dir === 'left' ? hw - 2 : 1), ey + 1, dark); // ear
  }
}

function drawHair(s: Surface, look: ActorLook, m: ReturnType<typeof metrics>, dir: Facing): void {
  if (look.hair === 'bald') {
    if (dir === 'up') return;
    return;
  }
  const c = look.hairColor;
  const cs = mix(c, PAL.void0, 0.4);
  const cl = mix(c, PAL.bone3, 0.3);
  const hw = isSide(dir) ? m.headW - 1 : m.headW;
  const hx = CX - (hw >> 1);
  const top = HEAD_TOP;

  /**
   * Seen from behind, a head is *mostly hair*. Drawing only a cap there was
   * leaving the back of every crew member's skull as a bare block of skin —
   * the single most obvious tell that these sprites were assembled rather
   * than drawn.
   */
  if (dir === 'up') {
    // Seen from behind the hair must reach the nape, or the sprite turns its
    // back and shows a bald patch the front view never had.
    const depth = look.hair === 'shaved' ? 5 : look.hair === 'crop' ? 7 : 8;
    // The back of a head is a dome, not a brick. Keeping it to the width of the
    // skull and cutting all four corners is what stops the up-facing sprite
    // turning into a rectangle of hair with legs.
    rect(s, hx, top - 1, hw, depth, c);
    rect(s, hx - 1, top + 1, hw + 2, depth - 3, c);
    rect(s, hx + 1, top - 1, hw - 2, 1, cl);
    rect(s, hx + 1, top, hw - 4, 1, cl);
    rect(s, hx + hw - 1, top, 1, depth - 1, cs);
    rect(s, hx + hw, top + 1, 1, depth - 3, cs);
    rect(s, hx + 1, top + depth - 2, hw - 2, 1, cs);
    clr(s, hx, top - 1);
    clr(s, hx + hw - 1, top - 1);
    clr(s, hx - 1, top + 1);
    clr(s, hx + hw, top + 1);
    if (look.hair === 'long' || look.hair === 'bob') {
      rect(s, hx - 1, top + depth - 2, hw + 2, look.hair === 'long' ? 3 : 2, c);
      rect(s, hx + hw, top + depth - 2, 1, 3, cs);
    }
    if (look.hair === 'tail' || look.hair === 'topknot') {
      rect(s, CX - 1, top + depth - 2, 2, 3, c);
      rect(s, CX - 1, top + depth, 2, 1, cs);
    }
    if (look.hair === 'braids') {
      rect(s, hx - 1, top + depth - 2, 1, 4, c);
      rect(s, hx + hw, top + depth - 2, 1, 4, cs);
    }
    return;
  }

  /**
   * From the front and the side, the hairline is the silhouette. A flat cap
   * reads as a helmet; what makes hair look like hair at this size is an
   * irregular bottom edge — temples that come down past the brow, and a
   * parting or fringe that does not.
   */
  const crown = (rows: number, fringe: 'flat' | 'part' | 'sweep' | 'peak') => {
    rect(s, hx - 1, top - 1, hw + 2, rows, c);
    rect(s, hx - 1, top - 1, hw + 2, 1, cl);
    px(s, hx + 1, top, cl); // a highlight off the crown
    px(s, hx + 2, top, cl);
    rect(s, hx + hw, top - 1, 1, rows, cs);
    clr(s, hx - 1, top - 1);
    clr(s, hx + hw, top - 1);
    // temples drop a row past the crown on both sides
    rect(s, hx - 1, top + rows - 1, 1, 2, c);
    rect(s, hx + hw, top + rows - 1, 1, 2, cs);
    if (fringe === 'part') {
      rect(s, hx, top + rows - 1, 2, 1, c);
      px(s, hx + hw - 1, top + rows - 1, cs);
    } else if (fringe === 'sweep') {
      rect(s, hx, top + rows - 1, hw - 2, 1, c);
      px(s, hx + hw - 2, top + rows - 1, cs);
    } else if (fringe === 'peak') {
      px(s, hx + (hw >> 1) - 1, top + rows - 1, c);
    }
  };

  switch (look.hair) {
    case 'shaved':
      rect(s, hx, top, hw, 2, c);
      rect(s, hx, top, hw, 1, cl);
      px(s, hx, top + 2, cs);
      px(s, hx + hw - 1, top + 2, cs);
      clr(s, hx, top);
      clr(s, hx + hw - 1, top);
      break;
    case 'crop':
      crown(3, 'part');
      break;
    case 'bob':
      crown(3, 'flat');
      rect(s, hx - 1, top + 2, 1, 4, c);
      rect(s, hx + hw, top + 2, 1, 4, cs);
      px(s, hx - 1, top + 5, cs);
      px(s, hx + hw, top + 5, cs);
      break;
    case 'long':
      crown(3, 'part');
      rect(s, hx - 1, top + 2, 1, 7, c);
      rect(s, hx + hw, top + 2, 1, 7, cs);
      px(s, hx - 1, top + 8, cs);
      break;
    case 'wave':
      crown(3, 'sweep');
      rect(s, hx - 1, top + 2, 1, 3, c);
      rect(s, hx + hw, top + 3, 1, 3, cs);
      px(s, hx + 2, top - 1, cl);
      break;
    case 'tail':
      crown(3, 'part');
      if (isSide(dir)) {
        rect(s, dir === 'left' ? hx + hw : hx - 1, top + 1, 2, 5, c);
        rect(s, dir === 'left' ? hx + hw : hx - 1, top + 5, 2, 1, cs);
      } else {
        rect(s, hx + hw, top + 2, 1, 4, cs);
        rect(s, hx - 1, top + 2, 1, 2, c);
      }
      break;
    case 'topknot':
      crown(3, 'peak');
      rect(s, CX - 2, top - 3, 4, 2, c);
      rect(s, CX - 2, top - 3, 4, 1, cl);
      px(s, CX + 1, top - 2, cs);
      clr(s, CX - 2, top - 3);
      clr(s, CX + 1, top - 3);
      break;
    case 'braids':
      crown(3, 'flat');
      rect(s, hx - 1, top + 2, 1, 6, c);
      rect(s, hx + hw, top + 2, 1, 6, cs);
      px(s, hx - 1, top + 4, cs);
      px(s, hx - 1, top + 6, cs);
      px(s, hx + hw, top + 4, c);
      px(s, hx + hw, top + 6, c);
      break;
  }
}

function drawAccessory(
  s: Surface,
  look: ActorLook,
  m: ReturnType<typeof metrics>,
  dir: Facing,
): void {
  const hw = isSide(dir) ? m.headW - 1 : m.headW;
  const hx = CX - (hw >> 1);
  const top = HEAD_TOP;
  const ey = top + 3;

  switch (look.accessory) {
    case 'visor':
      // active lattice eyewear — one of the few sanctioned uses of halo
      rect(s, hx, ey, hw, 2, PAL.iron1);
      rect(s, hx, ey, hw, 1, PAL.iron3);
      if (dir !== 'up') rect(s, hx + 1, ey + 1, hw - 2, 1, PAL.halo2);
      if (dir === 'down') px(s, hx + 1, ey + 1, PAL.halo4);
      break;
    case 'glasses':
      if (dir === 'up') break;
      rect(s, hx, ey, hw, 1, PAL.iron4);
      rect(s, hx + 1, ey, 2, 1, mix(PAL.bone3, PAL.brine2, 0.45));
      if (dir === 'down') rect(s, hx + hw - 3, ey, 2, 1, mix(PAL.bone3, PAL.brine2, 0.45));
      px(s, hx + 1, ey, PAL.bone3);
      break;
    case 'respirator':
      if (dir === 'up') break;
      rect(s, hx + 1, top + 4, hw - 2, 3, PAL.iron2);
      rect(s, hx + 1, top + 4, hw - 2, 1, PAL.iron4);
      rect(s, CX - 1, top + 5, 2, 1, PAL.void1);
      break;
    case 'cap': {
      // brim on the facing side only, which is what makes a cap read as a cap
      rect(s, hx - 1, top - 1, hw + 2, 3, PAL.iron1);
      rect(s, hx - 1, top - 1, hw + 2, 1, PAL.iron3);
      clr(s, hx - 1, top - 1);
      clr(s, hx + hw, top - 1);
      rect(s, CX - 2, top, 4, 1, look.accent);
      if (dir === 'down') rect(s, hx - 1, top + 2, hw + 2, 1, PAL.void1);
      else if (isSide(dir)) {
        const bx = dir === 'left' ? hx - 3 : hx + hw;
        rect(s, bx, top + 2, 3, 1, PAL.void1);
      }
      break;
    }
    case 'hood':
      rect(s, hx - 1, top - 2, hw + 2, 4, PAL.iron1);
      rect(s, hx - 1, top - 2, hw + 2, 1, PAL.iron3);
      rect(s, hx - 1, top + 2, 1, 5, PAL.iron1);
      rect(s, hx + hw, top + 2, 1, 5, PAL.void2);
      if (dir !== 'up') rect(s, hx, top + 2, hw, 1, PAL.void1);
      clr(s, hx - 1, top - 2);
      clr(s, hx + hw, top - 2);
      break;
    case 'earpiece':
      if (dir === 'up') break;
      px(s, hx + hw - 1, ey + 1, PAL.amber2);
      px(s, hx + hw - 1, ey + 2, PAL.iron2);
      break;
    case 'scarf': {
      const bw = isSide(dir) ? m.bodyW - 2 : m.bodyW;
      const bx = CX - (bw >> 1);
      rect(s, bx - 1, TORSO_TOP - 1, bw + 2, 2, look.accent);
      rect(s, bx - 1, TORSO_TOP - 1, bw + 2, 1, mix(look.accent, PAL.bone3, 0.35));
      break;
    }
    case 'none':
    default:
      break;
  }
}

// --------------------------------------------------------------------------
// assembly
// --------------------------------------------------------------------------

function drawCell(look: ActorLook, dir: Facing, pose: number): Surface {
  const s = surface(CELL_W, CELL_H);
  const m = metrics(look.frame);

  if (pose === POSE.down) {
    /**
     * Collapsed. Drawn as a figure sprawled across the cell — head to one
     * side, torso, one arm flung out, legs folded — rather than a shrunken
     * standing sprite laid flat, which is what it was and which read as a
     * crate.
     */
    const u = UNIFORMS[look.uniform];
    const body = PAL[u.body];
    const shade = PAL[u.shade];
    const light = PAL[u.light];
    const skin = skinTone(look.skin, 0);
    const skinD = skinTone(look.skin, -1);
    const hair = look.hair === 'bald' ? skin : look.hairColor;

    // legs, folded and splayed toward the low side
    rect(s, 1, 18, 4, 3, shade);
    rect(s, 1, 18, 4, 1, body);
    rect(s, 0, 20, 4, 2, PAL[u.boot]);
    rect(s, 2, 15, 3, 3, mix(shade, PAL.void0, 0.2));
    rect(s, 1, 14, 3, 2, PAL[u.boot]);

    // torso
    rect(s, 4, 15, 7, 7, body);
    rect(s, 4, 15, 7, 1, light);
    rect(s, 4, 21, 7, 1, mix(shade, PAL.void0, 0.25));
    rect(s, 5, 18, 5, 1, look.accent);
    rect(s, 4, 15, 1, 7, light);

    // arm flung up and back — the read that says "went down", not "lay down"
    rect(s, 6, 11, 2, 5, shade);
    rect(s, 5, 11, 2, 1, skin);

    // neck + head, turned away
    rect(s, 10, 16, 2, 3, skinD);
    rect(s, 11, 14, 5, 6, skin);
    rect(s, 11, 14, 5, 1, skinD);
    rect(s, 15, 15, 1, 5, skinD);
    rect(s, 11, 13, 5, 2, hair);
    rect(s, 11, 13, 4, 1, mix(hair, PAL.bone3, 0.3));
    rect(s, 14, 14, 2, 4, mix(hair, PAL.void0, 0.35));
    px(s, 12, 17, skinTone(look.skin, -2)); // closed eye

    outline(s, PAL.void0, true);
    dither(s, 1, SHADOW_ROW, 14, 1, PAL.void0, 3);
    return s;
  }

  if (pose === POSE.hurt) {
    /**
     * A real flinch, not a 2px nudge: the legs stagger, the arms come up, and
     * the head snaps back independently of the body. Drawing the head on its
     * own layer and offsetting it is what produces the whiplash.
     */
    const dx = dir === 'left' ? 2 : dir === 'right' ? -2 : 0;
    const dy = dir === 'up' ? -1 : 1;
    drawLegs(s, look, m, POSE.stepB, dir);
    drawTorso(s, look, m, POSE.act, dir);
    const head = surface(CELL_W, CELL_H);
    drawHead(head, look, m, dir);
    drawHair(head, look, m, dir);
    drawAccessory(head, look, m, dir);
    stamp(s, head, dx, dy);
    outline(s, PAL.void0, true);
    drawShadow(s, m);
    return s;
  }

  drawLegs(s, look, m, pose, dir);
  drawTorso(s, look, m, pose, dir);
  drawHead(s, look, m, dir);
  drawHair(s, look, m, dir);
  drawAccessory(s, look, m, dir);

  // A hard black rim, diagonals included, is what separates a character from a
  // busy deck plate. Every reference sprite worth matching has one.
  outline(s, PAL.void0, true);
  drawShadow(s, m);
  return s;
}

/** Full 6x4 sheet for one look. 96x96 px. */
export function buildActorSheet(look: ActorLook): HTMLCanvasElement {
  const sheet = surface(CELL_W * SHEET_COLS, CELL_H * SHEET_ROWS);
  for (const dir of FACINGS) {
    const row = FACING_ROW[dir];
    for (let col = 0; col < SHEET_COLS; col++) {
      let cell: Surface;
      if (dir === 'right') {
        cell = mirrorX(drawCell(look, 'left', col));
      } else {
        cell = drawCell(look, dir, col);
      }
      stamp(sheet, cell, col * CELL_W, row * CELL_H);
    }
  }
  return sheet.canvas;
}

// --------------------------------------------------------------------------
// portraits
// --------------------------------------------------------------------------

export const PORTRAIT_W = 40;
export const PORTRAIT_H = 48;

export type Expression = 'neutral' | 'concerned' | 'angry' | 'sad' | 'surprised' | 'wry' | 'blank';

/**
 * Portraits are drawn, not upscaled, but they obey the same rules as the world
 * sprites: hard edges, palette ramps, no gradients. The detail budget is higher
 * because there are five times the pixels — and a portrait carrying LESS
 * structure than the 16px sprite beside it is the clearest sign that two
 * different hands (or none) made the art.
 *
 * Anatomy at 40x48: shoulders 38-48, neck 30-39, head 5-32 with a tapered jaw,
 * eyes on row 18, mouth on row 31.
 */
export function buildPortrait(look: ActorLook, expr: Expression = 'neutral'): HTMLCanvasElement {
  const s = surface(PORTRAIT_W, PORTRAIT_H);
  const u = UNIFORMS[look.uniform];
  const base = skinTone(look.skin, 0);
  const dark = skinTone(look.skin, -1);
  const darker = skinTone(look.skin, -2);
  const lite = skinTone(look.skin, 1);

  // Backing: flat and department-tinted, deliberately plain. A busy background
  // behind a face at this size just competes with it.
  rect(s, 0, 0, PORTRAIT_W, PORTRAIT_H, mix(PAL.void1, look.accent, 0.14));
  for (let y = 0; y < PORTRAIT_H; y += 4) rect(s, 0, y, PORTRAIT_W, 1, PAL.void0);

  const cx = 20;
  const headW = look.frame === 'broad' ? 26 : look.frame === 'slight' ? 22 : 24;
  const hx = cx - (headW >> 1);
  const headTop = 3;
  const headH = 31;

  /**
   * Skull silhouette, as an inset per row. The crown rounds off over four
   * rows; the jaw narrows over the last eight to a chin ten pixels across.
   *
   * The earlier version tapered to a point and shaded the taper dark, so the
   * chin ran straight into the neck below it and the whole lower half of the
   * portrait read as one long wedge. Stopping the taper short of a point, and
   * keeping the chin lit rather than shaded, is what separates them.
   */
  const inset = (y: number): number => {
    const fromBottom = headH - 1 - y;
    let i = 0;
    if (y === 0) i = 4;
    else if (y === 1) i = 3;
    else if (y === 2) i = 2;
    else if (y <= 4) i = 1;
    if (fromBottom <= 7) i = Math.max(i, Math.min(7, 8 - fromBottom));
    return i;
  };

  // --- shoulders --------------------------------------------------------
  // A bust should fill its frame. Narrow shoulders low in the panel left the
  // head floating in dead space and made the neck look a foot long.
  const shTop = 36;
  const shW = headW + (look.frame === 'broad' ? 16 : look.frame === 'slight' ? 10 : 13);
  const sx = cx - (shW >> 1);
  rect(s, sx, shTop + 1, shW, PORTRAIT_H - shTop - 1, PAL[u.body]);
  // the trapezius slopes up to the neck; a flat bar reads as a plank
  rect(s, sx + 3, shTop, shW - 6, 1, PAL[u.body]);
  rect(s, sx + 3, shTop, shW - 6, 1, PAL[u.light]);
  rect(s, sx + 1, shTop + 1, shW - 2, 1, PAL[u.light]);
  rect(s, sx, shTop + 2, 2, PORTRAIT_H - shTop - 2, PAL[u.light]);
  rect(s, sx + shW - 2, shTop + 2, 2, PORTRAIT_H - shTop - 2, PAL[u.shade]);
  // collar opens around the neck rather than sitting as a straight bar
  rect(s, cx - 9, shTop, 18, 5, PAL[u.collar]);
  rect(s, cx - 7, shTop, 14, 4, PAL[u.shade]);
  rect(s, cx - 6, shTop, 12, 3, PAL[u.body]);
  rect(s, sx + 3, shTop + 6, 8, 1, look.accent); // department flash
  rect(s, sx + 3, shTop + 7, 5, 1, mix(look.accent, PAL.void0, 0.4));

  // --- neck -------------------------------------------------------------
  // Narrower than the jaw, and drawn first so the chin overlaps it. Only three
  // rows of it are ever visible; more than that is a giraffe.
  rect(s, cx - 5, 28, 10, 10, dark);
  rect(s, cx - 5, 28, 2, 10, base);
  rect(s, cx - 5, 32, 10, 2, darker); // shadow the jaw casts

  // --- head -------------------------------------------------------------
  /**
   * The lit edge is a specular, not a step up the skin ramp. A ramp step is a
   * fixed distance in the palette, so at the darkest tones it lifted the face
   * by almost nothing and every dark-skinned character rendered as a
   * silhouette with eyes. Mixing toward the deck-light colour lifts every tone
   * by the same proportion, so the darkest face is as legible as the lightest.
   */
  const key = mix(lite, PAL.bone3, 0.3);
  /**
   * One pixel of rim on the shadow side. Correct chiaroscuro alone loses the
   * silhouette: the shaded cheek of a dark-skinned character and the dark
   * backing behind it are the same value, so the head has no edge. The rim
   * reads as bounce off the deck plating and costs a single column.
   */
  const rim = mix(base, PAL.bone3, 0.18);
  for (let y = 0; y < headH; y++) {
    const i = inset(y);
    rect(s, hx + i, headTop + y, headW - i * 2, 1, base);
    // form shading: light from the upper left, the far side falls away
    rect(s, hx + i, headTop + y, 2, 1, key);
    rect(s, hx + headW - i - 3, headTop + y, 3, 1, dark);
    px(s, hx + headW - i - 1, headTop + y, rim);
  }
  // cheekbones — the only structure the middle of the face has
  rect(s, hx + 2, headTop + 17, 3, 4, dark);
  rect(s, hx + headW - 5, headTop + 17, 3, 4, darker);

  // --- hair -------------------------------------------------------------
  if (look.hair !== 'bald') {
    const c = look.hairColor;
    const cs = mix(c, PAL.void0, 0.4);
    const cl = mix(c, PAL.bone3, 0.3);
    const crownH = look.hair === 'shaved' ? 7 : 11;
    // The hair mass follows the skull it sits on, one pixel proud of it. The
    // previous version laid a straight dark bar down the right-hand side, and
    // a straight edge is precisely what makes hair read as a moulded helmet.
    for (let y = 0; y < crownH; y++) {
      const i = Math.max(0, inset(y) - 1);
      rect(s, hx + i - 1, headTop + y - 2, headW - i * 2 + 2, 1, c);
      rect(s, hx + headW - i - 3, headTop + y - 2, 3, 1, cs);
    }
    // Sheen: a broken band inside the hair mass, not along its outer edge.
    // On the edge it read as scratches; unbroken it reads as vinyl.
    rect(s, hx + 4, headTop + 1, 6, 1, cl);
    rect(s, hx + 3, headTop + 2, 3, 1, cl);
    px(s, hx + 11, headTop + 2, cl);

    // Hairline: temples come down past the brow, the fringe does not. That
    // asymmetry is the whole difference between hair and a helmet.
    if (look.hair !== 'shaved') {
      rect(s, hx - 1, headTop + crownH - 4, 4, 7, c);
      rect(s, hx + headW - 3, headTop + crownH - 4, 4, 7, cs);
      rect(s, hx + 3, headTop + crownH - 3, 6, 1, c);
      px(s, hx + 9, headTop + crownH - 3, c);
      px(s, hx + headW - 6, headTop + crownH - 2, cs);
    }
    // side locks / lengths
    const len =
      look.hair === 'long' ? 26 : look.hair === 'bob' || look.hair === 'braids' ? 17 : 0;
    if (len) {
      rect(s, hx - 3, headTop + 2, 3, len, c);
      rect(s, hx + headW, headTop + 2, 3, len, cs);
      rect(s, hx - 3, headTop + 2, 1, len, cl);
      if (look.hair === 'braids') {
        for (let y = headTop + 6; y < headTop + 2 + len; y += 4) {
          rect(s, hx - 3, y, 3, 1, cs);
          rect(s, hx + headW, y, 3, 1, c);
        }
      }
    }
    if (look.hair === 'tail') {
      rect(s, hx + headW, headTop + 4, 4, 14, c);
      rect(s, hx + headW + 3, headTop + 6, 1, 12, cs);
    }
    if (look.hair === 'topknot') {
      /**
       * Was drawn at headTop-8, off the top of the canvas: the style was
       * selectable and rendered nothing. There is no headroom above the crown
       * in a 48px bust, so the knot sits high and back instead, where it
       * breaks the silhouette. It needs its own dark rim \x7f drawn in the same
       * hue directly on top of the crown, it simply disappeared into it.
       */
      /**
       * A protruding bun does not fit: the crown already starts on row 1 of a
       * 48px bust, so there is no headroom, and every attempt at one read as a
       * box balanced on the head. Bound-up hair is drawn instead \x7f swept
       * back off the temples, gathered under a band. Same silhouette language
       * as the world sprite, which does have room for the knot itself.
       */
      const bandY = headTop + 2;
      rect(s, hx + 1, bandY, headW - 2, 2, mix(c, PAL.void0, 0.55));
      rect(s, hx + 2, bandY + 1, headW - 4, 1, mix(c, PAL.void0, 0.3));
      // swept strands above the band, converging toward the back of the head
      for (let i = 0; i < 5; i++) {
        rect(s, hx + 2 + i * 4, headTop - 1, 2, 3 - (i > 2 ? 1 : 0), cs);
      }
      rect(s, hx + 3, bandY + 2, headW - 8, 1, cs); // the gathered mass below
    }
    if (look.hair === 'wave') {
      // A sweep across the brow, high on one side and low on the other. Two
      // stray highlight pixels were not enough to tell it from a crop.
      rect(s, hx + 2, headTop + crownH - 4, 7, 2, c);
      rect(s, hx + 8, headTop + crownH - 3, 6, 2, c);
      rect(s, hx + 13, headTop + crownH - 2, 5, 2, cs);
      rect(s, hx + 3, headTop + 3, 6, 1, cl);
      rect(s, hx + 9, headTop + 5, 5, 1, cl);
    }
  }

  // --- eyes -------------------------------------------------------------
  // Sat on the widest part of the skull, below the hairline with a brow's worth
  // of forehead between. Anything higher and the fringe lands on the lashes.
  const eyeY = headTop + 15;
  const eyeW = 6;
  const exL = hx + 3;
  const exR = hx + headW - 3 - eyeW;
  const blank = expr === 'blank';
  for (const [ex, inner] of [
    [exL, 1],
    [exR, 2],
  ] as [number, number][]) {
    rect(s, ex, eyeY - 1, eyeW, 1, PAL.void0); // lash line
    rect(s, ex, eyeY, eyeW, 3, blank ? PAL.bone1 : PAL.bone2);
    if (!blank) {
      // iris + pupil + a single catchlight: the catchlight is what makes a
      // painted eye look wet rather than printed
      rect(s, ex + inner, eyeY, 3, 3, look.eyeColor);
      rect(s, ex + inner + 1, eyeY + 1, 1, 1, PAL.void0);
      px(s, ex + inner, eyeY, PAL.bone3);
    }
    rect(s, ex, eyeY + 3, eyeW, 1, dark); // lower lid
    rect(s, ex, eyeY, 1, 3, dark); // inner corner in shadow
  }

  // brows carry most of the expression
  const brow = mix(look.hairColor, PAL.void0, 0.25);
  const bY = eyeY - 4;
  if (expr === 'angry') {
    rect(s, exL, bY + 1, eyeW, 2, brow);
    rect(s, exL + eyeW - 2, bY + 2, 2, 1, brow);
    rect(s, exR, bY + 1, eyeW, 2, brow);
    rect(s, exR, bY + 2, 2, 1, brow);
  } else if (expr === 'sad' || expr === 'concerned') {
    rect(s, exL, bY, eyeW, 2, brow);
    rect(s, exL, bY - 1, 2, 1, brow);
    rect(s, exR, bY, eyeW, 2, brow);
    rect(s, exR + eyeW - 2, bY - 1, 2, 1, brow);
  } else if (expr === 'surprised') {
    rect(s, exL, bY - 2, eyeW, 2, brow);
    rect(s, exR, bY - 2, eyeW, 2, brow);
  } else {
    rect(s, exL, bY, eyeW, 2, brow);
    rect(s, exR, bY, eyeW, 2, brow);
  }

  // --- nose -------------------------------------------------------------
  rect(s, cx + 1, eyeY + 3, 1, 4, dark);
  rect(s, cx - 2, eyeY + 7, 4, 1, dark);
  px(s, cx - 2, eyeY + 6, darker);
  px(s, cx + 1, eyeY + 7, darker);
  rect(s, cx - 1, eyeY + 4, 1, 3, lite);

  // --- mouth ------------------------------------------------------------
  const my = eyeY + 10;
  switch (expr) {
    case 'angry':
      rect(s, cx - 5, my, 10, 1, darker);
      rect(s, cx - 6, my - 1, 2, 1, darker);
      rect(s, cx + 4, my - 1, 2, 1, darker);
      break;
    case 'sad':
      rect(s, cx - 4, my, 8, 1, darker);
      px(s, cx - 5, my - 1, darker);
      px(s, cx + 4, my - 1, darker);
      break;
    case 'surprised':
      rect(s, cx - 3, my - 2, 6, 5, darker);
      rect(s, cx - 2, my - 1, 4, 3, PAL.void1);
      break;
    case 'wry':
      rect(s, cx - 4, my, 8, 1, darker);
      rect(s, cx + 4, my - 1, 2, 1, darker);
      px(s, cx - 5, my + 1, dark);
      break;
    case 'blank':
      rect(s, cx - 4, my, 8, 1, dark);
      break;
    case 'concerned':
      rect(s, cx - 4, my, 7, 1, darker);
      px(s, cx - 5, my + 1, darker);
      break;
    default:
      rect(s, cx - 4, my, 8, 1, darker);
      px(s, cx - 5, my, dark);
      px(s, cx + 4, my, dark);
      break;
  }
  rect(s, cx - 3, my + 2, 6, 1, dark); // shadow under the lower lip

  // --- accessories ------------------------------------------------------
  switch (look.accessory) {
    case 'visor':
      rect(s, hx - 1, eyeY - 3, headW + 2, 8, PAL.iron1);
      rect(s, hx - 1, eyeY - 3, headW + 2, 1, PAL.iron3);
      rect(s, hx + 1, eyeY - 1, headW - 4, 4, PAL.halo1);
      rect(s, hx + 1, eyeY - 1, headW - 4, 1, PAL.halo2);
      rect(s, hx + 2, eyeY, 4, 1, PAL.halo4);
      rect(s, hx - 1, eyeY + 4, headW + 2, 1, PAL.void1);
      break;
    case 'glasses':
      rect(s, exL - 2, eyeY - 3, eyeW + 4, 8, PAL.iron4);
      rect(s, exL - 1, eyeY - 2, eyeW + 2, 6, mix(PAL.bone3, PAL.brine2, 0.55));
      rect(s, exR - 2, eyeY - 3, eyeW + 4, 8, PAL.iron4);
      rect(s, exR - 1, eyeY - 2, eyeW + 2, 6, mix(PAL.bone3, PAL.brine2, 0.55));
      rect(s, exL + eyeW + 2, eyeY, 3, 1, PAL.iron4);
      rect(s, exL, eyeY - 1, 3, 1, PAL.bone3); // lens glare
      rect(s, exR, eyeY - 1, 3, 1, PAL.bone3);
      break;
    case 'respirator':
      rect(s, hx + 1, my - 6, headW - 2, 12, PAL.iron2);
      rect(s, hx + 1, my - 6, headW - 2, 1, PAL.iron4);
      rect(s, cx - 4, my - 3, 8, 6, PAL.void1);
      rect(s, cx - 3, my - 2, 6, 4, PAL.iron1);
      rect(s, cx - 3, my - 2, 6, 1, PAL.iron3);
      break;
    case 'cap':
      rect(s, hx - 2, headTop - 6, headW + 4, 7, PAL.iron1);
      rect(s, hx - 2, headTop - 6, headW + 4, 2, PAL.iron3);
      rect(s, hx - 4, headTop + 1, headW + 8, 3, PAL.void1);
      rect(s, hx - 4, headTop + 1, headW + 8, 1, PAL.iron2);
      rect(s, cx - 4, headTop - 5, 8, 4, look.accent);
      rect(s, cx - 4, headTop - 5, 8, 1, mix(look.accent, PAL.bone3, 0.4));
      break;
    case 'hood':
      rect(s, hx - 4, headTop - 7, headW + 8, 10, PAL.iron1);
      rect(s, hx - 4, headTop - 7, headW + 8, 2, PAL.iron3);
      rect(s, hx - 4, headTop + 3, 4, 26, PAL.iron1);
      rect(s, hx + headW, headTop + 3, 4, 26, PAL.void2);
      rect(s, hx - 2, headTop + 2, headW + 4, 1, PAL.void1);
      break;
    case 'earpiece':
      rect(s, hx + headW - 2, eyeY + 2, 4, 6, PAL.iron2);
      rect(s, hx + headW - 2, eyeY + 2, 4, 1, PAL.iron4);
      px(s, hx + headW, eyeY + 4, PAL.amber2);
      break;
    case 'scarf':
      rect(s, cx - 9, 34, 18, 5, look.accent);
      rect(s, cx - 9, 34, 18, 1, mix(look.accent, PAL.bone3, 0.35));
      rect(s, cx - 9, 38, 18, 1, mix(look.accent, PAL.void0, 0.4));
      break;
    case 'none':
    default:
      break;
  }

  // hard border so the portrait sits cleanly inside a UI panel
  rect(s, 0, 0, PORTRAIT_W, 1, PAL.void0);
  rect(s, 0, PORTRAIT_H - 1, PORTRAIT_W, 1, PAL.void0);
  rect(s, 0, 0, 1, PORTRAIT_H, PAL.void0);
  rect(s, PORTRAIT_W - 1, 0, 1, PORTRAIT_H, PAL.void0);
  return s.canvas;
}

// --------------------------------------------------------------------------
// caching
// --------------------------------------------------------------------------

function lookKey(l: ActorLook): string {
  return `${l.frame}|${l.skin}|${l.hair}|${l.hairColor}|${l.eyeColor}|${l.uniform}|${l.accent}|${l.accessory}`;
}

const sheetCache = new Map<string, HTMLCanvasElement>();
const portraitCache = new Map<string, HTMLCanvasElement>();

export function getActorSheet(look: ActorLook): HTMLCanvasElement {
  const k = lookKey(look);
  let c = sheetCache.get(k);
  if (!c) {
    c = buildActorSheet(look);
    sheetCache.set(k, c);
  }
  return c;
}

export function getPortrait(look: ActorLook, expr: Expression = 'neutral'): HTMLCanvasElement {
  const k = lookKey(look) + '|' + expr;
  let c = portraitCache.get(k);
  if (!c) {
    c = buildPortrait(look, expr);
    portraitCache.set(k, c);
  }
  return c;
}

/** Cache pressure is bounded by the cast list; this exists for scene teardown. */
export function clearActorCaches(): void {
  sheetCache.clear();
  portraitCache.clear();
}

export const DEFAULT_LOOK: ActorLook = {
  frame: 'average',
  skin: 3,
  hair: 'crop',
  hairColor: PAL.rust1,
  eyeColor: PAL.brine3,
  uniform: 'spinehand',
  accent: PAL.amber2,
  accessory: 'none',
};
