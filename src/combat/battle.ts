/**
 * Revenant combat.
 *
 * Two crew project casts through wrist looms and the casts fight. That premise
 * does the work a combat system in a mystery has to do: every enemy is a dead
 * person with a serial number, so SCANNING one is an investigative act and
 * destroying one erases evidence. The player is told this by the interface, not
 * by a tutorial box.
 *
 * Design rules:
 *  - Integrity is the body; Coherence is the cast's grip on itself and is spent
 *    to act. A revenant at zero coherence does not simply stop — it guttering,
 *    which is worse than being unable to act.
 *  - No ability is a renamed damage number. Every one of them either changes
 *    what the opponent can do next turn, changes what you can survive, or tells
 *    you something.
 *  - Enemy AI reads the actual board state. It is short, but it is not random.
 */

import { App, Scene } from '@/game/app';
import { Painter } from '@/ui/painter';
import { VH, VW } from '@/core/screen';
import { PAL, mix } from '@/art/palette';
import { audio } from '@/core/audio';
import { settings } from '@/core/settings';
import { Rng } from '@/core/rng';
import { GameState } from '@/game/state';
import { bus } from '@/core/events';
import { ROSTER_ENCOUNTERS } from '@/combat/roster';
import { ArenaLook, BODY_H, DEFAULT_ARENA, STANCE, drawArena } from '@/combat/arena';
import { battleItems, spendBattleItem } from '@/data/items';

// =====================================================================
// DATA
// =====================================================================

export type Aspect = 'kinetic' | 'thermal' | 'field' | 'cognitive' | 'corrosive';

export const ASPECT_MARK: Record<Aspect, string> = {
  kinetic: 'KIN',
  thermal: 'THR',
  field: 'FLD',
  cognitive: 'COG',
  corrosive: 'COR',
};

export const ASPECT_COLOR: Record<Aspect, string> = {
  kinetic: PAL.bone1,
  thermal: PAL.amber2,
  field: PAL.halo3,
  cognitive: PAL.bruise3,
  corrosive: PAL.moss4,
};

/**
 * A short cycle stays learnable. The multipliers were 1.5x / 0.66x, which
 * measurement showed was decisive rather than influential: three of the five
 * starting tesserae lost the boss fight 100% of the time purely on aspect,
 * with no play available to change it. A bad matchup should be a disadvantage,
 * not a verdict.
 */
const BEATS: Record<Aspect, Aspect> = {
  kinetic: 'field',
  thermal: 'kinetic',
  field: 'cognitive',
  cognitive: 'corrosive',
  corrosive: 'thermal',
};

export function effectiveness(atk: Aspect, def: Aspect): number {
  if (BEATS[atk] === def) return 1.4;
  if (BEATS[def] === atk) return 0.78;
  return 1;
}

export type StatusId =
  | 'frayed'
  | 'static'
  | 'anchored'
  | 'bleedover'
  | 'sealed'
  | 'guttering';

export const STATUS_INFO: Record<StatusId, { name: string; blurb: string; bad: boolean }> = {
  frayed: { name: 'FRAYED', blurb: 'Loses coherence every turn.', bad: true },
  static: { name: 'STATIC', blurb: 'Attacks may miss. Cannot scan.', bad: true },
  anchored: { name: 'ANCHORED', blurb: 'Cannot withdraw. Strikes land soft.', bad: true },
  bleedover: { name: 'BLEEDOVER', blurb: 'Next hit taken is amplified.', bad: true },
  sealed: { name: 'SEALED', blurb: 'Support abilities locked.', bad: true },
  guttering: { name: 'GUTTERING', blurb: 'Out of coherence. Taking escalating damage.', bad: true },
};

export type AbilityKind = 'strike' | 'guard' | 'mend' | 'disrupt' | 'read' | 'control';

export interface Inflict {
  status: StatusId;
  turns: number;
  chance: number;
}

export interface Ability {
  id: string;
  name: string;
  kind: AbilityKind;
  aspect: Aspect;
  cost: number;
  power: number;
  desc: string;
  /** Applied to the target on hit. A list, because control that only ever does
   *  one thing to the board is a strike with extra words. */
  inflict?: Inflict[];
  /** Applied to the user. */
  selfBuff?: { guard?: number; coherence?: number; integrity?: number };
  /** Strips every condition from the user. Was keyed off the ability id in the
   *  resolver, where nothing outside that one line could see it. */
  clears?: boolean;
  /** Never misses, ignores STATIC accuracy loss. */
  sure?: boolean;
}

export interface RevenantDef {
  id: string;
  name: string;
  /** The person the cast was. Shown when scanned — this is the point. */
  castOf: string;
  serial: string;
  aspect: Aspect;
  integrity: number;
  coherence: number;
  grip: number;
  abilities: Ability[];
  /** Revealed by a successful scan. */
  reading: string;
}

const A = (a: Ability): Ability => a;

