/**
 * Deck D — Medical.
 *
 * The deck Chapter One points at. Bone and brine: the highest-value floors in
 * the game, sterile and cold, deliberately the opposite of Deck C's worn
 * habitation warmth.
 *
 * The design problem here is that the horror on this deck is bureaucratic. A
 * gory medbay would be the wrong game. Triage is staffed, ordinary and mildly
 * bored; the ward is quiet because there are almost no patients for a crew of
 * 212; and Annex 3 is a small clean room with one machine running. Nothing is
 * splashed on a wall. A form has been signed by the wrong hand, and that is
 * worse.
 */

import { AMBIENT, RoomDef } from '@/world/map';
import { NpcDef } from '@/data/npcs';
import { Clue } from '@/data/content';
import { GameState } from '@/game/state';
import { PAL } from '@/art/palette';
import { ActorLook } from '@/art/actors';

const MED = ['floor.med.a', 'floor.med.b'];
const PLATE = ['floor.plate.a', 'floor.plate.b', 'floor.plate.c'];

// =====================================================================
// D-LIFT — the arrival room. Its whole job is to orient.
// =====================================================================
const dLift: RoomDef = {
  id: 'd-lift',
  name: 'LIFT LANDING \x7f MEDICAL',
  deck: 'D',
  department: 'medical',
  ambient: AMBIENT.cool,
  ambience: 'medical',
  landmark: 'A landing painted bone white, with a red cross stencil worn down to the primer.',
  wall: 'med',
  floor: PLATE,
  layout: [
    '####################',
    '####################',
    '##G##############G##',
    '#..................#',
    '#..L...............#',
    '#..f...........S...#',
    '#..................#',
    '#........N.........#',
    '#..................#',
    '#........DD........#',
    '####################',
  ],
  marks: {
    L: {
      prop: 'prop.lift.panel',
      solid: true,
      interact: 'lift-panel',
      light: { r: 20, color: PAL.halo3, i: 0.3 },
    },
    f: { spawn: 'default' },
    S: { prop: 'prop.sign.dept', solid: true, interact: 'd-signage' },
    N: { prop: 'prop.bench', solid: true },
    D: { door: { to: 'd-triage', spawn: 'from-lift' }, spawn: 'from-triage' },
    G: { prop: 'prop.light.ceiling', light: { r: 54, color: PAL.bone3, i: 0.5 } },
  },
};

// =====================================================================
// D-TRIAGE — staffed, ordinary, and the reason the deck reads as normal.
// =====================================================================
const dTriage: RoomDef = {
  id: 'd-triage',
  name: 'TRIAGE \x7f MEDICAL',
  deck: 'D',
  department: 'medical',
  ambient: AMBIENT.sterile,
  ambience: 'medical',
  landmark: 'Four beds under a light that never dims, and a duty desk with a cold kettle on it.',
  wall: 'med',
  floor: MED,
  layout: [
    '##########################',
    '##########################',
    '##G#########G##########G##',
    '#........................#',
    '#.mmmm.......A......ccc..#',
    '#........................#',
    '#.BBBB..............T....#',
    '#........................#',
    '#.BBBB.........1.........#',
    '#........................#',
    '#....k....$......W.......#',
    '#........................#',
    '#...UU..............VV...#',
    '##########################',
  ],
  marks: {
    B: { prop: 'prop.medbed', solid: true, interact: 'triage-bed' },
    m: { prop: 'prop.counter.m', solid: true },
    c: { prop: 'prop.medcart', solid: true, interact: 'med-supply' },
    T: { prop: 'prop.terminal', solid: true, interact: 'cradle-log-terminal', light: { r: 22, color: PAL.halo3, i: 0.35 } },
    '1': { prop: 'prop.console.a', solid: true, interact: 'consent-file', light: { r: 20, color: PAL.halo2, i: 0.3 } },
    k: { prop: 'prop.table', solid: true },
    $: { spawn: 'default' },
    A: { npc: 'ashkar' },
    W: { npc: 'corrow' },
    U: { door: { to: 'd-lift', spawn: 'from-triage' }, spawn: 'from-lift' },
    V: { door: { to: 'd-ward', spawn: 'from-triage' }, spawn: 'from-ward' },
    G: { prop: 'prop.light.ceiling', light: { r: 60, color: PAL.bone3, i: 0.62 } },
  },
};

