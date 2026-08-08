/**
 * Deck C — the Chapter One playfield.
 *
 * Six rooms, each with a distinct floor family, wall family, light colour and
 * landmark, so a player who looks up from the dialogue box knows where they
 * are without reading a sign. Marks (digits and symbols) attach interaction
 * points, doors, spawns and NPC anchors to specific tiles.
 */

import { AMBIENT, RoomDef } from '@/world/map';
import { ROOMS_D } from '@/data/deck-d';
import { ROOMS_B } from '@/data/deck-b';
import { ROOMS_E } from '@/data/deck-e';
import { ROOMS_A } from '@/data/deck-a';
import { PAL } from '@/art/palette';

const CARPET = ['floor.carpet.a', 'floor.carpet.b', 'floor.carpet.worn'];
const COMMONS = ['floor.commons.a', 'floor.commons.b'];
const PLATE = ['floor.plate.a', 'floor.plate.b', 'floor.plate.c', 'floor.plate.worn'];
const REGISTRY = ['floor.registry.a', 'floor.registry.b'];
const MESH = ['floor.mesh.a', 'floor.mesh.b'];

// =====================================================================
// C-BUNK — Berth 14. Where the player wakes and where Hessa slept.
// =====================================================================
const cBunk: RoomDef = {
  id: 'c-bunk',
  name: 'BERTH 14 \x7f HABITATION RING',
  deck: 'C',
  department: 'habitation',
  ambient: AMBIENT.warm,
  ambience: 'hab',
  landmark: 'Two rows of stacked bunks and a rug nobody has replaced in nine years.',
  wall: 'hab',
  floor: CARPET,
  layout: [
    '########################',
    '########################',
    '###G##########G#########',
    '#......................#',
    '#.BbK..........KBb....E#',
    '#......................#',
    '#.T....rrr.........2...#',
    '#.v....rrr.............#',
    '#.BbK..........K1b.....#',
    '#......................#',
    '#.........P.......N....#',
    '#......................#',
    '#..........$...........#',
    '##########DD############',
  ],
  marks: {
    '1': {
      prop: 'prop.locker.open',
      solid: true,
      interact: 'hessa-locker',
    },
    '2': { prop: 'prop.bunk.head', solid: true, interact: 'player-bunk' },
    $: { spawn: 'default' },
    D: { door: { to: 'c-corridor', spawn: 'from-bunk' }, spawn: 'from-corridor' },
    N: { prop: 'prop.bulletin', solid: true, interact: 'berth-notice' },
  },
};

// =====================================================================
// C-CORRIDOR — the ring. Every route crosses it, so it earns real detail.
// =====================================================================
const cCorridor: RoomDef = {
  id: 'c-corridor',
  name: 'HABITATION RING \x7f FRAME 44',
  deck: 'C',
  department: 'spine',
  ambient: AMBIENT.dim,
  ambience: 'hab',
  landmark: 'A curved corridor with a yellow hazard stripe running its whole length.',
  wall: 'iron',
  floor: PLATE,
  layout: [
    '################################',
    '################################',
    '##G########G#######G########G###',
    '#.L...........................##',
    '#.fS....E.........Y......S....##',
    '#=%%%%%%%%%%%%%%%%%%%%%%%%%%%=##',
    '#.............................##',
    '#....\\...........\\............##',
    '#.............................##',
    '#..1.......2.........3....4...##',
    '###B#######C#########W####M#####',
    '################################',
  ],
  marks: {
    '1': { door: { to: 'c-bunk', spawn: 'from-corridor' }, spawn: 'from-bunk' },
    '2': { door: { to: 'c-commons', spawn: 'from-corridor' }, spawn: 'from-commons' },
    '3': { door: { to: 'c-muster', spawn: 'from-corridor' }, spawn: 'from-muster' },
    '4': {
      door: {
        to: 'c-watch',
        spawn: 'from-corridor',
        locked: 'watch-office',
        refuse: 'The Watch office door reads your tessera and does not open. A tone, once.',
      },
      spawn: 'from-watch',
    },
    L: {
      prop: 'lift.panel',
      solid: true,
      interact: 'lift-panel',
      light: { r: 20, color: PAL.halo3, i: 0.3 },
    },
    f: { spawn: 'from-lift' },
    B: { prop: 'prop.sign.dept', solid: true },
    C: { prop: 'prop.sign.dept', solid: true },
    W: { prop: 'prop.sign.dept', solid: true },
    M: { prop: 'prop.sign.dept', solid: true },
    '5': { npc: 'ivo' },
  },
};

// =====================================================================
// C-COMMONS — galley and mess. Warmest room on the deck; gossip hub.
// =====================================================================
const cCommons: RoomDef = {
  id: 'c-commons',
  name: 'THE COMMONS \x7f DECK C MESS',
  deck: 'C',
  department: 'commons',
  ambient: AMBIENT.warm,
  ambience: 'commons',
  landmark: 'A long serving counter, a dented kettle, and the trim readout nobody reads.',
  wall: 'hab',
  floor: COMMONS,
  layout: [
    '############################',
    '############################',
    '##G##########G#########G####',
    '#..........................#',
    '#.qQQQe...........1........#',
    '#.....J....................#',
    '#..........................#',
    '#..TTt.......TTt......N....#',
    '#..cvc.......cvc...........#',
    '#..........................#',
    '#..TTt.......TTt......P....#',
    '#..cvc.......cvc...........#',
    '#.........@................#',
    '#############DD#############',
  ],
  marks: {
    '1': { prop: 'prop.console.a', solid: true, interact: 'trim-readout' },
    N: { prop: 'prop.bulletin', solid: true, interact: 'commons-bulletin' },
    '@': { spawn: 'default' },
    D: { door: { to: 'c-corridor', spawn: 'from-commons' }, spawn: 'from-corridor' },
    '&': { npc: 'fen' },
    '*': { npc: 'cael' },
  },
};

