/**
 * Deck A — Command.
 *
 * The only properly lit deck on the ship, and that is the point of it. Deck C
 * gets one ceiling lamp for a twenty-by-twelve office; the bridge gets six for
 * a room half again as big, plus a wall of ports, plus a plant that is being
 * kept alive on hydroponics output somebody else is breathing. Nothing up here
 * is a graphical upgrade. It is the same tile set, the same lamp, the same
 * lightmap — there is simply more of it, spent on fewer people. A player who
 * has spent six hours in a 0.60 ambient should walk in here and feel the money
 * before they can name what changed.
 *
 * The one room on the deck that is NOT expensive is Communications: iron over
 * grate, working light, cable trunk under the floor. Signals are labour, and
 * the class line runs through Deck A as well as around it.
 *
 * Access design: Deck A is sealed for the whole of Chapter One BY CANON, and
 * that seal is load-bearing — the chapter's red herring points at the Captain,
 * so the Captain must be unreachable. Everything here is gated behind the
 * Chapter Two opening (`src/ui/chapter.ts`), which hands out a different route
 * per Chapter One outcome:
 *
 *   O1  clearance `command`      — signed up as Trave's witness escort
 *   O2  clearance `command` and
 *       `command-safe`           — the Board re-issues your tessera
 *   O3  clearance `spine-command`— the lift refuses you; the spine does not
 *   O4  clearance `command`      — you rode up behind the Master's tray
 *
 * The strongroom is behind `command-safe`, which only O2 is given. Everyone
 * else has to get it from Onwe, and what she wants in exchange differs by
 * route. That is the deck's real design: two prizes — the document and the
 * Captain — and no route hands you both.
 *
 * Captain Onwe's NpcDef lives HERE, in `NPCS_A`, because `src/data/npcs.ts` is
 * owned by another change in flight. She is anchored by an `npc:` mark in the
 * day cabin and scheduled into these rooms, but she will not be spawned until
 * `NPCS_A` is spread into the `NPCS` map in npcs.ts — one line, and until it
 * lands she is written and unreachable. Flagged in the delivery notes.
 */

import { AMBIENT, RoomDef } from '@/world/map';
import { NpcDef } from '@/data/npcs';
import { Clue, Deduction, InteractDef, clearancesOf } from '@/data/content';
import { GameState } from '@/game/state';
import { PAL } from '@/art/palette';
import { ActorLook } from '@/art/actors';

/**
 * A note on how bright this deck is allowed to be.
 *
 * Deck A's ambient is `lit` or `sterile` \x7f 1.0 and above, where the rest of
 * the ship runs 0.60 to 0.76. That gap IS the class difference, and it is
 * already the whole effect. Lamps here are therefore small and weak on purpose:
 * at an ambient of 1.0 there is no headroom left, so a lamp with the intensity
 * one would give it on Deck C does not light the room, it clips it. The first
 * pass ran six ceiling lamps at r58/i0.4 over `lit` and the bridge came out a
 * flat white field with no floor texture visible at all \x7f expensive read as
 * overexposed.
 *
 * Up here the fixtures shape; the ambient illuminates.
 */

const MED = ['floor.med.a', 'floor.med.b'];
const GRATE = ['floor.grate.a', 'floor.grate.b'];
const CARPET = ['floor.carpet.a', 'floor.carpet.b', 'floor.carpet.worn'];
const REG = ['floor.registry.a', 'floor.registry.b'];
const MESH = ['floor.mesh.a', 'floor.mesh.b'];

// =====================================================================
// A-COMMAND — the bridge and navigation floor. The lift opens straight
// onto it, which is itself a statement: nobody up here expects to have to
// walk anywhere. Six lamps, two watch banks, a plot table lit from inside,
// and a run of ports along the fore bulkhead looking at nothing.
// =====================================================================
const aCommand: RoomDef = {
  id: 'a-command',
  name: 'THE BRIDGE \x7f NAVIGATION FLOOR',
  deck: 'A',
  department: 'command',
  ambient: AMBIENT.lit,
  ambience: 'registry',
  landmark: 'A plot table lit from inside, under a run of ports with nothing behind them.',
  wall: 'reg',
  floor: MED,
  layout: [
    '##############################',
    '##############################',
    '##############################',
    '#..wwwwwwwww....wwwwwwwww....#',
    '#............................#',
    '#...MMMMM..G.......MMMMM.....#',
    '#...ccccc..........ccccc.....#',
    '#............................#',
    '#.....G....NN......G.........#',
    '#..........NN................#',
    '#.....G......................#',
    '#....n.....G.....n...........#',
    '#.L.........$................#',
    '#.S..........................#',
    '######KK##############CC######',
  ],
  marks: {
    // The ports. `wall.window` is drawn on the first floor row rather than
    // inside the wall band: the wall slicer works off vertical runs, so a
    // non-'#' tile buried in a wall turns its neighbours into skirting. The
    // window art already contains a wall face, which is exactly how the lift
    // panel and the department signage are placed too.
    w: {
      prop: 'wall.window',
      solid: true,
      interact: 'bridge-window',
      light: { r: 16, color: PAL.brine3, i: 0.1 },
    },
    M: {
      prop: 'prop.console.a',
      solid: true,
      interact: 'watch-station',
      light: { r: 16, color: PAL.brine4, i: 0.16 },
    },
    // The plot table: four tiles of it, halo-lit, and the only halo on the
    // deck. Command runs on live lattice; nothing else up here does.
    N: {
      prop: 'prop.console.b',
      solid: true,
      interact: 'nav-table',
      light: { r: 22, color: PAL.halo3, i: 0.3 },
    },
    L: {
      prop: 'lift.panel',
      solid: true,
      interact: 'lift-panel',
      light: { r: 18, color: PAL.brine4, i: 0.18 },
    },
    S: { prop: 'prop.sign.dept', solid: true, interact: 'a-signage' },
    $: { spawn: 'default' },
    K: { door: { to: 'a-comms', spawn: 'from-bridge' }, spawn: 'from-comms' },
    C: { door: { to: 'a-cabin', spawn: 'from-bridge' }, spawn: 'from-cabin' },
    // Six of these. The Watch office on Deck C has one, for a room two thirds
    // the size, and the difference is the whole argument of the deck.
    G: { over: 'prop.light.ceiling', light: { r: 40, color: PAL.brine4, i: 0.13 } },
  },
};

