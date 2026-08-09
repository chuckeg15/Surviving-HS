/**
 * Deterministic RNG. Combat, NPC idle behaviour and art generation all pull
 * from seeded streams so that (a) a saved game reloads to the same world, and
 * (b) the automated playtest harness produces reproducible runs.
 */

export class Rng {
  private s: number;

  constructor(seed: number | string) {
    this.s = typeof seed === 'string' ? Rng.hash(seed) : seed >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  static hash(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** mulberry32 — small, fast, good enough for gameplay. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  intRange(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  get state(): number {
    return this.s;
  }
  set state(v: number) {
    this.s = v >>> 0;
  }
}

/** Shared stream for cosmetic, non-persisted effects. */
export const fx = new Rng(0xc4ed1e);
