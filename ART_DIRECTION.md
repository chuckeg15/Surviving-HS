# CANDLEWAKE — ART DIRECTION

**Status:** derived from `docs/CANON.md`. Canon is law.

**What this document is for:** the pixel-art identity *as built*. Every number,
ramp name and rule below was read out of `src/art/palette.ts`,
`src/art/pixel.ts`, `src/art/tiles.ts`, `src/art/actors.ts` and
`src/render/renderer.ts`. Where the code and the intent differ, the code is
reported and the difference is marked.

**Scope warning.** What exists today is the Chapter One vertical slice: six
rooms on Deck C, one tile atlas, one character generator, one lighting model.
Anything in this document describing art for Decks A, B, D, E or F is design
intent and is labelled as such inline. See `KNOWN_ISSUES.md` and §11.

Cross-references: `TECHNICAL_ARCHITECTURE.md` (presentation contract, batching),
`SHIP_LAYOUT.md` (which department owns which visual family),
`PERFORMANCE_BUDGET.md` (atlas budgets), `QUALITY_RUBRIC.md` §Visual (the bar).

---

## 1. The grid

Everything descends from one decision: the game is authored at a fixed internal
resolution and never resampled.

| Quantity | Value | Where it lives |
|---|---|---|
| Internal resolution | **384 x 216** | `src/core/screen.ts` |
| Upscale | integer factors only; 5x is exactly 1920x1080 | `Screen` |
| Tile | **16 x 16 px** (`TILE_PX`) | `src/art/tiles.ts` |
| Character cell | **16 wide x 24 tall**, feet on row 22, contact shadow on row 23 | `src/art/actors.ts` |
| Sprite sheet per look | 6 columns x 4 rows = **96 x 96 px** | `buildActorSheet` |
| Portrait | **40 x 48 px** | `buildPortrait` |
| Font | hand-authored **5 x 8** bitmap, base32 bit rows | `src/art/font.ts` |
| Tile atlas | 111 tiles, 16 columns, **256 x 112 px**, one texture | `buildTileAtlas` |
| Sprite atlas | **1024 x 1024**, shared by every actor and effect | `src/render/atlas.ts` |

The 16px tile and the 16x24 cell are the same width on purpose: a character
occupies exactly one tile of floor and overhangs it by half a tile upward, so
collision is tile-exact while the figure still reads as a body rather than a
token.

**There are no external assets.** Every tile, sprite, portrait, glyph and sound
is generated at runtime from code in this repository. All generation is
deterministic — seeded `Rng` only, never `Math.random` — so the atlas is
byte-identical on every machine and a visual regression is always a code change.

Three modules own the pipeline and nothing may bypass them:

- `palette.ts` — the only legal source of colour. No system may invent a hex.
- `pixel.ts` — the only legal drawing primitives. Integer coordinates, no alpha
  blending except explicit stipple, shading by ramp step rather than opacity.
- `tiles.ts` / `actors.ts` — compositions of those primitives, nothing else.

---

## 2. The palette

Ten ramps, 4–6 steps each, plus a six-step skin ramp. Ramps are short so that
sprites, tiles, lighting and UI shade against the same values and never drift.

### 2.1 The real table

