/**
 * Actors — the player and every crew member, sharing one movement model.
 *
 * Movement is tile-quantised. A character occupies exactly one tile; an input
 * begins a step to an adjacent tile, the character crosses it at a constant
 * rate over a fixed duration, and lands exactly on the grid. There is no such
 * thing as a sub-tile resting position. Everything downstream gets simpler for
 * it: collision is one test at the start of a step instead of a swept box,
 * "what am I standing on" and "what am I facing" are exact, and the walk cycle
 * can be a function of distance rather than of the clock.
 *
 * Two rules carry most of the feel:
 *
 *  - A direction the character is not already facing turns them and nothing
 *    more. Only a held input commits the tile. This game puts something worth
 *    examining on nearly every adjacent tile, and without turn-in-place the
 *    player spends the whole mystery overshooting things.
 *  - Input during a step is buffered rather than dropped, so a direction tapped
 *    mid-stride is honoured the moment the foot lands. Dropping it is what
 *    makes grid movement feel sticky, which is the usual reason people reach
 *    for free movement instead.
 */

import { TILE } from '@/core/screen';
import { ActorLook, FACINGS, Facing, POSE, WALK_SEQUENCE } from '@/art/actors';
import { BuiltRoom, isSolid } from '@/world/map';

/** Seconds to cross one tile. Running changes this and nothing else. */
export const WALK_STEP = 0.26;
export const RUN_STEP = 0.155;
/** Crew amble. Slow enough to read as "on duty", not as "going somewhere". */
export const NPC_STEP = 0.42;

/**
 * How long a direction must be held, from a standstill, before the turn becomes
 * a step. Short enough that a player who means to walk never notices it; long
 * enough that a player who means to turn never moves. Releasing clears it, so a
 * second press walks immediately.
 */
const TURN_TIME = 0.1;
/** Re-arm time on the bump response, so leaning on a wall is one thud. */
const BUMP_GATE = 0.32;
/** How long the sprite leans into what it just walked into. */
const BUMP_LEAN = 0.14;

const DELTA: Record<Facing, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** What a steer request did, so the caller can answer it with a sound. */
export type StepOutcome = 'idle' | 'turn' | 'walk' | 'bump' | 'busy';

/** Refuses a destination tile for a reason collision does not know about. */
export type EntryFilter = (tileX: number, tileY: number) => boolean;

export interface ActorInit {
  id: string;
  look: ActorLook;
  tileX: number;
  tileY: number;
  facing?: Facing;
  name?: string;
}

export class Actor {
  id: string;
  name: string;
  look: ActorLook;
  /**
   * The tile the actor occupies. During a step this is already the destination:
   * the actor is committed the instant the step begins, so doors, interaction
   * and collision all read one unambiguous tile instead of a rounded position.
   */
  tileX: number;
  tileY: number;
  facing: Facing = 'down';
  pose: number = POSE.stand;
  /** Set while an interaction animation plays. */
  actTimer = 0;
  hurtTimer = 0;
  downed = false;
  visible = true;

  /** The tile being stepped from; equal to the occupied tile at rest. */
  private fromX: number;
  private fromY: number;
  /** Progress across the current step. 1 means standing on the grid. */
  private stepT = 1;
  private stepDur = WALK_STEP;
  /** Time left over from the frame a step completed on, spent on the next. */
  private carry = 0;
  /** Which foot leads, flipped every completed step. */
  private lead = 0;
  private turnHold = 0;
  private buffered: Facing | null = null;
  private bumpGate = 0;
  private bumpLean = 0;

  constructor(init: ActorInit) {
    this.id = init.id;
    this.name = init.name ?? init.id;
    this.look = init.look;
    this.tileX = this.fromX = init.tileX;
    this.tileY = this.fromY = init.tileY;
    if (init.facing) this.facing = init.facing;
  }

  /** World position in pixels; the origin is between the feet. */
  get x(): number {
    return (this.fromX + (this.tileX - this.fromX) * this.stepT) * TILE + TILE / 2;
  }
  get y(): number {
    return (this.fromY + (this.tileY - this.fromY) * this.stepT) * TILE + TILE;
  }

  get moving(): boolean {
    return this.stepT < 1;
  }

  /** The tile the actor is facing into — what interaction reaches. */
  facingTile(): { x: number; y: number } {
    const [dx, dy] = DELTA[this.facing];
    return { x: this.tileX + dx, y: this.tileY + dy };
  }

  /** Puts the actor exactly on a tile, abandoning any step in flight. */
  placeAt(tileX: number, tileY: number, facing?: Facing): void {
    this.tileX = this.fromX = tileX;
    this.tileY = this.fromY = tileY;
    this.stepT = 1;
    this.carry = 0;
    this.turnHold = 0;
    this.buffered = null;
    if (facing) this.facing = facing;
  }

  /**
   * Carries a step already in flight. Returns true on the frame the actor lands
   * — the frame doors fire on, and the only moment the world may move them.
   *
   * Always called, whatever else the scene is doing: a character stranded
   * half-way between two tiles because a conversation started mid-stride is the
   * one thing quantisation must never produce.
   */
  advance(dt: number): boolean {
    if (this.turnHold > 0) this.turnHold -= dt;
    if (this.bumpGate > 0) this.bumpGate -= dt;
    if (this.bumpLean > 0) this.bumpLean -= dt;
    if (this.stepT >= 1) return false;
    this.stepT += dt / this.stepDur;
    if (this.stepT < 1) return false;
    // Overflow is kept rather than discarded, or the effective speed would be
    // quantised to the frame rate and drift against every other timeline.
    this.carry = Math.min(this.stepDur, (this.stepT - 1) * this.stepDur);
    this.stepT = 1;
    this.fromX = this.tileX;
    this.fromY = this.tileY;
    this.lead ^= 1;
    return true;
  }

