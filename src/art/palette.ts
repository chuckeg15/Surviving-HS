/**
 * CANDLEWAKE master palette.
 *
 * Art direction rule: every pixel in the game comes from this table. No system
 * may invent a colour. Ramps are 4-5 steps so that sprites, tiles, lighting and
 * UI all shade against the same values and never drift apart.
 *
 * Families: bone / iron (cold grey) / void (deep black-blue) / brine (muted
 * blue) / moss (faded green) / amber (warning) / ember (emergency red) /
 * halo (cyan accent, used ONLY for tesserae, revenants and interactive glow) /
 * bruise (violet accent, used ONLY for cognitive/anomalous phenomena).
 *
 * The two accent families are deliberately scarce: if everything glows, nothing
 * reads as important.
 */

export const PAL = {
  // --- neutral structure -----------------------------------------------
  void0: '#04070a',
  void1: '#070d11',
  void2: '#0b141a',
  void3: '#111e25',

  iron0: '#18262e',
  iron1: '#22343d',
  iron2: '#2f454f',
  iron3: '#3f5a65',
  iron4: '#55747f',
  iron5: '#7396a0',

  bone0: '#8fa6a6',
  bone1: '#a9bdb9',
  bone2: '#c6d6cf',
  bone3: '#e4ece4',

  // --- cool environment ------------------------------------------------
  brine0: '#0d2230',
  brine1: '#143546',
  brine2: '#1d4d61',
  brine3: '#2a6b81',
  brine4: '#3d8ea3',

  moss0: '#132318',
  moss1: '#1e3a26',
  moss2: '#2f5a36',
  moss3: '#457c47',
  moss4: '#6aa15f',

  // --- warm machinery / warnings ---------------------------------------
  rust0: '#2a1a12',
  rust1: '#452a1a',
  rust2: '#6b4025',
  rust3: '#96602f',

  amber0: '#5c3a08',
  amber1: '#96650f',
  amber2: '#d29a21',
  amber3: '#f5cc57',

  ember0: '#3d0d12',
  ember1: '#71161c',
  ember2: '#ab2a28',
  ember3: '#e0533f',

  // --- accents (scarce) -------------------------------------------------
  halo0: '#0c3a3a',
  halo1: '#14655e',
  halo2: '#22988a',
  halo3: '#54e0c8',
  halo4: '#a9f5e6',

  bruise0: '#1e1230',
  bruise1: '#37205a',
  bruise2: '#5a3690',
  bruise3: '#8f63c9',

  skin0: '#3a2018',
  skin1: '#5c3324',
  skin2: '#8a4f33',
  skin3: '#b0714a',
  skin4: '#d09a70',
  skin5: '#e8c39c',
} as const;

export type PaletteKey = keyof typeof PAL;

/** Named ramps, dark -> light. Used by the art generator for consistent shading. */
export const RAMP = {
  iron: ['iron0', 'iron1', 'iron2', 'iron3', 'iron4', 'iron5'],
  bone: ['iron2', 'bone0', 'bone1', 'bone2', 'bone3'],
  brine: ['brine0', 'brine1', 'brine2', 'brine3', 'brine4'],
  moss: ['moss0', 'moss1', 'moss2', 'moss3', 'moss4'],
  rust: ['rust0', 'rust1', 'rust2', 'rust3', 'amber2'],
  amber: ['amber0', 'amber1', 'amber2', 'amber3'],
  ember: ['ember0', 'ember1', 'ember2', 'ember3'],
  halo: ['halo0', 'halo1', 'halo2', 'halo3', 'halo4'],
  bruise: ['bruise0', 'bruise1', 'bruise2', 'bruise3'],
  void: ['void0', 'void1', 'void2', 'void3'],
  skin: ['skin0', 'skin1', 'skin2', 'skin3', 'skin4', 'skin5'],
} as const satisfies Record<string, readonly PaletteKey[]>;

export type RampKey = keyof typeof RAMP;

export function ramp(key: RampKey, step: number): string {
  const r = RAMP[key];
  return PAL[r[Math.max(0, Math.min(r.length - 1, step | 0))]];
}

/** #rrggbb -> [r,g,b] 0-255 */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** #rrggbb -> 0xrrggbb, for Three.js colour params. */
export function hexInt(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/** Blend two palette colours in sRGB space. t=0 -> a. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    '#' +
    ((1 << 24) | (f(ar, br) << 16) | (f(ag, bg) << 8) | f(ab, bb))
      .toString(16)
      .slice(1)
  );
}

/**
 * Department accent colours. Each ship department owns a hue so that a player
 * glancing at a corridor can tell where they are without reading a sign.
 */
export const DEPARTMENT_TINT = {
  habitation: 'rust2',
  commons: 'amber1',
  medical: 'bone1',
  engineering: 'amber2',
  registry: 'brine3',
  security: 'ember2',
  hydroponics: 'moss3',
  spine: 'iron3',
  cargo: 'iron2',
  command: 'brine4',
  vestibule: 'bruise2',
} as const satisfies Record<string, PaletteKey>;

export type Department = keyof typeof DEPARTMENT_TINT;
