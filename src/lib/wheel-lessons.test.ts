import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DEFAULT_WHEEL_SETTINGS } from "./game-settings.ts";
import {
  abbreviateLessonTitle,
  blankLessonDraft,
  deleteWheelLesson,
  describeLesson,
  lastWheelLesson,
  lastWheelLessonId,
  lessonToSettings,
  listWheelLessons,
  rememberWheelLessonId,
  suggestLessonTitle,
  tidyLessonTitle,
  upsertWheelLesson,
  type WheelLesson,
} from "./wheel-lessons.ts";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage() as unknown as Storage;
  (globalThis as { window?: unknown }).window = globalThis;
});

describe("lesson titles", () => {
  it("tidies and truncates titles", () => {
    assert.equal(tidyLessonTitle("  Hello   world  "), "Hello world");
    assert.equal(tidyLessonTitle("x".repeat(60)).length, 48);
  });

  it("abbreviates from filters", () => {
    assert.equal(suggestLessonTitle([], []), "New lesson");
    assert.equal(
      abbreviateLessonTitle({
        years: ["Year 7"],
        terms: ["Term 1"],
        topics: ["Greetings"],
        difficulties: ["Low"],
      }),
      "Y7 · T1 · Greetings · L",
    );
  });
});

describe("wheel lessons storage", () => {
  it("starts empty and upserts by title", () => {
    assert.deepEqual(listWheelLessons(), []);
    const first = upsertWheelLesson({
      ...blankLessonDraft(),
      title: "Y7 greetings",
      years: ["Year 7"],
      topics: ["Greetings"],
      scoreToWin: 10,
    });
    assert.equal(first.title, "Y7 greetings");
    assert.equal(lastWheelLessonId(), first.id);

    const again = upsertWheelLesson({
      ...blankLessonDraft(),
      title: "y7 greetings",
      years: ["Year 7"],
      scoreToWin: 15,
    });
    assert.equal(again.id, first.id);
    assert.equal(listWheelLessons().length, 1);
    assert.equal(listWheelLessons()[0]?.scoreToWin, 15);
  });

  it("maps a lesson to runtime settings", () => {
    const lesson: WheelLesson = {
      id: "L1",
      title: "Test",
      savedAt: 1,
      years: ["Year 8"],
      terms: [],
      topics: [],
      difficulties: [],
      excludedWordIds: ["w9"],
      gameMode: "time",
      askDirection: "english",
      winMode: "score",
      scoreToWin: 25,
      pointsCorrect: 4,
      pointsRevealed: 2,
      pointsSkip: 0,
      secondsPerTeam: 80,
      bufferSeconds: 12,
      skipPenaltySeconds: 3,
    };
    assert.deepEqual(lessonToSettings(lesson), {
      gameMode: "time",
      winMode: "score",
      scoreToWin: 25,
      pointsCorrect: 4,
      pointsRevealed: 2,
      pointsSkip: 0,
      secondsPerTeam: 80,
      bufferSeconds: 12,
      skipPenaltySeconds: 3,
      askDirection: "english",
    });
    assert.match(describeLesson(lesson), /Time bank/);
  });

  it("remembers, loads last, and deletes", () => {
    const a = upsertWheelLesson({ ...blankLessonDraft(DEFAULT_WHEEL_SETTINGS), title: "A" });
    const b = upsertWheelLesson({ ...blankLessonDraft(), title: "B" });
    rememberWheelLessonId(a.id);
    assert.equal(lastWheelLesson()?.id, a.id);
    deleteWheelLesson(a.id);
    assert.equal(listWheelLessons().length, 1);
    assert.equal(lastWheelLessonId(), b.id);
  });

  it("migrates legacy setup keys once", () => {
    localStorage.setItem(
      "vocablab.wheelSetups.v1",
      JSON.stringify([
        {
          id: "legacy1",
          title: "Legacy",
          savedAt: 10,
          year: "Year 8",
          gameMode: "standard",
          scoreToWin: 10,
          pointsCorrect: 3,
        },
      ]),
    );
    const list = listWheelLessons();
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, "legacy1");
    assert.equal(list[0]?.gameMode, "basic");
    assert.equal(list[0]?.years[0], "Year 8");
    assert.equal(localStorage.getItem("vocablab.wheelSetups.v1"), null);
  });
});
