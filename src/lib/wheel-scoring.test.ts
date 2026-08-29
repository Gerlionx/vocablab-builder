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
  bufferSeconds: 10,
  skipPenaltySeconds: 0,
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

  it("awards zero when the answer was fully revealed", () => {
    assert.equal(remainingPoints(settings, 0, true), 0);
    assert.equal(pointsForAnswer(settings, 1, true), 0);
  });

  it("never drops a correct answer below one point from hints", () => {
    assert.equal(remainingPoints(settings, 5), 1);
    assert.equal(pointsForAnswer(settings, 99), 1);
    const six: WheelSettings = { ...settings, pointsCorrect: 6 };
    assert.equal(pointsForAnswer(six, 0), 6);
    assert.equal(pointsForAnswer(six, 5), 1);
    assert.equal(pointsForAnswer(six, 20), 1);
  });

  it("keeps a one-point question at one even after hints", () => {
    const one: WheelSettings = { ...settings, pointsCorrect: 1 };
    assert.equal(pointsForAnswer(one, 0), 1);
    assert.equal(pointsForAnswer(one, 3), 1);
  });

  it("defaults skip to zero points", () => {
    assert.equal(pointsForSkip(settings), 0);
  });
});
