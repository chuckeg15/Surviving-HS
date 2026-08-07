# CANDLEWAKE — MYSTERY STRUCTURE

**Status:** derived from `docs/CANON.md` §6. Clue IDs C1–C13, deduction IDs
D1–D6 and D-X are frozen. Their contents, requirements and locations are frozen.
Everything below adds access routes, redundancy, wording and fairness proofs.

**Companion:** `NARRATIVE_TRUTH.md` is what is true. This document is what the
player can *get*, and how they get from having it to knowing it.

---

## 1. The fairness contract

Five commitments. Every one is testable, and §6 tests them.

| # | Commitment | Test |
|---|---|---|
| F1 | No deduction is reachable from a single clue. | §4, requirement column. Canon guarantees this by construction; verified. |
| F2 | Every deduction rests on at least two *independent kinds* of evidence — record, testimony, physical trace, forensic data, or observed behaviour. Two documents saying the same thing is one source. | §6.1 |
| F3 | No chapter-critical clue can be permanently lost. Every one has a stated redundant path. | §6.2 |
| F4 | The chapter cannot dead-end. Two of the four outcomes have no evidence requirement at all. | §6.3 |
| F5 | The red herring D-X is refutable by evidence the player can obtain on any background, and it is refuted by *positive attribution*, not by absence. | §6.4 |

