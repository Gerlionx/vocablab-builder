import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  DEFAULT_BOARD_MODES,
  DEFAULT_FUSE,
  DEFAULT_MODE_SETTINGS,
  DEFAULT_WHEEL_SETTINGS,
  activateBoardMode,
  applyModeSettingsToDraft,
  deactivateBoardMode,
  describeSettings,
  loadBoardModes,
  loadFuseConfig,
  loadModeSettings,
  loadWheelSettings,
  saveBoardModes,
  saveFuseConfig,
  saveModeSettings,
  saveWheelSettings,
} from "./game-settings.ts";

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

describe("wheel settings persistence", () => {
  it("returns defaults when empty", () => {
    assert.deepEqual(loadWheelSettings(), DEFAULT_WHEEL_SETTINGS);
  });

  it("round-trips settings and clamps bounds", () => {
    saveWheelSettings({
      ...DEFAULT_WHEEL_SETTINGS,
      scoreToWin: 999,
      pointsCorrect: 100,
      gameMode: "time",
      askDirection: "french",
    });
    const loaded = loadWheelSettings();
    assert.equal(loaded.scoreToWin, 200);
    assert.equal(loaded.pointsCorrect, 20);
    assert.equal(loaded.gameMode, "time");
    assert.equal(loaded.askDirection, "french");
  });

  it("migrates legacy minutes into secondsPerTeam", () => {
    localStorage.setItem(
      "vocablab.gameSettings.wheel",
      JSON.stringify({ minutes: 4, scoreToWin: 15 }),
    );
    const loaded = loadWheelSettings();
    assert.equal(loaded.secondsPerTeam, 120);
    assert.equal(loaded.scoreToWin, 15);
  });

  it("describes settings for the board", () => {
    assert.match(describeSettings(DEFAULT_WHEEL_SETTINGS), /Standard/);
    assert.match(describeSettings(DEFAULT_WHEEL_SETTINGS), /First to 20/);
  });
});

describe("board modes", () => {
  it("defaults to Standard only", () => {
    assert.deepEqual(loadBoardModes(), DEFAULT_BOARD_MODES);
  });

  it("activates Time bank and keeps at least one mode", () => {
    const withTime = activateBoardMode("time");
    assert.deepEqual(withTime.enabled.sort(), ["basic", "time"]);
    assert.equal(withTime.active, "time");
    assert.equal(loadWheelSettings().gameMode, "time");

    const still = deactivateBoardMode("basic");
    assert.deepEqual(still.enabled, ["time"]);
    assert.equal(still.active, "time");

    const blocked = deactivateBoardMode("time");
    assert.deepEqual(blocked.enabled, ["time"]);
  });

  it("rejects empty enabled lists on save", () => {
    saveBoardModes({ enabled: [], active: "basic" });
    assert.deepEqual(loadBoardModes().enabled, ["basic"]);
  });
});

describe("per-mode settings", () => {
  it("loads defaults and applies a mode onto a draft", () => {
    assert.deepEqual(loadModeSettings(), DEFAULT_MODE_SETTINGS);
    saveModeSettings({
      basic: { ...DEFAULT_MODE_SETTINGS.basic, scoreToWin: 12 },
      time: { ...DEFAULT_MODE_SETTINGS.time, secondsPerTeam: 60, skipPenaltySeconds: 5 },
    });
    const store = loadModeSettings();
    const draft = applyModeSettingsToDraft(
      { ...DEFAULT_WHEEL_SETTINGS, gameMode: "basic" },
      "time",
      store,
    );
    assert.equal(draft.gameMode, "time");
    assert.equal(draft.secondsPerTeam, 60);
    assert.equal(draft.skipPenaltySeconds, 5);
  });
});

describe("fuse config", () => {
  it("defaults on and round-trips", () => {
    assert.deepEqual(loadFuseConfig(), DEFAULT_FUSE);
    saveFuseConfig({ enabled: false, seconds: 45 });
    assert.deepEqual(loadFuseConfig(), { enabled: false, seconds: 45 });
  });
});
