import type { WheelSettings } from "./game-settings.ts";
import { canRevealMore } from "./wheel-answer-reveal.ts";
import { pointsForAnswer } from "./wheel-scoring.ts";

export type TurnScene =
  | "wheel"
  | "spinning"
  | "landed"
  | "exiting"
  | "question"
  | "entering";

/** Whether the teacher can start the question for the landed student. */
export function canPlayLanded(scene: TurnScene, pickedName: string | null): boolean {
  return scene === "landed" && Boolean(pickedName);
}

/** Whether Skip on landed should re-spin immediately. */
export function canSkipLanded(scene: TurnScene, pickedName: string | null): boolean {
  return canPlayLanded(scene, pickedName);
}

/** Whether hint, got-it, and missed controls are active. */
export function canAnswerQuestion(scene: TurnScene, hasPrompt: boolean): boolean {
  return scene === "question" && hasPrompt;
}

export function canRevealHint(scene: TurnScene, revealStep: number, plan: string[]): boolean {
  return canRevealMore(revealStep, plan) && scene === "question";
}

export function scoreForCorrect(
  settings: WheelSettings,
  hintsUsed: number,
  fullyRevealed: boolean,
): number {
  return pointsForAnswer(settings, hintsUsed, fullyRevealed);
}

/** After marking correct or missed, the next spin must be explicit (stay on wheel). */
export function sceneAfterMarked(): TurnScene {
  return "wheel";
}
