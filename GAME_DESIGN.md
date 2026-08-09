# CANDLEWAKE — GAME DESIGN

**Status:** derived from `docs/CANON.md`. Canon is law.

**What this document is for:** the systems argument. What the pillars are, how
each one feeds the others, what the player actually does minute to minute, what
grows over a playthrough, and what a session looks like.

**One-line pitch, for internal use only:** *A top-down sci-fi mystery RPG about
being the crew member who finds out, aboard a ship that is carrying ninety-one
thousand people it says are cargo.*

---

## 1. Pillars

Six. None is decorative; each one is load-bearing for at least two others.

| # | Pillar | The player verb | Failure mode we are designing against |
|---|---|---|---|
| P1 | **Exploration** | Go somewhere you were not cleared for | Corridors as connective tissue between content |
| P2 | **Investigation** | Notice, collect, and *propose* | Clue-vacuuming; the game deducing for you |
| P3 | **Social** | Ask, trade, lie, and be known | Dialogue as a vending machine for quest flags |
| P4 | **Choice & consequence** | Decide with incomplete information | Choices that resolve within the scene |
| P5 | **Turn-based combat** | Project a dead person and spend their coherence | Combat as an unrelated minigame between story |
| P6 | **Character development** | Become someone the ship treats differently | XP grind, level gates, stat inflation |

### P1 Exploration

The *Candlewake* is 1.9 km of corridor and duct. Movement is top-down and
continuous; the map is not revealed by a minimap but by having been there.
Access is the resource, not distance: most doors are unlocked and most are
logged. The interesting question is never *can I reach it* but *what does
reaching it record about me*.

Three movement layers:
- **Corridors** — public, lit, logged at bulkhead transits.
- **Departments** — access-tiered, staffed, and someone notices.
- **The spine** — maintenance ducts running the full 1.9 km, touching every
  deck, unlogged, cramped, loud, and the only unobserved route on the ship.

The spine is the game's central spatial idea: an unmonitored path through a
monitored world. It is also where Hessa was taken from, which teaches the player
in Chapter One that the unobserved route is unobserved in both directions.

### P2 Investigation

The player collects **clues** (objects, records, statements, traces) and
proposes **deductions**. The game never proposes a deduction. See
`MYSTERY_STRUCTURE.md` §10.

- Clues have IDs, sources, and a kind (record / testimony / physical / forensic /
  behaviour).
- Deductions require at least two clues of independent kind. No single-clue
  reveals — canon §9.
- Deductions have a confidence band, and refuted deductions stay in the casebook
  permanently.
- Clues can be lost (confiscation, destruction). Deductions cannot.

### P3 Social

Relationships are a four-band ladder per NPC, not a number bar:

| Band | Meaning | What it unlocks |
|---|---|---|
| **Closed** | They will not engage beyond function | Nothing |
| **Wary** | They will answer direct questions honestly | Most testimony clues |
| **Cooperative** | They will do small things at small cost to themselves | Credential loans, lookups, cover |
| **Trusting** | They will take a risk for you | Set-piece assistance, secrets, faction introductions |

Bands move on **consistency**, not on gift-giving. The two general rules:

1. **Being caught in a lie drops a band and is not recoverable in the same
   chapter.** NPCs compare notes off-screen; Fen's network is the mechanism.
2. **Producing a clue an NPC did not know you had moves a band in whichever
   direction that NPC's interests point.** Showing Stray the manifest figure
   raises her. Showing Trave the shelving stub lowers him and raises the
   pressure on him, which is a different axis.

### P4 Choice & consequence

Choices are of three sizes and the game visually distinguishes none of them,
because the player should not be able to tell which conversation was the
important one until later.

- **Local** — resolves within the scene (who to believe now).
- **Chapter** — the four Chapter One outcomes O1–O4, and their equivalents.
- **Standing** — faction reputation and evidence held, which accumulate silently
  and are read by the ending matrix.

No choice is reversible and none is signposted with a warning. The mitigating
design is **information**: a well-investigated player makes a choice with more
of the picture, which is the game's actual reward loop.

