# CANDLEWAKE — AUDIO DIRECTION

**Status:** derived from `docs/CANON.md`. Canon is law.

**What this document is for:** the sonic identity *as built*. Every cue, bed and
piece described below was read out of `src/core/audio.ts` and
`src/core/music.ts`. The routing, the parameters and the trigger sites are real.

> ## Read this before you trust anything else in this document
>
> **Nobody has heard any of it.**
>
> `audio.ts` and `music.ts` are complete, type-check under `strict`, and are
> wired into every scene. The graph has since been **measured** — see §10 — so
> we know it runs and emits signal. Nobody has ever *heard* it.
>
> Everything in this document that says what a cue *is* describes what the code
> constructs. Nothing in this document is a claim about how it *sounds*. Where a
> description of character appears — "a failing ballast", "a person, carrying no
> words" — that is the authored intent recorded in the source comments, not a
> verified result. See §10.

Cross-references: `docs/CANON.md` §9 (tone rules), `MYSTERY_STRUCTURE.md` §10
(casebook, and a direct conflict with this document — see §9),
`SHIP_LAYOUT.md` (which bed serves which space), `COMBAT_DESIGN.md`.

---

## 1. The governing rule

**Canon §9: the ship is loud. Silence is a *thing that happens*, and it is
worse.**

Everything downstream follows from that.

1. **Machinery carries the tension, not music.** The player is on a working
   hull. The 50 Hz mains hum, the ballast beat, the duct creaking around them —
   those are the score. Ambience is the loudest continuously present layer in
   most rooms, and it is authored with the care usually spent on themes.
2. **Music is sparse and mostly forgettable while it plays.** Pedal tones, modal
   cells, long gaps. Ten pieces exist for the entire game; only one of them
   (`battle`) has anything a listener would call a groove.
3. **Silence is a cue, not an absence.** The `silence` bed is a *composed*
   bed — a floor of room tone, a 44 Hz sub, one distant tick every 25–70
   seconds — because true digital silence reads as a bug, and because the ear
   needs something to hold on to in order to notice that everything else has
   stopped. It is used on the title screen and at the chapter end.
4. **Nothing is heroic.** `battle.win` is deliberately modal and short: *nobody
   wins a fight on this ship, they end one.* There is no fanfare in the game.
5. **The Board's register applies to sound too.** Horror is bureaucratic before
   it is physical (canon §9). The medical bed's defining feature is a 1046 Hz
   ping **exactly every 3.1 seconds** — a machine keeping time in a room where
   somebody is being edited. It is the most unpleasant idea in the audio and it
   is implemented as a metronome.

---

## 2. How the sound is made

**Everything is synthesized at runtime with the Web Audio API. The game ships no
audio files and never will.** No samples, no impulse responses, no external
dependencies. This is the same commitment the art makes (`ART_DIRECTION.md` §1).

### 2.1 The graph

```
  music (MusicDirector) ─► musicGain ─┐
  ambience bed ─────────► ambGain ────┴─► duck ─┐
                                                ├─► master ─► comp ─► destination
  sfx voices ───────────► sfxGain ──────────────┘
```

- **`duck` sits above music + ambience only**, so a reveal sting can push the
  world down without pushing itself down with it.
- **`comp`** is a `DynamicsCompressor` at threshold −18 dB, knee 24, ratio 3,
  attack 6 ms, release 250 ms. It is a safety net for a klaxon, a battle and six
  footsteps landing on the same frame — **not** a mastering tool.
- **`HEADROOM = 0.85`** on master, leaving the compressor something to work
  with.
- Four independent volume settings (master / music / sfx / ambience), applied as
  `setTargetAtTime` ramps. Settings changes are never assignments; assignment on
  a live param clicks.

### 2.2 Gesture gating

The `AudioContext` is built lazily on the first `resume()`, which must come from
a user gesture. Before that every method is a **no-op that records intent** —
the title screen can ask for music before the browser will allow any, and it
starts on the first keypress. Intent is one slot per channel, never a queue.

If Web Audio is unavailable or refuses to construct, the engine marks itself
unsupported and the game runs silent. No path throws.

### 2.3 Noise

Two shared buffers, generated once: **white, 2 s** and **pink, 5 s**. Pink uses
Kellet's economical filter — close enough to −3 dB/octave for a ship. Both have
their head cross-faded against material sampled just past the end, so the loop
point is continuous; raw noise loops click once per period.

