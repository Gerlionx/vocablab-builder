import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WheelSettings } from "./game-settings.ts";
import { pointsForAnswer, pointsForSkip } from "./wheel-scoring.ts";

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
  it("awards direct points without reveal hints", () => {
    assert.equal(pointsForAnswer(settings, 0), 3);
  });

  it("awards fewer points after reveal hints", () => {
    assert.equal(pointsForAnswer(settings, 1), 1);
  });

  it("defaults skip to zero points", () => {
    assert.equal(pointsForSkip(settings), 0);
  });
});