| Family | Keys and values | Role |
|---|---|---|
| **void** | `void0 #04070a` `void1 #070d11` `void2 #0b141a` `void3 #111e25` | Outline black, keylines, the clear colour, the darkest structure |
| **iron** | `iron0 #1d2c34` `iron1 #334a55` `iron2 #46626e` `iron3 #5c7d89` `iron4 #7a9ba5` `iron5 #9dbcc4` | The neutral structural ramp — the most-used family in the game |
| **bone** | (`iron2`) `bone0 #8fa6a6` `bone1 #a9bdb9` `bone2 #c6d6cf` `bone3 #e4ece4` | Medical, light sources, text, highlights |
| **brine** | `brine0 #0d2230` `brine1 #143546` `brine2 #1d4d61` `brine3 #2a6b81` `brine4 #3d8ea3` | Registry, command, cold water light |
| **moss** | `moss0 #132318` `moss1 #1e3a26` `moss2 #2f5a36` `moss3 #457c47` `moss4 #6aa15f` | Hydroponics, galley |
| **rust** | `rust0 #2a1a12` `rust1 #452a1a` `rust2 #6b4025` `rust3 #96602f` (`amber2`) | Habitation, engineering, wear |
| **amber** | `amber0 #5c3a08` `amber1 #96650f` `amber2 #d29a21` `amber3 #f5cc57` | Warning, hazard stripe, working light |
| **ember** | `ember0 #3d0d12` `ember1 #71161c` `ember2 #ab2a28` `ember3 #e0533f` | Emergency, security, refusal |
| **halo** | `halo0 #0c3a3a` `halo1 #14655e` `halo2 #22988a` `halo3 #54e0c8` `halo4 #a9f5e6` | **Reserved.** Live lattice only — see §7 |
| **bruise** | `bruise0 #1e1230` `bruise1 #37205a` `bruise2 #5a3690` `bruise3 #8f63c9` | **Reserved.** Cognitive/anomalous phenomena only — see §7 |
| **skin** | `skin0 #3a2018` `skin1 #5c3324` `skin2 #8a4f33` `skin3 #b0714a` `skin4 #d09a70` `skin5 #e8c39c` | Faces and hands; a look uses three adjacent steps |

Note the two ramps that borrow: `RAMP.bone` starts on `iron2` and `RAMP.rust`
ends on `amber2`. That is deliberate — it ties the light family to the
structural family at its dark end and the wear family to the warning family at
its light end, so a rusted panel and a hazard stripe are literally the same
colour where they meet.

### 2.2 Value structure — the one rule that makes a room read as a box

- Floors live in the dark-mid band: `iron1`, `rust1`, `brine1`, `moss1`,
  `void2`.
- Wall faces sit **one to two ramp steps lighter** than the floor they meet.
  Deck plate on `iron1`, wall faces on `iron2`, wall caps on `iron3`.
- Props separate from their deck by **hue and value**, and carry a `void1`
  keyline plus a contact shadow so nothing floats.

The iron ramp is deliberately mid-range rather than dark. The lightmap
multiplies *down* from the authored substrate; authoring the substrate dark once
means every room in the game looks like a power failure. This was a real
regression, found by frame inspection and fixed (`CHANGELOG.md`).

---

## 3. Department colour-coding as a navigation aid

A player who looks up from the dialogue box should know where they are without
reading a sign. Colour is the first channel; floor family, wall family, ambient
tint and a named landmark are the rest (`SHIP_LAYOUT.md`).

`DEPARTMENT_TINT` in `palette.ts` is the declared assignment:

| Department | Ramp key | Built today? |
|---|---|---|
| habitation | `rust2` | **yes** — `c-bunk` |
| commons | `amber1` | **yes** — `c-commons` |
| registry | `brine3` | **yes** — `c-muster` |
| security | `ember2` | **yes** — `c-watch` |
| spine | `iron3` | **yes** — `c-corridor` |
| cargo | `iron2` | **yes** — `spine-duct` |
| medical | `bone1` | no — tiles exist, no room |
| engineering | `amber2` | no |
| hydroponics | `moss3` | no |
| command | `brine4` | no |
| vestibule | `bruise2` | no |

**Honest note.** `DEPARTMENT_TINT` is currently *declarative only*. The
`Department` type it exports is used by `RoomDef`, but no code path reads the
tint values. Department identity in the six built rooms is carried instead by
the floor family, the wall family, the ambient preset and the landmark text; on
actors it is carried by the per-look `accent` field, which is set by hand in
`content.ts` (backgrounds) and `npcs.ts` (crew). Either wire the table up or
delete it — a colour table nobody reads will drift out of agreement with the
art within two sprints.

### 3.1 Tile families by department

Assignments as authored in `tiles.ts`:

