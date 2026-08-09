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

## Scope: this is Chapter One, and the front of Chapter Two

`docs/CANON.md` describes a whole ship and nine ending families.

Built and connected: Decks A, B, C, D and E — 23 rooms — plus the two spine
crawls, joined by the lift. 11 crew on live schedules. Chapter One is
completable, all four outcomes diverge in world state, and each opens a
different route onto Deck A.

Still **not built**:

- Deck F.
- Chapter Two beyond its threshold. The routes onto Deck A exist and the deck
  has real mystery payload on it, but the chapter has no arc of its own yet.
- The nine ending families. `ENDING_MATRIX.md` designs them; only the four
  Chapter One outcomes are implemented.
- Quest stages. Quests are tracked by the state layer and `find-hessa` is the
  only one started; it has no stages.
- Four of the seven "Hold Your Breath" duct solutions are real code that no
  reachable room or NPC currently triggers.
- Faction reputation and `suspicion` are both tracked and adjusted, and nothing
  reads either of them.
- Inventory and equipment have a data layer and no interface.

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

Re-proportioned away from the chibi build. The head was 10 of the 22 rows the
figure occupies and 10px wide against an 8px torso — wider than the shoulders,
which is what reads as a bobblehead. The rule now is that the head is never
wider than the shoulder span: 7 rows of 20, head width 7–8 against a span of
bodyW + 4.

The smaller head exposed how flat the rest of the figure was, so four things
changed with it: trousers and boots pushed a clear step below the tunic (they
shared a value, which fused torso and legs into one slab with no waist),
sloped shoulders and a shadowed hem, profile legs offset by a pixel even when
standing (perfectly aligned legs in profile read as a skirt), and back-of-head
hair that follows the skull and reaches the nape instead of being a
full-width brick that left a bald patch when the sprite turned around.

The face was simplified rather than detailed. Four rows can hold eyes and a
mouth; the brow band, nose and cheek pixels crammed in alongside them turned it
to mud.

Portraits were rebuilt on the same pass — see the skin-ramp bug below, which
was the larger problem. The jaw tapered to a near point and was shaded dark, so
it ran straight into the neck and the lower half of every bust read as one long
wedge; the skull is now an explicit per-row silhouette that stops short of a
point and keeps the chin lit. Shoulders were raised and widened to fill the
frame and the neck cut to three visible rows.

`topknot` was drawn at `headTop - 8`, entirely off the top of the canvas: the
style was selectable in character creation and rendered nothing at all. `wave`
was two stray highlight pixels and was indistinguishable from `crop`.

Review pages: `/actors.html` (every facing and pose, `?s=` for 1x to 14x) and
`/portraits.html` (all nine hair styles across three skin tones).

Still below the bar:
- The defeated pose reads as a slab rather than a fallen person.
- The hurt pose is a head offset on its own layer; it is a flinch, but a small one.
- Side-view figures carry less identity than front-facing ones.
- Nobody has seen these at native resolution on a real display.

## The chapter can now be finished

`ChapterEndScene` existed, with all four outcomes written and a
what-carries-forward summary built, and **nothing in the game ever
instantiated it** - the chapter was not completable. The missing half was the
decision itself, now reachable from the player's bunk once they hold at least
one deduction or four clues.

All four outcomes are listed always; a gated one is greyed with the reason it
is gated, because "you could have done this if you had proved X" is what makes
an ending feel earned rather than arbitrary. The outcomes diverge in world
state, not in wording - filing with Sabbat genuinely destroys unlinked
evidence and genuinely widens access.

## Decks built

Deck C (habitation, 6), Deck D (medical, 4), Deck B (registry, 4) and Deck E
(engineering and the Loom, 4) are walkable, connected by the spine lift. That
is 18 rooms and 10 NPCs on schedules, and it completes Chapter One's clue set: C8
(registry-checksum) and C12 (personnel-annex) exist, so deduction D4 is
reachable and the Captain red herring is disprovable as designed.

Deck A — Command is now built: the bridge, communications, the Master's day
cabin, the strongroom, and the spine crawl underneath it. Five rooms, Captain
Onwe with a dialogue tree, and the Command copy of Standing Order 9-B behind
the safe.

It was written whole and then left connected to nothing — 1,078 lines that no
map, clue table, NPC roster or lift stop referenced. That is the third time
this exact failure has happened here. It is now wired, and the wiring is
verified rather than assumed.

Deck A stays sealed for all of Chapter One, which is canon rather than pacing:
the chapter's red herring points at the Captain, so the Captain has to be
unreachable while it matters. It opens at the Chapter Two threshold, by a
different route per Chapter One outcome, and `npm run test:progression`
asserts all of it:

| | listed | lift | spine | strongroom |
|---|---|---|---|---|
| Chapter One | no | no | no | no |
| O1 witness escort | yes | yes | no | no |
| O2 Board asset | yes | yes | no | **yes** |
| O3 watch-listed | yes | **refused** | yes | no |
| O4 unremarked | yes | yes | no | no |

