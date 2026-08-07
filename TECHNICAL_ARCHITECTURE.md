# TECHNICAL ARCHITECTURE

## Presentation contract

- Internal resolution **384 x 216**, upscaled by **integer factors only**.
  384x216 x5 is exactly 1920x1080, so the most common desktop display gets a
  whole-number scale with no resampling. Non-integer scales are never used; the
  game letterboxes instead.
- Tile size **16 px**. Character cell **16 x 24**, feet on row 22.
- Two canvases share the same 384x216 grid: WebGL for the world, 2D for the
  interface. The UI is never DOM, so it cannot scale differently, anti-alias, or
  inherit a system font.

## Rendering

`src/render/renderer.ts`

World units *are* screen pixels. An orthographic camera of exactly 384x216 with
y pointing down means a tile at map (3,4) sits at pixel (48,64).

Four decisions worth knowing:

1. **The camera is snapped to whole pixels every frame.** A camera at x=100.5
   turns crisp pixel art into shimmer the moment the player walks.
2. **Depth testing is off everywhere.** Draw order is scene order; actors are
   y-sorted into a single batch. A depth buffer would fight transparency and buy
   nothing in 2D.
3. **Colour management is disabled end to end.** Three would decode the sRGB
   atlases to linear on sample and re-encode on output — but the final composite
   is a raw `ShaderMaterial` writing straight to the canvas, so the re-encode
   never happens and every pixel lands a gamma step too dark. Pixel art is
   authored in gamma space and is multiplied in gamma space.
4. **Texture `flipY` is off.** Atlas UVs are computed from canvas coordinates
   (origin top-left); Three's default would mirror every cell and point sprite
   UVs at empty atlas space.

### Lighting

A half-resolution lightmap canvas is painted each frame (ambient fill, then
additive radial gradients per light) and composited multiplicatively in a final
full-screen pass. Two properties matter:

- The canvas can only hold 0..1, but a lit room must sit at 1.0 with lamps
  pushing *above* it. The canvas stores `brightness / LIGHT_GAIN` and the shader
  multiplies it back out, so `setAmbient(colour, 1.0)` means "show the tiles as
  authored" and lamps can reach 1.7x.
- The result is **quantised to 8 steps** in the shader. Smooth gradients over
  pixel art read as a filter; banded pools of light read as authored.

Ambient tints are kept close to white and normalised to their brightest channel,
so a tint shifts hue without darkening. A fully saturated ambient acts as a
channel filter and turns every tile in the room the same mud.

### Batching

`QuadBatch` (dynamic, y-sorted, for actors and effects) and `TileMesh` (static,
built once per room, with per-quad UV retargeting for tile animation). A busy
corridor with twenty crew is **one draw call**; the whole scene measures 1 call
in the playtest.

## Art generation

All art is generated at runtime from `src/art/`:

- `palette.ts` — the only legal source of colour. Ramps are 4–6 steps so
  sprites, tiles, lighting and UI shade against the same values.
- `pixel.ts` — the only legal drawing primitives. Integer coordinates, no alpha
  blending except explicit stipple, shading by ramp step rather than opacity.
- `font.ts` — a hand-authored 5x8 bitmap font, encoded as base32 bit rows.
  Authored rather than baked from a system font so glyphs are byte-identical on
  every machine.
- `tiles.ts` → one atlas, 111 tiles, deterministic (seeded RNG only).
- `actors.ts` → per-look 6x4 sprite sheets and 40x48 portraits, assembled from
  the same customisation record.

## State

`src/game/state.ts` is the single mutable record of a playthrough. Systems never
keep their own copy of story state. Everything serialises to versioned JSON.

Relationships are deliberately **not** a single visible number: an internal
score drives a named *level* (hostile…loyal) and a set of qualitative *states*
(afraid, indebted, ashamed, aligned…) that a single axis cannot express. Only
the level and the states are ever shown.

## Content

Rooms are authored as ASCII with a legend (`src/world/map.ts`, `src/data/rooms.ts`).
Two things happen automatically because doing them by hand is where tilemaps rot:

- Floor variants are chosen by a hash of tile position, so a corridor of `.` is
  never a visibly repeating pattern.
- Walls are sliced: the top of a run gets the cap, the bottom the skirting,
  everything between the face. A one-tile-thick run gets the face, because that
  is the surface the player is looking at.

Dialogue conditions and effects are plain TypeScript functions rather than a
string DSL — a mystery's conditions get complicated enough that a hand-rolled
DSL becomes a bug farm with worse tooling.

## Event bus

`src/core/events.ts` is the only sanctioned cross-system channel, so the clue
system can react to a battle ending without combat knowing clues exist.

## Scene stack

`src/game/app.ts` holds a *stack*, not a current scene, so pause, the evidence
board and dialogue can sit on top of live exploration without any of them
knowing about each other. Only the topmost scene updates; everything below keeps
drawing.

## Input

Presses are **latched on the DOM event** and cleared at end of frame. Deriving
`pressed()` from held-vs-previous frame state silently eats any tap that begins
and ends inside one frame — every fast tap on a stuttering frame. Focus loss
releases everything, or the player walks into a wall.

## Validation

`src/dev/validate.ts` runs against the real content tables in the real build and
is asserted by the playtest. It checks mystery fairness (no conclusion may rest
on fewer than two clues), dialogue node targets, door/spawn pairing, room
buildability, interactable definitions, and that no tessera is a list of renamed
damage abilities.
