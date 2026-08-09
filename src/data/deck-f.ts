/**
 * Deck F — the hold.
 *
 * The bottom of the ship and the bottom of the argument. Deck A is what the
 * money buys; Deck F is what the money is standing on. Every room down here is
 * larger than it needs to be, colder than the deck above it, and lit by fewer
 * fixtures than any space this size would be given if a person were expected to
 * work in it. Nobody is. There is not one crew member posted to Deck F, no
 * schedule runs through it, and the ship's company were stood off it for the
 * nineteen shifts it took to load — which is why five rooms of this size can sit
 * under a habitation ring of two hundred and twelve people and never come up in
 * conversation.
 *
 * The seam in the story is physically here. Declared 4,410 t, flown at 6,120 t,
 * and the missing 1,710 t is a refrigerated vault with its own shell, its own
 * plant, its own power and its own ballast, welded inside Hold 4's aft bulkhead
 * by a yard that was not asked to draw it. The keel in Hold 4 is honest and
 * complete — that matters, and the hold is built to let the player check it,
 * because the innocent explanation (somebody mis-weighed the cargo) has to be
 * killable by walking the length of nine cradles and counting.
 *
 * ACCESS DESIGN — why the deck is gated, and gated on what.
 *
 * Deck F is sealed for the whole of Chapter One. That is not pacing and it is
 * not caution; it is the only way the chapter survives. `SHIP_LAYOUT.md` records
 * the intent as "seen, never entered", and the structural reasons hold up:
 *
 *  - The chapter is about a missing spinehand. The Cold Registry is about
 *    ninety-one thousand missing people. Put both in reach at 04:00 and no
 *    player on earth keeps looking for Hessa Quill, and Chapter One stops being
 *    the story it is.
 *  - The evidence economy breaks. Standing in this vault hands the player D2,
 *    D6 and most of D7 out of one room. Canon §9 forbids a character from
 *    monologuing the truth; a room can monologue too, and this one would.
 *  - The set-piece dies. "Hold Your Breath" is the chapter's obstacle, and its
 *    prize is a *glimpse* — mesh, distance, cold air, cyan. If the duct is
 *    merely the corridor to the biggest room in the game, it is a corridor.
 *
 * So the gate is real, and it is hung on flags that something actually sets:
 *
 *  - The lift stop is LISTED from the first time the player opens the panel and
 *    REFUSED, with a refusal that changes once they have seen the hold from
 *    above (`saw-cold-registry`, set by `registry-overlook` in content.ts).
 *    Hiding the deck would have been worse: a sealed deck the player can read
 *    the seal on is a question; a deck that is not on the list is nothing.
 *  - `cargo-deck` — the lift. Granted by `openChapterTwo` for O1, O2 and O4.
 *  - `spine-registry` — the crawl down out of duct 9-C, straight into the vault.
 *    Granted by `openChapterTwo` for O3 ONLY. The Ninth Watch route is barred
 *    from the lift (they are on a list) and does not need it; they arrive in the
 *    Cold Registry first and the deck second, and nothing logs them doing it.
 *  - `cold-registry` — the vault door itself, off the plant room. Granted in
 *    world, by turning the wheel, by anyone standing in front of it. The door
 *    has no lock. It has a log. What it costs is that the Registry now holds an
 *    unrevisable record of your tessera opening it, and the game says so before
 *    you do it and charges suspicion when you do.
 *
 * Two ways in, and they are not equivalent: one is expensive and quiet, the
 * other is free and recorded. That difference is the whole of the deck's
 * access design, and it is the same shape as Deck A's — two prizes, no route
 * that hands you both.
 *
 * A note on light. Deck A's problem was headroom: `lit` at 1.0 left nowhere for
 * a lamp to go and the bridge clipped to a white field. Deck F has the opposite
 * budget and the identical discipline. The ambient here runs 0.60 to 0.76, so a
 * fixture has room — which is exactly why there are so few of them. Darkness on
 * this deck is authored by SUBTRACTION (two ceiling lamps for a thirty-four-tile
 * hold) and never by dropping the ambient, because an ambient low enough to hide
 * a room also hides the floor the player is trying to read.
 */

import { AMBIENT, RoomDef } from '@/world/map';
import { Clue, Deduction, InteractDef, clearancesOf } from '@/data/content';
import { GameState } from '@/game/state';
import { PAL } from '@/art/palette';

const RIVET = ['floor.rivet', 'floor.plate.b'];
const WORN = ['floor.plate.worn', 'floor.plate.c', 'floor.plate.a'];
const GRATE = ['floor.grate.a', 'floor.grate.b'];
const REGISTRY = ['floor.registry.a', 'floor.registry.b'];
const MESH = ['floor.mesh.a', 'floor.mesh.b'];

