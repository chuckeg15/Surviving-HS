/**
 * GameState — the single mutable record of a playthrough.
 *
 * Everything that can differ between two players lives here and nowhere else,
 * which is what makes save/load and branch testing tractable. Systems never
 * keep their own copy of story state; they read and write this.
 */

import { ActorLook, DEFAULT_LOOK } from '@/art/actors';
import { bus } from '@/core/events';

export const SAVE_VERSION = 3;

export type Pronouns = 'she/her' | 'he/him' | 'they/them' | 'xe/xem';

export type BackgroundId = 'maintenance' | 'medical' | 'registry' | 'watch' | 'loom';

/**
 * Relationships are never shown to the player as a number. The score is an
 * internal accumulator; the *level* is what dialogue and gates read, and the
 * *states* carry the qualitative colour a single axis cannot (someone can be
 * friendly and frightened at once).
 */
export type RelationLevel =
  | 'hostile'
  | 'distrustful'
  | 'wary'
  | 'professional'
  | 'friendly'
  | 'trusting'
  | 'loyal';

export const RELATION_ORDER: RelationLevel[] = [
  'hostile',
  'distrustful',
  'wary',
  'professional',
  'friendly',
  'trusting',
  'loyal',
];

export type RelationState =
  | 'afraid'
  | 'indebted'
  | 'suspicious'
  | 'protective'
  | 'ashamed'
  | 'manipulating'
  | 'aligned'
  | 'grieving';

export function levelFor(score: number): RelationLevel {
  if (score <= -60) return 'hostile';
  if (score <= -30) return 'distrustful';
  if (score < 10) return 'wary';
  if (score < 35) return 'professional';
  if (score < 60) return 'friendly';
  if (score < 85) return 'trusting';
  return 'loyal';
}

export function relationAtLeast(a: RelationLevel, b: RelationLevel): boolean {
  return RELATION_ORDER.indexOf(a) >= RELATION_ORDER.indexOf(b);
}

export interface ClueRecord {
  found: boolean;
  /** Read in full at least once — some gates require actually reading it. */
  examined: boolean;
  /** Ship-time block it was found in, for the journal ordering. */
  at: number;
  /** True if the player lost it (confiscated on the Sabbat route). */
  lost?: boolean;
}

export interface QuestRecord {
  stage: string;
  done: boolean;
  outcome?: string;
}

export interface NpcRecord {
  room: string;
  alive: boolean;
  met: boolean;
  /** Dialogue nodes already seen — drives "you already asked that". */
  seen: string[];
  /** Overrides the schedule when the story pins someone in place. */
  pinned?: string;
}

export interface PlayerProfile {
  name: string;
  pronouns: Pronouns;
  background: BackgroundId;
  look: ActorLook;
}

export interface SerializedState {
  version: number;
  savedAt: number;
  profile: PlayerProfile;
  chapter: number;
  timeBlock: number;
  room: string;
  x: number;
  y: number;
  facing: string;
  flags: Record<string, number | string | boolean>;
  clues: Record<string, ClueRecord>;
  links: { a: string; b: string; deduction: string | null }[];
  deductions: string[];
  theory: string | null;
  quests: Record<string, QuestRecord>;
  relations: Record<string, { score: number; states: RelationState[] }>;
  factions: Record<string, number>;
  inventory: Record<string, number>;
  tesserae: string[];
  activeTessera: string;
  npcs: Record<string, NpcRecord>;
  suspicion: number;
  history: string[];
  playSeconds: number;
}

export class GameState {
  profile: PlayerProfile = {
    name: 'QUILLON',
    pronouns: 'they/them',
    background: 'maintenance',
    look: { ...DEFAULT_LOOK },
  };
  chapter = 1;
  /** Ship-time in 20-minute blocks from 02:00. Block 0 = 02:00. */
  timeBlock = 0;
  room = 'c-bunk';
  x = 0;
  y = 0;
  facing = 'down';

  flags = new Map<string, number | string | boolean>();
  clues = new Map<string, ClueRecord>();
  links: { a: string; b: string; deduction: string | null }[] = [];
  deductions = new Set<string>();
  theory: string | null = null;
  quests = new Map<string, QuestRecord>();
  relations = new Map<string, { score: number; states: Set<RelationState> }>();
  factions = new Map<string, number>();
  inventory = new Map<string, number>();
  tesserae: string[] = [];
  activeTessera = '';
  npcs = new Map<string, NpcRecord>();
  /** How interested the Ship's Watch is in the player. Gates several scenes. */
  suspicion = 0;
  history: string[] = [];
  playSeconds = 0;

  // --- flags ------------------------------------------------------------

