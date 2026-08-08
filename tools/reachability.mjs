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
for (const f of ['data/deck-b.ts', 'data/deck-d.ts', 'data/deck-e.ts', 'data/content.ts']) {
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

const mapFiles = ['data/rooms.ts', 'data/deck-b.ts', 'data/deck-d.ts', 'data/deck-e.ts'];
const mapText = mapFiles.map((f) => text.get(path.join(SRC, f)) ?? '').join('\n');

// 1. NPCs that are never placed by an `npc:` mark in any room.
const npcIds = new Set();
for (const f of ['data/npcs.ts', 'data/deck-b.ts', 'data/deck-d.ts', 'data/deck-e.ts']) {
  const t = text.get(path.join(SRC, f)) ?? '';
  for (const m of t.matchAll(/^\s{2}id: '([a-z0-9-]+)',\n\s{2}name: '[^']*',\n\s{2}role:/gm)) npcIds.add(m[1]);
}
for (const id of npcIds) {
  if (!mapText.includes(`npc: '${id}'`)) {
    console.log(`UNPLACED npc: "${id}" is never placed in any room`);
    bad++;
  }
}

// 2. Interactables that no room mark points at.
const interText = text.get(path.join(SRC, 'data/content.ts')) ?? '';
const interBlock = interText.slice(interText.indexOf('INTERACTABLES'));
for (const m of interBlock.matchAll(/^\s{2}'([a-z0-9-]+)': \{/gm)) {
  const id = m[1];
  if (!mapText.includes(`interact: '${id}'`)) {
    console.log(`UNUSED interactable: "${id}" is not on any tile`);
    bad++;
  }
}

// 3. Rooms not reachable by walking or by the lift from the start room.
const roomIds = [...mapText.matchAll(/^\s{2}id: '([a-z0-9-]+)',\n\s{2}name: '[^']*',\n\s{2}deck:/gm)].map((m) => m[1]);
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

console.log(bad ? `\n${bad} unreachable item(s)` : '\nall content is reachable from gameplay');
process.exit(bad ? 1 : 0);