// =====================================================================
// F-LANDING — the lift landing and the cargo office, frame 58. The only
// room on the deck with a working overhead and a chair, and the chair has
// been pushed in for fourteen months. Riveted deck plate, iron, amber:
// this is the last piece of ordinary ship before the hold.
// =====================================================================
const fLanding: RoomDef = {
  id: 'f-landing',
  name: 'LIFT LANDING \x7f CARGO OFFICE, FRAME 58',
  deck: 'F',
  department: 'cargo',
  ambient: AMBIENT.dim,
  ambience: 'cargo',
  music: 'investigate',
  landmark: 'A cargo desk with one chair pushed in, under the only overhead on the deck that still works.',
  wall: 'iron',
  floor: RIVET,
  layout: [
    '######################',
    '######################',
    '######################',
    '#....................#',
    '#..L....G.......N....#',
    '#..f.................#',
    '#..........s.........#',
    '#..M.......E....Z....#',
    '#..............x.....#',
    '#..n.................#',
    '#####HH#######SS######',
  ],
  marks: {
    L: {
      prop: 'lift.panel',
      solid: true,
      interact: 'lift-panel',
      light: { r: 18, color: PAL.amber2, i: 0.26 },
    },
    // The landing spawn, deliberately off the lift panel tile so the player
    // arrives standing in the room rather than inside its furniture.
    f: { spawn: 'default' },
    M: { prop: 'prop.terminal', solid: true, interact: 'cargo-desk' },
    N: { prop: 'prop.bulletin', solid: true, interact: 'f-signage' },
    n: { prop: 'prop.bench', solid: true },
    H: { door: { to: 'f-hold', spawn: 'from-landing' }, spawn: 'from-hold' },
    S: { door: { to: 'f-shuttle', spawn: 'from-landing' }, spawn: 'from-shuttle' },
    // One lamp, and it has to carry the whole warm read of the room against a
    // fixture whose own colour is baked cool in the atlas \x7f so the mark light
    // is nearly as strong as the fixture's rather than a tint on top of it.
    // At an ambient of 0.76 that is still only a pool, which is the point: the
    // office is the last lit place on Deck F and it is lit by one bulb.
    G: { over: 'prop.light.ceiling', light: { r: 50, color: PAL.amber2, i: 0.44 } },
  },
};

// =====================================================================
// F-HOLD — Hold 4, declared cargo. Nine sections of relay keel in nine
// cradles, a hazard lane down the middle of them, and two ceiling lamps
// for a hall thirty-four tiles across. The room's job is to be checkable:
// the manifest is right about the keel, so whatever else the ship weighs,
// it is not this.
//
// The far wall is the point. A patch of iron panel in a spine bulkhead —
// a second wall welded inside the first, with a door in it, on no drawing.
// =====================================================================
const fHold: RoomDef = {
  id: 'f-hold',
  name: 'HOLD 4 \x7f DECLARED CARGO',
  deck: 'F',
  department: 'cargo',
  ambient: AMBIENT.gloom,
  ambience: 'cargo',
  music: 'tense',
  landmark: 'Nine cradles of relay keel in a row, and an aft bulkhead welded inside the aft bulkhead.',
  wall: 'spine',
  floor: WORN,
  layout: [
    '##################################',
    '##################################',
    '########BBBBVVBBBB################',
    '#.......%%%%%%%%%%...............#',
    '#................................#',
    '#..g.........................g...#',
    '#..p------p..p------p..p------p..#',
    '#..p------p..p------p..p------p..#',
    '#................................#',
    '#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#',
    '#................................#',
    '#..p------p..p--K---p..p------p..#',
    '#..p------p..p------p..p------p..#',
    '#................................#',
    '#..g.........................g...#',
    '#..p------p..p------p..p------p..#',
    '#..p------p..p------p..p------p..#',
    '#............$...................#',
    '#..Z.x..X.......O...Y......E.....#',
    '#############UU###################',
  ],
  marks: {
    // Each section is two tiles thick with a flange at both ends, because one
    // row of pipe reads as a handrail. A relay mast in transit is a cylinder
    // you could drive a lorry through, and the hold has to look like it is
    // holding something before the player is told it is holding everything it
    // declares.
    p: { prop: 'prop.pipe.elbow', solid: true },
    K: { prop: 'prop.pipe.h', solid: true, interact: 'keel-cradles' },
    // The welded bulkhead: iron panel set into a spine wall, so the patch is
    // legible as a patch before the player reads a word about it.
    B: { prop: 'wall.iron.panel', solid: true, interact: 'hold-bulkhead' },
    V: { door: { to: 'f-plant', spawn: 'from-hold' }, spawn: 'from-plant' },
    U: { door: { to: 'f-landing', spawn: 'from-hold' }, spawn: 'from-landing' },
    $: { spawn: 'default' },
    // There is no ceiling lighting in Hold 4 at all. Four emergency fixtures
    // for a hall thirty-four tiles across, and emergency fixtures are what a
    // space gets when nobody expects a person in it. That absence is the room's
    // whole colour identity: the landing one door away is cool white and amber,
    // and the moment the player steps through, the light goes orange and sparse
    // and they can see it happen.
    g: {
      over: 'prop.light.emergency',
      light: { r: 40, color: PAL.amber1, i: 0.38, flicker: 0.16 },
    },
  },
};