### P5 Turn-based combat

Canon §7. Every crew member carries a tessera and a wrist loom. Disputes,
security actions and hazard clearance are settled by projecting **revenants** —
field-bodies wearing a dead person's competence. It is normal aboard, which is
precisely why nobody questions a hold full of tiles.

Two resources:
- **Integrity** — the revenant's field-body. Zero = collapse (the projection
  ends; the projector is unharmed but exposed).
- **Coherence** — the cast's grip on itself. Abilities spend it. At zero the
  revenant acts erratically and takes escalating damage.

Five **aspects**: Kinetic, Thermal, Field, Cognitive, Corrosive.

Seven **statuses**: Frayed, Static, Anchored, Bleedover, Recursion, Sealed,
Guttering.

Turn order is initiative-based on the *projector*, not the revenant — the person
holding the loom is the one making decisions and the one who can be interrupted.

Three end-states for any enemy revenant, and this is the whole point of combat
existing:

| End-state | Cost | Mystery consequence |
|---|---|---|
| **Scan** (a first-round action, free, every build) | One action, taken under fire | Reads the cast serial. Evidence. |
| **Destroy** | Fastest, safest | **Erases evidence.** Never announced at the time. |
| **Spare** (drop to low Integrity and withdraw the loom) | Costs coherence and turns | **Leaves a witness** — the projector saw your face and reports it. |

### P6 Character development

**There is no XP and no levels.** Canon gives no experience economy and the
fiction does not support one: an eleven-month voyage does not make a spinehand
into a soldier. Four things grow instead — see §4.

---

## 2. How each pillar feeds the others

Read the row as the source and the column as the destination: *"how does the row
pillar feed the column pillar?"* Diagonal blanked.

| ↓ feeds → | Exploration | Investigation | Social | Choice | Combat | Development |
|---|---|---|---|---|---|---|
| **Exploration** | — | Physical clues exist only in places (C5 in the frame-611 crawl). Reaching a room *is* the clue acquisition. | Where you go decides who you meet on shift; department geography is a social schedule. | Being seen somewhere is a standing consequence you cannot undo. | Access violations project custodial revenants. The Registry Sentinel is a *place* that fights back. | Access is the primary growth axis. Every new door is permanent progression. |
| **Investigation** | Clues name locations you did not know existed — C4's figure sends you to the keel envelope. | — | Clues are conversational currency: producing one to an NPC opens topics no dialogue tree would. | Deductions are the outcome gates (O1 needs D3, O3 needs D5). Knowing more literally means more choices. | Scanning is an investigative act performed inside combat; the casebook is why you take a turn not attacking. | The casebook is the most visible growth in the game. It is the character sheet. |
| **Social** | NPCs open doors — Stray distracts Ivo, Rask runs a lookup, Sabbat grants a read tier. | Testimony is a whole evidence kind. Half the clue graph is a person's mouth. | — | Relationships are ending-matrix inputs, and the person you trusted is the branch you took. | Sparing a revenant is a social act with a combat cost; the projector remembers. Allies can project alongside you. | Relationship bands are progression with no number attached. |
| **Choice** | Chapter outcomes open and close decks. O2 raises the player's access; O3 triggers ship-wide lockdown. | O2 confiscates every clue not cited by a confirmed deduction — a choice that edits your evidence. | Outcomes reassign NPC bands wholesale: O1 makes Trave an unstable ally, O3 makes Stray a real one. | — | Faction standing changes who projects at you. The Ninth Watch does not fight its own. | Choices are the only thing that changes who you are to the ship. |
| **Combat** | Custodial revenants gate hazardous space; clearing one opens the space permanently. | Scan → serial → C11 → D6. Combat is the *only* source of the game's central link. | Sparing leaves a witness who becomes an NPC with an opinion of you. Destroying leaves a projector with a grievance. | Destroy-vs-scan-vs-spare is a consequence choice wearing a tactics costume. | — | New tesserae are the closest thing to a build, and they come from the story, not from drops. |
| **Development** | Higher access tiers open decks; the spine needs no tier, which is why it matters. | T2 access is the gate on C8 and C12. Investigation capacity *is* access. | Reputation with a faction changes opening lines before you speak. | Ending eligibility is read directly off evidence held, relationships, standing and survival. | Tessera capability determines aspect coverage and status access. | — |

