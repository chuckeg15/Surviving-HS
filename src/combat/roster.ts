/**
 * Roster additions — three revenants and the encounters that hold them.
 *
 * Each of these is a different *tactical problem*, not a different damage
 * number. The measured balance pass established that the interesting variable
 * in this system is the coherence economy, not integrity: a considered player
 * lands roughly 0.7-0.8 strikes per turn, so anything that taxes coherence or
 * denies an action is worth far more than a point of power. All three enemies
 * are built on that lever and each pulls it a different way.
 *
 *  - GANTRY MINDER  — attrition. Frays you. Wins if you run out of grip.
 *  - SECOND CAUTION — tempo. Acts first, chains bleedover. Punishes setup.
 *  - ADMITTANCE     — denial. Seals and blinds. Turns your kit off.
 *
 * Aspect choices are constrained, not free. Two starting tesserae are still
 * mono-aspect on offence — `truncheon` (all kinetic) and `kiln` (all thermal) —
 * so a thermal enemy blanket-resists Truncheon and a corrosive enemy blanket-
 * resists Kiln, which is exactly the "aspect is destiny" failure the balance
 * pass had to dig out. Neither aspect is used here. Kinetic (resists field,
 * which Lampwright can answer with TRACTION) and cognitive (resists corrosive,
 * which only Grey Liner carries, and only as a secondary) are safe.
 */

import type { Ability, EncounterDef, RevenantDef } from '@/combat/battle';

// =====================================================================
// ABILITIES
// =====================================================================

/**
 * `ABILITIES` in battle.ts is module-private, so the shared kit is redeclared
 * here. Where an id is reused it is byte-identical to the original on purpose —
 * BATON and CAUTION are Watch standard issue and the balance tool aggregates
 * usage by ability id, so the same weapon must not be counted twice under two
 * names.
 *
 * Enemy ability costs are all <= 3. The enemy AI only reaches for a guard at
 * coherence <= 3, so a 4-cost ability can take a cast from 4 to 0 and gutter it
 * without the guard branch ever firing. That is a stall-and-die bug, not a
 * difficulty setting.
 */