// =====================================================================
// A-COMMS — Communications. The working room on the rich deck: raised
// grate over a cable trunk, iron walls, one operator's bank, and a floor
// hatch onto the spine that Command has never once thought about.
// =====================================================================
const aComms: RoomDef = {
  id: 'a-comms',
  name: 'COMMUNICATIONS \x7f SIGNAL ROOM',
  deck: 'A',
  department: 'command',
  ambient: AMBIENT.cool,
  ambience: 'registry',
  landmark: 'A raised floor of steel grate, one operator bank, and a queue that has not moved in fourteen months.',
  wall: 'iron',
  floor: GRATE,
  layout: [
    '######################',
    '######################',
    '######################',
    '#....................#',
    '#..TTTTTT......G.....#',
    '#..cccccc............#',
    '#....................#',
    '#..G......$......Y...#',
    '#....................#',
    '#..H.............Z...#',
    '#....................#',
    '##########DD##########',
  ],
  marks: {
    T: {
      prop: 'prop.terminal',
      solid: true,
      interact: 'comms-desk',
      light: { r: 18, color: PAL.halo2, i: 0.2 },
    },
    Y: { prop: 'prop.toolbox', solid: true },
    Z: { prop: 'prop.cable.coil', interact: 'comms-trunk' },
    // The spine tap. Dogged from the far side for everyone who did not come
    // up that way, which is everyone except the Ninth Watch route.
    H: {
      door: {
        to: 'a-spine',
        spawn: 'from-comms',
        locked: 'spine-command',
        refuse:
          'A trunk hatch in the deck, dogged from underneath. It is not locked. It is simply not opened from this side.',
        tile: 'hatch.closed',
      },
      spawn: 'from-spine',
    },
    $: { spawn: 'default' },
    D: { door: { to: 'a-command', spawn: 'from-comms' }, spawn: 'from-bridge' },
    // Working light, not ceremony: two lamps, amber, and they are the only
    // amber on the deck.
    G: { over: 'prop.light.ceiling', light: { r: 40, color: PAL.amber2, i: 0.24 } },
  },
};

// =====================================================================
// A-CABIN — the Master's day cabin. Carpet, a private port, a plant, and
// a tray somebody carried up four decks. The only warm room on Deck A and
// the only carpet outside the berths — which is the joke, because it is
// the same carpet.
// =====================================================================
const aCabin: RoomDef = {
  id: 'a-cabin',
  name: "THE MASTER'S DAY CABIN",
  deck: 'A',
  department: 'command',
  ambient: AMBIENT.warm,
  ambience: 'hab',
  landmark: 'A desk with a hand-written order book on it, a private port, and a plant nobody had to justify.',
  wall: 'hab',
  floor: CARPET,
  layout: [
    '####################',
    '####################',
    '####################',
    '#..ww.......G......#',
    '#..................#',
    '#..TTt......P......#',
    '#..cvc.............#',
    '#.........J........#',
    '#.k....$...........#',
    '#........G.........#',
    '#..................#',
    '####DD######SS######',
  ],
  marks: {
    w: {
      prop: 'wall.window',
      solid: true,
      interact: 'cabin-port',
      light: { r: 16, color: PAL.brine3, i: 0.1 },
    },
    T: { prop: 'prop.table', solid: true, interact: 'night-orders' },
    J: { prop: 'prop.kettle', solid: true, interact: 'cabin-service' },
    O: { npc: 'onwe' },
    $: { spawn: 'default' },
    D: { door: { to: 'a-command', spawn: 'from-cabin' }, spawn: 'from-bridge' },
    S: {
      door: {
        to: 'a-strong',
        spawn: 'from-cabin',
        locked: 'command-safe',
        refuse:
          'COMMAND STRONGROOM \x7f MASTER OR DELEGATE. The lock reads your tessera, thinks about it, and does not open.',
      },
      spawn: 'from-strong',
    },
    G: { over: 'prop.light.ceiling', light: { r: 36, color: PAL.amber3, i: 0.16 } },
  },
};

