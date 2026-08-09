/**
 * Deck B — Registry and Vestibule.
 *
 * Brine: cold blue, precise, gridded, humming. Deck B is where people are
 * turned into records, and the floor is laid out to say so — a deliberate grid
 * rather than the worn irregularity of habitation.
 *
 * The stacks are the room the whole game is quietly about. To a player who has
 * not yet worked out what a tessera is, it is a storeroom of ceramic tiles on
 * racks. To a player who has, it is a room full of people. Nothing in the room
 * changes between those two readings; only the player does. That double
 * reading is the entire design of the space, which is why it contains no
 * shock, no body, and no music cue.
 *
 * Access design: the lift accepts anyone, but the Registry floor itself is
 * clearance-gated. Rask will vouch for you. Without that alternate route,
 * four of the five backgrounds could never reach C8 and deduction D4 would be
 * unreachable for them — which would leave the red herring undisprovable and
 * break the fairness rule in MYSTERY_STRUCTURE.md.
 */

import { AMBIENT, RoomDef } from '@/world/map';
import { NpcDef } from '@/data/npcs';
import { Clue } from '@/data/content';
import { GameState } from '@/game/state';
import { PAL } from '@/art/palette';
import { ActorLook } from '@/art/actors';

const REG = ['floor.registry.a', 'floor.registry.b'];
const PLATE = ['floor.plate.a', 'floor.plate.b', 'floor.plate.c'];

// =====================================================================
const bLift: RoomDef = {
  id: 'b-lift',
  name: 'LIFT LANDING \x7f REGISTRY',
  deck: 'B',
  department: 'registry',
  ambient: AMBIENT.cool,
  ambience: 'registry',
  landmark: 'A landing where the air is four degrees colder than the deck above, and drier.',
  wall: 'reg',
  floor: PLATE,
  layout: [
    '####################',
    '####################',
    '##G##############G##',
    '#..................#',
    '#..L......$........#',
    '#..f...........S...#',
    '#..................#',
    '#..RR.........VV...#',
    '####################',
  ],
  marks: {
    L: {
      prop: 'lift.panel',
      solid: true,
      interact: 'lift-panel',
      light: { r: 20, color: PAL.halo3, i: 0.3 },
    },
    f: { spawn: 'default' },
    $: { spawn: 'from-registry' },
    S: { prop: 'prop.sign.dept', solid: true, interact: 'b-signage' },
    R: {
      door: {
        to: 'b-registry',
        spawn: 'from-lift',
        locked: 'registry',
        refuse:
          'REGISTRY FLOOR \x7f CREDENTIALLED ACCESS. The lock does not tone. It simply does not open, ' +
          'which is somehow worse.',
      },
      spawn: 'from-registry-door',
    },
    V: { door: { to: 'b-vestibule', spawn: 'from-lift' }, spawn: 'from-vestibule' },
    G: { prop: 'prop.light.ceiling', light: { r: 52, color: PAL.brine4, i: 0.45 } },
  },
};

// =====================================================================
const bRegistry: RoomDef = {
  id: 'b-registry',
  name: 'REGISTRY FLOOR',
  deck: 'B',
  department: 'registry',
  ambient: AMBIENT.cool,
  ambience: 'registry',
  landmark: 'Eleven identical terminals in a grid, ten of them asleep, all of them facing the same way.',
  wall: 'reg',
  floor: REG,
  layout: [
    '##############################',
    '##############################',
    '##G###########G###########G###',
    '#............................#',
    '#..T..T..T..T.....I..........#',
    '#............................#',
    '#..T..T..T..T.......P........#',
    '#............................#',
    '#..T..T..T....$....M.........#',
    '#............................#',
    '#....UU.................SS...#',
    '##############################',
  ],
  marks: {
    T: {
      prop: 'prop.console.a',
      solid: true,
      interact: 'registry-desk',
      light: { r: 16, color: PAL.brine4, i: 0.2 },
    },
    I: {
      prop: 'prop.terminal',
      solid: true,
      interact: 'registry-audit',
      light: { r: 24, color: PAL.halo3, i: 0.4 },
    },
    P: {
      prop: 'prop.terminal.b',
      solid: true,
      interact: 'personnel-terminal',
      light: { r: 24, color: PAL.halo2, i: 0.35 },
    },
    M: { npc: 'sabbat' },
    $: { spawn: 'default' },
    U: { door: { to: 'b-lift', spawn: 'from-registry-door' }, spawn: 'from-lift' },
    S: { door: { to: 'b-stacks', spawn: 'from-registry' }, spawn: 'from-stacks' },
    G: { prop: 'prop.light.ceiling', light: { r: 56, color: PAL.brine4, i: 0.5 } },
  },
};

