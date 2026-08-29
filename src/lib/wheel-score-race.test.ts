import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nextCatchUpIndex,
  rankScores,
  reachedScoreToWin,
  shouldEndScoreMatch,
  shouldEndSoloScoreMatch,
  spinCountsEqual,
  teamWinnerFromScores,
} from "./wheel-score-race.ts";

describe("score-to-win catch-up", () => {
  it("does not end teams when target hit but spins are unequal", () => {
    assert.equal(shouldEndScoreMatch([20, 10], [5, 4], 20), false);
    assert.equal(reachedScoreToWin([20, 10], 20), true);
    assert.equal(spinCountsEqual([5, 4]), false);
  });

  it("ends teams when target hit and spins match", () => {
    assert.equal(shouldEndScoreMatch([20, 18], [5, 5], 20), true);
    assert.equal(shouldEndScoreMatch([22, 22], [6, 6], 20), true);
  });

  it("does not end teams before anyone reaches the target", () => {
    assert.equal(shouldEndScoreMatch([15, 12], [4, 4], 20), false);
  });

  it("ends solo as soon as anyone reaches the target", () => {
    assert.equal(shouldEndSoloScoreMatch([12, 20, 8], 20), true);
    assert.equal(shouldEndSoloScoreMatch([12, 19, 8], 20), false);
  });

  it("picks the next trailing team for catch-up", () => {
    assert.equal(nextCatchUpIndex(0, [5, 4, 5]), 1);
    assert.equal(nextCatchUpIndex(1, [5, 5, 4]), 2);
    assert.equal(nextCatchUpIndex(2, [5, 5, 5]), null);
  });

  it("ranks ties with shared place and skip", () => {
    assert.deepEqual(
      rankScores([
        { id: "a", score: 10 },
        { id: "b", score: 10 },
        { id: "c", score: 7 },
      ]),
      [
        { id: "a", score: 10, place: 1 },
        { id: "b", score: 10, place: 1 },
        { id: "c", score: 7, place: 3 },
      ],
    );
  });

  it("declares a team draw on equal top scores", () => {
    assert.equal(teamWinnerFromScores([20, 20]), "draw");
    assert.equal(teamWinnerFromScores([20, 18]), 0);
    assert.equal(teamWinnerFromScores([12, 20, 20]), "draw");
  });
});
