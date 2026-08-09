# CANDLEWAKE — TASKS

The real backlog. No completion percentages, no planned work listed as done.

**Current state in one sentence:** a playable Chapter One — character creation,
three walkable decks (14 rooms, 9 NPCs on schedules), an investigation whose
full clue set is now present and solvable, turn-based combat with a measured
balance pass, and a four-way chapter-ending decision — with Chapters Two onward
and the nine ending families designed but unbuilt.

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
| Decks C, D and B — 14 rooms, all validated even and enclosed | playtest walks them; layout validator |
| Spine lift, deck travel, clearance gating | playtest + screenshots |
| Ship map — visited compartments by deck, with landmarks | screenshot |
| Complete Chapter One clue set (C1–C13), D4 reachable | content validator |
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
| 2 | **Combat balance is simulated, not played.** 13 dead abilities → 2, boss win rate now 66%, but no human has fought a battle | Needs a player, not another simulation |
| 3 | **Nobody has heard the audio.** Graph verified, sound unjudged | Requires a listener. Until then no claim about how it sounds |
| 4 | Portrait hair reads helmet-like on the short crops | Give the crops a broken fringe edge like the lengths already have |
| 5 | Tables and benches read as flat grey slabs | Give each an internal idea — a seam, a leg shadow, a worn edge |
| 6 | Deck-plate seams still read as a regular grid in wide rooms | Add a third floor variant and scatter it, or break seams per-room by offset |
| 7 | Commons decking carries less structure than other floor families | Rebuild the plank pattern; the speckle over-correction is only half undone |
| 8 | The `act` (interacting) pose is subtle at 1× | Raise the arms further and add a lean |
| 9 | Side-view figures carry less identity than front-facing | Widen the profile torso by 1px; add a visible far-shoulder |
| ~~10~~ | ~~`map` does nothing~~ | **Done.** Ship map shows visited compartments by deck, with landmarks |
| 11 | Performance figures are software-rasterised only | Measure on real GPU hardware; current fps is a floor, not a result |
| 12 | No long-session leak test | Run a 30-minute automated session and watch node/object counts |
| 13 | Chromium only; no browser matrix | Test Firefox and Safari, especially `AudioContext` gesture gating |
| 14 | Narrative knowledge boundaries documented but not enforced | Add a validator pass asserting no dialogue node references a fact outside its speaker's boundary |

---

## C. Next, in priority order

### C1. Finish Chapter One properly
1. **The remaining "Hold Your Breath" solutions.** Canon specifies seven routes
   into the duct; verify all seven are reachable and distinct, per background.
2. **Second and third battles** — the tutorial spar and the optional Bailiff
   encounter need the same finish as the Registry Sentinel.
3. **Knowledge-boundary validator** so no NPC can leak what they cannot know.
4. **Wire the new decks into the chapter ending** — D5 and D4 now exist, so the
   O1/O3 gates should reflect what the player can actually prove.

### C2. Prove it holds up
6. **Human playtest.** Everything above is guesswork until someone plays it.
7. **GPU performance measurement.**
8. **Browser matrix.**
9. **A listening pass on the audio.**

### C3. Expand
10. **Deck E (Engineering and the Loom)** — where the combat system's fiction
    actually lives, and the next most valuable deck.
11. **Deck F (Cargo and the Cold Registry)** — the hold the manifest denies.
12. **Deck A (Command)** — sealed for the whole of Chapter One by design.
13. **Chapter Two.**
14. **The nine ending families** (`ENDING_MATRIX.md`) — designed, unwritten.
15. **The rest of the combat roster** — five player tesserae exist; the
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
