# COMBAT DESIGN

## Premise

Every crew member is issued a **tessera** — a ceramic tile holding a **cast**,
the recording of a dead person's cognition — and a wrist **loom** that projects
it as a **Revenant**: a field-body wearing that person's competence.

This is normal aboard. It is also the reason nobody questions a hold full of
tiles, which is the point: the combat system and the mystery are the same fact
seen from two angles.

## The two resources

| Resource | Meaning | Runs out when |
|---|---|---|
| **Integrity** | The revenant's body | Zero = it comes apart, and the fight ends |
| **Coherence** | The cast's grip on itself | Zero = **Guttering**, not merely "cannot act" |

Guttering is the design's load-bearing idea. Running out of your action resource
does not stall the fight into a passing contest — it starts hurting you, at an
escalating rate, and amplifies incoming damage. Spending recklessly is punished
without the fight ever becoming a stalemate.

One coherence returns each turn, so a fight always moves.

## Aspects

Kinetic → Field → Cognitive → Corrosive → Thermal → Kinetic.
Beating costs 1.5x; being resisted costs 0.66x. A five-cycle is short enough to
learn in one sitting and long enough that no single tessera dominates.

Effectiveness is **hidden until you READ the opponent**. With combat assist on,
the ability list then labels each option BITES DEEP / EVEN / BARELY TAKES.

## Statuses

| Status | Effect |
|---|---|
| Frayed | Loses coherence every turn |
| Static | Attacks may miss; cannot scan |
| Anchored | Cannot withdraw |
| Bleedover | Next hit taken is amplified 1.5x, then consumed |
| Sealed | Support abilities locked — only strikes remain |
| Guttering | Coherence exhausted; escalating self-damage, +30% damage taken |

Statuses are drawn as **words**, never as colour alone.

## Ability design rule

No ability may be a renamed damage number. Each one must either change what the
opponent can do next turn, change what you can survive, or tell you something.
The content validator enforces the weaker mechanical form of this: a tessera
whose abilities are all one `kind` is a hard error.

Kinds: `strike`, `guard`, `mend`, `disrupt`, `control`, `read`.

## READ, and why it is free

`READ` is a top-level menu action, always available, costing nothing. It reveals
the opponent's aspect, its serial, and who the cast used to be.

Investigation must never be gated behind a resource the player can run out of.
Reading the Registry Sentinel is how the player learns that its cast serial is
prefixed **KH-** — the first hard evidence linking the ship's cargo to a town
that was declared lost with all hands. A player who kills it without reading it
loses that evidence permanently, and the battle-end screen says so plainly:

> *You never read it. Whatever it was, it is gone now.*

## Enemy AI

A short priority list that reads the actual board — not random, not omniscient:

1. Low on coherence → guard (which restores coherence)
2. Below 35% integrity → mend, if it has one
3. Player is winded (coherence ≤ 2) → press with control/disrupt rather than damage
4. Otherwise → the strike with the best expected damage against the player's
   *actual* aspect

## Defeat is not a game over

Losing a Chapter One battle costs you the outcome, not the run:

> *You come round on the deck a minute later with a headache and your tile
> intact. Nothing here kills you. It only decides things.*

Losing to Ivo at the hatch raises Watch suspicion and leaves the duct shut.
Losing to the Sentinel still ends the encounter, and still leaves the evidence
unread if you never read it.

## Chapter One roster

**Player tesserae**, one issued per background: Grey Liner (spinehand, kinetic),
Lampwright (medtech, field), Tallyman (registry clerk, cognitive), Truncheon
(watch, kinetic), Kiln (loom tech, thermal).

**Encountered**: Second Loom (a training cast with no person in it — the
tutorial), Bailiff (a Watch drone *pattern*, not a cast at all), Registry
Sentinel (the real fight; its cast will not name itself).

## Not yet done

Balance is unmeasured. Average battle length, ability usage rates, dominant
strategies and the early-versus-late difficulty curve have not been instrumented.
The numbers here were chosen by judgement and should be treated as a first pass.

---

# Balance pass — measured

Run it yourself: `node tools/balance.mjs --runs 200`. The tool drives the real
rules (`BattleScene.simulate`) across every tessera x encounter pair under four
player policies — *greedy* (always the biggest expected damage), *random*,
*considered* (read, then heal when hurt, guard when out of coherence, otherwise
best-matched strike), and *support* (prefers control/disrupt/read).