// =====================================================================
// D-WARD — the emptiness is the content.
// =====================================================================
const dWard: RoomDef = {
  id: 'd-ward',
  name: 'RECOVERY WARD \x7f MEDICAL',
  deck: 'D',
  department: 'medical',
  ambient: AMBIENT.dim,
  ambience: 'medical',
  landmark: 'Fourteen made beds and one that is not. A monitor tone every three seconds.',
  wall: 'med',
  floor: MED,
  layout: [
    '########################',
    '########################',
    '##G##############G######',
    '#......................#',
    '#.B.B.B.B....B.B.B.B...#',
    '#......................#',
    '#......................#',
    '#.B.B.B.B....B.B.B.B...#',
    '#......................#',
    '#.........p....$.......#',
    '#....UU..........AA....#',
    '########################',
  ],
  marks: {
    B: { prop: 'prop.medbed', solid: true, interact: 'ward-bed' },
    p: { prop: 'prop.plant.a', solid: true, interact: 'ward-plant' },
    $: { spawn: 'default' },
    U: { door: { to: 'd-triage', spawn: 'from-ward' }, spawn: 'from-triage' },
    A: {
      door: {
        to: 'd-annex3',
        spawn: 'default',
        locked: 'medical',
        refuse: 'ANNEX 3 \x7f RESTRICTED. The lock reads your tessera and declines. It does not tone twice.',
      },
      spawn: 'from-annex',
    },
    G: { prop: 'prop.light.ceiling', light: { r: 50, color: PAL.bone2, i: 0.42 } },
  },
};

// =====================================================================
// D-ANNEX3 — small, clean, one machine running. Composed so the cradle is
// the only thing the eye can land on.
// =====================================================================
const dAnnex: RoomDef = {
  id: 'd-annex3',
  name: 'MEDICAL ANNEX 3',
  deck: 'D',
  department: 'medical',
  ambient: AMBIENT.gloom,
  ambience: 'medical',
  landmark: 'One cradle, running. The only violet light on the ship.',
  wall: 'med',
  floor: MED,
  layout: [
    '################',
    '################',
    '#..............#',
    '#..............#',
    '#.....CC.......#',
    '#.....CC...T...#',
    '#..............#',
    '#......$.......#',
    '#......DD......#',
    '################',
  ],
  marks: {
    // The one sanctioned use of the bruise/violet accent in the whole game.
    C: {
      prop: 'prop.cradle',
      solid: true,
      interact: 'the-cradle',
      light: { r: 40, color: PAL.bruise3, i: 0.5, flicker: 0.12 },
    },
    T: { prop: 'prop.terminal', solid: true, interact: 'annex-terminal', light: { r: 20, color: PAL.halo2, i: 0.3 } },
    $: { spawn: 'default' },
    D: { door: { to: 'd-ward', spawn: 'from-annex' } },
  },
};

export const ROOMS_D: Record<string, RoomDef> = {
  'd-lift': dLift,
  'd-triage': dTriage,
  'd-ward': dWard,
  'd-annex3': dAnnex,
};

