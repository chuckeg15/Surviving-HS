/**
 * Room construction.
 *
 * Rooms are authored as ASCII art with a legend. That is not laziness: a
 * mystery needs its spaces edited constantly as clues move around, and a layout
 * you can read in a diff is a layout that stays correct. The builder turns a
 * layout into render quads, a collision mask, lights and interaction points.
 *
 * Two things happen automatically because doing them by hand is where tile maps
 * rot:
 *  - Floor variants are chosen by a hash of the tile position, so a corridor of
 *    '.' is never a visibly repeating pattern.
 *  - Walls are sliced: the top row of a wall run gets the cap, the bottom row
 *    the skirting, and everything between the face.
 */

import { TILE } from '@/core/screen';
import { Department, PAL, mix } from '@/art/palette';
import { getTileAtlas, TILE_PX } from '@/art/tiles';
import type { StepSound } from '@/art/tiles';
import type { Light } from '@/render/renderer';
import type { AmbienceId, MusicId } from '@/core/audio';

export interface Quad {
  x: number;
  y: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface LegendEntry {
  floor?: string;
  prop?: string;
  over?: string;
  solid?: boolean;
}

export interface DoorSpec {
  to: string;
  spawn: string;
  /** Flag or clearance that must pass, else the door reports refusal. */
  locked?: string;
  /** Shown when refused. */
  refuse?: string;
  tile?: string;
}

export interface MarkDef extends LegendEntry {
  interact?: string;
  spawn?: string;
  door?: DoorSpec;
  npc?: string;
  light?: { r: number; color: string; i: number; flicker?: number };
}

export interface RoomDef {
  id: string;
  /** Shown on the location banner when the player enters. */
  name: string;
  deck: string;
  department: Department;
  ambient: { color: string; level: number };
  ambience: AmbienceId;
  music?: MusicId;
  /** The thing that tells a lost player where they are. Used by the map screen. */
  landmark: string;
  layout: string[];
  wall?: 'iron' | 'hab' | 'med' | 'reg' | 'spine';
  floor?: string[];
  legend?: Record<string, LegendEntry>;
  marks?: Record<string, MarkDef>;
}

export interface Interactable {
  id: string;
  x: number;
  y: number;
}

export interface DoorInstance extends DoorSpec {
  x: number;
  y: number;
}

export interface AnimatedQuad {
  layer: 'floor' | 'prop' | 'over';
  index: number;
  cells: number[];
  fps: number;
}

export interface BuiltRoom {
  def: RoomDef;
  w: number;
  h: number;
  solid: Uint8Array;
  step: Uint8Array;
  floorQuads: Quad[];
  propQuads: Quad[];
  overQuads: Quad[];
  lights: Light[];
  interactables: Interactable[];
  doors: DoorInstance[];
  spawns: Record<string, { x: number; y: number }>;
  npcAnchors: Record<string, { x: number; y: number }>;
  anim: AnimatedQuad[];
  pixelW: number;
  pixelH: number;
}

const STEP_INDEX: StepSound[] = ['metal', 'grate', 'carpet', 'tile', 'soil'];

/** Default character meanings. Rooms override per-room via `legend`. */
const BASE_LEGEND: Record<string, LegendEntry> = {
  ' ': { floor: 'void.black', solid: true },
  '.': {},
  ':': {},
  '_': { floor: 'floor.grate.a' },
  '=': { floor: 'floor.rivet' },
  '%': { floor: 'floor.hazard' },
  '#': { solid: true }, // resolved to cap/face/base by the wall slicer
  '|': { prop: 'prop.pipe.v', solid: true },
  '-': { prop: 'prop.pipe.h', solid: true },
  'T': { prop: 'prop.table', solid: true },
  't': { prop: 'prop.table.end', solid: true },
  'c': { prop: 'prop.chair.n' },
  'v': { prop: 'prop.chair.s' },
  'B': { prop: 'prop.bunk.head', solid: true },
  'b': { prop: 'prop.bunk.foot', solid: true },
  'K': { prop: 'prop.locker', solid: true },
  'k': { prop: 'prop.locker.tall', solid: true },
  'X': { prop: 'prop.crate.a', solid: true },
  'x': { prop: 'prop.crate.b', solid: true },
  'Z': { prop: 'prop.crate.stack', solid: true },
  'O': { prop: 'prop.barrel', solid: true },
  'P': { prop: 'prop.plant.a', solid: true },
  'W': { prop: 'prop.medbed', solid: true },
  'w': { prop: 'prop.medcart', solid: true },
  'E': { prop: 'prop.extinguisher', solid: true },
  'F': { prop: 'prop.fan', solid: true },
  'V': { prop: 'prop.valve', solid: true },
  'Y': { prop: 'prop.toolbox', solid: true },
  'q': { prop: 'prop.counter.l', solid: true },
  'Q': { prop: 'prop.counter.m', solid: true },
  'e': { prop: 'prop.counter.r', solid: true },
  'r': { prop: 'prop.rug' },
  'd': { prop: 'prop.debris' },
  's': { prop: 'prop.stain' },
  'n': { prop: 'prop.bench', solid: true },
  'L': { prop: 'ladder', solid: true },
  '^': { prop: 'stair.up', solid: true },
  'G': { over: 'prop.light.ceiling' },
  'g': { over: 'prop.light.emergency' },
  'M': { prop: 'prop.console.a', solid: true },
  'm': { prop: 'prop.terminal', solid: true },
  'N': { prop: 'prop.bulletin', solid: true },
  'R': { prop: 'prop.breaker', solid: true },
  'S': { prop: 'prop.sign.dept', solid: true },
  'H': { prop: 'hatch.closed', solid: true },
  'C': { prop: 'prop.cradle', solid: true },
  'U': { prop: 'prop.muster', solid: true },
  'A': { prop: 'prop.crate.tessera', solid: true },
  'J': { prop: 'prop.kettle', solid: true },
  '\\': { over: 'over.pipe.h' },
  '/': { over: 'over.beam' },
  '~': { over: 'over.duct' },
};

const DEFAULT_FLOORS = ['floor.plate.a', 'floor.plate.b', 'floor.plate.c', 'floor.plate.worn'];

/** Cheap deterministic hash so '.' fields pick a stable, non-patterned variant. */
function variantAt(x: number, y: number, n: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return Math.abs(h ^ (h >>> 16)) % n;
}

export function buildRoom(def: RoomDef): BuiltRoom {
  const atlas = getTileAtlas();
  const h = def.layout.length;
  const w = Math.max(...def.layout.map((r) => r.length));
  const legend: Record<string, LegendEntry> = { ...BASE_LEGEND, ...(def.legend ?? {}) };
  const marks = def.marks ?? {};
  const floors = def.floor ?? DEFAULT_FLOORS;
  const wallFamily = def.wall ?? 'iron';

  const solid = new Uint8Array(w * h);
  const step = new Uint8Array(w * h);
  const floorQuads: Quad[] = [];
  const propQuads: Quad[] = [];
  const overQuads: Quad[] = [];
  const lights: Light[] = [];
  const interactables: Interactable[] = [];
  const doors: DoorInstance[] = [];
  const spawns: Record<string, { x: number; y: number }> = {};
  const npcAnchors: Record<string, { x: number; y: number }> = {};
  const anim: AnimatedQuad[] = [];

  const at = (x: number, y: number): string => def.layout[y]?.[x] ?? ' ';
  const cellOf = (id: string): number => atlas.index.get(id) ?? atlas.index.get('void.black') ?? 0;
  const uvOf = (id: string) => {
    const c = cellOf(id);
    return {
      sx: (c % atlas.cols) * TILE_PX,
      sy: Math.floor(c / atlas.cols) * TILE_PX,
      sw: TILE_PX,
      sh: TILE_PX,
    };
  };

  const pushQuad = (list: Quad[], x: number, y: number, id: string): number => {
    list.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE, ...uvOf(id) });
    return list.length - 1;
  };

  const registerMeta = (id: string, x: number, y: number, list: Quad[], layer: AnimatedQuad['layer'], index: number) => {
    const meta = atlas.meta.get(id);
    if (!meta) return;
    if (meta.solid) solid[y * w + x] = 1;
    if (meta.step) step[y * w + x] = Math.max(0, STEP_INDEX.indexOf(meta.step));
    if (meta.light) {
      lights.push({
        x: x * TILE + TILE / 2,
        y: y * TILE + TILE / 2,
        r: meta.light.r,
        color: meta.light.color,
        i: meta.light.i,
        flicker: meta.light.flicker,
      });
    }
    if (meta.anim) {
      anim.push({
        layer,
        index,
        cells: [cellOf(id), ...meta.anim.frames.map(cellOf)],
        fps: meta.anim.fps,
      });
    }
    void list;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = at(x, y);
      const mark = marks[ch];
      const entry: LegendEntry = mark ?? legend[ch] ?? {};

      // ---- walls get sliced by their run position -----------------------
      if (ch === '#') {
        const above = at(x, y - 1) === '#';
        const below = at(x, y + 1) === '#';
        // A one-tile-thick run (side walls, thin partitions) shows the face —
        // that is the surface the player is actually looking at. Only a run
        // deep enough to have a top and a bottom gets the cap and the skirting.
        const slice = !above && !below ? 'face' : !above ? 'cap' : !below ? 'base' : 'face';
        const id = `wall.${wallFamily}.${slice}`;
        const fallback = `wall.${wallFamily}.face`;
        const use = atlas.index.has(id) ? id : fallback;
        const idx = pushQuad(propQuads, x, y, use);
        solid[y * w + x] = 1;
        registerMeta(use, x, y, propQuads, 'prop', idx);
        // A wall still needs a floor beneath it so the deck doesn't show void
        // through the 1px gaps in the skirting art.
        pushQuad(floorQuads, x, y, floors[variantAt(x, y, floors.length)]);
        continue;
      }

      // ---- floor ---------------------------------------------------------
      const floorId =
        entry.floor ??
        (ch === ' ' ? 'void.black' : floors[variantAt(x, y, floors.length)]);
      const fIdx = pushQuad(floorQuads, x, y, floorId);
      registerMeta(floorId, x, y, floorQuads, 'floor', fIdx);

      // ---- prop ----------------------------------------------------------
      if (entry.prop) {
        const pIdx = pushQuad(propQuads, x, y, entry.prop);
        registerMeta(entry.prop, x, y, propQuads, 'prop', pIdx);
      }
      if (entry.over) {
        const oIdx = pushQuad(overQuads, x, y, entry.over);
        registerMeta(entry.over, x, y, overQuads, 'over', oIdx);
      }
      if (entry.solid) solid[y * w + x] = 1;

      // ---- marks ---------------------------------------------------------
      if (mark) {
        if (mark.interact) interactables.push({ id: mark.interact, x, y });
        if (mark.spawn) spawns[mark.spawn] = { x, y };
        if (mark.npc) npcAnchors[mark.npc] = { x, y };
        if (mark.light) lights.push({ x: x * TILE + 8, y: y * TILE + 8, ...mark.light });
        if (mark.door) {
          doors.push({ ...mark.door, x, y });
          const doorTile = mark.door.tile ?? (mark.door.locked ? 'door.locked' : 'door.closed');
          const dIdx = pushQuad(propQuads, x, y, doorTile);
          registerMeta(doorTile, x, y, propQuads, 'prop', dIdx);
          // Doors are walked into, not through — the transition fires on contact.
          solid[y * w + x] = 0;
        }
      }
    }
  }

  return {
    def,
    w,
    h,
    solid,
    step,
    floorQuads,
    propQuads,
    overQuads,
    lights,
    interactables,
    doors,
    spawns,
    npcAnchors,
    anim,
    pixelW: w * TILE,
    pixelH: h * TILE,
  };
}

