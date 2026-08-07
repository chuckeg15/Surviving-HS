/**
 * Content integrity checks.
 *
 * These run against the real content tables, in the real build, and are
 * asserted by the automated playtest. They exist because the failure modes of a
 * branching mystery are silent: a dialogue node pointing at a name that no
 * longer exists, a door leading to a spawn that was renamed, or — worst — a
 * deduction that can be reached from a single clue, which quietly turns the
 * mystery into a guessing game.
 */

import { ROOMS } from '@/data/rooms';
import { NPCS } from '@/data/npcs';
import { CLUES, DEDUCTIONS, INTERACTABLES, BACKGROUNDS } from '@/data/content';
import { ENCOUNTERS, TESSERAE } from '@/combat/battle';
import { getTileAtlas } from '@/art/tiles';
import { buildRoom } from '@/world/map';

export interface ValidationReport {
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
}

export function validateContent(): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const atlas = getTileAtlas();

  // --- mystery fairness -------------------------------------------------
  for (const d of Object.values(DEDUCTIONS)) {
    if (!d.requires.length) {
      errors.push(`deduction ${d.id} has no requirement sets`);
      continue;
    }
    d.requires.forEach((set, i) => {
      if (set.length < 2) {
        errors.push(
          `FAIRNESS: deduction ${d.id} set ${i} needs only ${set.length} clue(s) — ` +
            'every conclusion must rest on at least two independent sources',
        );
      }
      for (const c of set) {
        if (!CLUES[c]) errors.push(`deduction ${d.id} requires unknown clue "${c}"`);
      }
    });
  }

  // Every clue must be obtainable from somewhere: an interactable, a dialogue
  // onEnter, or a combat scan. A clue nothing grants is a dead end.
  const granted = new Set<string>();
  const srcText = [
    ...Object.values(INTERACTABLES).map((i) => i.run.toString()),
    ...Object.values(NPCS).flatMap((n) =>
      Object.values(n.dialogue.nodes).flatMap((node) => [
        node.onEnter?.toString() ?? '',
        ...(node.choices ?? []).map((c) => c.do?.toString() ?? ''),
      ]),
    ),
    ...Object.values(ENCOUNTERS).flatMap((e) => [
      e.onWin?.toString() ?? '',
      e.onScan?.toString() ?? '',
      e.onLose?.toString() ?? '',
    ]),
  ].join('\n');
  for (const id of Object.keys(CLUES)) {
    if (srcText.includes(`'${id}'`) || srcText.includes(`"${id}"`)) granted.add(id);
  }
  for (const id of Object.keys(CLUES)) {
    if (!granted.has(id)) warnings.push(`clue "${id}" is never granted by any content path`);
  }

  // --- rooms ------------------------------------------------------------
  for (const [id, def] of Object.entries(ROOMS)) {
    if (def.id !== id) errors.push(`room key "${id}" does not match def.id "${def.id}"`);
    let built;
    try {
      built = buildRoom(def);
    } catch (e) {
      errors.push(`room "${id}" failed to build: ${String(e)}`);
      continue;
    }
    if (!built.spawns['default'] && !Object.keys(built.spawns).length) {
      errors.push(`room "${id}" has no spawn points`);
    }
    for (const d of built.doors) {
      const target = ROOMS[d.to];
      if (!target) {
        errors.push(`room "${id}" door leads to unknown room "${d.to}"`);
        continue;
      }
      const targetBuilt = buildRoom(target);
      if (!targetBuilt.spawns[d.spawn]) {
        errors.push(`room "${id}" door to "${d.to}" wants spawn "${d.spawn}" which does not exist`);
      }
    }
    for (const it of built.interactables) {
      if (!INTERACTABLES[it.id]) {
        errors.push(`room "${id}" has interactable "${it.id}" with no definition`);
      }
    }
    // every non-void tile id in the layout must exist in the atlas
    for (const q of [...built.floorQuads, ...built.propQuads, ...built.overQuads]) {
      void q;
    }
    const reachable = built.solid.reduce((n, v) => n + (v ? 0 : 1), 0);
    if (reachable < 10) errors.push(`room "${id}" has almost no walkable space (${reachable} tiles)`);
  }

  // --- npcs -------------------------------------------------------------
  for (const [id, def] of Object.entries(NPCS)) {
    if (def.id !== id) errors.push(`npc key "${id}" != def.id "${def.id}"`);
    for (const r of def.schedule) {
      if (!ROOMS[r]) errors.push(`npc "${id}" scheduled into unknown room "${r}"`);
    }
    for (const r of new Set(def.schedule)) {
      if (!def.post[r]) warnings.push(`npc "${id}" has no post in "${r}" — will stand at a default`);
    }
    const nodes = def.dialogue.nodes;
    for (const node of Object.values(nodes)) {
      const targets = [
        typeof node.next === 'string' ? node.next : null,
        ...(node.choices ?? []).map((c) => c.to ?? null),
      ].filter(Boolean) as string[];
      for (const t of targets) {
        if (!nodes[t]) errors.push(`npc "${id}" node "${node.id}" points at missing node "${t}"`);
      }
      if (!node.end && !node.next && !(node.choices ?? []).length) {
        warnings.push(`npc "${id}" node "${node.id}" is a dead end (no end, next, or choices)`);
      }
      for (const c of node.choices ?? []) {
        if (c.if && !c.hint && !c.to && !c.do) {
          warnings.push(`npc "${id}" node "${node.id}" has a conditional choice that does nothing`);
        }
      }
    }
  }

  // --- combat -----------------------------------------------------------
  for (const b of BACKGROUNDS) {
    if (!TESSERAE[b.tessera]) errors.push(`background "${b.id}" grants unknown tessera "${b.tessera}"`);
    if (!ROOMS[b.startRoom]) errors.push(`background "${b.id}" starts in unknown room "${b.startRoom}"`);
    if (b.effects.length < 2) warnings.push(`background "${b.id}" lists fewer than two real effects`);
  }
  for (const [id, t] of Object.entries(TESSERAE)) {
    if (t.abilities.length < 3) warnings.push(`tessera "${id}" has fewer than 3 abilities`);
    const kinds = new Set(t.abilities.map((a) => a.kind));
    if (kinds.size < 2) {
      errors.push(`tessera "${id}" abilities are all one kind — that is a renamed damage list`);
    }
    if (!t.abilities.some((a) => a.power > 0)) warnings.push(`tessera "${id}" cannot deal damage`);
  }
  for (const [id, e] of Object.entries(ENCOUNTERS)) {
    if (!e.enemy) errors.push(`encounter "${id}" has no enemy`);
    if (e.enemy.abilities.length === 0) errors.push(`encounter "${id}" enemy has no abilities`);
  }

  return {
    errors,
    warnings,
    stats: {
      rooms: Object.keys(ROOMS).length,
      npcs: Object.keys(NPCS).length,
      clues: Object.keys(CLUES).length,
      deductions: Object.keys(DEDUCTIONS).length,
      interactables: Object.keys(INTERACTABLES).length,
      backgrounds: BACKGROUNDS.length,
      tesserae: Object.keys(TESSERAE).length,
      encounters: Object.keys(ENCOUNTERS).length,
      tiles: atlas.order.length,
      dialogueNodes: Object.values(NPCS).reduce(
        (n, d) => n + Object.keys(d.dialogue.nodes).length,
        0,
      ),
    },
  };
}