export const ABILITIES: Record<string, Ability> = {
  /**
   * The floor of the whole system. Coherence only regenerates when a turn
   * advances, so a player holding nothing affordable could press confirm
   * forever and never recover — a genuine soft-lock, found by the playtest
   * after the balance pass raised strike costs. STEADY costs nothing, is never
   * sealed, and always passes the turn.
   */
  'steady': A({
    id: 'steady', name: 'STEADY', kind: 'guard', aspect: 'kinetic', cost: 0, power: 0,
    desc: 'Holds the projection together. Recovers coherence.',
    selfBuff: { guard: 0.25, coherence: 4 },
  }),
  'set-brace': A({
    id: 'set-brace', name: 'SET BRACE', kind: 'guard', aspect: 'kinetic', cost: 1, power: 0,
    desc: 'Halves damage this turn and restores coherence.',
    selfBuff: { guard: 0.5, coherence: 4 },
  }),
  'ratchet': A({
    id: 'ratchet', name: 'RATCHET', kind: 'strike', aspect: 'kinetic', cost: 3, power: 12,
    desc: 'A short mechanical strike. Reliable.', sure: true,
  }),
  'shear-pin': A({
    id: 'shear-pin', name: 'SHEAR PIN', kind: 'control', aspect: 'kinetic', cost: 2, power: 6,
    desc: 'Pins the target in place. Anchored.',
    inflict: [{ status: 'anchored', turns: 3, chance: 1 }],
  }),
  'gasket-read': A({
    id: 'gasket-read', name: 'READ WEAR', kind: 'read', aspect: 'kinetic', cost: 1, power: 0,
    desc: 'Reads the cast. Reveals aspect, serial, and origin.',
  }),
  // Every tessera used to be mono-aspect on offence, which made the aspect
  // wheel destiny rather than texture: three of five starting casts could not
  // deal unpenalised damage to the Chapter One boss under any play. Each kit
  // now carries one off-aspect strike, which also gives the loadout an actual
  // decision in it.
  'solvent-line': A({
    id: 'solvent-line', name: 'SOLVENT LINE', kind: 'strike', aspect: 'corrosive', cost: 2, power: 9,
    desc: 'Runs sealant solvent along the seam. Slow, and it keeps working.',
    inflict: [{ status: 'frayed', turns: 3, chance: 0.5 }],
  }),
  'traction': A({
    id: 'traction', name: 'TRACTION', kind: 'strike', aspect: 'kinetic', cost: 3, power: 12,
    desc: 'Sets the projection against itself. Anchored.',
    inflict: [{ status: 'anchored', turns: 3, chance: 0.9 }],
  }),
  // A mend competes with the turn you did not spend attacking, and measurement
  // was blunt about it: banking five coherence buys Kiln a KILN DRAW, and a
  // KILN DRAW is worth more than sixteen integrity in a race both casts finish
  // in five turns. So the heat has to go somewhere other than into the wound.
  // It goes into the field between them, and the other cast cannot see through
  // it.
  'cauterise': A({
    id: 'cauterise', name: 'CAUTERISE', kind: 'mend', aspect: 'thermal', cost: 3, power: 0,
    desc: 'Burns the seam shut, clears every condition, and vents the heat downrange.',
    selfBuff: { integrity: 16 }, clears: true,
    inflict: [{ status: 'static', turns: 3, chance: 0.6 }],
  }),
  'flare-off': A({
    id: 'flare-off', name: 'FLARE OFF', kind: 'strike', aspect: 'thermal', cost: 3, power: 15,
    desc: 'Dumps heat. May leave the target frayed.',
    inflict: [{ status: 'frayed', turns: 3, chance: 0.6 }],
  }),
  'bank-heat': A({
    id: 'bank-heat', name: 'BANK HEAT', kind: 'guard', aspect: 'thermal', cost: 1, power: 0,
    desc: 'Stores the next blow as coherence instead of damage.',
    selfBuff: { guard: 0.4, coherence: 5 },
  }),
  'lamplight': A({
    id: 'lamplight', name: 'LAMPLIGHT', kind: 'mend', aspect: 'field', cost: 2, power: 0,
    desc: 'Restores integrity. Cheap, steady, never enough on its own.',
    selfBuff: { integrity: 19 },
  }),
  'clean-field': A({
    id: 'clean-field', name: 'CLEAN FIELD', kind: 'mend', aspect: 'field', cost: 2, power: 0,
    desc: 'Clears all conditions and restores a little coherence.',
    selfBuff: { coherence: 2 }, clears: true,
  }),
  'suture': A({
    id: 'suture', name: 'SUTURE', kind: 'strike', aspect: 'field', cost: 2, power: 12,
    desc: 'A field seam drawn through the target. Leaves bleedover.',
    inflict: [{ status: 'bleedover', turns: 2, chance: 0.75 }],
  }),
  'tally': A({
    id: 'tally', name: 'TALLY', kind: 'read', aspect: 'cognitive', cost: 1, power: 0,
    desc: 'Reads the cast and its remaining coherence exactly.',
  }),
  'strike-record': A({
    id: 'strike-record', name: 'STRIKE RECORD', kind: 'disrupt', aspect: 'cognitive', cost: 3, power: 11,
    desc: 'Erases part of what the cast knows how to do. Sealed.',
    inflict: [{ status: 'sealed', turns: 3, chance: 0.85 }],
  }),
  // Measured dead at 0% across two balance passes. It kept 4 power, which was
  // enough for every policy to file it as a bad strike and never as the brace
  // it is: Tallyman's whole game is grip, so its brace has to be the cheapest
  // thing in the kit rather than the second most expensive. Damage removed
  // outright \x7f AUDIT counts what is left and takes it, and counting is not
  // a blow.
  'audit': A({
    id: 'audit', name: 'AUDIT', kind: 'guard', aspect: 'cognitive', cost: 1, power: 0,
    selfBuff: { guard: 0.45, coherence: 3 },
    desc: 'Reads the cast\x27s remaining grip aloud and takes it. Braces while it counts.',
    inflict: [{ status: 'frayed', turns: 4, chance: 0.9 }],
  }),
  'truncheon': A({
    id: 'truncheon', name: 'TRUNCHEON', kind: 'strike', aspect: 'kinetic', cost: 3, power: 14,
    desc: 'Watch-issue. Blunt and correct.',
  }),
  // The description promised two things and the rules delivered one: it read
  // "anchors the target and seals its support" while inflicting only ANCHORED,
  // and SEALED did nothing to an opponent anyway. Both halves are real now, and
  // RESTRAIN is the reason a Watch cast is difficult to talk around.
  'restrain': A({
    id: 'restrain', name: 'RESTRAIN', kind: 'control', aspect: 'kinetic', cost: 2, power: 6,
    desc: 'Anchors the target and seals its support.',
    inflict: [
      { status: 'anchored', turns: 3, chance: 1 },
      { status: 'sealed', turns: 3, chance: 0.8 },
    ],
  }),
  'kiln-draw': A({
    id: 'kiln-draw', name: 'KILN DRAW', kind: 'strike', aspect: 'thermal', cost: 4, power: 20,
    desc: 'Everything at once. Costs most of your grip on yourself.',
  }),
  'quench': A({
    id: 'quench', name: 'QUENCH', kind: 'guard', aspect: 'corrosive', cost: 2, power: 0,
    desc: 'Dulls the next two blows.',
    selfBuff: { guard: 0.45, coherence: 1 },
  }),
  // --- enemy kit -------------------------------------------------------
  'deny': A({
    id: 'deny', name: 'DENY', kind: 'disrupt', aspect: 'field', cost: 2, power: 12,
    desc: 'Refuses the projection. Static.',
    inflict: [{ status: 'static', turns: 2, chance: 0.7 }],
  }),
  'seal-order': A({
    id: 'seal-order', name: 'SEAL ORDER', kind: 'control', aspect: 'field', cost: 3, power: 5,
    desc: 'Locks support abilities.',
    inflict: [{ status: 'sealed', turns: 3, chance: 0.9 }],
  }),
  'writ': A({
    id: 'writ', name: 'WRIT OF DISTRAINT', kind: 'strike', aspect: 'field', cost: 4, power: 17,
    desc: 'Administrative force, applied bodily.',
  }),
  'file-away': A({
    id: 'file-away', name: 'FILE AWAY', kind: 'guard', aspect: 'field', cost: 1, power: 0,
    desc: 'Withdraws behind procedure.',
    selfBuff: { guard: 0.45, coherence: 3 },
  }),
  'baton': A({
    id: 'baton', name: 'BATON', kind: 'strike', aspect: 'kinetic', cost: 2, power: 11,
    desc: 'Standard issue.',
  }),
  'caution': A({
    id: 'caution', name: 'CAUTION', kind: 'control', aspect: 'kinetic', cost: 2, power: 3,
    desc: 'A formal warning, delivered hard.',
    inflict: [{ status: 'anchored', turns: 2, chance: 0.8 }],
  }),
  'loom-tap': A({
    id: 'loom-tap', name: 'LOOM TAP', kind: 'strike', aspect: 'thermal', cost: 2, power: 8,
    desc: 'A demonstration blow, pulled at the last moment.',
  }),
};