const ROSTER_ABILITIES: Record<string, Ability> = {
  // --- maintenance construct -------------------------------------------
  /**
   * The attrition engine. Cost 3 against the construct's +1/turn regeneration
   * means it fires on about three turns in four, and 2-turn FRAYED drains
   * exactly once per application (the tick that decrements 2->1 is the only one
   * that bites), so this is ~1 coherence a turn off the player. That is enough
   * to cost a 3-cost striker roughly one attack in six and no more; a longer
   * duration doubles the drain and pushed the fight past 14 turns in hand
   * simulation.
   */
  'rust-creep': {
    id: 'rust-creep', name: 'RUST CREEP', kind: 'strike', aspect: 'corrosive', cost: 3, power: 10,
    desc: 'Works solvent into the join and waits. The waiting is the weapon.',
    inflict: [{ status: 'frayed', turns: 2, chance: 0.5 }],
  },
  /**
   * A point cheaper than RUST CREEP and no rider, so neither is strictly
   * better: this one covers the turns the construct cannot afford the other,
   * and the aspect wheel hands it the pick against field and cognitive casts.
   * Power 8, which is the lowest opener in the roster, because the casts on the
   * receiving end of it are Lampwright and Tallyman — the two lowest-throughput
   * kits in the game. At 10 they lost this fight with the construct on 9%
   * integrity left. At 8 they finish it. Nothing else in the matrix moved.
   */
  'seam-driver': {
    id: 'seam-driver', name: 'SEAM DRIVER', kind: 'strike', aspect: 'kinetic', cost: 2, power: 8,
    desc: 'Drives the plate home. It has done this ten thousand times.',
  },
  /**
   * Coherence recovery first, repair second. +4 integrity a use, and the AI only
   * reaches for a guard at coherence <= 3 (about one turn in four), so this is
   * ~1 integrity a turn — flavour and stubbornness, not a healing wall. A real
   * mend would be: the AI mends every affordable turn below 35% integrity, which
   * in hand simulation added six turns to the fight and made the last third of
   * it a wall the player watches rather than plays.
   *
   * The 0.25 brace is nearly dead weight at grip 4 — guards are cleared at the
   * top of each turn, so a cast that always acts second never gets to use one
   * defensively. It is kept small and honest rather than deleted, for the day
   * something outspeeds this.
   */
  'patch-cycle': {
    id: 'patch-cycle', name: 'PATCH CYCLE', kind: 'guard', aspect: 'kinetic', cost: 1, power: 0,
    desc: 'Stops, checks the work, patches itself like it patches the hull.',
    selfBuff: { guard: 0.25, coherence: 5, integrity: 4 },
  },

  // --- Watch escalation unit -------------------------------------------
  /**
   * The tempo engine. 2-turn BLEEDOVER survives exactly one turn boundary, so
   * at grip 9 the unit applies it and cashes it itself on the following turn:
   * 12 power reading as ~16 on the chain. That is the punish for spending a
   * turn on setup — the amplified hit lands whether or not you did anything
   * with yours.
   *
   * Cognitive is the only attack aspect that is strong against nothing in the
   * starting five and weak against only Lampwright, which is why it is here.
   * As thermal this ability was 1.4 into both kinetic casts and measured them
   * at 3% and 21% win — the unit was not hard, it was hard *at Grey Liner and
   * Truncheon*. Flat 12 into four of five casts is the same fight for
   * everybody. Power 12 also keeps it above BATON's expected damage in those
   * four matchups, so the bleedover chain is the unit's default line rather
   * than an occasional flourish.
   */
  'escalate': {
    id: 'escalate', name: 'ESCALATE', kind: 'strike', aspect: 'cognitive', cost: 3, power: 12,
    desc: 'The next step in the procedure, taken early. Leaves the seam open.',
    inflict: [{ status: 'bleedover', turns: 2, chance: 0.6 }],
  },
  /** Watch standard issue, unchanged from the shared kit. */
  'baton': {
    id: 'baton', name: 'BATON', kind: 'strike', aspect: 'kinetic', cost: 2, power: 11,
    desc: 'Standard issue.',
  },
  /**
   * Unchanged from the shared kit, and load-bearing here. The AI reaches for a
   * control ability only when the player is at 2 coherence or less, which is
   * precisely the turn this unit has been manufacturing: ANCHORED then costs
   * the winded player 35% of their next strike as well. Control that fires on a
   * read of the board is worth more than control that fires on a timer.
   */
  'caution': {
    id: 'caution', name: 'CAUTION', kind: 'control', aspect: 'kinetic', cost: 2, power: 3,
    desc: 'A formal warning, delivered hard.',
    inflict: [{ status: 'anchored', turns: 2, chance: 0.8 }],
  },
  /**
   * At grip 9 this guard actually works — it is set before the player acts, so
   * the 0.4 lands on their strike. That is the other half of the tempo problem:
   * the one turn in five the unit stops attacking is also the worst turn to
   * commit a big hit into. Cheaper coherence than SHELVE, better brace.
   */
  'form-up': {
    id: 'form-up', name: 'FORM UP', kind: 'guard', aspect: 'kinetic', cost: 1, power: 0,
    desc: 'Squares up and resets the distance. Procedure, mostly.',
    selfBuff: { guard: 0.4, coherence: 4 },
  },

  // --- Vestibule research construct ------------------------------------
  /**
   * The lock. Power 10 at cost 3 is under-rate on purpose: the construct is
   * paid in denial, not damage, and a SEALED player is already losing a turn of
   * mend or guard worth more than the two points of power. 2 turns = one full
   * player turn locked out, which is a real cost that cannot chain into a
   * lockout the player can never act through.
   */
  'redact': {
    id: 'redact', name: 'REDACT', kind: 'disrupt', aspect: 'cognitive', cost: 3, power: 10,
    desc: 'Strikes the part of the cast that knows how to help itself.',
    inflict: [{ status: 'sealed', turns: 2, chance: 0.75 }],
  },
  /**
   * Field, and one point of expected damage above REDACT against kinetic and
   * cognitive casts — so which lock a player meets is decided by the wheel,
   * and both appear across the roster rather than one going dead. Cheaper, so
   * it is also what the construct falls back to at 2 coherence.
   */
  'null-clause': {
    id: 'null-clause', name: 'NULL CLAUSE', kind: 'disrupt', aspect: 'field', cost: 2, power: 8,
    desc: 'Cites the clause that says you are not here. Static.',
    inflict: [{ status: 'static', turns: 2, chance: 0.6 }],
  },
  /**
   * More coherence than FORM UP, less brace, so neither guard dominates the
   * other. The construct needs the coherence more than the cover: its whole
   * threat is being able to lock every turn it can afford to.
   */
  'shelve': {
    id: 'shelve', name: 'SHELVE', kind: 'guard', aspect: 'cognitive', cost: 1, power: 0,
    desc: 'Puts the matter aside without closing it. Recovers grip.',
    selfBuff: { guard: 0.35, coherence: 5 },
  },
};

// =====================================================================
// REVENANTS
// =====================================================================

