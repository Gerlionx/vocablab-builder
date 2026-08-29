/**
 * Classroom name-wheel physics.
 *
 * Spin, axle friction and peg drag are inspired by
 * rolandzeiner/spinning-wheel-card (MIT, Copyright (c) 2026 Roland Zeiner):
 * https://github.com/rolandzeiner/spinning-wheel-card
 *
 * Where the disc dies is where it stays — no second shove after rest.
 */

import { coulombDecel, frictionMultiplier } from "@/lib/wheel-friction";
import { clickerContactDeg, clickerSweepDeg, pegIndex } from "@/lib/wheel-math";

const TWO_PI = Math.PI * 2;
const FRICTION_LEVEL = 3;
const STOP_THRESHOLD = 0.01;
const CLICK_IMPULSE_MIN = 16;
const CLICK_IMPULSE_MAX = 23;
const PEG_DRAG = 0.02;
/** Dry-axle bite — keep this low so the disc coasts like it’s oiled. */
const COULOMB_SCALE = 0.28;
/** Peg is past the tip. After this, the wheel must not roll back. */
const PASSED_DEG = 0.7;
const IDLE_OMEGA = 0.11;
const TICK_MAX_PER_FRAME = 8;

function wrapRad(a: number) {
  return ((a % TWO_PI) + TWO_PI) % TWO_PI;
}

export type WheelPhysicsFrame = {
  angleDeg: number;
  clickerDeg: number;
  spinning: boolean;
};

export type WheelPhysicsHandlers = {
  onFrame: (frame: WheelPhysicsFrame) => void;
  onPegs: (crossed: number, speed: number, dt: number) => void;
  onRest: (angleDeg: number) => void;
};

export class WheelPhysics {
  private pegCount: number;
  private angle = 0;
  private omega = 0;
  private clicker = 0;
  private clickerVel = 0;
  private mode: "idle" | "spin" | "rest" = "idle";
  private lastDir = 0;
  private lastPeg = -1;
  private crossedThisFrame = 0;
  private raf = 0;
  private lastMs = 0;
  private handlers: WheelPhysicsHandlers;
  private restNotified = true;
  /** Mid-spin hold while Setup is open — keeps angle and remaining speed. */
  private suspended = false;
  private savedOmega = 0;

  constructor(pegCount: number, handlers: WheelPhysicsHandlers) {
    this.pegCount = Math.max(1, pegCount);
    this.handlers = handlers;
    this.lastMs = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  get angleDeg() {
    return (this.angle * 180) / Math.PI;
  }

  setPegCount(n: number) {
    const next = Math.max(1, n);
    if (next === this.pegCount) return;
    this.pegCount = next;
    this.lastPeg = -1;
  }

  idle() {
    this.mode = "idle";
    this.omega = IDLE_OMEGA;
    this.restNotified = true;
  }

  freeze() {
    this.suspended = false;
    this.savedOmega = 0;
    this.mode = "rest";
    this.omega = 0;
    this.parkClicker();
  }

  /** Hold a live spin in place (Setup open). Call resume() to continue. */
  pause() {
    if (this.suspended) return;
    if (this.mode !== "spin") {
      this.freeze();
      return;
    }
    this.suspended = true;
    this.savedOmega = this.omega;
    this.omega = 0;
    this.parkClicker();
  }

  /** Continue a spin that was held with pause(). */
  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    this.mode = "spin";
    this.omega = this.savedOmega;
    this.savedOmega = 0;
    this.restNotified = false;
  }

  reset(deg = 0) {
    this.suspended = false;
    this.savedOmega = 0;
    this.angle = wrapRad((deg * Math.PI) / 180);
    this.omega = 0;
    this.mode = "rest";
    this.lastDir = 0;
    this.lastPeg = -1;
    this.parkClicker();
  }

  spin() {
    this.suspended = false;
    this.savedOmega = 0;
    this.mode = "spin";
    this.restNotified = false;
    const extra = CLICK_IMPULSE_MIN + Math.random() * (CLICK_IMPULSE_MAX - CLICK_IMPULSE_MIN);
    this.omega = extra;
    this.lastDir = 1;
    this.lastPeg = pegIndex(this.angleDeg, this.pegCount);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  private stepClicker(prevDeg: number, dt: number) {
    if (this.mode === "rest") {
      this.parkClicker();
      return;
    }

    const dir = this.omega > 0.02 ? 1 : this.omega < -0.02 ? -1 : this.lastDir || 1;
    const { now, peak, hits } = clickerSweepDeg(prevDeg, this.angleDeg, this.pegCount, dir);

    // Tip must sit on the outside of any peg in reach — never through the centre.
    if (now !== null) {
      this.clicker = now;
      this.clickerVel = 0;
      return;
    }

    if (peak !== null || hits > 0 || this.crossedThisFrame > 0) {
      // Prefer the strongest geometric kiss; never invent a deeper pierce.
      this.clicker = peak ?? this.clicker;
      this.clickerVel = 0;
      return;
    }

    this.returnClicker(dt);
  }

  /**
   * At rest the flapper stays clear of every peg: either parked on the outer
   * kiss of a touching dot, or fully home when nothing is in the way.
   */
  private parkClicker() {
    const dir = this.lastDir || 1;
    const pose = clickerContactDeg(this.angleDeg, this.pegCount, dir);
    this.clicker = pose ?? 0;
    this.clickerVel = 0;
  }

  /** Home before the next dot, with no bounce past rest — extra wiggles are fake flaps. */
  private returnClicker(dt: number) {
    const dir = this.lastDir || 1;
    // Never spring through a peg that is still in tip reach.
    const blocked = clickerContactDeg(this.angleDeg, this.pegCount, dir);
    if (blocked !== null) {
      this.clicker = blocked;
      this.clickerVel = 0;
      return;
    }

    const period = TWO_PI / this.pegCount / Math.max(Math.abs(this.omega), 1e-6);
    const settle = Math.min(0.14, Math.max(0.018, period * 0.4));
    const wn = 4 / settle;
    const acc = -wn * wn * this.clicker - 2 * wn * this.clickerVel;
    this.clickerVel += acc * dt;
    this.clicker += this.clickerVel * dt;
    if ((this.lastDir >= 0 || this.omega >= 0) && this.clicker > 0) {
      this.clicker = 0;
      this.clickerVel = 0;
    } else if ((this.lastDir < 0 || this.omega < 0) && this.clicker < 0) {
      this.clicker = 0;
      this.clickerVel = 0;
    }
    if (Math.abs(this.clicker) < 0.04 && Math.abs(this.clickerVel) < 0.8) {
      this.clicker = 0;
      this.clickerVel = 0;
    }
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastMs) / 1000);
    this.lastMs = now;
    const prevDeg = this.angleDeg;
    this.crossedThisFrame = 0;

