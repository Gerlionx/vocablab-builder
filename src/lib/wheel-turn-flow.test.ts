import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRevealPlan } from "./wheel-answer-reveal.ts";
import type { WheelSettings } from "./game-settings.ts";
import {
  canAnswerQuestion,
  canMarkAnswer,
  canPlayLanded,
  canRevealHint,
  canSkipLanded,
  canUnlockAnswer,
  sceneAfterMarked,
  scoreForCorrect,
} from "./wheel-turn-flow.ts";

const settings: WheelSettings = {
  gameMode: "basic",
  winMode: "score",
  scoreToWin: 20,
  pointsCorrect: 3,
  pointsRevealed: 1,
  pointsSkip: 0,
  secondsPerTeam: 90,
  bufferSeconds: 10,
  skipPenaltySeconds: 0,
  askDirection: "random",
};

describe("wheel turn flow", () => {
  it("offers skip and play only after landing on a student", () => {
    assert.equal(canPlayLanded("landed", "Mohammed"), true);
    assert.equal(canSkipLanded("landed", "Mohammed"), true);
    assert.equal(canPlayLanded("wheel", "Mohammed"), false);
    assert.equal(canPlayLanded("landed", null), false);
  });

  it("answers only during the question scene", () => {
    assert.equal(canAnswerQuestion("question", true), true);
    assert.equal(canAnswerQuestion("landed", true), false);
    assert.equal(canAnswerQuestion("question", false), false);
  });

  it("allows hints until the reveal plan is exhausted, and not after unlock", () => {
    const plan = buildRevealPlan("Je finis");
    assert.equal(canRevealHint("question", 0, plan), true);
    assert.equal(canRevealHint("question", 0, plan, true), false);
    assert.equal(canRevealHint("landed", 0, plan), false);
    assert.equal(canRevealHint("question", plan.length, plan), false);
  });

  it("gates Got it / Miss it until the answer is unlocked", () => {
    assert.equal(canUnlockAnswer("question", false), true);
    assert.equal(canUnlockAnswer("question", true), false);
    assert.equal(canMarkAnswer("question", false), false);
    assert.equal(canMarkAnswer("question", true), true);
    assert.equal(canMarkAnswer("show", true), false);
  });

  it("scores correct answers from remaining points after hints", () => {
    assert.equal(scoreForCorrect(settings, 0, false), 3);
    assert.equal(scoreForCorrect(settings, 1, false), 2);
    assert.equal(scoreForCorrect(settings, 2, true), 0);
  });

  it("holds on the Q+A show after marking, without auto-spin", () => {
    assert.equal(sceneAfterMarked(), "show");
    assert.equal(canAnswerQuestion("show", true), false);
  });
});