Every burst, bed and percussion hit reads from these two buffers at a random
offset. Nothing allocates a buffer at play time.

### 2.4 Voice management

- One `SfxVoice` per `sfx()` call, owning its gain (and a panner only if asked
  for). It refcounts its sources and disconnects the whole chain when the last
  one ends. **Nothing survives its own sound.**
- **`MAX_VOICES = 28`.** Past that, new non-blip sfx are dropped rather than
  queued.
- **Per-id minimum spacing** (`SFX_GAP`) stops repeat callers stacking into
  mush: `text.blip` 24 ms (dialogue calls it per character at up to ~80 cps),
  `terminal.key` 30 ms, every footstep 70 ms, `ui.move` 30 ms, every `hit.*`
  40 ms, `scan` 150 ms, `klaxon` 1.5 s.
- `text.blip` bypasses the voice object entirely: two nodes, one closure, 22 ms.
  It is the single most frequently fired cue in the game and it is not allowed
  to allocate.

### 2.5 Ambience scheduling

A bed is a fixed set of continuous layers plus a fixed list of sparse one-shot
generators. **A bed can never grow more generators than it was built with.** A
120 ms ticker schedules every pending one-shot falling inside the next 600 ms.
A backgrounded tab leaves the schedule behind; the bed *resyncs* rather than
catching up, and a per-event guard caps four fires per tick.

Each bed gets its own seeded `Rng`. Beds must not touch the global RNG, or a
save-load would shift the sound of the ship.

---

## 3. Ambience — the `AmbienceId` union

Nine beds. This is the real list from `audio.ts`.

| Id | Character as authored | Serves | Used today |
|---|---|---|---|
| `hab` | 50 Hz mains hum plus a near-unison 100.7 Hz partner; the slow beat between them is what makes a hum feel like a machine rather than a test tone. Third partial at 150.3. Lowpassed pink at 420 Hz drifting on a 0.045 Hz LFO. A 2.6 kHz tick every 3–11 s | Habitation ring, Deck C | **Yes** — `c-bunk`, `c-corridor` |
| `commons` | The hab hum, quieter, plus a high shelf of air at 2.4 kHz. Crockery: a 4.2 kHz blip every 6–18 s. Every 9–25 s, two formants and a small glide — **a person, carrying no words** | Galley, mess, any inhabited social space | **Yes** — `c-commons` |
| `spine` | A narrow 900 Hz band — *a duct you are inside of, not a room you are in*. Pink sub under it, 78 Hz tone. Creaks every 4–12 s that bend their own playback rate: metal complaining, close by. Every 16–42 s a 2.6 s hull groan from 62 Hz down to 44 | Spine ducts, the whole 1.9 km | **Yes** — `spine-duct` |
| `medical` | Almost nothing, and one thing that is exactly on time: near-inaudible pink floor, a 6 kHz hiss, and a **1046 Hz ping every 3.1 seconds, forever** | Medical, Deck D — including Annex 3 | **No room uses it** |
| `registry` | Bandpassed pink at 210 Hz, a 62 Hz tone with a 93.5 Hz partner. Lattice chirps every 2–9 s: short, bright, quantised to a 420 Hz grid in frequency but **never on a grid in time** | Registry, Deck B; muster stations | **Yes** — `c-muster`, and the character-creation screen |
| `cargo` | Pink noise dragged to quarter playback rate — the cheapest honest sub rumble — plus 28 Hz and 41.3 Hz tones. A feedback-delay cavern (370 ms, 0.62 feedback) that distant impacts are sent into | Cargo holds, Deck F, the Cold Registry | **No room uses it** |
| `watch` | The hab hum, plus a 100 Hz sawtooth through a resonant lowpass pulsing at **7.3 Hz** — a failing ballast. Small ticks every 11–34 s | Watch offices, security spaces | **Yes** — `c-watch` |
| `silence` | Deliberate, not broken. A near-silent pink floor, a 9 kHz air layer, a 44 Hz sub, and one distant tick every 25–70 s | Title screen; chapter end; any moment the ship stops | **Yes** — title, chapter end |
| `alarm` | One 0.75 Hz **square** LFO drives every layer, so the whole room pulses together: 55 Hz sub, two detuned 110/113.5 Hz sawtooths through a 700 Hz lowpass, a 1.1 kHz band on top | Lockdown (O3), hull events, later chapters | **Never triggered** |

