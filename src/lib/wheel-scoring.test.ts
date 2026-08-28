import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WheelSettings } from "./game-settings.ts";
import { pointsForAnswer, pointsForSkip, remainingPoints } from "./wheel-scoring.ts";

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

describe("wheel scoring", () => {
  it("starts with full points before any hint", () => {
    assert.equal(remainingPoints(settings, 0), 3);
    assert.equal(pointsForAnswer(settings, 0), 3);
  });

  it("reduces available score by one per hint click", () => {
    assert.equal(remainingPoints(settings, 1), 2);
    assert.equal(pointsForAnswer(settings, 1), 2);
    assert.equal(remainingPoints(settings, 2), 1);
    assert.equal(pointsForAnswer(settings, 2), 1);
  });

  it("awards zero when hints fully revealed the answer", () => {
    assert.equal(remainingPoints(settings, 0, true), 0);
    assert.equal(pointsForAnswer(settings, 1, true), 0);
  });

  it("never goes below zero", () => {
    assert.equal(remainingPoints(settings, 5), 0);
  });

  it("defaults skip to zero points", () => {
    assert.equal(pointsForSkip(settings), 0);
  });
});