// =====================================================================
// C-MUSTER — watch handover, roster terminal, and the duct hatch.
// =====================================================================
const cMuster: RoomDef = {
  id: 'c-muster',
  name: 'MUSTER STATION \x7f THIRD WATCH',
  deck: 'C',
  department: 'registry',
  ambient: AMBIENT.cool,
  ambience: 'registry',
  landmark: 'A roster terminal on a steel pillar, and a sealed duct hatch in the far wall.',
  wall: 'reg',
  floor: REGISTRY,
  layout: [
    '##########################',
    '##########################',
    '##G##############G########',
    '#........................#',
    '#...U.................k..#',
    '#........................#',
    '#....n........n..........#',
    '#........................#',
    '#..X.x................Y..#',
    '#..Z..................O..#',
    '#........................#',
    '#..........@.......32....#',
    '#############DD###########',
  ],
  marks: {
    U: { prop: 'prop.muster', solid: true, interact: 'muster-terminal' },
    '2': {
      prop: 'hatch.closed',
      solid: true,
      interact: 'duct-hatch',
      light: { r: 20, color: PAL.ember2, i: 0.25, flicker: 0.3 },
    },
    '3': { spawn: 'from-duct' },
    '@': { spawn: 'default' },
    D: { door: { to: 'c-corridor', spawn: 'from-muster' }, spawn: 'from-corridor' },
    '&': { npc: 'stray' },
    '*': { npc: 'ivo' },
  },
};

// =====================================================================
// C-WATCH — Warden Trave's office. Small, close, and badly lit on purpose.
// =====================================================================
const cWatch: RoomDef = {
  id: 'c-watch',
  name: "SHIP'S WATCH \x7f DECK C OFFICE",
  deck: 'C',
  department: 'security',
  ambient: AMBIENT.gloom,
  ambience: 'watch',
  landmark: 'One desk, one lamp, and a wall of shelved incident slates.',
  wall: 'iron',
  floor: PLATE,
  layout: [
    '####################',
    '####################',
    '##########G#########',
    '#..................#',
    '#.kkk.........1....#',
    '#..................#',
    '#......TTt.........#',
    '#......cvc.........#',
    '#..................#',
    '#.2...........3....#',
    '#........@.........#',
    '#########DD#########',
  ],
  marks: {
    '1': { prop: 'prop.terminal', solid: true, interact: 'watch-terminal' },
    '2': { prop: 'prop.locker', solid: true, interact: 'trave-bin' },
    '3': { prop: 'prop.locker', solid: true, interact: 'watch-keyrack' },
    '@': { spawn: 'default' },
    D: { door: { to: 'c-corridor', spawn: 'from-watch' }, spawn: 'from-corridor' },
    '&': { npc: 'trave' },
  },
};

// =====================================================================
// SPINE-DUCT — restricted. Above the Cold Registry. The chapter's set-piece.
// =====================================================================
const spineDuct: RoomDef = {
  id: 'spine-duct',
  name: 'SPINE DUCT 9-C \x7f OVER COLD REGISTRY',
  deck: 'Spine',
  department: 'cargo',
  ambient: AMBIENT.gloom,
  ambience: 'spine',
  music: 'tense',
  landmark: 'A crawl of diamond mesh over a hold that is not on any manifest.',
  wall: 'spine',
  floor: MESH,
  layout: [
    '################################',
    '################################',
    '#..............................#',
    '#.\\\\..........\\\\......\\\\.......#',
    '#..............................#',
    '#....1.......2........3........#',
    '#..............................#',
    '#.......~~~~~~~~~~~~~..........#',
    '#.........................U....#',
    '#..g......................g....#',
    '#....@....................4....#',
    '#DD#############################',
  ],
  marks: {
    '1': { prop: 'prop.debris', interact: 'duct-scuff' },
    '2': { prop: 'prop.valve', solid: true, interact: 'duct-valve' },
    '3': {
      prop: 'prop.crate.tessera',
      solid: true,
      interact: 'registry-overlook',
      light: { r: 34, color: PAL.halo3, i: 0.5 },
    },
    '4': { interact: 'sentinel-post' },
    '@': { spawn: 'default' },
    D: { door: { to: 'c-muster', spawn: 'from-duct' }, spawn: 'from-muster' },
    /**
     * The crawl forward to Deck A. It has to exist here as well as at the far
     * end, or the spine route is one-way: the player could drop out of Command
     * into the duct and never climb back the way they came.
     *
     * Locked for the whole of Chapter One, and that is canon rather than
     * pacing. The chapter's red herring points at the Captain, so the Captain
     * must be unreachable; an unlocked hatch here would let a player walk up
     * and ask her, and deduction D-X would never land.
     */
    U: {
      door: {
        to: 'a-spine',
        spawn: 'from-duct',
        tile: 'hatch.closed',
        locked: 'spine-command',
        refuse:
          'The crawl runs forward under the command flat. The hatch at the far end is dogged from the other side.',
      },
      spawn: 'from-command-crawl',
    },
  },
};

export const ROOMS: Record<string, RoomDef> = {
  ...ROOMS_A,
  ...ROOMS_D,
  ...ROOMS_B,
  ...ROOMS_E,
  'c-bunk': cBunk,
  'c-corridor': cCorridor,
  'c-commons': cCommons,
  'c-muster': cMuster,
  'c-watch': cWatch,
  'spine-duct': spineDuct,
};

export const ROOM_ORDER = Object.keys(ROOMS);
