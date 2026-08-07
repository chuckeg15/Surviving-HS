/**
 * Save slots. Three manual slots plus a dedicated autosave, stored in
 * localStorage as versioned JSON.
 *
 * Corruption handling is not decorative: a save that fails to parse, or that
 * carries a version this build cannot migrate, is reported to the player as a
 * damaged slot rather than crashing the title screen or being silently wiped.
 */

import { GameState, SAVE_VERSION, SerializedState } from '@/game/state';
import { bus } from '@/core/events';

export const SLOT_COUNT = 3;
export const AUTOSAVE_SLOT = 0;

const KEY = (slot: number) => `candlewake.save.${slot}`;

export interface SlotInfo {
  slot: number;
  empty: boolean;
  damaged: boolean;
  name?: string;
  background?: string;
  chapter?: number;
  clock?: string;
  clues?: number;
  room?: string;
  savedAt?: number;
  playSeconds?: number;
}

function migrate(raw: SerializedState): SerializedState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  if (typeof raw.version !== 'number') return null;
  if (raw.version > SAVE_VERSION) return null; // written by a newer build
  // v1 -> v2 added `suspicion`; v2 -> v3 added `playSeconds`. Both are additive,
  // so defaulting is a complete migration.
  if (raw.version < 2) raw.suspicion = raw.suspicion ?? 0;
  if (raw.version < 3) raw.playSeconds = raw.playSeconds ?? 0;
  raw.version = SAVE_VERSION;
  return raw;
}

export function readSlot(slot: number): SerializedState | null {
  try {
    const s = localStorage.getItem(KEY(slot));
    if (!s) return null;
    return migrate(JSON.parse(s) as SerializedState);
  } catch {
    return null;
  }
}

export function slotInfo(slot: number): SlotInfo {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY(slot));
  } catch {
    return { slot, empty: true, damaged: false };
  }
  if (!raw) return { slot, empty: true, damaged: false };
  const data = readSlot(slot);
  if (!data) return { slot, empty: false, damaged: true };
  const found = Object.values(data.clues ?? {}).filter((c) => c.found && !c.lost).length;
  const total = 2 * 60 + (data.timeBlock ?? 0) * 20;
  const clock = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return {
    slot,
    empty: false,
    damaged: false,
    name: data.profile?.name ?? '???',
    background: data.profile?.background,
    chapter: data.chapter ?? 1,
    clock,
    clues: found,
    room: data.room,
    savedAt: data.savedAt,
    playSeconds: data.playSeconds ?? 0,
  };
}

export function allSlots(): SlotInfo[] {
  const out: SlotInfo[] = [];
  for (let i = 0; i <= SLOT_COUNT; i++) out.push(slotInfo(i));
  return out;
}

export function writeSlot(slot: number, state: GameState): boolean {
  try {
    localStorage.setItem(KEY(slot), JSON.stringify(state.serialize()));
    bus.emit('save:written', { slot });
    return true;
  } catch {
    return false;
  }
}

export function deleteSlot(slot: number): void {
  try {
    localStorage.removeItem(KEY(slot));
  } catch {
    /* nothing sensible to do */
  }
}

export function loadSlot(slot: number): GameState | null {
  const data = readSlot(slot);
  if (!data) return null;
  try {
    return GameState.deserialize(data);
  } catch {
    return null;
  }
}

export function hasAnySave(): boolean {
  return allSlots().some((s) => !s.empty && !s.damaged);
}

export function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