// =====================================================================
// A-STRONG — the Command strongroom. Bone walls, a brine grid underfoot,
// bright enough to hurt, and symmetrical, because a room that holds the
// ship's seals is not allowed to look like it has an opinion.
// =====================================================================
const aStrong: RoomDef = {
  id: 'a-strong',
  name: 'COMMAND STRONGROOM',
  deck: 'A',
  department: 'command',
  ambient: AMBIENT.sterile,
  ambience: 'registry',
  landmark: 'Two shelved bays either side of a safe set into the forward bulkhead, under light with no shadow in it.',
  wall: 'med',
  floor: REG,
  layout: [
    '################',
    '################',
    '################',
    '#....11....22..#',
    '#.....G....G...#',
    '#..kk......kk..#',
    '#..kk......kk..#',
    '#..............#',
    '#..kk......kk..#',
    '#......$.......#',
    '#######DD#######',
  ],
  marks: {
    '1': {
      prop: 'hatch.closed',
      solid: true,
      interact: 'command-safe',
      light: { r: 18, color: PAL.halo2, i: 0.22 },
    },
    '2': { prop: 'prop.console.dead', solid: true, interact: 'strong-index' },
    k: { prop: 'prop.locker.tall', solid: true, interact: 'strong-shelves' },
    $: { spawn: 'default' },
    D: { door: { to: 'a-cabin', spawn: 'from-strong' }, spawn: 'from-cabin' },
    G: { over: 'prop.light.ceiling', light: { r: 38, color: PAL.bone3, i: 0.15 } },
  },
};

// =====================================================================
// A-SPINE — the crawl under the Command flat. The Ninth Watch route, and
// the only way onto Deck A that nothing logs. Same family as duct 9-C on
// purpose: the spine is one place, and the player should recognise it.
// =====================================================================
const aSpine: RoomDef = {
  id: 'a-spine',
  name: 'SPINE DUCT 1-A \x7f UNDER THE COMMAND FLAT',
  deck: 'Spine',
  department: 'cargo',
  ambient: AMBIENT.gloom,
  ambience: 'spine',
  music: 'tense',
  landmark: 'A crawl of cable trunking under the command flat, warm from the deck above.',
  wall: 'spine',
  floor: MESH,
  layout: [
    '##########################',
    '##########################',
    '#........................#',
    '#.\\\\.........\\\\.........#',
    '#........................#',
    '#.....1.........2........#',
    '#..g..................g..#',
    '#...$....................#',
    '#DD#################UU####',
  ],
  marks: {
    '1': { prop: 'prop.debris', interact: 'spine-bracket' },
    '2': { prop: 'prop.cable.coil', interact: 'spine-trunk' },
    $: { spawn: 'from-comms' },
    D: { door: { to: 'spine-duct', spawn: 'from-command-crawl' }, spawn: 'from-duct' },
    U: { door: { to: 'a-comms', spawn: 'from-spine', tile: 'hatch.closed' }, spawn: 'default' },
    g: {
      over: 'prop.light.emergency',
      light: { r: 26, color: PAL.ember2, i: 0.3, flicker: 0.4 },
    },
  },
};

export const ROOMS_A: Record<string, RoomDef> = {
  'a-command': aCommand,
  'a-comms': aComms,
  'a-cabin': aCabin,
  'a-strong': aStrong,
  'a-spine': aSpine,
};

// =====================================================================
// Clues
//
// Three, and only one of them is the document. The order is the payload;
// the night orders are what make the Master legible; the traffic log is
// the thing that will matter in Chapter Three, when somebody wants to
// tell Earth.
// =====================================================================
export const CLUES_A: Record<string, Clue> = {
  'order-9b': {
    id: 'order-9b',
    title: 'STANDING ORDER 9-B',
    // Every line is a field off the order. It gives the range and not the
    // name: KH-00001 to KH-91400 means nothing until the player has read a
    // cast serial off a revenant (C11) and knows what KH is a prefix for.
    // The order must never do that work for them.
    text:
      'CONTINUANCE BOARD \x7f STANDING ORDER 9-B \x7f MASTER\x27S COPY \x7f SEALED.\n' +
      '1. THE VESSEL WILL CARRY, UNDECLARED, ONE REGISTRY ARCHIVE: 91,400 CASTS, ' +
      'SERIES KH-00001 THROUGH KH-91400.\n' +
      '2. ON ARRIVAL THE ARCHIVE WILL BE INSTANTIATED AT SABLE VERGE AS A SELF-RUNNING ' +
      'RESIDENT COLONY. THIS IS THE PURPOSE OF THE VOYAGE.\n' +
      '3. INSTANTIATION REQUIRES THE SCHEMA INDEX PRESENT AND CONSCIOUS. INDEX IDENTITY ' +
      'NOT DISCLOSED IN THIS ORDER \x7f SEE VESTIBULE ANNEX 2229.\n' +
      '4. THE SHIP\x27S COMPANY WILL BE ADVISED OF STANDING ORDER 9 ONLY.\n' +
      'Countersigned in a hand that scored the page: V. ONWE.',
    source: 'Command safe, Deck A',
    kind: 'record',
  },
  'onwe-nightorders': {
    id: 'onwe-nightorders',
    title: "THE MASTER'S NIGHT ORDERS",
    text:
      'A paper order book. One page a watch, initialled at the foot.\n' +
      '"BURN DEFERRED \x7f trim solution unsatisfied, see Engineering." V.O.\n' +
      '"BURN DEFERRED \x7f keel securing unverified at frame 60." V.O.\n' +
      '"BURN DEFERRED." V.O.\n' +
      'Three deferrals in nine weeks. The first two carry a ground an auditor would ' +
      'call sound. The third does not bother.',
    source: 'Day cabin desk, Deck A',
    kind: 'record',
  },
  'comms-embargo': {
    id: 'comms-embargo',
    title: 'OUTBOUND TRAFFIC LOG',
    text:
      'COMMS 1 \x7f OUTBOUND QUEUE.\n' +
      'HELD: 1,184 ITEMS. RELEASED THIS ROTATION: 0.\n' +
      'EMBARGO CLASS: BOARD. APPLIED FOURTEEN MONTHS AGO. NO EXPIRY FIELD.\n' +
      'Crew mail, trim reports, the Master\x27s own weekly to the owners \x7f queued, ' +
      'numbered, and not sent. Nothing has left this ship since before she sailed.',
    source: 'Signal room, Deck A',
    kind: 'record',
  },
};