export const TESSERAE: Record<string, RevenantDef> = {
  'grey-liner': {
    id: 'grey-liner', name: 'GREY LINER', castOf: 'Ostrow Kell, spinehand, d. 2233',
    serial: 'LT9-0447', aspect: 'kinetic', integrity: 96, coherence: 10, grip: 6,
    abilities: [ABILITIES.ratchet, ABILITIES['set-brace'], ABILITIES['solvent-line'], ABILITIES['gasket-read']],
    reading: 'A spinehand who died in the ducts and still moves like the ducts are narrow.',
  },
  lampwright: {
    id: 'lampwright', name: 'LAMPWRIGHT', castOf: 'Sera Ondt, medtech, d. 2230',
    serial: 'LT9-0219', aspect: 'field', integrity: 92, coherence: 13, grip: 7,
    abilities: [ABILITIES.suture, ABILITIES.lamplight, ABILITIES['traction'], ABILITIES['gasket-read']],
    reading: 'A medtech. Keeps trying to stabilise things, including its opponent.',
  },
  tallyman: {
    id: 'tallyman', name: 'TALLYMAN', castOf: 'Ferris Loom, registry clerk, d. 2228',
    serial: 'LT9-0102', aspect: 'cognitive', integrity: 81, coherence: 14, grip: 8,
    abilities: [ABILITIES.audit, ABILITIES['strike-record'], ABILITIES.tally, ABILITIES.deny],
    reading: 'A clerk. Wins by making the other thing unable to do its job.',
  },
  truncheon: {
    id: 'truncheon', name: 'TRUNCHEON', castOf: 'Petty Halden Ross, Watch, d. 2234',
    serial: 'LT9-0511', aspect: 'kinetic', integrity: 109, coherence: 9, grip: 5,
    abilities: [ABILITIES.truncheon, ABILITIES.restrain, ABILITIES['set-brace'], ABILITIES['gasket-read']],
    reading: 'Watch cast. Slow, heavy, and extremely difficult to talk around.',
  },
  kiln: {
    id: 'kiln', name: 'KILN', castOf: 'Ada Verrow, loom tech, d. 2231',
    serial: 'LT9-0388', aspect: 'thermal', integrity: 90, coherence: 12, grip: 7,
    abilities: [ABILITIES['flare-off'], ABILITIES['kiln-draw'], ABILITIES['bank-heat'], ABILITIES.cauterise],
    reading: 'A loom tech who ran her projector too hot and knew she was doing it.',
  },
};

export interface SimResult {
  result: 'win' | 'lose' | 'flee' | 'timeout';
  turns: number;
  used: Map<string, number>;
  damageDealt: number;
  damageTaken: number;
  meIntegrityLeft: number;
  foeIntegrityLeft: number;
  scanned: boolean;
}

export interface EncounterDef {
  id: string;
  title: string;
  enemy: RevenantDef;
  opponent: string;
  /** Loss here is a story beat, not a game over. */
  lossIsFatal: boolean;
  intro: string;
  onWin?: (s: GameState) => void;
  onScan?: (s: GameState) => void;
  onLose?: (s: GameState) => void;
  canFlee: boolean;
  /**
   * How the projection field reads for this fight. Omitted encounters get a
   * cold default; a boss should say so here rather than by being drawn
   * differently somewhere else.
   */
  arena?: Partial<ArenaLook>;
}

const secondLoom: RevenantDef = {
  id: 'second-loom', name: 'SECOND LOOM', castOf: 'a training cast, unnamed',
  serial: 'TRN-0001', aspect: 'thermal', integrity: 53, coherence: 8, grip: 5,
  abilities: [ABILITIES['loom-tap'], ABILITIES['bank-heat']],
  reading: 'A training cast. No person in it at all, which is its own kind of unsettling.',
};

const bailiff: RevenantDef = {
  id: 'bailiff', name: 'BAILIFF', castOf: 'Watch drone pattern, no person',
  serial: 'LT9-W03', aspect: 'kinetic', integrity: 90, coherence: 10, grip: 7,
  abilities: [ABILITIES.baton, ABILITIES.caution, ABILITIES['set-brace']],
  reading: 'Not a cast at all — a pattern. The Watch runs three of these and calls them all Bailiff.',
};

const sentinel: RevenantDef = {
  id: 'registry-sentinel', name: 'REGISTRY SENTINEL', castOf: 'UNRESOLVED \x7f serial prefix KH-11',
  serial: 'KH-11-4402', aspect: 'field', integrity: 106, coherence: 14, grip: 8,
  abilities: [ABILITIES.writ, ABILITIES.deny, ABILITIES['seal-order'], ABILITIES['file-away']],
  reading:
    'The cast will not name itself. The serial is not a ship serial. KH is a place, and the ' +
    'place it names was struck off the register six years ago.',
};