  flag(key: string): number | string | boolean | undefined {
    return this.flags.get(key);
  }
  has(key: string): boolean {
    const v = this.flags.get(key);
    return v !== undefined && v !== false && v !== 0;
  }
  setFlag(key: string, value: number | string | boolean = true): void {
    this.flags.set(key, value);
    bus.emit('flag:set', { key, value });
  }
  bumpFlag(key: string, by = 1): number {
    const v = (Number(this.flags.get(key)) || 0) + by;
    this.flags.set(key, v);
    bus.emit('flag:set', { key, value: v });
    return v;
  }

  // --- clues ------------------------------------------------------------

  hasClue(id: string): boolean {
    const c = this.clues.get(id);
    return !!c && c.found && !c.lost;
  }

  findClue(id: string, silent = false): boolean {
    if (this.clues.has(id) && this.clues.get(id)!.found) return false;
    this.clues.set(id, { found: true, examined: false, at: this.timeBlock });
    bus.emit('clue:found', { id, silent });
    return true;
  }

  examineClue(id: string): void {
    const c = this.clues.get(id);
    if (c) c.examined = true;
  }

  /** Confiscation: the clue is remembered as lost, not silently deleted. */
  loseClue(id: string): void {
    const c = this.clues.get(id);
    if (c) c.lost = true;
  }

  foundClues(): string[] {
    return [...this.clues.entries()].filter(([, c]) => c.found && !c.lost).map(([id]) => id);
  }

  isLinked(a: string, b: string): boolean {
    return this.links.some(
      (l) => (l.a === a && l.b === b) || (l.a === b && l.b === a),
    );
  }

  addLink(a: string, b: string, deduction: string | null): void {
    if (this.isLinked(a, b)) return;
    this.links.push({ a, b, deduction });
    bus.emit('clue:linked', { a, b, deductionId: deduction });
    if (deduction) this.deductions.add(deduction);
  }

  hasDeduction(id: string): boolean {
    return this.deductions.has(id);
  }

  // --- quests -----------------------------------------------------------

  questStage(id: string): string | null {
    return this.quests.get(id)?.stage ?? null;
  }
  startQuest(id: string, stage = 'start'): void {
    if (this.quests.has(id)) return;
    this.quests.set(id, { stage, done: false });
    bus.emit('quest:started', { id });
  }
  setQuestStage(id: string, stage: string): void {
    const q = this.quests.get(id);
    if (!q || q.done) return;
    q.stage = stage;
    bus.emit('quest:stage', { id, stage });
  }
  finishQuest(id: string, outcome: string): void {
    const q = this.quests.get(id) ?? { stage: 'start', done: false };
    q.done = true;
    q.outcome = outcome;
    this.quests.set(id, q);
    bus.emit('quest:done', { id, outcome });
  }
  activeQuests(): string[] {
    return [...this.quests.entries()].filter(([, q]) => !q.done).map(([id]) => id);
  }

  // --- relationships ----------------------------------------------------

  private rel(npc: string) {
    let r = this.relations.get(npc);
    if (!r) {
      r = { score: 20, states: new Set<RelationState>() };
      this.relations.set(npc, r);
    }
    return r;
  }

  relationLevel(npc: string): RelationLevel {
    return levelFor(this.rel(npc).score);
  }

  relationStates(npc: string): RelationState[] {
    return [...this.rel(npc).states];
  }

  hasRelationState(npc: string, s: RelationState): boolean {
    return this.rel(npc).states.has(s);
  }

  adjustRelation(npc: string, delta: number): void {
    const r = this.rel(npc);
    const from = levelFor(r.score);
    r.score = Math.max(-100, Math.min(100, r.score + delta));
    const to = levelFor(r.score);
    bus.emit('relation:changed', { npc, from, to, delta });
  }

  addRelationState(npc: string, s: RelationState): void {
    this.rel(npc).states.add(s);
  }
  removeRelationState(npc: string, s: RelationState): void {
    this.rel(npc).states.delete(s);
  }

  faction(id: string): number {
    return this.factions.get(id) ?? 0;
  }
  adjustFaction(id: string, delta: number): void {
    this.factions.set(id, Math.max(-100, Math.min(100, this.faction(id) + delta)));
  }

  // --- inventory / tesserae --------------------------------------------

  itemCount(id: string): number {
    return this.inventory.get(id) ?? 0;
  }
  addItem(id: string, n = 1): void {
    this.inventory.set(id, this.itemCount(id) + n);
  }
  removeItem(id: string, n = 1): boolean {
    const have = this.itemCount(id);
    if (have < n) return false;
    if (have === n) this.inventory.delete(id);
    else this.inventory.set(id, have - n);
    return true;
  }
  hasItem(id: string): boolean {
    return this.itemCount(id) > 0;
  }

