# CANDLEWAKE — ART DIRECTION

**Status:** the pixel-art identity *as built*. Every rule below is enforced by
code in `src/art/` and was read out of that code, not from intent. Where the
game currently fails its own rules, §9 says so.

Canon is `docs/CANON.md`. Tonal references (cold monumental sci-fi; industrial
lived-in horror) are tone only — no borrowed designs, names, or assets. Every
pixel in this game is generated at runtime from the palette below. There are no
image files in the repository.

---

## 1. The two grids

| Grid | Size | Where |
|---|---|---|
| Tile | **16 × 16** | `src/art/tiles.ts`, 111 tiles in a 16-column atlas (256 × 112) |
| Character cell | **16 × 24** | `src/art/actors.ts`, 6 poses × 4 facings = 96 × 96 per sheet |
| Portrait | **40 × 48** | `src/art/actors.ts` |
| Internal resolution | **384 × 216** | `src/core/screen.ts` — exactly 1920×1080 ÷ 5 |

384 × 216 was chosen so that the most common desktop display lands on a whole
number scale with no resampling at all. Scaling is **integer only**; the game
letterboxes rather than blurring. At 16px tiles that is a 24 × 13.5 tile
viewport — roughly double a Game Boy's field of view, which the mystery needs,
because rooms have to read as *places* rather than as keyholes.

---

## 2. Palette

The only legal source of colour is `PAL` / `RAMP` in `src/art/palette.ts`. No
system may invent a colour, and no file outside `palette.ts` contains a literal
hex value. The eleven ramps:

| Ramp | Steps | Role |
|---|---|---|
| `void` | 4 | deep black-blue. Outlines, shadow, the space behind everything |
| `iron` | 6 | cold grey. Structure, decking, the neutral connective tissue |
| `bone` | 5 | off-white. Medical, sterile spaces, high-value surfaces |
| `brine` | 5 | muted blue. Registry, cold rooms, precision |
| `moss` | 5 | faded green. Hydroponics, galley |
| `rust` | 5 | warm brown-orange. Habitation, wear, lived-in surfaces |
| `amber` | 4 | warning. Machinery tell-tales, hazard, engineering |
| `ember` | 4 | emergency. Alarm states, security, danger |
| `halo` | 5 | **cyan accent — scarce** |
| `bruise` | 4 | **violet accent — scarce** |
| `skin` | 6 | character skin, 6 tones, 3 adjacent steps used per character |

### 2.1 The scarcity rule

This is the single most important rule in the document.

- **`halo` (cyan) means live lattice, and nothing else.** Console screens,
  active terminals, the tessera crate, the loom, projected revenants, a
  visor's eyepiece. That is the whole list.
- **`bruise` (violet) means cognitive or anomalous phenomena, and nothing
  else.** In the tileset it appears on exactly one object: `prop.cradle`, the
  memory-smoothing cradle. In combat it appears on Cognitive-aspect effects.

If cyan is everywhere, it stops meaning "this is live data" and the player
loses the one visual cue that tells them a machine is running. The same logic
protects violet: a colour reserved for *the thing being done to people's
minds* cannot also be decoration.

---

## 3. Department colour-coding as navigation

A player should be able to tell which part of the ship they are in from one
screen, without reading a sign. Each department owns a ramp:

| Department | Ramp family | Character |
|---|---|---|
| Habitation | `rust` + carpet | warm, worn, lived-in |
| Commons | `amber`-lit, warmer decking | softer, social |
| Medical | `bone` + `brine` | sterile, high value, cold |
| Registry | `brine` | cold blue, precise, gridded |
| Spine (ducts) | `iron` + `void` | ribbed, tight, the darkest family |
| Engineering | `rust` + `amber` | hot machinery |
| Hydroponics | `moss` | the only living green aboard |
| Generic decking | `iron` | neutral connective tissue |

`DEPARTMENT_TINT` in `palette.ts` holds the machine-readable version.

---

## 4. Characters

### 4.1 The chibi proportion rule

