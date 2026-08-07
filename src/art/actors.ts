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
import { Surface, clearAll, mirrorX, outline, px, rect, stamp, surface } from '@/art/pixel';

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

/** Body metrics per frame type, in pixels. */
function metrics(f: BodyFrame) {
  switch (f) {
    case 'slight':
      return { torsoW: 6, torsoX: 5, headW: 6, headX: 5, shoulder: 1 };
    case 'broad':
      return { torsoW: 9, torsoX: 4, headW: 7, headX: 5, shoulder: 2 };
    default:
      return { torsoW: 8, torsoX: 4, headW: 6, headX: 5, shoulder: 1 };
  }
}

const HEAD_TOP = 2;
const HEAD_BOT = 9; // exclusive
const TORSO_TOP = 9;
const TORSO_BOT = 17;
const LEG_TOP = 17;
const FOOT_ROW = 21;

// --------------------------------------------------------------------------
// layer painters
// --------------------------------------------------------------------------

function drawShadow(s: Surface, m: ReturnType<typeof metrics>): void {
  const cx = 8;
  const w = m.torsoW;
  rect(s, cx - (w >> 1), 22, w, 1, PAL.void0);
  rect(s, cx - (w >> 1) + 1, 23, w - 2, 1, PAL.void0);
}

function drawLegs(
  s: Surface,
  look: ActorLook,
  m: ReturnType<typeof metrics>,
  pose: number,
  dir: Facing,
): void {
  const u = UNIFORMS[look.uniform];
  const body = PAL[u.body];
  const shade = PAL[u.shade];
  const boot = PAL[u.boot];
  const cx = 8;
  const legW = m.torsoW >= 8 ? 3 : 2;
  const gap = m.torsoW >= 8 ? 1 : 1;
  const leftX = cx - legW - (gap >> 1) - (gap % 2);
  const rightX = cx + (gap >> 1);

  // step offsets: one leg forward (lower/longer), one back (shorter)
  let lo = 0;
  let ro = 0;
  if (pose === POSE.stepA) {
    lo = -1;
    ro = 1;
  } else if (pose === POSE.stepB) {
    lo = 1;
    ro = -1;
  }
  if (dir === 'left' || dir === 'right') {
    // profile: legs overlap, so scissor them along x instead of stacking
    const fw = pose === POSE.stepA ? 1 : pose === POSE.stepB ? -1 : 0;
    rect(s, cx - 2 + fw, LEG_TOP, 3, FOOT_ROW - LEG_TOP, body);
    rect(s, cx - 2 - fw, LEG_TOP, 3, FOOT_ROW - LEG_TOP, shade);
    rect(s, cx - 2 + fw, FOOT_ROW, 4, 2, boot);
    rect(s, cx - 3 - fw, FOOT_ROW, 4, 2, mix(boot, PAL.void0, 0.35));
    return;
  }
  rect(s, leftX, LEG_TOP, legW, FOOT_ROW - LEG_TOP + lo, body);
  rect(s, rightX, LEG_TOP, legW, FOOT_ROW - LEG_TOP + ro, shade);
  rect(s, leftX, FOOT_ROW + lo, legW, 2, boot);
  rect(s, rightX, FOOT_ROW + ro, legW, 2, mix(boot, PAL.void0, 0.25));
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
  const cx = 8;

  if (dir === 'left' || dir === 'right') {
    const w = Math.max(5, m.torsoW - 2);
    const x = cx - (w >> 1);
    rect(s, x, TORSO_TOP, w, TORSO_BOT - TORSO_TOP, body);
    rect(s, x, TORSO_TOP, 1, TORSO_BOT - TORSO_TOP, light); // leading edge catches light
    rect(s, x + w - 1, TORSO_TOP, 1, TORSO_BOT - TORSO_TOP, shade);
    rect(s, x, TORSO_TOP, w, 1, collar);
    // near arm swings with the walk
    const sw = pose === POSE.stepA ? 1 : pose === POSE.stepB ? -1 : 0;
    const armY = TORSO_TOP + 2 + (pose === POSE.act ? -2 : 0);
    rect(s, x + 1 + sw, armY, 2, 5, shade);
    px(s, x + 1 + sw, armY + 5, skinTone(look.skin, 0));
    return;
  }

  const x = m.torsoX;
  const w = m.torsoW;
  rect(s, x, TORSO_TOP, w, TORSO_BOT - TORSO_TOP, body);
  // vertical shading: light on the left, shade on the right, plus a centre seam
  rect(s, x, TORSO_TOP, 1, TORSO_BOT - TORSO_TOP, light);
  rect(s, x + w - 1, TORSO_TOP, 1, TORSO_BOT - TORSO_TOP, shade);
  rect(s, x, TORSO_TOP, w, 1, collar);

  // accent band: the readable "which department" mark, at chest height
  rect(s, x, TORSO_TOP + 3, w, 1, look.accent);
  if (dir === 'up') rect(s, x + 1, TORSO_TOP + 3, w - 2, 1, mix(look.accent, PAL.void0, 0.3));

  // arms
  const swing = pose === POSE.stepA ? 1 : pose === POSE.stepB ? -1 : 0;
  const armTop = TORSO_TOP + 1;
  const armH = 5;
  const raise = pose === POSE.act ? 3 : 0;
  const lx = x - 1;
  const rx = x + w;
  rect(s, lx, armTop + swing - raise, 1, armH, shade);
  rect(s, rx, armTop - swing - raise, 1, armH, shade);
  // hands
  px(s, lx, armTop + swing - raise + armH, skinTone(look.skin, 0));
  px(s, rx, armTop - swing - raise + armH, skinTone(look.skin, 0));
}

