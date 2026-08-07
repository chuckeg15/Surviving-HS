# CANDLEWAKE — TASKS

The real backlog. No completion percentages, no planned work listed as done.

**Current state in one sentence:** a playable, polished Chapter One vertical
slice — character creation through exploration, investigation, dialogue, one
full battle, and a four-way chapter-ending decision — with the rest of the game
designed but unbuilt.

---

## A. Done and verified

Verified means: exercised by the automated playtest, measured by a tool, or
inspected in a screenshot somebody actually looked at.

| Item | Evidence |
|---|---|
| Pixel-perfect renderer, 384×216, integer scaling | screenshots at 1920×1080, scale 5, no resampling |
| Single-draw-call scene batching | playtest asserts `calls === 1` |
| Quantised dynamic lightmap with `LIGHT_GAIN` | screenshot-driven; fixed an actual "everything looks like a power failure" bug |
| Hand-authored 5×8 bitmap font, 95 glyphs + 12 UI icons | glyph sheet screenshot |
| Procedural tileset, 111 tiles, one 256×112 atlas | `/tiles.html` review page |
| Character sprites, 6 poses × 4 facings, chibi proportions | `/actors.html` at 4×, 2× and 1× |
| Portraits, 40×48, 7 expressions | `/actors.html`; rebuilt after review |
| Character creation with 5 backgrounds affecting real access | playtest |
| Deck C rooms, collision, doors, room transitions | playtest walks them |
| NPCs with schedules and rotating dialogue | playtest |
| Branching dialogue with conditional and gated choices | playtest |
| Clue collection, deduction linking, journal | playtest + content validator |
| Turn-based Revenant combat, full battle to resolution | playtest drives win and read |
| Save / load, multi-slot, settings persistence | playtest |
| Accessibility options wired to real code paths | playtest toggles them |
| Audio engine: 41 sfx, 10 music cues, 9 ambience beds | `npm run test:audio` — 11/11, **signal measured** |
| Automated playtest | **24/24 passing** |

---

## B. Open defects, ranked by player-visible impact

| # | Defect | Fix approach |
|---|---|---|
| 1 | **No human has ever played this.** Every judgement is mine or a tool's | Cannot be fixed from here. Highest-value next action for a human owner |
| 2 | **Combat has had no balance pass.** No numbers work has been done at all | Instrument battle length, damage spread and ability usage; find dominant and dead abilities |
| 3 | **Nobody has heard the audio.** Graph verified, sound unjudged | Requires a listener. Until then no claim about how it sounds |
| 4 | Portrait hair reads helmet-like on the short crops | Give the crops a broken fringe edge like the lengths already have |
| 5 | Tables and benches read as flat grey slabs | Give each an internal idea — a seam, a leg shadow, a worn edge |
| 6 | Deck-plate seams still read as a regular grid in wide rooms | Add a third floor variant and scatter it, or break seams per-room by offset |
| 7 | Commons decking carries less structure than other floor families | Rebuild the plank pattern; the speckle over-correction is only half undone |
| 8 | The `act` (interacting) pose is subtle at 1× | Raise the arms further and add a lean |
| 9 | Side-view figures carry less identity than front-facing | Widen the profile torso by 1px; add a visible far-shoulder |
| 10 | `map` action bound to `E` does nothing | Either build the ship map screen or unbind the key — a key that does nothing is a broken promise |
| 11 | Performance figures are software-rasterised only | Measure on real GPU hardware; current fps is a floor, not a result |
| 12 | No long-session leak test | Run a 30-minute automated session and watch node/object counts |
| 13 | Chromium only; no browser matrix | Test Firefox and Safari, especially `AudioContext` gesture gating |
| 14 | Narrative knowledge boundaries documented but not enforced | Add a validator pass asserting no dialogue node references a fact outside its speaker's boundary |

---

## C. Next, in priority order

### C1. Finish Chapter One properly
1. **Combat balance pass** — the single largest quality gap in a shipped
   system. Instrument, measure, fix dominant strategies and dead abilities.
2. **Build the ship map screen** (or unbind `E`).
3. **The remaining "Hold Your Breath" solutions.** Canon specifies seven routes
   into the duct; verify all seven are reachable and distinct, per background.
4. **Second and third battles** — the tutorial spar and the optional Bailiff
   encounter need the same finish as the Registry Sentinel.
5. **Knowledge-boundary validator** so no NPC can leak what they cannot know.

### C2. Prove it holds up
6. **Human playtest.** Everything above is guesswork until someone plays it.
7. **GPU performance measurement.**
8. **Browser matrix.**
9. **A listening pass on the audio.**

### C3. Expand
10. **Deck D (Medical)** — needed for D5 and the cradle, the emotional centre
    of Chapter One's back half.
11. **Deck B (Registry)** — needed for C8 and C12, which disprove the red
    herring and reveal the player's own annex.
12. **Chapter Two.**
13. **The nine ending families** (`ENDING_MATRIX.md`) — designed, unwritten.
14. **The rest of the combat roster** — five player tesserae exist; the
    encountered roster needs depth beyond three.

---

## D. Explicitly not doing

- No third-party art, audio or font assets. Everything is generated at runtime.
- No additional runtime dependencies beyond `three`.
- No difficulty setting that silently changes the mystery's fairness.
- No ending that differs from another only in wording.

---

## E. Required documents

| Document | Status |
|---|---|
| `README.md`, `GAME_DESIGN.md`, `TECHNICAL_ARCHITECTURE.md` | written |
| `NARRATIVE_TRUTH.md`, `MYSTERY_STRUCTURE.md`, `CHARACTER_BIBLE.md`, `FACTIONS.md` | written |
| `COMBAT_DESIGN.md`, `TEST_PLAN.md`, `PERFORMANCE_BUDGET.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` | written |
| `AUDIO_DIRECTION.md`, `SHIP_LAYOUT.md` | written |
| `ART_DIRECTION.md`, `ENDING_MATRIX.md`, `QUALITY_RUBRIC.md`, `TASKS.md` | written |

All eighteen required documents now exist.