The figure's head is roughly **40% of its height**. This is not a stylistic
whim: at a 16px-wide cell a naturalistic 1:7 figure has a head about three
pixels across, and three pixels cannot simultaneously hold an eye, a hairline
and a readable silhouette. Every readable top-down RPG character solves this
the same way — make the head big enough to carry the identity and let the body
support it.

Layout in the 16 × 24 cell (`actors.ts`):

| Part | Rows |
|---|---|
| Head | 2–11 (10 rows), 9–10 px wide |
| Torso | 12–18 (7 rows) |
| Legs | 19–22 (4 rows) |
| Contact shadow | 23 |

### 4.2 Non-negotiables for character art

1. **A hard black rim, diagonals included.** `outline(s, PAL.void0, true)`.
   This is what separates a character from busy deck plate. Applied to every
   pose.
2. **Three tones per material minimum** — a lit edge, a base, a shade.
3. **Two-pixel eyes with a dark lash row above.** The smallest mark that reads
   as a gaze rather than a smudge.
4. **Hairlines, not caps.** Temples drop a row past the brow; the fringe does
   not. That asymmetry is the entire difference between hair and a helmet.
5. **Full hair coverage on the back of the head.** Seen from behind a head is
   mostly hair. A bare skull from the rear is the clearest possible sign that
   sprites were assembled rather than drawn.
6. **Arms carry their own value.** Flush against the torso in the same colour,
   the whole upper body reads as one slab.
7. **A step is a stride, not a twitch.** The trailing leg is a pixel shorter,
   both shift outward, the body bobs a pixel.
8. **Right is mirrored from left.** Identical silhouettes in both directions;
   asymmetric mirroring makes the sprite pop when the player turns around.
9. **The department accent band at chest height** is the one mark that says
   which post a crew member holds. It is the reason a stranger in a corridor is
   legible at all.

### 4.3 Portraits

40 × 48, drawn — not upscaled — but obeying the same rules: hard edges, palette
ramps, no gradients. The detail budget is higher because there are five times
the pixels, and **a portrait carrying less structure than the 16px sprite
beside it is the clearest sign that two different hands (or none) made the
art.** Anatomy: shoulders 38–48, neck 30–39, head 5–32 with a tapered jaw,
eyes on row 18, mouth on row 31. Eyes get a lash line, sclera, iris, pupil and
a single catchlight — the catchlight is what makes a painted eye look wet
rather than printed.

Seven expressions (`neutral`, `concerned`, `angry`, `sad`, `surprised`, `wry`,
`blank`) drive brows, lids and mouth together. `blank` is reserved for a
smoothed patient: eyes open, nothing behind them.

---

## 5. Tiles

1. **Seamless tiling.** Floor variants (`.a` / `.b` / `.c`) exist so maps can
   break up repetition. They must differ in detail placement but be **identical
   in average value**, or the floor goes blotchy.
2. **Value structure.** Floors sit dark-mid. Walls sit *lighter* than floors so
   rooms read as boxes. Props must separate in value from the floor they stand
   on — a crate on plate decking must not disappear.
3. **Interactive props are the highest-contrast objects in the room.** Terminal,
   muster, bulletin, breaker, locker, cradle, tessera crate. The player should
   spot what is interactable before any prompt appears.
4. **Detail budget: 2–4 readable ideas per 16 × 16 tile, not twelve.** Rivets
   are punctuation — structural tiles only. Field tiles stay calm. Excessive
   noise is the number one way a tileset fails.
5. **The three-slice wall.** `wall.*.cap` (top lip seen in perspective),
   `wall.*.face` (the vertical face), `wall.*.base` (skirting and floor
   shadow). They stack into a convincing wall.
6. **Consistent perspective.** Top-down with a slight forward tilt. Floors are
   pure top-down; walls show their face; props show their top and a sliver of
   front. Mixed perspective is the fastest way to look assembled from sources.

---

## 6. Lighting

Implemented in `src/render/renderer.ts`.

