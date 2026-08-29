import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_TEAM_COLOR_IDS,
  TEAM_COLORS,
  colorById,
  rainbowPaint,
  splitEven,
  splitTeams,
  teamSlicePaint,
} from "./team-colors.ts";

describe("team colors", () => {
  it("has six projector palettes and default trio", () => {
    assert.equal(TEAM_COLORS.length, 6);
    assert.deepEqual([...DEFAULT_TEAM_COLOR_IDS], ["red", "blue", "gold"]);
  });

  it("looks up by id and falls back to red", () => {
    assert.equal(colorById("blue").label, "Blue");
    assert.equal(colorById("missing").id, "red");
  });

  it("deals names round-robin into 2 or 3 teams", () => {
    const names = ["A", "B", "C", "D", "E"];
    assert.deepEqual(splitTeams(names, 2), [
      ["A", "C", "E"],
      ["B", "D"],
    ]);
    assert.deepEqual(splitTeams(names, 3), [["A", "D"], ["B", "E"], ["C"]]);
    assert.deepEqual(splitEven(["A", "B", "C"]), [
      ["A", "C"],
      ["B"],
    ]);
  });

  it("cycles rainbow paint and alternates team slice shades", () => {
    assert.equal(rainbowPaint(0).fill, rainbowPaint(6).fill);
    assert.notEqual(rainbowPaint(0).fill, rainbowPaint(1).fill);
    const red = colorById("red");
    assert.match(teamSlicePaint(red, 0).fill, /color-mix/);
    assert.match(teamSlicePaint(red, 1).fill, /color-mix/);
    assert.notEqual(teamSlicePaint(red, 0).fill, teamSlicePaint(red, 1).fill);
  });
});