// =====================================================================
// Clues
// =====================================================================
export const CLUES_D: Record<string, Clue> = {
  'cradle-log': {
    id: 'cradle-log',
    title: 'ANNEX 3 CRADLE LOG',
    // Literal readout. The player supplies the horror.
    text:
      'ANNEX 3 \x7f CRADLE 1 \x7f STATUS: RUNNING.\n' +
      'PATIENT: [field left blank]\n' +
      'PROCEDURE: SMOOTHING, ELECTIVE.\n' +
      'DEPTH: 4 DAYS. ELAPSED: 61%.\n' +
      'SUPERVISING: ASHKAR, N.',
    source: 'Duty terminal, Triage',
    kind: 'record',
  },
  'consent-form': {
    id: 'consent-form',
    title: 'SMOOTHING CONSENT',
    text:
      'ELECTIVE SMOOTHING \x7f CONSENT.\n' +
      '"I ask for the removal of the period described above."\n' +
      'Signed: H. QUILL.\n' +
      'The Q is closed at the top. Every tally Hessa ever chalked on the duct ' +
      'boards has an open Q. She writes it in one stroke and never closes it.',
    source: 'Consent file, Triage',
    kind: 'record',
  },
};

// =====================================================================
// NPCs
// =====================================================================
const look = (o: Partial<ActorLook>): ActorLook => ({
  frame: 'average',
  skin: 3,
  hair: 'crop',
  hairColor: PAL.rust1,
  eyeColor: PAL.brine3,
  uniform: 'medical',
  accent: PAL.brine3,
  accessory: 'none',
  ...o,
});

const knows = (s: GameState, id: string) => s.foundClues().includes(id);

/**
 * Dr Nomi Ashkar. She is not a villain and must never read as one. She is
 * helpful, tired, and a fraction too quick to reassure. Under pressure she
 * retreats into procedure — which is exactly how a decent person keeps
 * participating in something without ever looking at it.
 *
 * Knowledge boundary: she does NOT know about Kest Harbour, does NOT know the
 * cargo, and does NOT know she smoothed the player. She believes consent is
 * real because she has never had a reason to check a signature.
 */
