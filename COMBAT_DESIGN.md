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
