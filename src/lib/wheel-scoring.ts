import type { WheelSettings } from "@/lib/game-settings";

/** Points remaining after hint clicks (each hint costs one point). */
export function remainingPoints(
  settings: WheelSettings,
  hintsUsed: number,
  fullyRevealed = false,
): number {
  if (fullyRevealed) return 0;
  return Math.max(0, settings.pointsCorrect - hintsUsed);
}

/** Points earned on a correct answer given how many hints were used. */
export function pointsForAnswer(
  settings: WheelSettings,
  hintsUsed: number,
  fullyRevealed = false,
): number {
  return remainingPoints(settings, hintsUsed, fullyRevealed);
}

/** Points for a skipped turn after landing (0 = no penalty). */
export function pointsForSkip(settings: WheelSettings): number {
  return settings.pointsSkip;
}
