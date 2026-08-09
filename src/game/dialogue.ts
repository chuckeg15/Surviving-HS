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
import { LINE_H, wrapText } from '@/art/font';
import { PAL } from '@/art/palette';
import { Painter, type TextOpts } from '@/ui/painter';
import { settings, TEXT_CPS } from '@/core/settings';
import { audio } from '@/core/audio';

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

/**
 * Extra beat held after a mark, in seconds.
 *
 * These are real time rather than a number of characters, so a full stop is
 * the same length of silence at every text speed. Measured in characters they
 * would shrink exactly where the reader is going fastest and needs the breath
 * most \x7f which is the opposite of the point.
 */
const HOLD: Record<string, number> = {
  '.': 0.12,
  '!': 0.12,
  '?': 0.12,
  '\x7f': 0.09,
  ',': 0.05,
  ';': 0.05,
  ':': 0.05,
};

/**
 * Target blips per second. The blip is per few characters, not per character:
 * one per character is a buzz at any speed worth reading at, and the interval
 * is derived from the speed so the texture is the same whether the line is
 * arriving at 22 or 80 characters a second.
 */
const BLIP_HZ = 13;

/**
 * Seconds a completed page refuses further confirms.
 *
 * Finishing a page instantly is only half the promise. Without this, the
 * second press of a two-press mash lands on a page that became complete a
 * frame ago and turns it, so the sentence the first press asked to see is gone
 * before it was read. Long enough to absorb a mash, short enough that a
 * deliberate second press still turns the page.
 */
const GUARD = 0.15;

export interface RevealOpts {
  /** Pixel width the text is wrapped to. */
  width: number;
  /** Lines the box shows at once. Anything past this becomes a further page. */
  maxLines?: number;
  scale?: number;
  /** Distinguishes two passages that happen to be worded identically. */
  token?: string;
  /** Silences the blip for text the player did not press anything to see. */
  quiet?: boolean;
}

/**
 * Typewriter reveal: one implementation for every box in the game.
 *
 * A scene owns an instance, hands it the string it wants shown, and asks it
 * three questions \x7f is it still typing, is the box full with more to come,
 * is it finished. The scene keeps its own layout and its own chrome.
 *
 * The rule that matters more than the effect is `confirm()`: a press while
 * text is still arriving finishes the current page and is *consumed*, so it
 * cannot also advance. Two fast presses can therefore never skip a sentence
 * the player has not read, and a fast reader is never made to wait for one.
 */
export class TextReveal {
  /** Wrapped lines, grouped into pages of at most `maxLines`. */
  private pages: string[][] = [['']];
  private page = 0;
  /** The current page's lines end to end; the reveal position indexes this. */
  private chars = '';
  /** Index into `chars` where each line of the page starts. */
  private starts: number[] = [0];
  private breaks = new Set<number>();
  private shown = 0;
  private acc = 0;
  private hold = 0;
  private guard = 0;
  private sinceBlip = 0;
  private key = '';
  private scale = 1;
  private cap = 1;
  private quiet = false;

  /**
   * Feeds the reveal the string it should be showing. Cheap to call every
   * frame: the same text at the same size is a no-op, so a caller can simply
   * hand over whatever its queue or dialogue node currently says.
   */
  show(text: string, o: RevealOpts): void {
    const key = `${o.token ?? ''}|${o.width}|${o.maxLines ?? 0}|${o.scale ?? 1}|${text}`;
    if (key === this.key) return;
    this.key = key;
    this.scale = Math.max(1, (o.scale ?? 1) | 0);
    this.quiet = o.quiet ?? false;
    const lines = wrapText(text, o.width / this.scale);
    const per = Math.max(1, o.maxLines ?? lines.length);
    this.cap = Math.max(1, Math.min(per, lines.length));
    this.pages = [];
    for (let i = 0; i < lines.length; i += per) this.pages.push(lines.slice(i, i + per));
    if (!this.pages.length) this.pages = [['']];
    this.page = 0;
    this.startPage();
  }

  /** Types the same text again from the first page. */
  restart(): void {
    this.page = 0;
    this.startPage();
  }

