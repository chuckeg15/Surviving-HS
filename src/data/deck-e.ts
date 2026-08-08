/**
 * Deck E — Engineering, the Reactor, and the Loom.
 *
 * Heat and iron. Where Deck B is cold blue precision — a floor laid out to say
 * that people become records — Deck E is rust and amber, and everything on it
 * is either hot, loud, or both. The grid here is not a statement; it is just
 * where the plate happened to be welded.
 *
 * The payoff room is e-loom. The player has spent the whole game wearing a
 * wrist loom and never once seen the industrial original: a projector hall two
 * storeys tall with a feed rack of tesserae at the top of it. Halo is permitted
 * in that room and nowhere else on the deck, because halo means live lattice
 * and the armature is the only live lattice down here. It is disciplined to the
 * armature and its two readouts. The hall itself is dim and quiet — quieter
 * than the reactor next door, which is the joke: the dangerous room roars and
 * the room that runs the dead is nearly silent.
 *
 * Access design: the lift is the hub. Workshop and reactor hang off the
 * landing; the Loom is reached only THROUGH reactor control, so every trip to
 * the payoff room walks the player past the hazard striping. That is
 * deliberate. You should have to cross the loud room to get to the quiet one.
 *
 * Cael Oduya has his post in the workshop by fiction — the Second Loom is his
 * tessera and this is his bench — but his NpcDef lives in `npcs.ts`, so he is
 * NOT redefined here and therefore NOT anchored here. Placing an `npc:` mark
 * for him without owning his def would put a schedule/post pair out of sync
 * across two files. Adding 'e-workshop' to his schedule is a one-line change in
 * npcs.ts for whoever merges this.
 */

import { AMBIENT, RoomDef } from '@/world/map';
import { NpcDef } from '@/data/npcs';
import { Clue } from '@/data/content';
import { GameState } from '@/game/state';
import { PAL } from '@/art/palette';
import { ActorLook } from '@/art/actors';

const PLATE = ['floor.plate.a', 'floor.plate.b', 'floor.plate.c', 'floor.plate.worn'];
const WORN = ['floor.plate.worn', 'floor.plate.a', 'floor.plate.c'];
const MESH = ['floor.mesh.a', 'floor.mesh.b'];
const GRATE = ['floor.grate.a', 'floor.grate.b'];

// =====================================================================
// E-LIFT — the landing. Four degrees warmer than the deck above, and it
// smells of hot iron. The fan is the first thing you hear and the last.
// =====================================================================
const eLift: RoomDef = {
  id: 'e-lift',
  name: 'LIFT LANDING \x7f ENGINEERING',
  deck: 'E',
  department: 'engineering',
  ambient: AMBIENT.dim,
  ambience: 'cargo',
  landmark: 'A landing with an extractor fan in the deckhead that has never once been switched off.',
  wall: 'iron',
  floor: PLATE,
  layout: [
    '####################',
    '####################',
    '##G##############G##',
    '#..................#',
    '#..L.......F.......#',
    '#..$...........E...#',
    '#..................#',
    '#..WW.........RR...#',
    '####################',
  ],
  marks: {
    // NOTE: the atlas registers this as 'lift.panel', not 'prop.lift.panel'.
    // deck-b.ts uses the prefixed form, which resolves to void.black — its lift
    // panel is currently an unlit black square. Using the real id here.
    L: {
      prop: 'lift.panel',
      solid: true,
      interact: 'lift-panel',
      light: { r: 20, color: PAL.amber2, i: 0.32 },
    },
    F: { prop: 'prop.fan', solid: true },
    E: { prop: 'prop.extinguisher', solid: true },
    // Interior, walkable, and deliberately not on a door tile.
    $: { spawn: 'default' },
    W: { door: { to: 'e-workshop', spawn: 'from-lift' }, spawn: 'from-workshop' },
    R: { door: { to: 'e-reactor', spawn: 'from-lift' }, spawn: 'from-reactor' },
    G: { prop: 'prop.light.ceiling', light: { r: 46, color: PAL.amber2, i: 0.4 } },
  },
};