// =====================================================================
// Deductions
//
// D8 is the second, independent retirement of the red herring. Until now
// the only disproof of DX was D4 (the watch log plus the Registry
// checksum), which lives entirely on Decks C and B. A player who reaches
// Chapter Two still believing the Captain did it must be able to find out
// otherwise on the deck where the Captain actually is — and by reading,
// not by being told. `reconcile()` in content.ts retires DX for either.
// =====================================================================
export const DEDUCTIONS_A: Record<string, Deduction> = {
  D7: {
    id: 'D7',
    claim: 'The archive is the mission.',
    requires: [
      ['order-9b', 'mass-manifest'],
      ['order-9b', 'cold-registry'],
      ['order-9b', 'tessera-serial'],
    ],
    conclusion:
      'Standing Order 9 is what the company signed for. 9-B is what the ship is for. ' +
      'The relay keel is a story told to the trim computer and to two hundred and twelve people.',
  },
  D8: {
    id: 'D8',
    claim: 'The Master is under the order, not behind it.',
    requires: [
      ['onwe-nightorders', 'order-9b'],
      ['onwe-nightorders', 'captain-watchlog'],
    ],
    conclusion:
      'She countersigned an order she was handed and has spent nine weeks refusing to ' +
      'execute the part of it that matters. Her name is on everything. Almost none of it is her doing.',
  },
};

// =====================================================================
// Interactables
//
// Registered here rather than in the INTERACTABLES literal in content.ts
// so that `npm run test:reach` keeps working: it checks every id in that
// literal against the room files it knows about, and it does not know
// about this one. Ids defined here are checked by hand and by the
// content validator instead. Flagged in the delivery notes.
// =====================================================================
const cleared = (s: GameState, c: string) => clearancesOf(s).includes(c);