**Honest status.** Six of nine beds are reachable. `medical`, `cargo` and
`alarm` are written, complete and unreachable, because Medical and the holds are
not built and nothing raises a lockdown. `alarm` in particular is the sound of
Chapter One outcome O3, which cannot currently be reached at all
(`KNOWN_ISSUES.md`).

Room-to-bed assignment lives in `src/data/rooms.ts` as the `ambience` field and
is cross-faded over 1.2 s on room entry. See `SHIP_LAYOUT.md` for the per-room
table.

---

## 4. Music — the `MusicId` union

Ten pieces. All original material. A piece is a fixed set of **layers**; a
layer emits notes into its own gain node on a step grid, and *intensity* ramps
those gains. **Intensity never restarts a piece** — the note grid underneath
keeps running regardless, so a fight escalating does not sound like a track
change.

Timing is a lookahead scheduler: a 50 ms timer schedules every note falling
inside the next 200 ms against `ctx.currentTime`, capped at 48 steps per tick so
a throttled tab cannot flood. One `setTimeout` per note drifts audibly within a
few bars.

| Id | What it is | Intended trigger | Triggered today |
|---|---|---|---|
| `title` | D2 pedal, ~33 s phrase, a four-note bell descent on uneven steps (74, 72, 69, 65), and a great deal of nothing. Third layer (a high pad) only above intensity 0.45 | Title screen | **Yes** |
| `charcreate` | Two chords breathing against each other (A2 add, then G2), a lone bell on step 9 of 32, an upper pad above intensity 0.5. Unhurried | Character creation | **Yes** |
| `explore` | A sub pulse every two bars — *the "is something still running?" heartbeat* — and one 15 s pad every 32 steps. Two layers. That is the whole piece | Ordinary exploration | **Yes, but only on return** — see below |
| `tense` | The same grid as `explore` with two more layers switched on: an off-beat pulse (*the same heartbeat with something walking beside it*) and a semitone-displaced pad at intensity 0.6 | Restricted or dangerous spaces | **Yes** — `spine-duct` declares it |
| `investigate` | Dry and curious. Three cycle lengths that never line up: an 8-note pluck figure on an irregular 20-step meter, a tick pattern on 18 (so it slides out of phase), a sub every 40, and a fourth pluck voice on 13 above intensity 0.7 | The evidence board; sustained investigation | **Never triggered** |
| `weight` | Heavy dialogue. One cluster (F2, C3, G3, A♭3, C4) swelling for nine seconds. **G3 against A♭3 — a single minor second is the whole emotional argument** | Any dialogue the scene marks as heavy | **Yes** — set when a "weight" dialogue opens |
| `battle` | 6/8 at 252 steps/min, D aeolian, an eight-bar harmonic cycle (i i VI VI VII VII v v) so it loops seamlessly. Sub on the downbeat, a lowpassed noise kick, ghost hits derived from the bar index, pad at intensity 0.3, arpeggio at 0.65 | Ordinary combat | **Yes** — Cael's spar, Ivo's Bailiff |
| `battleBoss` | `battle` plus two always-on layers: a **tritone stack** over the root, and a sub an octave down on every downbeat | The Registry Sentinel | **Yes** |
| `reveal` | One chord that sours and then resolves — a slow ±38-cent bend out and back across a 23 s pad — and nothing else happens. A bell at step 11 above intensity 0.6 | A major reveal | **Never triggered** |
| `chapterEnd` | The title motif, **down a fourth, slower, falling further**: A1 pedal, five bells (69, 67, 64, 60, 57) instead of four, and a sub that drops a further fourth at the end | Chapter end screen | **Yes** |

### 4.1 Known gaps in music triggering

These are defects, not design:

- **`investigate` and `reveal` are never selected by any caller.** Two of the
  ten pieces have never played. `investigate` is the obvious cue for the
  evidence board (`Q`), which currently opens over whatever was playing.
- **`explore` is never started on entering the world.** It is set only when
  leaving a dialogue (`explore.ts`) or leaving a battle (`battle.ts`). Signing
  on from character creation therefore carries `charcreate` into the corridor
  until the first conversation ends. Entering a room does not set music unless
  the room declares one, and only `spine-duct` does.