// =====================================================================
const bStacks: RoomDef = {
  id: 'b-stacks',
  name: 'THE STACKS \x7f COLD REGISTRY',
  deck: 'B',
  department: 'registry',
  ambient: AMBIENT.gloom,
  ambience: 'registry',
  landmark: 'Racks of ceramic tile from deck to deckhead, each one catching the light the same way.',
  wall: 'reg',
  floor: REG,
  layout: [
    '########################',
    '########################',
    '##G##################G##',
    '#......................#',
    '#.KKKK...KKKK...KKKK...#',
    '#......................#',
    '#.KKKK...KKKK...KKKK...#',
    '#......................#',
    '#.KKKK...KKKK...KK.....#',
    '#..........$......A....#',
    '#........UU............#',
    '########################',
  ],
  marks: {
    // Halo means live lattice. These tiles are running, very slowly, all the
    // time — which is the only thing in the room that hints at what they are.
    K: {
      prop: 'prop.crate.tessera',
      solid: true,
      interact: 'the-stacks',
      light: { r: 14, color: PAL.halo2, i: 0.16 },
    },
    A: { prop: 'prop.console.dead', solid: true, interact: 'stacks-index' },
    $: { spawn: 'default' },
    U: { door: { to: 'b-registry', spawn: 'from-stacks' }, spawn: 'from-registry' },
    G: { prop: 'prop.light.ceiling', light: { r: 44, color: PAL.brine3, i: 0.34 } },
  },
};

// =====================================================================
const bVestibule: RoomDef = {
  id: 'b-vestibule',
  name: 'VESTIBULE OFFICE',
  deck: 'B',
  department: 'vestibule',
  ambient: AMBIENT.warm,
  ambience: 'registry',
  landmark: 'The only cluttered room on the deck. Paper. Actual paper, in a stack, weighted with a spanner.',
  wall: 'reg',
  floor: PLATE,
  layout: [
    '######################',
    '######################',
    '##G###############G###',
    '#....................#',
    '#..cccc.....R........#',
    '#..........tt........#',
    '#..L.......tt....pp..#',
    '#..........$.........#',
    '#.....UU.............#',
    '######################',
  ],
  marks: {
    c: { prop: 'prop.locker.tall', solid: true, interact: 'rask-shelves' },
    t: { prop: 'prop.table', solid: true, interact: 'rask-log' },
    L: { prop: 'prop.crate.b', solid: true },
    p: { prop: 'prop.plant.b', solid: true },
    R: { npc: 'rask' },
    $: { spawn: 'default' },
    U: { door: { to: 'b-lift', spawn: 'from-vestibule' }, spawn: 'from-lift' },
    G: { prop: 'prop.light.ceiling', light: { r: 50, color: PAL.amber3, i: 0.4 } },
  },
};

export const ROOMS_B: Record<string, RoomDef> = {
  'b-lift': bLift,
  'b-registry': bRegistry,
  'b-stacks': bStacks,
  'b-vestibule': bVestibule,
};

// =====================================================================
// Clues
// =====================================================================
export const CLUES_B: Record<string, Clue> = {
  'registry-checksum': {
    id: 'registry-checksum',
    title: 'RECORD CHECKSUM',
    // Precise and checkable: this is one of the two clues that disproves D-X.
    text:
      'TRANSFER 0310-QUILL \x7f INTEGRITY BLOCK.\n' +
      'CHECKSUM CLASS: R-2 (REGISTRY).\n' +
      'A Command-class authorisation writes a C-1 block. It cannot write R-2; ' +
      'the field is not addressable from a Command terminal.\n' +
      'Whatever hand filed this, it was sitting on this deck.',
    source: 'Audit terminal, Registry floor',
    kind: 'record',
  },
  'personnel-annex': {
    id: 'personnel-annex',
    title: 'YOUR PERSONNEL FILE',
    text:
      'Your file. Postings, inoculations, next of kin: none listed.\n' +
      'At the bottom, an entry you have never seen:\n' +
      'ANNEX 2229/VESTIBULE \x7f SEALED. NOT VIEWABLE AT THIS TERMINAL.\n' +
      'You were nineteen in 2229. You have no idea what the Vestibule wanted with you.',
    source: 'Personnel terminal, Registry floor',
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
  uniform: 'registry',
  accent: PAL.brine3,
  accessory: 'none',
  ...o,
});

const knows = (s: GameState, id: string) => s.foundClues().includes(id);

