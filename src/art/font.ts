/**
 * CANDLEWAKE bitmap font — hand-authored, 5x8 cell, 6px advance.
 *
 * Every glyph is 8 rows; each row is a base32 digit holding 5 bits, MSB = the
 * leftmost pixel. Caps occupy rows 0-5, lowercase rows 1-5, descenders rows
 * 6-7. Authoring it by hand (rather than baking a system font) is the only way
 * to guarantee identical, hard-edged glyphs on every machine — a baked system
 * font changes shape with whatever the OS has installed.
 *
 * Codepoints 0x01-0x0C are custom UI icons (arrows, cursor, tessera mark).
 */

const B32 = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

// prettier-ignore
const GLYPHS: Record<string, string> = {
  ' ': '00000000',
  '!': '44440400', '"': 'AA000000', '#': '0AVAVA00', '$': '4FKE5U40',
  '%': 'PQ24BJ00', '&': 'CICLID00', "'": '44000000', '(': '24444200',
  ')': '84444800', '*': '0A4V4A00', '+': '004V4000', ',': '00000448',
  '-': '000E0000', '.': '00000400', '/': '11248G00',
  '0': 'EJLPHE00', '1': '4C444E00', '2': 'EH248V00', '3': 'U1E11U00',
  '4': '6AIV2200', '5': 'VGU11U00', '6': 'EGUHHE00', '7': 'V1244400',
  '8': 'EHEHHE00', '9': 'EHHF1E00',
  ':': '00404000', ';': '00400448', '<': '02484200', '=': '00V0V000',
  '>': '08424800', '?': 'EH140400', '@': 'EHJLGE00',
  'A': 'EHHVHH00', 'B': 'UHUHHU00', 'C': 'FGGGGF00', 'D': 'SIHHIS00',
  'E': 'VGUGGV00', 'F': 'VGUGGG00', 'G': 'FGJHHE00', 'H': 'HHVHHH00',
  'I': 'V4444V00', 'J': '1111HE00', 'K': 'HISIHH00', 'L': 'GGGGGV00',
  'M': 'HRLHHH00', 'N': 'HPLJHH00', 'O': 'EHHHHE00', 'P': 'UHUGGG00',
  'Q': 'EHHLID00', 'R': 'UHUKIH00', 'S': 'FGE11U00', 'T': 'V4444400',
  'U': 'HHHHHE00', 'V': 'HHHHA400', 'W': 'HHHLRH00', 'X': 'HHAAHH00',
  'Y': 'HHA44400', 'Z': 'V248GV00',
  '[': '64444600', '\\': 'GG842100', ']': 'C4444C00', '^': '4AH00000',
  '_': '000000V0', '`': '84000000',
  'a': '0E1FHF00', 'b': 'GGUHHU00', 'c': '0EGGGE00', 'd': '11FHHF00',
  'e': '0EHVGE00', 'f': '68U88800', 'g': '0FHHF1U0', 'h': 'GGUHHH00',
  'i': '40C44E00', 'j': '026222IC', 'k': 'GGISIH00', 'l': 'C4444E00',
  'm': '0VLLLL00', 'n': '0UHHHH00', 'o': '0EHHHE00', 'p': '0UHHUGG0',
  'q': '0FHHF110', 'r': '0MOGGG00', 's': '0FGE1U00', 't': '88U88600',
  'u': '0HHHHF00', 'v': '0HHHA400', 'w': '0HHLLA00', 'x': '0HA4AH00',
  'y': '0HHHF1U0', 'z': '0V248V00',
  '{': '64844600', '|': '44444400', '}': 'C4244C00', '~': '000DM000',
  // --- custom UI icons -------------------------------------------------
  '\x01': '004EV000', // up arrow (more entries above)
  '\x02': '00VE4000', // down arrow (more entries below)
  '\x03': '02484200', // left arrow
  '\x04': '08424800', // right arrow
  '\x05': '08CEC800', // solid selection cursor
  '\x06': '0EVVVE00', // filled dot   - state ON / known
  '\x07': '0EHHHE00', // hollow dot   - state OFF / unknown
  '\x08': '0EAAAE00', // tessera mark
  '\x09': '004A4000', // small diamond - clue marker
  '\x0A': '0HA4AH00', // cross        - contradiction marker
  '\x0B': '012K8000', // check        - resolved marker
  '\x0C': '0VHHHV00', // hollow square - unchecked box
  // Em dash. The content files have used \x7f as a dash from the beginning,
  // but the glyph was never authored, so every one of them rendered as a hole
  // in the middle of a sentence.
  '\x7f': '000V0000',
};

export const GLYPH_W = 5;
export const GLYPH_H = 8;
export const ADVANCE = 6;
/** Vertical distance between baselines when wrapping. */
export const LINE_H = 9;

/** Per-glyph bit rows, decoded once. Index: charCode -> Uint8Array(8) | undefined */
const ROWS: (Uint8Array | undefined)[] = [];
/** Trimmed left/right extents so we can render proportionally when asked. */
const EXTENT: ([number, number] | undefined)[] = [];

function decode(): void {
  for (const ch of Object.keys(GLYPHS)) {
    const src = GLYPHS[ch];
    const rows = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      const v = B32.indexOf(src[i] ?? '0');
      rows[i] = v < 0 ? 0 : v;
    }
    ROWS[ch.charCodeAt(0)] = rows;
    let lo = GLYPH_W,
      hi = -1;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (rows[y] & (1 << (GLYPH_W - 1 - x))) {
          if (x < lo) lo = x;
          if (x > hi) hi = x;
        }
      }
    }
    EXTENT[ch.charCodeAt(0)] = hi < 0 ? [0, 2] : [lo, hi];
  }
}
decode();

const FALLBACK = ROWS['?'.charCodeAt(0)]!;

export function glyphRows(code: number): Uint8Array {
  return ROWS[code] ?? FALLBACK;
}

/** Advance width in pixels for one character (monospace grid by default). */
export function charWidth(_code: number): number {
  return ADVANCE;
}

export function textWidth(s: string): number {
  return s.length * ADVANCE;
}

/**
 * Word-wrap to a pixel width, honouring explicit '\n'. Returns lines.
 * Long unbreakable words are hard-split rather than overflowing the box.
 */
export function wrapText(s: string, maxPx: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxPx / ADVANCE));
  const out: string[] = [];
  for (const para of s.split('\n')) {
    if (para.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      let w = word;
      while (w.length > maxChars) {
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= maxChars) line += ' ' + w;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

/** Number of glyph cells that fit in a pixel width. */
export function colsFor(px: number): number {
  return Math.max(1, Math.floor(px / ADVANCE));
}

export { EXTENT as glyphExtent };