    if (this.mode === "idle") {
      this.omega = IDLE_OMEGA;
      this.lastDir = 1;
      this.angle = wrapRad(this.angle + this.omega * dt);
      this.noteCrossings(dt);
      this.stepClicker(prevDeg, dt);
      this.emit();
      this.raf = requestAnimationFrame(this.tick);
      return;
    }

    if (this.mode === "spin") {
      if (this.suspended) {
        this.emit();
        this.raf = requestAnimationFrame(this.tick);
        return;
      }

      if (this.omega > 0) this.lastDir = 1;
      else if (this.omega < 0) this.lastDir = -1;

      this.angle = wrapRad(this.angle + this.omega * dt);
      this.omega *= Math.pow(frictionMultiplier(FRICTION_LEVEL), 60 * dt);
      const couStep = coulombDecel(FRICTION_LEVEL) * COULOMB_SCALE * dt;
      if (Math.abs(this.omega) <= couStep) this.omega = 0;
      else this.omega -= couStep * Math.sign(this.omega);
      this.applyPegCrawl(dt);
      if (this.lastDir > 0 && this.omega < 0 && this.nearestFromThree() >= PASSED_DEG) {
        this.omega = 0;
      }

      this.noteCrossings(dt);
      this.stepClicker(prevDeg, dt);

      if (Math.abs(this.omega) < STOP_THRESHOLD) {
        this.omega = 0;
        this.parkClicker();
        this.finishRest();
        this.emit();
        this.raf = requestAnimationFrame(this.tick);
        return;
      }
      this.emit();
      this.raf = requestAnimationFrame(this.tick);
      return;
    }

    this.stepClicker(prevDeg, dt);
    this.emit();
    this.raf = requestAnimationFrame(this.tick);
  };

  private noteCrossings(dt: number) {
    const cur = pegIndex(this.angleDeg, this.pegCount);
    if (this.lastPeg < 0) {
      this.lastPeg = cur;
      return;
    }
    const count = this.pegCount;
    let nCross = cur - this.lastPeg;
    if (nCross > count / 2) nCross -= count;
    else if (nCross < -count / 2) nCross += count;
    if (nCross === 0) return;
    this.lastPeg = cur;
    this.crossedThisFrame = Math.abs(nCross);
    this.handlers.onPegs(Math.min(Math.abs(nCross), TICK_MAX_PER_FRAME), Math.abs(this.omega), dt);
    if (this.mode !== "spin") return;
    const sign = this.omega >= 0 ? 1 : -1;
    const drag = Math.min(PEG_DRAG, Math.abs(this.omega) * 0.12);
    const next = this.omega - sign * drag;
    this.omega = Math.sign(next) === sign || next === 0 ? next : 0;
  }

  /** Only the peg that is actually on the tip can slow the last crawl. */
  private applyPegCrawl(dt: number) {
    const speed = Math.abs(this.omega);
    if (speed > 1.85) return;
    const ft = this.nearestFromThree();
    if (ft < -0.55 || ft > 4.3) return;
    if (ft >= PASSED_DEG) return;

    const sign = Math.sign(this.omega) || this.lastDir || 1;
    const gate = 1 - speed / 1.85;
    const climb = Math.min(1, (ft + 0.55) / (PASSED_DEG + 0.55));
    const k = 0.35 + 0.65 * climb;
    this.omega *= Math.pow(0.97, 60 * dt * k * (0.4 + 0.6 * gate));
    this.omega -= sign * (0.08 + 0.14 * climb) * gate * dt;
    if (sign > 0 && this.omega < 0) this.omega = 0;
  }

  /** Degrees past 3 o’clock of the nearest name-dot. 0 = hitting the tip. */
  private nearestFromThree() {
    const step = 360 / this.pegCount;
    let d = ((this.angleDeg - 90) % 360 + 360) % 360;
    d %= step;
    if (d > step / 2) d -= step;
    return d;
  }

  private finishRest() {
    this.mode = "rest";
    this.lastDir = this.lastDir || 1;
    this.lastPeg = -1;
    this.parkClicker();
    if (!this.restNotified) {
      this.restNotified = true;
      this.handlers.onRest(this.angleDeg);
    }
  }

  private emit() {
    this.handlers.onFrame({
      angleDeg: this.angleDeg,
      clickerDeg: this.clicker,
      spinning: this.mode === "spin",
    });
  }
}