Under O3 the lift stop stays listed and stays refused, with a different
refusal that says the panel read the player's tessera and thought about it —
a route you did not know you were denied is not a route. The strongroom is
exactly one outcome's prize; everyone else has to get the safe out of Onwe.

Deck F is not built.

## The playtest is not perfectly deterministic

The door-transition check is timing-dependent and has been seen to fail once
and pass on an immediate re-run with no code change. It walks the player toward
a door for a fixed number of frames; under load it occasionally does not
arrive. Recorded rather than papered over, because a suite that is quietly
flaky is worse than one that is known to be.

## Unreachable content is the recurring failure here

Twice now, finished and correct content has shipped with nothing able to reach
it: the chapter ending, and then all three new encounters. Both were caught by grepping for the id outside the file that defines it.
That check is now a tool: `npm run test:reach`. It reports one genuine finding
and no false positives.

`npm run test:reach` now audits four categories - encounters, clues, NPC
placement, interactable use and room connectivity - and reports **zero**
findings. Every encounter can be fought, every clue can be found, every NPC
stands somewhere, every interactable is on a tile, and every room can be walked
to from the start.

All seven routes into the spine duct from CANON §6 now exist, including the
seventh (force the wheel), which is what `ivo-escalation` was written for.

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

## Two bugs that had been in the game since the first commit

**Every em dash rendered as a hole.** Content files have used `\x7f` as an em
dash from the beginning. The glyph was never drawn, and the font atlas bound
stopped one codepoint short of it. "CREW INTAKE  RV CANDLEWAKE" was missing a
dash, not a space, in every string in the game.

**The darkest skin tone had no shading at all.** `skinTone()` clamped its
index, so at skin 0 the base tone, the shadow and the deep shadow all resolved
to the same colour. Dark-skinned characters rendered as a silhouette with eyes,
in the world sprites as well as the portraits. Steps past either end of the
ramp now continue into void or bone, and the portrait's lit edge is a specular
mix rather than a ramp step — a ramp step is a fixed distance in the palette,
so it lifted dark faces by almost nothing.

Also: `npm test` ran `node --test tests/unit/*.test.mjs` against a directory
that does not exist, and had therefore reported success with zero tests for the
project's whole life. It now runs typecheck, reachability, progression and the
playtest.

## Deck F, items, and what is NOT verified about combat

**Deck F is built and walkable.** Five rooms: the lift landing and cargo
office, Hold 4 (declared cargo), the plant, the Cold Registry, and the shuttle
bay. It unseals at the Chapter Two threshold alongside Deck A, for a different
reason — Deck A had to stay shut because the red herring pointed at the
Captain; Deck F had to stay shut because the Cold Registry answers, in one
room, most of what Chapter One is for asking. All five were captured and
looked at.

**Items exist now.** Eleven definitions, a kit screen in the pause menu, and a
USE verb. The find was that `duct-hatch` gated two of its seven canon routes
on flags `telltale-killed` and `hazard-tag-placed` that **nothing in the game
ever set** — and the loom and medical backgrounds each advertise one of those
routes verbatim on the character-creation form. The intake screen was
promising routes that did not exist.

Related: `world/map.ts` mapped legend character `R` to `prop.breaker`, the tile
existed, and **no room layout in the ship contained an `R`**. The Commons
breaker panel the loom background names had nothing in the room to open. Fixed.

**Combat balance is now UNVERIFIED.** The subagent working on it was cut off
by a session limit partway through. What landed is a real structural change —
`Ability.inflict` widened from a single status to a list, and `clears` promoted
from a hardcoded check on one ability id to a declared field — plus edits to
the scorer in `tools/balance.mjs`. Battles still resolve and the playtest
passes.

But `node tools/balance.mjs` does not complete in this container even at 12
samples, so **no post-change numbers exist**. Every balance figure quoted in
COMBAT_DESIGN.md and in the section above predates these edits and should be
treated as stale until a run finishes. In particular it is not known whether
`truncheon` is still dominant, whether `restrain` and `tallyman/audit` are
still dead, or whether control-first play is still uncompetitive.

Two subagents were also cut off mid-task on Deck F and combat; a checkpoint
commit captured their work rather than losing it to a container restart. The
gaps they left are listed above rather than quietly closed.

## Combat now starves, and the playtest caught it

Predicted in the section above and now confirmed. Driving a real battle and
reading integrity and coherence each turn:

```
turn 0   me 96/10   foe 106/14
turn 1   me 83/8    foe  89/11
turn 2   me 70/6    foe  72/8
turn 3   me 57/4    foe  55/5
turn 4   me 44/2    foe  38/2     <- and effectively stops here
```

Integrity falls cleanly for four turns and then both sides run out of
coherence. Regeneration is +1 per turn against ability costs of 2 to 4, so
past turn four the fight becomes several turns of STEADY to buy one strike.
It is not a soft-lock  STEADY is free and never sealed, and an unaffordable
pick is refused with a message  but the fight stops converging, and
`battle resolves to an outcome` now fails deterministically in the playtest.