**The three interlocks that matter most**, called out because they are the ones
a schedule cut would break:

1. **Combat → Investigation → Choice.** Scan produces C11, C11 produces D6, D6
   is the player's first sight of the real story. Cutting the scan action guts
   the game.
2. **Social → Exploration → Investigation.** Stray at *Trusting* distracts Ivo,
   which reaches the duct, which yields C5, which yields D3, which unlocks O1.
   Every pillar in one chain.
3. **Choice → Investigation.** O2's confiscation is the only mechanic in the
   game where a narrative decision reaches into the player's inventory and takes
   things out. It teaches, in one stroke, that deduction is safer than
   collection.

---

## 3. The core loop

### 3.1 The moment-to-moment loop (30 seconds to 3 minutes)

```
   observe a space  →  find something out of place  →  ask someone about it
          ↑                                                    ↓
   new access / new place   ←   propose a deduction   ←   get a name, a number,
                                                          or a door
```

### 3.2 The scene loop (10–25 minutes)

1. **A thread opens** — a clue names a place, a person, or a discrepancy.
2. **The thread is gated** — access tier, relationship band, or a hazard.
3. **The player picks a key** — background, social, forgery, theft, or force.
   Every gate has at least three keys and at least one that costs nothing but
   nerve.
4. **The gate charges a price** — a log entry, a suspicion point, a favour owed,
   a witness.
5. **The clue lands in the casebook** as an object with a source, not as a
   conclusion.
6. **The player proposes** — or does not. Proposing is a player action.
7. **The proposal changes what can be said** — deductions are leverage in
   dialogue, and leverage opens the next thread.

### 3.3 The chapter loop

**Premise → drift → the wrong answer → the answer coming apart → the deadline →
the decision → the cost arriving later.**

Chapter One is the template and the tutorial for this shape: the wrong answer is
assemblable by 04:20 and the right one rarely before 06:30
(`MYSTERY_STRUCTURE.md` §8). Every subsequent chapter repeats the shape at a
larger scale with the player's prior decisions as the constraint set.

---

## 4. Progression — what actually grows

No XP. No levels. No stat points. Four axes, all of them narrative objects that
happen to be mechanical.

### 4.1 Access

The primary axis. Access is a set, not a number, and it is spent as often as it
is gained.

| Kind | Examples | Gained by | Lost by |
|---|---|---|---|
| **Credential tier** | T1 crew → T2 Registry-class → T4 Vestibule protocol | Background, borrowed credential, theft, forgery, Sabbat's patronage (O2) | Suspicion thresholds, lockdown (O3), being caught |
| **Physical key** | Trave's duct key, Dispensary C stock key | Theft, gift, confession | Confiscation, search |
| **Standing permission** | Free passage through the Watch cordon | Faction reputation | Faction reputation |
| **Spine geometry** | Known duct junctions and where they surface | Having crawled them | Never lost |

**Spine geometry never decays.** It is the only permanent, unrevokable
progression in the game, and it is knowledge rather than permission. That is
thematically the point.

### 4.2 Evidence

The casebook. Clues held, deductions confirmed, refutations recorded, failed
proposals in the margin.

- Grows by investigation and by combat scanning.
- Shrinks only by O2-style confiscation and by destroying revenants.
- **Deductions never shrink.** Once you have concluded it, you have concluded it.
- The casebook is read directly by the ending matrix. It is the character sheet.

### 4.3 Relationships

Twelve to sixteen tracked NPCs, four bands each (§1 P3), plus five faction
reputations (`FACTIONS.md`).

Growth is not monotonic and cannot be maxed: several relationships are mutually
exclusive past *Cooperative*, because the people involved are in opposition.
Trave at *Trusting* and Stray at *Trusting* in the same playthrough is possible
only through a narrow and costly path, and the game does not tell you it exists.