| Department | Floor family | Wall family | Signature props |
|---|---|---|---|
| Habitation | `floor.carpet.*` | `wall.hab.*` | `prop.bunk.head/foot`, `prop.locker`, `prop.rug` |
| Commons | `floor.commons.*` | `wall.hab.*` | `prop.counter.l/m/r`, `prop.kettle`, `prop.table` |
| Registry | `floor.registry.*` | `wall.reg.*` | `prop.muster`, `prop.terminal`, `prop.bench` |
| Security / connective | `floor.plate.*` | `wall.iron.*` | `prop.locker`, `prop.terminal`, `prop.sign.dept` |
| Spine / duct | `floor.mesh.*`, `floor.grate.*` | `wall.spine.*` | `over.duct`, `prop.valve`, `prop.debris` |
| Medical *(design intent — no room)* | `floor.med.*` | `wall.med.*` | `prop.medbed`, `prop.medcart`, `prop.cradle` |
| Hydroponics *(design intent — no room)* | `floor.soil.*` | — | `prop.plant.a/b` |

---

## 4. The character cell

### 4.1 The chibi proportion rule, and why

**The head block is 10 of the cell's 24 rows — roughly 40% of the drawn
figure.** This is not a style flourish; it is forced by the cell size.

At a 16px cell a naturalistic 1:7 figure has a head **three pixels across**.
Three pixels cannot simultaneously hold an eye, a hairline and a silhouette. One
of the three has to go, and whichever goes takes the character's identity with
it: without the eye you have a mannequin, without the hairline every crew member
is the same person in a different uniform, without the silhouette the figure
dissolves into the deck plate. Every readable top-down RPG character solves this
the same way — make the head large enough to carry the identity and let the body
be a support for it.

The trade is real and should be stated: the figures cannot carry adult body
language. Weight, gait and posture have to be spent on the head and on the
walk cycle instead.

### 4.2 Cell anatomy (constants from `actors.ts`)

| Feature | Rows | Notes |
|---|---|---|
| Hair crown | 0–1 (draws to `top - 1`, topknot to `top - 4`) | Overhangs the head block |
| Head | `HEAD_TOP` 2 → `HEAD_TOP + HEAD_H` 11 | `HEAD_H = 10` |
| Neck | 10–12 | Drawn first so the jaw overlaps it |
| Torso | `TORSO_TOP` 12 → 18 | `TORSO_H = 7` |
| Department band | 15–16 (front), 15 (back), 15 (side) | The one mark that says which post someone holds |
| Legs | `LEG_TOP` 19 → 22 | `LEG_H = 4` |
| Contact shadow | `SHADOW_ROW` 23 | Dithered `void0`, drawn *after* the outline so it never gets a rim |
| Centre line | `CX` = 8 | — |

Body frames:

| Frame | headW | bodyW | legW |
|---|---|---|---|
| slight | 9 | 7 | 3 |
| average | 10 | 8 | 3 |
| broad | 10 | 10 | 4 |

Side-facing figures narrow: head `headW - 1`, body `bodyW - 2`.

### 4.3 The sheet

6 columns x 4 rows. Columns are poses: `stand, stepA, stepB, act, hurt, down`.
Rows are facings: `down, up, left, right`.

- **Walk sequence** is `stand → stepA → stand → stepB`. Four beats, not two.
- **Right is mirrored from left.** The silhouette is then identical in both
  directions. Drawing right independently is a classic source of "the sprite
  pops when I turn around".
- **A step is a stride, not a twitch.** On `stepA`/`stepB` the trailing leg is
  a pixel shorter and both legs shift outward. In profile the legs scissor along
  x rather than stacking, and the far leg is one step darker so the two never
  merge into one block.
- **`hurt` is the whole figure translated** 2px away from the facing and 1px
  down. That is a recoil, not a flinch drawing — see §11.
- **`down` is drawn as a separate composition**, not a shrunken stander: torso
  on the deck, head to one side, one boot showing.

### 4.4 The uniform table (real, from `actors.ts`)