- **`audio.duck()` is never called.** The ducking bus exists, is correct, and
  has no callers. It was built for reveal stings and dialogue.
- **`setMusicIntensity()` is never called** outside the engine, so every piece
  plays at the default intensity of 0.5 forever. Concretely: `battle`'s
  arpeggio layer (threshold 0.65) and `investigate`'s fourth voice (0.7) have
  never sounded, and the intensity system — the piece's whole reason for being
  layered rather than sequenced — is unexercised.

Tracked in `TASKS.md`.

---

## 5. Sound effects — the `SfxId` union

Forty-two cues. Grouped as authored.

### 5.1 Interface

| Id | Construction | Fired |
|---|---|---|
| `ui.move` | Square 680→610 Hz, 45 ms | Yes |
| `ui.select` | Triangle 520→784 Hz, 90 ms, plus a 3.2 kHz noise tick | Yes |
| `ui.back` | Triangle 520→330 Hz, 100 ms | Yes |
| `ui.error` | Two dry square pulses, the second slightly flat — **a refusal, not a buzzer** | Yes |
| `ui.open` | Noise sweep 400→2600 Hz plus a rising triangle | Yes |
| `ui.close` | The inverse sweep, 2400→380 Hz | Yes |
| `text.blip` | Triangle at 1180 Hz ±8% jitter, 22 ms, on the fast path | Yes — every 2nd or 3rd revealed character |

### 5.2 Footsteps, by surface

Each is a filtered impact plus, where the surface rings, a body tone. Surface is
read from the tile's `step` metadata (`stepSoundAt`), so the floor family the
artist chose *is* the footstep.

| Id | Construction | Surface |
|---|---|---|
| `step.metal` | 2.2 kHz band, Q4, plus a 92→70 Hz body | `floor.plate.*`, `floor.rivet`, `floor.hazard`, doors, ladders, stairs |
| `step.grate` | 3.4 kHz Q9 plus a 2.6 kHz Q12 ring 35 ms later, plus 110 Hz | `floor.grate.*`, `floor.mesh.*`, `hatch.open` |
| `step.carpet` | Lowpassed pink at 700 Hz, slow 8 ms attack, no tone | `floor.carpet.*`, `prop.rug` |
| `step.tile` | Highpassed 1.5 kHz plus a short 160 Hz | `floor.med.*`, `floor.commons.*`, `floor.registry.*` |
| `step.soil` | Lowpassed pink 1.1 kHz plus a second pink layer at 2 kHz | `floor.soil.*` *(hydroponics — no room yet)* |

All five are dispatched through one template-literal call site in `explore.ts`.
`step.soil` cannot fire today because no room uses soil.

### 5.3 Doors and hatches

| Id | Construction | Fired |
|---|---|---|
| `door.open` | Sawtooth 58→96 Hz over 420 ms with a 50 ms attack, a noise sweep riding it, and a lowpassed thump on arrival | Yes |
| `door.close` | The inverse, plus a heavier 200 Hz thump and a 76→48 Hz drop | **Never fired** |
| `door.locked` | A 220 Hz lowpassed knock, a 70 Hz body, then a single flat 172 Hz square — the door tone that means no | Yes |
| `hatch` | A 3 kHz latch click plus two inharmonic triangle partials (1620 / 2430 Hz) — **a small ring, not a bell** | **Never fired** |

`hatch` is the duct hatch. The chapter's set-piece obstacle currently opens
without its own sound.

### 5.4 Terminals

| Id | Construction | Fired |
|---|---|---|
| `terminal.on` | Triangle 180→760 Hz, a noise sweep, and a 60 Hz hum it settles into | Yes — any interactable whose id contains `terminal` or `muster` |
| `terminal.key` | 900 Hz square, 22 ms | Yes — name entry |
| `terminal.deny` | Two falling squares six Hz apart; **the beating is what sours it** | **Never fired** |

`terminal.deny` is the obvious cue for a refused Registry access, which is a
real state in `content.ts` (`watch-terminal` without clearance) and currently
silent.

### 5.5 Investigation

