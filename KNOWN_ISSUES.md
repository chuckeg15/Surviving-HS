# KNOWN ISSUES

Honest state of the project. Nothing in this file is aspirational.

## What is actually built and verified

Verified by `npm run test:e2e` (24/24 assertions) and by screenshots that were
captured and inspected:

- Boots to a title screen; new game through real character creation; six-room
  Deck C explorable with collision, doors, restricted access and room ambience
- Branching dialogue with conditions, displayed tone, and greyed-out choices
  that show what another background would have unlocked
- Five crew with schedules and knowledge-bounded dialogue trees
- 12 clues, 6 deductions (each requiring two independent sources) plus a fair
  red herring that a reachable deduction retires
- Evidence board with player-driven linking; wrong pairs are refused, not punished
- Turn-based Revenant combat with integrity/coherence, five aspects, six
  statuses, board-reading enemy AI, and READ as a free investigative action that
  yields a real clue
- Save/load across four slots with version migration and damaged-slot reporting
- Pause, settings (16 options, all functional), full remapping
- 1 draw call per frame; no page errors across the whole playtest

## Scope: this is Chapter One, and not all of it

**The largest honest gap.** `docs/CANON.md` describes a whole ship and nine
ending families. What exists is one deck and the front half of Chapter One.

Specifically **not built**:

- The chapter-ending decision itself. `ChapterEndScene` exists and renders a
  consequence summary, but nothing currently routes the player into it — the
  four Chapter One outcomes (O1–O4) are designed and flagged for in state, but
  the Sabbat/Stray/Trave confrontation scenes that trigger them are not written.
  **The chapter cannot currently be completed.**
- Decks A, B, D, E, F. Medical Annex 3 — where Hessa actually is — is referenced
  throughout and is not a visitable room.
- Registrar Sabbat, Dr. Ashkar, Tibold Rask and Captain Onwe have no dialogue
  trees. Sabbat in particular is load-bearing for three of the four outcomes.
- Clues C9 (`cradle-log`), C10 (`consent-form`) and C12 (`personnel-annex`) are
  written and in the tables but have no location that grants them, because their
  rooms do not exist. The content validator reports these as warnings by design.
  Deduction D5 ("Hessa is in Medical Annex 3") is therefore unreachable and has
  been left out of the shipped deduction table.
- Quests are tracked by the state layer but only one (`find-hessa`) is started,
  and it has no stages. The seven-solution "Hold Your Breath" duct problem is
  implemented in the interactable (all seven paths are real code) but only three
  of them are currently reachable, because the others depend on rooms or NPCs
  that do not exist yet.

## Audio is unverified

`src/core/audio.ts` and `src/core/music.ts` are complete, type-check, and are
wired into every scene. **Nobody has heard them.** This environment has no audio
output and no way to render the graph to a file for inspection. The synthesis
code has been read for node leaks, click-free ramps and scheduler correctness,
but any claim about how it *sounds* would be fabricated. Treat audio as
"implemented, untested".

## Performance numbers are not representative

The playtest reports 39–43 fps with a worst frame around 33 ms. That is Chromium
running WebGL through SwiftShader (software rasterisation) in a container. On
real hardware this should be trivially 60 fps — it is one draw call and roughly
2,000 triangles — but that has not been measured on a GPU and should not be
claimed until it is.

## Visual issues still open

Found by inspecting captured frames:

- Deck-plate seams were softened but the floor still reads as a slightly
  regular grid at 5x scale in wide rooms.
- `prop.table` reads as a flat grey slab with weak separation from the deck.
- Doors in a wall row read as small panels rather than obviously as exits; the
  corridor's four doors are only legible because of the signage beside them.
- The corridor is 31 tiles wide with a sparse middle section.
- Wall caps and faces are marked `over`, so a character can walk behind the top
  of a wall — this is correct, but it has not been tested against every prop.

## Systems designed but not implemented

- NPC schedules change rooms by time block, but ship-time only advances where
  content explicitly calls `advanceTime()`, which is currently almost nowhere.
  In practice the crew do not yet move.
- Faction reputation is tracked and adjusted but nothing reads it.
- `suspicion` is incremented by combat and theft but gates no content yet.
- The ship map screen (`map` action, bound to `E`) is not implemented.
- Inventory and equipment have a data layer and no interface.

## Required documents not yet written

`SHIP_LAYOUT.md`, `ART_DIRECTION.md`, `AUDIO_DIRECTION.md`, `ENDING_MATRIX.md`,
`QUALITY_RUBRIC.md` and `TASKS.md` were specified as deliverables and do not
exist. `docs/CANON.md` covers the ship layout and ending families in summary
form; the art and audio direction currently live only as comments in
`src/art/palette.ts` and `src/core/music.ts`.

## Review coverage

- **Visual review**: done, repeatedly, against captured frames. Four render
  defects and two art defects found and fixed.
- **Code review**: partial. Types are clean under `strict`; disposal paths exist
  for Three resources and audio nodes but have not been leak-tested over a long
  session.
- **Mystery fairness review**: enforced mechanically by the content validator
  (no deduction may rest on fewer than two clues) but not reviewed by a second
  reader for whether the *reasoning* is fair.
- **Combat balance review**: not done. Numbers were chosen by judgement, not
  measured. Average battle length, dominant strategies and ability usage rates
  are unmeasured.
- **Narrative continuity review**: not done beyond the automated node-target and
  knowledge-boundary construction checks.
