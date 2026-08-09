/**
 * Branching dialogue runtime.
 *
 * Conditions and effects are plain TypeScript functions rather than a string
 * DSL. A mystery's dialogue conditions get genuinely complicated ("has D3, has
 * not told Sabbat, Trave is at least wary, and is not the watch background"),
 * and a hand-rolled DSL for that is a bug farm with worse tooling.
 *
 * Two rules the writer must be able to rely on:
 *  - A choice whose `if` fails is either hidden entirely, or shown greyed with
 *    its `hint` so the player learns that another route existed. It is never
 *    shown as available and then refused.
 *  - `tone` is displayed. The player is told what they are about to be, so a
 *    choice can be surprising in outcome but never in intent.
 */

import { GameState } from '@/game/state';
import type { Expression } from '@/art/actors';

export type Tone =
  | 'neutral'
  | 'honest'
  | 'press'
  | 'gentle'
  | 'cold'
  | 'lie'
  | 'threaten'
  | 'accuse'
  | 'silent'
  | 'wry'
  | 'technical';

export const TONE_LABEL: Record<Tone, string> = {
  neutral: '',
  honest: 'honest',
  press: 'press',
  gentle: 'gentle',
  cold: 'cold',
  lie: 'lie',
  threaten: 'threaten',
  accuse: 'accuse',
  silent: 'say nothing',
  wry: 'wry',
  technical: 'technical',
};

export interface DlgCtx {
  /** Ends the conversation after this node resolves. */
  end(): void;
  /** Queues a battle to start when the conversation closes. */
  battle(id: string): void;
  toast(text: string, tone?: 'info' | 'good' | 'bad' | 'clue'): void;
  /** Jump to a node in another NPC's tree (rare; used for hand-offs). */
  goto(node: string): void;
}

export interface DlgChoice {
  text: string;
  tone?: Tone;
  to?: string;
  if?: (s: GameState) => boolean;
  /** When `if` fails: show greyed with this label instead of hiding. */
  hint?: string;
  /** Hidden once taken. */
  once?: boolean;
  do?: (s: GameState, c: DlgCtx) => void;
}

export interface DlgNode {
  id: string;
  /** NPC id, 'player', or omitted for narration. */
  speaker?: string;
  expr?: Expression;
  text: string | ((s: GameState) => string);
  onEnter?: (s: GameState, c: DlgCtx) => void;
  choices?: DlgChoice[];
  /** Continue straight to another node when the text is dismissed. */
  next?: string | ((s: GameState) => string);
  end?: boolean;
}

export type DlgTree = Record<string, DlgNode>;

export interface DialogueDef {
  /** Chooses the entry node from current state — this is where NPC memory lives. */
  entry: (s: GameState) => string;
  nodes: DlgTree;
}

export class DialogueRunner {
  node: DlgNode;
  /** Choices visible on the current node, already filtered. */
  visible: { choice: DlgChoice; enabled: boolean; label: string }[] = [];
  finished = false;
  pendingBattle: string | null = null;
  private toasts: { text: string; tone: string }[] = [];

  constructor(
    readonly tree: DlgTree,
    startId: string,
    readonly state: GameState,
    readonly npcId: string,
  ) {
    this.node = tree[startId] ?? tree[Object.keys(tree)[0]];
    this.enter();
  }

  private ctx(): DlgCtx {
    return {
      end: () => {
        this.finished = true;
      },
      battle: (id) => {
        this.pendingBattle = id;
      },
      toast: (text, tone = 'info') => this.toasts.push({ text, tone }),
      goto: (n) => this.jump(n),
    };
  }

  drainToasts(): { text: string; tone: string }[] {
    const t = this.toasts.slice();
    this.toasts.length = 0;
    return t;
  }

  private enter(): void {
    this.state.markNode(this.npcId, this.node.id);
    this.node.onEnter?.(this.state, this.ctx());
    this.rebuildChoices();
  }

  private rebuildChoices(): void {
    this.visible = [];
    for (const c of this.node.choices ?? []) {
      const ok = c.if ? c.if(this.state) : true;
      if (!ok && !c.hint) continue;
      if (c.once && this.state.sawNode(this.npcId, choiceKey(this.node.id, c))) continue;
      this.visible.push({ choice: c, enabled: ok, label: ok ? c.text : c.hint! });
    }
  }

  get text(): string {
    return typeof this.node.text === 'function' ? this.node.text(this.state) : this.node.text;
  }

  get speaker(): string | undefined {
    return this.node.speaker;
  }

  /** True when the node has choices the player must answer. */
  get awaitingChoice(): boolean {
    return this.visible.length > 0;
  }

  jump(id: string): void {
    const n = this.tree[id];
    if (!n) {
      this.finished = true;
      return;
    }
    this.node = n;
    this.enter();
  }

  /** Dismiss a text-only node. */
  advance(): void {
    if (this.node.end) {
      this.finished = true;
      return;
    }
    const nx = typeof this.node.next === 'function' ? this.node.next(this.state) : this.node.next;
    if (nx) this.jump(nx);
    else this.finished = true;
  }

  choose(index: number): void {
    const v = this.visible[index];
    if (!v || !v.enabled) return;
    const c = v.choice;
    this.state.markNode(this.npcId, choiceKey(this.node.id, c));
    c.do?.(this.state, this.ctx());
    if (this.finished) return;
    if (c.to) this.jump(c.to);
    else this.advance();
  }
}

function choiceKey(nodeId: string, c: DlgChoice): string {
  return `${nodeId}#${c.text.slice(0, 24)}`;
}