| Id | Construction | Fired |
|---|---|---|
| `clue.found` | Two FM bells (659 then 988 Hz, ratio 2.01) | Yes — on the `clue:found` event bus |
| `clue.link` | Three FM partials climbing 587 → 784 → 1175 Hz — **two facts becoming one** | Yes — evidence board linking |
| `quest.update` | Two FM tones, ratio 1.41 | **Never fired** |
| `pickup` | Triangle 880→1320 Hz plus a 5 kHz tick | **Never fired** |
| `relation.up` | Rising major third, two soft triangles | **Never fired** |
| `relation.down` | Falling minor third, with a detuned third voice under it | **Never fired** |
| `scan` | Three rising squares, 1200 / 1500 / 1800 Hz | Yes — combat READ |

The four unfired cues correspond exactly to four systems with a data layer and
no interface: quests (`KNOWN_ISSUES.md` — one quest, no stages), inventory (no
UI), and relationship changes (shown as toasts and a journal entry, never
sounded).

**`clue.found` and `clue.link` are in direct conflict with
`MYSTERY_STRUCTURE.md` §10.4. See §9.**

### 5.6 Combat

| Id | Construction |
|---|---|
| `loom.project` | A detuned sawtooth pair sweeping 110→220 Hz through a rising 300→4200 Hz band, with an FM bell at 550 ms — **a body assembling out of field**. 1 s |
| `battle.start` | A 150→42 Hz drop, a rising noise swell, then two sawtooths a **tritone** apart |
| `battle.win` | Three FM bells, 440 / 587 / 659. Modal and short |
| `battle.lose` | A detuned triangle pair falling an octave over 1.2 s, plus a 62 Hz sub |
| `revenant.collapse` | 180→28 Hz under a 3 kHz→200 Hz noise fall, then three pieces of debris at 420 / 560 / 650 ms |
| `shield` | Rising triangle 180→540 Hz plus a resonant noise sweep |
| `heal` | 523 Hz then 784 Hz, soft attacks |
| `status.apply` | A 2.4 kHz Q8 tick plus a falling 233→175 Hz square |

**The five aspect hits are separated by spectrum, not by volume**, so they stay
legible when three of them land inside a second:

| Id | Construction |
|---|---|
| `hit.kinetic` | Lowpassed 900 Hz noise plus a 150→60 Hz body. Blunt, low |
| `hit.thermal` | A 3 kHz→700 Hz noise fall plus a sawtooth drop. Wide, hissing |
| `hit.field` | FM carrier against a **√2 (tritone) modulator** at index 8 — a grain with no natural analogue |
| `hit.cognitive` | **Swells backwards** over 170 ms then stops dead on two beating squares. Reads as *wrong* rather than loud |
| `hit.corrosive` | Two long resonant pink sweeps, Q8 and Q12, 2.6 kHz→800 and 5.2 kHz→1.6 k. Eating |

All five are dispatched through one template-literal call in `battle.ts`, keyed
on the ability's aspect. `battle.win` / `battle.lose` are dispatched through a
ternary.

### 5.7 Alarms

| Id | Construction | Fired |
|---|---|---|
| `alarm.short` | Two two-note square pips, 660/880 Hz | **Never fired** |
| `klaxon` | Three cycles of a 138→108 Hz sawtooth over a 69 Hz sub, 620 ms apart. Rate-limited to one per 1.5 s | **Never fired** |

Both belong to lockdown and hull events, which do not exist yet.

### 5.8 Coverage summary

**Nine of forty-two cues have never been triggered by any caller:**
`door.close`, `hatch`, `terminal.deny`, `quest.update`, `pickup`,
`relation.up`, `relation.down`, `alarm.short`, `klaxon`.

Three of those (`door.close`, `hatch`, `terminal.deny`) are cheap wins against
content that already exists. Six wait on systems that do not.

---

## 6. Diegetic sound

The rule: **if the player can point at the object making the sound, the sound
belongs to the object.** The ship is loud because the ship is working.