// =====================================================================
// E-WORKSHOP — the Second Loom's bench. The one room on the deck where
// somebody has bothered to be comfortable: a kettle, a bench worn shiny,
// four cable coils nobody will ever unspool.
// =====================================================================
const eWorkshop: RoomDef = {
  id: 'e-workshop',
  name: 'LOOM WORKSHOP \x7f ENGINEERING',
  deck: 'E',
  department: 'engineering',
  ambient: AMBIENT.warm,
  ambience: 'hab',
  landmark: 'A bench under a rack of tools, a kettle with a spanner for a handle, and a chair worn into a shape.',
  wall: 'iron',
  floor: WORN,
  layout: [
    '######################',
    '######################',
    '##G###############G###',
    '#....................#',
    '#..YY......TTt.......#',
    '#..........cvc.......#',
    '#..Z...J.............#',
    '#..........$.........#',
    '#..n............kk...#',
    '#.....UU.............#',
    '######################',
  ],
  marks: {
    Y: { prop: 'prop.toolbox', solid: true },
    T: { prop: 'prop.table', solid: true },
    t: { prop: 'prop.table.end', solid: true },
    c: { prop: 'prop.chair.n' },
    v: { prop: 'prop.chair.s' },
    Z: { prop: 'prop.cable.coil', solid: true },
    J: { prop: 'prop.kettle', solid: true },
    n: { prop: 'prop.bench', solid: true },
    k: { prop: 'prop.locker.tall', solid: true },
    $: { spawn: 'default' },
    U: { door: { to: 'e-lift', spawn: 'from-workshop' }, spawn: 'from-lift' },
    G: { prop: 'prop.light.ceiling', light: { r: 50, color: PAL.amber3, i: 0.44 } },
  },
};

// =====================================================================
// E-REACTOR — reactor control. Big, loud, and painted like it wants you
// to be frightened of it, because it does. Every surface that can kill
// you is striped, and the striping is not decoration: it is the room
// telling you where the careless stand.
// =====================================================================
const eReactor: RoomDef = {
  id: 'e-reactor',
  name: 'REACTOR CONTROL',
  deck: 'E',
  department: 'engineering',
  ambient: AMBIENT.emergency,
  ambience: 'cargo',
  landmark: 'Two banks of consoles facing a wall of hazard stripe, under a warning lamp that turns everything amber.',
  wall: 'iron',
  floor: MESH,
  layout: [
    '############################',
    '############################',
    '##g#########G##########g####',
    '#..........................#',
    '#..MMMM.......MMMM.........#',
    '#..........................#',
    '#..HHHHHHHHHHHHHHHHHHHHH...#',
    '#....V.......$......V......#',
    '#..O..............E........#',
    '#..........................#',
    '#....UU..........DD........#',
    '############################',
  ],
  marks: {
    M: {
      prop: 'prop.console.b',
      solid: true,
      light: { r: 18, color: PAL.amber2, i: 0.26 },
    },
    // Hazard paint, not a prop: the stripe is the floor, so it reads under the
    // player's feet rather than as something to walk around.
    H: { floor: 'floor.hazard' },
    V: { prop: 'prop.valve', solid: true },
    O: { prop: 'prop.barrel', solid: true },
    E: { prop: 'prop.extinguisher', solid: true },
    $: { spawn: 'default' },
    U: { door: { to: 'e-lift', spawn: 'from-reactor' }, spawn: 'from-lift' },
    D: { door: { to: 'e-loom', spawn: 'from-reactor' }, spawn: 'from-loom' },
    G: { prop: 'prop.light.ceiling', light: { r: 52, color: PAL.amber3, i: 0.46 } },
    // The warning lamp. Flicker is small — a steady amber wash with a pulse in
    // it, not a strobe. A strobe would read as an alarm, and nothing is wrong.
    g: {
      prop: 'prop.light.emergency',
      light: { r: 40, color: PAL.amber1, i: 0.5, flicker: 0.18 },
    },
  },
};

