/**
 * Reachability audit.
 *
 * Twice in one session, finished and correct content shipped with nothing in
 * the game able to reach it: the chapter ending, then three whole encounters.
 * Both times the defect was invisible to the type checker, the playtest and the
 * content validator, because every individual piece was fine.
 *
 * The test is simple: an id that only appears in the file that defines it is an
 * id no player can ever reach.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}
const files = walk(SRC).filter((f) => !f.includes('/dev/'));
const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

/** Collects `id: 'x'` style declarations from a defining file. */
function idsIn(file, re) {
  const t = text.get(file);
  if (!t) return [];
  return [...t.matchAll(re)].map((m) => m[1]);
}

const groups = [
  {
    what: 'encounter',
    from: path.join(SRC, 'combat/roster.ts'),
    re: /^export const ROSTER_ENCOUNTERS[\s\S]*?$/m,
    ids: () => {
      const t = text.get(path.join(SRC, 'combat/roster.ts')) ?? '';
      const block = t.slice(t.indexOf('ROSTER_ENCOUNTERS'));
      return [...block.matchAll(/^\s{2}'?([a-z0-9-]+)'?: \{/gm)].map((m) => m[1]);
    },
    defining: ['combat/roster.ts', 'combat/battle.ts'],
  },
];

let bad = 0;
for (const g of groups) {
  for (const id of g.ids()) {
    const hits = files.filter((f) => {
      const rel = path.relative(SRC, f);
      if (g.defining.some((d) => rel === d)) return false;
      return (text.get(f) ?? '').includes(`'${id}'`);
    });
    if (!hits.length) {
      console.log(`UNREACHABLE ${g.what}: "${id}" appears only where it is defined`);
      bad++;
    }
  }
}

// Clues are reachable by a different mechanism: something must CALL
// findClue on them. Where that call lives does not matter, so the
// defining-file exclusion used for encounters would give false positives.
const allText = [...text.values()].join('\n');
const clueIds = new Set();
for (const f of [
  'data/deck-a.ts',
  'data/deck-b.ts',
  'data/deck-d.ts',
  'data/deck-e.ts',
  'data/deck-f.ts',
  'data/content.ts',
]) {
  const t = text.get(path.join(SRC, f)) ?? '';
  for (const m of t.matchAll(/^\s{2}'([a-z0-9-]+)': \{\n\s+id: '\1',\n\s+title:/gm)) {
    clueIds.add(m[1]);
  }
}
for (const id of clueIds) {
  if (!allText.includes(`findClue('${id}')`) && !allText.includes(`clue: '${id}'`)) {
    console.log(`UNGRANTABLE clue: "${id}" is never granted by findClue() or a clue: result`);
    bad++;
  }
}

// ---------------------------------------------------------------------------
// Orphan checks. Same failure shape as the unreachable encounters: each of
// these is a thing that exists, is correct, and that no player can ever meet.
// ---------------------------------------------------------------------------

const mapFiles = [
  'data/rooms.ts',
  'data/deck-a.ts',
  'data/deck-b.ts',
  'data/deck-d.ts',
  'data/deck-e.ts',
  'data/deck-f.ts',
];
const mapText = mapFiles.map((f) => text.get(path.join(SRC, f)) ?? '').join('\n');

// 1. Interactables that no room mark points at.
//
// Anchored on the declaration, not on the bare word: the file also imports
// INTERACTABLES_A, and slicing from the import swept every clue in the file
// into this check and reported ten false positives.
const interFiles = ['data/content.ts', 'data/deck-a.ts', 'data/deck-f.ts'];
let interBlock = '';
for (const f of interFiles) {
  const t = text.get(path.join(SRC, f)) ?? '';
  const at = t.search(/export const INTERACTABLES[A-Z_]*\b/);
  if (at >= 0) interBlock += '\n' + t.slice(at);
}
for (const m of interBlock.matchAll(/^\s{2}'([a-z0-9-]+)': \{/gm)) {
  const id = m[1];
  if (!mapText.includes(`interact: '${id}'`)) {
    console.log(`UNUSED interactable: "${id}" is not on any tile`);
    bad++;
  }
}

// 2. Rooms not reachable by walking or by the lift from the start room.
// The name may be double-quoted — a room whose name contains an apostrophe has
// to be. Matching only single quotes made "THE MASTER'S DAY CABIN" invisible to
// this audit, which then could not see the door through it to the strongroom
// and reported the strongroom as orphaned while saying nothing about the cabin.
// A room the checker cannot see is worse than a room it reports.
const roomIds = [
  ...mapText.matchAll(
    /^\s{2}id: '([a-z0-9-]+)',\n\s{2}name: (?:'[^']*'|"[^"]*"),\n\s{2}deck:/gm,
  ),
].map((m) => m[1]);
const edges = new Map(roomIds.map((r) => [r, new Set()]));
for (const f of mapFiles) {
  const t = text.get(path.join(SRC, f)) ?? '';
  // attribute each `to:` to the room block it sits in
  const blocks = [...t.matchAll(/id: '([a-z0-9-]+)',\n([\s\S]*?)\n\};/g)];
  for (const b of blocks) {
    const from = b[1];
    if (!edges.has(from)) continue;
    for (const d of b[2].matchAll(/to: '([a-z0-9-]+)'/g)) edges.get(from).add(d[1]);
  }
}
// lift stops are edges from anywhere with a lift panel
const liftText = text.get(path.join(SRC, 'data/lifts.ts')) ?? '';
const liftRooms = [...liftText.matchAll(/room: '([a-z0-9-]+)'/g)].map((m) => m[1]);
for (const r of roomIds) {
  if (mapText.includes(`interact: 'lift-panel'`) && edges.has(r)) {
    // any room containing a lift panel reaches every listed stop
  }
}
// Rooms entered by a code path rather than a door edge. Each needs a real
// reason to be here; this is not a suppression list for orphans.
const CODE_ENTERED = ['spine-duct']; // explore.ts, via the enter-duct flag
const seen = new Set(['c-bunk', ...CODE_ENTERED]);
const queue = ['c-bunk', ...CODE_ENTERED];
while (queue.length) {
  const cur = queue.shift();
  const out = new Set(edges.get(cur) ?? []);
  // a lift landing reaches every listed stop
  if (liftRooms.includes(cur) || cur === 'c-corridor') for (const s of liftRooms) out.add(s);
  for (const n of out) if (!seen.has(n)) { seen.add(n); queue.push(n); }
}
for (const r of roomIds) {
  if (!seen.has(r)) {
    console.log(`UNREACHABLE room: "${r}" cannot be walked to from the start`);
    bad++;
  }
}

// ---------------------------------------------------------------------------
// 3. Crew placement. Every room an NPC's schedule names must have a coordinate
// in that NPC's `post` table, and that coordinate must land on a tile a body
// can stand on.
//
// This is the same failure shape as the unreachable encounters, one layer down.
// A missing post silently drops the character on the engine's [4, 4] fallback;
// a post over a table puts them inside it. Neither is visible to tsc, and
// neither is visible to a playtest either, because a schedule entry is only
// wrong during the one time block that selects it.
// ---------------------------------------------------------------------------

const OPENERS = '{[(';
const CLOSERS = '}])';

/** Substring of the balanced bracket group beginning at `start`. */
function balanced(t, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    // Comments are skipped before quotes: an apostrophe in a prose comment
    // ("the player's feet") otherwise opens a string that eats the rest of the
    // object and the group never closes.
    if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
    if (c === '/' && t[i + 1] === '*') { i = t.indexOf('*/', i) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (OPENERS.includes(c)) depth++;
    else if (CLOSERS.includes(c) && --depth === 0) return t.slice(start, i + 1);
  }
  return '';
}

/** key -> raw value source, for the outermost level of an object literal. */
function fields(objSrc) {
  const out = {};
  const key = /(?:'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w$]*))\s*:/y;
  let depth = 0;
  let quote = null;
  let i = 0;
  while (i < objSrc.length) {
    const c = objSrc[i];
    if (quote) {
      if (c === '\\') i += 2;
      else {
        if (c === quote) quote = null;
        i++;
      }
      continue;
    }
    if (c === '/' && objSrc[i + 1] === '/') { while (i < objSrc.length && objSrc[i] !== '\n') i++; continue; }
    if (c === '/' && objSrc[i + 1] === '*') { i = objSrc.indexOf('*/', i) + 1; continue; }
    // Keys are tested before strings are skipped, because a quoted key ('1', '@')
    // is itself a string and would otherwise be swallowed whole.
    if (depth === 1) {
      key.lastIndex = i;
      const m = key.exec(objSrc);
      if (m) {
        let j = m.index + m[0].length;
        while (/\s/.test(objSrc[j])) j++;
        // A value is either a bracket group or runs to the next top-level comma.
        // Arrow-function and helper-call values (`look({...})`, `text: (s) => ...`)
        // are the reason this counts parentheses as well as braces.
        let val;
        if (OPENERS.includes(objSrc[j])) {
          val = balanced(objSrc, j);
          let k = j + val.length;
          while (k < objSrc.length && objSrc[k] !== ',' && objSrc[k] !== '\n') {
            if (OPENERS.includes(objSrc[k])) { k += balanced(objSrc, k).length; continue; }
            k++;
          }
          val = objSrc.slice(j, k);
        } else {
          let k = j;
          let q = null;
          while (k < objSrc.length) {
            const d = objSrc[k];
            if (q) { if (d === '\\') k++; else if (d === q) q = null; k++; continue; }
            if (d === "'" || d === '"' || d === '`') { q = d; k++; continue; }
            if (OPENERS.includes(d)) { k += balanced(objSrc, k).length; continue; }
            if (d === ',' || d === '\n') break;
            k++;
          }
          val = objSrc.slice(j, k);
        }
        out[(m[1] ?? m[2]).replace(/\\\\/g, '\\')] = val;
        i = j + val.length;
        continue;
      }
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i++; continue; }
    if (OPENERS.includes(c)) { depth++; i++; continue; }
    if (CLOSERS.includes(c)) { depth--; i++; continue; }
    i++;
  }
  return out;
}

/** Tile ids the atlas marks solid — buildRoom reads this before the legend. */
const tileSrc = text.get(path.join(SRC, 'art/tiles.ts')) ?? '';
const solidTiles = new Set();
for (const m of tileSrc.matchAll(/\{\s*id: '([a-z0-9.]+)'/g)) {
  const body = balanced(tileSrc, m.index);
  if (/solid: true|meta: (?:PROP|WALL_UPPER|WALL_BASE)/.test(body)) solidTiles.add(m[1]);
}

const mapSrc = text.get(path.join(SRC, 'world/map.ts')) ?? '';
const baseLegend = fields(balanced(mapSrc, mapSrc.indexOf('{', mapSrc.indexOf('const BASE_LEGEND'))));

const roomsById = new Map();
for (const f of mapFiles) {
  const t = text.get(path.join(SRC, f)) ?? '';
  for (const m of t.matchAll(/: RoomDef = \{/g)) {
    const body = balanced(t, m.index + m[0].length - 1);
    const f2 = fields(body);
    const id = /^'([a-z0-9-]+)'$/.exec((f2.id ?? '').trim())?.[1];
    if (!id) continue;
    roomsById.set(id, {
      // The source is escaped TS; a layout row written '..\\..' is one backslash.
      layout: [...(f2.layout ?? '').matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((r) => r[1].replace(/\\\\/g, '\\')),
      marks: fields(f2.marks ?? '{}'),
    });
  }
}

function standable(room, x, y) {
  const ch = room.layout[y]?.[x];
  if (ch === undefined || ch === '#' || ch === ' ') return false;
  const entry = room.marks[ch] ?? baseLegend[ch];
  if (!entry) return true;
  if (/\bdoor: /.test(entry)) return true; // doors clear their own collision
  if (/\bsolid: true/.test(entry)) return false;
  const tile = /\b(?:prop|floor): '([a-z0-9.]+)'/.exec(entry)?.[1];
  return !(tile && solidTiles.has(tile));
}

for (const f of ['data/npcs.ts', 'data/deck-b.ts', 'data/deck-d.ts', 'data/deck-e.ts']) {
  const t = text.get(path.join(SRC, f)) ?? '';
  for (const m of t.matchAll(/: NpcDef = \{/g)) {
    const def = fields(balanced(t, m.index + m[0].length - 1));
    const id = /^'([a-z0-9-]+)'$/.exec((def.id ?? '').trim())?.[1];
    if (!id) continue;
    const schedule = [...(def.schedule ?? '').matchAll(/'([a-z0-9-]+)'/g)].map((r) => r[1]);
    const post = fields(def.post ?? '{}');
    if (!schedule.length) {
      console.log(`SCHEDULE-LESS npc: "${id}" declares no schedule`);
      bad++;
    }
    for (const roomId of new Set(schedule)) {
      if (!roomsById.has(roomId)) {
        console.log(`SCHEDULED nowhere: "${id}" is rostered to "${roomId}", which is not a room`);
        bad++;
        continue;
      }
      if (!post[roomId]) {
        console.log(`NO POST: "${id}" is rostered to "${roomId}" with no post coordinate`);
        bad++;
      }
      if (!seen.has(roomId)) {
        console.log(`UNREACHABLE npc: "${id}" is only ever in "${roomId}", which cannot be walked to`);
        bad++;
      }
    }
    for (const [roomId, coord] of Object.entries(post)) {
      const room = roomsById.get(roomId);
      if (!room) {
        console.log(`STRAY POST: "${id}" has a post in "${roomId}", which is not a room`);
        bad++;
        continue;
      }
      const [x, y] = [...coord.matchAll(/-?\d+/g)].map((n) => Number(n[0]));
      if (!standable(room, x, y)) {
        console.log(`POST IN A WALL: "${id}" stands at [${x}, ${y}] in "${roomId}" — nothing can stand there`);
        bad++;
      }
    }
  }
}

console.log(bad ? `\n${bad} unreachable item(s)` : '\nall content is reachable from gameplay');
process.exit(bad ? 1 : 0);
