export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4;
}

export const PEGS_PER_SLICE = 1;

/** Painted name-dot radius in the chrome 400-space. Must match NameWheel. */
export const PEG_RADIUS = 2.8;
export const PEG_PATH_R = 193.5;
export const WHEEL_CX = 200;
export const WHEEL_CY = 200;

/**
 * Hinge and rest tip in the same 400-space as the pegs.
 * Rest tip sits slightly in each passing dot’s way so the bar must push it;
 * `.wheel-pointer-wrap` is sized so the painted stroke tip matches these numbers.
 */
export const CLICKER_HX = 446;
export const CLICKER_HY = 200;
export const CLICKER_L = 52;

/** Degrees before a name-dot’s centre where the tip sits on that dot’s edge. */
export const KISS_DEG = 1.8;

/**
 * Clockwise wheel: at 3 o’clock the dots travel down.
 * Negative CSS rotate on the left-pointing flapper drops the tip with them.
 * Never kicks the tip up on a hit.
 */
const TIP_DOWN = -30;

/** Slice under the 3 o’clock pointer. */
export function pointerLocal(angle: number) {
  return (90 - (((angle % 360) + 360) % 360) + 360) % 360;
}

/** Signed degrees from the nearest peg at 3 o'clock; negative = before the peg. */
export function pegOffsetLocal(angle: number, count: number) {
  const step = 360 / Math.max(1, count);
  let d = pointerLocal(angle) % step;
  if (d > step / 2) d -= step;
  return d;
}

/**
 * Slice under the 3 o'clock pointer. Pegs sit on slice starts; when the wheel
 * kisses a peg from below (within KISS_DEG), the upcoming slice wins so the named
 * student matches the pin the clicker is on.
 */
export function winnerIndex(angle: number, count: number) {
  const n = Math.max(1, count);
  const step = 360 / n;
  const local = pointerLocal(angle);
  const d = pegOffsetLocal(angle, count);
  if (d < 0 && d >= -KISS_DEG) {
    return (Math.floor(local / step) + 1) % n;
  }
  return Math.min(n - 1, Math.floor(local / step));
}

export function pegCountForSlices(sliceCount: number) {
  return Math.max(1, sliceCount) * PEGS_PER_SLICE;
}

export function pegIndex(angle: number, pegs: number) {
  const p = Math.max(1, pegs);
  const step = 360 / p;
  return Math.min(p - 1, Math.floor(pointerLocal(angle) / step));
}

/** Degrees to flick the 3 o’clock pointer so the tip rides the passing dot downward. */
export function pointerDeflection(angle: number, pegs: number) {
  const p = Math.max(1, pegs);
  const step = 360 / p;
  let d = pointerLocal(angle) % step;
  if (d > step / 2) d -= step;

  const approach = Math.min(11, step * 0.4);
  const release = Math.min(5, step * 0.16);

  if (d >= 0) {
    if (d > approach) return 0;
    if (d >= KISS_DEG) {
      const t = (approach - d) / (approach - KISS_DEG);
      const s = t * t * (3 - 2 * t);
      return TIP_DOWN * s;
    }
    const t = d / KISS_DEG;
    return TIP_DOWN * (0.72 + 0.28 * t);
  }

  const past = -d;
  if (past > release) return 0;
  const t = past / release;
  return TIP_DOWN * 0.72 * (1 - t) * (1 - t);
}

export type SpinPlan = {
  extra: number;
  duration: number;
  overshoot: number;
  crawl: boolean;
};

export function spinDelta(fromAngle: number, targetIndex: number, count: number) {
  return spinPlan(fromAngle, targetIndex, count).extra;
}

export function spinPlan(fromAngle: number, targetIndex: number, count: number): SpinPlan {
  const n = Math.max(1, count);
  const step = 360 / n;
  const sliceStart = targetIndex * step;
  const sliceEnd = sliceStart + step;
  const nearMiss = n > 1 && Math.random() < 0.55;
  const willCross = nearMiss && Math.random() < 0.48;
  const restLocal = nearMiss
    ? sliceEnd - KISS_DEG
    : sliceStart + step * (0.22 + Math.random() * 0.52);
  const landingMod = (90 - restLocal + 360) % 360;
  const fromMod = ((fromAngle % 360) + 360) % 360;
  let delta = landingMod - fromMod;
  if (delta < 0) delta += 360;
  const turns = 5 + Math.floor(Math.random() * 4);
  const extra = turns * 360 + delta;
  const overshoot = willCross ? KISS_DEG + 2.4 + Math.random() * 1.6 : 0;
  const duration = nearMiss ? 7200 + Math.random() * 2000 : 4300 + Math.random() * 1500;
  return { extra, duration, overshoot, crawl: nearMiss };
}