| Source | Status |
|---|---|
| **Mains hum** | Built. 50 Hz plus a near-unison partner in `hab`, `commons`, `watch`. The beat frequency between them is the ship's pulse |
| **Ballast / failing lighting** | Built. The 7.3 Hz pulsing sawtooth in `watch` is a specific failing fitting in a specific room — Trave's office is badly lit on purpose (`rooms.ts`) and it is badly *sounded* to match |
| **Door mechanisms** | Built for opening and refusal; `door.close` and `hatch` exist and are unwired (§5.3) |
| **Terminals** | Built. `terminal.on` settles into a 60 Hz hum rather than ending, so a terminal you woke stays awake |
| **The loom** | Built. `loom.project` is the wrist loom projecting a revenant — the sound of a dead person being given a body. It is the longest single sfx in the game (1 s) and it is deliberately not a weapon sound |
| **Lattice** | Built. The `registry` bed's chirps are lattice traffic; the halo-lit props in `ART_DIRECTION.md` §7.1 are the visual half of the same statement |
| **Crockery, distant voices** | Built into `commons`. The voices carry **two formants and a glide and no words** — a person, not dialogue. Canon §9 forbids anything that could be mistaken for a line |
| **PA announcements** | **Not built.** There is no announcement system, no voice synthesis and no announcement text. Watch changes, muster calls and the 08:00 handover are currently silent. This is the largest missing diegetic layer and it is the one canon most obviously wants: the Board delivers its worst acts in the register of a scheduling change |
| **Hull groans** | Built into `spine` (every 16–42 s) |

**Design note for later chapters.** The PA is the natural carrier for
bureaucratic horror. A scheduling announcement that names a deck the player has
just learned is a hold full of people costs nothing and does more than a cutscene
would. Recommend it be built as a diegetic text-plus-tone system (a two-tone
chime, then a message in the standard UI band), not as speech.

---

## 7. Must never happen

1. **Never ship an audio file.** Everything is synthesized. A single `.ogg`
   breaks the "no external assets" property that makes this repository fully
   auditable.
2. **Never assign to a live `AudioParam`.** Assignment clicks. Every volume,
   fade and duck is a ramp (`linearRampToValueAtTime` / `setTargetAtTime`).
3. **Never `start()` a source without a matching `stop()` and a teardown on
   `onended`.** Nothing may survive its own sound. A leaked oscillator is
   permanent and inaudible until there are two hundred of them.
4. **Never let a bed grow generators at runtime.** A bed is built once with a
   fixed list of layers and events; the ticker only *schedules* from that list.
5. **Never catch up a throttled scheduler.** A backgrounded tab returns a huge
   delta. Both the music transport and the ambience ticker **resync** rather than
   scheduling every missed step, which would be unbounded work and would burn a
   whole cue in one frame.
6. **Never restart a piece to change intensity.** Layers ramp; the grid keeps
   running. Restarting is audible and destroys the illusion that the music was
   always there.
7. **Never build the `AudioContext` outside a user gesture.** Browsers refuse,
   and the failure is silent-forever rather than silent-for-now.
8. **Never use the compressor as a mixer.** It is a safety net. If cues need
   compressing to coexist, their levels are wrong.
9. **Never let a sfx exceed the voice cap by queueing.** Over 28 concurrent
   voices, new non-blip cues are dropped. A queue turns a burst into a smear
   arriving after the thing that caused it.
10. **Never write a fanfare.** No cue in this game congratulates the player.
11. **Never let ambience be silent by accident.** If a space is meant to be
    quiet, it gets the `silence` bed, which is composed. A `null` ambience is a
    bug unless a scene deliberately asked for it.
12. **Never let a bed touch the global RNG.** Each bed seeds its own stream.

---

## 8. Accessibility

Four independent volume channels, all persisted, all applied as ramps. Ambience
has its own fader specifically so a player who finds the machinery oppressive
can turn *it* down without losing dialogue blips or combat legibility.

**Nothing in the game is communicated by sound alone.** Every cue in §5 has a
visual counterpart: clues raise a toast and change the casebook count, statuses
are drawn as words, refusals print a line. The game is fully playable at zero
volume, and that is a hard requirement, not an aspiration.

---

## 9. Unresolved conflict: the clue stinger

`MYSTERY_STRUCTURE.md` §10.4 states, and explicitly cites this document:

> **No stingers.** No sound cue on clue acquisition (see `AUDIO_DIRECTION.md`).
> The casebook count changes. That is all.

**The code does the opposite.** `src/game/app.ts` subscribes to the `clue:found`
event and plays `clue.found` unless the caller passes `silent`. The evidence
board plays `clue.link` on a successful link (`menus.ts`).

