# CANDLEWAKE — QUALITY RUBRIC

The bar each system is measured against. Written so a reviewer can actually
score against it rather than express an opinion.

**Governing rule: an implementation agent may not approve its own work.** Every
system is reviewed by someone who did not build it. A system is not complete
because it runs without crashing.

**Second governing rule: no claim without evidence.** "Polished", "complete",
"production-ready" and "stunning" are not review outcomes. A screenshot
somebody looked at, a test that passed, a measured number, or a named defect —
those are review outcomes.

---

## 1. The harsh-critic standard

A reviewer's job is to find reasons the work does not yet meet the bar. A
finding must be **specific enough to act on without asking a follow-up
question.**

| Useless | Actionable |
|---|---|
| "The corridor doesn't feel polished." | "The corridor uses `wall.iron.face` twelve times consecutively with no variant, so it reads as procedurally assembled." |
| "The sprite looks off." | "The player sprite and the floor both sit at value ~0.35, so the character disappears against plate decking in unlit rooms." |
| "Combat is boring." | "Kinetic Strike is strictly better than Ballast Shove at every coherence level, so there is no reason to ever pick Ballast Shove." |
| "The mystery is confusing." | "D4 requires C8, but C8 is behind Registry access, which three of the five backgrounds cannot obtain — so D4 is unreachable for them and nothing else disproves D-X." |
| "The audio is good." | Not a finding. Nobody has heard it. |

A reviewer who reports no defects has not reviewed.

---

## 2. Functional gate

- [ ] Works during actual gameplay, not just in isolation.
- [ ] Handles its expected edge cases (empty list, first run, last item, zero
      state, maximum state).
- [ ] Does not break another system.
- [ ] Behaves correctly after save and reload.
- [ ] Survives pause, scene change, defeat, and window blur.
- [ ] No button, menu entry, or setting exists that does nothing.

---

## 3. Visual gate

- [ ] No placeholder assets remain.
- [ ] Matches `ART_DIRECTION.md`, including the accent-scarcity rule.
- [ ] Has been **inspected in-game via screenshot**, not only reasoned about.
- [ ] Readable in motion, not only when static.
- [ ] Pixel scaling stays integer; no blur at any window size.
- [ ] Interactive objects are higher contrast than their surroundings.
- [ ] Text remains legible over every background it can appear on.
- [ ] Reviewed at **1× as well as magnified**.

---

## 4. Narrative gate

- [ ] Respects `docs/CANON.md`. Canon is law.
- [ ] Respects each character's knowledge boundary — no NPC references a fact
      they cannot possess (`NARRATIVE_TRUTH.md`).
- [ ] Choices produce consequences beyond a single line of dialogue.
- [ ] Creates no timeline or continuity contradiction.
- [ ] Required clues remain obtainable on every background and every route.

---

## 5. Mystery fairness gate

This is the gate the game lives or dies on.

- [ ] **Every deduction rests on at least two independent sources.** No
      single-clue reveals.
- [ ] **No chapter-critical clue can be permanently lost.** Each has a
      documented redundant path (`MYSTERY_STRUCTURE.md`).
- [ ] The red herring **D-X** is disprovable by obtainable evidence.
- [ ] The player can reach the truth by reasoning, not by guessing.
- [ ] The player can tell *why* a deduction became available.
- [ ] A wrong-but-coherent theory is reachable and is never mocked.
- [ ] Reveals do not contradict earlier established facts.

---

## 6. Combat gate

- [ ] Turn order and current actor are unambiguous at a glance.
- [ ] Every ability does what its description says.
- [ ] Enemy decisions are explicable after the fact — no random flailing.
- [ ] Damage and status changes are readable without counting pixels.
- [ ] No ability is strictly better than another in all situations.
- [ ] No ability is never worth using.
- [ ] Victory, defeat, flee, spare and capture all resolve correctly.
- [ ] Defeat is recoverable; the player is never soft-locked.
- [ ] Combat feeds the mystery — scanning, sparing and destroying have
      different informational consequences.

---

## 7. Performance gate

Budgets from `PERFORMANCE_BUDGET.md`. Measured figures are under SwiftShader
(software rasterisation) — the fps number is a **floor, not a result**, and no
GPU measurement has been taken.

| Metric | Budget | Measured |
|---|---|---|
| Frame rate | 60 fps | 39–43 fps (software) |
| Draw calls / frame | ≤ 4 | **1** |
| Triangles / frame | ≤ 4,000 | ~2 post-batch |
| Worst frame | ≤ 33 ms | 32.6–48 ms (software) |
| Sprite atlas | ≤ 1024² | 1024², well under capacity |
| Tile atlas | one texture | 256 × 112, 111 tiles |
| Runtime dependencies | as few as possible | one (`three`) |

- [ ] No per-frame allocation in the update or draw path.
- [ ] No unbounded growth over a long session.
- [ ] Every Three.js geometry, material, texture, render target and audio node
      has a disposal path.
- [ ] Frame delta is clamped so a backgrounded tab cannot teleport the player.

---

## 8. Accessibility gate

- [ ] Every option in the settings menu is read by real code.
- [ ] `reduceFlashing` genuinely suppresses light flicker and strobe.
- [ ] `reduceShake` genuinely suppresses screen shake.
- [ ] `minAmbient` guarantees navigation never fails in darkness.
- [ ] Text speed, instant text and large text all work, and large text does not
      overflow its box.
- [ ] **No clue is distinguishable by colour alone** — `symbolMarkers` adds a
      shape or letter wherever colour carries meaning.
- [ ] Controls are fully remappable; a rebind cannot leave an action unbound.
- [ ] Combat speed and combat assist function.

---

## 9. Integration gate

- [ ] Works against the complete game state, not a fixture.
- [ ] Survives pause, restart, defeat, scene transition and save reload.
- [ ] Respects every settings and accessibility value.
- [ ] Communicates through the shared event bus, not through direct references
      into other systems.
- [ ] No hidden local alternative to a shared system.

---

## 10. Code gate

- [ ] Passes `tsc --noEmit` under `strict`, including `noUnusedLocals` and
      `noUnusedParameters`.
- [ ] No major system depends on hidden global state.
- [ ] Event listeners, timers and observers are removed on teardown.
- [ ] No file has grown into a dumping ground.
- [ ] Comments explain *why*, not *what*. Comment density matches the
      surrounding code.
- [ ] No dead code, no TODO standing in for a required feature.

---

## 11. Review coverage — honest status

| Review | Status |
|---|---|
| Automated playtest | **24/24 passing**, drives real gameplay in Chromium |
| Audio graph verification | **11/11 passing**, signal measured at the master bus |
| Visual review | Performed by screenshot at every milestone; defects logged in `KNOWN_ISSUES.md` |
| Content validator | Runs in-page; checks clue/deduction reachability |
| Combat balance | **Not done.** No numbers pass has been made |
| Narrative continuity sweep | **Partial.** Knowledge boundaries documented, not automatically enforced |
| Long-session leak test | **Not done.** Only a 400-call burst |
| Browser matrix | **Not done.** Chromium only |
| Human playtest | **Not done.** Nobody has played this |
| Listening review | **Not done, and not possible here.** Nobody has heard the audio |

The bottom five rows are the honest gap between this rubric and the current
state of the project. They are not deferred because they are unimportant.
