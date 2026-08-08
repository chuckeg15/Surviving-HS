/**
 * Chapter One content: backgrounds, clues, deductions, interactables.
 *
 * Fairness rule enforced here rather than hoped for: every deduction lists
 * MULTIPLE alternative clue sets, and no single clue unlocks a conclusion.
 * See MYSTERY_STRUCTURE.md and docs/CANON.md §6.
 */

import { CLUES_D } from "@/data/deck-d";
import { CLUES_B } from "@/data/deck-b";
import { CLUES_E } from "@/data/deck-e";
import { CLUES_A, DEDUCTIONS_A, INTERACTABLES_A } from "@/data/deck-a";
import { GameState, BackgroundId, RelationLevel, relationAtLeast } from '@/game/state';
import { ActorLook } from '@/art/actors';
import { PAL } from '@/art/palette';

// =====================================================================
// BACKGROUNDS
// =====================================================================

export interface Background {
  id: BackgroundId;
  name: string;
  post: string;
  blurb: string;
  /** What this actually changes, shown verbatim at character creation. */
  effects: string[];
  uniform: ActorLook['uniform'];
  accent: string;
  clearances: string[];
  items: string[];
  tessera: string;
  startRoom: string;
  /** Relationship head-start with specific crew. */
  relations: Record<string, number>;
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'maintenance',
    name: 'SPINEHAND',
    post: 'Duct and gasket work, third watch',
    blurb:
      'You crawl the spine so nobody else has to. Hessa Quill was your shift partner. ' +
      'You are the only person aboard who will notice a duct that has been opened twice.',
    effects: [
      'Carries a duct key \x7f the restricted hatch opens for you',
      'Reads wear and tool marks others walk past',
      'Starts closest to Hessa \x7f Stray already half-trusts you',
    ],
    uniform: 'spinehand',
    accent: PAL.amber2,
    clearances: ['duct-key'],
    items: ['duct-key', 'gasket-tape'],
    tessera: 'grey-liner',
    startRoom: 'c-bunk',
    relations: { stray: 18, cael: 8, trave: -4 },
  },
  {
    id: 'medical',
    name: 'TRIAGE AIDE',
    post: 'Medical, floating rotation',
    blurb:
      'You take blood pressures and you file the forms. You have signed things you did not read, ' +
      'which is the ship in one sentence.',
    effects: [
      'Can forge a hazard-quarantine tag from Medical supply',
      'Recognises a smoothing cradle and what its depth setting means',
      'Dr. Ashkar answers you \x7f Trave does not',
    ],
    uniform: 'medical',
    accent: PAL.brine3,
    clearances: ['medical-annex'],
    items: ['blank-hazard-tag', 'analgesic'],
    tessera: 'lampwright',
    startRoom: 'c-bunk',
    relations: { ashkar: 20, fen: 6, trave: -2 },
  },
  {
    id: 'registry',
    name: 'TALLY CLERK',
    post: 'Registry, manifest reconciliation',
    blurb:
      'You reconcile numbers that are not supposed to reconcile. It has never once been ' +
      'interesting. Until this watch.',
    effects: [
      'Registry terminals open for you \x7f checksums are legible',
      'Can read the trim solution against the declared manifest',
      'Your own personnel file is reachable \x7f which is a mistake somebody made',
    ],
    uniform: 'registry',
    accent: PAL.brine4,
    clearances: ['registry-terminal'],
    items: ['tally-slate'],
    tessera: 'tallyman',
    startRoom: 'c-bunk',
    relations: { sabbat: 12, stray: -6, cael: 4 },
  },
  {
    id: 'watch',
    name: 'WATCH DEPUTY',
    post: "Ship's Watch, deck patrol",
    blurb:
      'You are the law on a ship where the law is a service contract. Warden Trave signed ' +
      'your posting himself, and has not looked you in the eye since third watch began.',
    effects: [
      'The Watch office is yours \x7f you may walk in',
      'Petty Ivo defers to you at the duct hatch',
      'Everyone else is careful around you \x7f Stray will not open up easily',
    ],
    uniform: 'watch',
    accent: PAL.ember2,
    clearances: ['watch-office', 'duct-pass'],
    items: ['watch-baton', 'incident-slate'],
    tessera: 'truncheon',
    startRoom: 'c-bunk',
    relations: { trave: 22, ivo: 15, stray: -18, fen: -6 },
  },
  {
    id: 'loom',
    name: 'SECOND LOOM',
    post: 'Engineering, projector maintenance',
    blurb:
      'You keep the looms fed and the breakers honest. You know exactly what the ship weighs, ' +
      'because you are the one who trims her.',
    effects: [
      'Can kill the hatch tell-tale from the Commons breaker panel',
      'Understands the trim discrepancy without needing it explained',
      'Cael Oduya is your oppo and will tell you things he should not',
    ],
    uniform: 'loom',
    accent: PAL.amber3,
    clearances: ['engineering-panel'],
    items: ['breaker-key', 'loom-spanner'],
    tessera: 'kiln',
    startRoom: 'c-bunk',
    relations: { cael: 25, stray: 6, ivo: -4 },
  },
];