export const ROSTER_REVENANTS: Record<string, RevenantDef> = {
  /**
   * Attrition. Grip 4 is below every tessera, so it never acts first and never
   * surprises anyone — the threat is entirely that it does not stop. Integrity
   * 88 sits under Grey Liner rather than up at the boss's 106, because its real
   * durability is the FRAYED tax on the player's coherence, which costs a
   * 3-cost striker about one attack in six. Counting that, it plays like ~105.
   * Coherence 9 against cost 2-3 abilities and +1/turn regeneration keeps it
   * acting on three turns in four; it never stalls and never gutters itself.
   *
   * Measured caveat, stated because the numbers say so: Lampwright and Tallyman
   * lose this fight 100% of the time, at 88 integrity and at every value down to
   * 74. That is not this enemy — they lose to the shipped Bailiff 100% of the
   * time too. Against a kinetic cast their throughput is ~6 and ~5 a turn,
   * because neither kit has a guard and neither has a strike the wheel likes.
   * The fix is in their kits, not here, and their kits are in battle.ts.
   */
  'gantry-minder': {
    id: 'gantry-minder', name: 'GANTRY MINDER', castOf: 'Bo Tashen, hull-sealer, d. 2224',
    serial: 'LT9-0058', aspect: 'kinetic', integrity: 88, coherence: 9, grip: 4,
    abilities: [
      ROSTER_ABILITIES['rust-creep'],
      ROSTER_ABILITIES['seam-driver'],
      ROSTER_ABILITIES['patch-cycle'],
    ],
    reading:
      'A sealer. Nineteen years on the same run of seam, and nobody ever told the cast the run ' +
      'was finished, so it is still finishing it.',
  },

  /**
   * Tempo. Grip 9 is one above the fastest tessera (Tallyman, 8), so it acts
   * first against everyone — deliberate, because BLEEDOVER only reads as a
   * tempo problem if the unit is the one who cashes it. Integrity 88 is
   * moderate and meant to be: it hits for ~16 on the chain, so a fight that
   * also lasted eleven turns would simply kill the player. It came down from 96
   * because Grey Liner and Truncheon were losing with the unit on 8% and 2%
   * integrity left — a hair's-breadth loss repeated 300 times is not a close
   * fight, it is a wall with a rumour of a door in it. Coherence 10 buys three
   * ESCALATEs before it has to FORM UP.
   *
   * Cognitive, not kinetic, and that is a measured choice rather than a
   * flavour one: the Watch already fields two kinetic casts, and a third made
   * Kiln's thermal kit a 3-turn blowout while leaving Lampwright with nothing
   * in its kit that was not resisted. Cognitive is the only aspect no starting
   * tessera is defenceless into. It also happens to be the truth about her —
   * she is not strong, she is procedural.
   */
  'second-caution': {
    id: 'second-caution', name: 'SECOND CAUTION', castOf: 'Nell Ferriday, Watch cadet, d. 2229',
    serial: 'LT9-0473', aspect: 'cognitive', integrity: 88, coherence: 10, grip: 9,
    abilities: [
      ROSTER_ABILITIES['escalate'],
      ROSTER_ABILITIES['baton'],
      ROSTER_ABILITIES['caution'],
      ROSTER_ABILITIES['form-up'],
    ],
    reading:
      'A cadet. Two months in post when she died, and it shows \x7f it escalates because that is ' +
      'the only part of the procedure it got as far as learning.',
  },

  /**
   * Denial. Integrity 78 is the lowest thing in the roster and that is the
   * fairness clause, not a shortage of ideas: a player whose support is SEALED
   * and whose strikes are missing to STATIC still kills it in about eleven
   * turns, while it needs about twelve to kill them. A denial enemy has to die
   * faster than it locks, or the lock is just a longer loss. Measured, a
   * strikes-only player — no mend, no guard, no read — wins 81%. Grip 9 so the
   * lock lands before the player commits; coherence 12 so it can afford to lock
   * nearly every turn, which is the whole character.
   */
  'admittance': {
    id: 'admittance', name: 'ADMITTANCE', castOf: 'Imre Sallow, admissions clerk, d. 2229',
    serial: 'LT9-0031/V', aspect: 'cognitive', integrity: 78, coherence: 12, grip: 9,
    abilities: [
      ROSTER_ABILITIES['redact'],
      ROSTER_ABILITIES['null-clause'],
      ROSTER_ABILITIES['shelve'],
    ],
    reading:
      'An admissions clerk. The ship serial has a Vestibule re-issue stamped over it: somebody ' +
      'took a man who decided who was allowed in and made him into a door.',
  },
};

// =====================================================================
// ENCOUNTERS
// =====================================================================