/** Progress 0–1. One motion to the end — no stop-then-restart, no bounce-back. */
export function spinSample(
  p: number,
  start: number,
  extra: number,
  overshoot: number,
  crawl = false,
) {
  const t = Math.min(1, Math.max(0, p));
  if (!crawl) return start + extra * easeOutQuart(t);

  const end = extra + overshoot;
  const cruise = extra - 7;
  const split = 0.5;
  if (t <= split) {
    return start + cruise * easeOutQuart(t / split);
  }
  const u = (t - split) / (1 - split);
  const slow = 1 - (1 - u) ** 3;
  return start + cruise + (end - cruise) * slow;
}

export function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

function wrapSignedDeg(deg: number) {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

function tipCssDeg(tx: number, ty: number) {
  return (Math.atan2(CLICKER_HY - ty, CLICKER_HX - tx) * 180) / Math.PI;
}

/**
 * CSS rotate that parks the painted tip on the outside of a name-dot.
 * Clockwise (dir >= 0): tip rides down. Null = no contact, spring home.
 */
export function clickerContactDeg(angleDeg: number, pegs: number, dir: number) {
  const n = Math.max(1, pegs);
  const step = 360 / n;
  const wantDown = dir >= 0;
  let best: number | null = null;

  for (let i = 0; i < n; i++) {
    const fromThree = wrapSignedDeg(i * step + angleDeg - 90);
    if (Math.abs(fromThree) > 16) continue;

    const [px, py] = polar(WHEEL_CX, WHEEL_CY, PEG_PATH_R, i * step + angleDeg);
    const dx = px - CLICKER_HX;
    const dy = py - CLICKER_HY;
    const dist = Math.hypot(dx, dy);
    const max = CLICKER_L + PEG_RADIUS;
    const min = Math.abs(CLICKER_L - PEG_RADIUS);
    if (dist > max + 1e-6 || dist < min - 1e-6) continue;

    const along = (CLICKER_L * CLICKER_L - PEG_RADIUS * PEG_RADIUS + dist * dist) / (2 * dist);
    const heightSq = CLICKER_L * CLICKER_L - along * along;
    if (heightSq < -1e-6) continue;
    const height = Math.sqrt(Math.max(0, heightSq));
    const ux = dx / dist;
    const uy = dy / dist;
    const candidates: number[] = [];

    for (const side of [1, -1] as const) {
      const tx = CLICKER_HX + along * ux + side * height * -uy;
      const ty = CLICKER_HY + along * uy + side * height * ux;
      const outer = (tx - px) * (px - WHEEL_CX) + (ty - py) * (py - WHEEL_CY);
      if (outer < 0) continue;
      const deg = tipCssDeg(tx, ty);
      if (wantDown ? deg > 0.05 : deg < -0.05) continue;
      candidates.push(deg);
    }

    if (!candidates.length) continue;
    const pose = wantDown ? Math.min(...candidates) : Math.max(...candidates);
    if (best === null || Math.abs(pose) > Math.abs(best)) best = pose;
  }

  return best;
}

/**
 * Contact along a wheel step. `now` is the tip pose at the end angle.
 * `peak` is the strongest hit on the step. `hits` counts how many dots
 * actually touched the tip, so a fast frame cannot skip a flap.
 */
export function clickerSweepDeg(
  fromDeg: number,
  toDeg: number,
  pegs: number,
  dir: number,
): { now: number | null; peak: number | null; hits: number } {
  const now = clickerContactDeg(toDeg, pegs, dir);
  let sweep = toDeg - fromDeg;
  if (dir >= 0 && sweep < 0) sweep += 360;
  if (dir < 0 && sweep > 0) sweep -= 360;
  const span = Math.abs(sweep);
  const steps = Math.min(80, Math.max(1, Math.ceil(span / 0.35)));
  const wantDown = dir >= 0;
  let peak: number | null = null;
  let hits = 0;
  let touching = false;
  for (let i = 0; i <= steps; i++) {
    const pose = clickerContactDeg(fromDeg + (sweep * i) / steps, pegs, dir);
    if (pose === null) {
      touching = false;
      continue;
    }
    if (!touching) {
      hits += 1;
      touching = true;
    }
    peak = peak === null ? pose : wantDown ? Math.min(peak, pose) : Math.max(peak, pose);
  }
  return { now, peak, hits };
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