export function backgroundById(id: BackgroundId): Background {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}

// =====================================================================
// CLUES
// =====================================================================

export interface Clue {
  id: string;
  title: string;
  /** What the evidence literally says. Never an interpretation. */
  text: string;
  source: string;
  /** Grouping for the evidence board columns. */
  kind: 'record' | 'physical' | 'testimony' | 'reading';
}

export const CLUES: Record<string, Clue> = {
  ...CLUES_D,
  ...CLUES_B,
  ...CLUES_E,
  ...CLUES_A,
  'transfer-record': {
    id: 'transfer-record',
    title: 'TRANSFER RECORD',
    text:
      'QUILL, HESSA \x7f spinehand, third watch.\nVOLUNTARY TRANSFER, Deck E, filed 03:10.\n' +
      'Authorising officer: ONWE-V.\nNo handover signature. No berth reassignment.',
    source: 'Muster terminal, Deck C',
    kind: 'record',
  },
  'hessa-locker': {
    id: 'hessa-locker',
    title: "QUILL'S LOCKER",
    text:
      'Her boots are racked. Her cold liner is folded on top of them.\n' +
      'Nobody transfers to Deck E without boots. Deck E is four degrees.',
    source: 'Berth 14',
    kind: 'physical',
  },
  'stray-testimony': {
    id: 'stray-testimony',
    title: "STRAY'S ACCOUNT",
    text:
      'Bosun Stray: Hessa came to her at 02:50, out of breath, holding a photo-slate.\n' +
      'She said: "the keel\'s the wrong weight." Stray told her to go to bed.',
    source: 'Bosun Anneke Stray',
    kind: 'testimony',
  },
  'mass-manifest': {
    id: 'mass-manifest',
    title: 'TRIM DISCREPANCY',
    text:
      'DECLARED CARGO: relay keel, 4,410 t.\n' +
      'TRIM SOLUTION IMPLIES: 6,120 t.\n' +
      'Difference: 1,710 t, distributed low and forward. The ship is flying heavy ' +
      'and the manifest does not know it.',
    source: 'Commons trim readout',
    kind: 'reading',
  },
  'duct-scuff': {
    id: 'duct-scuff',
    title: 'DRAG MARKS',
    text:
      'Fresh scuffing on the mesh, running toward the hatch \x7f two parallel lines, ' +
      'heel width apart.\nA torn glove-liner caught on a bracket. Spinehand grey.',
    source: 'Spine duct 9-C',
    kind: 'physical',
  },
  'trave-flask': {
    id: 'trave-flask',
    title: 'SHELVING ORDER STUB',
    text:
      'A torn order stub in the Warden\'s bin.\n"...SHELVE PENDING REVIEW \x7f subject to be ' +
      'held incommunicado..." The rest is torn away. The Warden\'s hands shake.',
    source: "Ship's Watch office",
    kind: 'record',
  },
  'captain-watchlog': {
    id: 'captain-watchlog',
    title: "MASTER'S WATCH LOG",
    text:
      'ONWE, V. \x7f sealed conference, Vestibule annex, 02:40 to 04:00.\n' +
      'Conference seals lock terminal access for the duration. She could not have ' +
      'filed anything at 03:10.',
    source: 'Commons bulletin board',
    kind: 'record',
  },
  'registry-checksum': {
    id: 'registry-checksum',
    title: 'RECORD CHECKSUM',
    text:
      'The transfer record carries a trailing checksum in Registry class.\n' +
      'A Command authorisation writes no checksum at all. Whoever filed this was ' +
      'sitting at a Registry terminal and using someone else\'s name.',
    source: 'Muster terminal, cross-read',
    kind: 'reading',
  },
  'tessera-serial': {
    id: 'tessera-serial',
    title: 'CAST SERIAL',
    text:
      'The sentinel\'s cast carries a serial prefix: KH-11-4402.\n' +
      'KH is not a ship prefix. It is a place prefix. Kest Harbour was declared ' +
      'lost with all hands six years ago.',
    source: 'Scanned in the duct',
    kind: 'reading',
  },
  'onwe-grudge': {
    id: 'onwe-grudge',
    title: 'GALLEY TALK',
    text:
      'Fen says the Master had Hessa written up twice this rotation \x7f once for a duct ' +
      'she opened without filing, once for talking back at muster.\n' +
      '"Everyone heard about it. Everyone."',
    source: 'Fen Bellweather',
    kind: 'testimony',
  },
  'cold-registry': {
    id: 'cold-registry',
    title: 'THE HOLD BELOW',
    text:
      'Through the mesh: racking, floor to overhead, and it is not cargo. It is tiles.\n' +
      'Ceramic, palm-sized, in numbered trays. Tens of thousands of them. ' +
      'The hold is refrigerated. There is no such hold on the manifest.',
    source: 'Spine duct 9-C, overlook',
    kind: 'physical',
  },
  'personnel-annex': {
    id: 'personnel-annex',
    title: 'YOUR OWN FILE',
    text:
      'Your personnel record has an annex you have never seen. Vestibule seal, dated 2229.\n' +
      'Six years before you signed anything. The annex will not open. ' +
      'The index line reads: SCHEMA SUBJECT \x7f RETAIN LIVING.',
    source: 'Registry terminal',
    kind: 'record',
  },
};