export function isSolid(room: BuiltRoom, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= room.w || y >= room.h) return true;
  return room.solid[y * room.w + x] === 1;
}

export function stepSoundAt(room: BuiltRoom, x: number, y: number): StepSound {
  if (x < 0 || y < 0 || x >= room.w || y >= room.h) return 'metal';
  return STEP_INDEX[room.step[y * room.w + x]] ?? 'metal';
}

export function doorAt(room: BuiltRoom, x: number, y: number): DoorInstance | undefined {
  return room.doors.find((d) => d.x === x && d.y === y);
}

export function interactAt(room: BuiltRoom, x: number, y: number): Interactable | undefined {
  return room.interactables.find((i) => i.x === x && i.y === y);
}

/**
 * Ambient presets so rooms declare a mood rather than raw numbers.
 *
 * Tints are deliberately close to white. A fully saturated ambient colour acts
 * as a channel filter — an amber room crushes blue to nothing and every tile in
 * it turns the same mud. The tint should say "this light is warmer", not
 * "this room is orange".
 */
export const AMBIENT = {
  lit: { color: PAL.bone3, level: 1.0 },
  warm: { color: mix(PAL.bone3, PAL.amber3, 0.3), level: 0.95 },
  cool: { color: mix(PAL.bone3, PAL.brine4, 0.3), level: 0.94 },
  sterile: { color: mix(PAL.bone3, PAL.brine4, 0.12), level: 1.05 },
  dim: { color: mix(PAL.bone2, PAL.brine4, 0.25), level: 0.76 },
  gloom: { color: mix(PAL.bone1, PAL.brine3, 0.4), level: 0.6 },
  emergency: { color: mix(PAL.bone2, PAL.ember2, 0.5), level: 0.62 },
} as const satisfies Record<string, { color: string; level: number }>;

export type { MusicId };
