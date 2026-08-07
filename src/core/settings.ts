/**
 * Settings + accessibility. Every option here is read by real code paths;
 * nothing in this file is decorative.
 */

import { Binding, DEFAULT_BINDINGS } from '@/core/input';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Settings {
  // audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  // text
  textSpeed: TextSpeed;
  autoAdvance: 'off' | 'short' | 'long';
  highContrastText: boolean;
  /** Draws dialogue at 2x. Halves the characters per line, so the box grows. */
  largeText: boolean;
  // motion / visual accessibility
  reduceFlashing: boolean;
  reduceShake: boolean;
  reduceMotion: boolean;
  /** Adds shape/letter markers wherever colour alone would carry meaning. */
  symbolMarkers: boolean;
  /** Floor on how dark unlit areas may get. Navigation must never fail. */
  minAmbient: number;
  scanlines: boolean;
  // gameplay
  combatSpeed: number;
  combatAssist: boolean;
  objectiveHud: boolean;
  runMode: 'hold' | 'toggle';
  // input
  bindings: Binding;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.75,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  ambienceVolume: 0.7,
  textSpeed: 'normal',
  autoAdvance: 'off',
  highContrastText: false,
  largeText: false,
  reduceFlashing: false,
  reduceShake: false,
  reduceMotion: false,
  symbolMarkers: true,
  minAmbient: 0.22,
  scanlines: true,
  combatSpeed: 1,
  combatAssist: true,
  objectiveHud: true,
  runMode: 'hold',
  bindings: structuredClone(DEFAULT_BINDINGS),
};

/** Characters revealed per second, by setting. */
export const TEXT_CPS: Record<TextSpeed, number> = {
  slow: 22,
  normal: 42,
  fast: 80,
  instant: Infinity,
};

const KEY = 'candlewake.settings.v1';

export class SettingsStore {
  private data: Settings = structuredClone(DEFAULT_SETTINGS);
  private listeners = new Set<(s: Settings) => void>();

  constructor() {
    this.load();
  }

  get(): Readonly<Settings> {
    return this.data;
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.data[key] = value;
    this.save();
    for (const fn of this.listeners) fn(this.data);
  }

  patch(p: Partial<Settings>): void {
    Object.assign(this.data, p);
    this.save();
    for (const fn of this.listeners) fn(this.data);
  }

  onChange(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(): void {
    this.data = structuredClone(DEFAULT_SETTINGS);
    this.save();
    for (const fn of this.listeners) fn(this.data);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Settings>;
      // merge field-by-field: an older save missing new keys must still work
      for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
        if (parsed[k] !== undefined && typeof parsed[k] === typeof DEFAULT_SETTINGS[k]) {
          (this.data as unknown as Record<string, unknown>)[k] = parsed[k];
        }
      }
      if (parsed.bindings && typeof parsed.bindings === 'object') {
        this.data.bindings = { ...structuredClone(DEFAULT_BINDINGS), ...parsed.bindings };
      }
    } catch {
      // corrupt settings should never block startup
      this.data = structuredClone(DEFAULT_SETTINGS);
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage may be unavailable in private mode; game still runs */
    }
  }

  /** Effective volume for a channel, after master. */
  vol(channel: 'music' | 'sfx' | 'ambience'): number {
    const m = this.data.masterVolume;
    return (
      m *
      (channel === 'music'
        ? this.data.musicVolume
        : channel === 'sfx'
          ? this.data.sfxVolume
          : this.data.ambienceVolume)
    );
  }
}

export const settings = new SettingsStore();
