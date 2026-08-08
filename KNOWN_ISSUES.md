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

## Audio is measured, but unheard

`npm run test:audio` taps the master bus with an AnalyserNode in a real browser
and confirms the engine emits signal: 11/11, all 41 sfx / 10 music / 9 ambience
cues fire, `masterVolume: 0` genuinely silences output, and 400 rapid one-shots
do not break the graph.

That proves it is not a stub. It does **not** prove it sounds good — nobody has
listened to it, and no claim about how it sounds appears anywhere in this
project. Nothing is mixed; the per-cue levels and the four channel defaults
were chosen on paper.

## Performance numbers are not representative

The playtest reports 39–43 fps with a worst frame around 33 ms. That is Chromium
running WebGL through SwiftShader (software rasterisation) in a container. On
real hardware this should be trivially 60 fps — it is one draw call and roughly
2,000 triangles — but that has not been measured on a GPU and should not be
claimed until it is.

## Character sprites

Rebuilt against a reference bar of top-tier handheld-RPG overworld sprites.
What changed: chibi proportions (head ~40% of figure height, since a
naturalistic head at a 16px cell is three pixels across and cannot hold an eye,
a hairline and a silhouette at once), a hard black rim including diagonals,
three-tone shading per material, hairlines with temples and partings instead of
a flat cap, full hair coverage on the back of the head, arms given their own
value so the upper body is not one slab, and a walk cycle with a real stride
(trailing leg a pixel shorter, both shifting outward).

Still below the bar:
- The defeated pose reads as a slab rather than a fallen person.
- The hurt pose is a 2px shift; there is no genuine flinch drawing.
- The `act` (interacting) pose is subtle at 1x.
- Side-view figures are narrow and carry less identity than front-facing ones.
- ~~Portraits were not reworked~~ — rebuilt. They now carry a tapered jaw,
  eyes with a lash line, sclera, iris, pupil and a single catchlight, a
  modelled nose, a neck the head actually sits on, an opening collar, and hair
  with volume and a real hairline. Previously the face was a rounded brick with
  two flat bars for eyes and a slab of hair on top — less structure than the
  16x24 world sprite beside it, despite having five times the pixels.
- Portrait hair still reads slightly helmet-like on the short styles; the
  lengths (long/bob/braids) came out better than the crops.

## Combat balance

A measured pass has been run (`node tools/balance.mjs`, see COMBAT_DESIGN.md).
Dead abilities went 13 -> 2, dominant 4 -> 1, battle length ~4 -> 8-11 turns,
and a greedy damage-maximiser no longer performs as well as a considered
player. The pass also found and fixed a genuine soft-lock: coherence only
regenerates on turn advance, so a player with nothing affordable could press
confirm forever.

Still wrong, per the numbers:
- ~~`lampwright` loses the boss 100% of the time~~ fixed: its cheapest strike
  cost more than its coherence regeneration could sustain. Now 63%.
- `truncheon` remains dominant at 75%; its `restrain` is dead at 0%.
- `tallyman/audit` is dead at 0%.
- Boss win rate is 66% for a considered player, inside the 55-80% target.
- A control-first player wins 5% against the boss. Control is competitive with
  nothing.
- Every one of these figures is simulated. No human has played a battle.

## Visual issues still open

Found by inspecting captured frames:

- Deck-plate seams were softened but the floor still reads as a slightly
  regular grid at 5x scale in wide rooms.
- Commons decking was over-corrected into flat speckle and then partially
  restored; it still carries less structure than the other floor families.
- `prop.table` reads as a flat grey slab with weak separation from the deck.
- Doors in a wall row read as small panels rather than obviously as exits; the
  corridor's four doors are only legible because of the signage beside them.
- The corridor is 31 tiles wide with a sparse middle section.
- Wall caps and faces are marked `over`, so a character can walk behind the top
  of a wall — this is correct, but it has not been tested against every prop.
- Combat has no background art: the two revenants stand on an empty field of
  scanlines. The bodies themselves are drawn (open silhouettes that jitter as
  coherence drops, with static over an unread cast), but the space they fight in
  is blank.
- Combat has no hit animation beyond a screen shake and a brief white flash.

## Systems designed but not implemented

- NPC schedules change rooms by time block, but ship-time only advances where
  content explicitly calls `advanceTime()`, which is currently almost nowhere.
  In practice the crew do not yet move.
- Faction reputation is tracked and adjusted but nothing reads it.
- `suspicion` is incremented by combat and theft but gates no content yet.
- The ship map screen (`map` action, bound to `E`) is not implemented.
- Inventory and equipment have a data layer and no interface.

## Required documents

All eighteen required documents now exist. `ART_DIRECTION.md`,
`AUDIO_DIRECTION.md`, `SHIP_LAYOUT.md`, `ENDING_MATRIX.md`, `QUALITY_RUBRIC.md`
and `TASKS.md` were the last six. Each describes what was actually built and
states inline where something is design intent rather than a shipped feature.

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
