# CANDLEWAKE — SHIP LAYOUT

**Status:** derived from `docs/CANON.md` §3. Canon is law. Deck assignments,
tonnages, the registry number and the Cold Registry's existence are frozen.

**What this document is for:** the *Candlewake* as a place — deck by deck,
department by department. What each space is for, who works there, what it looks
and sounds like, who is allowed in, and what changes about it as the story
moves.

> ## Build status legend
>
> Every section is marked. Read the marker before you plan work against it.
>
> | Marker | Meaning |
> |---|---|
> | **BUILT** | Exists in `src/data/rooms.ts`, walkable today, verified by the playtest |
> | **DESIGN INTENT** | Described here and **not implemented**. No room, no collision, no content |
>
> Today: **six rooms exist.** Five on Deck C plus one spine duct. Decks A, B, D,
> E and F have no playable space of any kind. Medical Annex 3 — where Hessa
> actually is, and the destination the whole chapter points at — is referenced
> throughout the game and is not a visitable room.

Cross-references: `ART_DIRECTION.md` §3 (tile families by department),
`AUDIO_DIRECTION.md` §3 (the ambience beds named below),
`MYSTERY_STRUCTURE.md` (clue locations), `KNOWN_ISSUES.md`.

---

## 1. The ship

**RV *Candlewake*.** Verge-class deep-relay hauler. Trestle & Vance registry
**LT-9**. 1.9 km along the spine. 340 crew, 212 awake in the current rotation.
Forty-one months out from Earth, bound for Sable Verge Station.

Declared keel mass **4,410 t**. The trim solution she actually flies implies
**6,120 t**. The missing **1,710 t** is the Cold Registry, in a hold no manifest
admits to.

Two facts shape every space in this document:

1. **She is a working hull, not a vessel.** Corridors are utilitarian, lit for
   work, and loud. Nothing aboard was designed to be looked at.
2. **The spine is the only unobserved route.** Corridors log bulkhead transits;
   departments are staffed and somebody notices. The maintenance ducts run the
   full 1.9 km, touch every deck, and are logged by nobody. That is the game's
   central spatial idea — an unmonitored path through a monitored world — and
   Chapter One teaches the player its cost: the unobserved route is unobserved
   in both directions, which is how Hessa was taken out of one.

### 1.1 Deck summary

| Deck | Contents | Build status |
|---|---|---|
| A | Command, Navigation, Communications | **DESIGN INTENT** — sealed in Chapter One by canon |
| B | Vestibule research, Ship's Registry, Computer core | **DESIGN INTENT** |
| **C** | **Habitation ring, Commons, Muster, Watch office** | **BUILT** — five rooms |
| D | Medical, Hydroponics | **DESIGN INTENT** |
| E | Engineering, Reactor, the Loom | **DESIGN INTENT** |
| F | Cargo, **Cold Registry**, Shuttle bay | **DESIGN INTENT** — seen from above, never entered |
| Spine | Maintenance ducts, full length, touching every deck | **BUILT** — one duct, `spine-duct` |

---

## 2. DECK C — habitation ring *(BUILT)*

The awake rotation lives here. Deck C is the chapter's hub: five rooms plus one
spine excursion, all reachable on foot, all built and walkable today.

The connective logic is a spoke: **every room opens onto the corridor and only
onto the corridor.** The duct is the single exception, and it is reached from
Muster rather than from the ring — which is the point of the set-piece. The
player cannot wander into the restricted route; they have to solve it.

```
                       c-bunk        c-commons      c-muster ── spine-duct
                          │              │              │        (restricted)
                    ──────┴──────────────┴──────────────┴──────────────
                                   c-corridor  (frame 44)
                    ─────────────────────────────────────┬────────────
                                                         │
                                                      c-watch
                                                  (locked: watch-office)
```

### 2.1 Room reference

Real ids, real fields, read out of `src/data/rooms.ts`.

| Room id | Name | Dept | Size (tiles) | Ambient | Bed | Music |
|---|---|---|---|---|---|---|
| `c-bunk` | BERTH 14 · HABITATION RING | habitation | 24 x 14 | `warm` 0.95 | `hab` | — |
| `c-corridor` | HABITATION RING · FRAME 44 | spine | 31 x 12 | `dim` 0.76 | `hab` | — |
| `c-commons` | THE COMMONS · DECK C MESS | commons | 28 x 14 | `warm` 0.95 | `commons` | — |
| `c-muster` | MUSTER STATION · THIRD WATCH | registry | 26 x 13 | `cool` 0.94 | `registry` | — |
| `c-watch` | SHIP'S WATCH · DECK C OFFICE | security | 20 x 12 | `gloom` 0.60 | `watch` | — |
| `spine-duct` | SPINE DUCT 9-C · OVER COLD REGISTRY | cargo | 32 x 12 | `gloom` 0.60 | `spine` | `tense` |