// =====================================================================
// DEDUCTIONS
// =====================================================================

export interface Deduction {
  id: string;
  claim: string;
  /** Any ONE of these sets proves it. Every set has at least two clues. */
  requires: string[][];
  /** Written into the journal when reached. */
  conclusion: string;
  /** True for the fair red herring. */
  false?: boolean;
}

export const DEDUCTIONS: Record<string, Deduction> = {
  ...DEDUCTIONS_A,
  D5: {
    id: 'D5',
    claim: 'Hessa is in Medical Annex 3.',
    requires: [
      ['cradle-log', 'consent-form'],
      ['cradle-log', 'trave-flask'],
    ],
    conclusion:
      'A cradle booked by Registry, a patient field left blank, and a consent signed in a hand that closes its Q. She is four days deep and sixty-one per cent gone.',
  },
  D1: {
    id: 'D1',
    claim: 'Hessa never transferred.',
    requires: [
      ['transfer-record', 'hessa-locker'],
      ['transfer-record', 'stray-testimony'],
    ],
    conclusion:
      'The record says she walked to Deck E at 03:10. Her boots say she did not walk anywhere.',
  },
  D2: {
    id: 'D2',
    claim: 'The cargo is not what the manifest says.',
    requires: [
      ['mass-manifest', 'stray-testimony'],
      ['mass-manifest', 'duct-scuff'],
      ['mass-manifest', 'cold-registry'],
    ],
    conclusion:
      'Seventeen hundred tonnes the ship is carrying and the paperwork has never heard of.',
  },
  D3: {
    id: 'D3',
    claim: 'Hessa was taken, not lost.',
    requires: [
      ['duct-scuff', 'hessa-locker', 'trave-flask'],
      ['duct-scuff', 'hessa-locker', 'stray-testimony'],
    ],
    conclusion:
      'Two heel-lines in the dust and a torn liner in her own uniform grey. Somebody dragged her.',
  },
  D4: {
    id: 'D4',
    claim: 'The record was forged from Registry, not Command.',
    requires: [['captain-watchlog', 'registry-checksum']],
    conclusion:
      'The Master was sealed in a conference she could not file from, and the record carries a ' +
      'Registry checksum. Her name is on it. Her hands are not.',
  },
  D6: {
    id: 'D6',
    claim: 'The ship is carrying cast human minds.',
    requires: [
      ['tessera-serial', 'cold-registry'],
      ['tessera-serial', 'mass-manifest'],
    ],
    conclusion:
      'A refrigerated hold full of tesserae, serialised to a town that officially drowned. ' +
      'The relay keel is a story told to the trim computer.',
  },
  DX: {
    id: 'DX',
    claim: 'The Master did this.',
    requires: [['transfer-record', 'onwe-grudge']],
    conclusion:
      'Her authorisation is on the record and she had every reason. It fits. ' +
      'It fits so well that nobody has checked whether she could have done it.',
    false: true,
  },
};