const ashkar: NpcDef = {
  id: 'ashkar',
  name: 'DR. ASHKAR',
  role: 'Ship physician',
  look: look({ hair: 'bob', hairColor: PAL.bone0, skin: 2, accessory: 'glasses', frame: 'slight' }),
  schedule: ['d-triage', 'd-triage', 'd-triage', 'd-ward', 'd-triage', 'd-triage'],
  post: {
    'd-triage': [13, 4],
    'd-ward': [11, 6],
  },
  dialogue: {
    entry: (s) => {
      if (s.has('accused-ashkar')) return 'after';
      if (knows(s, 'consent-form') && knows(s, 'cradle-log')) return 'evidence';
      if (s.has('asked-ashkar-hessa')) return 'again';
      return 'first';
    },
    nodes: {
      first: {
        id: 'first',
        speaker: 'ashkar',
        expr: 'neutral',
        text: 'Third watch. You are either hurt, lost, or avoiding someone. Which is it?',
        choices: [
          {
            text: "I'm looking for Hessa Quill.",
            tone: 'honest',
            to: 'hessa',
            do: (s) => s.setFlag('asked-ashkar-hessa', true),
          },
          {
            text: 'What do you keep in Annex 3?',
            tone: 'press',
            to: 'annex',
          },
          { text: 'Avoiding someone.', tone: 'wry', to: 'wry' },
        ],
      },
      wry: {
        id: 'wry',
        speaker: 'ashkar',
        expr: 'wry',
        text: 'Then sit down and look unwell. It works on most people.',
        choices: [
          { text: "I'm looking for Hessa Quill.", tone: 'honest', to: 'hessa',
            do: (s) => s.setFlag('asked-ashkar-hessa', true) },
          { text: 'Another time.', tone: 'neutral', to: 'bye' },
        ],
      },
      hessa: {
        id: 'hessa',
        speaker: 'ashkar',
        expr: 'concerned',
        text:
          'Quill. Spinehand. She has not been through here — I would remember, ' +
          'she argues about everything. Have you tried the muster terminal? ' +
          'People transfer and forget to tell their shift.',
        choices: [
          {
            text: 'The record says she transferred. Her boots are still in her locker.',
            tone: 'honest',
            to: 'boots',
            if: (s) => knows(s, 'hessa-locker'),
            hint: 'You would need something that contradicts the record.',
          },
          { text: 'What do you keep in Annex 3?', tone: 'press', to: 'annex' },
          { text: 'Thanks.', tone: 'neutral', to: 'bye' },
        ],
      },
      boots: {
        id: 'boots',
        speaker: 'ashkar',
        expr: 'concerned',
        text:
          'That is... yes. That is a strange thing to leave.\n' +
          'I do not have her on any list. I would tell you if I did. Look — I ' +
          'sign what comes to me signed. That is the whole of my job, most weeks.',
        choices: [
          {
            text: 'Who signs the things that come to you?',
            tone: 'technical',
            to: 'whosigns',
          },
          { text: 'What do you keep in Annex 3?', tone: 'press', to: 'annex' },
        ],
      },
      whosigns: {
        id: 'whosigns',
        speaker: 'ashkar',
        expr: 'neutral',
        text:
          'Registry files it, the Watch witnesses it, I perform it. Three hands, ' +
          'so no one hand is doing anything.\n' +
          'That is how it is meant to work.',
        choices: [{ text: '...', tone: 'silent', to: 'annex' }],
      },
      annex: {
        id: 'annex',
        speaker: 'ashkar',
        expr: 'neutral',
        text:
          'Annex 3 is a procedure room. It is booked out this rotation, so it is ' +
          'closed. Nothing is happening in there that is not on a form.',
        choices: [
          {
            text: "I'm medical. Let me in.",
            tone: 'technical',
            to: 'letin',
            if: (s) => s.profile.background === 'medical',
            hint: 'You are not medical staff.',
          },
          {
            text: 'Booked out by whom?',
            tone: 'press',
            to: 'bywhom',
          },
          { text: 'All right.', tone: 'neutral', to: 'bye' },
        ],
      },
      letin: {
        id: 'letin',
        speaker: 'ashkar',
        expr: 'neutral',
        text:
          'You are on the roster, so — yes. Do not touch the cradle while it is ' +
          'running, and do not read the patient field. That is not squeamishness, ' +
          'it is the rule.',
        onEnter: (s) => {
          s.grantClearance('medical');
          s.setFlag('knows-annex', true);
        },
        choices: [{ text: 'Understood.', tone: 'neutral', to: 'bye' }],
      },
      bywhom: {
        id: 'bywhom',
        speaker: 'ashkar',
        expr: 'concerned',
        text:
          'Registry booked it. They do not have to say for whom. I did ask, once, ' +
          'about a different booking. I was told the question was not mine.',
        onEnter: (s) => s.setFlag('knows-annex', true),
        choices: [{ text: 'And you left it there.', tone: 'accuse', to: 'leftit' }],
      },
      leftit: {
        id: 'leftit',
        speaker: 'ashkar',
        expr: 'sad',
        text: 'I left it there. Yes.',
        choices: [{ text: '...', tone: 'silent', to: 'bye' }],
      },
      again: {
        id: 'again',
        speaker: 'ashkar',
        expr: 'neutral',
        text: 'Still no Quill. I have looked twice now, which is twice more than I was asked to.',
        choices: [
          { text: 'What do you keep in Annex 3?', tone: 'press', to: 'annex' },
          { text: 'Nothing. Thanks.', tone: 'neutral', to: 'bye' },
        ],
      },
      evidence: {
        id: 'evidence',
        speaker: 'ashkar',
        expr: 'concerned',
        text: 'You have that look people get before they say something I cannot un-hear.',
        choices: [
          {
            text: 'The consent in Annex 3 is not signed in her hand.',
            tone: 'accuse',
            to: 'accuse',
            once: true,
          },
          { text: 'Nothing. Not yet.', tone: 'silent', to: 'bye' },
        ],
      },
      accuse: {
        id: 'accuse',
        speaker: 'ashkar',
        expr: 'surprised',
        text:
          'Say that again.\n' +
          '...The Q. You are telling me about the shape of a letter.',
        choices: [
          { text: 'She writes it open. Every time. That is not her signature.', tone: 'accuse', to: 'breaks' },
        ],
      },
      breaks: {
        id: 'breaks',
        speaker: 'ashkar',
        expr: 'sad',
        text:
          'I sign what comes to me signed.\n' +
          'I have said that sentence out loud twice tonight and it was a smaller ' +
          'sentence the first time.\n' +
          'Go. Before I decide to be sensible about this.',
        onEnter: (s, c) => {
          s.setFlag('accused-ashkar', true);
          s.grantClearance('medical');
          s.adjustRelation('ashkar', 2);
          c.toast('Dr. Ashkar has stopped defending the paperwork.', 'good');
        },
        choices: [{ text: 'Go.', tone: 'neutral', to: 'bye' }],
      },
      after: {
        id: 'after',
        speaker: 'ashkar',
        expr: 'sad',
        text:
          'I pulled the file. The booking is Registry-side and I cannot close it ' +
          'from here. But I have stopped the depth advancing. That is four days ' +
          'she gets to keep, if anyone reaches her.',
        choices: [{ text: 'Thank you.', tone: 'gentle', to: 'bye' }],
      },
      bye: { id: 'bye', speaker: 'ashkar', expr: 'neutral', text: 'Mind the step.', end: true },
    },
  },
};