The viewport is 24 x 13.5 tiles. `c-corridor` and `spine-duct` are the only two
rooms wider than the screen, so they are also the only two that scroll — which
is deliberate: both are *routes*, and a route should feel longer than a room.

---

### 2.2 `c-bunk` — Berth 14

**Function.** Sleeping quarters for a section of the third watch. Where the
player wakes, and where Hessa slept in the bunk stack opposite.

**Staffed by.** Nobody, at third watch. The other bunks are empty because
everyone in them is on shift. That emptiness is the chapter's first note.

**LANDMARK.** *Two rows of stacked bunks and a rug nobody has replaced in nine
years.*

**Visual identity.** Habitation family: `floor.carpet.a/b/worn` over
`wall.hab.*`. Rust ramp. `warm` ambient (bone3 warmed 30% toward amber3, level
0.95) and two ceiling lamps. It is the warmest, softest, most domestic room in
Chapter One, and it is the only one where the floor is not metal — the footstep
cue is `step.carpet`, a lowpassed pink thud with no ring, and the change in
footfall when the player steps out into the corridor is the first thing the
audio does for them.

**Signature props.** Two bunk stacks (`prop.bunk.head` / `.foot`), lockers, a
rug, a table with one chair, a plant, an extinguisher, a berth notice board.

**Sound.** `hab` — 50 Hz mains hum with a near-unison partner beating slowly
against it, a soft pink floor, an occasional tick.

**Access.** None. This is the player's own berth.

**Exits.** One door, south wall, to `c-corridor` (spawn `from-bunk`).

**Points of interest.**

| Mark | Prop | Interaction | Yields |
|---|---|---|---|
| `1` | `prop.locker.open` | `hessa-locker` | **C2** `hessa-locker` — her boots and cold liner still racked |
| `2` | `prop.bunk.head` | `player-bunk` | Flavour: a tally scratched into the paint, stopped at nineteen |
| `N` | `prop.bulletin` | `berth-notice` | Flavour: the line under Hessa's has been wiped and not rewritten. The adhesive is still tacky |

**What changes as the story progresses.** *(DESIGN INTENT.)* O4 — "say nothing,
keep the slate" — is executed by coming back here at 07:55 and lying down; the
outcome is what happens if the watch simply ends. None of that is implemented.
In later chapters the empty bunk is reassigned; the epilogue beat has someone
the player does not know asking where to put their kit.

---

### 2.3 `c-corridor` — the ring, frame 44

**Function.** The habitation ring. Every route on Deck C crosses it, so it earns
more detail than any other room and gets checked hardest for repetition.

**Staffed by.** Transit. On schedule, Fen at one time block and Cael and Trave at
another — though see §2.9: the clock does not currently advance, so in practice
the corridor is empty.

**LANDMARK.** *A curved corridor with a yellow hazard stripe running its whole
length.*

**Visual identity.** The neutral connective tissue of the whole ship:
`floor.plate.a/b/c/worn` over `wall.iron.*`, iron ramp, `dim` ambient at 0.76.
Two authored features carry it: a full-width **hazard stripe** (`floor.hazard`)
bounded by rivet plate at both ends, running the entire 31-tile span at row 5,
and overhead pipe runs (`over.pipe.h`) drawn above the actor layer so the player
walks *under* them. Four ceiling lamps. Department signage (`prop.sign.dept`)
beside every door.

**Sound.** `hab` — the ring shares the habitation bed. Footsteps are
`step.metal` over plate and `step.grate` where the rivet band runs.

**Access.** Open.

**Exits.** Four, all on the south wall, each with signage beside it:

| Mark | To | Spawn | Restriction |
|---|---|---|---|
| `1` | `c-bunk` | `from-corridor` | — |
| `2` | `c-commons` | `from-corridor` | — |
| `3` | `c-muster` | `from-corridor` | — |
| `4` | `c-watch` | `from-corridor` | **Locked**, clearance `watch-office`. Refusal: *"The Watch office door reads your tessera and does not open. A tone, once."* |

**Known defects.** The corridor is 31 tiles wide with a sparse middle section,
and its four doors read as small panels rather than obviously as exits — they
are legible only because of the signage beside them. Both are open art issues
(`ART_DIRECTION.md` §11.2). A corridor whose exits need labels is a corridor
that has failed at its one job.