function drawHead(s: Surface, look: ActorLook, m: ReturnType<typeof metrics>, dir: Facing): void {
  const base = skinTone(look.skin, 0);
  const dark = skinTone(look.skin, -1);
  const lite = skinTone(look.skin, 1);
  const cx = 8;
  const hw = dir === 'left' || dir === 'right' ? m.headW - 1 : m.headW;
  const hx = cx - (hw >> 1);

  rect(s, hx, HEAD_TOP, hw, HEAD_BOT - HEAD_TOP, base);
  rect(s, hx + hw - 1, HEAD_TOP, 1, HEAD_BOT - HEAD_TOP, dark); // right side falls off
  rect(s, hx, HEAD_TOP, 1, HEAD_BOT - HEAD_TOP, lite);
  rect(s, hx, HEAD_BOT - 1, hw, 1, dark); // jaw shadow
  // neck
  rect(s, cx - 1, HEAD_BOT - 1, 2, 1, dark);

  if (dir === 'up') return; // back of the head: no features

  if (dir === 'down') {
    const ey = HEAD_TOP + 4;
    px(s, hx + 1, ey, look.eyeColor);
    px(s, hx + hw - 2, ey, look.eyeColor);
    // brow shadow gives the face a readable expression at this size
    rect(s, hx + 1, ey - 1, 1, 1, dark);
    rect(s, hx + hw - 2, ey - 1, 1, 1, dark);
    px(s, cx - 1, ey + 2, dark); // mouth
  } else {
    // profile: one eye, forward on the head
    const ey = HEAD_TOP + 4;
    px(s, hx + 1, ey, look.eyeColor);
    px(s, hx + 1, ey - 1, dark);
    px(s, hx, ey + 2, dark);
    px(s, hx + hw - 1, ey + 1, dark); // ear
  }
}

function drawHair(s: Surface, look: ActorLook, m: ReturnType<typeof metrics>, dir: Facing): void {
  if (look.hair === 'bald') return;
  const c = look.hairColor;
  const cs = mix(c, PAL.void0, 0.35);
  const cl = mix(c, PAL.bone3, 0.25);
  const cx = 8;
  const hw = dir === 'left' || dir === 'right' ? m.headW - 1 : m.headW;
  const hx = cx - (hw >> 1);
  const top = HEAD_TOP;

  const cap = (rows: number) => {
    rect(s, hx, top, hw, rows, c);
    rect(s, hx, top, hw, 1, cl);
    rect(s, hx + hw - 1, top, 1, rows, cs);
  };

  switch (look.hair) {
    case 'shaved':
      cap(1);
      break;
    case 'crop':
      cap(2);
      if (dir !== 'up') rect(s, hx, top + 2, 1, 1, c);
      break;
    case 'bob':
      cap(2);
      rect(s, hx - 1, top + 1, 1, 5, c);
      rect(s, hx + hw, top + 1, 1, 5, cs);
      break;
    case 'long':
      cap(2);
      rect(s, hx - 1, top + 1, 1, 8, c);
      rect(s, hx + hw, top + 1, 1, 8, cs);
      if (dir === 'up') rect(s, hx, top + 2, hw, 7, c);
      break;
    case 'wave':
      cap(2);
      rect(s, hx - 1, top + 1, 1, 4, c);
      rect(s, hx + hw, top + 2, 1, 4, cs);
      px(s, hx + 1, top + 2, cl);
      break;
    case 'tail':
      cap(2);
      if (dir === 'up' || dir === 'left' || dir === 'right') {
        rect(s, cx - 1, top + 2, 2, 6, c);
        rect(s, cx - 1, top + 7, 2, 1, cs);
      } else {
        px(s, hx + hw, top + 2, cs);
      }
      break;
    case 'topknot':
      cap(2);
      rect(s, cx - 1, top - 1, 2, 2, c);
      px(s, cx - 1, top - 1, cl);
      break;
    case 'braids':
      cap(2);
      rect(s, hx - 1, top + 2, 1, 6, c);
      rect(s, hx + hw, top + 2, 1, 6, cs);
      px(s, hx - 1, top + 4, cs);
      px(s, hx + hw, top + 5, c);
      break;
  }
}