// =====================================================================
// E-LOOM — THE LOOM.
//
// The industrial original of the thing on the player's wrist. Tall, narrow,
// colonnaded with feed pipe, and the only quiet room on the deck. Halo is
// allowed HERE and only here, on the armature core and its two readouts,
// because those are the only live lattice below Deck B. Everything else in
// the hall stays rust and iron so that the cyan reads as a fact and not a
// mood.
// =====================================================================
const eLoom: RoomDef = {
  id: 'e-loom',
  name: 'THE LOOM \x7f PROJECTOR HALL',
  deck: 'E',
  department: 'engineering',
  ambient: AMBIENT.dim,
  ambience: 'cargo',
  landmark: 'A projector armature two storeys tall, feed racks either side of it, and cyan light on nothing else.',
  wall: 'iron',
  floor: GRATE,
  layout: [
    '####################',
    '####################',
    '##G##############G##',
    '#..................#',
    '#..I............I..#',
    '#..I..BBBBBBBBBBI..#',
    '#..I.....XX.....I..#',
    '#..I..K..XX..K..I..#',
    '#..I............I..#',
    '#....A........A....#',
    '#..........N.......#',
    '#.......$..........#',
    '#..................#',
    '#..n............n..#',
    '#..................#',
    '#.......UU.........#',
    '####################',
  ],
  marks: {
    // The armature core. This is the payoff object: four tiles of it, lit, and
    // no interaction — you are meant to stand under it, not poke it.
    X: {
      prop: 'prop.console.b',
      solid: true,
      light: { r: 26, color: PAL.halo3, i: 0.5 },
    },
    // Feed racks. The same tile as the stacks on Deck B, which is the point.
    K: {
      prop: 'prop.crate.tessera',
      solid: true,
      light: { r: 14, color: PAL.halo2, i: 0.18 },
    },
    // The two readouts. Halo stops here.
    A: {
      prop: 'prop.terminal',
      solid: true,
      light: { r: 20, color: PAL.halo2, i: 0.3 },
    },
    I: { prop: 'prop.pipe.v', solid: true },
    B: { over: 'over.beam' },
    n: { prop: 'prop.bench', solid: true },
    N: { npc: 'kolt' },
    $: { spawn: 'default' },
    U: { door: { to: 'e-reactor', spawn: 'from-loom' }, spawn: 'from-reactor' },
    // Deliberately weak and rust-coloured. The hall is lit by its machine.
    G: { prop: 'prop.light.ceiling', light: { r: 38, color: PAL.rust2, i: 0.26 } },
  },
};

export const ROOMS_E: Record<string, RoomDef> = {
  'e-lift': eLift,
  'e-workshop': eWorkshop,
  'e-reactor': eReactor,
  'e-loom': eLoom,
};

// =====================================================================
// Clues
// =====================================================================
export const CLUES_E: Record<string, Clue> = {
  'loom-cycles': {
    id: 'loom-cycles',
    title: 'LOOM CYCLE LOG',
    // Every line here is a field off the log. The 14 months, the address and
    // the missing requisition are all checkable. The conclusion — that
    // something in that hold is being kept alive — is the player's to reach,
    // and the clue must never reach it for them.
    text:
      'LOOM 1 \x7f MAINTENANCE CYCLE LOG (EXTRACT).\n' +
      'CYCLE CLASS: LOW-POWER LATTICE REFRESH.\n' +
      'ADDRESSED TO: HOLD 4 \x7f BULK CARGO.\n' +
      'INTERVAL: CONTINUOUS. EARLIEST ENTRY 14 MONTHS AGO.\n' +
      'ORIGINATING SCHEDULE: NOT LISTED. No Engineering requisition is attached to any entry, ' +
      'and no Engineering hand set one.',
    source: 'Cycle log, the Loom, Deck E',
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
  eyeColor: PAL.amber2,
  uniform: 'loom',
  accent: PAL.amber2,
  accessory: 'none',
  ...o,
});

const knows = (s: GameState, id: string) => s.foundClues().includes(id);

/**
 * Chief Loomwright Dressa Kolt. Fifties, broad, grey coming in at the temples,
 * a visor pushed up on her forehead that she forgets is there.
 *
 * The writing rule: she is proud and she is tired, and those are the same
 * feeling about the same machine. She talks about the Loom the way a chief
 * engineer talks about an engine that has never let her down and is now being
 * asked for something nobody will describe to her. She does not swear, but she
 * is one word away from it at all times.
 *
 * Knowledge boundary: she knows the Loom has been running continuous low-power
 * refresh cycles addressed to the cargo hold for fourteen months, on a schedule
 * no one on Engineering set. She does NOT know what is in that hold, she has
 * never heard of Kest Harbour or the Ledger, and she has no idea who the player
 * is or what they are doing. She must never hint at any of it. Her whole
 * contribution to the mystery is a fact and an irritation.
 */