---

### 2.4 `c-commons` — the mess

**Function.** Galley and mess for the awake rotation. The gossip hub, and the
only place aboard where crew from different departments sit down together.

**Staffed by.** **Fen Bellweather**, galley hand, 19 — post `[3, 5]`, at the
serving counter. **Cael Oduya**, Second Loom, 26 — post `[14, 10]`, at a table
with a trim solution he has re-run eleven times. Bosun Stray passes through on
schedule.

**LANDMARK.** *A long serving counter, a dented kettle, and the trim readout
nobody reads.*

**Visual identity.** `floor.commons.a/b` over `wall.hab.*`, `warm` ambient,
three ceiling lamps. Warmest room on the deck after the berth. A serving counter
run (`prop.counter.l/m/r`) with the kettle at its end, four table-and-chair
clusters, a plant, a bulletin board.

**Sound.** `commons` — the hab hum, quieter, under a high shelf of air;
crockery every 6–18 seconds; and every 9–25 seconds two formants and a small
glide that read as a person and carry no words. It is the only bed in the game
with a human in it.

**Access.** Open.

**Exits.** One door, south wall, to `c-corridor`.

**Points of interest.**

| Mark | Prop | Interaction | Yields |
|---|---|---|---|
| `1` | `prop.console.a` (animated, halo-lit) | `trim-readout` | **C4** `mass-manifest` — declared 4,410 t against a trim solution implying 6,120 t. Loom and Registry backgrounds get two extra lines that name the 1,710 t directly |
| `N` | `prop.bulletin` | `commons-bulletin` | **C7** `captain-watchlog` — Onwe in sealed Vestibule conference 02:40–04:00 |

**Why the trim readout is here and not in Engineering.** It is a cargo trim
panel in a mess hall that nobody has ever looked at twice. The ship's largest
secret is legible, in public, on a screen next to the tea urn, and it stays
secret because reading it is not anybody's job. That is the Board's whole method
rendered as level design, and it should not be moved somewhere more dramatic.

**What changes.** *(DESIGN INTENT.)* Route 2 of the set-piece — killing the
hatch tell-tale from the Commons breaker panel — requires a `prop.breaker`
placement that **does not exist in the room today**, although the tile, the
clearance (`engineering-panel`) and the interactable branch all do.

---

### 2.5 `c-muster` — muster station, third watch

**Function.** Watch handover. The roster terminal where third watch signs on and
off, and the deck's access to the spine. This is where the chapter's premise
lands: Hessa's name is greyed on the board.

**Staffed by.** **Bosun Anneke Stray** — post `[5, 6]`. **Petty Marn Ivo** —
post `[19, 9]`, standing two tiles from the duct hatch, by the card.

**LANDMARK.** *A roster terminal on a steel pillar, and a sealed duct hatch in
the far wall.*

**Visual identity.** Registry family: `floor.registry.a/b` over `wall.reg.*`,
brine ramp, `cool` ambient (bone3 toward brine4, 0.94). Colder and harder than
the habitation rooms; the first place on Deck C that feels administrative rather
than lived-in. Benches, crate stacks, a barrel, a toolbox, a tall locker, two
ceiling lamps — and one **flickering ember-red light** on the duct hatch,
r 20 / i 0.25 / flicker 0.3, the only red light source in Chapter One.

**Sound.** `registry` — bandpassed pink, a 62 Hz tone with a 93.5 Hz partner,
and lattice chirps every 2–9 seconds: short, bright, quantised in frequency and
never on a grid in time.

**Access.** Open. The **hatch** is not.

**Exits.**

| Mark | To | Notes |
|---|---|---|
| `D` | `c-corridor` | Ordinary door |
| `2` | `spine-duct` | The duct hatch. Restricted. Opens only via the interactable, which grants the `duct-open` flag |
| `3` | — | Arrival spawn `from-duct`, one tile west of the hatch |

**Points of interest.**

| Mark | Prop | Interaction | Yields |
|---|---|---|---|
| `U` | `prop.muster` (halo-lit) | `muster-terminal` | **C1** `transfer-record`. If the player already holds C7 **and** has `registry-terminal` clearance, the same terminal instead yields **C8** `registry-checksum` |
| `2` | `hatch.closed` | `duct-hatch` | The set-piece. Seven branches |

**The set-piece: "Hold Your Breath."** Canon §6 specifies seven real solutions.
All seven are implemented in the `duct-hatch` interactable as live code
branches. **Only three are currently reachable**, because the others depend on
rooms, props or NPC states that do not exist:

