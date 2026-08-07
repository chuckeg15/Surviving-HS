# TEST PLAN

## Automated (`npm run test:e2e`)

Drives the real build with real key events through the real menus in headless
Chromium. Nothing reaches past the UI except to *read* state for assertions, so
a pass means a person could have done the same thing with a keyboard.

**24 assertions, currently 24 passing.**

| Area | Asserted |
|---|---|
| Content integrity | Validator reports zero errors (see below) |
| Boot | Reaches the title screen |
| Character creation | Opens; background choice takes effect; tessera issued; signs on into the world |
| Exploration | Walks without leaving the room; walks through a door into a new room; does not bounce back through it |
| Evidence board | Opens on `Q`, closes back to exploration |
| Menus | Pause opens; settings opens; a settings change persists to storage |
| Mystery | Finds evidence by examining the world with real movement and interaction |
| Combat | Enters a battle; READ yields a real clue; the battle resolves to an outcome |
| Persistence | Save round-trips state and evidence; a corrupt save is reported, not crashed on |
| Performance | Scene draws in ≤ 3 calls |
| Stability | No uncaught page errors across the entire run |

Screenshots for every step are written to `shots/playtest/`.

## Content validator (`src/dev/validate.ts`)

Runs against the real content tables in the real build:

- **Mystery fairness** — every deduction requirement set must contain at least
  two clues. A single-clue conclusion is a hard error.
- Every clue referenced by a deduction exists.
- Every clue is granted by some reachable content path (warning if not).
- Every room builds; has spawn points; has walkable space.
- Every door leads to a real room **and** a spawn that exists in that room.
- Every interactable placed in a room has a definition.
- Every dialogue node target exists; dead-end nodes are flagged.
- Every NPC is scheduled only into rooms that exist.
- Every background grants a real tessera and a real starting room.
- No tessera's abilities are all one kind (i.e. renamed damage numbers).

## Visual review loop (`npm run shots`)

Captures the game at 1920x1080 and writes both the full window and a 1:1 crop of
the game frame, so pixel work can be inspected without display scaling in the
way. `/tiles.html` renders every tile at 3x plus a 5x3 tiling-seam proof.

Defects found and fixed by this loop so far: colour-space gamma error, texture
`flipY` mirroring, lightmap unable to exceed 1.0, neutral ramp too dark, stacked
double grid on commons decking, over-saturated ambient tints, hard deck seams.

## Manual checklist — not yet executed

Browser matrix (Firefox, Safari), window resize and fullscreen, keyboard focus
loss mid-battle, controller disconnect mid-input, audio initialisation on a
gesture-gated tab, long-session memory growth, and new-game-after-completion.