- **Half-resolution lightmap** (192 × 108), painted on a 2D canvas each frame
  with additive radial gradients over an ambient fill, then composited
  **multiplicatively** in a final full-screen pass.
- **The light is quantised into bands** in the shader (`uSteps`, default 6–8).
  Smooth gradients over pixel art look like a filter bolted on; banded pools of
  light look authored. This is deliberate.
- **`LIGHT_GAIN = 1.7`.** The lightmap canvas can only hold 0..1, but a lit
  room needs to sit at 1.0 (texture shown as authored) with lamps pushing
  *above* it. The canvas stores brightness ÷ gain and the shader multiplies it
  back out. Without this the brightest a room could ever be is "the raw texture,
  undimmed" — which makes every scene look like a power failure. This was an
  actual bug, found by screenshot.
- **Colour management is off end to end.** Three would decode the sRGB atlases
  to linear on sample and re-encode on output, but the final composite is a raw
  `ShaderMaterial` writing straight to the canvas, so the re-encode never
  happens and every pixel lands about a gamma step too dark. Pixel art is
  authored in gamma space and should be multiplied in gamma space: what the
  artist picked is what the screen gets.
- **The camera snaps to whole pixels every frame.** A camera at x = 100.5 turns
  crisp pixel art into shimmering mush the moment the player walks.
- **Flicker is deterministic** — two out-of-phase sines beating against each
  other, so it never reads as a repeating loop — and is suppressed entirely by
  the `reduceFlashing` accessibility setting.
- **`minAmbient` (default 0.22) is a floor.** Navigation must never fail
  because a room is dark.

---

## 7. Interface

All UI is drawn on a 2D canvas sharing the same 384 × 216 grid
(`src/ui/painter.ts`). Nothing in the interface is a DOM element, so the UI can
never scale differently from the game, never anti-aliases, and never picks up a
system font.

The font is **hand-authored, 5 × 8 cell, 6px advance** (`src/art/font.ts`),
encoded as base32 bit rows. Authoring it by hand rather than baking a system
font is the only way to guarantee identical, hard-edged glyphs on every
machine — a baked system font changes shape with whatever the OS has installed.
Codepoints 0x01–0x0C are custom UI icons.

Five panel styles, each with a job: `terminal` (the ship talking), `plate`
(player-side menus), `dialogue` (the most readable surface in the game),
`inset` (list interiors), `ghost` (non-modal annotation).

---

## 8. Never do this

- Never blur or smooth pixel art. No bilinear filtering, no fractional scaling.
- Never use bloom, chromatic aberration, or film grain.
- Never use darkness to hide an unfinished room.
- Never let atmospheric effects reduce the readability of dialogue or a clue.
- Never introduce a colour outside `PAL`.
- Never use `halo` for anything that is not live lattice, or `bruise` for
  anything that is not cognitive/anomalous.
- Never mix detail levels — a smoothly shaded asset next to a 16px sprite
  always reads as imported.
- Never let a character sprite and its portrait disagree about who someone is.
- Never make an interactive prop lower-contrast than the scenery around it.

---

## 9. Where the art currently falls short

Pulled from `KNOWN_ISSUES.md`. Not softened.

- **Portrait hair reads slightly helmet-like on the short crops.** The lengths
  (long / bob / braids) came out better.
- **Deck-plate seams** still read as a slightly regular grid at 5× scale in wide
  rooms, after one round of softening.
- **Commons decking** was over-corrected into flat speckle and then partially
  restored; it still carries less structure than the other floor families.
- **The `act` (interacting) pose is subtle at 1×.**
- **Side-view figures are narrower** and carry less identity than front-facing
  ones.
- **Tables and benches read as flat grey slabs** — they have value separation
  from the floor but almost no internal idea.
- **No frame-by-frame animation review has been done** on the walk cycle in
  motion; it has been judged from a filmstrip, not from video.

`/actors.html` and `/tiles.html` are the review pages. Both show art at 4×
**and** at 1× — judging pixel art only at magnification is how you ship sprites
that fall apart at gameplay size.