| # | Route | Requires | Reachable today |
|---|---|---|---|
| 1 | Maintenance — you carry the duct key | `duct-key` clearance (maintenance background) | **Yes** |
| 2 | Engineering — kill the tell-tale at the Commons breaker | flag `telltale-killed` | **No** — no `prop.breaker` placed in `c-commons` |
| 3 | Security — walk in; Ivo salutes | `duct-pass` clearance (watch background) | **Yes** |
| 4 | Medical — forge a hazard-quarantine tag | flag `hazard-tag-placed` | **No** — Medical supply is not a place |
| 5 | Social — Stray draws Ivo off | flag `ivo-distracted`, needs Stray at *Trusting* | **Yes** — set by Stray's `ductyes` node |
| 6 | Theft — lift Trave's key | item `trave-key` from `watch-keyrack` | **No** in practice — the Watch office is clearance-locked (§2.6) |
| 7 | Force — fight Ivo's Bailiff | any tessera; raises suspicion by 25 | **Yes** |

**What changes.** *(DESIGN INTENT.)* O2 — filing with Registrar Sabbat — happens
at a Registry terminal, and Sabbat has no dialogue tree, so the outcome cannot
currently be taken. Under O3 the whole deck goes to `emergency` ambient and the
`alarm` bed; neither is wired to anything.

---

### 2.6 `c-watch` — Ship's Watch, Deck C office

**Function.** The Watch office. Incident slates, the key rack, and Warden Callix
Trave, who has been drinking since 03:04.

**Staffed by.** **Warden Trave** — post `[10, 6]`, behind the desk.

**LANDMARK.** *One desk, one lamp, and a wall of shelved incident slates.*

**Visual identity.** Iron over plate, security department. `gloom` ambient at
**0.60** — the darkest room in Chapter One alongside the duct, and badly lit on
purpose. One ceiling lamp for a 20 x 12 room. Three tall lockers along the west
wall (the shelved slates), a desk with chairs, two interactable lockers.

**Sound.** `watch` — the hab hum plus a 100 Hz sawtooth through a resonant
lowpass **pulsing at 7.3 Hz**: a failing ballast, in a specific fitting, in this
specific room. The room the guilty man sits in is the only room aboard where the
light makes a noise.

**Access.** **Locked.** Clearance `watch-office`, which only the *watch*
background holds. The refusal line is a tessera read and a single tone.

> **Fairness issue, flagged not fixed.** `granted-clearances` — the story hook
> that would let another background earn `watch-office` — is read by
> `clearancesOf()` and **never written by any code path**. Combined with the
> schedule clock never advancing (§2.9), this means **four of the five
> backgrounds can never enter this room, never meet Warden Trave, and can never
> obtain C6.** They can still reach D3 through the `stray-testimony` route, so
> the chapter does not dead-end — but O1, "confront Trave", is structurally
> unavailable to 80% of playthroughs. See `TASKS.md`.

**Exits.** One door to `c-corridor`.

**Points of interest.**

| Mark | Prop | Interaction | Yields |
|---|---|---|---|
| `1` | `prop.terminal` | `watch-terminal` | Watch background or `trave-broken`: the 03:04 incident, closed without being written. Otherwise one line before it locks |
| `2` | `prop.locker` | `trave-bin` | **C6** `trave-flask` — the shelving-order stub, and an empty flask at four in the morning. Relationship-gated at *Professional* unless watch background |
| `3` | `prop.locker` | `watch-keyrack` | Route 6 — the duct key, second from the left on orange cord. Only takeable while `trave-distracted` |

---

### 2.7 `spine-duct` — Spine Duct 9-C, over the Cold Registry

**Function.** A maintenance crawl in the spine, above Hold F-something that no
manifest admits to. Hessa was regasketing a valve collar here when she read the
trim tell-tale. She was dragged out of it at 03:04.

**Staffed by.** Nobody. Something is standing at the east end.

**LANDMARK.** *A crawl of diamond mesh over a hold that is not on any manifest.*

**Visual identity.** The darkest family in the game: `floor.mesh.a/b` over
`wall.spine.*`, iron over void, `gloom` ambient at 0.60, and **no ceiling
lights at all** — two emergency lamps (`prop.light.emergency`, ember, flickering
at 0.5) and one halo source. Overhead duct and pipe runs draw above the actor.

The one bright thing in the room is the **overlook**: `prop.crate.tessera` with
a `halo3` light at radius 34, intensity 0.5 — the largest single light source in
Chapter One, cyan, coming up through the mesh from below. Every other halo in
the game is a terminal screen at radius 20–22. This one is four times the area
and a full ramp step brighter, because what is under it is 91,400 running minds'
worth of substrate. See `ART_DIRECTION.md` §7.3.

