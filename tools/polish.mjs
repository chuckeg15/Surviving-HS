/**
 * Polish audit.
 *
 * The reference standard for this project is the craftsmanship of a top-tier
 * handheld RPG, and "as good as that" is useless as a target until it is a list
 * of things that are either true or false. None of what follows is copied from
 * any other game: these are general interface and game-feel conventions, the
 * kind that are documented in any design text, turned into checks a machine can
 * run against THIS codebase.
 *
 * The rules audited here:
 *
 *   1. Every screen says what the buttons do. A player should never have to
 *      guess, and should never have to remember a control they learned two
 *      screens ago.
 *   2. Every screen can be backed out of. A screen with no cancel path is a
 *      soft-lock waiting for the one player who opens it at the wrong moment.
 *   3. Every screen answers input audibly. Silence on a keypress reads as a
 *      dropped input even when the game did exactly what it was told.
 *   4. Every room has an ambient bed. A room that goes silent when you walk
 *      into it feels unfinished no matter how it looks.
 *   5. Every speaking character says something different once the story has
 *      moved. A cast that repeats its opening line after the player has proved
 *      something is a cast of signposts, not people.
 *   6. Every interactable produces text. An examine that returns nothing
 *      teaches the player to stop examining.
 *
 *   node tools/polish.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const files = new Map();
for (const f of walk(SRC)) files.set(f, readFileSync(f, 'utf8'));

let bad = 0;
const fail = (m) => {
  console.log('  ' + m);
  bad++;
};

// ---------------------------------------------------------------------------
// 1-3. Scenes: hinted, escapable, audible.
// ---------------------------------------------------------------------------
console.log('\nscreens');

/**
 * A scene is a class implementing Scene. Its body runs to the next top-level
 * `}` at column 0, which holds because this codebase never indents a class.
 */
const scenes = [];
for (const [file, text] of files) {
  const re = /export class (\w+)\s+implements\s+Scene\s*\{([\s\S]*?)\n\}/g;
  for (const m of text.matchAll(re)) {
    scenes.push({ file: path.relative(ROOT, file), name: m[1], body: m[2] });
  }
}

// Screens the player cannot be trapped on, because they own the whole session
// or hand off automatically. Each entry needs a reason, not just an id.
const NO_CANCEL_NEEDED = {
  TitleScene: 'the root screen — there is nowhere behind it',
  ChapterEndScene: 'advances on confirm only; backing out of an ending is not a thing',
  ExploreScene: 'the world itself; cancel opens the menu rather than leaving',
};

for (const s of scenes) {
  /**
   * Test the property, not the implementation. The first version of this check
   * looked for footer() and reported four scenes as unhinted \u2014 every one
   * of which did show its controls, just hand-rolled somewhere else. An audit
   * that fails working code because it used a different helper is an audit
   * that will be ignored, correctly.
   *
   * What actually has to be true is that the screen names a control. The arrow
   * glyphs are 0x01-0x04 and the two action keys are drawn as bare letters.
   */
  const hinted =
    /footer\(/.test(s.body) ||
    /\\x0[1-4]/.test(s.body) ||
    /'[ZX] |  ?[ZX] (choose|confirm|close|travel|back|select|wait)/.test(s.body);
  const escapable = /pressed\('cancel'\)|NO_CANCEL/.test(s.body) || s.name in NO_CANCEL_NEEDED;
  const audible = /audio\.sfx/.test(s.body);
  if (!hinted) fail(`UNHINTED  ${s.name} (${s.file}) draws no control hints`);
  if (!escapable) fail(`TRAPPED   ${s.name} (${s.file}) has no cancel path`);
  if (!audible) fail(`SILENT    ${s.name} (${s.file}) never answers input with a sound`);
}
console.log(`  ${scenes.length} scenes audited`);

// ---------------------------------------------------------------------------
// 4. Rooms: every one has an ambient bed and a landmark.
// ---------------------------------------------------------------------------
console.log('\nrooms');
let roomCount = 0;
for (const [file, text] of files) {
  if (!/data\/(rooms|deck-[a-f])\.ts$/.test(file.replace(/\\/g, '/'))) continue;
  for (const m of text.matchAll(/\n  id: '([a-z0-9-]+)',\n([\s\S]*?)\n\};/g)) {
    const [, id, body] = m;
    if (!/\n  deck: /.test(body)) continue; // NPCs and clues also declare id
    roomCount++;
    if (!/\n  ambience: /.test(body)) fail(`NO AMBIENCE  room "${id}" is silent`);
    if (!/\n  landmark: /.test(body)) fail(`NO LANDMARK  room "${id}" has nothing to describe it`);
  }
}
console.log(`  ${roomCount} rooms audited`);

// ---------------------------------------------------------------------------
// 5. Cast: does anyone say anything new once the story has moved?
// ---------------------------------------------------------------------------
console.log('\ncast');
let npcCount = 0;
for (const [file, text] of files) {
  if (!/data\/(npcs|deck-[a-f])\.ts$/.test(file.replace(/\\/g, '/'))) continue;
  for (const m of text.matchAll(/\n  id: '([a-z0-9-]+)',\n  name: '[^']*',\n  role:([\s\S]*?)\n\};/g)) {
    const [, id, body] = m;
    npcCount++;
    // A tree that reacts reads state: a flag, a deduction, a relationship, or
    // a clue. One that never does will greet the player identically forever.
    const reactive =
      /s\.has\(|hasDeduction\(|relationAtLeast\(|s\.foundClue|hasClue\(|s\.itemCount\(/.test(body);
    const nodes = [...body.matchAll(/\n      \w[\w-]*: \{\n\s+id: '/g)].length;
    if (!reactive) fail(`STATIC CAST  "${id}" never reads story state — says the same thing forever`);
    if (nodes < 3) fail(`THIN CAST    "${id}" has ${nodes} dialogue node(s)`);
  }
}
console.log(`  ${npcCount} speaking characters audited`);

// ---------------------------------------------------------------------------
// 6. Interactables: examining something must produce words.
// ---------------------------------------------------------------------------
console.log('\ninteractables');
let interCount = 0;
for (const [file, text] of files) {
  const rel = file.replace(/\\/g, '/');
  if (!/data\/(content|deck-[a-f])\.ts$/.test(rel)) continue;
  const at = text.search(/export const INTERACTABLES[A-Z_]*\b/);
  if (at < 0) continue;
  const block = text.slice(at);
  for (const m of block.matchAll(/\n  '([a-z0-9-]+)': \{\n\s+id: '\1',([\s\S]*?)\n  \},/g)) {
    const [, id, body] = m;
    interCount++;
    // `lines:` and the shorthand `return { lines, clue }` are both text, and
    // so is a tree that pushes onto a local before returning. Matching only
    // the first spelling reported eight false positives on the richest
    // interactables in the game \u2014 the ones that build their text
    // conditionally, which is exactly the shape worth having.
    if (!/\blines\b/.test(body)) fail(`MUTE  interactable "${id}" returns no text`);
  }
}
console.log(`  ${interCount} interactables audited`);

console.log(
  bad
    ? `\n${bad} polish finding(s)`
    : '\nevery screen is hinted, escapable and audible; every room has a bed; ' +
      'every character reacts; every examine speaks',
);
process.exit(bad ? 1 : 0);