### 4.4 Tessera capability

The closest thing to a build. Canon fixes the Chapter One issue:

| Background | Issued tessera | Aspect lean | Signature |
|---|---|---|---|
| Maintenance | **Grey Liner** (spinehand) | Kinetic / Corrosive | Works in confined space; ignores hazard terrain |
| Medical | **Lampwright** | Thermal / Field | Restores Coherence to allied projections |
| Registry | **Tallyman** (registry clerk) | Cognitive | Reads and applies enemy statuses; best scanner |
| Security | **Truncheon** (watch) | Kinetic | Applies Anchored; controls position |
| Engineering | **Kiln** (loom tech) | Thermal / Field | Manipulates the projection field itself |

Capability grows three ways, none of them a grind:

1. **New tesserae**, acquired as story objects. Every one is a dead person with
   a name and a provenance, and acquiring one is a scene, not a drop.
2. **Familiarity** — repeated projection of the same cast unlocks that cast's
   deeper competences. Mechanically this is a use-count; narratively it is the
   revenant getting used to you, which is not a comfortable idea and should not
   be written as one.
3. **Loom condition** — the wrist loom can be maintained, modified, or damaged.
   Engineering backgrounds and Cael are the routes.

**What deliberately does not grow:** the player's own body, damage numbers,
health pools, or any abstract "power". The player is a crew member for the whole
game. Nothing they do makes them harder to detain.

---

## 5. Chapter One — beat sheet

**Third Watch.** Deck C hub, 02:00–08:00 ship-time. Canon §6.

Target length: 90–150 minutes for a thorough player; 45 for a player who takes
O2 or O4 early. There is no fail state (`MYSTERY_STRUCTURE.md` §6.3).

### 02:00–03:00 — Watch begins *(tutorial; nothing is wrong)*

| Beat | Content | Teaches |
|---|---|---|
| 02:00 Sign-on | The player and Hessa are logged as a working pair at the Deck C muster board. Fen hands out tea. The watch list splits: Hessa takes the spine run at frame 611, the player takes Deck C. | Muster terminal; the ship's tone; that Hessa exists and is likeable in about ninety seconds |
| 02:02–02:12 The last conversation | Free-roam with Hessa. She is cheerful, competent, and mildly resentful of the Captain. She takes the spine run because the player looks tired. She does not say that. | Movement, interaction, the relationship band UI |
| 02:14 Loom check | Cael runs the watch's mandatory projection check in the Commons. The player projects their issued tessera against Cael's **Second Loom**. Fully scripted, unloseable. | Combat: Integrity, Coherence, aspects, and **the scan action** — the tutorial makes the player scan the Second Loom and read Cael's grandmother's serial off it. This is the only place the game will ever teach scanning. |
| 02:20–03:55 The watch list | Four to six mundane tasks across Deck C: a jammed liner press, a bulkhead seal check, a stores count, a hydro sample run to the Deck D lift lobby. Each introduces one room and one NPC. Two of them can be skipped. | Geography, the cast, and *normal* — so abnormal can be felt rather than announced |

**Ambient, unremarked:** at 03:07 the lights in the habitation ring dip for two
seconds (the Annex 3 cradle drawing). At 03:18 the Watch office door closes and
does not reopen. Neither is flagged. Both are noticed on a second playthrough.

### 04:00 — Muster *(the premise)*

The mid-watch muster. Hessa does not answer. The muster terminal shows **C1**.
The chapter's title card is the record, not a cutscene.

**Design note:** the player is not given an objective. Nobody says "find Hessa".
The Watch marks her transferred and the muster moves on. The player either cares
or does not, and the game's first real choice is whether to be the person who
follows it up.

### 04:00–05:00 — Drift *(the wrong answer assembles itself)*