  addTessera(id: string): void {
    if (!this.tesserae.includes(id)) this.tesserae.push(id);
    if (!this.activeTessera) this.activeTessera = id;
  }

  // --- npcs -------------------------------------------------------------

  npc(id: string): NpcRecord {
    let n = this.npcs.get(id);
    if (!n) {
      n = { room: '', alive: true, met: false, seen: [] };
      this.npcs.set(id, n);
    }
    return n;
  }
  sawNode(npcId: string, node: string): boolean {
    return this.npc(npcId).seen.includes(node);
  }
  markNode(npcId: string, node: string): void {
    const n = this.npc(npcId);
    if (!n.seen.includes(node)) n.seen.push(node);
  }

  // --- time -------------------------------------------------------------

  /** Ship-time label, e.g. "04:20". Chapter One runs 02:00 to 08:00. */
  /**
   * Adds a clearance the player was not born with. Stored as a comma string
   * because clearancesOf() already reads that shape; keeping one representation
   * avoids two sources of truth for who may open what.
   */
  /**
   * Rooms the player has actually stood in. The ship map shows only these:
   * revealing the whole vessel on turn one answers the question exploring is
   * asking.
   */
  visitRoom(id: string): void {
    const seen = ((this.flag('visited') as string) ?? '').split(',').filter(Boolean);
    if (seen.includes(id)) return;
    seen.push(id);
    this.setFlag('visited', seen.join(','));
  }

  visitedRooms(): string[] {
    return ((this.flag('visited') as string) ?? '').split(',').filter(Boolean);
  }

  grantClearance(c: string): void {
    const cur = ((this.flag('granted-clearances') as string) ?? '')
      .split(',')
      .filter(Boolean);
    if (cur.includes(c)) return;
    cur.push(c);
    this.setFlag('granted-clearances', cur.join(','));
  }

  clock(): string {
    const total = 2 * 60 + this.timeBlock * 20;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  advanceTime(blocks = 1): void {
    this.timeBlock += blocks;
    bus.emit('time:tick', { block: this.timeBlock });
  }

  note(text: string): void {
    this.history.push(`${this.clock()} ${text}`);
  }

  // --- serialisation ----------------------------------------------------

  serialize(): SerializedState {
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      profile: structuredClone(this.profile),
      chapter: this.chapter,
      timeBlock: this.timeBlock,
      room: this.room,
      x: this.x,
      y: this.y,
      facing: this.facing,
      flags: Object.fromEntries(this.flags),
      clues: Object.fromEntries(this.clues),
      links: structuredClone(this.links),
      deductions: [...this.deductions],
      theory: this.theory,
      quests: Object.fromEntries(this.quests),
      relations: Object.fromEntries(
        [...this.relations].map(([k, v]) => [k, { score: v.score, states: [...v.states] }]),
      ),
      factions: Object.fromEntries(this.factions),
      inventory: Object.fromEntries(this.inventory),
      tesserae: [...this.tesserae],
      activeTessera: this.activeTessera,
      npcs: Object.fromEntries(this.npcs),
      suspicion: this.suspicion,
      history: [...this.history],
      playSeconds: Math.round(this.playSeconds),
    };
  }

  static deserialize(data: SerializedState): GameState {
    const s = new GameState();
    s.profile = { ...s.profile, ...data.profile };
    s.profile.look = { ...DEFAULT_LOOK, ...(data.profile?.look ?? {}) };
    s.chapter = data.chapter ?? 1;
    s.timeBlock = data.timeBlock ?? 0;
    s.room = data.room ?? 'c-bunk';
    s.x = data.x ?? 0;
    s.y = data.y ?? 0;
    s.facing = data.facing ?? 'down';
    s.flags = new Map(Object.entries(data.flags ?? {}));
    s.clues = new Map(Object.entries(data.clues ?? {}));
    s.links = data.links ?? [];
    s.deductions = new Set(data.deductions ?? []);
    s.theory = data.theory ?? null;
    s.quests = new Map(Object.entries(data.quests ?? {}));
    s.relations = new Map(
      Object.entries(data.relations ?? {}).map(([k, v]) => [
        k,
        { score: v.score, states: new Set(v.states as RelationState[]) },
      ]),
    );
    s.factions = new Map(Object.entries(data.factions ?? {}));
    s.inventory = new Map(Object.entries(data.inventory ?? {}));
    s.tesserae = data.tesserae ?? [];
    s.activeTessera = data.activeTessera ?? '';
    s.npcs = new Map(Object.entries(data.npcs ?? {}));
    s.suspicion = data.suspicion ?? 0;
    s.history = data.history ?? [];
    s.playSeconds = data.playSeconds ?? 0;
    return s;
  }
}