Value separation matters more than hue. A watch officer must be pickable out of
a crowd on a dim deck, and that is done with a light collar and a hard trim band
— not with a different blue.

| Uniform | body | shade | light | collar | boot |
|---|---|---|---|---|---|
| `spinehand` | iron2 | iron1 | iron3 | iron4 | void2 |
| `medical` | bone1 | bone0 | bone3 | brine2 | iron1 |
| `registry` | brine2 | brine1 | brine3 | bone2 | void2 |
| `watch` | iron1 | void2 | iron3 | iron4 | void1 |
| `loom` | rust2 | rust1 | rust3 | amber1 | void2 |
| `galley` | moss2 | moss1 | moss3 | bone2 | iron1 |
| `vestibule` | bone2 | bone1 | bone3 | **bruise2** | iron1 |
| `board` | void3 | void1 | iron2 | bone2 | void0 |
| `civ` | iron3 | iron2 | iron4 | rust2 | void2 |

Two of these are storytelling in a colour table and should not be quietly
"improved":

- **`vestibule` is the only uniform with a bruise collar.** The Vestibule are
  the custodians of casting; the violet at the throat is the only place on a
  person where the cognitive accent is legal.
- **`board` is the darkest uniform in the game** — `void3` body on a `void0`
  boot, with one bone collar. Sabbat should read as a hole in the corridor.

### 4.5 Layer rules

- **Arms get their own value.** They sit flush against the torso; the inner
  column is darkest (`mix(shade, void0, 0.3)`). That single line of separation
  is the whole difference between a body and one slab.
- **The collar catches the deck lights** — one row of `collar` at the top of
  the torso, always.
- **From behind, a head is mostly hair.** The `up` facing draws hair over the
  full skull width plus one pixel either side, depth 4 (shaved) / 7 (crop) / 8
  (everything else), with lengths and tails hanging below it. Drawing only a cap
  there was the single most obvious tell that these sprites were assembled
  rather than drawn.
- **The hairline is the silhouette.** A flat cap reads as a helmet. Hair reads
  as hair because of an irregular bottom edge: temples drop one row past the
  crown on both sides, and the fringe (`flat` / `part` / `sweep` / `peak`) does
  not. Nine styles: crop, bob, tail, shaved, braids, long, wave, topknot, bald.
- **A two-pixel eye with a dark lash row above it** is the smallest mark that
  reads as a gaze rather than a smudge. Profile gets one eye set forward plus an
  ear, so the head does not read flat.
- Eight accessories: none, visor, respirator, cap, earpiece, glasses, scarf,
  hood. The cap's brim is drawn on the facing side only — that is what makes a
  cap read as a cap at 16px.

---

## 5. The portrait

40 x 48. Drawn, not upscaled, and obeying the same rules as the world sprite:
hard edges, palette ramps, no gradients. The detail budget is higher because
there are five times the pixels — and **a portrait carrying less structure than
the 16px sprite beside it is the clearest possible sign that two different hands
(or none) made the art.** That was the state of the portraits before they were
rebuilt.

| Feature | Rows | Notes |
|---|---|---|
| Backing | 0–47 | Flat `mix(void1, accent, 0.14)`, scanned with a `void0` row every 4. Deliberately plain: a busy background at this size just competes with the face |
| Head | 5–32 | Rounded crown (3-row inset), tapered jaw over the last 8 rows into a chin |
| Brows | 13–14 (moves with expression) | Carry most of the expression |
| Eyes | 18–21 | Lash line, sclera, iris, pupil, one catchlight. The catchlight is what makes an eye look wet rather than printed |
| Nose | 22–27 | A vertical shadow, a base line, one lit column |
| Mouth | 31 | Seven expression variants |
| Neck | 29–38 | Jaw casts a shadow onto it |
| Shoulders / collar | 38–47 | Collar opens around the neck instead of sitting as a straight bar; department flash at rows 43–44 |
| Border | edges | 1px `void0` so the portrait sits cleanly in a UI panel |