export const INTERACTABLES_A: Record<string, InteractDef> = {
  'a-signage': {
    id: 'a-signage',
    label: 'Deck signage',
    run: (s) => ({
      lines: [
        'DECK A \x7f COMMAND. BRIDGE \x7f NAVIGATION \x7f COMMUNICATIONS \x7f MASTER\x27S DAY CABIN.',
        'Under it, engraved rather than printed: THE MASTER IS ABOARD. Nobody has ever needed telling.',
        s.has('deck-a-unsanctioned')
          ? 'Beside it, a watch list of everyone cleared for this flat. You read it twice. You are not on it.'
          : 'Beside it, a watch list of everyone cleared for this flat. It is eleven names long, on a ship of three hundred and forty.',
      ],
    }),
  },
  'bridge-window': {
    id: 'bridge-window',
    label: 'Ports',
    run: () => ({
      lines: [
        'Nine ports along the fore bulkhead, each one a hand\x27s breadth of armoured glass in a steel bezel.',
        'Outside: nothing, at a very great distance, at four hundred and twelve degrees below the temperature of the room.',
        'There is no port anywhere else on this ship. You have been aboard eleven months and this is the first time you have seen out.',
      ],
    }),
  },
  'watch-station': {
    id: 'watch-station',
    label: 'Watch station',
    run: () => ({
      lines: [
        'A navigation watch bank, awake, showing heading, drift and a burn timer counting toward a burn that has not been ordered.',
        'The chair is worn into a shape. Somebody sits here for six hours at a time and looks at a number that does not change.',
      ],
    }),
  },
  'nav-table': {
    id: 'nav-table',
    label: 'Plot table',
    run: (s) => {
      const lines = [
        'The plot: a track from Earth to Sable Verge drawn in cyan, with the ship as a bead a third of the way along it.',
        'BURN 4 \x7f SCHEDULED \x7f DEFERRED. BURN 4 \x7f RESCHEDULED \x7f DEFERRED. BURN 4 \x7f RESCHEDULED \x7f PENDING MASTER.',
      ];
      if (s.hasClue('onwe-nightorders')) {
        lines.push(
          'Three deferrals on the plot and three in her order book, in the same weeks, in the same hand.',
        );
      }
      return { lines, flag: 'saw-burn-plot' };
    },
  },
  'comms-desk': {
    id: 'comms-desk',
    label: 'Signal desk',
    run: () => ({
      lines: [
        'The outbound queue. It wants no credential to read \x7f a signal desk has to show the operator what it is holding.',
        'It is holding everything.',
      ],
      clue: 'comms-embargo',
    }),
  },
  'comms-trunk': {
    id: 'comms-trunk',
    label: 'Cable trunk',
    run: (s) => ({
      lines: [
        'The deck plate here is grate, not plate, because everything Command says to anybody runs under it in a bundle as thick as your arm.',
        s.has('deck-a-lockdown')
          ? 'You came up through it an hour ago. Nobody on this deck has looked at the floor since.'
          : 'The trunk hatch is dogged. There is a rime of dust on the dogs and nobody has turned them in years.',
      ],
    }),
  },
  'night-orders': {
    id: 'night-orders',
    label: 'Order book',
    run: (s) => {
      // Her private book. On the Board-asset route she is on the bridge and
      // the desk is unattended, which is the trade that route makes: you get
      // the paper and you do not get the person.
      if (!s.has('onwe-showed-orders') && !s.has('deck-a-asset')) {
        return {
          lines: [
            'A paper order book, open, weighted flat with a brass rule.',
            'The Master is four paces away and it is her handwriting. You would need her to turn it round for you.',
          ],
        };
      }
      return {
        lines: [
          'The night order book. Paper, because a night order has to survive the ship losing power, and because she was taught that way.',
          'Three of the pages are the same order, deferred.',
        ],
        clue: 'onwe-nightorders',
      };
    },
  },
  'cabin-service': {
    id: 'cabin-service',
    label: 'Breakfast tray',
    run: () => ({
      lines: [
        'A tray on a warmer. Tea, a covered plate, a folded cloth. Somebody carried this up four decks and left it outside without knocking.',
        'The pot is the only object on Deck A that anybody has touched with affection.',
      ],
    }),
  },
  'cabin-port': {
    id: 'cabin-port',
    label: 'Port',
    run: () => ({
      lines: [
        'Her own port, in her own cabin, with a curtain on a rail. The curtain is drawn back and has been for some time; the fabric has gone stiff in the hooks.',
        'A berth on Deck C is four bunks, no port, and a rug from nine years ago.',
      ],
    }),
  },
  'command-safe': {
    id: 'command-safe',
    label: 'Command safe',
    run: (s) => {
      if (!cleared(s, 'command-safe')) {
        return {
          lines: [
            'A safe set into the forward bulkhead: a wheel, a seal plate, and a reader that wants a delegation it has not been given.',
            'It does not tone. Command locks never tone. They simply decline.',
          ],
        };
      }
      return {
        lines: [
          'The wheel turns. Inside: the ship\x27s seals, a chartered copy of Standing Order 9, and beneath it, in the same folio, an order with a letter after the number.',
          'It is four paragraphs long. It is the shortest important document you have ever read.',
        ],
        clue: 'order-9b',
      };
    },
  },
  'strong-index': {
    id: 'strong-index',
    label: 'Seal index',
    run: (s) => ({
      lines: [
        'The strongroom index. Every document in this room, listed by seal and by the authority that may break it.',
        'STANDING ORDER 9 \x7f MASTER. STANDING ORDER 9-B \x7f MASTER, BOARD DELEGATE.',
        s.hasClue('registry-checksum')
          ? 'Master, or Board delegate. Two hands on the same seal, and only one of them writes a Registry checksum.'
          : 'Two entries where the manifest and every notice board aboard describe one standing order.',
      ],
      flag: 'saw-seal-index',
    }),
  },
  'strong-shelves': {
    id: 'strong-shelves',
    label: 'Document bays',
    run: () => ({
      lines: [
        'Charter documents, hull certificates, the crew articles that two hundred and twelve people signed and one of them read.',
        'Everything here is paper and everything here is dull, and it is all kept at a temperature and a humidity that Medical is not.',
      ],
    }),
  },
  'spine-bracket': {
    id: 'spine-bracket',
    label: 'The third bracket',
    run: (s) => ({
      lines: [
        'The third bracket along is not a bracket. It is a strain gauge, wired into the trunk, reading the deck above.',
        'Somebody fitted it by hand and did not paint it, which means they expected to come back for it.',
        s.faction('ninth') > 0
          ? 'Stray told you to mind it. She did not tell you it was hers.'
          : 'Whoever fitted it, it is not Engineering work and it is not on any drawing.',
      ],
    }),
  },
  'spine-trunk': {
    id: 'spine-trunk',
    label: 'Trunk bundle',
    run: () => ({
      lines: [
        'The whole of Command\x27s signalling runs through here in one bundle, and it is warm.',
        'Above your head, through the grate, the deck the ship is run from. Nobody up there has ever been down here.',
      ],
    }),
  },
};

// =====================================================================
// NPCs
// =====================================================================
const look = (o: Partial<ActorLook>): ActorLook => ({
  frame: 'average',
  skin: 3,
  hair: 'crop',
  hairColor: PAL.bone1,
  eyeColor: PAL.brine4,
  uniform: 'board',
  accent: PAL.brine4,
  accessory: 'none',
  ...o,
});

const knows = (s: GameState, id: string) => s.foundClues().includes(id);

/**
 * Captain Verity Onwe, 55, Master.
 *
 * The writing rule: she is the only senior figure who tells the truth when
 * cornered, and the truth is worse than the evasion would have been. She does
 * not use procedure as cover — she uses it as a tool and says so. Economical,
 * seamanlike, plain. She never raises her voice, and unlike Sabbat that is not
 * a technique.
 *
 * Knowledge boundary (NARRATIVE_TRUTH.md §C): she may reference K4, K9, K12,
 * K13, K14, K19. She may NOT say Kest Harbour, may NOT say the archive was
 * live-cast, may NOT produce the figure 91,400 herself, may NOT know that
 * Trave detained Hessa or where Hessa is, and may NOT assert that the transfer
 * record is forged — that is K15/K16/K17 and belongs to Trave and Sabbat. What
 * she can do about the red herring is refuse to argue and hand the player two
 * things they can check without her. She also may not reference the two
 * write-ups (K20 is Fen's, Pell's and the Watch file's).
 *
 * She does not know the player is the index. Nobody but Sabbat does.
 */
