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
console.log(bad ? `\n${bad} unreachable item(s)` : '\nall content is reachable from gameplay');
process.exit(bad ? 1 : 0);
