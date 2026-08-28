import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRevealPlan } from "./wheel-answer-reveal.ts";
import type { WheelSettings } from "./game-settings.ts";
import {
  canAnswerQuestion,
  canPlayLanded,
  canRevealHint,
  canSkipLanded,
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

  it("allows hints until the reveal plan is exhausted", () => {
    const plan = buildRevealPlan("Je finis");
    assert.equal(canRevealHint("question", 0, plan), true);
    assert.equal(canRevealHint("landed", 0, plan), false);
    assert.equal(canRevealHint("question", plan.length, plan), false);
  });

  it("scores correct answers from remaining points after hints", () => {
    assert.equal(scoreForCorrect(settings, 0, false), 3);
    assert.equal(scoreForCorrect(settings, 1, false), 2);
    assert.equal(scoreForCorrect(settings, 2, true), 0);
  });

  it("returns to wheel without auto-spin after marking", () => {
    assert.equal(sceneAfterMarked(), "wheel");
  });
});