Head width by frame: slight 20, average 22, broad 24.

Form shading is a single directional decision — light from the upper left, two
columns lit on the left inset, three shaded on the right, cheekbones under the
eyes, a dark band under the chin.

Seven expressions: `neutral, concerned, angry, sad, surprised, wry, blank`.
`blank` desaturates the eye to `bone1` with no iris — reserved for revenants and
for people who have been smoothed.

*(Minor drift: the docstring in `buildPortrait` says the neck is rows 30–39; the
code draws 29–38. The code is right; the comment is off by one.)*

---

## 6. Never do this

1. **Never invent a colour.** If a hex does not come from `PAL`, it does not
   ship. This is checkable by grep and should be.
2. **Never shade with opacity.** Shading is a ramp step. Alpha blending is
   permitted only as explicit stipple through `dither()`.
3. **Never draw on a non-integer coordinate.** Every primitive in `pixel.ts`
   floors its inputs; do not defeat it upstream.
4. **Never use halo or bruise decoratively.** See §7.
5. **Never let a floor and the wall enclosing it sit within one ramp step.**
   The room stops reading as a box.
6. **Never draw a character without the hard black rim** (`outline(s, void0,
   true)` — diagonals included). Without it the figure dissolves into deck
   plate.
7. **Never mix perspectives in one tile.** Floors are pure top-down. Walls show
   a vertical face in three stacked slices. Props show a top surface plus a
   two-pixel sliver of front. No tile does two of those.
8. **Never put a tile's structure on the bottom or right edge.** Field tiles
   carry structure on top and left only, so butting two together produces
   exactly one seam and never a doubled line. Anything periodic uses a period
   that divides 16.
9. **Never vary the structure between `.a`/`.b`/`.c` variants** — vary only the
   wear detail. Structural variants cannot be interleaved by position hash
   without the pattern visibly breaking.
10. **Never use `Math.random` in art generation.** Seeded `Rng` only. Art that
    changes between page loads is art that cannot be reviewed.
11. **Never set `tall` on a tile.** `TileMeta` keeps the flag for the engine and
    no tile uses it: every cell is exactly 16x16 and tall objects (lockers,
    crate stacks, the cradle, plants, medbeds, bunks) are drawn to read as one
    top-down-ish object inside one cell. 16x32 cells would break the packing
    contract with the renderer, which insets UVs by half a texel on a uniform
    grid.
12. **Never carry meaning in colour alone.** Status effects, evidence states and
    relationship levels are always also a word or a glyph (`README.md`,
    Accessibility).

---

## 7. Accent scarcity — the halo and bruise rule

Two ramps are reserved. The rule is short: **if everything glows, nothing reads
as important.**

- **halo (cyan)** means *live lattice*. Something is computing, right now,
  where you can see it.
- **bruise (violet)** means *cognitive or anomalous phenomena*. Something is
  being done to a mind.

### 7.1 Every legal use of halo today

| Where | Value |
|---|---|
| `prop.console.a` / `.b` light | `halo2`, r 22, i 0.26 / 0.30 |
| `prop.terminal` / `.b` light | `halo2`, r 22, i 0.30 / 0.26 |
| `prop.muster` light | `halo2`, r 20, i 0.20 |
| `prop.crate.tessera` light | `halo2`, r 20, i 0.24 |
| `spine-duct` mark `3` (the overlook) | `halo3`, r 34, i 0.50 |
| `visor` accessory, sprite and portrait | `halo1`/`halo2`/`halo4` |
| Toast colour for a `good` outcome | `halo3` |
| `EYE_COLORS[6]` — one selectable eye colour | `halo2` |

### 7.2 Every legal use of bruise today

| Where | Value |
|---|---|
| `prop.cradle` light — the memory-smoothing cradle | `bruise2`, r 16, i 0.18 |
| `vestibule` uniform collar | `bruise2` |
| `debug.grid` | never ships in a room |
| `HAIR_COLORS[12]` — one selectable hair colour | `bruise2` |