const kolt: NpcDef = {
  id: 'kolt',
  name: 'CHIEF LOOMWRIGHT KOLT',
  role: 'Loomwright, Deck E',
  look: look({
    frame: 'broad',
    skin: 2,
    hair: 'braids',
    hairColor: PAL.bone2,
    accessory: 'visor',
    accent: PAL.amber3,
  }),
  schedule: ['e-loom', 'e-loom', 'e-reactor', 'e-loom', 'e-workshop', 'e-loom'],
  post: { 'e-loom': [11, 10], 'e-reactor': [12, 8], 'e-workshop': [12, 6] },
  dialogue: {
    entry: (s) => {
      if (s.has('kolt-showed-log')) return 'after';
      if (knows(s, 'mass-manifest')) return 'manifest';
      return 'first';
    },
    nodes: {
      first: {
        id: 'first',
        speaker: 'kolt',
        expr: 'neutral',
        text:
          'Stand clear of the armature, whoever you are. It is not going to hurt you ' +
          'from there, but I have seen people learn that the other way.\n' +
          'Right. You are in my hall. What for?',
        choices: [
          { text: 'What does this actually do?', tone: 'honest', to: 'what' },
          {
            text: 'Declared keel mass is 4,410 tonnes. What is the trim solution?',
            tone: 'technical',
            to: 'trim',
            if: (s) => knows(s, 'mass-manifest'),
            hint: 'You would need the manifest figure to ask this properly.',
          },
          {
            text: 'Kiln pattern, third refresh. Who signs my loom off?',
            tone: 'technical',
            to: 'kiln',
            if: (s) => s.profile.background === 'loom',
            hint: 'A loom tech would know to ask it like that.',
          },
          { text: 'Nothing. Wrong deck.', tone: 'lie', to: 'wrongdeck' },
        ],
      },
      wrongdeck: {
        id: 'wrongdeck',
        speaker: 'kolt',
        expr: 'wry',
        text:
          'Wrong deck. It is always the wrong deck, and it is always my hall they get ' +
          'lost in. Lift is back through the loud room. Do not touch anything striped.',
        end: true,
      },
      what: {
        id: 'what',
        speaker: 'kolt',
        expr: 'neutral',
        text:
          'That is the Loom. The one on your wrist is a keepsake of this — a pocket ' +
          'version, three watts and a prayer. This one will hold a cast steady at full ' +
          'projection for nine hours and not drop a frame.\n' +
          'I have run it eleven years. It has never once embarrassed me.',
        choices: [
          { text: 'It is running now. Nobody is projecting.', tone: 'press', to: 'running' },
          {
            text: 'The serial format. It is batching them.',
            tone: 'technical',
            to: 'serial',
            if: (s) => knows(s, 'tessera-serial'),
            hint: 'You would need to have read a cast serial for yourself.',
          },
          { text: 'It is a good machine.', tone: 'gentle', to: 'end' },
        ],
      },
      running: {
        id: 'running',
        speaker: 'kolt',
        expr: 'concerned',
        text:
          'No. Nobody is.\n' +
          'It is never idle, and that is not how a projector hall is supposed to sit. ' +
          'Low draw, steady, round the clock. I did not schedule it. Nobody on my deck ' +
          'scheduled it. I have asked, in writing, in the tone I am allowed to use.',
        choices: [
          {
            text: 'Show me the cycle log.',
            tone: 'press',
            to: 'log',
            if: (s) => knows(s, 'mass-manifest') || s.profile.background === 'loom',
            hint: 'She would want a reason before she opened her log to a stranger.',
          },
          { text: 'What is it running for, then?', tone: 'press', to: 'noreason' },
          { text: 'Leave it. Thank you.', tone: 'gentle', to: 'end' },
        ],
      },
      noreason: {
        id: 'noreason',
        speaker: 'kolt',
        expr: 'wry',
        text:
          'If I knew that, I would be complaining about something else.\n' +
          'It is maintenance. Refresh cycles keep a lattice from going soft. What I am ' +
          'refreshing, and why it needs it every hour of every day, is above the line ' +
          'where anybody talks to me.',
        choices: [
          {
            text: 'Show me the cycle log.',
            tone: 'press',
            to: 'log',
            if: (s) => knows(s, 'mass-manifest') || s.profile.background === 'loom',
            hint: 'She would want a reason before she opened her log to a stranger.',
          },
          { text: '...', tone: 'silent', to: 'end' },
        ],
      },
      trim: {
        id: 'trim',
        speaker: 'kolt',
        expr: 'surprised',
        text:
          'Six thousand one hundred and twenty, and you knew that before you asked.\n' +
          'I fly the trim, I do not weigh the cargo. But I will tell you what I do not ' +
          'like, since you are the first person in fourteen months to ask me a question ' +
          'with a number in it.',
        onEnter: (s) => s.adjustRelation('kolt', 2),
        choices: [
          { text: 'Go on.', tone: 'honest', to: 'running' },
          { text: 'Not my business. Sorry.', tone: 'gentle', to: 'end' },
        ],
      },
      kiln: {
        id: 'kiln',
        speaker: 'kolt',
        expr: 'wry',
        text:
          'I do. Third refresh on a Kiln is mine to sign and I signed yours, which means ' +
          'you are one of mine whether either of us wanted that.\n' +
          'Since you are: you know what a hall this size sounds like when it is idle. ' +
          'Stand still a moment and tell me what you hear.',
        onEnter: (s) => s.adjustRelation('kolt', 3),
        choices: [
          { text: 'It is running.', tone: 'technical', to: 'running' },
          { text: 'Nothing. That is the point, is it not?', tone: 'wry', to: 'running' },
        ],
      },
      serial: {
        id: 'serial',
        speaker: 'kolt',
        expr: 'neutral',
        text:
          'It batches whatever the queue hands it. I do not read serials, any more than ' +
          'a pump reads what is in the pipe — and before you look at me like that, I am ' +
          'not being clever. I genuinely do not see them. The queue is not mine.',
        choices: [
          { text: 'Whose is it?', tone: 'press', to: 'running' },
          { text: 'Understood.', tone: 'neutral', to: 'end' },
        ],
      },
      log: {
        id: 'log',
        speaker: 'kolt',
        expr: 'concerned',
        text:
          'Fine. You have earned a look, and frankly I would like a witness.\n' +
          'There. Read it yourself. I am not going to tell you what it means, because I ' +
          'have been staring at it for a year and I do not know what it means.',
        onEnter: (s, c) => {
          s.findClue('loom-cycles');
          s.setFlag('kolt-showed-log', true);
          s.adjustRelation('kolt', 3);
          c.toast('Kolt opens the cycle log.', 'clue');
        },
        choices: [
          { text: 'Fourteen months.', tone: 'technical', to: 'fourteen' },
          { text: 'Thank you, Chief.', tone: 'gentle', to: 'end' },
        ],
      },
      fourteen: {
        id: 'fourteen',
        speaker: 'kolt',
        expr: 'concerned',
        text:
          'Fourteen months. We have been under way for eleven.\n' +
          'So it started before we left, on a schedule I did not set, addressed to a ' +
          'hold I have never had cause to open. I have written that sentence four times ' +
          'and posted it up the deck each time. Nobody has told me I am wrong. Nobody ' +
          'has told me anything.',
        choices: [
          { text: 'Keep the log where you can find it.', tone: 'honest', to: 'end' },
          { text: '...', tone: 'silent', to: 'end' },
        ],
      },
      manifest: {
        id: 'manifest',
        speaker: 'kolt',
        expr: 'neutral',
        text:
          'You have the look of somebody carrying a number they cannot put down. I get ' +
          'one of those a year and they are always about mass.\n' +
          'Go on. Ask it.',
        choices: [
          { text: 'Declared 4,410 tonnes. What is the trim solution?', tone: 'technical', to: 'trim' },
          { text: 'What does the Loom actually do?', tone: 'honest', to: 'what' },
          { text: 'Nothing. Wrong deck.', tone: 'lie', to: 'wrongdeck' },
        ],
      },
      after: {
        id: 'after',
        speaker: 'kolt',
        expr: 'neutral',
        text:
          'Log is where I left it, and so am I.\n' +
          'If you work out what my machine has been feeding, come back and tell me. I ' +
          'would rather hear it from you than from the deck above.',
        choices: [
          {
            text: 'The serial format. It is batching them.',
            tone: 'technical',
            to: 'serial',
            if: (s) => knows(s, 'tessera-serial'),
            hint: 'You would need to have read a cast serial for yourself.',
          },
          { text: 'I will.', tone: 'honest', to: 'end' },
        ],
      },
      end: {
        id: 'end',
        speaker: 'kolt',
        expr: 'neutral',
        text: 'Mind the striping on your way through. It is painted there for a reason.',
        end: true,
      },
    },
  },
};

export const NPCS_E: Record<string, NpcDef> = { kolt };