// =====================================================================
// F-PLANT — the Cold Registry's machinery: refrigeration set, atmosphere
// plant, and a power feed spliced off the ring main by somebody who was
// not going to be asked about it. Grate over a sump, spine walls, red
// working light. The 1,673 tonnes of "shell" is legible here as objects.
//
// This is also the antechamber. The vault door is in the forward wall and
// there is nothing beside it but a wheel and a card in a brass frame.
// =====================================================================
const fPlant: RoomDef = {
  id: 'f-plant',
  name: 'REGISTRY PLANT \x7f REFRIGERATION AND ATMOSPHERE',
  deck: 'F',
  department: 'cargo',
  ambient: AMBIENT.emergency,
  ambience: 'cargo',
  music: 'tense',
  landmark: 'A refrigeration set the size of a lifeboat, and a vault door with a card in a brass frame beside it.',
  wall: 'iron',
  floor: GRATE,
  layout: [
    '##########################',
    '##########################',
    '########WDDW##############',
    '#........................#',
    '#..F...|..|..|...F.......#',
    '#......|..|..|...........#',
    '#..V.j.|..|..|.j.V...P...#',
    '#........................#',
    '#..g.................g...#',
    '#..R..........O..O.......#',
    '#........................#',
    '#....j...$.......j.......#',
    '#..x..Y..............E...#',
    '#########UU###############',
  ],
  marks: {
    // The gate. The door reports the refusal; the wheel beside it is what
    // actually decides, and it decides by telling the player the price first.
    D: {
      door: {
        to: 'f-registry',
        spawn: 'from-plant',
        locked: 'cold-registry',
        refuse:
          'COLD REGISTRY \x7f the door is shut on its seal and there is a rime of frost on the dogs. ' +
          'It is not locked. It is closed, and closed is a different problem.',
      },
      spawn: 'from-registry',
    },
    W: { prop: 'prop.valve', solid: true, interact: 'vault-dogs' },
    P: {
      prop: 'prop.console.dead',
      solid: true,
      interact: 'plant-plate',
      light: { r: 14, color: PAL.brine4, i: 0.16 },
    },
    R: { prop: 'prop.breaker', solid: true, interact: 'plant-power' },
    U: { door: { to: 'f-hold', spawn: 'from-plant' }, spawn: 'from-hold' },
    $: { spawn: 'default' },
    // No ceiling lamp anywhere in this room. Plant spaces are lit by the
    // fixtures bolted to the plant, which is why the light is at head height
    // and comes from two places instead of six.
    g: {
      over: 'prop.light.emergency',
      light: { r: 36, color: PAL.ember2, i: 0.42, flicker: 0.18 },
    },
    // Fitters' hand lamps clipped to the pipe runs. No prop, because there is
    // nothing to look at: what the player sees is a warm patch on the grate
    // with no fixture over it, four times, and the middle of the room stops
    // being a hole.
    j: { light: { r: 26, color: PAL.rust3, i: 0.3 } },
  },
};