function drawAccessory(
  s: Surface,
  look: ActorLook,
  m: ReturnType<typeof metrics>,
  dir: Facing,
): void {
  const cx = 8;
  const hw = dir === 'left' || dir === 'right' ? m.headW - 1 : m.headW;
  const hx = cx - (hw >> 1);
  const top = HEAD_TOP;
  switch (look.accessory) {
    case 'visor':
      // active lattice eyewear is one of the few sanctioned uses of halo
      rect(s, hx, top + 3, hw, 2, PAL.iron1);
      if (dir !== 'up') rect(s, hx, top + 3, hw, 1, PAL.halo2);
      break;
    case 'glasses':
      if (dir === 'up') break;
      rect(s, hx, top + 4, hw, 1, PAL.iron4);
      px(s, hx + 1, top + 4, PAL.bone3);
      px(s, hx + hw - 2, top + 4, PAL.bone2);
      break;
    case 'respirator':
      if (dir === 'up') break;
      rect(s, hx + 1, top + 5, hw - 2, 3, PAL.iron2);
      rect(s, hx + 1, top + 5, hw - 2, 1, PAL.iron4);
      px(s, cx - 1, top + 6, PAL.void1);
      break;
    case 'cap':
      rect(s, hx - 1, top, hw + 2, 2, PAL.iron1);
      rect(s, hx - 1, top, hw + 2, 1, PAL.iron3);
      if (dir === 'down') rect(s, hx - 1, top + 2, hw + 2, 1, PAL.void1);
      break;
    case 'hood':
      rect(s, hx - 1, top - 1, hw + 2, 4, PAL.iron1);
      rect(s, hx - 1, top - 1, hw + 2, 1, PAL.iron3);
      rect(s, hx - 1, top + 3, 1, 4, PAL.iron1);
      rect(s, hx + hw, top + 3, 1, 4, PAL.void2);
      if (dir !== 'up') rect(s, hx, top + 3, hw, 1, PAL.void1);
      break;
    case 'earpiece':
      if (dir === 'up') break;
      px(s, hx + hw - 1, top + 4, PAL.amber2);
      px(s, hx + hw - 1, top + 5, PAL.iron2);
      break;
    case 'scarf':
      rect(s, cx - (m.torsoW >> 1), TORSO_TOP - 1, m.torsoW, 2, look.accent);
      rect(s, cx - (m.torsoW >> 1), TORSO_TOP, m.torsoW, 1, mix(look.accent, PAL.void0, 0.3));
      break;
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
    // collapsed: read as a person on the deck, not a shrunken standing sprite
    const u = UNIFORMS[look.uniform];
    rect(s, 3, 18, 10, 4, PAL[u.body]);
    rect(s, 3, 18, 10, 1, PAL[u.light]);
    rect(s, 3, 21, 10, 1, PAL[u.shade]);
    rect(s, 11, 16, 4, 4, skinTone(look.skin, 0));
    rect(s, 11, 16, 4, 1, look.hairColor);
    rect(s, 2, 22, 12, 1, PAL.void0);
    outline(s, PAL.void0);
    return s;
  }

  drawShadow(s, m);
  drawLegs(s, look, m, pose, dir);
  drawTorso(s, look, m, pose, dir);
  drawHead(s, look, m, dir);
  drawHair(s, look, m, dir);
  drawAccessory(s, look, m, dir);

  if (pose === POSE.hurt) {
    // recoil: whole figure shifted and tinted, so a hit reads without a flash
    const t = surface(CELL_W, CELL_H);
    t.g.drawImage(s.canvas, dir === 'left' ? 1 : dir === 'right' ? -1 : 0, 1);
    clearAll(s);
    stamp(s, t, 0, 0);
  }

  outline(s, PAL.void0);
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