  update(dt: number): void {
    if (this.guard > 0) this.guard -= dt;
    if (this.shown >= this.chars.length) return;
    const cps = TEXT_CPS[settings.get().textSpeed];
    if (cps === Infinity) {
      this.shown = this.chars.length;
      return;
    }
    if (this.hold > 0) {
      this.hold -= dt;
      return;
    }
    this.acc += dt * cps;
    while (this.acc >= 1 && this.shown < this.chars.length) {
      this.acc -= 1;
      this.step(cps);
      if (this.hold > 0) break;
    }
  }

  /**
   * Feed a confirm press. True means the reveal took it and the caller must
   * not advance: either the page was still typing, or there was another page.
   */
  confirm(): boolean {
    if (this.typing) {
      this.shown = this.chars.length;
      this.acc = 0;
      this.hold = 0;
      this.guard = GUARD;
      return true;
    }
    if (this.guard > 0) return true;
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.startPage();
      audio.sfx('ui.move', { gain: 0.4 });
      return true;
    }
    return false;
  }

  /** Characters are still arriving: the player is being asked to wait. */
  get typing(): boolean {
    return this.shown < this.chars.length;
  }

  /** The box is full and there is more of this passage behind it. */
  get more(): boolean {
    return !this.typing && this.page < this.pages.length - 1;
  }

  /** Every page of the passage has been shown. */
  get finished(): boolean {
    return !this.typing && this.page >= this.pages.length - 1;
  }

  /**
   * Lines the box must be tall enough for. Constant across the pages of one
   * passage, so a box that sizes itself to its content does not jump when the
   * player pages through it.
   */
  get boxLines(): number {
    return this.cap;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  /** Zero-based page being shown, for a caller that wants to say "2 of 3". */
  get pageIndex(): number {
    return this.page;
  }

  /** Draws the visible part of the current page. */
  draw(p: Painter, x: number, y: number, o: TextOpts & { lineHeight?: number } = {}): void {
    const page = this.pages[this.page];
    const lh = o.lineHeight ?? LINE_H * this.scale;
    for (let i = 0; i < page.length; i++) {
      const take = this.shown - this.starts[i];
      if (take <= 0) break;
      p.text(page[i], x, y + i * lh, { ...o, scale: this.scale, limit: take });
    }
  }

  /**
   * The prompt in the corner of the box. The three states have to be told
   * apart without reading them: still typing is a dim, still chevron that says
   * wait; a full box with more behind it is a bright blinking arrow pointing
   * down at the text it is hiding; a finished passage is the steady cursor the
   * rest of the interface uses for "your turn".
   */
  drawIndicator(p: Painter, x: number, y: number, time: number): void {
    if (this.typing) {
      p.text('\x04', x, y, { color: PAL.iron4 });
      return;
    }
    if (this.more) {
      if (Math.sin(time * 5) > 0) p.text('\x02', x, y, { color: PAL.halo3, shadow: PAL.void0 });
      return;
    }
    p.text('\x05', x, y, { color: PAL.halo2 });
  }

  private startPage(): void {
    const page = this.pages[this.page];
    this.chars = page.join('');
    this.starts = [];
    this.breaks = new Set();
    let n = 0;
    for (const line of page) {
      this.starts.push(n);
      if (n > 0) this.breaks.add(n);
      n += line.length;
    }
    this.shown = 0;
    this.acc = 0;
    this.hold = 0;
    this.sinceBlip = 0;
  }

  private step(cps: number): void {
    const i = this.shown++;
    const ch = this.chars[i];
    if (ch !== ' ' && ++this.sinceBlip >= Math.max(2, Math.round(cps / BLIP_HZ))) {
      this.sinceBlip = 0;
      if (!this.quiet) audio.sfx('text.blip', { gain: 0.3 });
    }
    // Only pause on a mark that ends a word. Without that test "9-C" stops
    // twice and an ellipsis stops three times.
    const next = i + 1;
    if (next < this.chars.length && (this.chars[next] === ' ' || this.breaks.has(next))) {
      this.hold = HOLD[ch] ?? 0;
    }
  }
}
