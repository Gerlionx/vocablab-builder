import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  TEACHER_IDLE_MS,
  beginTeacherSession,
  clearWheelMatch,
  endTeacherSession,
  isPublicPath,
  isTeacherIdleExpired,
  isTeacherSessionActive,
  readSessionNames,
  readSessionRoster,
  readWheelMatch,
  resetSessionNamesForDesk,
  writeSessionNames,
  writeSessionRoster,
  writeWheelMatch,
  type WheelMatchSession,
} from "./teacher-session.ts";
import { DEMO_NAMES, USE_DEMO_NAMES } from "./vocab-data.ts";

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
  (globalThis as { sessionStorage?: Storage }).sessionStorage =
    memoryStorage() as unknown as Storage;
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage() as unknown as Storage;
  (globalThis as { window?: unknown }).window = globalThis;
  endTeacherSession();
});

function blankMatch(over: Partial<WheelMatchSession> = {}): WheelMatchSession {
  return {
    v: 1,
    started: true,
    gameMode: "basic",
    matchTeamsOn: true,
    teamsOn: true,
    teamCount: 2,
    turn: 0,
    scores: [0, 0, 0],
    playerScores: {},
    playerScoredAt: {},
    teamScoredAt: [0, 0, 0],
    teamSpins: [0, 0, 0],
    playerSpins: {},
    banks: [90, 90, 90],
    teamEliminated: [false, false, false],
    teamInBuffer: [false, false, false],
    playerBanks: {},
    playerEliminated: {},
    playerInBuffer: {},
    eliminationOrder: [],
    usedWordIds: [],
    colorIds: ["red", "blue"],
    winner: null,
    soloPodium: null,
    ...over,
  };
}

describe("teacher public paths", () => {
  it("allows landing, login, and set-password only", () => {
    assert.equal(isPublicPath("/"), true);
    assert.equal(isPublicPath("/login"), true);
    assert.equal(isPublicPath("/set-password"), true);
    assert.equal(isPublicPath("/wheel"), false);
  });
});

describe("teacher session", () => {
  it("starts inactive and activates on begin", () => {
    assert.equal(isTeacherSessionActive(), false);
    beginTeacherSession();
    assert.equal(isTeacherSessionActive(), true);
    assert.equal(isTeacherIdleExpired(), false);
    if (USE_DEMO_NAMES) {
      assert.ok(readSessionNames().includes(DEMO_NAMES[0]!));
      assert.equal(readSessionRoster().flat().length, DEMO_NAMES.length);
    }
  });

  it("persists names and roster, then wipes on end", () => {
    beginTeacherSession();
    writeSessionNames("Ada\nBob");
    writeSessionRoster([["Ada"], ["Bob"], []]);
    assert.equal(readSessionNames(), "Ada\nBob");
    assert.deepEqual(readSessionRoster(), [["Ada"], ["Bob"], []]);
    endTeacherSession();
    assert.equal(isTeacherSessionActive(), false);
    assert.equal(readSessionNames(), "");
    assert.deepEqual(readSessionRoster(), [[], [], []]);
  });

  it("round-trips a wheel match and clears it", () => {
    beginTeacherSession();
    const match = blankMatch({
      scores: [3, 1, 0],
      usedWordIds: ["w1", "w2"],
      winner: 0,
      soloPodium: [{ id: "Ada", score: 9, place: 1 }],
    });
    writeWheelMatch(match);
    const loaded = readWheelMatch();
    assert.ok(loaded);
    assert.equal(loaded.started, true);
    assert.deepEqual(loaded.scores, [3, 1, 0]);
    assert.deepEqual(loaded.usedWordIds, ["w1", "w2"]);
    assert.equal(loaded.winner, 0);
    assert.equal(loaded.soloPodium?.[0]?.id, "Ada");
    clearWheelMatch();
    assert.equal(readWheelMatch(), null);
  });

  it("rejects corrupt wheel match payloads", () => {
    beginTeacherSession();
    sessionStorage.setItem("vocablab.teacher.wheelMatch", "{not-json");
    assert.equal(readWheelMatch(), null);
    sessionStorage.setItem("vocablab.teacher.wheelMatch", JSON.stringify({ v: 2, started: true }));
    assert.equal(readWheelMatch(), null);
  });

  it("resets desk names for demo mode", () => {
    beginTeacherSession();
    writeSessionNames("OnlyOne");
    resetSessionNamesForDesk();
    if (USE_DEMO_NAMES) {
      assert.ok(readSessionNames().includes(DEMO_NAMES[0]!));
    } else {
      assert.equal(readSessionNames(), "");
    }
  });

  it("expires idle sessions after TEACHER_IDLE_MS", () => {
    const past = Date.now() - TEACHER_IDLE_MS - 1_000;
    // Zero in-memory activity, then restore auth + a stale stamp without touchTeacherActivity.
    endTeacherSession();
    sessionStorage.setItem("vocablab.teacher.auth", "1");
    sessionStorage.setItem("vocablab.teacher.activity", String(past));
    assert.equal(isTeacherIdleExpired(), true);
    assert.equal(isTeacherSessionActive(), false);
  });
});