### 7.3 What breaks if this is violated

The two accents are load-bearing narrative machinery, not decoration.

- **Halo is the game's promise that lattice is present and running.** The Cold
  Registry overlook is the single largest halo source in Chapter One (r 34,
  i 0.50) — bigger than any terminal, because what is under that mesh is 91,400
  running minds' worth of substrate. If corridor lamps, UI chrome or engine
  glow start using cyan, the overlook becomes just another lit prop and the
  chapter's biggest reveal lands as scenery.
- **Bruise is the game's only visual statement that a mind is being edited.**
  There is exactly one bruise light source in the whole tile set and it is the
  cradle Hessa is currently lying in. The first time a player sees violet in a
  room should be the moment they understand what Medical Annex 3 is for. Every
  additional violet light spent before then is spent out of that scene's budget.
- Practically: both ramps are the highest-chroma families in a palette that is
  otherwise desaturated grey-blue. They will always win the eye. Spending them
  on anything the player is not supposed to walk toward trains the player to
  ignore them.

**Enforcement.** This is currently a convention held by a comment at the top of
`tiles.ts` and by review. It should be a validator rule: assert that no tile
outside an allowlist references a `halo*` or `bruise*` key. Flagged in `TASKS.md`.

---

## 8. Silhouette and readability

- **Hard black rim, diagonals included**, on every character cell. `void0`.
- **Three tones per material minimum**: base, one step down for shade, one step
  up for light. Two tones reads as a decal; four starts to look airbrushed at
  this size.
- **Value separation between floor, wall and prop** is checked by eye at 1x, not
  at 5x. If a prop disappears at 1x it does not exist.
- **Bevel is the most-used shape in the game**: light on top/left, shade on
  bottom/right (`bevel()`), with the inverse (`inset()`) for holes, recesses and
  screen wells. Every panel, crate and machine housing is one of the two.
- **Wear is deterministic speckle and streak** (`speckle()`, `scuff()`), seeded,
  never per-frame.
- **Floor variants are chosen by a hash of tile position** (`variantAt`), so a
  corridor of `.` is never a visibly repeating pattern.
- **Walls are sliced by run position**: the top of a run gets the cap, the
  bottom the skirting, everything between the face. A one-tile-thick run gets
  the *face*, because that is the surface the player is looking at.
- **A wall still gets a floor drawn beneath it**, or the deck shows void through
  the 1px gaps in the skirting art.
- **Wall caps and faces are `over`** — drawn above actors — so a character can
  walk behind the top of a wall. Doors are deliberately *not* `over`: an actor
  standing in a doorway must draw in front of the jamb.

---

## 9. The lighting model

`src/render/renderer.ts`. Two canvases, one lit composite, one draw call for the
scene.

### 9.1 How it works

1. A **half-resolution lightmap canvas** (192 x 108, `LIGHT_DIV = 2`) is
   repainted every frame: an ambient fill, then one additive radial gradient per
   light, with stops at 0, 0.55 and 1.0.
2. The world renders to a nearest-filtered render target.
3. A final full-screen `ShaderMaterial` pass multiplies scene by lightmap, then
   applies scanlines, vignette, flash and fade.

Lights are submitted fresh every frame and nothing persists across frames.

### 9.2 `LIGHT_GAIN` — why the lightmap is stored pre-divided

The canvas can only hold 0..1. But a lit room must sit at 1.0 — meaning *show
the tiles exactly as authored* — with lamps pushing **above** it. So the canvas
stores `brightness / LIGHT_GAIN` and the shader multiplies it back out.

`LIGHT_GAIN = 1.7`. Therefore `setAmbient(colour, 1.0)` means "as authored", and
a lamp can reach 1.7x. Without this the brightest a room could ever be is "the
raw texture, undimmed", which makes every scene look like a power failure. This
was a shipped bug and is in the fixed list.

### 9.3 Why light is quantised into bands

`light = floor(light * uSteps + 0.5) / uSteps`, with `uSteps = 8`.