This is not a small disagreement. The design argument in `MYSTERY_STRUCTURE.md`
is that a stinger tells the player *the game thinks this mattered*, which does
part of the deducing for them and makes clue-vacuuming feel rewarding — against
pillar P2 (`GAME_DESIGN.md` §1). The counter-argument, implied by the
implementation, is that an unacknowledged pickup in a 384x216 frame is easy to
miss entirely.

**This document does not resolve it.** Both cues are documented above as built.
The lead needs to rule, and the ruling should be one of:

- **A.** Honour `MYSTERY_STRUCTURE.md`: remove both cues, keep the toast and the
  count. `silent` already exists as a parameter.
- **B.** Amend `MYSTERY_STRUCTURE.md` §10.4 and keep the cues.
- **C.** Split them: no sound on *acquisition* (`clue.found`), sound on *linking*
  (`clue.link`), on the argument that acquisition is the game noticing and
  linking is the player concluding. This is the option this document would pick
  if asked, but it is a design call, not an audio one.

---

## 10. Limitations — stated plainly

### What has actually been measured

`npm run test:audio` (`tools/audiocheck.mjs`) drives a real Chromium with a
fake audio device, unlocks the context, taps the master bus with an
`AnalyserNode` and measures peak amplitude. Latest run:

| Check | Result |
|---|---|
| `AudioContext` state | running @ 44100 Hz |
| one-shot sfx emits signal | peak 0.0644 |
| music emits signal | peak 0.1391 |
| ambience emits signal | peak 0.0707 |
| all 41 sfx cues fire without throwing | pass |
| all 10 music cues fire without throwing | pass |
| all 9 ambience beds fire without throwing | pass |
| `masterVolume: 0` actually silences output | peak 0.00015 |
| 400 rapid `text.blip` calls | graph survives |

That is 11/11. It establishes that the engine is **not a stub**: signal reaches
the destination, every declared cue executes its synthesis path, and the
settings store is genuinely wired to the channel gains.

### What that does NOT establish

- **Nobody has listened to it.** No claim is made anywhere in this document
  about how any of it sounds. Levels, balance, the relative loudness of beds
  against music against sfx, whether the 3.1 s medical ping is unbearable or
  merely present, whether the `commons` voices read as people or as noise — all
  unknown. A peak amplitude is not a judgement of quality.
- **Nothing is mixed.** The per-cue `level` values were chosen by judgement
  against each other on paper. The four channel defaults (master 0.75, music
  0.6, sfx 0.8, ambience 0.7) are guesses.
- **Nine sfx and two music cues are never triggered by gameplay** (§4.1, §5.8).
  The audio check now executes their synthesis paths, so they are known to run
  and not throw — but no game state reaches them.
- **The intensity system has never been exercised**, so several written layers
  have never sounded.
- **No browser matrix.** Audio has run only in headless Chromium. Safari's
  `AudioContext` behaviour under gesture gating, in particular, is untested and
  is the most likely place for a silent-forever failure.
- **Only a short leak test.** 400 rapid one-shots do not break the graph, but
  no multi-hour session has been measured (`KNOWN_ISSUES.md`, Review coverage).
- **No hearing-impaired review, and no review by anyone at all.**

Treat the entire audio subsystem as **implemented, untested**.

---

## Open questions for the lead

1. **The stinger conflict** (§9). Blocking, because it is a documented
   contradiction between two design documents and the code.
2. **Get one human to listen to it.** This is the highest-value item in the
   audio backlog by an enormous margin and it costs one person twenty minutes on
   a machine with speakers. Everything else in this document is speculation
   until it happens.
3. **Wire the three cheap cues** — `door.close`, `hatch`, `terminal.deny` —
   against content that already exists (§5.8).
4. **Decide what `investigate` is for.** It is a complete piece with no trigger.
   The evidence board is the obvious home; if the intent is that the board is
   silent, the piece should be deleted rather than left as a decoy.
5. **PA announcements** (§6). Recommend building as diegetic text plus a chime,
   not speech. Needs a ruling before Chapter Two content is written, because
   whether the ship talks to its crew changes how several scenes are staged.
6. **Whether `explore` should start on world entry** (§4.1). The current
   behaviour — character-creation music bleeding into the corridor — is a bug in
   every reading, but "no music at all in ordinary exploration until something
   happens" is a defensible and arguably better design given §1. Pick one on
   purpose.