export const ROSTER_ENCOUNTERS: Record<string, EncounterDef> = {
  'gantry-minder': {
    id: 'gantry-minder', title: 'STILL WORKING',
    enemy: ROSTER_REVENANTS['gantry-minder'], opponent: '',
    lossIsFatal: false, canFlee: true,
    intro:
      'The seam it is working was signed off before you came aboard. It goes on sealing it ' +
      'anyway, and it will go on sealing it around you, or through you.',
    onWin: (s) => {
      s.setFlag('minder-stood-down', true);
      s.note('Put down the maintenance cast still working the old seam.');
    },
    onScan: (s) => {
      s.setFlag('scanned-minder', true);
      s.note('Read the sealer: Bo Tashen, nineteen years on one run of seam.');
    },
    onLose: (s) => s.note('The sealer worked straight through you and went back to the seam.'),
  },

  'ivo-escalation': {
    id: 'ivo-escalation', title: 'PETTY IVO \x7f SECOND CAUTION',
    enemy: ROSTER_REVENANTS['second-caution'], opponent: 'ivo',
    // canFlee true on purpose: ANCHORED taking the exit away has to cost
    // something, and it costs nothing in a fight with no exit in it.
    lossIsFatal: false, canFlee: true,
    intro:
      'Ivo gives you the second caution the way the book has it \x7f short, flat, once. He does ' +
      'not write this one down. That is the part you should find frightening.',
    onWin: (s) => {
      s.setFlag('ivo-escalated', true);
      s.suspicion += 20;
      s.adjustRelation('ivo', -18);
      s.adjustFaction('watch', -15);
      s.note('Went through Petty Ivo a second time. He will not caution you again.');
    },
    onLose: (s) => {
      s.setFlag('ivo-escalated', true);
      s.suspicion += 15;
      s.adjustRelation('ivo', -6);
      s.note('Ivo put you on the deck and logged it properly this time.');
    },
  },

  'annex-admittance': {
    id: 'annex-admittance', title: 'ANNEX THREE \x7f ADMITTANCE',
    enemy: ROSTER_REVENANTS['admittance'], opponent: '',
    // No flight: the encounter is the door refusing you, and withdrawing from a
    // door is the same as not having come.
    lossIsFatal: false, canFlee: false,
    intro:
      'The door does not open and it does not refuse. Something steps out of the frame instead, ' +
      'in the overrobe pattern, hands behind its back, waiting for you to say why.',
    onWin: (s) => {
      s.setFlag('annex-door-open', true);
      s.suspicion += 12;
      s.adjustFaction('vestibule', -10);
      s.note('Took the Vestibule door cast apart at Annex Three.');
    },
    onScan: (s) => {
      s.setFlag('scanned-admittance', true);
      s.note('Read the door cast: a clerk, re-issued. The ship serial has a V stamped over it.');
    },
    onLose: (s) => {
      s.suspicion += 8;
      s.note('The door held. It did not need to do anything else.');
    },
  },
};

// =====================================================================
// MEASURED
// =====================================================================

/**
 * 300 battles per cell, driven through the real rules (BattleScene.simulate)
 * with the same four policies tools/balance.mjs uses, plus a fifth —
 * `strikeOnly`, a player with no mend, no guard and no read — because the
 * denial fight is only fair if that player can win it.
 *
 *   encounter          considered   greedy   turns   per-tessera (considered)
 *   gantry-minder            51%      38%     8.9    66 /  0 /  0 / 89 / 100
 *   ivo-escalation           83%      55%     7.6    56 /100 / 69 /100 /  90
 *   annex-admittance         83%      93%     8.3   100 / 87 / 28 /100 / 100
 *   ivo-bailiff (shipped)    60%      40%     8.7   100 /  0 /  0 /100 / 100
 *   registry-sentinel        67%      43%     8.4   100 / 74 / 20 /100 /  40
 *
 * Order is grey-liner / lampwright / tallyman / truncheon / kiln.
 *
 * What this says, in the order that matters:
 *  - Thinking still does something. Considered beats greedy on all three
 *    (+13, +28, and -10 where the fight is a race the greedy line wins on
 *    speed). That gap is the whole point of the system and it survived.
 *  - Fight length holds at 7.6-8.9 turns against the 8-11 target.
 *  - `ivo-escalation` has the flattest per-tessera spread of any encounter in
 *    the game, shipped ones included. That cost it aspect flavour: ESCALATE is
 *    cognitive rather than the obvious thermal, which was the only way to stop
 *    it being 1.4 into both kinetic casts.
 *  - `gantry-minder` reproduces the shipped Bailiff's profile exactly, zeroes
 *    and all. See the note on that revenant: the cause is Lampwright's and
 *    Tallyman's kits, which are not in this file.
 *  - Nothing here times out, stalls, or runs an enemy dry.
 */