## What the first measurement found

The design claimed "no ability is a renamed damage number". Measurement
falsified it:

| Metric | Before |
|---|---|
| Dead abilities (<2% of their own kit) | **13 of 20** |
| Dominant abilities (>60% of their kit) | **4** (one per tessera, 88-100%) |
| Average battle length | **~4 turns** |
| Boss win rate, greedy vs considered | **40% vs 40% — identical** |
| Boss win rate by tessera | **100 / 0 / 0 / 100 / 0** |

Three findings, in order of severity:

1. **Thinking did nothing.** A greedy damage-maximiser won exactly as often as
   a considered player. There was no tactical layer to find.
2. **Aspect was destiny.** Every tessera was mono-aspect on offence, so three of
   the five starting casts could not deal unpenalised damage to the boss under
   any play, and lost 100% of the time.
3. **Fights were too short for anything to matter.** At ~4 turns, statuses,
   guards and control never paid off before someone died.

## What changed

| Change | Why |
|---|---|
| Aspect multipliers 1.5/0.66 → **1.4/0.78** | A bad matchup should be a disadvantage, not a verdict |
| Integrity **+55%** across all combatants | Fights of 8-11 turns give tactics room to pay |
| **Reading a cast now grants +30% damage against it** | Nobody ever spent a turn on pure information; now the read is a real opening, and it is the same action that yields evidence |
| **Anchored now cuts the target's damage by 35%** | It previously meant only "cannot withdraw", which is worth nothing in a fight nobody withdraws from |
| Primary strike costs **+1**; guards restore more | The best strike could be used every turn; now it cannot |
| **Every kit gained an off-aspect strike** | Removes unplayable matchups and puts a real decision in the loadout |
| **STEADY**: a free, never-sealed fallback action | Fixes a genuine soft-lock (below) |

## What it is now

| Metric | Before | After |
|---|---|---|
| Dead abilities | 13 | **2** |
| Dominant abilities | 4 | **1** |
| Average battle length | ~4 turns | **8-11 turns** |
| Boss win rate, greedy | 40% | **43%** |
| Boss win rate, considered | 40% | **66%** |
| Boss win rate, random | 1% | **24%** |
| Tutorial win rate, considered | 100% | **100%** |

`kiln` is now the model kit — 52 / 19 / 15 / 14% across its four abilities.
`lampwright` went from two dead abilities to 40 / 33 / 16 / 11%.

## The soft-lock the pass found

Raising strike costs exposed a real bug: **coherence only regenerates when a
turn advances, so a player holding nothing affordable could press confirm
forever and never recover.** Every press printed "Not enough coherence" and
returned without advancing the turn. The playtest caught it.

Fixed with **STEADY** — zero cost, never sealed, always available, restores
coherence and passes the turn. Both the player and the enemy AI fall back to it.

## Still wrong

Stated plainly, because the numbers say so:

- ~~`lampwright` loses the boss 100% of the time~~ **fixed.** The cause was
  not sustain but the coherence economy: its cheapest strike cost 3 against +1
  regeneration, so at steady state it attacked once every three turns - about
  6.7 damage into a 106 integrity boss. Dropping `suture` to cost 2 took it to
  **63%**, and pulled the overall boss rate to **66%**, inside the target band.
- **`truncheon` is still dominant at 75%**, and its `restrain` is dead at 0%.
- **`tallyman/audit` is dead at 0%.**
- **Boss sits at 53% for a considered player**, just under the 55-80% target.
- **The support policy wins 5% against the boss.** A control-first player loses.
  Control is better than it was and still not competitive.
- All of this is simulated. **No human has played a single battle.** The
  policies are stand-ins for players, and a stand-in is not a player.

---

## Roster expansion — three encounters, measured

`gantry-minder`, `ivo-escalation`, `annex-admittance` (`src/combat/roster.ts`).
Each is a different tactical problem, not a different damage number: attrition,
tempo, and denial.

Measured at 60 battles per cell, all five tesserae:

| Encounter | greedy | random | considered | support |
|---|---|---|---|---|
| gantry-minder | 37% | 32% | **48%** | 21% |
| ivo-escalation | 56% | 32% | **86%** | 37% |
| annex-admittance | 93% | 44% | 83% | 41% |
| tutorial-spar | 100% | 94% | 100% | 84% |
| ivo-bailiff | 40% | 30% | **60%** | 23% |
| registry-sentinel | 43% | 27% | **66%** | 6% |

