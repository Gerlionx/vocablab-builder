import type { WheelSettings } from "@/lib/game-settings";

/** Points remaining after hint clicks (each hint costs one point, never below 1). */
export function remainingPoints(
  settings: WheelSettings,
  hintsUsed: number,
  fullyRevealed = false,
): number {
  if (fullyRevealed) return 0;
  const raw = settings.pointsCorrect - hintsUsed;
  // Hints may reduce the reward, but a correct answer always keeps at least 1
  // whenever the question is worth any points.
  if (settings.pointsCorrect <= 0) return Math.max(0, raw);
  return Math.max(1, raw);
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