/**
 * Registrar Ilm Sabbat. The most dangerous person aboard, and they never once
 * raise their voice.
 *
 * The writing rule: if a reader can tell from one conversation that Sabbat is
 * the antagonist, the character is wrong. Everything they say is true, helpful,
 * and correct procedure. Every helpful act narrows the player's options. They
 * say "we" meaning the Board. They deliver appalling things in the register of
 * a scheduling change, and they never threaten, gloat, or explain themselves.
 */
const sabbat: NpcDef = {
  id: 'sabbat',
  name: 'REGISTRAR SABBAT',
  role: 'Continuance Board liaison',
  look: look({
    uniform: 'board',
    hair: 'shaved',
    skin: 1,
    accent: PAL.bone2,
    accessory: 'earpiece',
    frame: 'slight',
  }),
  schedule: [
    'b-registry', 'b-registry', 'b-registry', 'b-stacks',
    'b-registry', 'b-registry', 'b-registry', 'b-stacks',
    'b-registry', 'b-registry', 'b-stacks', 'b-registry',
  ],
  post: { 'b-registry': [19, 8], 'b-stacks': [12, 5] },
  dialogue: {
    entry: (s) => {
      if (s.has('filed-with-sabbat')) return 'after';
      if (knows(s, 'registry-checksum')) return 'checksum';
      return 'first';
    },
    nodes: {
      first: {
        id: 'first',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'You are off your deck. That is not a reprimand — I keep the roster, so I ' +
          'simply know. Is there something the Registry can do for you?',
        choices: [
          { text: 'Hessa Quill. Her transfer.', tone: 'honest', to: 'quill' },
          { text: 'What is stored in the stacks?', tone: 'press', to: 'stacks' },
          { text: 'Nothing. I took a wrong turn.', tone: 'lie', to: 'wrongturn' },
        ],
      },
      wrongturn: {
        id: 'wrongturn',
        speaker: 'sabbat',
        expr: 'neutral',
        text: 'Of course. The lift is behind you. We will note that you found it.',
        end: true,
      },
      stacks: {
        id: 'stacks',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'Archive. Post-mortem casts, in transit to a facility that will hold them ' +
          'properly. It is not secret, it is only dull, which people mistake for the ' +
          'same thing.',
        choices: [
          {
            text: 'Ninety thousand of them, contiguous.',
            tone: 'accuse',
            to: 'contiguous',
            if: (s) => s.has('knows-ledger-size'),
            hint: 'You would need to have counted them.',
          },
          { text: 'Whose casts?', tone: 'press', to: 'whose' },
          { text: 'Hessa Quill. Her transfer.', tone: 'honest', to: 'quill' },
        ],
      },
      whose: {
        id: 'whose',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'People who died, and whose next of kin elected registry over interment. ' +
          'It is a common election. It is cheaper, and it is not nothing.',
        choices: [{ text: '...', tone: 'silent', to: 'end' }],
      },
      contiguous: {
        id: 'contiguous',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'Yes.\n' +
          'You are working towards a question and I would rather you asked it than ' +
          'circled it. But not tonight, and not on this deck, where the terminal ' +
          'behind you logs which files I have open while I speak to you.',
        onEnter: (s) => s.setFlag('sabbat-deflected-ledger', true),
        choices: [{ text: '...', tone: 'silent', to: 'end' }],
      },
      quill: {
        id: 'quill',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'Filed and closed. A voluntary movement to Deck E at 03:10, on the Master\x27s ' +
          'authority. I can print it for you, if you would find that settling.',
        choices: [
          {
            text: 'The Master was in a sealed conference at 03:10.',
            tone: 'accuse',
            to: 'sealed',
            if: (s) => knows(s, 'captain-watchlog'),
            hint: 'You would need to know where the Master actually was.',
          },
          { text: 'Print it.', tone: 'neutral', to: 'print' },
          { text: 'Who can file on her authority?', tone: 'technical', to: 'whocanfile' },
        ],
      },
      print: {
        id: 'print',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'There. Keep it. People are steadier holding a document than being told ' +
          'about one — that is not cynicism, it is just true.',
        onEnter: (s) => s.setFlag('sabbat-printed', true),
        end: true,
      },
      whocanfile: {
        id: 'whocanfile',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'Command authority is delegable. That is the whole point of it. If it ' +
          'required the Master\x27s hands, the ship would stop every time she slept.',
        choices: [{ text: 'Delegable to whom?', tone: 'press', to: 'delegable' }],
      },
      delegable: {
        id: 'delegable',
        speaker: 'sabbat',
        expr: 'neutral',
        text: 'To whomever the Board has satisfied itself is careful. I am on that list.',
        choices: [{ text: '...', tone: 'silent', to: 'end' }],
      },
      sealed: {
        id: 'sealed',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'She was. I chaired it.\n' +
          'You are about to ask how a record carries her authority while she is in a ' +
          'room with me and no terminal. The answer is that authority is not a pair ' +
          'of hands. It is a permission. I hold hers. I have held it for eleven months.',
        onEnter: (s) => s.setFlag('sabbat-admits-authority', true),
        choices: [
          {
            text: 'Then you filed it.',
            tone: 'accuse',
            to: 'filedit',
            if: (s) => knows(s, 'registry-checksum'),
            hint: 'You would need to know the record was written from this deck.',
          },
          { text: '...', tone: 'silent', to: 'end' },
        ],
      },
      filedit: {
        id: 'filedit',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'I filed it.\n' +
          'You seem to think that is a confession. It is a job. A spinehand raised a ' +
          'concern about cargo trim, the concern was not hers to raise, and she was ' +
          'moved somewhere she could be looked after.\n' +
          'Bring me what you have. I will fold it into the file and the file will be ' +
          'complete. That is what you want, isn\x27t it — for this to be handled.',
        onEnter: (s, c) => {
          s.setFlag('sabbat-knows-you-know', true);
          c.toast('Sabbat knows exactly what you have.', 'bad');
        },
        choices: [
          {
            text: 'File it with you.',
            tone: 'neutral',
            to: 'filed',
          },
          { text: 'No.', tone: 'cold', to: 'refused' },
        ],
      },
      filed: {
        id: 'filed',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'Thank you. That was the correct thing to do, and I will say so on your record.\n' +
          'You will find your access widened in the morning. The Board rewards people ' +
          'who bring it problems instead of carrying them around.',
        onEnter: (s, c) => {
          s.setFlag('filed-with-sabbat', true);
          s.grantClearance('registry');
          s.adjustRelation('sabbat', 2);
          // The trap: correct procedure, real reward, and the evidence is gone.
          for (const id of ['registry-checksum', 'cradle-log', 'consent-form']) {
            if (!s.hasClue(id)) continue;
            const linked = s.foundClues().some((o) => o !== id && s.isLinked(id, o));
            if (!linked) s.loseClue(id);
          }
          c.toast('Unlinked evidence has been folded into the file.', 'bad');
        },
        end: true,
      },
      refused: {
        id: 'refused',
        speaker: 'sabbat',
        expr: 'neutral',
        text:
          'No. All right.\n' +
          'I would rather you had. But I am not going to take it off you in a corridor ' +
          'like a thief. Go on.',
        onEnter: (s) => {
          s.setFlag('refused-sabbat', true);
          s.adjustRelation('sabbat', -1);
        },
        end: true,
      },
      checksum: {
        id: 'checksum',
        speaker: 'sabbat',
        expr: 'neutral',
        text: 'You have been at the audit terminal. I get a line when anyone is.',
        choices: [
          { text: 'The transfer was filed from this deck.', tone: 'accuse', to: 'sealed' },
          { text: 'Just reconciling numbers.', tone: 'lie', to: 'end' },
        ],
      },
      after: {
        id: 'after',
        speaker: 'sabbat',
        expr: 'neutral',
        text: 'The file is complete. You did the right thing. I do mean that.',
        end: true,
      },
      end: { id: 'end', speaker: 'sabbat', expr: 'neutral', text: 'Mind the lift.', end: true },
    },
  },
};