| Beat | Content |
|---|---|
| Fen, immediately | **C13** offered unprompted, warmly, in good faith. The wrong answer arrives before the player has asked a question. |
| Hessa's bunk | **C2**. Boots racked, liner folded, slate charger empty. |
| Commons wall | **C4** at T0 and **C7** on the bulletin, four metres apart. Both ambient. A player who reads the room gets the cargo scandal and the Captain's alibi in the same thirty seconds and will file the first as irrelevant. |
| Stray, if approached honestly | **C3**. |
| Watch office | Closed. Trave does not answer. This is the first locked door and it is locked by a person, not a credential. |

By 05:00 a typical player holds C1, C2, C3, C4, C13 and possibly C7, and
believes the Captain did it (`MYSTERY_STRUCTURE.md` §9, Stage 2).

### 05:00–06:00 — Pressure *(threads multiply, the ship gets narrower)*

| Beat | Content |
|---|---|
| Medical opens | Corrow, Ashkar, and **C9** — with the `EST. COMPLETE 07:55` field. The chapter acquires a clock. |
| **C10** if the annex is reached | The forged consent, and its handwriting. |
| Registry access | The first realistic window for **C8**, and for **C12** if the player thinks to look at themselves. |
| Trave answers | At *Wary*: **C6**. He talks in regulation numbers, badly, and his hands are not steady. |
| Cael, with C4 in hand | Cael converts two numbers into 1,710 tonnes and the line about the archive weighing forty-five times what the people in it weigh — *without knowing there are people in it*. |
| Sabbat appears | Once, briefly, helpfully. He asks after the player's welfare, offers a form, and leaves. He is the most pleasant person in the chapter. |

### 06:00–07:30 — Hold Your Breath *(the set-piece)*

The frame-611 crawl. Seven routes, all real (`MYSTERY_STRUCTURE.md` §7).

Inside the crawl:
- **C5** — the drag marks and the torn spinehand-grey liner.
- The Cold Registry bulkhead: a hold that is not on the manifest, sealed, cold
  enough to fog breath, humming at a frequency that is felt rather than heard.
- **The Registry Sentinel** projects. This is the chapter's real fight and its
  only real threat. **C11** on a scan.

This sequence is the chapter's peak in every register at once: the loudest
audio, the tightest space, the only Anchored-status fight, and the only moment
the player is somewhere the ship does not know they are.

### 07:30–08:00 — The decision

Four outcomes, canon:

| # | Choice | Requires | Immediate consequence | Flags set |
|---|---|---|---|---|
| **O1** | Confront Trave | D3 | He breaks. Hessa pulled from the cradle early — partial memory loss, she survives. Trave becomes an unstable ally. **Sabbat now knows you know.** | `TRAVE_BROKEN`, `HESSA_ALIVE_PARTIAL`, `SABBAT_ALERTED` |
| **O2** | File with Registrar Sabbat | — | Correct procedure. **Unlinked evidence is confiscated** — every clue not cited by a confirmed deduction. Hessa transferred *for real* — gone. Sabbat marks you an asset; **your access increases**. The player realises too late that they helped. | `SABBAT_ASSET`, `ACCESS_T2_PERMANENT`, `HESSA_GONE`, `EVIDENCE_STRIPPED` |
| **O3** | Take it to Stray / the Ninth Watch | D5 | Hessa broken out. Ship-wide lockdown. Stray becomes an ally. You are on the Watch's list. | `NINTH_ALLY`, `HESSA_FREE`, `LOCKDOWN`, `WATCH_LISTED` |
| **O4** | Say nothing. Keep the slate | — | Nobody is saved. You keep every clue and **Sabbat does not know you exist.** The coldest route, and the best-informed one. | `UNSEEN`, `EVIDENCE_FULL`, `HESSA_SMOOTHED` |

The decision is made by going to a place and doing a thing, not by selecting
from a menu: O1 is walking into the Watch office and saying it; O2 is filing at
a terminal; O3 is finding Stray; O4 is going to your bunk at 07:55 and lying
down. **The fourth option is not presented.** It is what happens if the watch
ends.

### The epilogue beat

Whatever the outcome, the chapter closes on the same fifteen seconds: 08:00,
fourth watch signs on, the lights come up to day-cycle, and someone the player
does not know takes Hessa's place at the muster board and asks where to put
their kit.