// =====================================================================
// F-REGISTRY — THE COLD REGISTRY.
//
// The strongest single beat in the game, and it is built out of restraint.
// Eight bays of racking, a plate at the head of each giving a range of
// serials, an index console that will tell you where any one of them is,
// and mesh in the deckhead that the player has already lain on.
//
// Rules held to here:
//  - No body, no shock, no reveal. The room states ranges and temperatures.
//    Everything that makes it unbearable is arithmetic the player does.
//  - It is the only clean room on Deck F. The rest of the deck is worn plate
//    and rust; this is registry tile and reg walls, because the vault was not
//    built by the ship or for it.
//  - `silence` ambience, which no room in the game has ever selected. Canon
//    §9: the ship is loud, and silence is a thing that happens, and it is
//    worse. This is the place it happens.
//  - The cyan has no fixture. Two invisible sources plus whatever the racking
//    itself gives off, because a vault where you cannot find the lamp is a
//    vault that is lit by its contents.
// =====================================================================
const fRegistry: RoomDef = {
  id: 'f-registry',
  name: 'THE COLD REGISTRY',
  deck: 'F',
  department: 'registry',
  ambient: AMBIENT.gloom,
  ambience: 'silence',
  music: 'weight',
  landmark: 'Eight bays of racked ceramic under cyan light, and a run of mesh overhead you have already crawled.',
  wall: 'reg',
  floor: REGISTRY,
  // Eight bays: four each side of a centre aisle, and a lit head at BOTH ends
  // of every bay rather than only the top. The first pass put the cyan on one
  // row and the room went out from under it \x7f a hall this tall showed the
  // player five rows of unlit shelving and nothing to walk towards.
  layout: [
    '######################################',
    '######################################',
    '######################################',
    '#....................................#',
    '#..t..t..t..t.....I.....t..t..t..t...#',
    '#..A..A..A..A...........A..A..A..A...#',
    '#..A..A..A..A.....C.....A..A..A..A...#',
    '#..A..A..A..A...........A..A..A..A...#',
    '#..A..A..A..A...........A..A..A..A...#',
    '#..t..t..t..t.....G.....t..t..t..t...#',
    '#....................................#',
    '#..G.....~~~~~~~~~~~~~~~~~~......G...#',
    '#..........o.........................#',
    '#..........H......G..................#',
    '#..............$.....................#',
    '#....................................#',
    '##############DD######################',
  ],
  marks: {
    // Bay heads. `prop.crate.tessera` carries its own halo in the atlas, so
    // eight of them is the whole cyan budget and they get no mark light on
    // top of it. The other forty-eight rack tiles are unlit shelving: if
    // every tile glowed, the room would be a flat cyan field and the racking
    // would stop having a shape.
    t: { prop: 'prop.crate.tessera', solid: true, interact: 'ledger-racks' },
    A: { prop: 'prop.locker.tall', solid: true, interact: 'ledger-racks' },
    I: {
      prop: 'prop.console.b',
      solid: true,
      interact: 'registry-index',
      light: { r: 24, color: PAL.halo3, i: 0.32 },
    },
    C: {
      prop: 'prop.console.dead',
      solid: true,
      interact: 'vault-thermostat',
      light: { r: 14, color: PAL.brine4, i: 0.18 },
    },
    // The floor under the mesh. No prop: the interaction is looking up.
    o: { interact: 'registry-underside' },
    // The crawl back into duct 9-C. Unlocked from this side by design — a
    // cold store you cannot leave is not a store, it is a fitting — and it is
    // the permanent spine shortcut this deck earns. Spine geometry never
    // decays (GAME_DESIGN.md §4.1): once the player knows this ladder is
    // here, nothing on the ship can take it away from them.
    H: {
      door: { to: 'spine-duct', spawn: 'from-registry', tile: 'ladder' },
      spawn: 'from-duct',
    },
    D: { door: { to: 'f-plant', spawn: 'from-registry' }, spawn: 'from-plant' },
    $: { spawn: 'default' },
    // Sourceless. There is no lamp tile under any of these; the light is simply
    // in the room and the player cannot point at where it comes from. Four of
    // them, strong, because this is the one space on Deck F that is supposed to
    // be legible \x7f the vault is not hiding anything, it is filed.
    G: { light: { r: 54, color: PAL.halo2, i: 0.44 } },
  },
};