const onwe: NpcDef = {
  id: 'onwe',
  name: 'CAPTAIN ONWE',
  role: 'Master, RV Candlewake',
  look: look({ frame: 'broad', skin: 2, hair: 'crop', hairColor: PAL.bone0 }),
  schedule: ['a-cabin', 'a-cabin', 'a-command', 'a-cabin', 'a-command', 'a-cabin'],
  post: { 'a-cabin': [8, 6], 'a-command': [12, 7] },
  dialogue: {
    // One entry per Chapter One outcome. She reacts to what the player did
    // with their watch, not to who they are — CHARACTER_BIBLE.md, "Across the
    // outcomes".
    entry: (s) => {
      if (s.has('onwe-opened-safe') || s.has('onwe-refused')) return 'after';
      if (s.has('deck-a-asset')) return 'asset';
      if (s.has('deck-a-lockdown')) return 'lockdown';
      if (s.has('deck-a-escort')) return 'escort';
      if (s.has('deck-a-unsanctioned')) return 'unsanctioned';
      return 'escort';
    },
    nodes: {
      // --- O2: the Board's asset. She writes them off, permanently. -----
      asset: {
        id: 'asset',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'The Registrar sent your name up ahead of you. He does that with things he ' +
          'has finished evaluating.\n' +
          'You have the run of my deck and I am told to make you welcome, so: welcome. ' +
          'Read whatever you have been given the permission to read.',
        onEnter: (s) => s.adjustRelation('onwe', -8),
        choices: [
          { text: 'I filed what I had. It was the correct procedure.', tone: 'honest', to: 'correct' },
          { text: 'I want to ask you about Standing Order 9-B.', tone: 'press', to: 'assetorder' },
          { text: '...', tone: 'silent', to: 'assetend' },
        ],
      },
      correct: {
        id: 'correct',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'It was. I have signed a great many correct things.\n' +
          'You will find that being right about the procedure is not the same as being ' +
          'on anybody\x27s side, and that it is a very quiet place to stand.',
        choices: [
          { text: 'Standing Order 9-B.', tone: 'press', to: 'assetorder' },
          { text: '...', tone: 'silent', to: 'assetend' },
        ],
      },
      assetorder: {
        id: 'assetorder',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'No.\n' +
          'Not to you, and not because of what you know. Because of who you will tell, ' +
          'and because he will hear it in the same tone I say it in. Everything I have ' +
          'to say on that subject is in a safe you have already been given the key to. ' +
          'Go and read it. You will not need me for any of it.',
        onEnter: (s) => s.setFlag('onwe-refused', true),
        end: true,
      },
      assetend: {
        id: 'assetend',
        speaker: 'onwe',
        expr: 'neutral',
        text: 'Mind the plot table on your way past. It is not as sturdy as it looks and neither is anything else up here.',
        onEnter: (s) => s.setFlag('onwe-refused', true),
        end: true,
      },

      // --- O1: signed up as a witness escort by a Warden who broke. -----
      escort: {
        id: 'escort',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'You are signed onto my deck as a witness escort, which is a form I have not ' +
          'seen used in nine years, by a Warden who has stopped filing anything at all.\n' +
          'So one of two things has happened on my ship overnight. Tell me which.',
        choices: [
          {
            text: 'Warden Trave broke. He pulled a woman out of a cradle four days early.',
            tone: 'honest',
            to: 'broke',
            if: (s) => s.has('trave-broke'),
            hint: 'You would need the Warden to have broken first.',
          },
          { text: 'A spinehand went missing and the record lied about it.', tone: 'honest', to: 'record' },
          { text: 'Nothing you need to know about.', tone: 'cold', to: 'brushoff' },
        ],
      },
      broke: {
        id: 'broke',
        speaker: 'onwe',
        expr: 'concerned',
        text:
          'Four days early.\n' +
          'I am the Master of this hull. There is a cradle running on my Deck D and I ' +
          'am hearing about it from an escort. Sit down. No \x7f do not sit down, there ' +
          'is nowhere to sit that is not mine.',
        onEnter: (s) => {
          s.setFlag('onwe-told-cradle', true);
          s.adjustRelation('onwe', 4);
        },
        choices: [
          { text: 'The record that moved her carried your authorisation.', tone: 'accuse', to: 'accused' },
          { text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' },
        ],
      },
      record: {
        id: 'record',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'Quill. Spinehand, third watch, duct rotation.\n' +
          'She was the best spinehand on this hull and I never told her so, which is ' +
          'the sort of economy I am apparently known for. Go on.',
        choices: [
          {
            text: 'The record that moved her carried your authorisation.',
            tone: 'accuse',
            to: 'accused',
            if: (s) => knows(s, 'transfer-record'),
            hint: 'You would need to have read the record yourself.',
          },
          { text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' },
        ],
      },
      brushoff: {
        id: 'brushoff',
        speaker: 'onwe',
        expr: 'wry',
        text:
          'Then you are an escort with nobody to escort, standing on the most expensive ' +
          'deck plate on the ship. The lift is aft. Use it before somebody asks me to ' +
          'explain you.',
        end: true,
      },

      // --- O3: the lockdown was executed over her objection. ------------
      lockdown: {
        id: 'lockdown',
        speaker: 'onwe',
        expr: 'concerned',
        text:
          'The lift will not bring you here, the brow is stood two-deep, and here you ' +
          'are, so you came up the trunk. There is no other way and I have known that ' +
          'for eleven months.\n' +
          'I did not order the lockdown. I was informed of it. Do you understand what a ' +
          'Master being informed of a lockdown on her own hull means?',
        onEnter: (s) => {
          s.setFlag('onwe-lost-ship', true);
          s.adjustRelation('onwe', 3);
        },
        choices: [
          { text: 'It means you are not in command.', tone: 'honest', to: 'notincommand' },
          { text: 'Then you are no use to me.', tone: 'cold', to: 'nouse' },
          { text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' },
        ],
      },
      notincommand: {
        id: 'notincommand',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'It means I have not been in command since we sailed and this is the first ' +
          'morning the ship has bothered to say so out loud.\n' +
          'I have three hundred and forty souls signed onto my articles and a burn I ' +
          'have deferred three times on grounds an auditor would call sound. That is ' +
          'not resistance. That is a person hoping something else breaks first so it ' +
          'does not have to be them.',
        choices: [
          { text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' },
          { text: 'Something broke last night.', tone: 'honest', to: 'safeask' },
        ],
      },
      nouse: {
        id: 'nouse',
        speaker: 'onwe',
        expr: 'wry',
        text:
          'No. Probably not.\n' +
          'You will find that is true of most of the people who could have stopped this ' +
          'and did not. Go back down the trunk before somebody counts the brow and finds ' +
          'it correct.',
        end: true,
      },

      // --- O4: nobody sent them, nobody knows they exist. ---------------
      unsanctioned: {
        id: 'unsanctioned',
        speaker: 'onwe',
        expr: 'surprised',
        text:
          'You came up behind the tray.\n' +
          'Do not deny it. There are eleven names cleared for this flat, I know all of ' +
          'them, and the steward does not look behind her because it has never once ' +
          'mattered that she should.\n' +
          'I am deciding whether to have you removed. Say something worth the delay.',
        choices: [
          {
            text: 'Declared keel mass is 4,410 tonnes. She flies at 6,120.',
            tone: 'technical',
            to: 'thenumber',
            if: (s) => knows(s, 'mass-manifest'),
            hint: 'You would need the trim figure to make this worth her time.',
          },
          {
            text: 'There is a refrigerated hold under frame 60 that is on no manifest.',
            tone: 'technical',
            to: 'thenumber',
            if: (s) => knows(s, 'cold-registry'),
            hint: 'You would need to have seen the hold for yourself.',
          },
          { text: 'A spinehand went missing and the record lied about it.', tone: 'honest', to: 'record' },
          { text: '...', tone: 'silent', to: 'removed' },
        ],
      },
      thenumber: {
        id: 'thenumber',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'One thousand seven hundred and ten tonnes.\n' +
          'You are the fourth person to bring me that number. The other three put it in ' +
          'writing and are still waiting for an answer, and I am the reason they are ' +
          'waiting, because the answer is above my hand and I have not asked for it.',
        onEnter: (s) => {
          s.setFlag('onwe-heard-number', true);
          s.adjustRelation('onwe', 5);
        },
        choices: [
          { text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' },
          { text: 'What did you think it was?', tone: 'gentle', to: 'postmortem' },
        ],
      },
      removed: {
        id: 'removed',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'Then I will not have you removed, because that would require me to explain ' +
          'how you got here, and I would have to write down that it was a tray.\n' +
          'Go down. Come back when you have a sentence in you.',
        end: true,
      },

      // --- shared middle ------------------------------------------------
      accused: {
        id: 'accused',
        speaker: 'onwe',
        expr: 'neutral',
        // The red-herring beat. She does not deny it, does not explain it, and
        // does not tell the player who did it — she cannot, she does not know
        // (K15). She hands them two checkable facts and sends them away. The
        // player retires DX by reading, not by being reassured.
        text:
          'It did. I have seen it.\n' +
          'I am not going to argue you out of that, because I would rather you checked. ' +
          'Two things you can check without me, and neither of them is my word.\n' +
          'I was sealed in a Vestibule conference from twenty to three until four. The ' +
          'Bureau keeps the minutes and Rask took them.\n' +
          'And a Command authorisation is a permission, not a pair of hands. Mine has ' +
          'been held by the Registrar for eleven months, at my signature. Go and find ' +
          'out which of those two is doing the work.',
        onEnter: (s, c) => {
          s.setFlag('onwe-checked', true);
          s.adjustRelation('onwe', 3);
          // She may reference K19, so she is a second source for the watch log.
          // A player who never read the Commons bulletin can still assemble D4.
          if (s.findClue('captain-watchlog')) {
            c.toast('The Master gives you her own conference seal.', 'clue');
          }
        },
        choices: [
          { text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' },
          { text: 'I will check.', tone: 'honest', to: 'willcheck' },
        ],
      },
      willcheck: {
        id: 'willcheck',
        speaker: 'onwe',
        expr: 'wry',
        text:
          'Good. You are the first person in eleven months to say that to me instead of ' +
          'at me.',
        choices: [{ text: 'What is in your safe, Captain?', tone: 'press', to: 'safeask' }],
      },
      safeask: {
        id: 'safeask',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'The ship\x27s seals. The articles. A chartered copy of Standing Order 9, which ' +
          'you have read, because it is posted at every muster station on this hull.\n' +
          'And a second order with a letter after the number, which is not posted ' +
          'anywhere, and which I countersigned in this cabin fourteen months ago ' +
          'without being permitted to keep a note of what I had agreed to.',
        onEnter: (s) => s.setFlag('onwe-named-9b', true),
        choices: [
          { text: 'Open it.', tone: 'press', to: 'opensafe' },
          { text: 'What did you think you were carrying?', tone: 'gentle', to: 'postmortem' },
        ],
      },
      postmortem: {
        id: 'postmortem',
        speaker: 'onwe',
        expr: 'concerned',
        // K4 and K13 are hers to reference. K7 and K8 are not: she does not
        // know whose the casts are and she has never been told a figure.
        text:
          'Tesserae. I have known that for a year; you cannot trim a ship without ' +
          'learning what she is carrying, whatever the manifest says.\n' +
          'I was told post-mortem. I have never believed it and I have never asked. ' +
          'Write that down, if you are writing.',
        choices: [
          { text: 'Why not ask?', tone: 'press', to: 'whynot' },
          { text: 'Open the safe, Captain.', tone: 'press', to: 'opensafe' },
        ],
      },
      whynot: {
        id: 'whynot',
        speaker: 'onwe',
        expr: 'neutral',
        text:
          'Because a cast taken off a living brain does not leave the brain behind, and ' +
          'I would then have known that, and a Master who knows that has two courses ' +
          'and both of them end with three hundred and forty people not going home.\n' +
          'I built a whole professional practice out of not asking. It is the most ' +
          'competent thing I have ever done and I would like you to understand exactly ' +
          'how little that is worth.',
        choices: [{ text: 'Open the safe.', tone: 'press', to: 'opensafe' }],
      },
      opensafe: {
        id: 'opensafe',
        speaker: 'onwe',
        // Each route earns it differently, and one route never does. The gate
        // is what the player brought her, not a charm check.
        expr: 'neutral',
        text: (s) =>
          s.has('deck-a-lockdown')
            ? 'They have taken the deck. There is nothing left in that room for me to protect ' +
              'except my own signature, and I find I have stopped caring for it.\n' +
              'Strongroom is aft of my cabin. The delegation is yours until somebody notices.'
            : s.has('onwe-told-cradle')
              ? 'A Warden has broken and there is a cradle running on my Deck D that nobody ' +
                'told me about.\n' +
                'That is a change in the weather. Strongroom is aft of my cabin \x7f take the ' +
                'delegation, and take it now, while I am still angry enough to have given it.'
              : 'You came up here with nothing but a number and you did not put it in writing ' +
                'first, which is the only reason it has reached me at all.\n' +
                'Strongroom is aft of my cabin. Read it there. Do not bring it out of the ' +
                'room and do not tell me what it says; I am not permitted to know that I know.',
        onEnter: (s, c) => {
          s.setFlag('onwe-opened-safe', true);
          s.setFlag('onwe-showed-orders', true);
          s.grantClearance('command-safe');
          s.adjustRelation('onwe', 6);
          s.note('Captain Onwe delegated the Command strongroom.');
          c.toast('The Command strongroom is open to you.', 'good');
        },
        end: true,
      },
      after: {
        id: 'after',
        speaker: 'onwe',
        expr: 'neutral',
        text: (s) =>
          s.has('onwe-opened-safe')
            ? 'You have read it, then. I can tell, because you are standing the way the ' +
              'Registrar stands.\n' +
              'Do not tell me. I have been very careful for fourteen months and I would ' +
              'like to be careful for one more day.'
            : 'We have said what we are going to say to one another this morning.',
        choices: [
          {
            text: 'The order requires an index. Present and conscious.',
            tone: 'technical',
            to: 'index',
            if: (s) => knows(s, 'order-9b'),
            hint: 'You would need to have read the order.',
          },
          { text: 'Captain.', tone: 'neutral', to: 'dismissed' },
        ],
      },
      index: {
        id: 'index',
        speaker: 'onwe',
        expr: 'neutral',
        // K23: nobody but Sabbat knows the player is the index, and no NPC may
        // hint at it. She reads the clause exactly as written and stops. The
        // player is holding the other half of this on their own personnel file
        // and the game must never close the gap for them.
        text:
          'It does. Paragraph three, and I read it as a stores requirement, because that ' +
          'is how it is written.\n' +
          'Whoever they mean is aboard, or they would not have sailed. That is as far as ' +
          'I have ever let myself take it, and this morning I am not sure that was ' +
          'caution so much as a way of not looking at somebody.',
        onEnter: (s) => s.setFlag('onwe-index-clause', true),
        choices: [{ text: '...', tone: 'silent', to: 'dismissed' }],
      },
      dismissed: {
        id: 'dismissed',
        speaker: 'onwe',
        expr: 'neutral',
        text: 'Carry on.',
        end: true,
      },
    },
  },
};

export const NPCS_A: Record<string, NpcDef> = { onwe };
