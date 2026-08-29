import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_WHEEL_GAME_MODE,
  WHEEL_GAME_MODES,
  describeWheelGameMode,
  isWheelGameModeId,
  normaliseWheelGameMode,
  wheelGameModeDef,
} from "./wheel-modes.ts";

describe("wheel modes", () => {
  it("lists Standard and Time bank as playable", () => {
    assert.deepEqual(
      WHEEL_GAME_MODES.map((m) => m.id),
      ["basic", "time"],
    );
    assert.ok(WHEEL_GAME_MODES.every((m) => m.playable));
    assert.equal(DEFAULT_WHEEL_GAME_MODE, "basic");
  });

  it("resolves defs and falls back to Standard", () => {
    assert.equal(wheelGameModeDef("time").label, "Time bank");
    assert.equal(wheelGameModeDef("nope").id, "basic");
    assert.equal(wheelGameModeDef(undefined).id, "basic");
  });

  it("normalises legacy and unknown mode ids", () => {
    assert.equal(normaliseWheelGameMode("time"), "time");
    assert.equal(normaliseWheelGameMode("time-bank"), "time");
    assert.equal(normaliseWheelGameMode("wheel-of-time"), "time");
    assert.equal(normaliseWheelGameMode("standard"), "basic");
    assert.equal(normaliseWheelGameMode("basic"), "basic");
    assert.equal(normaliseWheelGameMode("other"), "basic");
    assert.equal(normaliseWheelGameMode(null), "basic");
  });

  it("type-guards known mode ids", () => {
    assert.equal(isWheelGameModeId("basic"), true);
    assert.equal(isWheelGameModeId("time"), true);
    assert.equal(isWheelGameModeId("standard"), false);
  });

  it("describes Standard and Time bank for the board", () => {
    assert.equal(
      describeWheelGameMode("basic", {
        winMode: "score",
        scoreToWin: 20,
        secondsPerTeam: 90,
        askDirection: "french",
      }),
      "Standard · first to 20 · Fr→En",
    );
    assert.equal(
      describeWheelGameMode("time", {
        winMode: "time",
        scoreToWin: 20,
        secondsPerTeam: 120,
        askDirection: "random",
      }),
      "Time bank · 120s bank · Mix",
    );
  });
});