**Sound.** `spine` — a narrow 900 Hz band (a duct you are *inside of*, not a
room you are in), creaks every 4–12 seconds that bend their own playback rate,
and a 2.6-second hull groan every 16–42 seconds. Footsteps are `step.grate`.
**This is the only room in the game that declares its own music**: `tense`.

**Access.** Restricted. Entered only from `c-muster` via the seven-route hatch.

**Exits.** One hatch back to `c-muster` (arriving at spawn `from-duct`).

**Points of interest.**

| Mark | Prop | Interaction | Yields |
|---|---|---|---|
| `1` | `prop.debris` | `duct-scuff` | **C5** `duct-scuff` — two heel-lines in the dust and a torn glove-liner, spinehand grey. Maintenance background gets the line that says she was pulled past the bracket *backwards* |
| `2` | `prop.valve` | `duct-valve` | Flavour, and the most quietly horrible object in the chapter: a collar half regasketed, the old gasket still warm-set beside it. *Nobody stops in the middle of a gasket* |
| `3` | `prop.crate.tessera` | `registry-overlook` | Clue `cold-registry` — racking floor to overhead, ceramic tiles in numbered trays, tens of thousands, refrigerated, on no manifest |
| `4` | — | `sentinel-post` | Battle: **Registry Sentinel**. READ yields **C11** `tessera-serial`, serial `KH-11-4402` — the first hard link to Kest Harbour |

**Canon note.** The clue `cold-registry` is **not in the canon C1–C13 table**.
It is an additional clue that the implementation introduced to give the overlook
a payload. It is load-bearing — it appears in alternative requirement sets for
D2 and D6 — so it is not decoration. Reported in the final delivery notes, not
resolved here; canon changes at canon, and then propagates.

---

### 2.8 Clue coverage on Deck C

| Canon | Clue id | Location | Status |
|---|---|---|---|
| C1 | `transfer-record` | `c-muster` · muster terminal | **Placed** |
| C2 | `hessa-locker` | `c-bunk` · Hessa's locker | **Placed** |
| C3 | `stray-testimony` | Bosun Stray, `c-muster` | **Placed** (dialogue) |
| C4 | `mass-manifest` | `c-commons` · trim readout, or Cael | **Placed** |
| C5 | `duct-scuff` | `spine-duct` · the mesh | **Placed** |
| C6 | `trave-flask` | `c-watch` · the Warden's bin | **Placed, gated** — see §2.6 |
| C7 | `captain-watchlog` | `c-commons` · bulletin, or Fen | **Placed** |
| C8 | `registry-checksum` | `c-muster` · terminal cross-read | **Placed, access-gated** |
| C9 | `cradle-log` | Medical Annex 3 | **No location — room does not exist** |
| C10 | `consent-form` | Medical | **No location — room does not exist** |
| C11 | `tessera-serial` | `spine-duct` · scanning the Sentinel | **Placed** |
| C12 | `personnel-annex` | Registry terminal, Deck B | **Written, no location** |
| C13 | `onwe-grudge` | Fen, `c-commons` | **Placed** |
| — | `cold-registry` | `spine-duct` · the overlook | **Placed** — not a canon clue |

The content validator reports C9, C10 and C12 as warnings by design. Deduction
D5 ("Hessa is in Medical Annex 3") is therefore unreachable and has been left
out of the shipped deduction table.

### 2.9 The clock, and why Deck C is quieter than it should be

NPC schedules are authored per time block and resolve through `npcRoom()`:

| Crew | Block 0–2 | Block 3 | Block 4 | Block 5 |
|---|---|---|---|---|
| Stray | `c-muster` | `c-commons` | `c-commons` | `c-muster` |
| Fen | `c-commons` | `c-commons` | `c-corridor` | `c-commons` |
| Cael | `c-commons`, `c-commons`, `c-corridor` | `c-commons` | `c-commons` | `c-commons` |
| Trave | `c-watch` | `c-corridor` | `c-watch` | `c-watch` |
| Ivo | `c-muster` | `c-muster` | `c-muster` | `c-muster` |

**`advanceTime()` is never called by any content.** `timeBlock` is permanently
0, so the crew never move: Stray and Ivo stand in Muster, Fen and Cael in the
Commons, Trave in the Watch office, forever. The corridor is never populated by
anyone. The schedule table above is currently fiction.

Two consequences worth stating plainly: the ring reads as an empty ship rather
than a working one, and Trave — behind a locked door he never leaves — is
unreachable for four backgrounds (§2.6).