export const ENCOUNTERS: Record<string, EncounterDef> = {
  ...ROSTER_ENCOUNTERS,
  'tutorial-spar': {
    id: 'tutorial-spar', title: 'PRACTICE PROJECTION', enemy: secondLoom, opponent: 'cael',
    lossIsFatal: false, canFlee: true,
    intro: 'Cael brings up a training cast. It has no face. It is not supposed to.',
    onWin: (s) => {
      s.setFlag('tutorial-spar', true);
      s.adjustRelation('cael', 10);
    },
    onLose: (s) => s.adjustRelation('cael', 4),
  },
  'ivo-bailiff': {
    id: 'ivo-bailiff', title: 'PETTY IVO \x7f SHIP\'S WATCH', enemy: bailiff, opponent: 'ivo',
    lossIsFatal: false, canFlee: true,
    intro: 'Ivo projects without enthusiasm. He warned you. He wrote it down first.',
    onWin: (s) => {
      s.setFlag('duct-open', true);
      s.suspicion += 25;
      s.adjustRelation('ivo', -25);
      s.adjustFaction('watch', -20);
      s.note('Forced the duct hatch past Petty Ivo.');
    },
    onLose: (s) => {
      s.suspicion += 12;
      s.note('Lost to Ivo at the hatch.');
    },
  },
  'registry-sentinel': {
    id: 'registry-sentinel', title: 'SOMETHING IS STANDING THERE', enemy: sentinel, opponent: '',
    lossIsFatal: false, canFlee: false,
    intro:
      'It is already projected. It has been standing in the dark over the hold, waiting for ' +
      'somebody to be here, for however long somebody has not been.',
    onWin: (s) => {
      s.setFlag('sentinel-beaten', true);
      s.note('Put down the sentinel in duct 9-C.');
    },
    onScan: (s) => {
      s.findClue('tessera-serial');
      s.setFlag('scanned-sentinel', true);
    },
    onLose: (s) => {
      s.setFlag('sentinel-beaten', true);
      s.suspicion += 5;
      s.note('The sentinel put you down in duct 9-C. It did not finish the job.');
    },
  },
};

// =====================================================================
// ENGINE
// =====================================================================

interface Combatant {
  def: RevenantDef;
  integrity: number;
  maxIntegrity: number;
  coherence: number;
  maxCoherence: number;
  statuses: Map<StatusId, number>;
  guard: number;
  /** Set once the player scans it. */
  known: boolean;
  /** Opponent has read this cast: its weaknesses are exposed. */
  analysed: boolean;
  ghost: number;
}

function makeCombatant(def: RevenantDef, known = false): Combatant {
  return {
    def,
    integrity: def.integrity,
    maxIntegrity: def.integrity,
    coherence: def.coherence,
    maxCoherence: def.coherence,
    statuses: new Map(),
    guard: 0,
    known,
    analysed: false,
    ghost: 1,
  };
}

type Phase = 'intro' | 'menu' | 'abilities' | 'resolve' | 'message' | 'done';

export class BattleScene implements Scene {
  readonly id = 'battle';
  readonly hidesWorld = true;

  private enc: EncounterDef;
  private arena: ArenaLook = DEFAULT_ARENA;
  private me!: Combatant;
  private foe!: Combatant;
  private phase: Phase = 'intro';
  private menuIndex = 0;
  private abilityIndex = 0;
  private log: string[] = [];
  private msgQueue: string[] = [];
  private timer = 0;
  private rng = new Rng(Date.now() & 0xffff);
  private result: 'win' | 'lose' | 'flee' | null = null;
  private turn = 0;
  private shakeFx = 0;
  private flashFx = 0;