/** Which deductions the current evidence supports. */
export function availableDeductions(s: GameState): Deduction[] {
  const out: Deduction[] = [];
  for (const d of Object.values(DEDUCTIONS)) {
    if (s.hasDeduction(d.id)) continue;
    if (d.requires.some((set) => set.every((c) => s.hasClue(c)))) out.push(d);
  }
  return out;
}

/** The pair of clues that justifies a deduction, for the linking UI. */
export function satisfiedSet(d: Deduction, s: GameState): string[] | null {
  return d.requires.find((set) => set.every((c) => s.hasClue(c))) ?? null;
}

/**
 * D4 is the disproof of the red herring. Reaching it retires DX rather than
 * leaving the player holding two contradictory conclusions with no signal.
 */
export function reconcile(s: GameState): void {
  if (s.hasDeduction('D4') && s.hasDeduction('DX')) {
    s.deductions.delete('DX');
    s.setFlag('dx-retired', true);
  }
}

// =====================================================================
// INTERACTABLES
// =====================================================================

export interface InteractResult {
  /** Lines shown in the examine box. */
  lines: string[];
  clue?: string;
  flag?: string;
  battle?: string;
  /** Fired instead of showing lines. */
  dialogue?: string;
  sound?: string;
}

export interface InteractDef {
  id: string;
  label: string;
  run: (s: GameState) => InteractResult;
}

const has = (s: GameState, c: string) => clearancesOf(s).includes(c);

