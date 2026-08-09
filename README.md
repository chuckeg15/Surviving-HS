# CANDLEWAKE

A top-down science-fiction mystery RPG, built for the browser with Three.js and
TypeScript. Original universe, story, characters, art, music and systems.

You are a crew member aboard the **RV Candlewake**, a relay hauler forty-one
months out from an Earth that has not seen direct sunlight in sixty-three years.
Your shift partner missed muster. The record says she transferred decks at 03:10.
Her boots are still in her locker.

The tonal targets are cold, monumental science fiction and lived-in industrial
horror. Those are references for *atmosphere only* — nothing in this project is
borrowed from any existing work.

---

## Requirements

- Node 20+ (developed on 22)
- A browser with WebGL2: recent Chrome, Edge, Firefox or Safari
- Keyboard, or any standard gamepad

## Install and run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Other commands

```bash
npm run build      # type-check, then production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run test:e2e   # automated playtest in headless Chromium
npm run shots      # capture screenshots to shots/
```

Two developer pages are served in dev mode:

- `/smoke.html` — render pipeline proof (scaling, batching, lightmap, font)
- `/tiles.html` — every generated tile at 3x, with a tiling-seam proof sheet

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | Arrow keys / WASD | D-pad / left stick |
| Confirm, interact, talk | `Z` / `Enter` / `Space` | A |
| Cancel, back | `X` / `Esc` | B |
| Pause menu | `C` / `Tab` | Start |
| Evidence board | `Q` | X |
| Run | hold `Shift` | shoulder |
| Fast-forward text | hold `Ctrl` | — |

Every binding is remappable in Settings → Controls.

## Save behaviour

Four slots in `localStorage`: one autosave plus three manual. Autosave is written
at character creation and at each chapter ending; manual saves are written from
the pause menu. Saves are versioned and migrated forward; a save that cannot be
parsed is reported on the load screen as **DAMAGED** rather than being silently
discarded or crashing the title screen.

Starting a new game never overwrites another slot.

## Accessibility

All of these are implemented and read by real code paths, not decorative:

- Text speed (slow / normal / fast / instant), large text, high-contrast text
- Reduce flashing (suppresses all light flicker), reduce screen shake
- Shape markers — status effects, evidence states and relationship levels are
  always carried by a word or a glyph, never by colour alone
- Minimum ambient light floor, so no room can become too dark to navigate
- Scanlines on/off
- Combat speed (0.5x–2x), combat assist (shows aspect effectiveness)
- Persistent objective reminder, run as hold or toggle
- Full keyboard and gamepad remapping

## Assets and licences

**There are no external assets.** Every tile, sprite, portrait, glyph and sound
in this project is generated at runtime from code in this repository:

- Tiles — `src/art/tiles.ts` (111 tiles, drawn procedurally)
- Characters and portraits — `src/art/actors.ts` (layered from customisation)
- Font — `src/art/font.ts` (a hand-authored 5x8 bitmap font)
- Audio — `src/core/audio.ts`, `src/core/music.ts` (Web Audio synthesis)

The only third-party runtime dependency is **three.js** (MIT). Build tooling is
Vite (MIT), TypeScript (Apache-2.0) and Playwright (Apache-2.0).

No copyrighted music, art, text or design is used or imitated.

## Project layout

```
docs/CANON.md          the locked narrative truth; everything defers to it
src/core/              screen, input, settings, save-adjacent services, audio
src/art/               palette, pixel primitives, font, tiles, actors
src/render/            orthographic renderer, quad batching, sprite atlas
src/world/             room construction from ASCII layouts, actors, collision
src/game/              state, dialogue runtime, save slots, app shell
src/combat/            Revenant combat
src/ui/                painter and every screen
src/data/              rooms, crew, clues, deductions, backgrounds
src/dev/               smoke test, tile viewer, content validator
tests/e2e/run.mjs      automated playtest
tools/capture.mjs      screenshot harness
```

## Known limitations

See `KNOWN_ISSUES.md`. The short version: this is **Chapter One only** — a
vertical slice of six rooms on one deck. The larger ship, the remaining chapters
and most of the ending families are designed but not built.

## Documentation

`docs/CANON.md` is the single source of truth. `GAME_DESIGN.md`,
`NARRATIVE_TRUTH.md`, `MYSTERY_STRUCTURE.md`, `CHARACTER_BIBLE.md` and
`FACTIONS.md` expand it. `TECHNICAL_ARCHITECTURE.md`, `COMBAT_DESIGN.md`,
`TEST_PLAN.md` and `PERFORMANCE_BUDGET.md` cover the build.