/** Wen Corrow — minor, rotating lines, resents the paperwork more than the ethics. */
const corrow: NpcDef = {
  id: 'corrow',
  name: 'MEDTECH CORROW',
  role: 'Medical technician',
  look: look({ hair: 'shaved', skin: 4, uniform: 'medical', accent: PAL.moss3, frame: 'broad' }),
  schedule: ['d-triage', 'd-ward', 'd-triage', 'd-triage', 'd-ward', 'd-triage'],
  post: { 'd-triage': [17, 10], 'd-ward': [6, 6] },
  dialogue: {
    entry: (s) => (s.has('knows-annex') ? 'annexTalk' : 'idle'),
    nodes: {
      idle: {
        id: 'idle',
        speaker: 'corrow',
        expr: 'neutral',
        text: (s) => {
          const lines = [
            'Fourteen made beds and two occupied. Two hundred and twelve awake on this hull. Either we are the healthiest crew in the service or nobody is telling me something.',
            'Do not sit on a made bed. I made it.',
            'Annex 3 has been booked out eleven days. Eleven. You could set a bone in eleven days and let it knit.',
          ];
          return lines[Math.floor(s.timeBlock % lines.length)];
        },
        choices: [
          { text: 'Booked out for what?', tone: 'press', to: 'annexTalk' },
          { text: 'Sorry about the bed.', tone: 'wry', to: 'bye' },
        ],
      },
      annexTalk: {
        id: 'annexTalk',
        speaker: 'corrow',
        expr: 'concerned',
        text:
          'They do not tell me. I get the consumables list, and the consumables ' +
          'list says a cradle is running. You do not run a cradle for eleven days ' +
          'on nobody.',
        onEnter: (s) => s.setFlag('knows-annex', true),
        choices: [{ text: 'Who booked it?', tone: 'technical', to: 'who' }],
      },
      who: {
        id: 'who',
        speaker: 'corrow',
        expr: 'neutral',
        text: 'Registry. It is always Registry. They book, we scrub.',
        choices: [{ text: 'Thanks.', tone: 'neutral', to: 'bye' }],
      },
      bye: { id: 'bye', speaker: 'corrow', expr: 'neutral', text: 'Mind the wet floor.', end: true },
    },
  },
};

export const NPCS_D: Record<string, NpcDef> = { ashkar, corrow };
