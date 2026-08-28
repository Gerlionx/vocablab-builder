import type { WheelSettings } from "@/lib/game-settings";

/** Points earned when the child answers correctly without using reveal hints. */
export function pointsForDirect(settings: WheelSettings): number {
  return settings.pointsCorrect;
}

/** Points earned when one or more reveal steps were used before a correct answer. */
export function pointsForRevealed(settings: WheelSettings): number {
  return settings.pointsRevealed;
}

/** Points for a skipped turn (0 = no penalty). */
export function pointsForSkip(settings: WheelSettings): number {
  return settings.pointsSkip;
}

export function pointsForAnswer(settings: WheelSettings, revealsUsed: number): number {
  return revealsUsed > 0 ? pointsForRevealed(settings) : pointsForDirect(settings);
}
