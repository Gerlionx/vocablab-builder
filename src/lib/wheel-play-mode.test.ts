import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_MODE_SETTINGS,
  applyModeSettingsToDraft,
} from "./game-settings.ts";
import { lessonToSettings, type WheelLesson } from "./wheel-lessons.ts";

/** Minimal lesson shaped like a Standard classroom save. */
function standardLesson(over: Partial<WheelLesson> = {}): WheelLesson {
  return {
    id: "lesson-1",
    title: "Y7 Term 1",
    savedAt: 1,
    years: ["Year 7"],
    terms: ["Term 1"],
    topics: [],
    difficulties: [],
    excludedWordIds: [],
    gameMode: "basic",
    winMode: "score",
    scoreToWin: 10,
    pointsCorrect: 3,
    pointsRevealed: 1,
    pointsSkip: 0,
    secondsPerTeam: 90,
    bufferSeconds: 10,
    skipPenaltySeconds: 0,
    askDirection: "french",
    ...over,
  };
}

describe("Activity play mode vs lesson on Start", () => {
  it("keeps Time bank when Start reloads a Standard lesson", () => {
    const fromLesson = lessonToSettings(standardLesson());
    assert.equal(fromLesson.gameMode, "basic");

    // startGame must re-apply the Activity mode after lessonToSettings —
    // otherwise Time bank plays as Standard (the reported classroom bug).
    const forMatch = applyModeSettingsToDraft(
      fromLesson,
      "time",
      DEFAULT_MODE_SETTINGS,
    );
    assert.equal(forMatch.gameMode, "time");
    assert.equal(forMatch.secondsPerTeam, DEFAULT_MODE_SETTINGS.time.secondsPerTeam);
    assert.equal(forMatch.bufferSeconds, DEFAULT_MODE_SETTINGS.time.bufferSeconds);
  });

  it("keeps Standard when Activity mode is basic", () => {
    const fromLesson = lessonToSettings(
      standardLesson({ gameMode: "time", secondsPerTeam: 120 }),
    );
    const forMatch = applyModeSettingsToDraft(
      fromLesson,
      "basic",
      DEFAULT_MODE_SETTINGS,
    );
    assert.equal(forMatch.gameMode, "basic");
    assert.equal(forMatch.scoreToWin, DEFAULT_MODE_SETTINGS.basic.scoreToWin);
  });
});