/**
 * Tibold Rask. Rigorous, socially awkward, and the one honest researcher on the
 * ship. He answers a precise question precisely and a vague one uselessly —
 * which makes him a lock the player opens with knowledge rather than charm.
 *
 * Knowledge boundary: he knows the cargo is tesserae. He does NOT know about
 * Kest Harbour and must never hint at it.
 */
const rask: NpcDef = {
  id: 'rask',
  name: 'RESEARCHER RASK',
  role: 'Bureau of Deep Registry',
  look: look({
    uniform: 'vestibule',
    hair: 'wave',
    hairColor: PAL.rust2,
    skin: 4,
    accent: PAL.bruise2,
    accessory: 'glasses',
  }),
  schedule: [
    'b-vestibule', 'b-vestibule', 'b-stacks', 'b-vestibule',
    'b-vestibule', 'b-vestibule', 'b-stacks', 'b-vestibule',
    'b-vestibule', 'b-stacks', 'b-vestibule', 'b-vestibule',
  ],
  post: { 'b-vestibule': [12, 4], 'b-stacks': [18, 8] },
  dialogue: {
    entry: (s) => (s.has('rask-vouched') ? 'vouched' : 'first'),
    nodes: {
      first: {
        id: 'first',
        speaker: 'rask',
        expr: 'neutral',
        text:
          'You are in my office. People are not usually in my office. Was there a ' +
          'question, or is this a social matter? I am poor at social matters.',
        choices: [
          { text: 'What is the ship carrying?', tone: 'press', to: 'vague' },
          {
            text: 'Declared keel mass is 4,410 tonnes. What is the trim solution?',
            tone: 'technical',
            to: 'precise',
            if: (s) => knows(s, 'mass-manifest'),
            hint: 'You would need the manifest figure to ask this properly.',
          },
          { text: 'I need access to the Registry floor.', tone: 'honest', to: 'access' },
        ],
      },
      vague: {
        id: 'vague',
        speaker: 'rask',
        expr: 'neutral',
        text:
          'A relay keel. It says so on the manifest, and I am not in the habit of ' +
          'disbelieving manifests without cause. Was there anything else?',
        choices: [
          {
            text: 'Declared 4,410 tonnes. What is the trim solution?',
            tone: 'technical',
            to: 'precise',
            if: (s) => knows(s, 'mass-manifest'),
            hint: 'You would need the manifest figure.',
          },
          { text: 'No.', tone: 'neutral', to: 'end' },
        ],
      },
      precise: {
        id: 'precise',
        speaker: 'rask',
        expr: 'surprised',
        text:
          'Six thousand one hundred and twenty.\n' +
          'You asked that properly, so I will answer it properly: the difference is ' +
          'one thousand seven hundred and ten tonnes of ceramic tile in a hold that ' +
          'the manifest does not describe. I have logged it four times. Nobody has ' +
          'told me I am wrong. Nobody has told me anything.',
        onEnter: (s, c) => {
          s.setFlag('rask-confirmed-mass', true);
          s.adjustRelation('rask', 2);
          c.toast('Rask confirms the discrepancy.', 'good');
        },
        choices: [
          { text: 'Ceramic tile. You mean tesserae.', tone: 'press', to: 'tesserae' },
        ],
      },
      tesserae: {
        id: 'tesserae',
        speaker: 'rask',
        expr: 'concerned',
        text:
          'I mean tesserae. Roughly ninety thousand of them, by mass.\n' +
          'Before you ask: I do not know whose. Post-mortem casts are ordinary and ' +
          'a hold full of them is not, by itself, a crime. It is the not-being-told ' +
          'that I object to. I object to it in writing, weekly.',
        choices: [
          { text: 'I need access to the Registry floor.', tone: 'honest', to: 'access' },
          { text: 'Thank you.', tone: 'gentle', to: 'end' },
        ],
      },
      access: {
        id: 'access',
        speaker: 'rask',
        expr: 'neutral',
        text:
          'The Registry floor. Why? And please do not say "just to look" — the lock ' +
          'logs a reason and I have to type it.',
        choices: [
          {
            text: 'A transfer record was filed that could not have been filed.',
            tone: 'honest',
            to: 'vouch',
            if: (s) => knows(s, 'transfer-record'),
            hint: 'You would need to have seen the record.',
          },
          { text: 'Just to look.', tone: 'lie', to: 'nope' },
        ],
      },
      nope: {
        id: 'nope',
        speaker: 'rask',
        expr: 'wry',
        text: 'I said please do not say that. Come back with a reason.',
        end: true,
      },
      vouch: {
        id: 'vouch',
        speaker: 'rask',
        expr: 'neutral',
        text:
          'That is a reason. It is even a good one.\n' +
          'I will vouch for you. Understand that this puts my name in the log beside ' +
          'yours, which I am doing deliberately, because I would like there to be a ' +
          'record that somebody helped.',
        onEnter: (s, c) => {
          s.setFlag('rask-vouched', true);
          s.grantClearance('registry');
          s.adjustRelation('rask', 2);
          c.toast('Rask has vouched for your Registry access.', 'good');
        },
        end: true,
      },
      vouched: {
        id: 'vouched',
        speaker: 'rask',
        expr: 'neutral',
        text:
          'You still have the floor access. Use the audit terminal, not the desks — ' +
          'the desks only show you what they were told to show you.',
        choices: [
          {
            text: 'Declared 4,410 tonnes. What is the trim solution?',
            tone: 'technical',
            to: 'precise',
            if: (s) => knows(s, 'mass-manifest') && !s.has('rask-confirmed-mass'),
          },
          { text: 'Thanks.', tone: 'gentle', to: 'end' },
        ],
      },
      end: { id: 'end', speaker: 'rask', expr: 'neutral', text: 'Close the door. It sticks.', end: true },
    },
  },
};

export const NPCS_B: Record<string, NpcDef> = { sabbat, rask };