// =====================================================================
// F-SHUTTLE — Shuttle Bay 2. The largest empty volume aboard and the only
// opening in the hull below the Master's ports. Mesh underfoot, spine
// walls, cold white bay lighting: the one room on Deck F that is lit
// properly, because a bay that is worked in the dark kills people.
//
// The tender is a block of hull plate with a sealed hatch in it. There is
// no shuttle tile in the atlas and there does not need to be: what the
// player has to read is a mass in a cradle with a Board seal on the door,
// and hull panel over hazard stripe says that in the tile set that exists.
// =====================================================================
const fShuttle: RoomDef = {
  id: 'f-shuttle',
  name: 'SHUTTLE BAY 2',
  deck: 'F',
  department: 'cargo',
  ambient: AMBIENT.gloom,
  ambience: 'cargo',
  music: 'investigate',
  landmark: 'A tender in her cradle with a Board seal across the hatch, under outer doors the width of the ship.',
  wall: 'spine',
  floor: MESH,
  layout: [
    '##############################',
    '##############################',
    '#####SSSSSSSSSSSSSSSS#########',
    '#............................#',
    '#..//////////////////////....#',
    '#..|.TTTTTTTTTTTT........|...#',
    '#..|.TTTTThTTTTTT........|...#',
    '#..|.TTTTTTTTTTTT........|...#',
    '#%%%%%%%%%%%%%%%%%%%%%%%%%%%%#',
    '#............................#',
    '#..G......................G..#',
    '#....Z..x.........O....Y.....#',
    '#..........$.................#',
    '#........m.......ZxZ.........#',
    '#..n.............ZZZ......n..#',
    '#############UU###############',
  ],
  marks: {
    S: { prop: 'door.sealed', solid: true, interact: 'bay-doors' },
    T: { prop: 'wall.iron.panel', solid: true },
    h: {
      prop: 'hatch.closed',
      solid: true,
      interact: 'bay-tender',
      // The seal tell-tale. The only red on the deck outside the plant, and it
      // is on the one object aboard that could take a person off the ship.
      light: { r: 18, color: PAL.ember2, i: 0.4 },
    },
    m: { prop: 'prop.terminal', solid: true, interact: 'bay-log' },
    n: { prop: 'prop.bench', solid: true },
    U: { door: { to: 'f-landing', spawn: 'from-shuttle' }, spawn: 'from-landing' },
    $: { spawn: 'default' },
    // Bay floods: bone from the fixture, brine on top. Two of them for the
    // whole bay, which still leaves the far corners dark and is still four
    // times the light per square metre that Hold 4 gets, because a bay that is
    // worked in the dark kills people and a hold that is never worked at all
    // does not.
    G: { over: 'prop.light.ceiling', light: { r: 54, color: PAL.brine4, i: 0.36 } },
  },
};

export const ROOMS_F: Record<string, RoomDef> = {
  'f-landing': fLanding,
  'f-hold': fHold,
  'f-plant': fPlant,
  'f-registry': fRegistry,
  'f-shuttle': fShuttle,
};

// =====================================================================
// Clues
//
// Three. One is paperwork, one is a builder's plate, and one is the thing
// itself. Each states fields and nothing else; every conclusion in the
// deductions below is arithmetic the player performs on those fields.
// =====================================================================
export const CLUES_F: Record<string, Clue> = {
  'consignment-log': {
    id: 'consignment-log',
    title: 'HOLD 4-A LOADING RECORD',
    // Nineteen shifts. The player cannot decode that in Chapter Two and is not
    // meant to; Kest Harbour was cast over nineteen days and the number is here
    // to be remembered, not solved. Nothing in this clue or anywhere on the
    // deck draws the line between the two.
    text:
      'HOLD 4-A \x7f SPECIAL CONSIGNMENT \x7f LOADING RECORD.\n' +
      'LOADED ALONGSIDE BEFORE SAILING, OVER NINETEEN SHIFTS.\n' +
      'LOADING PARTY: CONTINUANCE BOARD \x7f OWN LABOUR, OWN GEAR, OWN LIFT.\n' +
      'SHIP\x27S COMPANY: STOOD OFF DECK F FOR THE DURATION.\n' +
      'DECLARED MASS: [    ]\n' +
      'COUNTERSIGNED: I. SABBAT, REGISTRAR.\n' +
      'Every field on the form is completed except the one the form exists to carry.',
    source: 'Loading records, Deck F',
    kind: 'record',
  },
  'vault-plate': {
    id: 'vault-plate',
    title: "THE VAULT'S BUILDER PLATE",
    text:
      'BUILDER\x27S PLATE \x7f COLD REGISTRY INSTALLATION \x7f STRUCTURAL SCHEDULE.\n' +
      'VAULT SHELL AND ISOLATION LATTICE .... 1,204 t\n' +
      'PLANT, POWER, ATMOSPHERE ............... 288 t\n' +
      'TRIM BALLAST ........................... 181 t\n' +
      'CONSIGNMENT ............................. 37 t\n' +
      'TOTAL ................................ 1,710 t\n' +
      'Thirty-seven tonnes of consignment in one thousand six hundred and seventy-three ' +
      'tonnes of building.',
    source: 'Registry plant, Deck F',
    kind: 'record',
  },
  'ledger-racks': {
    id: 'ledger-racks',
    title: 'THE RACKS',
    text:
      'Eight bays of racking, floor to overhead. A plate at the head of each gives a range.\n' +
      'BAY 1 \x7f KH-00001 TO KH-11425.\n' +
      'BAY 8 \x7f KH-79976 TO KH-91400.\n' +
      'Contiguous, end to end, no gaps and no reissues. Ninety-one thousand four hundred.\n' +
      'The vault is held at minus nineteen. Every tile in it is faintly warm, and warm at ' +
      'minus nineteen means drawing power.',
    source: 'The Cold Registry, Deck F',
    kind: 'physical',
  },
};