---

## 6. Session shape

Target session: **45–75 minutes**. The game is designed for a player who has an
evening, not a weekend.

| Element | Design |
|---|---|
| **Save** | Save anywhere, plus an automatic save at every watch boundary. There are no checkpoint-punishments; the game's difficulty is not execution. |
| **Resume** | On load, the casebook opens to the most recently changed page and the ship's clock is shown before anything else. A returning player needs to know *what time it is* and *what they last worked out*, in that order. |
| **Natural stopping points** | Watch boundaries (every six hours of ship-time), and the moment after a deduction is confirmed. Both produce a quiet screen with no cliffhanger. |
| **Session arc** | One session should contain at least one gate opened, at least one deduction proposed, and at least one conversation the player did not expect to matter. If a 45-minute stretch contains none of these, that stretch is a content bug. |
| **Combat frequency** | Roughly one encounter per 40–60 minutes. Combat is punctuation. Chapter One has three: the tutorial (Second Loom), an optional one (the Bailiff, route 7), and the real one (the Registry Sentinel). |
| **Reading load** | No document in the game exceeds a screen. Long documents are excerpted with the player choosing which section to read, and the choice of section is itself an investigative act. |
| **Replay** | A full playthrough is 12–18 hours. The department backgrounds give five different Chapter Ones. Several truths require more than one run (`ENDING_MATRIX.md` §4). A second playthrough is expected and the game does not offer a new-game-plus, because carrying knowledge across runs is the intended mechanic and it lives in the player, not in a save file. |

---

## 7. Difficulty and accessibility of the mystery

The game's difficulty is **comprehension**, not execution or resource
management. Three dials, all player-facing, none of which changes the clue graph:

| Dial | Off (default) | On |
|---|---|---|
| **Casebook hinting** | Clues are listed with source and kind; the player proposes | Deductions with all requirements met are marked *proposable*. Requirements are still never named. |
| **Combat pressure** | Standard | Reduced enemy damage; scan is guaranteed on the first attempt |
| **Time pressure** | The 07:55 cradle deadline runs on ship-time | Deadline pauses during dialogue |

**What is never a dial:** which clues exist, where they are, or what a deduction
requires. The mystery is the same mystery for everyone. Turning on hinting makes
the bookkeeping easier and the thinking no easier, which is the correct split.

---

## Open questions for the lead

1. **Chapter count and total length.** Canon describes Chapter One and Chapter
   Two gating, and the ending families are game-level. This document assumes
   **five chapters** and a 12–18 hour playthrough, on the shape of the timeline
   (departure, the eleven-month mark, the burn window, arrival at Sable Verge,
   the index). Not canon; needs setting before content is scoped.
2. **Third watch as a pooled watch.** The player is Hessa's shift partner but
   chooses a department background. This document resolves it by making third
   watch the ship's pooled odd-jobs watch, so a medtech and a spinehand share a
   shift. Cheap and it works, but it is an addition.
3. **Familiarity as a use-count.** §4.4's second capability route is the closest
   thing in the design to a grind, and it is the thing most likely to become
   one. Recommend a hard cap of three familiarity steps per tessera, reached in
   normal play without repetition. Flagging it now because it will drift.
4. **Does the player have a body in combat?** Canon says the projector is the
   one holding the loom. This document assumes the projector is exposed but not
   directly targetable, which keeps "the player cannot be killed by anyone who
   understands the mission" clean. If projectors *can* be attacked directly, that
   structural fact needs a different defence.
5. **The 02:00–04:00 tutorial hour.** Canon sets the chapter at 02:00–08:00 but
   the inciting incident is a missed muster, which cannot be the first beat. This
   document places muster at **04:00** and uses 02:00–04:00 as a lived tutorial
   with Hessa present. That is a two-hour investment before the premise. If the
   lead wants a faster open, muster can move to 02:40 and the tutorial compresses
   — but the cost is that the player never meets Hessa, and then her
   disappearance is a quest, not a loss.