A smooth radial gradient over pixel art reads as a *filter applied to a game*.
Banded pools of light read as *authored art*. The eye accepts a hard-edged pool
of amber on a deck plate as something the artist drew; it reads a 256-step
gradient as post-processing, and immediately starts noticing that the pixels
underneath are not moving with it. Eight steps is enough to keep a falloff
legible and few enough that every band edge lands on a visible contour.

The step count is exposed (`setLightSteps`) and the smoke page can sweep it
(`/smoke.html?steps=N`); the game always sets 8.

### 9.4 Ambient tints are normalised

`setAmbient` divides the tint by its brightest channel, so the tint shifts hue
and `level` alone controls brightness. A fully saturated ambient acts as a
channel filter — an amber room crushes blue to nothing and every tile in it
turns the same mud. The tint should say "this light is warmer", never "this room
is orange". Over-saturated ambients were a shipped defect, found by frame
inspection and fixed.

Presets (`AMBIENT` in `src/world/map.ts`), so rooms declare a mood rather than
raw numbers:

| Preset | Tint | Level | Used by |
|---|---|---|---|
| `lit` | bone3 | 1.00 | — *(unused today)* |
| `warm` | bone3 → amber3 30% | 0.95 | `c-bunk`, `c-commons` |
| `cool` | bone3 → brine4 30% | 0.94 | `c-muster` |
| `sterile` | bone3 → brine4 12% | 1.05 | — *(design intent: Medical)* |
| `dim` | bone2 → brine4 25% | 0.76 | `c-corridor` |
| `gloom` | bone1 → brine3 40% | 0.60 | `c-watch`, `spine-duct` |
| `emergency` | bone2 → ember2 50% | 0.62 | — *(design intent: lockdown)* |

### 9.5 Flicker

Per-light, deterministic, driven by two out-of-phase sines beating against each
other (`sin(t*11.3 + p)` and `sin(t*4.1 + p*2.3)`, phase seeded from the light's
own position) so it never resolves into a visible loop. Suppressed entirely by
the **reduce flashing** accessibility setting.

Two tiles flicker today: `prop.light.emergency` / `.b` (0.5) and the duct-hatch
mark light in `c-muster` (0.3, `ember2`).

### 9.6 Post

| Uniform | Default | Set to | Notes |
|---|---|---|---|
| `uScan` | 0.06 | 0.06, or 0 when scanlines are off | Applied to the **lit** image, so it darkens bright areas more — which is how a real CRT behaves |
| `uVignette` | 0.35 | 0.22 in exploration | — |
| `uFlashAmt` / `uFadeAmt` | 0 | driven by transitions, hits | Screen flash is the only combat hit feedback today (§11) |
| `uLightMix` | 1.0 | 1.0 | 0 disables lighting entirely; debug/accessibility hook, not currently exposed in Settings |

### 9.7 Why colour management is disabled

`THREE.ColorManagement.enabled = false`, `outputColorSpace = LinearSRGBColorSpace`,
and every texture is `NoColorSpace`.

Three's colour management would decode the sRGB atlas canvases to linear on
sample and re-encode on output. But the final composite is a raw
`ShaderMaterial` writing straight to the canvas, so **the re-encode never
happens** — every pixel lands roughly a gamma step too dark. This shipped, was
caught by frame inspection, and is in the fixed list.

The principled version of the same argument: pixel art is authored in gamma
space. The artist picked `#334a55` while looking at `#334a55` on a monitor. A
linear-space multiply produces a different, physically-more-correct number that
is not the one anybody chose. **What the artist picked is what the screen gets.**

Two consequences to know about:

- Lighting maths is a gamma-space multiply. It is not physically correct and is
  not trying to be.
- `flipY` is off on every texture, because atlas UVs are computed from canvas
  coordinates (origin top-left). Three's default would mirror every cell and, on
  a partially filled atlas, point sprite UVs at empty space. This also shipped
  once, and made every sprite invisible.

### 9.8 Pixel locking