export const INTERACTABLES: Record<string, InteractDef> = {
  ...INTERACTABLES_A,
  // --- encounter triggers ------------------------------------------------
  // Content that exists but nothing can reach is content that does not exist.
  // Each of these is the ONLY way its encounter is entered.
  'annex-lock': {
    id: 'annex-lock',
    label: 'Annex lock',
    run: (s) => {
      if (has(s, 'medical')) {
        return { lines: ['The lock reads your tessera and opens. It does not care why you are here.'] };
      }
      if (s.has('beat-admittance')) {
        return { lines: ['The lock hangs open. Whatever was minding it is not minding it any more.'] };
      }
      return {
        lines: [
          'You put your hand on the lock without the clearance to.',
          'Something unfolds out of the doorframe \x7f a projection with a clerk\'s posture and no face to speak of.',
        ],
        battle: 'annex-admittance',
      };
    },
  },
  'gantry-minder-trigger': {
    id: 'gantry-minder-trigger',
    label: 'Gantry housing',
    run: (s) => {
      if (s.has('beat-minder')) {
        return { lines: ['The housing is quiet. The maintenance cast has not reprojected.'] };
      }
      return {
        lines: [
          'The gantry housing wakes as you pass and projects what is in it, because that is what it is for.',
          'It has been running maintenance in an empty reactor hall for fourteen months.',
        ],
        battle: 'gantry-minder',
      };
    },
  },
  // --- Deck B -----------------------------------------------------------
  'b-signage': {
    id: 'b-signage',
    label: 'Deck signage',
    run: () => ({
      lines: [
        'DECK B \x7f REGISTRY \x7f BUREAU OF DEEP REGISTRY \x7f COMPUTER CORE (NO ADMITTANCE).',
        'Below it, printed small: RECORDS ARE THE SHIP. Somebody has not scratched it out, which says something about the deck.',
      ],
    }),
  },
  'registry-desk': {
    id: 'registry-desk',
    label: 'Registry desk',
    run: () => ({
      lines: [
        'A clerk desk, asleep. It wakes far enough to show a queue of reconciliations and nothing else.',
        'The desks only show what they were told to show.',
      ],
    }),
  },
  'registry-audit': {
    id: 'registry-audit',
    label: 'Audit terminal',
    run: (s) => {
      if (!s.hasClue('transfer-record')) {
        return {
          lines: [
            'The audit terminal wants a record identifier. You do not have one to give it.',
          ],
        };
      }
      s.findClue('registry-checksum');
      return {
        lines: [
          'You give it the transfer identifier. It returns the integrity block without being asked \x7f auditing is what it is for.',
          'The checksum class is not the one a Command terminal can write.',
        ],
        clue: 'registry-checksum',
      };
    },
  },
  'personnel-terminal': {
    id: 'personnel-terminal',
    label: 'Personnel terminal',
    run: (s) => {
      s.findClue('personnel-annex');
      return {
        lines: [
          'Personnel. It offers you your own file first, the way these things do.',
        ],
        clue: 'personnel-annex',
      };
    },
  },
  'the-stacks': {
    id: 'the-stacks',
    label: 'Tessera rack',
    run: (s) => {
      // Deliberately the same text whether or not the player has worked out
      // what these are. The room does not change. The player does.
      const lines = [
        'Ceramic tile, racked edge-on, thousands to a bay. Each one is warm, very slightly, which means each one is running.',
        'They are indexed by a serial and nothing else. No names anywhere in the room.',
      ];
      if (s.hasDeduction('D6') || s.hasClue('tessera-serial')) {
        lines.push('You know what a cast serial looks like now. You are standing in a room with ninety thousand people in it.');
      }
      return { lines };
    },
  },
  'stacks-index': {
    id: 'stacks-index',
    label: 'Index console',
    run: (s) => {
      if (!s.hasClue('tessera-serial')) {
        return { lines: ['A dead index console. It asks for a serial prefix. You do not have one.'] };
      }
      s.setFlag('checked-kh-prefix', true);
      return {
        lines: [
          'You give it the prefix you read off the sentinel: KH-11.',
          'MATCHES: 91,400. RANGE: KH-00001 THROUGH KH-91400. CONTIGUOUS.',
          'Contiguous. Not collected over years from hospitals and accidents. Taken all at once, in order.',
        ],
        flag: 'knows-ledger-size',
      };
    },
  },
  'rask-log': {
    id: 'rask-log',
    label: "Rask's log",
    run: (s) => {
      if (!s.has('rask-confirmed-mass')) {
        return { lines: ['A research log, open, in a hand that does not abbreviate. You should ask him before reading it.'] };
      }
      return {
        lines: [
          'Four entries, four weeks running, each one a variation on the same sentence:',
          '"Trim solution again inconsistent with declared keel mass. Difference 1,710 t. Reported. No response."',
          'The fourth ends: "I will keep writing these down."',
        ],
      };
    },
  },
  'rask-shelves': {
    id: 'rask-shelves',
    label: 'Shelves',
    run: () => ({
      lines: [
        'Reference spines, a broken loom projector, and a mug with a Vestibule crest worn half off.',
        'Nothing here is sealed. It is the only unsealed room on the deck.',
      ],
    }),
  },

  // --- Deck D -----------------------------------------------------------
  'd-signage': {
    id: 'd-signage',
    label: 'Deck signage',
    run: () => ({
      lines: [
        'DECK D \x7f MEDICAL. TRIAGE \x7f WARD \x7f ANNEX 1-3 \x7f HYDROPONICS (SEALED).',
        'Someone has scratched a tally beside ANNEX 3 and stopped at eleven.',
      ],
    }),
  },
  'triage-bed': {
    id: 'triage-bed',
    label: 'Triage bed',
    run: () => ({ lines: ['Made, and cold. The paper on it has not been changed because it has not been used.'] }),
  },
  'ward-bed': {
    id: 'ward-bed',
    label: 'Ward bed',
    run: () => ({
      lines: [
        'Made with the corners folded the way the service teaches and nobody keeps up.',
        'Fourteen of these. Two hundred and twelve people awake on this hull.',
      ],
    }),
  },
  'ward-plant': {
    id: 'ward-plant',
    label: 'Planter',
    run: () => ({
      lines: [
        'A hydroponics offcut in a steel pot, kept alive past its purpose.',
        'The label says BEZHI. Someone in the galley is watering it on their own time.',
      ],
    }),
  },
  'med-supply': {
    id: 'med-supply',
    label: 'Supply cart',
    run: (s) => {
      if (has(s, 'medical') && !s.hasItem('hazard-tag')) {
        s.addItem('hazard-tag');
        return {
          lines: [
            'Consumables, sealed. A pad of hazard-quarantine tags sits on top, unnumbered.',
            'You take one. Nobody counts these.',
          ],
          toast: 'Hazard tag taken',
        };
      }
      return { lines: ['Consumables, sealed. The seal is Registry-side and you are not.'] };
    },
  },
  'cradle-log-terminal': {
    id: 'cradle-log-terminal',
    label: 'Duty terminal',
    run: (s) => {
      s.setFlag('knows-annex', true);
      s.findClue('cradle-log');
      return {
        lines: [
          'The duty terminal wakes without asking who you are. Medical never locks the duty screen; there is never anyone else on the deck.',
          'One procedure is running.',
        ],
        clue: 'cradle-log',
      };
    },
  },
  'consent-file': {
    id: 'consent-file',
    label: 'Consent file',
    run: (s) => {
      if (!s.hasClue('cradle-log')) {
        return { lines: ['A drawer of signed consents, filed by date. Hundreds. You would need to know which one to pull.'] };
      }
      s.findClue('consent-form');
      return {
        lines: [
          'You pull the consent that matches the running procedure.',
          'It is signed H. QUILL. You have watched her chalk that name on a duct board a hundred times.',
        ],
        clue: 'consent-form',
      };
    },
  },
  'annex-terminal': {
    id: 'annex-terminal',
    label: 'Annex terminal',
    run: (s) => {
      s.findClue('cradle-log');
      return {
        lines: [
          'ANNEX 3 \x7f CRADLE 1. DEPTH 4 DAYS. ELAPSED 61%.',
          'BOOKED: REGISTRY. AUTHORITY FIELD: [not displayed at this terminal].',
        ],
        clue: 'cradle-log',
      };
    },
  },
  'the-cradle': {
    id: 'the-cradle',
    label: 'Smoothing cradle',
    run: (s) => {
      s.setFlag('saw-hessa', true);
      s.note('Found Hessa Quill in a smoothing cradle in Medical Annex 3.');
      return {
        lines: [
          'The cradle is running. Under the hood the light is violet and completely steady.',
          'Hessa Quill is in it. Her hands are folded the way a technician folds them, which means somebody folded them.',
          'She is breathing. The counter above her says 61%.',
          'There is no alarm. Nothing here is an emergency. Everything here is on a form.',
        ],
        flag: 'found-hessa',
      };
    },
  },

  'lift-panel': {
    id: 'lift-panel',
    label: 'Lift panel',
    // Opens the stop picker. The panel itself says nothing useful, on purpose:
    // what the player learns is which decks are listed and which are sealed.
    run: () => ({ lines: [], flag: 'open-lift' }),
  },
  'player-bunk': {
    id: 'player-bunk',
    label: 'Your bunk',
    // Ending the watch here is the chapter's decision point. It only offers
    // itself once the player has something to decide WITH; before that it is
    // just a bunk, and saying "you have nothing yet" is a better prompt than
    // an empty menu.
    run: (s) => {
      const ready = s.deductions.size > 0 || s.foundClues().length >= 4;
      if (!ready) {
        return {
          lines: [
            'Your bunk. The blanket is still turned back from when the muster tone woke you.',
            'Above it, someone before you scratched a tally into the paint and stopped at nineteen.',
            'You could lie down. You would only stare at it.',
          ],
        };
      }
      return {
        lines: [
          'Your bunk. Third watch ends at 08:00 whether you have finished or not.',
          'You could end it here \x7f decide what to do with what you have.',
        ],
        flag: 'open-chapter-decision',
      };
    },
  },
  'berth-notice': {
    id: 'berth-notice',
    label: 'Berth notice',
    run: () => ({
      lines: [
        'BERTH 14 \x7f THIRD WATCH ROSTER',
        'QUILL, H. \x7f spinehand \x7f duct rotation',
        'The line under hers has been wiped and not rewritten. The adhesive is still tacky.',
      ],
    }),
  },
  'hessa-locker': {
    id: 'hessa-locker',
    label: "Hessa's locker",
    run: (s) => ({
      lines: [
        "Hessa's locker hangs open. It always did; the latch was on her list.",
        'Her boots are racked. Her cold liner is folded on top of them.',
        s.profile.background === 'maintenance'
          ? 'You have worked Deck E with her. Four degrees, standing water. Nobody goes down there in deck shoes.'
          : 'Deck E runs cold. Cold enough that boots are not optional.',
      ],
      clue: 'hessa-locker',
    }),
  },
  'muster-terminal': {
    id: 'muster-terminal',
    label: 'Muster terminal',
    run: (s) => {
      const lines = [
        'THIRD WATCH \x7f MUSTER \x7f DECK C',
        'The roster resolves. One line is greyed.',
        'QUILL, HESSA \x7f VOLUNTARY TRANSFER, DECK E, 03:10 \x7f AUTH ONWE-V',
      ];
      if (s.hasClue('captain-watchlog') && has(s, 'registry-terminal')) {
        lines.push(
          'You pull the record apart the way you pull apart a bad reconciliation.',
          'There is a checksum on the tail of it. Registry class. Command does not write one.',
        );
        return { lines, clue: 'registry-checksum' };
      }
      if (s.hasClue('captain-watchlog')) {
        lines.push(
          'Something about the tail of the record is wrong, and you do not have the training to say what.',
          'A Registry clerk would read it in a second.',
        );
      }
      return { lines, clue: 'transfer-record' };
    },
  },
  'trim-readout': {
    id: 'trim-readout',
    label: 'Trim readout',
    run: (s) => {
      const lines = [
        'A cargo trim panel nobody in the Commons has ever looked at twice.',
        'DECLARED: 4,410 t \x7f relay keel, secured.',
        'TRIM SOLUTION: 6,120 t \x7f distributed low, forward of frame 60.',
      ];
      if (s.profile.background === 'loom' || s.profile.background === 'registry') {
        lines.push(
          'You trim this ship. You know what she weighs the way you know your own hands.',
          'Seventeen hundred tonnes are riding in a hold that is not on the manifest.',
        );
      } else {
        lines.push('The two numbers do not agree, and one of them is what the ship actually is.');
      }
      return { lines, clue: 'mass-manifest' };
    },
  },
  'commons-bulletin': {
    id: 'commons-bulletin',
    label: 'Commons bulletin',
    run: () => ({
      lines: [
        'Watch rotations, a hydroponics swap, a lost glove.',
        "And the master's movements, posted daily because regulation says so and nobody reads it.",
        'ONWE, V. \x7f SEALED CONFERENCE, VESTIBULE ANNEX \x7f 02:40 TO 04:00.',
        'A sealed conference locks terminal access. For eighty minutes she could not file a form.',
      ],
      clue: 'captain-watchlog',
    }),
  },
  'duct-hatch': {
    id: 'duct-hatch',
    label: 'Duct hatch 9-C',
    run: (s) => {
      if (s.has('duct-open')) {
        return { lines: ['The hatch stands open. Cold air comes up out of it.'], flag: 'enter-duct' };
      }
      if (has(s, 'duct-key')) {
        return {
          lines: [
            'RESTRICTED \x7f SPINE ACCESS \x7f WATCH AUTHORISATION REQUIRED',
            'You have carried the key to this hatch for two years. It has never once been restricted before.',
            'The lock takes it anyway.',
          ],
          flag: 'duct-open',
        };
      }
      if (has(s, 'duct-pass')) {
        return {
          lines: [
            'RESTRICTED \x7f SPINE ACCESS \x7f WATCH AUTHORISATION REQUIRED',
            'You are the Watch. You authorise it yourself and the hatch reads your tessera without comment.',
          ],
          flag: 'duct-open',
        };
      }
      if (s.has('telltale-killed')) {
        return {
          lines: [
            'The hatch tell-tale is dark. With the breaker pulled, the lock is just a lock.',
            'It takes some persuading. It does not take long.',
          ],
          flag: 'duct-open',
        };
      }
      if (s.has('hazard-tag-placed')) {
        return {
          lines: [
            'Your forged quarantine tag hangs off the wheel. The tell-tale has flipped itself amber.',
            'A quarantined duct is a duct the Watch will not enter, and a lock that releases for medical.',
          ],
          flag: 'duct-open',
        };
      }
      if (s.has('ivo-distracted')) {
        return {
          lines: [
            'Ivo is forty metres away with his back to you, being told a very long story.',
            'You have about ninety seconds and the wheel is not actually locked. It never was. It was just watched.',
          ],
          flag: 'duct-open',
        };
      }
      if (s.hasItem('trave-key')) {
        return {
          lines: [
            "The Warden's key is cold in your palm and you are very aware of holding it.",
            'The hatch opens.',
          ],
          flag: 'duct-open',
        };
      }
      // The seventh route from CANON section 6: force it. Deliberately gated
      // behind having been refused once, so nobody stumbles into the loudest
      // option in the chapter by mashing confirm at a locked door.
      if (s.has('refused-duct')) {
        s.suspicion += 20;
        return {
          lines: [
            'You put both hands on the wheel and turn it against the lock.',
            'The tell-tale goes from live to screaming. Petty Ivo is round the corner in four seconds, ' +
              'and he does not draw anything, because he does not have to.',
            'His loom is already lit.',
          ],
          battle: 'ivo-escalation',
        };
      }
      s.setFlag('refused-duct', true);
      return {
        lines: [
          'RESTRICTED \x7f SPINE ACCESS \x7f WATCH AUTHORISATION REQUIRED',
          'The wheel is locked and the tell-tale is live. Somebody would know within the minute.',
          'There will be a way. There is always a way, and on this ship there are usually several.',
          'You could also simply turn the wheel and let somebody know.',
        ],
      };
    },
  },
  'duct-scuff': {
    id: 'duct-scuff',
    label: 'Marks on the mesh',
    run: (s) => ({
      lines: [
        'The dust on the mesh is disturbed in two parallel lines, heel width apart, running to the hatch.',
        'A torn glove-liner is caught on a bracket. Spinehand grey.',
        s.profile.background === 'maintenance'
          ? 'You have torn a hundred liners on that exact bracket. She was pulled past it backwards.'
          : 'Whoever it came off was not walking.',
      ],
      clue: 'duct-scuff',
    }),
  },
  'duct-valve': {
    id: 'duct-valve',
    label: 'Regasket valve',
    run: () => ({
      lines: [
        'A valve collar, half regasketed. The old gasket is coiled beside it, still warm-set.',
        'Somebody stopped in the middle of the job. Nobody stops in the middle of a gasket.',
      ],
    }),
  },
  'registry-overlook': {
    id: 'registry-overlook',
    label: 'Overlook',
    run: () => ({
      lines: [
        'The mesh opens over a hold, and the cold comes up at you like a hand.',
        'Racking, floor to overhead. Not crates. Trays.',
        'Ceramic tiles, palm-sized, numbered, in their tens of thousands.',
        'There is no such hold on this ship. You have read the manifest. Everyone has read the manifest.',
      ],
      clue: 'cold-registry',
    }),
  },
  'sentinel-post': {
    id: 'sentinel-post',
    label: 'Something is standing there',
    run: (s) => {
      if (s.has('sentinel-beaten')) {
        return {
          lines: [
            'The place where the sentinel stood. The air still has a seam in it, healing slowly.',
          ],
        };
      }
      return { battle: 'registry-sentinel', lines: [] };
    },
  },
  'watch-terminal': {
    id: 'watch-terminal',
    label: 'Watch terminal',
    run: (s) => {
      if (s.profile.background === 'watch' || s.has('trave-broken')) {
        return {
          lines: [
            'WATCH LOG \x7f THIRD WATCH',
            '03:04 \x7f DECK C \x7f INCIDENT \x7f SUBJECT DETAINED \x7f entry closed by C. TRAVE',
            'The incident number is there. The incident is not. Somebody closed it without writing it.',
          ],
          flag: 'saw-watch-log',
        };
      }
      return {
        lines: [
          'The Warden\'s terminal. It wants a tessera you do not have.',
          'The screen holds one line before it locks: 03:04 \x7f INCIDENT \x7f CLOSED.',
        ],
      };
    },
  },
  'trave-bin': {
    id: 'trave-bin',
    label: "Warden's bin",
    run: (s) => {
      const level: RelationLevel = s.relationLevel('trave');
      if (!relationAtLeast(level, 'professional') && s.profile.background !== 'watch') {
        return {
          lines: [
            'You reach for the bin and the Warden clears his throat without looking up.',
            '"That is Watch property, crewman."',
          ],
        };
      }
      return {
        lines: [
          'Paper, which nobody uses any more except the Watch, who are required to.',
          'A torn order stub: "...SHELVE PENDING REVIEW \x7f subject to be held incommunicado..."',
          'The rest is gone. Under it, a flask, and it is empty at four in the morning.',
        ],
        clue: 'trave-flask',
      };
    },
  },
  'watch-keyrack': {
    id: 'watch-keyrack',
    label: 'Key rack',
    run: (s) => {
      if (s.hasItem('trave-key')) {
        return { lines: ['The gap on the rack where the duct key used to hang.'] };
      }
      if (s.has('trave-distracted')) {
        return {
          lines: [
            'His back is turned. The duct key is second from the left, on a loop of orange cord.',
            'You take it. Your hand is steadier than you expected, and that bothers you more than the theft.',
          ],
          flag: 'took-trave-key',
        };
      }
      return {
        lines: [
          'A rack of keys, each on coloured cord. The duct key is second from the left.',
          'The Warden is four metres away and facing you.',
        ],
      };
    },
  },
};

/** Clearances the player currently holds, from background plus story grants. */
export function clearancesOf(s: GameState): string[] {
  const base = backgroundById(s.profile.background).clearances;
  const granted = (s.flag('granted-clearances') as string) ?? '';
  return granted ? [...base, ...granted.split(',')] : base;
}