**Also unused:** the `npc` mark type. `rooms.ts` declares NPC anchor marks in
four rooms (`&`, `*`, `5`), but those characters do not appear in the layout
strings, so no anchors are ever built. NPC placement runs entirely off the
`post` coordinate table in `npcs.ts`. Either remove the marks or move placement
onto them; two placement systems where one is dead is how a room ends up with a
character standing in a wall.

---

## 3. DECK A — Command *(DESIGN INTENT — not built)*

**Practical function.** Bridge, navigation, communications, the Master's day
cabin, and the Command safe holding Onwe's copy of Standing Order 9-B.

**Staffed by.** Captain Verity Onwe. Navigation and comms watchstanders. Deck A
runs its own watch rotation and does not mix with Deck C.

**Visual identity.** Brine, the coldest and most expensive-looking family aboard
(`command` → `brine4`). `sterile` or `lit` ambient — Deck A is the only place on
the ship that is properly lit, and that should feel like a class difference, not
a design upgrade. Signature props: `prop.console.a/b` in banks, `wall.window`
looking out at the Overcast side of nothing.

**Ambient sound.** `registry` is the closest existing bed; Deck A wants its own —
quieter, higher, with a navigation tone rather than lattice chirps. Not written.

**Access.** Sealed for the whole of Chapter One, by canon. This is deliberate
and load-bearing: the chapter's red herring points at the Captain, and the
Captain is conveniently unreachable. A player who could simply go and ask her
would kill D-X, and D-X is the point.

