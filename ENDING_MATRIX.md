# CANDLEWAKE — ENDING MATRIX

> **Scope, stated up front.** Chapter One is what exists and is playable today.
> **None of the nine ending families below is implemented.** This is the forward
> design for the full game. What Chapter One *does* implement is the four
> outcomes O1–O4 and the state they set — and that state is what makes these
> endings reachable or not. Everything in §2 and §3 is design; §4 is built.

Canon: `docs/CANON.md` §8. Truth: `NARRATIVE_TRUTH.md`. Clues: `MYSTERY_STRUCTURE.md`.

---

## 1. The rule that governs all endings

An ending is chosen by **what the player has assembled**, not by a menu at the
end. Specifically: the evidence held, the deductions actually made, who trusts
them, which faction they stand with, who is alive, and what they did at each
chapter break.

Two constraints keep this honest:

1. **An ending the player did not earn the understanding for still resolves.**
   Family 9 exists precisely so that a coherent, well-evidenced, *wrong* theory
   is a real destination and not a failure screen.
2. **No ending explains everything.** Each reveals part of the truth and
   withholds the rest. Some truths require more than one playthrough to
   assemble — marked ★ below.

---

## 2. The nine families

### 1. Order Kept
9-B completes. The colony instantiates at Sable Verge. The player is the living
index and never learns it.
- **Requires:** D6 not made; player present at the Verge; Sabbat's trust intact.
- **Shows:** the instantiation, from the outside, as a scheduling success.
- **Withholds:** ★ that the player was the key. ★ Kest Harbour.
- **Costs:** nothing the player can perceive. That is the point.

### 2. Order Kept, Knowingly
The same act, chosen.
- **Requires:** D6 made; the Ledger's origin known; player proceeds anyway.
- **Shows:** what the Board believes it is doing, in the Board's own register.
- **Withholds:** what the instantiated wake up into.
- **Costs:** the player's account of themselves.

### 3. The Broadcast
The truth reaches Earth. What Earth does with it is not shown.
- **Requires:** D2 + D6; Communications access; a faction ally with a relay key
  (Ninth Watch, or Onwe if turned).
- **Shows:** the transmission, and the silence after it.
- **Withholds:** the consequence. Deliberately.
- **Costs:** every person aboard becomes a witness, which is not a safe thing.

### 4. Turned
The ship comes about. 91,400 casts return to a world that declared them dead.
- **Requires:** Command taken or Onwe persuaded; Engineering cooperation;
  crew survival above threshold.
- **Shows:** the burn, and the arrival, and the legal problem of the dead.
- **Withholds:** ★ whether they are ever instantiated.
- **Costs:** the crew's contracts, and probably their liberty.

### 5. The Fire
The Ledger is destroyed. 91,400 minds end. Defensible; unbearable.
- **Requires:** Cold Registry access; the means; D6 made (the game will not let
  the player do this without knowing what it is).
- **Shows:** the act, at length, without music.
- **Withholds:** nothing. This ending is explicit.
- **Costs:** stated plainly and not excused.

### 6. Instantiated Free
The colony wakes with no administrator.
- **Requires:** D6; Vestibule cooperation (Rask); the index willing; the
  Board's control layer removed.
- **Shows:** first contact with a population that did not consent to either
  state it has been in.
- **Withholds:** ★ whether this is mercy.
- **Costs:** consequences are not sanitised.

### 7. The Index Refuses
The player removes themselves. 9-B cannot complete.
- **Requires:** the player knows they are the index (their own annex, C12, plus
  the Vestibule record).
- **Shows:** what refusal costs, concretely.
- **Withholds:** what happens to the Ledger afterwards.
- **Costs:** the ending *is* the cost.

### 8. Command
The player takes the ship. **Which faction they take it for branches this
family** into sub-endings: T&V (sold), Ninth Watch (turned), Recurrence
(instantiated as scripture), or none (the ship as its own authority).
- **Requires:** Security or Engineering standing; Trave or Stray as ally;
  Onwe neutralised or converted.
- **Costs:** differs per sub-branch; the Recurrence branch is the darkest.

### 9. A Plausible Error
The player finishes convinced of a coherent, well-evidenced, wrong theory —
most commonly D-X, that Captain Onwe did it.
- **Requires:** D-X held; D4 never made (C7 + C8 never assembled).
- **Shows:** the player acting decisively and correctly *on their evidence*.
- **Withholds:** ★ almost everything.
- **Costs:** the game does not mock this. It is reachable, internally
  consistent, and the player is never told they were stupid.

---

## 3. Chapter One outcome → ending eligibility

O1–O4 are the Chapter One decisions (`docs/CANON.md` §6). ● keeps a family
open, ○ closes it, ◐ leaves it possible but harder.

| Family | O1 Confront Trave | O2 File with Sabbat | O3 Ninth Watch | O4 Say nothing |
|---|:--:|:--:|:--:|:--:|
| 1. Order Kept | ◐ | ● | ○ | ● |
| 2. Order Kept, Knowingly | ● | ● | ◐ | ● |
| 3. The Broadcast | ◐ | ○ | ● | ● |
| 4. Turned | ◐ | ○ | ● | ◐ |
| 5. The Fire | ● | ◐ | ● | ● |
| 6. Instantiated Free | ◐ | ◐ | ◐ | ● |
| 7. The Index Refuses | ● | ◐ | ● | ● |
| 8. Command | ● | ○ | ● | ◐ |
| 9. A Plausible Error | ● | ● | ● | ● |

**Why the closures fall where they do:**

- **O2 closes the most.** Filing with Sabbat confiscates unlinked evidence and
  marks the player as an asset. Access increases; independence collapses. The
  routes that need the player to be *unwatched* (Broadcast, Turned, Command)
  shut. This is the trap: it is the correct procedure, and it is the worst
  outcome for the player's freedom of action. They realise it too late.
- **O3 closes Order Kept.** Once the player is on the Watch's list, the Board
  will not let them near the Verge as a cooperative index.
- **O4 closes almost nothing** — it is the best-informed route — but it costs
  Hessa, and several endings that need an *ally* are harder without having
  demonstrated loyalty to anyone.
- **Family 9 is always open.** A player can hold a wrong theory from any route.

---

## 4. What is actually built

| Element | Status |
|---|---|
| O1–O4 as a chapter-ending decision | **Built and playable** |
| Distinct flag state per outcome | **Built** — outcomes set different flags, not different text |
| Evidence confiscation on O2 | **Built** |
| D5 gating O3 (needs to know where Hessa is) | **Built** |
| D3 gating O1 (needs to be able to accuse) | **Built** |
| Chapter-end summary reflecting the route | **Built** |
| The nine ending families | **Not implemented** |
| Chapters Two onward | **Not implemented** |

The honest summary: Chapter One's branching is real — four outcomes that
diverge in world state, not in wording — and the endings it feeds are designed
but unwritten.
