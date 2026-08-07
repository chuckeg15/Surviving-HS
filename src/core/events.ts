/**
 * Typed event bus. Systems talk through this rather than holding references to
 * each other; it is the only sanctioned cross-system channel, so that e.g. the
 * clue system can react to a battle ending without combat knowing clues exist.
 */

export interface GameEvents {
  'flag:set': { key: string; value: number | string | boolean };
  'clue:found': { id: string; silent?: boolean };
  'clue:linked': { a: string; b: string; deductionId: string | null };
  'quest:started': { id: string };
  'quest:stage': { id: string; stage: string };
  'quest:done': { id: string; outcome: string };
  'relation:changed': { npc: string; from: string; to: string; delta: number };
  'npc:moved': { id: string; room: string };
  'combat:start': { encounterId: string };
  'combat:end': { encounterId: string; result: 'win' | 'lose' | 'flee' | 'spared' | 'captured' };
  'combat:scanned': { revenantId: string };
  'scene:change': { from: string; to: string };
  'room:enter': { room: string };
  'dialogue:start': { npc: string; node: string };
  'dialogue:end': { npc: string };
  'save:written': { slot: number };
  'audio:cue': { id: string };
  'time:tick': { block: number };
  'toast': { text: string; icon?: string; tone?: 'info' | 'good' | 'bad' | 'clue' };
  'chapter:end': { outcome: string };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

export class EventBus {
  private map = new Map<string, Set<(p: unknown) => void>>();

  on<K extends keyof GameEvents>(key: K, fn: Handler<K>): () => void {
    let set = this.map.get(key as string);
    if (!set) this.map.set(key as string, (set = new Set()));
    set.add(fn as (p: unknown) => void);
    return () => this.off(key, fn);
  }

  once<K extends keyof GameEvents>(key: K, fn: Handler<K>): () => void {
    const off = this.on(key, ((p: GameEvents[K]) => {
      off();
      fn(p);
    }) as Handler<K>);
    return off;
  }

  off<K extends keyof GameEvents>(key: K, fn: Handler<K>): void {
    this.map.get(key as string)?.delete(fn as (p: unknown) => void);
  }

  emit<K extends keyof GameEvents>(key: K, payload: GameEvents[K]): void {
    const set = this.map.get(key as string);
    if (!set) return;
    // copy so handlers may unsubscribe during dispatch
    for (const fn of [...set]) {
      try {
        fn(payload as unknown);
      } catch (err) {
        console.error(`[events] handler for "${String(key)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}

export const bus = new EventBus();
