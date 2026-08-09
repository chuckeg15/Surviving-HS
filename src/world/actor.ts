/**
 * Actors — the player and every crew member, sharing one movement model.
 *
 * Movement is pixel-based with tile collision rather than tile-stepped. A
 * mystery has the player retracing corridors constantly, and grid-stepping
 * makes that feel like wading. The collision box is a narrow rectangle at the
 * feet, not the sprite bounds, so a character's head can overlap a wall the
 * way it does in every good top-down RPG.
 */

import { TILE } from '@/core/screen';
import { ActorLook, Facing, POSE, WALK_SEQUENCE } from '@/art/actors';
import { BuiltRoom, isSolid } from '@/world/map';

export const WALK_SPEED = 54;
export const RUN_SPEED = 88;

/** Feet box, in pixels, relative to the actor's centre-bottom origin. */
const BOX_W = 10;
const BOX_H = 7;

export interface ActorInit {
  id: string;
  look: ActorLook;
  x: number;
  y: number;
  facing?: Facing;
  name?: string;
}

export class Actor {
  id: string;
  name: string;
  look: ActorLook;
  /** World position in pixels; the origin is between the feet. */
  x: number;
  y: number;
  facing: Facing = 'down';
  moving = false;
  /** Seconds of accumulated walk time, drives the 4-frame cycle. */
  private walkT = 0;
  private bobT = 0;
  pose: number = POSE.stand;
  /** Set while an interaction animation plays. */
  actTimer = 0;
  hurtTimer = 0;
  downed = false;
  visible = true;
  /** Distance travelled since the last footstep sound. */
  stepAccum = 0;

  constructor(init: ActorInit) {
    this.id = init.id;
    this.name = init.name ?? init.id;
    this.look = init.look;
    this.x = init.x;
    this.y = init.y;
    if (init.facing) this.facing = init.facing;
  }

  get tileX(): number {
    return Math.floor(this.x / TILE);
  }
  get tileY(): number {
    return Math.floor((this.y - 1) / TILE);
  }

  /** The tile the actor is facing into — what interaction reaches. */
  facingTile(): { x: number; y: number } {
    const t = { x: this.tileX, y: this.tileY };
    if (this.facing === 'up') t.y -= 1;
    else if (this.facing === 'down') t.y += 1;
    else if (this.facing === 'left') t.x -= 1;
    else t.x += 1;
    return t;
  }

  private canStand(room: BuiltRoom, x: number, y: number): boolean {
    const l = x - BOX_W / 2;
    const r = x + BOX_W / 2 - 1;
    const t = y - BOX_H;
    const b = y - 1;
    for (const [px, py] of [
      [l, t],
      [r, t],
      [l, b],
      [r, b],
      [(l + r) / 2, b],
    ] as [number, number][]) {
      if (isSolid(room, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
    }
    return true;
  }

  /**
   * Axis-separated movement so sliding along a wall works, plus a small corner
   * nudge: if a diagonal input is blocked on one axis, the other still moves.
   * Without the nudge, doorways feel like they catch the player.
   */
  move(room: BuiltRoom, dx: number, dy: number, speed: number, dt: number): boolean {
    if (dx === 0 && dy === 0) {
      this.moving = false;
      return false;
    }
    // normalise so diagonals are not faster
    const len = Math.hypot(dx, dy) || 1;
    const step = speed * dt;
    const mx = (dx / len) * step;
    const my = (dy / len) * step;

    // facing follows the dominant axis, and prefers the new axis on a turn
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';

    let moved = false;
    const nx = this.x + mx;
    if (mx !== 0 && this.canStand(room, nx, this.y)) {
      this.x = nx;
      moved = true;
    }
    const ny = this.y + my;
    if (my !== 0 && this.canStand(room, this.x, ny)) {
      this.y = ny;
      moved = true;
    }

    if (moved) {
      this.walkT += dt;
      this.stepAccum += Math.abs(mx) + Math.abs(my);
    }
    this.moving = moved;
    return moved;
  }

  /** Returns true once per footstep so the caller can play a sound. */
  consumeStep(): boolean {
    if (this.stepAccum >= 15) {
      this.stepAccum = 0;
      return true;
    }
    return false;
  }

  update(dt: number): void {
    if (this.actTimer > 0) this.actTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (!this.moving) {
      this.walkT = 0;
      this.bobT += dt;
    }
    this.pose = this.currentPose();
  }

  private currentPose(): number {
    if (this.downed) return POSE.down;
    if (this.hurtTimer > 0) return POSE.hurt;
    if (this.actTimer > 0) return POSE.act;
    if (!this.moving) return POSE.stand;
    // 4-frame cycle at ~8 fps: stand, stepA, stand, stepB
    const i = Math.floor(this.walkT * 8) % WALK_SEQUENCE.length;
    return WALK_SEQUENCE[i];
  }

  /** 1px vertical bob while walking — kills the "sliding decal" look. */
  get bobOffset(): number {
    if (!this.moving) return 0;
    const i = Math.floor(this.walkT * 8) % 4;
    return i === 1 || i === 3 ? -1 : 0;
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
 * NPC wander/idle. Deliberately small: crew drift a little inside an anchor
 * radius and turn to face the player when spoken to. Real scheduling — which
 * room someone is in at which hour — is handled by the schedule table, because
 * that is the part the player can actually perceive.
 */
export class NpcBrain {
  private timer = 0;
  private dx = 0;
  private dy = 0;
  private pauseFor = 0;
  frozen = false;

  constructor(
    readonly anchorX: number,
    readonly anchorY: number,
    readonly radius = 20,
  ) {}

  update(actor: Actor, room: BuiltRoom, dt: number): void {
    if (this.frozen) {
      actor.moving = false;
      actor.update(dt);
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.2 + Math.random() * 2.6;
      if (this.pauseFor > 0 || Math.random() < 0.55) {
        this.dx = 0;
        this.dy = 0;
        this.pauseFor = 0;
      } else {
        // bias the step back toward the anchor so nobody wanders off post
        const bx = this.anchorX - actor.x;
        const by = this.anchorY - actor.y;
        if (Math.hypot(bx, by) > this.radius) {
          this.dx = Math.sign(bx);
          this.dy = Math.sign(by);
        } else {
          this.dx = [-1, 0, 1][Math.floor(Math.random() * 3)];
          this.dy = [-1, 0, 1][Math.floor(Math.random() * 3)];
        }
      }
    }
    if (this.dx || this.dy) actor.move(room, this.dx, this.dy, WALK_SPEED * 0.55, dt);
    else actor.moving = false;
    actor.update(dt);
  }

  freeze(): void {
    this.frozen = true;
  }
  thaw(): void {
    this.frozen = false;
  }
}