  /**
   * Asks for a direction. `null` means nothing is being held. `seconds` is the
   * duration of the step this request would start, so running is a change of
   * pace and never a change of grid.
   */
  steer(
    room: BuiltRoom,
    dir: Facing | null,
    seconds: number,
    blocked?: EntryFilter,
  ): StepOutcome {
    if (this.stepT < 1) {
      if (dir) this.buffered = dir;
      return 'busy';
    }
    const want = dir ?? this.buffered;
    this.buffered = null;
    if (!want) {
      this.turnHold = 0;
      this.carry = 0;
      return 'idle';
    }
    if (want !== this.facing) {
      this.facing = want;
      this.turnHold = TURN_TIME;
      this.carry = 0;
      return 'turn';
    }
    if (this.turnHold > 0) return 'turn';

    const [dx, dy] = DELTA[want];
    const nx = this.tileX + dx;
    const ny = this.tileY + dy;
    if (isSolid(room, nx, ny) || blocked?.(nx, ny)) {
      this.carry = 0;
      const first = this.bumpGate <= 0;
      this.bumpGate = BUMP_GATE;
      if (first) this.bumpLean = BUMP_LEAN;
      return first ? 'bump' : 'idle';
    }
    this.fromX = this.tileX;
    this.fromY = this.tileY;
    this.tileX = nx;
    this.tileY = ny;
    this.stepDur = seconds;
    this.stepT = Math.min(0.99, this.carry / seconds);
    this.carry = 0;
    return 'walk';
  }

  update(dt: number): void {
    if (this.actTimer > 0) this.actTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.pose = this.currentPose();
  }

  private currentPose(): number {
    if (this.downed) return POSE.down;
    if (this.hurtTimer > 0) return POSE.hurt;
    if (this.actTimer > 0) return POSE.act;
    if (this.stepT >= 1) return POSE.stand;
    /**
     * The stride is a function of distance, never of elapsed time. One tile is
     * one foot forward, alternating, so the legs cannot move at a rate the body
     * does not — the single most common tell of an amateur top-down game.
     * WALK_SEQUENCE is [stand, stepA, stand, stepB]: the stride leads the tile
     * and the passing frame closes it.
     */
    return WALK_SEQUENCE[(this.lead << 1) | (this.stepT < 0.5 ? 1 : 0)];
  }

  /** 1px vertical bob, once per tile — kills the "sliding decal" look. The
   *  body rides highest at mid-stride, where the legs pass under it. */
  get bobOffset(): number {
    if (this.stepT >= 1) return 0;
    return this.stepT >= 0.5 ? -1 : 0;
  }

  /** A pixel of lean into whatever the actor just walked into. */
  get leanX(): number {
    return this.bumpLean > 0 ? DELTA[this.facing][0] : 0;
  }
  get leanY(): number {
    return this.bumpLean > 0 ? DELTA[this.facing][1] : 0;
  }

  faceTowards(x: number, y: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
  }

  distanceTo(o: Actor): number {
    return Math.hypot(o.x - this.x, o.y - this.y);
  }

  act(seconds = 0.35): void {
    this.actTimer = seconds;
  }
  hurt(seconds = 0.3): void {
    this.hurtTimer = seconds;
  }
}

/**
 * NPC wander/idle. Deliberately small: crew drift a tile or two inside an
 * anchor radius and turn to face the player when spoken to. Real scheduling —
 * which room someone is in at which hour — is handled by the schedule table,
 * because that is the part the player can actually perceive.
 *
 * The wander is measured in tiles, not pixels, and commits to a whole number of
 * them per decision. A crewman who steps is a crewman who is still on his post
 * when the player comes back.
 */
export class NpcBrain {
  private timer = 0;
  private dir: Facing | null = null;
  private tilesLeft = 0;
  frozen = false;

  constructor(
    readonly anchorX: number,
    readonly anchorY: number,
    readonly radius = 2,
  ) {}

  update(actor: Actor, room: BuiltRoom, dt: number): void {
    // A frozen NPC still finishes the tile it is on, so nobody stops mid-stride
    // to be spoken to.
    actor.advance(dt);
    if (this.frozen) {
      this.dir = null;
      actor.update(dt);
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0 && !this.dir) {
      this.timer = 1.2 + Math.random() * 2.6;
      const bx = this.anchorX - actor.tileX;
      const by = this.anchorY - actor.tileY;
      if (Math.abs(bx) > this.radius || Math.abs(by) > this.radius) {
        // pull back toward the post along whichever axis has drifted furthest
        this.dir =
          Math.abs(bx) >= Math.abs(by)
            ? bx > 0
              ? 'right'
              : 'left'
            : by > 0
              ? 'down'
              : 'up';
        this.tilesLeft = 1;
      } else if (Math.random() < 0.55) {
        this.dir = null;
      } else {
        this.dir = FACINGS[(Math.random() * FACINGS.length) | 0];
        this.tilesLeft = Math.random() < 0.35 ? 2 : 1;
      }
    }

    if (this.dir) {
      const out = actor.steer(room, this.dir, NPC_STEP);
      if (out === 'walk' && --this.tilesLeft <= 0) this.dir = null;
      else if (out === 'bump') this.dir = null;
    }
    actor.update(dt);
  }

  freeze(): void {
    this.frozen = true;
  }
  thaw(): void {
    this.frozen = false;
  }
}