That is a TRUE POSITIVE about the game, not a broken test, and it is the first
hard evidence of what the unmeasured combat edits did. The fix needs the
balance harness, which does not complete in this container, so it is recorded
rather than guessed at.

## Four subagents, four session limits

Movement, text, audio and room-furnishing were all run as subagents and all
four were cut off by the account session limit. What survived, and what it
cost:

- **Movement landed and works.** Tile-quantised stepping with input buffering
  is in `world/actor.ts`.
- **`ui/explore.ts` did not compile.** The agent was midway through unifying
  interaction targeting and left dangling references to a `Target` type and two
  constructors that were never written. Finished by hand  and the refactor
  was worth finishing: the hint and the action used to derive their target
  separately, and two searches meant to agree eventually do not. The failure
  mode is the worst kind, where the game labels one object and activates
  another.
- **`game/dialogue.ts` was left binary.** A raw NUL byte had been written into
  a string literal as a sentinel instead of an empty string. TypeScript
  compiled it happily; git and every text tool saw a binary file. Repaired.
- **Audio and furnishing produced almost nothing** before dying.

## A note on measurement hygiene

One run of the playtest in this session reported ten failures that were
entirely an artefact of a stale dev server, left behind by a killed subagent,
squatting on the port the suite wanted — so the test drove old code and
reported real, meaningless output. The suite now spawns with `--strictPort`
and the run is only trustworthy when it starts its own server. Worth knowing
before believing a red result.

## Visual issues still open

- The Loom hall (`e-loom`) is sparse below its midline and its grated floor
  repeats hard at 5x scale. It reads as a hall, but as the payoff room for the
  whole combat system it should carry more.


Found by inspecting captured frames:

- ~~Deck-plate seams read as a regular grid at 5x~~ — fixed. Softening the
  contrast had not been enough: every plate variant carried a seam on its top
  AND left edge, so every tile in the ship was outlined. Each variant now seams
  a different pair of edges, and since variants are already chosen per tile the
  panel joins fall irregularly.
- Commons decking was over-corrected into flat speckle and then partially
  restored; it still carries less structure than the other floor families.
- ~~`prop.table` reads as a flat grey slab~~ — fixed. `drawTableEnd` called
  `keyline()` and `drawTable` did not, so a run was outlined at its cap and
  nowhere along its length.
- ~~Doors read as small panels rather than exits~~ — fixed. The shell was
  `iron1`, the same value as the wall band it sits in, so nothing broke the
  wall's silhouette. Now a hard `iron4` jamb and lintel over a `void0` recess,
  and a two-pixel parting line, because one pixel vanished under the lightmap
  in a dim room.
- The corridor is 31 tiles wide with a sparse middle section.
- Wall caps and faces are marked `over`, so a character can walk behind the top
  of a wall — this is correct, but it has not been tested against every prop.
- ~~Combat has no background art~~ — built. The fight now happens inside the
  loom's projection volume: a lattice that converges to a horizon and is
  brightest under the two caster plates, the compartment behind it reduced to
  silhouetted machinery and one conduit run, and a single slow scan down the
  field. Seeded off the encounter id, so a compartment looks the same every
  time the player is dragged back into it.

  The plate positions and the body positions were separate numbers for one
  revision and immediately drifted, which read as two glowing puddles the
  fighters happened to be standing near; there is now one `STANCE` constant
  both read from.
- Combat has no hit animation beyond a screen shake and a brief white flash.

## The ship now keeps time, and the crew live in it

`advanceTime()` existed, `npcRoom()` existed, and every crew member declared a
real six-block schedule. Nothing called `advanceTime()`, so `timeBlock` was
permanently 0 and the whole table was fiction: Stray and Ivo stood in Muster
forever, the habitation ring was never crossed by anybody, and Warden Trave
never left a locked room four of the five backgrounds cannot open.

Ship time now advances on work done, never on a wall clock — a mystery whose
deadlines move while the player is away from the keyboard lies about cause and
effect. One twenty-minute block passes per three beats, where a beat is a clue
found, a deduction closed, a fight finished, or every fourth bulkhead transit.
The clock strip warms for three seconds when the block turns, and the crew are
reconciled against the schedule on room entry and again whenever the block
turns — but only while the player is standing in the world, because
rebuilding the cast mid-conversation would delete the person being spoken to.

Measured by `npm run test:progression`, which drives the real code:

- 9 clue finds moved the clock from block 0 to block 2
- 11 crew produce 8 distinct arrangements across 8 blocks
- the habitation ring is occupied in 7 of 8 blocks
- Ivo is the only crew member who never moves, and that is deliberate: he is
  standing a post, and getting past him is a distraction puzzle (`ivo-distracted`)
  rather than a waiting game

Block 0 was also two hours out. The clock was anchored at 02:00 per the watch
roster, but the 02:00-04:00 hour with Hessa alive is not built and Trave says
it is four in the morning in his first line of dialogue. A clock the player can
read has to agree with the people talking to them.

## Systems designed but not implemented
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
