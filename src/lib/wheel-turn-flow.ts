import type { WheelSettings } from "./game-settings.ts";
import { canRevealMore } from "./wheel-answer-reveal.ts";
import { pointsForAnswer } from "./wheel-scoring.ts";

export type TurnScene =
  | "toss"
  | "wheel"
  | "spinning"
  | "landed"
  | "exiting"
  | "question"
  | "show"
  | "entering"
  | "winner";

/** Whether the teacher can start the question for the landed student. */
export function canPlayLanded(scene: TurnScene, pickedName: string | null): boolean {
  return scene === "landed" && Boolean(pickedName);
}

/** Whether Skip on landed should re-spin immediately. */
export function canSkipLanded(scene: TurnScene, pickedName: string | null): boolean {
  return canPlayLanded(scene, pickedName);
}

/** Whether the question scene has a live prompt. */
export function canAnswerQuestion(scene: TurnScene, hasPrompt: boolean): boolean {
  return scene === "question" && hasPrompt;
}

/** Hints only while the answer is still hidden. */
export function canRevealHint(
  scene: TurnScene,
  revealStep: number,
  plan: number[][],
  answerOpen = false,
): boolean {
  return !answerOpen && canRevealMore(revealStep, plan) && scene === "question";
}

/** Teacher may open the full answer (stops the fuse). */
export function canUnlockAnswer(scene: TurnScene, answerOpen: boolean): boolean {
  return scene === "question" && !answerOpen;
}

/** Got it / Miss it only after the answer is revealed. */
export function canMarkAnswer(scene: TurnScene, answerOpen: boolean): boolean {
  return scene === "question" && answerOpen;
}

export function scoreForCorrect(
  settings: WheelSettings,
  hintsUsed: number,
  fullyRevealed: boolean,
): number {
  return pointsForAnswer(settings, hintsUsed, fullyRevealed);
}

/** After marking correct, missed, or fuse timeout, show Q+A until Next. */
export function sceneAfterMarked(): TurnScene {
  return "show";
}