**What changes.** Deck A opens in Chapter Two at the earliest, and what is behind
the seal differs by Chapter One outcome — under O2 the player's raised access
(Sabbat's patronage) is the route; under O3 the deck is in lockdown.

---

## 4. DECK B — Vestibule, Registry, computer core *(DESIGN INTENT — not built)*

**Practical function.** Three distinct spaces that share a deck and dislike each
other.

- **Ship's Registry** — manifest reconciliation, personnel files, the terminals
  that write Registry-class checksums. This is where the forged transfer was
  actually filed.
- **Vestibule research** — the Bureau of Deep Registry's shipboard annex.
  Casting science. Tibold Rask's honest log lives here.
- **Computer core** — salvaged lattice. The ship's actual brain.

**Staffed by.** Registrar Ilm Sabbat (Board liaison, though his office is
Registry-adjacent rather than Registry). Tibold Rask and the Vestibule
researchers. Registry clerks — the *registry* background's own post.

**Visual identity.** Registry is brine over `floor.registry.*` and `wall.reg.*`,
the same family as `c-muster` but denser and better maintained. The Vestibule
annex is the one place in the game where **bone and bruise sit together**:
`vestibule` uniforms are bone with a violet collar (`ART_DIRECTION.md` §4.4),
and the annex should be the first room where a player sees violet used
architecturally. The computer core is halo — the largest concentration of live
lattice on the ship, and therefore the one space where the accent scarcity rule
relaxes, once, on purpose.

**Ambient sound.** `registry` for Registry. The core wants a variant of it with
the chirps dense enough to become texture. The Vestibule annex should be nearly
silent — closer to `medical` than to `registry`, because what happens there is
done to people.

**Access.** Registry needs `registry-terminal` clearance (the registry
background starts with it). The Vestibule annex is a tier above anything
Chapter One issues.

**What changes.** C12 (`personnel-annex`) lives on a Registry terminal here —
the player's own file with a sealed 2229 Vestibule annex reading *SCHEMA SUBJECT
· RETAIN LIVING*. The clue text is written; the terminal is not. This is the
first hard evidence that the player is the index, and it is currently
unreachable.

---

## 5. DECK D — Medical, Hydroponics *(DESIGN INTENT — not built)*

> **This is the most important unbuilt space in the game.** Hessa is in Medical
> Annex 3, in a smoothing cradle, right now, with four days being cut out of
> her. The chapter is about finding out where she is. The place she is does not
> exist.

**Practical function.** Ship's infirmary, dispensary, and **Annex 3** — a
side room with a memory-smoothing cradle in it. Plus hydroponics: calories and
air for 212 awake crew.

**Staffed by.** Dr. Nomi Ashkar. Medtech Wen Corrow. The *medical* background's
own post. Hydroponics runs on a skeleton rotation.

**Visual identity.**

- **Medical:** bone and brine. `floor.med.a/b` plus `floor.med.drain` — the
  drain tile exists and has never been placed, and it should go where the player
  will notice it. `wall.med.face/cap`. `sterile` ambient (bone3 barely tinted
  toward brine4, level **1.05** — the only preset above 1.0). Medical is the
  brightest space aboard, and it should be unpleasant for exactly that reason:
  everywhere else the darkness is honest.
- **Annex 3:** `prop.cradle`, which carries the only `bruise2` light in the
  entire tile set (r 16, i 0.18). It is small, close, and violet. The first time
  a player sees that colour in a room should be the moment they understand what
  the room is for.
- **Hydroponics:** moss over `floor.soil.a/b`, `prop.plant.a/b`. The only place
  aboard that is green, and the only surface with the `step.soil` footstep cue —
  a soft double-layer pink thud that exists in the audio engine and has never
  fired.

**Ambient sound.** `medical` — near-silence, a 6 kHz hiss, and a **1046 Hz ping
every 3.1 seconds, exactly**. Written, complete, and never yet heard, because no
room selects it. It is the most deliberately horrible thing in the audio and its
whole point is Annex 3.

**Access.** `medical-annex` clearance — the *medical* background starts with it.
Everyone else needs persuasion (Ashkar), forgery, or O1's confession.

**What changes.** C9 (`cradle-log`: Annex 3 occupied, patient name blank, depth
four days) and C10 (`consent-form`: a smoothing consent signed in handwriting
that is not Hessa's) both live here. Both are written and have no location.
Deduction D5 depends on them and has been cut from the shipped table. O3 —
breaking Hessa out with the Ninth Watch — requires D5 and is therefore
unreachable.

Under O1 the cradle is stopped early and Hessa loses about a day. Left to
complete it takes four. She is never killed in Chapter One.

---

## 6. DECK E — Engineering, Reactor, the Loom *(DESIGN INTENT — not built)*

**Practical function.** Main machinery, reactor, trim control, and **the Loom** —
the ship's primary projector, as opposed to the wrist looms every crew member
carries.

**Staffed by.** Engineering rotation. Cael Oduya is Second Loom and this is his
actual post; the Commons is where he goes to run the numbers again where nobody
is watching him do it.

**Visual identity.** Rust and amber over plate and grate. `prop.pipe.*`,
`prop.valve`, `prop.fan` (animated at 8 fps), `prop.breaker`, `prop.cable.coil`,
`prop.toolbox`. Dim, hot-coloured, cluttered. Amber working light rather than
bone ceiling light — Engineering is the one department where the light is a tool.

**Ambient sound.** Not written. Wants something between `cargo` (sub rumble,
cavern tail) and `watch` (machinery with a fault in it). A reactor bed should be
the loudest thing in the game, and the moment it drops out should be the worst.

**Access.** `engineering-panel` clearance; the *loom* background starts with it.

**Story note.** Deck E is where Hessa's forged transfer says she went. The
record puts her four decks down in a space that runs at four degrees, without
her boots. That is the whole of C2's argument, and Deck E is never visited — the
player is meant to reason about it, not walk it.

---

## 7. DECK F — Cargo, the Cold Registry, shuttle bay *(DESIGN INTENT — seen, never entered)*

**Practical function.** Declared cargo, the shuttle bay, and the **Cold
Registry**: a refrigerated vault holding 91,400 tesserae in numbered trays,
1,710 tonnes of shell, isolation lattice, independent power and ballast, on
nobody's manifest.

**Staffed by.** Nobody the crew know about. Whatever projects the Registry
Sentinel.

**Visual identity.** Iron over void, the darkest family, at the largest scale in
the game. `prop.crate.a/b/stack`, `prop.barrel`, and `prop.crate.tessera` —
which is currently used once, as the overlook prop in the duct, and is really a
Deck F object seen from above.

**Ambient sound.** `cargo` — pink noise dragged to quarter playback rate for a
sub rumble, 28 Hz and 41.3 Hz tones, and a 370 ms feedback-delay cavern that
distant impacts are sent into. Written, complete, **never selected by any
room.** It is the sound of the largest space aboard and nobody has been in it.

**Access.** None in Chapter One. The player sees the Cold Registry exactly once,
from above, through mesh, at a distance, lit cyan. That restraint is correct and
should survive contact with a level designer.

**What changes.** Entering the Cold Registry is Chapter Two or later. Ending
family 5 — *The Fire* — happens here.

---

## 8. THE SPINE *(BUILT — one duct of an intended network)*

**Practical function.** Maintenance ducts running the full 1.9 km, touching
every deck. Cramped, loud, unlit, and logged by nobody.

**Staffed by.** Spinehands, on rotation. Hessa and the player, if the player
took the maintenance background.

**Visual identity.** `wall.spine.face/cap` over `floor.mesh.*` and
`floor.grate.*`. Iron over void — the darkest family in the game, deliberately.
Lit by emergency lamps only. Overhead runs (`over.duct`, `over.pipe.h/v`,
`over.beam`) draw above the actor so the player is visibly *inside* something.

**Ambient sound.** `spine` — a narrow band, close creaks that bend their own
pitch, distant hull groans.

**Access.** Restricted by hatch, not by geometry. The duct key, the Watch pass,
a forged quarantine tag, a killed tell-tale, a distracted watchman, a stolen key
or a fight — canon §6's seven routes.

**Design rule for the whole network.** **Spine geometry never decays.** It is
the only permanent, unrevokable progression in the game (`GAME_DESIGN.md` §4.1),
and it is knowledge rather than permission: once the player knows a junction and
where it surfaces, nothing can take that away. Every other kind of access on
this ship can be withdrawn.

**Built today:** one duct, `spine-duct` (Duct 9-C, over the Cold Registry).
**Not built:** everything else — the network, the junctions, the Deck D medical
service hatch, the Deck B Registry approach. `MYSTERY_STRUCTURE.md`'s open
question 2 proposes the spine permits exactly three Chapter One excursions;
one exists.

---

## 9. Vertical circulation *(DESIGN INTENT)*

The tile set already contains `ladder`, `stair.up`, `stair.down`, `lift.closed`,
`lift.open` and `lift.panel`. **None of them is placed in any room, and the
engine has no deck-transition concept** — `DoorSpec` moves the player between
rooms, and a room declares its deck as a string on `RoomDef`.

Moving between decks will need either a room-to-room door that happens to change
the deck label (cheap, works, means the lift is a corridor with a longer fade)
or a real transit scene. That decision should be made before Deck B is authored,
because it determines whether the spine is a shortcut *between* decks or merely
a second route within one.

The `map` action is bound to `E` and is not implemented (`KNOWN_ISSUES.md`).
Every room already carries a `landmark` string specifically for it — that field
exists to make a ship map possible and is currently written for nobody.

---

## 10. What changes across the ship, by Chapter One outcome *(DESIGN INTENT)*

None of this is implemented; the chapter cannot currently be completed at all.

| Outcome | Ship-wide consequence |
|---|---|
| **O1** Confront Trave | Hessa pulled from the cradle early. Medical Annex 3 becomes a place the player has been. Sabbat knows; Registry access tightens |
| **O2** File with Sabbat | Access *increases* — Registry and, later, Deck A open to the player as Sabbat's asset. The ship becomes more navigable as a direct consequence of the player having helped |
| **O3** Ninth Watch | **Ship-wide lockdown.** `emergency` ambient, the `alarm` bed, `klaxon`, Watch cordons on the ring. The whole deck changes state at once, and every asset to do it already exists and is unwired |
| **O4** Say nothing | Nothing changes. That is the point, and it is the hardest one to make legible in level design |

---

## Open questions for the lead

1. **Medical Annex 3 is the highest-priority unbuilt room in the project.**
   Three clues, one deduction and one of four outcomes depend on it. Every art
   and audio asset it needs already exists (`floor.med.*`, `wall.med.*`,
   `prop.cradle`, `prop.medbed`, `prop.medcart`, the `medical` bed, `sterile`
   ambient). It is content authoring, not systems work.
2. **`watch-office` clearance** (§2.6). Four of five backgrounds cannot reach
   Warden Trave. Either write `granted-clearances`, make the door
   relationship-gated rather than clearance-gated, or move Trave onto the ring
   for one time block — which requires the clock (§2.9).
3. **Call `advanceTime()` somewhere.** The schedule system is complete and inert.
   The cheapest honest hook is the chapter beat sheet in `GAME_DESIGN.md` §5:
   advance on specific story events, not on a wall clock.
4. **Deck transitions** (§9). Lift-as-door or lift-as-scene. Blocking for Deck B.
5. **`cold-registry` is not a canon clue** (§2.7). It is currently doing real
   work in two deduction requirement sets. Either add it to canon §6 as C14 or
   fold it into C5's envelope. It should not stay in this half-state.
6. **Does the player ever leave Deck C in Chapter One?** Restating
   `MYSTERY_STRUCTURE.md`'s open question 2, because it is now a layout
   question: C5 is already above the Deck F envelope and C9/C10 are on Deck D.
   The current build answers "yes, once, into the spine". If the intent is a
   hard Deck C confinement, three clues need relocating and the chapter changes
   substantially.