  constructor(
    encounterId: string,
    private back: Scene,
  ) {
    this.enc = ENCOUNTERS[encounterId] ?? ENCOUNTERS['tutorial-spar'];
    // Seeded off the encounter id so a compartment looks the same every time
    // the player is dragged back into it.
    let seed = 0;
    for (const ch of this.enc.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    this.arena = { ...DEFAULT_ARENA, seed, ...this.enc.arena };
  }

  enter(app: App): void {
    const tid = app.state.activeTessera || app.state.tesserae[0] || 'grey-liner';
    this.me = makeCombatant(TESSERAE[tid] ?? TESSERAE['grey-liner'], true);
    this.foe = makeCombatant(this.enc.enemy, false);
    this.msgQueue = [this.enc.intro];
    this.phase = 'intro';
    audio.setMusic(this.enc.id === 'registry-sentinel' ? 'battleBoss' : 'battle', { fade: 0.6 });
    audio.sfx('battle.start');
    bus.emit('combat:start', { encounterId: this.enc.id });
  }

  // --- rules ------------------------------------------------------------

  private speed(): number {
    return settings.get().combatSpeed;
  }

  private hasStatus(c: Combatant, s: StatusId): boolean {
    return (c.statuses.get(s) ?? 0) > 0;
  }

  /**
   * SEALED locks everything that is not a strike. This has to be answered where
   * abilities are CHOSEN, not where the player's menu is drawn: the check used
   * to live in `update` alone, so sealing an OPPONENT did nothing whatsoever.
   * Every disrupt in the game that inflicts it \x7f STRIKE RECORD, SEAL ORDER,
   * REDACT \x7f was inert against an enemy, which is most of why control
   * measured as competitive with nothing.
   *
   * Sealing is pressure, not a removal of agency. Two kits carry no strike at
   * all (Tallyman is a read plus three disrupts; ADMITTANCE is two disrupts and
   * a guard), so if it would block the whole kit it blocks nothing.
   */
  private sealBlocks(c: Combatant, ab: Ability): boolean {
    if (ab.kind === 'strike' || !this.hasStatus(c, 'sealed')) return false;
    return c.def.abilities.some((a) => a.kind === 'strike');
  }

  private applyStatus(c: Combatant, s: StatusId, turns: number): void {
    c.statuses.set(s, Math.max(c.statuses.get(s) ?? 0, turns));
    audio.sfx('status.apply');
  }

  private tickStatuses(c: Combatant, name: string): void {
    for (const [k, v] of [...c.statuses]) {
      if (v <= 1) c.statuses.delete(k);
      else c.statuses.set(k, v - 1);
    }
    if (this.hasStatus(c, 'frayed')) {
      c.coherence = Math.max(0, c.coherence - 2);
      this.msg(`${name} frays. Coherence slips.`);
    }
    if (c.coherence <= 0) {
      this.applyStatus(c, 'guttering', 2);
    }
    if (this.hasStatus(c, 'guttering')) {
      const d = 4;
      c.integrity = Math.max(0, c.integrity - d);
      this.msg(`${name} is guttering \x7f ${d} integrity lost.`);
    }
  }

  private damage(target: Combatant, source: Combatant, ability: Ability, name: string): void {
    const eff = effectiveness(ability.aspect, target.def.aspect);
    let dmg = ability.power;
    dmg *= eff;
    if (target.guard > 0) dmg *= 1 - target.guard;
    if (this.hasStatus(target, 'bleedover')) {
      dmg *= 1.5;
      target.statuses.delete('bleedover');
    }
    if (this.hasStatus(target, 'guttering')) dmg *= 1.3;
    // A cast you have read is a cast you know where to hit. This is what makes
    // the read abilities worth a turn — measurement showed nobody ever spent
    // one on pure information.
    if (target.analysed) dmg *= 1.3;
    // Anchored used to mean only "cannot withdraw", which is worth nothing in a
    // fight nobody withdraws from. Now it costs the target its footing.
    if (this.hasStatus(source, 'anchored')) dmg *= 0.65;
    dmg = Math.max(1, Math.round(dmg));
    target.ghost = target.integrity / target.maxIntegrity;
    target.integrity = Math.max(0, target.integrity - dmg);
    audio.sfx(`hit.${ability.aspect}` as never);
    this.shakeFx = eff > 1 ? 3 : 2;
    this.flashFx = 0.25;
    const tag = eff > 1 ? ' \x7f it bites deep' : eff < 1 ? ' \x7f it barely takes' : '';
    this.msg(`${name} \x7f ${dmg} integrity${tag}`);
    void source;
  }

  private useAbility(user: Combatant, target: Combatant, ab: Ability, userName: string): void {
    if (user.coherence < ab.cost) {
      this.msg(`${userName} cannot hold the shape. Not enough coherence.`);
      return;
    }
    user.coherence -= ab.cost;

    if (ab.kind === 'read') {
      if (this.hasStatus(user, 'static')) {
        this.msg('Static. The read will not resolve.');
        return;
      }
      target.known = true;
      target.analysed = true;
      audio.sfx('scan');
      this.msg(`READ \x7f ${target.def.name}: ${target.def.reading}`);
      bus.emit('combat:scanned', { revenantId: target.def.id });
      return;
    }

    if (ab.selfBuff) {
      if (ab.selfBuff.guard) user.guard = ab.selfBuff.guard;
      if (ab.selfBuff.coherence) {
        user.coherence = Math.min(user.maxCoherence, user.coherence + ab.selfBuff.coherence);
      }
      if (ab.selfBuff.integrity) {
        const heal = ab.selfBuff.integrity;
        user.integrity = Math.min(user.maxIntegrity, user.integrity + heal);
        audio.sfx('heal');
        this.msg(`${userName} holds itself back together. +${heal} integrity.`);
      }
      if (ab.clears) {
        user.statuses.clear();
        this.msg(`${userName} clears.`);
      }
      if (ab.kind === 'guard') {
        audio.sfx('shield');
        this.msg(`${userName} braces.`);
      }
    }

    if (ab.power > 0) {
      const miss = !ab.sure && this.hasStatus(user, 'static') && this.rng.chance(0.35);
      if (miss) {
        this.msg(`${userName} \x7f the projection slips. Nothing lands.`);
        return;
      }
      this.damage(target, user, ab, `${userName} uses ${ab.name}`);
    }

    if (ab.inflict && target.integrity > 0) {
      for (const inf of ab.inflict) {
        if (!this.rng.chance(inf.chance)) continue;
        this.applyStatus(target, inf.status, inf.turns);
        this.msg(`${target.def.name} is ${STATUS_INFO[inf.status].name}.`);
      }
    }
  }

  /**
   * Enemy decision: a short priority list that reads the board. Not random,
   * not omniscient — it will heal when hurt, brace when it cannot afford a
   * trade, and prefer an aspect that beats what it is looking at.
   */
  private enemyChoose(): Ability {
    const kit = this.foe.def.abilities.filter(
      (a) => this.foe.coherence >= a.cost && !this.sealBlocks(this.foe, a),
    );
    if (!kit.length) return ABILITIES.steady;

    const lowCoherence = this.foe.coherence <= 3;
    const hurt = this.foe.integrity / this.foe.maxIntegrity < 0.35;

    if (lowCoherence) {
      const guard = kit.find((a) => a.kind === 'guard');
      if (guard) return guard;
    }
    if (hurt) {
      const mend = kit.find((a) => a.kind === 'mend');
      if (mend) return mend;
    }
    // if the player is winded, press with control rather than damage
    if (this.me.coherence <= 2) {
      const ctl = kit.find((a) => a.kind === 'control' || a.kind === 'disrupt');
      if (ctl && !this.hasStatus(this.me, 'sealed')) return ctl;
    }
    // otherwise best expected damage against the player's aspect
    const strikes = kit.filter((a) => a.power > 0);
    if (strikes.length) {
      return strikes.reduce((best, a) =>
        a.power * effectiveness(a.aspect, this.me.def.aspect) >
        best.power * effectiveness(best.aspect, this.me.def.aspect)
          ? a
          : best,
      );
    }
    return this.rng.pick(kit);
  }

  private msg(t: string): void {
    this.msgQueue.push(t);
    this.log.push(t);
    if (this.log.length > 40) this.log.shift();
  }

  // --- turn flow --------------------------------------------------------

  private playerAct(app: App, ab: Ability): void {
    this.turn++;
    this.me.guard = 0;
    this.foe.guard = 0;
    const first = this.me.def.grip >= this.foe.def.grip;
    const enemyAb = this.enemyChoose();

    const doMe = () => this.useAbility(this.me, this.foe, ab, this.me.def.name);
    const doFoe = () => {
      if (this.foe.integrity > 0) this.useAbility(this.foe, this.me, enemyAb, this.foe.def.name);
    };

    if (first) {
      doMe();
      if (this.foe.integrity > 0) doFoe();
    } else {
      doFoe();
      if (this.me.integrity > 0) doMe();
    }

    this.tickStatuses(this.me, this.me.def.name);
    this.tickStatuses(this.foe, this.foe.def.name);
    // a little coherence comes back every turn or the fight stalls out
    this.me.coherence = Math.min(this.me.maxCoherence, this.me.coherence + 1);
    this.foe.coherence = Math.min(this.foe.maxCoherence, this.foe.coherence + 1);

    if (this.foe.integrity <= 0) {
      this.msg(`${this.foe.def.name} loses cohesion and comes apart.`);
      this.finish(app, 'win');
    } else if (this.me.integrity <= 0) {
      this.msg(`${this.me.def.name} collapses. The loom cuts out.`);
      this.finish(app, 'lose');
    }
    this.phase = 'message';
  }

  private finish(app: App, r: 'win' | 'lose' | 'flee'): void {
    if (this.result) return;
    this.result = r;
    audio.sfx(r === 'win' ? 'battle.win' : r === 'lose' ? 'battle.lose' : 'ui.back');
    audio.sfx('revenant.collapse');
    const s = app.state;
    if (r === 'win') this.enc.onWin?.(s);
    if (r === 'lose') this.enc.onLose?.(s);
    if (this.foe.known) this.enc.onScan?.(s);
    bus.emit('combat:end', { encounterId: this.enc.id, result: r });
  }


  /** Test-only view of menu state, so the playtest can navigate deterministically
   *  instead of guessing at key counts on a wrapping menu. */
  get debugMenu(): { phase: string; menuIndex: number; abilityIndex: number } {
    return { phase: this.phase, menuIndex: this.menuIndex, abilityIndex: this.abilityIndex };
  }

  // --- headless simulation ----------------------------------------------

  /**
   * Runs a whole battle instantly, with no rendering, audio or timers, using
   * the SAME rule methods the played game uses. A balance simulator that
   * reimplements the rules measures a game that isn't the one shipping — so
   * this drives the real ones and only replaces the player's input.
   *
   * `policy` picks the player's ability each turn from the affordable set.
   * Returns per-battle telemetry for the balance tool.
   */
  simulate(
    policy: (me: Combatant, foe: Combatant, kit: Ability[], rng: Rng) => Ability,
    seed: number,
    maxTurns = 60,
  ): SimResult {
    this.rng = new Rng(seed);
    this.me = makeCombatant(this.simTessera ?? TESSERAE['grey-liner'], true);
    this.foe = makeCombatant(this.enc.enemy, false);
    this.result = null;
    this.turn = 0;
    const used = new Map<string, number>();
    let damageDealt = 0;
    let damageTaken = 0;

    while (!this.result && this.turn < maxTurns) {
      const kit = this.me.def.abilities.filter(
        (a) => this.me.coherence >= a.cost && !this.sealBlocks(this.me, a),
      );
      // Mirrors the played game's STEADY fallback exactly.
      const choices = kit.length ? kit : [ABILITIES.steady];
      const ab = policy(this.me, this.foe, choices, this.rng);
      used.set(ab.id, (used.get(ab.id) ?? 0) + 1);
      const foeBefore = this.foe.integrity;
      const meBefore = this.me.integrity;
      this.simAct(ab);
      damageDealt += Math.max(0, foeBefore - this.foe.integrity);
      damageTaken += Math.max(0, meBefore - this.me.integrity);
    }

    return {
      result: this.result ?? 'timeout',
      turns: this.turn,
      used,
      damageDealt,
      damageTaken,
      meIntegrityLeft: this.me.integrity / this.me.maxIntegrity,
      foeIntegrityLeft: this.foe.integrity / this.foe.maxIntegrity,
      scanned: this.foe.known,
    };
  }

  /** The tessera to simulate with. Only used by the balance tool. */
  simTessera: RevenantDef | null = null;

  /** playerAct without the App dependency (no rewards, no events, no audio). */
  private simAct(ab: Ability): void {
    this.turn++;
    this.me.guard = 0;
    this.foe.guard = 0;
    const first = this.me.def.grip >= this.foe.def.grip;
    const enemyAb = this.enemyChoose();

    const doMe = () => this.useAbility(this.me, this.foe, ab, this.me.def.name);
    const doFoe = () => {
      if (this.foe.integrity > 0) this.useAbility(this.foe, this.me, enemyAb, this.foe.def.name);
    };

    if (first) {
      doMe();
      if (this.foe.integrity > 0) doFoe();
    } else {
      doFoe();
      if (this.me.integrity > 0) doMe();
    }

    this.tickStatuses(this.me, this.me.def.name);
    this.tickStatuses(this.foe, this.foe.def.name);
    this.me.coherence = Math.min(this.me.maxCoherence, this.me.coherence + 1);
    this.foe.coherence = Math.min(this.foe.maxCoherence, this.foe.coherence + 1);

    if (this.foe.integrity <= 0) this.result = 'win';
    else if (this.me.integrity <= 0) this.result = 'lose';
  }

  // --- update -----------------------------------------------------------

  update(app: App, dt: number): void {
    if (this.shakeFx > 0) {
      app.renderer.shake(this.shakeFx, 0.18);
      this.shakeFx = 0;
    }
    if (this.flashFx > 0) this.flashFx = Math.max(0, this.flashFx - dt * 3);
    this.timer += dt * this.speed();

    if (this.phase === 'intro' || this.phase === 'message') {
      if (this.msgQueue.length && (app.input.pressed('confirm') || this.timer > 1.6)) {
        this.msgQueue.shift();
        this.timer = 0;
        audio.sfx('ui.move', { gain: 0.3 });
      }
      if (!this.msgQueue.length) {
        if (this.result) {
          this.phase = 'done';
          this.timer = 0;
        } else {
          this.phase = 'menu';
        }
      }
      return;
    }

    if (this.phase === 'done') {
      if (this.timer > 0.7 && app.input.pressed('confirm')) {
        audio.sfx('ui.select');
        app.pop();
        const def = this.back as unknown as { id: string };
        void def;
        audio.setMusic('explore', { fade: 2 });
      }
      return;
    }

    if (this.phase === 'menu') {
      const items = 4;
      if (app.input.repeated('down')) {
        this.menuIndex = (this.menuIndex + 1) % items;
        audio.sfx('ui.move');
      }
      if (app.input.repeated('up')) {
        this.menuIndex = (this.menuIndex + items - 1) % items;
        audio.sfx('ui.move');
      }
      if (app.input.pressed('confirm')) {
        audio.sfx('ui.select');
        if (this.menuIndex === 0) {
          this.phase = 'abilities';
          this.abilityIndex = 0;
        } else if (this.menuIndex === 1) {
          // READ is always available and always free — investigation must never
          // be gated behind a resource the player can run out of.
          this.foe.known = true;
          audio.sfx('scan');
          this.msg(`READ \x7f ${this.foe.def.name}: ${this.foe.def.reading}`);
          this.msg(`SERIAL ${this.foe.def.serial} \x7f CAST OF ${this.foe.def.castOf}`);
          bus.emit('combat:scanned', { revenantId: this.foe.def.id });
          this.enc.onScan?.(app.state);
          if (this.enc.id === 'registry-sentinel') {
            app.toast('Evidence: CAST SERIAL', '\x09', PAL.amber3);
          }
          this.phase = 'message';
        } else if (this.menuIndex === 2) {
          /**
           * Spending a carried dose costs the turn, exactly as an ability does.
           * A free heal is degenerate \x7f it turns every fight into a war of
           * attrition the player cannot lose while supplies hold.
           *
           * It is routed through playerAct as a real Ability rather than
           * applied directly, so it obeys every rule an ability obeys: the
           * enemy still acts, statuses still tick, and the restore is clamped
           * by useAbility. The alternative was duplicating the turn sequence
           * here, and two copies of the turn order is how they drift apart.
           */
          const held = battleItems(app.state)[0];
          const fx = held ? spendBattleItem(app.state, held.id) : null;
          if (!fx) {
            audio.sfx('ui.error');
            this.msg('Nothing on you to take.');
            this.phase = 'message';
          } else {
            audio.sfx('status.apply');
            this.msg(fx.message);
            this.playerAct(app, {
              id: 'dose',
              name: held!.name,
              kind: 'mend',
              aspect: this.me.def.aspect,
              cost: 0,
              power: 0,
              desc: fx.message,
              selfBuff: { integrity: fx.integrity, coherence: fx.coherence },
            });
          }
        } else {
          if (!this.enc.canFlee || this.hasStatus(this.me, 'anchored')) {
            this.msg(
              this.hasStatus(this.me, 'anchored')
                ? 'Anchored. The projection will not let go.'
                : 'There is nowhere to withdraw to.',
            );
            this.phase = 'message';
          } else {
            this.msg('You cut the projection and step back.');
            this.finish(app, 'flee');
            this.phase = 'message';
          }
        }
      }
      return;
    }

    if (this.phase === 'abilities') {
      const kit = this.me.def.abilities;
      if (app.input.repeated('down')) {
        this.abilityIndex = (this.abilityIndex + 1) % kit.length;
        audio.sfx('ui.move');
      }
      if (app.input.repeated('up')) {
        this.abilityIndex = (this.abilityIndex + kit.length - 1) % kit.length;
        audio.sfx('ui.move');
      }
      if (app.input.pressed('cancel')) {
        audio.sfx('ui.back');
        this.phase = 'menu';
      }
      if (app.input.pressed('confirm')) {
        const ab = kit[this.abilityIndex];
        const blocked = (a: Ability) =>
          a.cost > this.me.coherence || this.sealBlocks(this.me, a);
        if (kit.every(blocked)) {
          this.msg('Nothing will hold. The projection steadies itself.');
          this.playerAct(app, ABILITIES.steady);
          return;
        }
        const sealed = this.sealBlocks(this.me, ab);
        if (ab.cost > this.me.coherence || sealed) {
          audio.sfx('ui.error');
          this.msg(sealed ? 'Sealed. That part of the cast will not answer.' : 'Not enough coherence.');
          this.phase = 'message';
          return;
        }
        audio.sfx('loom.project');
        this.playerAct(app, ab);
      }
    }
  }

  // --- draw -------------------------------------------------------------

  draw(_app: App, p: Painter): void {
    drawArena(p, this.arena, this.timer);
    if (this.flashFx > 0) p.scrim(PAL.bone3, this.flashFx * 0.4);

    // Diagonal layout: each revenant sits opposite its own readout, so the two
    // bodies never collide with each other, with a panel, or with the message
    // box that opens along the bottom.
    this.drawRevenant(p, this.foe, STANCE.foe.x, STANCE.foe.y, false);
    this.drawRevenant(p, this.me, STANCE.me.x, STANCE.me.y, true);
    this.drawCombatant(p, this.foe, 232, 12, false);
    this.drawCombatant(p, this.me, 14, 92, true);

    // message / menu region
    const boxY = VH - 62;
    p.panel(6, boxY, VW - 12, 56, 'dialogue');

    if (this.msgQueue.length) {
      p.textBlock(this.msgQueue[0], 14, boxY + 8, VW - 28, { color: PAL.bone2, maxLines: 4 });
      const blink = Math.sin(this.timer * 6) > 0;
      if (blink) p.text('\x02', VW - 18, boxY + 44, { color: PAL.halo3 });
      return;
    }

    if (this.phase === 'done') {
      const t =
        this.result === 'win' ? 'THE PROJECTION FAILS' :
        this.result === 'lose' ? 'YOUR LOOM CUTS OUT' : 'YOU STEP BACK';
      p.text(t, VW / 2, boxY + 12, { color: PAL.halo3, align: 'center' });
      if (this.result === 'lose' && !this.enc.lossIsFatal) {
        p.textBlock(
          'You come round on the deck a minute later with a headache and your tile intact. ' +
            'Nothing here kills you. It only decides things.',
          14, boxY + 26, VW - 28, { color: PAL.bone0, maxLines: 2 },
        );
      } else if (this.foe.known) {
        p.text(`Cast serial recorded: ${this.foe.def.serial}`, 14, boxY + 28, { color: PAL.amber3 });
      } else {
        p.text('You never read it. Whatever it was, it is gone now.', 14, boxY + 28, {
          color: PAL.iron5,
        });
      }
      p.text('Z', VW - 18, boxY + 44, { color: PAL.halo3 });
      return;
    }

    if (this.phase === 'menu') {
      const dose = battleItems(_app.state)[0];
      const items = ['PROJECT', 'READ', 'DOSE', 'WITHDRAW'];
      const hints = [
        'Use an ability.',
        'Read the cast \x7f free, always available, and how you learn what it is.',
        dose ? `${dose.name} \x7f costs the turn.` : 'Nothing on you to take.',
        this.enc.canFlee ? 'Cut the projection and leave.' : 'Not possible here.',
      ];
      items.forEach((it, i) => {
        const y = boxY + 8 + i * 12;
        const sel = i === this.menuIndex;
        const dead = (i === 2 && !dose) || (i === 3 && !this.enc.canFlee);
        if (sel) p.rect(10, y - 2, 96, 11, mix(PAL.void2, PAL.halo1, 0.4));
        p.text(sel ? '\x05' : ' ', 13, y, { color: PAL.halo3 });
        p.text(it, 22, y, { color: dead ? PAL.iron3 : sel ? PAL.bone3 : PAL.bone0 });
      });
      p.textBlock(hints[this.menuIndex], 114, boxY + 8, VW - 128, {
        color: PAL.iron5,
        maxLines: 4,
      });
      return;
    }

    // ability list
    const kit = this.me.def.abilities;
    kit.forEach((ab, i) => {
      const y = boxY + 6 + i * 11;
      const sel = i === this.abilityIndex;
      const afford = this.me.coherence >= ab.cost;
      const sealed = this.sealBlocks(this.me, ab);
      const col = !afford || sealed ? PAL.iron3 : sel ? PAL.bone3 : PAL.bone0;
      if (sel) p.rect(10, y - 2, 150, 10, mix(PAL.void2, PAL.halo1, 0.4));
      p.text(ab.name, 22, y, { color: col });
      p.text(ASPECT_MARK[ab.aspect], 118, y, {
        color: !afford || sealed ? PAL.iron3 : ASPECT_COLOR[ab.aspect],
      });
      p.text(`${ab.cost}\x08`, 146, y, { color: afford ? PAL.halo2 : PAL.ember2 });
    });
    const ab = kit[this.abilityIndex];
    p.textBlock(ab.desc, 168, boxY + 8, VW - 182, { color: PAL.bone1, maxLines: 3 });
    if (settings.get().combatAssist && this.foe.known) {
      const eff = effectiveness(ab.aspect, this.foe.def.aspect);
      const label = eff > 1 ? 'BITES DEEP' : eff < 1 ? 'BARELY TAKES' : 'EVEN';
      p.text(label, 168, boxY + 42, {
        color: eff > 1 ? PAL.halo3 : eff < 1 ? PAL.ember2 : PAL.iron5,
      });
    } else if (settings.get().combatAssist) {
      p.text('READ IT TO SEE EFFECT', 168, boxY + 42, { color: PAL.iron4 });
    }
    p.text('X back', VW - 44, boxY + 44, { color: PAL.iron4 });
  }

  /**
   * The projected body. Drawn rather than sprited because a revenant is a field
   * effect, not a creature — it should read as something being *held in shape*,
   * which is why the silhouette is open, the interior is stippled, and an
   * unread cast is rendered as unresolved static instead of a person.
   */
  private drawRevenant(p: Painter, c: Combatant, x: number, y: number, mine: boolean): void {
    const alive = c.integrity > 0;
    const known = c.known || mine;
    const col = known ? ASPECT_COLOR[c.def.aspect] : PAL.iron4;
    const dim = mix(col, PAL.void0, 0.55);
    const t = this.timer + (mine ? 0 : 1.7);
    // coherence drives how steady the projection looks — a guttering cast
    // visibly loses its grip before the health bar says anything is wrong
    const grip = c.coherence / c.maxCoherence;
    const jitter = alive ? Math.round(Math.sin(t * 9) * (1 - grip) * 2) : 0;
    const bob = Math.round(Math.sin(t * 2.2) * 1);
    const ox = x + jitter;
    const oy = y + bob;
    const h = BODY_H;
    const w = 26;

    if (!alive) {
      // collapse: a flat seam where the body was
      p.rect(ox - w / 2, oy + h - 4, w, 2, dim);
      p.rect(ox - w / 2 + 4, oy + h - 7, w - 8, 1, dim);
      return;
    }

    // ground seam
    p.alpha(0.5, () => p.rect(ox - w / 2, oy + h - 2, w, 1, col));

    // core column + limbs, open silhouette
    const cx = ox;
    p.rect(cx - 4, oy + 12, 8, 20, dim); // torso fill
    p.rect(cx - 4, oy + 12, 8, 1, col);
    p.rect(cx - 4, oy + 31, 8, 1, col);
    p.rect(cx - 5, oy + 12, 1, 20, col); // sides
    p.rect(cx + 4, oy + 12, 1, 20, col);
    // head: a diamond, not a face — nobody is home
    p.rect(cx - 2, oy + 4, 4, 6, dim);
    p.rect(cx - 3, oy + 5, 1, 4, col);
    p.rect(cx + 2, oy + 5, 1, 4, col);
    p.rect(cx - 2, oy + 3, 4, 1, col);
    p.rect(cx - 2, oy + 10, 4, 1, col);
    // arms
    p.rect(cx - 9, oy + 14, 1, 12, col);
    p.rect(cx + 8, oy + 14, 1, 12, col);
    p.rect(cx - 9, oy + 13, 5, 1, col);
    p.rect(cx + 4, oy + 13, 5, 1, col);
    // legs
    p.rect(cx - 4, oy + 32, 1, 12, col);
    p.rect(cx + 3, oy + 32, 1, 12, col);
    p.rect(cx - 5, oy + 43, 3, 1, col);
    p.rect(cx + 2, oy + 43, 3, 1, col);

    // interior stipple: scan bands that drift, so it never looks like a decal
    p.alpha(0.5, () => {
      for (let i = 0; i < 20; i += 3) {
        const yy = oy + 12 + ((i + Math.floor(t * 10)) % 20);
        p.rect(cx - 4, yy, 8, 1, col);
      }
    });

    if (!known) {
      // unresolved: static across the whole body
      p.alpha(0.65, () => {
        for (let i = 0; i < 26; i++) {
          const rx = cx - 9 + ((i * 7 + Math.floor(t * 23)) % 19);
          const ry = oy + 3 + ((i * 13 + Math.floor(t * 31)) % 41);
          p.rect(rx, ry, 1, 1, PAL.bone1);
        }
      });
    }

    // status marks float beside the body
    let sy = oy + 2;
    for (const [s] of c.statuses) {
      p.text(STATUS_INFO[s].name.slice(0, 3), cx + 12, sy, { color: PAL.ember3 });
      sy += 8;
    }
  }

  private drawCombatant(p: Painter, c: Combatant, x: number, y: number, mine: boolean): void {
    const w = 130;
    p.panel(x, y, w, 44, 'terminal');
    const name = c.known || mine ? c.def.name : '\x7f\x7f\x7f UNREAD \x7f\x7f\x7f';
    p.text(name, x + 6, y + 5, { color: mine ? PAL.halo3 : PAL.bone3 });
    if (c.known || mine) {
      p.text(ASPECT_MARK[c.def.aspect], x + w - 6, y + 5, {
        color: ASPECT_COLOR[c.def.aspect],
        align: 'right',
      });
    }
    p.text('INT', x + 6, y + 16, { color: PAL.iron5 });
    p.meter(x + 26, y + 17, 92, 4, c.integrity / c.maxIntegrity, { ghost: c.ghost });
    p.text('COH', x + 6, y + 25, { color: PAL.iron5 });
    for (let i = 0; i < c.maxCoherence; i++) {
      const on = i < c.coherence;
      p.rect(x + 26 + i * 6, y + 26, 4, 4, on ? PAL.halo3 : PAL.iron1);
    }
    // statuses as words, never colour alone
    let sx = x + 6;
    for (const [s] of c.statuses) {
      const label = STATUS_INFO[s].name.slice(0, 5);
      p.text(label, sx, y + 34, { color: PAL.ember3 });
      sx += label.length * 6 + 4;
    }
    if (!c.known && !mine && c.statuses.size === 0) {
      p.text('READ to identify', x + 6, y + 34, { color: PAL.iron4 });
    }
  }
}