The camera is snapped to whole pixels every frame. A camera at x=100.5 turns
crisp pixel art into shimmer the moment the player walks. Screen shake is also
always a whole number of pixels, and decays exponentially.

Depth testing is off everywhere; draw order is scene order and actors are
y-sorted into a single batch, ties broken by x so the order is stable frame to
frame.

---

## 10. What the review loop is

`npm run shots` captures at 1920x1080 and writes both the full window and a 1:1
crop, so pixel work is inspected without display scaling in the way.
`/tiles.html` renders every tile at 3x plus a 5x3 tiling-seam proof sheet.

Every visual defect listed in `CHANGELOG.md` under *Fixed* was found by looking
at a captured frame, not by reading code. That loop is the art department.

---

## 11. Where the art currently falls short

Pulled from `KNOWN_ISSUES.md`. Not softened, not summarised into a mood.

### 11.1 Character sprites

- ~~The defeated pose reads as a slab~~ — redrawn as a sprawled figure: head
  turned away, one arm flung back, legs folded. Still somewhat abstract, but it
  no longer reads as a crate.
- ~~The hurt pose is a 2px shift~~ — now a real flinch. Legs stagger, arms come
  up, and the head is drawn on its own layer and offset so it snaps back
  independently of the body. That separation is what produces the whiplash.
- The **`act` (interacting) pose is subtle at 1x** — a raised arm and little
  else, which at one-times is close to no feedback at all.
- **Side-view figures are narrow and carry less identity than front-facing
  ones.** Every side facing loses a pixel of head width and half the face.
- **Portrait hair still reads slightly helmet-like on the short styles.** The
  lengths (long / bob / braids) came out better than the crops.

### 11.2 Environment

- **Deck-plate seams were softened but the floor still reads as a slightly
  regular grid** at 5x scale in wide rooms.
- **Commons decking was over-corrected into flat speckle and then partially
  restored**; it still carries less structure than the other floor families.
- **`prop.table` reads as a flat grey slab** with weak separation from the deck.
- **Doors in a wall row read as small panels rather than obviously as exits.**
  The corridor's four doors are only legible because of the signage beside them.
  This is a navigation failure, not a decoration one.
- **The corridor is 31 tiles wide with a sparse middle section.**
- **Wall caps and faces are `over`, so a character can walk behind the top of a
  wall.** This is correct behaviour, but it has not been tested against every
  prop.

### 11.3 Combat

- **Combat has no background art.** The two revenants stand on an empty field of
  scanlines. The bodies themselves are drawn — open silhouettes that jitter as
  coherence drops, with static over an unread cast — but the space they fight in
  is blank.
- **Combat has no hit animation** beyond a screen shake and a brief white flash.

### 11.4 Not built at all

Decks A, B, D, E and F have no rooms. The medical, hydroponics and engineering
tile families exist in the atlas and have never been placed in a playable space.
`prop.cradle` — the single most narratively loaded prop in the game — has been
drawn and has never been seen by a player.

---

## Open questions for the lead

1. **Wire or delete `DEPARTMENT_TINT`.** It is an art-direction table that no
   code reads (§3). It will drift.
2. **Make accent scarcity a validator rule, not a convention** (§7.3). One
   allowlist assertion in `src/dev/validate.ts` closes it permanently.
3. **Doors need a stronger silhouette** (§11.2). Signage-dependent exits are a
   navigation defect, and the fix is art, not more signage — probably a
   full-height frame and a floor threshold plate rather than a wall-row panel.
4. **Combat background.** Currently blank. Options are (a) a blurred, darkened
   render of the room the fight started in, (b) an authored abstract field per
   deck, (c) accept the void as a deliberate statement about projection space.
   (c) is defensible and is not currently *stated* anywhere, which means it
   reads as unfinished rather than intentional. Needs a ruling before the
   Chapter Two roster is drawn.
5. **The side-facing identity gap** (§11.1). Either accept it (most handheld
   RPGs do) or spend a pixel of head width back, which costs the body a pixel.