// =====================================================================
// Deductions
//
// D9 and D10 are the two halves of the mass discrepancy finally closing:
// what the weight IS, and who put it aboard. D11 is the count.
//
// None of them can be reached from Deck F alone. Every requirement set
// pairs something found down here with something found somewhere else —
// the trim readout in the Commons, a serial scanned off a revenant, the
// order in the Command safe, the glimpse through the mesh. The biggest
// room in the game still cannot prove anything by itself.
// =====================================================================
export const DEDUCTIONS_F: Record<string, Deduction> = {
  D9: {
    id: 'D9',
    claim: 'The vault was built, not loaded.',
    requires: [
      ['vault-plate', 'mass-manifest'],
      ['vault-plate', 'ledger-racks'],
      ['vault-plate', 'cold-registry'],
    ],
    conclusion:
      'Thirty-seven tonnes of tile inside one thousand six hundred and seventy-three tonnes of ' +
      'shell, lattice, plant and ballast. Nobody spends forty-five tonnes of ship on one tonne ' +
      'of cargo. They did not pack the consignment. They built it a house and then flew the house.',
  },
  D10: {
    id: 'D10',
    claim: 'The Board loaded her, and the ship was made to look away.',
    requires: [
      ['consignment-log', 'mass-manifest'],
      ['consignment-log', 'ledger-racks'],
      ['consignment-log', 'cold-registry'],
    ],
    conclusion:
      'Nineteen shifts alongside, Board labour, Board gear, Board lift, and the ship\x27s company ' +
      'stood off their own deck for the whole of it. The mass field is the only one left blank, ' +
      'and a Registrar countersigned it blank.',
  },
  D11: {
    id: 'D11',
    claim: 'The consignment is a town.',
    requires: [
      ['ledger-racks', 'tessera-serial'],
      ['ledger-racks', 'order-9b'],
    ],
    conclusion:
      'Ninety-one thousand four hundred casts under one place code, contiguous, no gaps and no ' +
      'reissues. Nobody archives a town one funeral at a time. This went onto tile all at once ' +
      'and in order, and all of it is riding forward of frame sixty at minus nineteen degrees.',
  },
};

// =====================================================================
// Interactables
//
// Declared here and spread into INTERACTABLES in content.ts, the way Deck
// A does it. `tools/reachability.mjs` reads this file for the declaration
// block and checks every id against an `interact:` in the room table, so
// an interactable written here and never placed will fail the build.
// =====================================================================
const cleared = (s: GameState, c: string) => clearancesOf(s).includes(c);

