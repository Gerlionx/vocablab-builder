/**
 * Viscous + Coulomb axle friction for the name wheel.
 * Ported from rolandzeiner/spinning-wheel-card (MIT License,
 * Copyright (c) 2026 Roland Zeiner).
 * https://github.com/rolandzeiner/spinning-wheel-card
 */

export function frictionMultiplier(level: number): number {
  if (level <= 5) return 0.998 - (0.008 * (level - 1)) / 4;
  return 0.99 - (0.02 * (level - 5)) / 5;
}

/** Constant angular deceleration (rad/s²) — dry axle friction. */
export function coulombDecel(level: number): number {
  const calibrated = 0.3;
  return calibrated * (level / 5);
}