### What measurement changed before shipping

The escalation unit was **21% winnable** and would have shipped. It was not
hard in general — it was hard *specifically against the two kinetic casts*,
because its attack was thermal (1.4x into both). Re-aspecting it to cognitive
produced the flattest per-cast spread of any encounter in the game. The cost is
a flavour concession: the Watch's cast is cognitive rather than the obvious
kinetic. She is procedural rather than strong, so it reads.

### Two AI facts that constrain all future enemy design

- **The AI picks strikes by raw expected damage.** Any rider you want to land
  reliably must sit on the top-damage ability; control and disrupt only fire
  when the player is at 2 coherence or less.
- **Guards are cleared at the top of the turn**, so a slower combatant's brace
  mitigates nothing. On a low-grip enemy a guard is coherence recovery only.

### Bugs this pass exposed in the core rules

- **SEALED could lock a kit out entirely.** It blocks everything that is not a
  strike, and Tallyman's kit is a read plus three disrupts — zero strikes. A
  sealed Tallyman could only STEADY, forever. Fixed: sealing is pressure, not a
  removal of agency, so if it would block the whole kit it now blocks nothing.
- **`ABILITIES` was not exported**, so enemy content had to duplicate ability
  definitions and would drift the first time one was retuned. Now exported.

### The two weak kits, fixed

Lampwright and Tallyman lost every kinetic matchup 100% of the time. Diagnosis:
neither kit had a guard, and neither had a strike the aspect wheel liked, so
their throughput was about 6 and 5 a turn.

Three changes, each aimed at a measured cause rather than at the symptom:

| Change | Why |
|---|---|
| `AUDIT` becomes Tallyman's guard (0.45 mitigation, +3 coherence) | It measured **dead at 0%** for the whole balance pass, and Tallyman had no brace at all. One change fixed both |
| `STRIKE RECORD` 8 → 11 power | Tallyman's best line was 8 a turn |
| `DENY` 9 → 12 power | Its only *unresisted* line into a field enemy was a 9-power disrupt |
| `TRACTION` 11 → 12 power | Lampwright's only unresisted line into a kinetic enemy. 13 overshot — it went from always losing the boss to always winning with half its integrity left, so it came back down |

| Metric | Before | After |
|---|---|---|
| Boss, considered | 66% | **70%** (target 55–80) |
| Boss, random | 27% | **29%** (target <35) |
| Per-cast boss spread | 100/63/**22**/100/43 | 100/68/**37**/100/43 |
| Casts at 0% vs a kinetic enemy | **2** | **0** |
| gantry-minder, considered | 48% | **88%** |
| ivo-bailiff, considered | 60% | **80%** |

### Reachability — the failure this pass nearly repeated

The three new encounters shipped balanced, documented, and **unreachable**: they
existed in `ENCOUNTERS` and nothing in the game could trigger any of them. That
is the same defect as `ChapterEndScene`, which sat unreachable for far longer.
Content nothing can reach is content that does not exist, and a balance table
for it is worse than useless because it reads as evidence that it works.

| Encounter | Trigger |
|---|---|
| `annex-admittance` | The Annex 3 lock in the recovery ward, if you touch it without medical clearance |
| `gantry-minder` | The gantry housing in reactor control, which projects at anyone who passes |
| `ivo-escalation` | **Still unreachable.** It needs the duct-forcing path from CANON §6, which is not yet built |

Every encounter id should be greppable outside `roster.ts` and `battle.ts`. If
it is not, no player will ever see it.

### Still wrong

- **`tallyman/audit` still measures 0%**, but this one is partly a measurement
  artefact: the `considered` policy only reaches for a guard when it cannot
  afford its cheapest strike, which almost never happens now. A real player
  guards for reasons a policy does not model. Recorded, not "fixed" by tuning
  the policy until the number moved.
- **Grey Liner and Truncheon still win the boss 100%** — though with 5% and 17%
  integrity left, so they are close fights that happen to go one way.
- **Kiln and Truncheon are still mono-aspect on offence**, so thermal and
  corrosive enemies are unusable against them. That is why the maintenance
  construct is kinetic despite corrosive being the better image for it.
- `truncheon/truncheon` remains dominant at 71%; `tallyman/audit` and
  `truncheon/restrain` remain dead at 0%.