export const INTERACTABLES_F: Record<string, InteractDef> = {
  'f-signage': {
    id: 'f-signage',
    label: 'Deck signage',
    run: () => ({
      lines: [
        'DECK F \x7f CARGO. HOLDS 1 TO 4 \x7f SHUTTLE BAY 2 \x7f TRIM AND BALLAST.',
        'Below the printed board, a card in a clip that has been there long enough to yellow: ' +
          'HOLD 4 \x7f NO ADMITTANCE, SHIP\x27S COMPANY \x7f BY ARRANGEMENT.',
        'By arrangement with whom is not stated. Nothing on this deck states anything.',
      ],
    }),
  },
  'cargo-desk': {
    id: 'cargo-desk',
    label: 'Cargo desk',
    run: () => ({
      lines: [
        'The cargo office: one desk, one screen, one chair, and the chair is pushed in.',
        'It offers you the loading record without asking who you are. A cargo desk is built to ' +
          'be read \x7f that is the entire job of one.',
      ],
      clue: 'consignment-log',
    }),
  },

  // --- Hold 4 -----------------------------------------------------------
  'keel-cradles': {
    id: 'keel-cradles',
    label: 'Keel cradles',
    // The room's argument. A player who suspects the trim figure is a
    // mis-weighed keel has to be able to walk nine cradles and find out it is
    // not, without anybody telling them.
    run: (s) => {
      const lines = [
        'Nine sections of relay keel in nine cradles, numbered one to nine, chocked, strapped ' +
          'and cold to the hand.',
        'You walk the length of them. There is nothing else to do down here and you would ' +
          'quite like to be wrong.',
        'Nine of nine. Every section the manifest declares is in this hold, on its cradle, ' +
          'with its weight stencilled on the chock.',
      ];
      if (s.hasClue('mass-manifest')) {
        lines.push(
          'The keel is honest. Four thousand four hundred and ten tonnes of it, exactly as ' +
            'written. Whatever else this ship is carrying, she is carrying it as well as this ' +
            'and not instead of it.',
        );
      }
      return { lines, flag: 'walked-the-keel' };
    },
  },
  'hold-bulkhead': {
    id: 'hold-bulkhead',
    label: 'Aft bulkhead',
    run: (s) => ({
      lines: [
        'The aft bulkhead of Hold 4 is not the aft bulkhead of Hold 4.',
        'It is a second wall welded inside the first, plate over plate, with a bead you could ' +
          'hang a coat on. Yard work: fast, good, and done by somebody who knew they would not ' +
          'be asked about it afterwards.',
        s.has('walked-the-keel')
          ? 'There is a door in it. The general arrangement drawing pinned up in the cargo ' +
            'office shows no wall here, and therefore no door in the wall that is not here.'
          : 'There is a door in it, and the hold is nine metres shorter than the frame numbers ' +
            'on the deck plate say it should be.',
      ],
    }),
  },

  // --- the plant --------------------------------------------------------
  'plant-plate': {
    id: 'plant-plate',
    label: "Builder's plate",
    run: () => ({
      lines: [
        'A brass builder\x27s plate on the flank of the refrigeration set, of the kind a yard ' +
          'screws onto anything it is proud of.',
        'It gives a structural schedule. Somebody had to weigh this installation before it went ' +
          'aboard, because the ship could not be trimmed otherwise, and having weighed it they ' +
          'wrote the numbers on the side of it.',
      ],
      clue: 'vault-plate',
    }),
  },
  'plant-power': {
    id: 'plant-power',
    label: 'Power feed',
    run: (s) => {
      const lines = [
        'The vault does not take power from the ship. It takes a splice off the ring main and ' +
          'runs its own set behind it, and the splice is not a yard fitting.',
        'If the Candlewake lost every generator tonight, this room would still be at minus ' +
          'nineteen in the morning.',
      ];
      if (s.hasClue('loom-cycles')) {
        lines.push(
          'Fourteen months of refresh cycles addressed to a hold, on a schedule Engineering did ' +
            'not set, and a feed that does not pass through Engineering either. Neither of them ' +
            'passes through anybody you could go and ask.',
        );
      }
      return { lines };
    },
  },
  'vault-dogs': {
    id: 'vault-dogs',
    label: 'Vault wheel',
    // The gate, and the reason the deck is worth gating at all. Two steps on
    // purpose: the notice is the whole point of the obstacle, so nobody may
    // pass it by holding down confirm. Compare `duct-hatch` in content.ts,
    // which forces the same pause before the loudest route in Chapter One.
    run: (s) => {
      if (cleared(s, 'cold-registry')) {
        return {
          lines: [
            'The dogs are off their seats and the door stands a finger clear of its seal.',
            'The cold comes out of the gap steadily, at ankle height, and goes off across the ' +
              'grate looking for a sump.',
          ],
        };
      }
      if (!s.has('read-vault-notice')) {
        return {
          lines: [
            'The vault door has no lock. It has eight dogs, a hand wheel, and a card in a brass ' +
              'frame screwed to the frame beside it.',
            'COLD REGISTRY \x7f ENTRY IS NOT RESTRICTED. ENTRY IS RECORDED. THE DOOR WRITES THE ' +
              'TESSERA THAT TURNED IT. THE RECORD IS NOT REVISABLE.',
            'Nothing here is going to stop you. Something here is going to remember you.',
          ],
          flag: 'read-vault-notice',
        };
      }
      s.grantClearance('cold-registry');
      s.suspicion += 20;
      s.note('Opened the Cold Registry from the plant. The door logged the tessera that turned it.');
      return {
        lines: [
          'You put both hands on the wheel and turn it, and the dogs come off their seats one ' +
            'after another, eight of them, and each one is a different note.',
          'The frame beside the wheel takes a name. It does not tone and it does not ask, and ' +
            'there is no procedure anywhere on this ship for taking it back out again.',
          'The cold arrives before the door does.',
        ],
        flag: 'entered-cold-registry',
      };
    },
  },

  // --- the Cold Registry ------------------------------------------------
  'ledger-racks': {
    id: 'ledger-racks',
    label: 'Racking',
    run: (s) => {
      const lines = [
        'Ceramic tile, palm-sized, standing on edge in numbered trays, and the trays go up past ' +
          'where the light stops.',
        'Every one of them is faintly warm. At minus nineteen degrees, warm means running.',
        'A plate at the head of the bay: BAY 3 \x7f KH-22851 TO KH-34275.',
      ];
      if (s.hasClue('tessera-serial')) {
        lines.push(
          'KH. You read that prefix off something that was standing in a duct doing an ' +
            'impression of a man.',
        );
      }
      return { lines, clue: 'ledger-racks' };
    },
  },
  'registry-index': {
    id: 'registry-index',
    label: 'Index console',
    // The single worst sentence on Deck F is a status field. Nobody says
    // anything; the console answers the question it was built to answer.
    run: (s) => {
      if (!s.hasClue('tessera-serial')) {
        return {
          lines: [
            'The index console. It takes a serial and returns a location: bay, rack, tray, ' +
              'position.',
            'You could stand here the rest of the watch putting numbers into it and learn ' +
              'nothing you did not bring with you.',
          ],
        };
      }
      return {
        lines: [
          'You give it the serial you read off the sentinel. KH-11-4402.',
          'BAY 1 \x7f RACK 4 \x7f TRAY 19 \x7f POSITION 402.',
          'STATUS: RESIDENT. LAST REFRESH: 41 MINUTES.',
          'It is nine metres from where you are standing. You do not go and look at it.',
        ],
        flag: 'located-the-sentinel',
      };
    },
  },
  'vault-thermostat': {
    id: 'vault-thermostat',
    label: 'Environmental panel',
    run: () => ({
      lines: [
        'ENVIRONMENTAL \x7f COLD REGISTRY.',
        'SET \x7f19.0 C. ACTUAL \x7f19.0 C. DEVIATION EVENTS SINCE COMMISSIONING: 0.',
        'ATMOSPHERE: DRY, CIRCULATED, FILTERED TO REGISTRY CLASS.',
        'Nothing in this room has ever gone wrong. That is what the room is for, and it is the ' +
          'only claim on Deck F that is completely true.',
      ],
    }),
  },
  'registry-underside': {
    id: 'registry-underside',
    label: 'Overhead',
    // The hinge. Chapter One's set-piece was looking down through this mesh
    // from a distance; the reward for the whole of Deck F is standing under it.
    // Branched, because a player who never got into the duct must not be told
    // they were there.
    run: (s) => {
      if (s.hasClue('cold-registry')) {
        return {
          lines: [
            'Overhead, past the top of the racking, a run of diamond mesh with a maintenance ' +
              'crawl behind it.',
            'Duct 9-C. You have been up there on your stomach with a hand torch, looking down at ' +
              'this from a distance, in the dark, for about ninety seconds.',
            'From up there it was tens of thousands. From here it is eight bays and a number on ' +
              'a plate, and the number is smaller than the guess was, and it is worse.',
          ],
          flag: 'stood-in-the-registry',
        };
      }
      return {
        lines: [
          'Overhead, past the top of the racking, a run of diamond mesh with a maintenance crawl ' +
            'behind it.',
          'Duct 9-C, on the spinehand rotation, gasket seams every eleven metres.',
          'Somebody regasketing up there lies flat on that mesh for an hour at a time, directly ' +
            'above this racking, and would not necessarily ever look down.',
        ],
        flag: 'stood-in-the-registry',
      };
    },
  },

  // --- the bay ----------------------------------------------------------
  'bay-tender': {
    id: 'bay-tender',
    label: 'Tender 2',
    run: () => ({
      lines: [
        'Tender 2 in her cradle: fuelled, sealed, cold-soaked, and a Board seal run across the ' +
          'hatch in wire and lead.',
        'A seal is not a lock. It is a way of establishing afterwards that somebody went aboard.',
        'The fuel state is chalked on the board beside the cradle. ONE TRANSIT. Not one return.',
      ],
    }),
  },
  'bay-doors': {
    id: 'bay-doors',
    label: 'Outer doors',
    run: () => ({
      lines: [
        'The outer doors: six leaves, dogged, pinned, and painted over at every joint.',
        'The only opening in this hull below the Master\x27s ports, and it is the width of the ship.',
        'On the inside of leaf three somebody has stencilled the loading trim figures in yellow ' +
          'and somebody else has gone over them with grey. Both hands were careful.',
      ],
    }),
  },
  'bay-log': {
    id: 'bay-log',
    label: 'Movement log',
    // Second, independent source for the consignment record. A player who
    // walked past the cargo office must still be able to assemble D10, and the
    // bay's own log is a different system logging the same nineteen shifts.
    run: (s) => {
      const lines = [
        'BAY 2 \x7f MOVEMENT LOG.',
        'LAST CYCLE: OUTER DOORS OPEN \x7f FOURTEEN MONTHS AGO \x7f DURATION NINETEEN SHIFTS \x7f ' +
          'LIFT: EXTERNAL, NOT SHIP\x27S.',
        'Nothing has come aboard or left this hull since. Not stores, not mail, not a person.',
      ];
      if (s.hasClue('comms-embargo')) {
        lines.push(
          'Nothing leaves the signal room either. Fourteen months, both of them, to the week.',
        );
      }
      return { lines, clue: 'consignment-log' };
    },
  },
};
