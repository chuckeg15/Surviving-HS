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
import { Surface, clearAll, dither, mirrorX, outline, px, rect, stamp, surface } from '@/art/pixel';

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

export function skinTone(i: number, step: number): string {
  const r = RAMP.skin;
  const idx = Math.max(0, Math.min(r.length - 1, i + step));
  return PAL[r[idx]];
}

/**
 * Body metrics. Proportions are deliberately chibi — the head is roughly 40% of
 * the figure's height. At a 16px cell a naturalistic 1:7 figure has a head three
 * pixels across, which cannot hold an eye, a hairline and a silhouette at once.
 * Every readable top-down RPG character solves this the same way: make the head
 * big enough to carry the identity, and let the body be a support for it.
 */
function metrics(f: BodyFrame) {
  switch (f) {
    case 'slight':
      return { headW: 9, bodyW: 7, legW: 3 };
    case 'broad':
      return { headW: 10, bodyW: 10, legW: 4 };
    default:
      return { headW: 10, bodyW: 8, legW: 3 };
  }
}

const HEAD_TOP = 2;
const HEAD_H = 10;
const TORSO_TOP = 12;
const TORSO_H = 7;
const LEG_TOP = 19;
const LEG_H = 4;
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
  const trouser = PAL[u.shade];
  const trouserLit = PAL[u.body];
  const boot = PAL[u.boot];
  const bootLit = mix(PAL[u.boot], PAL.iron5, 0.5);

  if (isSide(dir)) {
    // Profile legs scissor along x rather than stacking, and the far leg is a
    // step darker so the two never merge into one block.
    const f = pose === POSE.stepA ? 2 : pose === POSE.stepB ? -2 : 0;
    const back = CX - 2 - f;
    const front = CX - 2 + f;
    rect(s, back, LEG_TOP, 4, LEG_H, mix(trouser, PAL.void0, 0.35));
    rect(s, back, LEG_TOP + LEG_H - 2, 4, 2, mix(boot, PAL.void0, 0.35));
    rect(s, front, LEG_TOP, 4, LEG_H, trouser);
    rect(s, front, LEG_TOP, 4, 1, trouserLit);
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

  const bw = isSide(dir) ? m.bodyW - 2 : m.bodyW;
  const bx = CX - (bw >> 1);

  rect(s, bx, TORSO_TOP, bw, TORSO_H, body);
  rect(s, bx, TORSO_TOP, bw, 1, collar); // collar catches the deck lights
  rect(s, bx, TORSO_TOP + 1, 1, TORSO_H - 1, light);
  rect(s, bx + bw - 1, TORSO_TOP + 1, 1, TORSO_H - 1, shade);
  rect(s, bx + 1, TORSO_TOP + TORSO_H - 1, bw - 2, 1, shade);

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
  const raise = pose === POSE.act ? 4 : 0;
  const armTop = TORSO_TOP + 1;
  const armH = 5;

  if (isSide(dir)) {
    // one arm, in front of the body, swinging with the stride
    const ax = bx + 1 + swing;
    rect(s, ax, armTop - raise, 2, armH, shade);
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
  rect(s, CX - 2, HEAD_TOP + HEAD_H - 2, 4, 3, darker);

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

  const ey = HEAD_TOP + 5;
  if (dir === 'down') {
    // A two-pixel eye with a dark lash row above it is the smallest mark that
    // still reads as a gaze rather than a smudge.
    for (const ex of [hx + 1, hx + hw - 3]) {
      rect(s, ex, ey, 2, 1, PAL.void0);
      rect(s, ex, ey + 1, 2, 1, look.eyeColor);
      px(s, ex, ey + 1, mix(look.eyeColor, PAL.void0, 0.45));
    }
    rect(s, CX - 1, HEAD_TOP + 8, 2, 1, darker); // mouth
    px(s, hx + 1, HEAD_TOP + 7, dark); // cheek
    px(s, hx + hw - 2, HEAD_TOP + 7, darker);
  } else {
    // profile: one eye set forward, plus an ear to stop the head reading flat
    const ex = dir === 'left' ? hx + 1 : hx + hw - 3;
    rect(s, ex, ey, 2, 1, PAL.void0);
    px(s, ex, ey + 1, look.eyeColor);
    rect(s, hx + (dir === 'left' ? 0 : hw - 1), HEAD_TOP + 8, 1, 1, darker);
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
    const depth = look.hair === 'shaved' ? 4 : look.hair === 'crop' ? 7 : 8;
    rect(s, hx - 1, top - 1, hw + 2, depth, c);
    rect(s, hx - 1, top - 1, hw + 2, 1, cl);
    rect(s, hx + 1, top, hw - 3, 1, cl);
    rect(s, hx + hw, top - 1, 1, depth, cs);
    rect(s, hx - 1, top + depth - 1, hw + 2, 1, cs);
    clr(s, hx - 1, top - 1);
    clr(s, hx + hw, top - 1);
    if (look.hair === 'long' || look.hair === 'bob') {
      rect(s, hx - 1, top + depth - 1, hw + 2, look.hair === 'long' ? 4 : 2, c);
      rect(s, hx + hw, top + depth - 1, 1, 3, cs);
    }
    if (look.hair === 'tail' || look.hair === 'topknot') {
      rect(s, CX - 1, top + depth - 1, 2, 4, c);
      rect(s, CX - 1, top + depth + 2, 2, 1, cs);
    }
    if (look.hair === 'braids') {
      rect(s, hx - 1, top + depth - 1, 1, 4, c);
      rect(s, hx + hw, top + depth - 1, 1, 4, cs);
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
    rect(s, hx + 1, top, 3, 1, cl); // a highlight off the crown
    rect(s, hx + hw, top - 1, 1, rows, cs);
    clr(s, hx - 1, top - 1);
    clr(s, hx + hw, top - 1);
    // temples drop a row past the crown on both sides
    rect(s, hx - 1, top + rows - 1, 2, 2, c);
    rect(s, hx + hw - 1, top + rows - 1, 2, 2, cs);
    if (fringe === 'part') {
      rect(s, hx + 1, top + rows - 1, 2, 1, c);
      px(s, hx + 3, top + rows - 1, cs);
    } else if (fringe === 'sweep') {
      rect(s, hx + 1, top + rows - 1, hw - 4, 1, c);
      px(s, hx + hw - 3, top + rows, cs);
    } else if (fringe === 'peak') {
      rect(s, hx + (hw >> 1) - 1, top + rows - 1, 2, 1, c);
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
      crown(4, 'part');
      break;
    case 'bob':
      crown(4, 'flat');
      rect(s, hx - 1, top + 3, 1, 5, c);
      rect(s, hx + hw, top + 3, 1, 5, cs);
      px(s, hx - 1, top + 8, cs);
      px(s, hx + hw, top + 8, cs);
      break;
    case 'long':
      crown(4, 'part');
      rect(s, hx - 1, top + 3, 1, 9, c);
      rect(s, hx + hw, top + 3, 1, 9, cs);
      px(s, hx - 1, top + 11, cs);
      break;
    case 'wave':
      crown(4, 'sweep');
      rect(s, hx - 1, top + 3, 1, 4, c);
      rect(s, hx + hw, top + 4, 1, 4, cs);
      px(s, hx + 2, top, cl);
      break;
    case 'tail':
      crown(4, 'part');
      if (isSide(dir)) {
        rect(s, dir === 'left' ? hx + hw : hx - 1, top + 2, 2, 6, c);
        rect(s, dir === 'left' ? hx + hw : hx - 1, top + 7, 2, 1, cs);
      } else {
        rect(s, hx + hw, top + 3, 1, 4, cs);
        rect(s, hx - 1, top + 3, 1, 2, c);
      }
      break;
    case 'topknot':
      crown(4, 'peak');
      rect(s, CX - 2, top - 4, 4, 3, c);
      rect(s, CX - 2, top - 4, 4, 1, cl);
      px(s, CX + 1, top - 2, cs);
      clr(s, CX - 2, top - 4);
      clr(s, CX + 1, top - 4);
      break;
    case 'braids':
      crown(4, 'flat');
      rect(s, hx - 1, top + 3, 1, 8, c);
      rect(s, hx + hw, top + 3, 1, 8, cs);
      px(s, hx - 1, top + 5, cs);
      px(s, hx - 1, top + 8, cs);
      px(s, hx + hw, top + 6, c);
      px(s, hx + hw, top + 9, c);
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
  const ey = top + 5;

  switch (look.accessory) {
    case 'visor':
      // active lattice eyewear — one of the few sanctioned uses of halo
      rect(s, hx, ey - 1, hw, 3, PAL.iron1);
      rect(s, hx, ey - 1, hw, 1, PAL.iron3);
      if (dir !== 'up') rect(s, hx + 1, ey, hw - 2, 1, PAL.halo2);
      if (dir === 'down') px(s, hx + 1, ey, PAL.halo4);
      break;
    case 'glasses':
      if (dir === 'up') break;
      rect(s, hx, ey, hw, 1, PAL.iron4);
      rect(s, hx + 1, ey, 2, 2, mix(PAL.bone3, PAL.brine2, 0.45));
      if (dir === 'down') rect(s, hx + hw - 3, ey, 2, 2, mix(PAL.bone3, PAL.brine2, 0.45));
      px(s, hx + 1, ey, PAL.bone3);
      break;
    case 'respirator':
      if (dir === 'up') break;
      rect(s, hx + 1, top + 6, hw - 2, 3, PAL.iron2);
      rect(s, hx + 1, top + 6, hw - 2, 1, PAL.iron4);
      rect(s, CX - 1, top + 7, 2, 2, PAL.void1);
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
      rect(s, hx - 1, top - 2, hw + 2, 5, PAL.iron1);
      rect(s, hx - 1, top - 2, hw + 2, 1, PAL.iron3);
      rect(s, hx - 1, top + 3, 1, 6, PAL.iron1);
      rect(s, hx + hw, top + 3, 1, 6, PAL.void2);
      if (dir !== 'up') rect(s, hx, top + 3, hw, 1, PAL.void1);
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
    // Collapsed: a person on the deck, drawn as one, not a shrunken stander.
    const u = UNIFORMS[look.uniform];
    rect(s, 2, 17, 9, 5, PAL[u.body]);
    rect(s, 2, 17, 9, 1, PAL[u.light]);
    rect(s, 2, 21, 9, 1, PAL[u.shade]);
    rect(s, 3, 19, 7, 1, look.accent);
    rect(s, 10, 15, 5, 5, skinTone(look.skin, 0));
    rect(s, 10, 15, 5, 2, look.hairColor);
    rect(s, 10, 14, 4, 1, mix(look.hairColor, PAL.bone3, 0.3));
    px(s, 12, 18, skinTone(look.skin, -2));
    rect(s, 1, 20, 2, 2, PAL[u.boot]);
    outline(s, PAL.void0, true);
    dither(s, 1, SHADOW_ROW, 14, 1, PAL.void0, 3);
    return s;
  }

  drawLegs(s, look, m, pose, dir);
  drawTorso(s, look, m, pose, dir);
  drawHead(s, look, m, dir);
  drawHair(s, look, m, dir);
  drawAccessory(s, look, m, dir);

  if (pose === POSE.hurt) {
    // recoil: the whole figure leans away and drops a pixel
    const t = surface(CELL_W, CELL_H);
    t.g.drawImage(s.canvas, dir === 'left' ? 2 : dir === 'right' ? -2 : 0, 1);
    clearAll(s);
    stamp(s, t, 0, 0);
  }

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
 * Portraits are a separate, larger drawing rather than an upscale of the world
 * sprite — but they use the SAME palette entries and the same hard-edged
 * shading, which is what keeps them from looking like they belong to another
 * game. Detail level is deliberately close to the world sprite's: a smoothly
 * shaded portrait next to a 16px sprite always reads as imported.
 */
export function buildPortrait(look: ActorLook, expr: Expression = 'neutral'): HTMLCanvasElement {
  const s = surface(PORTRAIT_W, PORTRAIT_H);
  const u = UNIFORMS[look.uniform];
  const base = skinTone(look.skin, 0);
  const dark = skinTone(look.skin, -1);
  const darker = skinTone(look.skin, -2);
  const lite = skinTone(look.skin, 1);

  // backing: a flat department-tinted field, deliberately plain so the head reads
  rect(s, 0, 0, PORTRAIT_W, PORTRAIT_H, PAL.void1);
  rect(s, 0, 0, PORTRAIT_W, PORTRAIT_H, mix(PAL.void1, look.accent, 0.12));
  for (let y = 0; y < PORTRAIT_H; y += 4) rect(s, 0, y, PORTRAIT_W, 1, PAL.void0);

  const cx = 20;
  const headW = look.frame === 'broad' ? 22 : look.frame === 'slight' ? 18 : 20;
  const hx = cx - (headW >> 1);
  const headTop = 8;
  const headH = 24;

  // shoulders / uniform
  const shW = headW + (look.frame === 'broad' ? 14 : 10);
  rect(s, cx - (shW >> 1), 36, shW, 12, PAL[u.body]);
  rect(s, cx - (shW >> 1), 36, shW, 1, PAL[u.light]);
  rect(s, cx - (shW >> 1), 36, 1, 12, PAL[u.light]);
  rect(s, cx + (shW >> 1) - 1, 36, 1, 12, PAL[u.shade]);
  rect(s, cx - 6, 36, 12, 3, PAL[u.collar]);
  rect(s, cx - (shW >> 1) + 2, 41, 6, 1, look.accent); // rank/department flash

  // neck
  rect(s, cx - 4, 30, 8, 8, dark);
  rect(s, cx - 4, 30, 8, 2, darker);

  // head
  rect(s, hx, headTop, headW, headH, base);
  rect(s, hx, headTop, 2, headH, lite);
  rect(s, hx + headW - 2, headTop, 2, headH, dark);
  rect(s, hx, headTop + headH - 2, headW, 2, dark);
  rect(s, hx + 2, headTop, headW - 4, 1, lite);
  // cheek shading
  rect(s, hx + 1, headTop + 14, 2, 5, dark);
  rect(s, hx + headW - 3, headTop + 14, 2, 5, darker);

  // hair
  if (look.hair !== 'bald') {
    const c = look.hairColor;
    const cs = mix(c, PAL.void0, 0.4);
    const cl = mix(c, PAL.bone3, 0.3);
    const rows =
      look.hair === 'shaved' ? 3 : look.hair === 'crop' || look.hair === 'topknot' ? 6 : 7;
    rect(s, hx - 1, headTop - 2, headW + 2, rows, c);
    rect(s, hx - 1, headTop - 2, headW + 2, 2, cl);
    rect(s, hx + headW - 2, headTop - 2, 3, rows, cs);
    if (look.hair === 'long' || look.hair === 'bob' || look.hair === 'wave') {
      const len = look.hair === 'bob' ? 14 : 26;
      rect(s, hx - 3, headTop, 3, len, c);
      rect(s, hx + headW, headTop, 3, len, cs);
    }
    if (look.hair === 'braids') {
      rect(s, hx - 3, headTop + 2, 3, 22, c);
      rect(s, hx + headW, headTop + 2, 3, 22, cs);
      for (let y = headTop + 5; y < headTop + 24; y += 4) {
        rect(s, hx - 3, y, 3, 1, cs);
        rect(s, hx + headW, y, 3, 1, c);
      }
    }
    if (look.hair === 'tail') rect(s, cx + (headW >> 1) - 1, headTop + 4, 4, 16, cs);
    if (look.hair === 'topknot') {
      rect(s, cx - 3, headTop - 6, 6, 5, c);
      rect(s, cx - 3, headTop - 6, 6, 2, cl);
    }
  }

  // --- expression -------------------------------------------------------
  const eyeY = headTop + 11;
  const lx = hx + 4;
  const rx = hx + headW - 8;
  const browOff =
    expr === 'angry' ? 0 : expr === 'sad' || expr === 'concerned' ? -1 : expr === 'surprised' ? -2 : 0;

  // eye sockets
  rect(s, lx, eyeY, 4, 3, PAL.bone2);
  rect(s, rx, eyeY, 4, 3, PAL.bone2);
  rect(s, lx, eyeY, 4, 1, dark);
  rect(s, rx, eyeY, 4, 1, dark);
  if (expr === 'blank') {
    // a smoothed patient: eyes open, nothing behind them
    rect(s, lx, eyeY, 4, 3, PAL.bone1);
    rect(s, rx, eyeY, 4, 3, PAL.bone1);
  } else {
    const pw = expr === 'surprised' ? 2 : 2;
    rect(s, lx + 1, eyeY + 1, pw, 2, look.eyeColor);
    rect(s, rx + 1, eyeY + 1, pw, 2, look.eyeColor);
    px(s, lx + 1, eyeY + 1, mix(look.eyeColor, PAL.bone3, 0.5));
    px(s, rx + 1, eyeY + 1, mix(look.eyeColor, PAL.bone3, 0.5));
  }

  // brows carry most of the expression at this size
  const brow = mix(look.hairColor, PAL.void0, 0.2);
  if (expr === 'angry') {
    rect(s, lx, eyeY - 3, 4, 1, brow);
    px(s, lx + 3, eyeY - 2, brow);
    rect(s, rx, eyeY - 3, 4, 1, brow);
    px(s, rx, eyeY - 2, brow);
  } else if (expr === 'sad' || expr === 'concerned') {
    rect(s, lx, eyeY - 3 + browOff, 4, 1, brow);
    px(s, lx, eyeY - 4 + browOff, brow);
    rect(s, rx, eyeY - 3 + browOff, 4, 1, brow);
    px(s, rx + 3, eyeY - 4 + browOff, brow);
  } else {
    rect(s, lx, eyeY - 3 + browOff, 4, 1, brow);
    rect(s, rx, eyeY - 3 + browOff, 4, 1, brow);
  }

  // nose + mouth
  rect(s, cx - 1, eyeY + 4, 2, 3, dark);
  px(s, cx - 2, eyeY + 6, darker);
  const my = eyeY + 10;
  switch (expr) {
    case 'angry':
      rect(s, cx - 4, my, 8, 1, darker);
      px(s, cx - 5, my - 1, darker);
      px(s, cx + 4, my - 1, darker);
      break;
    case 'sad':
      rect(s, cx - 3, my, 6, 1, darker);
      px(s, cx - 4, my - 1, darker);
      px(s, cx + 3, my - 1, darker);
      break;
    case 'surprised':
      rect(s, cx - 2, my - 1, 4, 4, darker);
      rect(s, cx - 1, my, 2, 2, PAL.void1);
      break;
    case 'wry':
      rect(s, cx - 4, my, 7, 1, darker);
      px(s, cx + 3, my - 1, darker);
      break;
    case 'blank':
      rect(s, cx - 3, my, 6, 1, dark);
      break;
    case 'concerned':
      rect(s, cx - 3, my, 6, 1, darker);
      px(s, cx - 4, my, darker);
      break;
    default:
      rect(s, cx - 3, my, 6, 1, darker);
      break;
  }

  // accessories at portrait scale
  if (look.accessory === 'visor') {
    rect(s, hx - 1, eyeY - 1, headW + 2, 6, PAL.iron1);
    rect(s, hx - 1, eyeY - 1, headW + 2, 1, PAL.iron3);
    rect(s, hx + 1, eyeY + 1, headW - 4, 2, PAL.halo2);
    rect(s, hx + 2, eyeY + 1, 3, 1, PAL.halo4);
  } else if (look.accessory === 'glasses') {
    rect(s, lx - 1, eyeY - 1, 6, 5, PAL.iron4);
    rect(s, lx, eyeY, 4, 3, mix(PAL.bone3, PAL.brine2, 0.5));
    rect(s, rx - 1, eyeY - 1, 6, 5, PAL.iron4);
    rect(s, rx, eyeY, 4, 3, mix(PAL.bone3, PAL.brine2, 0.5));
    rect(s, lx + 5, eyeY + 1, 2, 1, PAL.iron4);
    rect(s, lx + 1, eyeY, 2, 1, PAL.bone3);
  } else if (look.accessory === 'respirator') {
    rect(s, hx + 2, my - 4, headW - 4, 9, PAL.iron2);
    rect(s, hx + 2, my - 4, headW - 4, 1, PAL.iron4);
    rect(s, cx - 3, my - 1, 6, 4, PAL.void1);
    rect(s, cx - 2, my, 4, 2, PAL.iron1);
  } else if (look.accessory === 'cap') {
    rect(s, hx - 2, headTop - 4, headW + 4, 5, PAL.iron1);
    rect(s, hx - 2, headTop - 4, headW + 4, 1, PAL.iron3);
    rect(s, hx - 3, headTop + 1, headW + 6, 2, PAL.void1);
    rect(s, cx - 3, headTop - 3, 6, 3, look.accent);
  } else if (look.accessory === 'earpiece') {
    rect(s, hx + headW - 1, eyeY + 1, 3, 4, PAL.iron2);
    px(s, hx + headW, eyeY + 2, PAL.amber2);
  } else if (look.accessory === 'hood') {
    rect(s, hx - 3, headTop - 5, headW + 6, 8, PAL.iron1);
    rect(s, hx - 3, headTop - 5, headW + 6, 2, PAL.iron3);
    rect(s, hx - 3, headTop + 3, 3, 22, PAL.iron1);
    rect(s, hx + headW, headTop + 3, 3, 22, PAL.void2);
  } else if (look.accessory === 'scarf') {
    rect(s, cx - 8, 34, 16, 4, look.accent);
    rect(s, cx - 8, 34, 16, 1, mix(look.accent, PAL.bone3, 0.3));
  }

  // frame the portrait so it sits inside UI panels cleanly
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