**Non-commitment, stated openly:** the game does not promise the player will
reach the truth. It promises the truth was reachable. Ending family 9 ("A
Plausible Error") is a legitimate finish, and the fairness contract is what makes
it a tragedy rather than a cheat.

---

## 2. Access vocabulary

Gates used throughout. These are the only gate types; no clue invents a new one.

| Gate | Meaning | Opened by |
|---|---|---|
| **Open** | Anyone, any background, no cost. | — |
| **Access** | Requires a credential tier or a physical key. | Background, borrowed credential, theft, forgery, or O2 asset status. |
| **Relationship** | Requires an NPC at a named trust band. | Conversation, favours, siding with them, not lying to them. |
| **Background** | The player's chosen department gives it free; others need a substitute route. | Substitutes listed per clue. |
| **Combat** | Only produced during a fight. | Choosing to scan rather than to finish. |
| **Persuasion** | A check against a relationship band plus a held clue used as leverage. | — |

### 2.1 Terminal privilege tiers

Terminals are a network, not a place. Geography does not gate them; privilege
does. This is why a Chapter One confined to Deck C can still reach Registry
records.

| Tier | Name | Where reachable in Ch1 | Yields |
|---|---|---|---|
| T0 | Public display | Commons cargo readout, Commons bulletin board | C4 (both figures, unannotated), C7 (bulletin form) |
| T1 | Crew | Muster terminal, Deck C | C1 |
| T2 | Registry-class | Watch office console; Ship's Registry office, Deck B (reachable via spine) | C4 (annotated), C8, C12 |
| T3 | Command-class | Deck A | Sealed all chapter. Nothing. |
| T4 | Vestibule protocol | Deck B research suite | Chapter Two. Nothing in Ch1. |

**Four independent routes to T2 in Chapter One.** This is deliberate
over-provision, because T2 is the only source of C8, and C8 is the only thing
that positively refutes D-X (see §6.4).

1. **Registry background** — the player holds T2 from the first minute.
2. **Trave's key** — lifted from the Watch office (Hold Your Breath route 6) or
   handed over after O1's confession. Opens the Watch office console.
3. **Rask** — at relationship *Cooperative* or better, Rask will run a lookup
   for the player at his own T2 and read the result aloud. He will not hand over
   his credential and he will not lie about having run it.
4. **Sabbat** — after O2 filing, or after any scene in which the player brings
   Sabbat a procedurally correct concern, the player is granted a temporary T2
   read for "assisting the enquiry". Sabbat gives access as a means of control.
   The player who takes it gets C8 and gets watched.

A fifth route exists on one background only: **Security** players can request a
records pull through the Watch duty channel without a key, which surfaces C8 but
also logs the request against them (+1 Watch suspicion).

---

## 3. The clue graph — C1 to C13

Each entry: **Where** (canon-fixed) / **Gate** / **Literal text** (what the game
shows) / **Implication** (what it is evidence *of*) / **Supports** (deductions) /
**Redundant path** (§6.2) / **Notes**.

---

### C1 `transfer-record`
- **Where:** Muster terminal, Deck C. *(canon)*
- **Gate:** Open, T1. It is on screen when the player answers muster at 04:00.
- **Literal:** `QUILL, H. — VOLUNTARY TRANSFER — DECK E — 03:10 — AUTH ONWE-V — FILED 03:10`
- **Implication:** Nothing on its own. It is the chapter's premise, not evidence.
  Its power is that it is *checkable in three different directions*: against
  physical fact (C2), against testimony (C3), and against its own metadata (C8).
- **Supports:** D1, D-X.
- **Redundant path:** Unlosable. It is the inciting screen; the player cannot
  leave muster without it. A copy is also printed to the Commons bulletin as a
  watch-roster amendment.
- **Notes:** The `ONWE-V` string must be visually prominent. It is the hook of
  the entire red herring, and the player must remember it four hours later.

---

### C2 `hessa-locker`
- **Where:** Hessa's bunk, habitation ring, Deck C. *(canon)*
- **Gate:** Open. The player is her shift partner; her bunkroom is their
  bunkroom or immediately adjacent, and nobody stops a partner collecting kit.
- **Literal:** *Her boots are in the rack. Cold liner folded on top of them. The
  slate charger is plugged in and empty.*
- **Implication:** Deck E is the reactor and Loom deck — the coldest and most
  hazardous walk on the ship. Nobody changes decks without boots. Therefore
  either the transfer did not happen, or it happened to someone who was not
  walking.
- **Supports:** D1, D3.
- **Redundant path:** If the player somehow misses the bunk, the same fact is
  available from **Ostrow Kell** (Open, he is her other regular partner: *"her
  liner's still racked, I checked at four"*) and from **Ivo**, who will confirm
  she did not draw cold-weather kit from the Deck C store.
- **Notes:** The empty charger is a second beat — the slate is gone. Do not
  annotate it. Let the player notice.

---

### C3 `stray-testimony`
- **Where:** Bosun Stray. *(canon)*
- **Gate:** Relationship ≥ *Wary* — i.e. the first honest conversation. Stray
  does not require trust to give this; she requires the player to be someone who
  came to ask rather than to report.
- **Literal:** *"Two-fifty. She came and found me and she said the keel's the
  wrong weight. Those words. Then I told her to go to her bunk."*
- **Implication:** Places Hessa on Deck C, awake, alarmed, twenty minutes before
  the transfer she supposedly volunteered for. Establishes a motive that has
  nothing to do with a transfer.
- **Supports:** D1, D2.
- **Redundant path:** **Fen** places Hessa in the Commons at 02:50 talking to
  Stray (movement only, not content) — this alone does not substitute for C3.
  The full substitute is **Delisle**, at relationship ≥ *Wary*, who overheard
  part of it: *"She said something about the weight of the keel. I thought it
  was blasphemy, if I'm honest."* Delisle's version is partial and hedged but is
  mechanically equivalent for D1 and D2.
- **Notes:** Stray will not volunteer that she told Hessa to go to her bunk
  alone until relationship ≥ *Trusting*. It is the sentence she is ashamed of.

---

### C4 `mass-manifest`
- **Where:** Commons cargo readout **or** Registry terminal. *(canon)*
- **Gate:** Open at T0 (readout, two bare numbers); Access at T2 (annotated,
  with the trim solution's derivation).
- **Literal (T0):** `KEEL, RELAY — DECLARED 4,410 t` / `TRIM SOLUTION — 6,120 t`
- **Literal (T2):** the same, plus the saddle-load breakdown and the timestamp
  showing the trim solution has been flown unchanged since departure.
- **Implication:** 1,710 t of undeclared mass inside the keel envelope. The ship
  is trimmed for cargo the manifest does not list. Someone had to compute that
  trim, which means the discrepancy is not an accident of loading — it is
  *maintained*.
- **Supports:** D2, D6.
- **Redundant path:** Two canon locations already. Third: **Cael** will state
  both figures from memory, unprompted, at relationship ≥ *Wary*, because he has
  been wanting to tell someone for eleven months.
- **Notes:** C4 is data without meaning. **Cael Oduya is the interpreter.**
  Bringing C4 to Cael converts it from "two numbers" to "1,710 tonnes that
  someone flies the ship around". Do not put the interpretation in the readout
  text. Make the player carry the number to a person.

---

### C5 `duct-scuff`
- **Where:** Spine duct, frame 611, above the Cold Registry. *(canon)*
- **Gate:** Access — the chapter's set-piece, "Hold Your Breath". Seven routes,
  all real. See §7.
- **Literal:** *Fresh drag marks in the dust, heel-width, two parallel. A strip
  of torn glove-liner caught on the coaming. Spinehand grey.*
- **Implication:** Someone was dragged out of this duct, resisting, within the
  last two hours. Spinehand grey is Hessa's issue. Dust settles here in about
  ninety minutes, which dates it.
- **Supports:** D2 (she was up here, where the discrepancy lives), D3.
- **Redundant path:** **This is the only physical trace of the abduction and it
  is the chapter's hardest gate — so the gate itself has seven keys rather than
  the clue having seven sources.** See §6.2 for why this counts. Additionally,
  if the player never reaches the duct, **Ivo's hatch log** (Open) records Hessa
  signing out at 02:44 and never signing back in, which substitutes for C5 in
  **D2 only** — not in D3. D3 is therefore genuinely gated on the set-piece, and
  O1 is genuinely gated on D3, which is correct: the loudest outcome should cost
  the most.
- **Notes:** Do not let the game announce "torn glove-liner (Hessa's)". The
  colour is *spinehand grey*, which is issue kit for a whole trade. The player
  connects it to C2 themselves or not at all.

---

### C6 `trave-flask`
- **Where:** Watch office, Deck C. *(canon)*
- **Gate:** Relationship-gated *(canon)*. Trave at ≥ *Wary*, meaning the player
  has spoken to him at least twice without accusing him.
- **Literal:** *His hands are not steady on the flask. In the bin under the desk,
  not shredded: a shelving-order stub, hand-written, one corner torn.*
- **Implication:** The Warden is drinking on watch, four hours into a shift, and
  disposed of a hand-written order carelessly. A shelving order is a detention
  form. The handwriting is a specimen.
- **Supports:** D3, D5.
- **Redundant path:** The stub can also be recovered from the Watch office bin
  during Hold Your Breath route 6 (theft) **without** the relationship gate — a
  player who steals the key sees the bin. And **Fen** reports the behavioural
  half at Open: *"Warden's been in his office since three and he's not come out
  and Bezhi says the bottle's out."*
- **Notes:** C6's two halves are separable. The **behaviour** supports D3. The
  **handwriting specimen** is what matches C10 and supports D5. If the player
  holds C6 and C10, the game may offer the comparison explicitly; if they hold
  only one, it may not hint at the other.

---

### C7 `captain-watchlog`
- **Where:** Fen, or the Commons bulletin. *(canon)*
- **Gate:** Open, both routes.
- **Literal (bulletin):** `SEALED CONFERENCE — VESTIBULE SUITE B — 02:40–04:00 —
  MASTER, BOARD LIAISON, RECORDING OFFICER. NO EXTERNAL TERMINAL.`
- **Literal (Fen):** *"Captain's been in the sealed room since twenty to three.
  Anouk had to leave the tray outside. They don't get terminals in there, that's
  the whole point of sealed."*
- **Implication:** Onwe could not have filed a record at 03:10. **On its own
  this is not exculpatory**, and the game must not treat it as such: the player
  has spent the whole chapter learning that records lie. An alibi that rests on
  a log is an alibi that rests on the same class of object as the forgery.
- **Supports:** D4. Downgrades D-X (see §5.2).
- **Redundant path:** Two canon sources; third is **Rask**, who took the minutes
  and will confirm attendance and duration at any relationship band, because to
  him it is a scheduling fact.
- **Notes:** Deliberately *insufficient alone*. This is the single most
  important piece of restraint in the chapter's design.

---

### C8 `registry-checksum`
- **Where:** Registry terminal. *(canon)*
- **Gate:** Access, T2. Four routes in §2.1, five on Security background.
- **Literal:** `FILING CLASS: REGISTRY (R-STAMP 4471-C). AUTH CLASS: COMMAND.
  NOTE: R-STAMP PRESENT ON COMMAND-AUTH FILING — CLASS MISMATCH.`
- **Implication:** The authorisation is Command. The *filing* is Registry. A
  Command-class terminal does not stamp. Therefore the record was typed on a
  Registry-class terminal by someone holding a Command credential they did not
  own. This is **positive attribution**: it says where the record came from, not
  merely where it did not.
- **Supports:** D4. Refutes D-X in combination with C7.
- **Redundant path:** Four independent access routes to the same terminal class
  (§2.1). The clue itself has one location, by canon; the *gate* is quadruply
  redundant. §6.2 argues this is the correct reading of "cannot be permanently
  lost".
- **Notes:** The class-mismatch note must be phrased as the terminal's own
  automatic annotation, not as an inference the game makes for the player. The
  system flagged it eleven months ago and nobody reads the flags. That is the
  ship in one line.

---

### C9 `cradle-log`
- **Where:** Medical. *(canon)*
- **Gate:** Access **or** persuasion *(canon)*.
- **Literal:** `ANNEX 3 — CRADLE OCCUPIED — ADMITTED 03:07 — PATIENT: [ ] —
  PROTOCOL: VESTIBULE — DEPTH: 4d — EST. COMPLETE 07:55`
- **Implication:** Someone is being smoothed, right now, four decks from the
  player, with their name suppressed, under an authority that is not Medical's.
  The completion estimate is a **countdown the player can read**: everything
  after this clue is timed.
- **Supports:** D3, D5.
- **Redundant path:** Three routes, canon-compatible. (a) **Medical background**
  — the player has ward terminal access outright. (b) **Wen Corrow**, persuasion
  at relationship ≥ *Wary*, or free if the player produces C6's behavioural half
  ("the Warden went down the ladder trunk with something at three"): Corrow
  logged the admission himself and will say so if given a reason it is not his
  fault. (c) **Ashkar**, persuasion at ≥ *Cooperative*, or at any band if the
  player produces C10. Ashkar's version is the most damning because she says the
  words *"I didn't open it"*.
- **Notes:** The blank patient field is the horror. Do not fill it in. The
  player must reach D5 by triangulation, never by reading a name.

---

### C10 `consent-form`
- **Where:** Medical. *(canon)*
- **Gate:** Access to the Annex 3 antechamber — the same access as C9, but the
  form is a physical sheet in the cradle's document sleeve, so it can also be
  reached by anyone who physically gets into the annex (including via the spine
  service hatch on the Deck D excursion).
- **Literal:** *A consent to therapeutic smoothing. Subject's name blank.
  Depth: 4d. Signed* **H. Quill** *in a hand that leans the wrong way, with a
  Q that has been started twice.*
- **Implication:** Consent was manufactured. The forger did not have a specimen
  of her signature and did not think anyone would compare. The handwriting is
  the same hand as C6's stub.
- **Supports:** D5.
- **Redundant path:** C6 substitutes for C10 in D5 by canon (`D5 = C9 + (C10 or
  C6)`). If the player holds neither, D5 is unreachable and O3 is closed — see
  §6.3 for why that is acceptable.
- **Notes:** The signature is signed **H. Quill** — a name — while the subject
  field is blank. Trave filled in the part he was forging and left blank the part
  the protocol tag suppresses. It is the mistake of a man doing two contradictory
  things at once.

---

### C11 `tessera-serial`
- **Where:** **Only by scanning the Registry Sentinel in battle.** *(canon)*
- **Gate:** Combat. Scanning is a first-round action available to every
  background at no resource cost; it is *not* hidden behind a build.
- **Literal:** `CAST SERIAL: KH-0-04417 / REGISTRY SENTINEL / CLASS: CUSTODIAL`
- **Implication:** The revenant defending the Cold Registry is running a cast
  whose serial prefix is a **place code**, not a Vestibule batch code. `KH-`.
  The first hard link between this ship and Kest Harbour. The player will not
  know what KH- means in Chapter One. They will remember it.
- **Supports:** D6.
- **Redundant path:** **Canon says "only by scanning the Registry Sentinel", not
  "only once".** The Registry Sentinel is therefore specified as a *class* of
  custodial revenant, not an individual: Ship's Registry projects a Sentinel
  whenever an unauthorised presence is detected in the Cold Registry envelope.
  Scanning any Sentinel yields C11. This preserves the canon sentence exactly
  and removes the permanent-loss hazard. See §6.2 and the open question at the
  end of this document.
- **Notes:** Destroying the Sentinel without scanning erases the evidence
  (canon §7) and the player is not told what they lost. The game logs it in the
  end-of-chapter summary as `EVIDENCE DESTROYED — 1` with no elaboration. That
  is the honest way to punish it.

---

### C12 `personnel-annex`
- **Where:** Registry terminal. *(canon)*
- **Gate:** Background-gated *(canon)*. Interpreted as: the **prompt** is
  background-gated, the **access** is T2.
  - **Registry background:** the annex surfaces unprompted while the player is
    running any other records lookup. Their own file is in the same index.
  - **All other backgrounds:** the player must choose to look themselves up.
    Reasons to do so are supplied by (a) Rask remarking that the player's prior
    postings are unusually tidy, (b) Stray checking whether the player is a
    plant, out loud, (c) any Trave scene in which he checks the player's file
    and pauses, (d) Sabbat addressing the player by service number.
- **Literal:** `[PLAYER NAME] — SERVICE FILE — ANNEXES: 1. ANNEX A (2229) —
  SEALED — ORIGINATOR: BUREAU OF DEEP REGISTRY — CONTENT UNAVAILABLE AT THIS
  CLASS.`
- **Implication:** In Chapter One: nothing the player can act on. It is a *hook*,
  not evidence. It says the Vestibule did something to the player eight years
  ago and sealed it, and it says the player's own file knows things the player
  does not.
- **Supports:** No Chapter One deduction. It seeds the game's spine and is the
  precondition for ending families 2 and 7.
- **Redundant path:** Available at T2 for the whole chapter and every chapter
  after; four routes to T2 (§2.1). Cannot be consumed or destroyed. If the
  player never looks, Chapter Two forces the prompt once, unmissably, and then
  never again.
- **Notes:** **No NPC may comment on the annex's content** (K23). Rask, if
  shown it, says the true and useless thing: *"Sealed at Bureau class. I'm
  Bureau and I can't read it, which tells you which end of the Bureau sealed
  it."*

---

### C13 `onwe-grudge`
- **Where:** Fen. *(canon)*
- **Gate:** Open. Fen offers it unprompted the moment the player mentions Hessa.
- **Literal:** *"Well — I mean, the Captain had her written up. Twice. Once for
  the duct hours and once for talking back in front of the whole muster. Hessa
  said she'd rather be right than rostered."*
- **Implication:** Motive. Onwe disliked Hessa, Onwe's authorisation is on the
  record, Onwe is unreachable behind a sealed deck. Three quarters of a case.
- **Supports:** **D-X only.** It supports the wrong answer *(canon)*.
- **Redundant path:** Corroborated by **Sura Pell** and by the Watch file if the
  player has T2. The wrong answer is deliberately the best-sourced claim in the
  chapter, which is the whole trick: sourcing is not truth.
- **Notes:** Fen is not lying and must never be revealed as lying. Everything Fen
  says is accurate. The error is entirely the player's inference.

---

## 4. The deduction graph

Canon requirements, unchanged, with the evidence-kind analysis that proves F2.

| ID | Claim | Requires *(canon)* | Evidence kinds | Independent? |
|---|---|---|---|---|
| D1 | Hessa never transferred | C1 + (C2 or C3) | record + (physical or testimony) | Yes |
| D2 | The cargo is not what the manifest says | C4 + (C3 or C5) | data + (testimony or physical trace) | Yes |
| D3 | Hessa was taken, not lost | C5 + C2 + (C6 or C9) | physical trace + physical + (behaviour or medical record) | Yes, three kinds |
| D4 | The record was forged from Registry, not Command | C7 + C8 | log/testimony + forensic metadata | Yes |
| D5 | Hessa is in Medical Annex 3 | C9 + (C10 or C6) | medical record + (document forensics or behaviour) | Yes |
| D6 | The ship is carrying cast human minds | C11 + C4 | combat scan + data | Yes |
| **D-X** | *The Captain did this* | C1 + C13, and **not** (C7 + C8) | record + testimony | Yes — and that is the problem |

### 4.1 Deduction dependency

D1–D6 do not require each other. This is deliberate: the chapter must not have a
critical path, because a critical path lets one missed conversation lock a
player out of the whole story. Deductions are **parallel readings of a shared
clue pool**, and outcomes read the deduction set, not a sequence.

Semantic clustering, for UI grouping only:

- **The disappearance:** D1 → D3 → D5. Escalating: *she didn't go* → *she was
  taken* → *she is here*.
- **The cargo:** D2 → D6. *The manifest lies* → *the lie is people*.
- **The forgery:** D4, and its shadow D-X.

### 4.2 Deduction confidence

Clues do not only satisfy requirements; they move a confidence band. The band is
shown; the mechanism is not.

| Band | Meaning | Shown as |
|---|---|---|
| **Absent** | Requirements unmet, no supporting clue held | Not listed |
| **Suspected** | Some but not all requirements | Italic, greyed, phrased as a question |
| **Supported** | Requirements met | Plain, phrased as a statement |
| **Confirmed** | Requirements met with a redundant source held | Plain, with a source count |
| **Refuted** | A contradicting requirement is satisfied | Struck through, kept visible forever |

Only **Supported** or better may be used as leverage in conversation or as an
outcome requirement. **Refuted** deductions are never deleted from the casebook —
the player must live with having believed it, and in a D-X playthrough that
scar is the point.

---

## 5. The red herring, D-X

### 5.1 Why it works

Every property of a sound case is present:

- **Motive:** C13, from the warmest and most reliable source in the chapter.
- **Means:** C1, an authorisation string with the Captain's name on it.
- **Opportunity:** unfalsifiable, because Deck A is sealed and the Captain
  cannot be asked.
- **Institutional plausibility:** masters do transfer inconvenient crew, and the
  player has been aboard long enough to have seen it.
- **Emotional fit:** the player wants a villain, and an absent one is ideal.

D-X forms *without the player doing anything wrong*. It is the default reading of
the two most freely available clues in the chapter. A player who investigates
lazily arrives at it; a player who investigates hard arrives at it *first* and
then has to dismantle it.

### 5.2 How it is refuted — and why C7 alone does not do it

Canon: D-X holds while **not (C7 + C8)**. Both are required. C7 alone leaves it
standing. This is correct and must be defended in implementation:

> C7 is a **log**. The player is at that moment holding C1 — a log that is a
> lie. The chapter's entire lesson is that records on this ship are
> instruments. An alibi drawn from the same record system as the forgery cannot
> refute the forgery. It can only make the player uneasy.

Mechanically, therefore:

| Held | D-X band | Casebook text |
|---|---|---|
| C1 + C13 | Supported | *The Captain ordered Quill removed.* |
| C1 + C13 + C7 | Supported, **flagged** | *The Captain ordered Quill removed.* — `CONFLICT: subject had no terminal access at filing time. Log-sourced.` |
| C1 + C13 + C8 | Supported, **flagged** | *The Captain ordered Quill removed.* — `CONFLICT: filing class does not match authorisation class.` |
| C1 + C13 + C7 + C8 | **Refuted** | ~~*The Captain ordered Quill removed.*~~ Superseded by D4. |

The flags are visible. The player is warned twice before they act on it. If they
act anyway, that is a decision, not a trap.

### 5.3 Obtainability proof

- C7: **Open**, two canon sources plus Rask. Available to every background from
  ~04:20.
- C8: **Access T2**, four independent routes (§2.1), none of which requires
  combat, none of which requires a specific department, and one of which
  (Sabbat) is *offered to the player unprompted* if they behave procedurally.

Therefore D-X is refutable on every background, with no combat, no theft
required, and no relationship above *Cooperative*. F5 satisfied.

### 5.4 Carrying D-X out of the chapter

A player who ends Chapter One with D-X at Supported carries flag
`BELIEF_ONWE_GUILTY`. This flag:

- makes the Chapter Three Onwe alliance materially harder (she is not stupid;
  she has read the accusation);
- is the primary seed of ending family 9, *A Plausible Error*;
- is clearable at any later point by obtaining C8, which remains available
  forever.

**Ending family 9 must never be reachable by a locked door.** It is reachable by
a player who kept walking past an open one.

---

## 6. Fairness proofs

### 6.1 F2 — two independent sources per deduction

Independence rule: two items are independent if they come from different
**producers** — a machine record, a human mouth, a physical object, a forensic
property, or an observed behaviour — *and* would not both fail for the same
reason.

| Deduction | Source A (kind, producer) | Source B (kind, producer) | Common-mode failure? |
|---|---|---|---|
| D1 | C1 — record, ship system | C2 — physical object, Hessa's kit **or** C3 — testimony, Stray | No. A forged record and a pair of boots cannot be forged by the same act. |
| D2 | C4 — data, trim system | C3 — testimony **or** C5 — physical trace | No. |
| D3 | C5 — physical trace, the duct | C2 — physical object + C6 behaviour **or** C9 record | No. Three producers. |
| D4 | C7 — log/testimony, conference record | C8 — forensic property of the forgery itself | **Partially.** Both are records. Mitigated: C8 is not a *claim* in a record, it is a *property* of the forged object — the forger would have had to defeat the stamping system, not merely type something. Independence holds. |
| D5 | C9 — medical record | C10 — document forensics **or** C6 — behaviour + handwriting specimen | No. |
| D6 | C11 — combat scan of a live object | C4 — trim data | No. |

D4 is the weakest link and is called out honestly. It survives because C8 is a
*machine artefact of the crime*, not an assertion about it — the difference
between a witness saying "he was there" and a fingerprint.

### 6.2 F3 — no chapter-critical clue can be permanently lost

**Definition.** A clue is *chapter-critical* if it is required (with no `or`
alternative) for a deduction that is required for a Chapter One outcome.

Outcome requirements *(canon §6)*: O1 needs D3. O3 needs D5. O2 and O4 need
nothing.

Therefore chapter-critical clues are: **C5, C2** (D3), **C9** (D5), and the
alternation members C6/C10 and C6/C9.

| Clue | Critical? | Can it be consumed, destroyed, or timed out? | Redundant path |
|---|---|---|---|
| C1 | No (D1 only) | No — unmissable at muster | Bulletin copy |
| C2 | **Yes** (D3) | No. Physical, static, in a room the player has free access to for the whole chapter. | Kell's statement; Ivo's kit-store record |
| C3 | No | Stray remains available all chapter under every outcome path | Delisle's partial overhear |
| C4 | No (D2 has `or`; D6 needs it) | No. Public readout, always on. | T2 terminal; Cael from memory |
| C5 | **Yes** (D3) | **The set-piece can fail.** A failed Hold Your Breath attempt does not lock the duct — it raises Watch suspicion and closes *that route*. Six other routes remain. | Seven independent routes (§7). Route 7 (force) is always available and needs nothing but a willingness to fight, so the duct is unlockable by every build in every state. |
| C6 | Yes (as an alternation member) | The Watch office closes for 40 min after a failed theft; it reopens | Theft route sees the bin without the relationship gate; Fen supplies the behavioural half |
| C7 | No | No | Bulletin; Fen; Rask |
| C8 | No (D4 not outcome-required) — but **refutation-critical** | No. Terminals do not expire. | Four T2 routes |
| C9 | **Yes** (D5) | The cradle completes at 07:55, but the *log* persists after completion — completion changes Hessa's outcome, not the clue's availability | Medical background; Corrow; Ashkar |
| C10 | Yes (alternation member) | Physical sheet; could be removed by Trave only in a branch that does not occur in Ch1 | C6 substitutes by canon |
| C11 | No for Ch1 outcomes; **yes for the game's spine** | **Destroyable** — finishing the Sentinel without scanning erases it | Sentinel is a *class*, not an individual (§3, C11). Recurs in Ch2 Cold Registry approaches. |
| C12 | No | No | Forced prompt in Ch2 |
| C13 | No | No | Pell; Watch file |

**The two honest weaknesses, stated rather than hidden:**

1. **C5's redundancy lives in the gate, not the clue.** There is exactly one
   duct and exactly one set of drag marks. What is sevenfold-redundant is the
   *means of arrival*. This is the correct design — the chapter's set-piece
   should be a real obstacle — but it means a player who refuses all seven
   routes cannot reach O1. Route 7 (force) requires only the willingness to
   start a fight the game has already taught them how to have, so no build is
   excluded; only a choice is.

2. **C11 is single-source and destructible.** It is the only clue in the chapter
   with that property, and it is the one that seeds the entire game. The
   class-not-individual reading of the Registry Sentinel is the mitigation, and
   it is flagged for the lead below.

### 6.3 F4 — the chapter cannot dead-end

O2 (file with Sabbat) and O4 (say nothing) have **no evidence requirement**.
A player who obtains zero clues beyond the unmissable C1 still reaches 08:00 and
still resolves the chapter, with consequences that are meaningful rather than
punitive:

- **O4 with almost nothing** is the coldest and least informed run, and the game
  does not tell the player they missed anything.
- **O2 with almost nothing** is procedurally correct, gets the player promoted
  into Sabbat's confidence, and is the fastest route to the *access* the player
  will need later.

Neither is a failure state. Both are playable into every ending family that does
not require Chapter One evidence. There is no losing Chapter One.

### 6.4 F5 — see §5.3. Satisfied.

---

## 7. The set-piece: Hold Your Breath (gate on C5)

Seven routes *(canon)*, with the cost of each. All seven are always present; the
player's background makes one of them cheap, never exclusive.

| # | Route | Requirement | Cost / risk | Faction effect |
|---|---|---|---|---|
| 1 | Maintenance background | Held from start | None. You have the key because it is your key. | — |
| 2 | Kill the hatch tell-tale from the Commons breaker panel | Engineering background, **or** any player who has spoken to Cael about the panel | Ship's Registry logs a breaker fault; +1 Watch suspicion if repeated | — |
| 3 | Walk in; Ivo salutes | Security background | None. Ivo logs the entry under your name, which is a record that exists later. | T&V +1 |
| 4 | Forge a hazard-quarantine tag from Dispensary C supply | Medical background, **or** any player with C9 (you know what a Vestibule tag looks like) | Fails if Ashkar is in the dispensary; retry costs 20 min | Vestibule −1 if discovered |
| 5 | Stray distracts Ivo | Stray at ≥ *Trusting* | She will ask for something later and the game will remember | Ninth Watch +2 |
| 6 | Lift Trave's key from the Watch office | Any background; check against Trave's current state (drunk = easier) | Caught: +2 Watch suspicion, Watch office closed 40 min, Trave relationship −1. Also yields C6's stub without the relationship gate. | T&V −1 |
| 7 | Fight Ivo's revenant, the *Bailiff* | Any background | Loudest. +3 Watch suspicion. Ivo is injured and remembers. Sabbat is informed by 05:30. | T&V −2, Ninth Watch +1 |

**Convergence.** All seven routes deliver the player into the frame-611 crawl.
The **Registry Sentinel** projects when the player passes the Cold Registry
bulkhead inside the crawl — it is the guardian of the hold, not of the hatch, so
it is encountered on every route, and C11 is therefore available to every player
who reaches C5. Players who never attempt the duct never meet a Sentinel in
Chapter One and must recover C11 in Chapter Two.

---

## 8. Reveal order

Earliest realistic acquisition, assuming a player who follows the obvious thread.
"Earliest" is the first minute the clue is *available*, not when a typical player
finds it.

| Ship-time | Available | Gate character |
|---|---|---|
| 04:00 | **C1** | Forced. The chapter's premise. |
| 04:05 | **C13** | Free. The wrong answer arrives fifth-first. |
| 04:10 | **C2** | Free, if the player thinks to look at her kit. |
| 04:15 | **C4** (T0) | Free, ambient — the readout is on a Commons wall. |
| 04:20 | **C7** | Free, ambient — the bulletin is next to the readout. |
| 04:30 | **C3** | One honest conversation. |
| 04:45 | **C6** (behaviour half, via Fen) | Free. |
| 05:00 | **C9** | Medical background free; others need Corrow or Ashkar. |
| 05:00+ | **C8** | Registry background free; others need a T2 route. |
| 05:15 | **C10** | With Annex access. |
| 05:30 | **C6** (full, in office) | Trave at *Wary*. |
| 05:30–07:00 | **C5**, **C11** | The set-piece. This is the chapter's mass. |
| any, T2 | **C12** | Registry background free; others must think to look. |
| 07:55 | *Cradle completes* | Not a clue. A deadline. |
| 08:00 | Outcome | — |

**Deliberate shape:** the wrong answer is fully assembled by 04:20. The right one
is not assemblable before ~05:30 and usually lands after 06:30. The player spends
between two and three hours of ship-time being confidently wrong. That is the
chapter.

---

## 9. What the player can reasonably believe, by stage

Five stages. Each states the *best available reading* of the evidence held — not
the truth. Writers should be able to name which stage a scene is written for.

### Stage 0 — 02:00–04:00, before the premise
*Held: nothing.* Belief: this is an ordinary watch. Hessa took the spine run.
The loom check is routine. Nothing is wrong and the game is a job simulator.
**Function:** establish normal so the player can detect abnormal without being
told.

### Stage 1 — the transfer is odd
*Held: C1, C2 or C3.* Belief: **Hessa did not transfer.** Either the record is
wrong, or something happened to her. Most players suspect an accident first — the
spine is dangerous. **D1 available.**
**What is not yet believable:** that anyone did this deliberately.

### Stage 2 — the wrong answer
*Held: C1, C13, usually C2, C3, C4.* Belief: **the Captain removed a
troublemaker and dressed it as a transfer.** The player has motive, means, an
unreachable suspect, and a friendly witness. This is a *good* case. **D1, D2,
D-X available.**
**What is not yet believable:** that the record's own metadata contradicts its
authorisation. That the cargo has anything to do with it — C4 reads as a separate
scandal, and most players file it as background corruption.

### Stage 3 — the case comes apart
*Held: add C7, and/or C8.* Belief: **the Captain could not have filed this, and
somebody in Ship's Registry did.** With C7 only, unease: the alibi is a log, and
logs lie. With C8, attribution: it came from Registry. The player does not yet
know *who* in Registry. **D4 available; D-X refuted with both.**
**Now believable and probably wrong:** that a Registry clerk acted alone.
**Not yet believable:** that the Board liaison ordered it. Sabbat has not
appeared as a suspect and must not be pushed forward. He has been helpful all
chapter.

### Stage 4 — she is alive and she is close
*Held: add C5, C6, C9, C10.* Belief: **Hessa was taken out of the duct by force
and is in a cradle in Medical Annex 3 having four days cut out of her, and the
Warden did it and has been drinking about it since.** **D3, D5 available.** The
countdown to 07:55 becomes the chapter's engine. The player now has a person to
save and roughly ninety minutes to do it.
**Not believable:** that Trave originated it. He is too frightened and too
stupid about the depth setting to be the author, and a thoughtful player will
feel the shape of somebody above him without being able to name them.

### Stage 5 — the floor drops
*Held: add C11, with C4. Optionally C12.* Belief: **the undeclared 1,710 t is
tesserae — cast human minds — and the serial prefix is a place.** **D6
available.** Nothing in Chapter One tells the player what `KH-` stands for, and
nothing should. With C12, a second unresolved thread: *the Vestibule sealed
something about me in 2229.*
**What Stage 5 correctly withholds:** Kest Harbour, live casting, 91,400, 9-B,
and the player's own index status. All five are Chapter Three and beyond.
**What Stage 5 correctly delivers:** the certainty that Hessa's disappearance and
the cargo are the same story, which is the only thing Chapter One owes the game.

---

## 10. Casebook implementation notes

1. **Clues are objects, deductions are conclusions.** Clues can be confiscated
   (O2). Deductions cannot. This asymmetry is the mechanical statement of the
   chapter's theme, and it must be taught before O2 is offered: the first time
   the player forms a deduction, the UI states, once, that a conclusion drawn
   cannot be taken back.
2. **The game never announces a deduction is available.** It shows the clue pool
   and lets the player propose. A deduction the player did not assemble is not a
   deduction they hold.
3. **A wrong proposal costs nothing but is recorded.** Failed proposals appear
   in the casebook margin. Over a playthrough this becomes a portrait of how the
   player thinks, and Chapter Five uses it.
4. **No stingers.** No sound cue on clue acquisition (see `AUDIO_DIRECTION.md`).
   The casebook count changes. That is all.
5. **The countdown is diegetic.** `EST. COMPLETE 07:55` is a field on a medical
   record, not a HUD timer. If the player never reads C9, they never know there
   was a clock, and that is the correct punishment for not looking.

---

## Open questions for the lead

1. **C11's single point of failure — the most serious fairness issue in the
   canon.** C11 is the only link between this ship and Kest Harbour, it is
   obtainable exclusively by scanning in combat, and canon §7 states that
   destroying a revenant erases evidence. A player who wins the Registry
   Sentinel fight efficiently deletes the spine of the game and is never told.
   This document mitigates by reading "the Registry Sentinel" as a *class* of
   custodial revenant that Ship's Registry projects on any Cold Registry
   intrusion, so a second scan is always possible in Chapter Two. **This needs
   an explicit ruling.** The alternatives are worse: a tutorial that teaches
   scanning so hard it becomes reflex (patronising), or auto-scan (destroys the
   spare-or-destroy choice that makes combat feed the mystery).
2. **Does the player ever leave Deck C?** Canon §6 sets Chapter One on Deck C,
   but C5 is above the Cold Registry (Deck F envelope) and C9/C10 are in Medical
   (Deck D). This document resolves it as *Deck C is the hub; the spine permits
   three excursions* — frame 611 above the Cold Registry, the Deck D Medical
   annex service hatch, and the Deck B Ship's Registry office. If the lead
   intends a hard Deck C confinement, then C9, C10 and C5 all need relocating,
   which changes the chapter substantially. This should be settled before any
   level work starts.
3. **D4's independence.** Both of D4's requirements are record-derived (§6.1).
   The argument that C8 is a machine artefact rather than a claim holds, but it
   is the thinnest fairness argument in the document. If the lead wants a third
   source, the natural candidate is a **human witness to the filing** — someone
   who saw Trave at the Watch office console at 03:10. Fen is the obvious
   supplier and it costs nothing. Not added, because it would alter D4's canon
   requirement.
4. **Is D6 required for anything in Chapter One?** No outcome requires it. That
   makes the game's most important Chapter One discovery entirely optional. This
   may be correct — it means the second playthrough has something to find — but
   it should be a decision rather than a consequence of the outcome table.
5. **C12 and the background gate.** Canon says "background-gated". This document
   reads that as *the prompt is background-gated, the access is T2*, so a
   non-Registry player can still reach it with a reason. The strict reading —
   only Registry players ever see C12 — would lock four of five backgrounds out
   of the game's central hook in Chapter One. Confirm the loose reading.
6. **Delisle's overhear as a C3 substitute.** Added here for redundancy. It
   slightly weakens Stray's uniqueness as a source. Acceptable, but flagging it
   because it is an addition to a canon clue's availability.
