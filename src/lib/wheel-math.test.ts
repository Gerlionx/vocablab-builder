import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KISS_DEG, pegOffsetLocal, pointerLocal, winnerIndex } from "./wheel-math.ts";

function angleForLocal(local: number) {
  return (90 - local + 360) % 360;
}

describe("pegOffsetLocal", () => {
  it("returns negative values just before a peg", () => {
    const n = 8;
    const step = 360 / n;
    const peg = 3 * step;
    assert.ok(pegOffsetLocal(angleForLocal(peg - KISS_DEG), n) < 0);
  });
});

describe("winnerIndex pin boundaries", () => {
  it("keeps the current slice mid-segment", () => {
    const n = 8;
    const step = 360 / n;
    assert.equal(winnerIndex(angleForLocal(step * 2 + step * 0.4), n), 2);
  });

  it("selects the next slice when kissing a peg from below", () => {
    const n = 8;
    const step = 360 / n;
    const peg = 3 * step;
    const angle = angleForLocal(peg - KISS_DEG);
    assert.equal(winnerIndex(angle, n), 3);
    assert.ok(Math.abs(pegOffsetLocal(angle, n) + KISS_DEG) < 1e-6);
  });

  it("selects the slice that starts on an exact peg", () => {
    const n = 5;
    const step = 360 / n;
    assert.equal(winnerIndex(angleForLocal(step * 2), n), 2);
  });

  it("matches the displayed hot slice when resting just past a peg", () => {
    const n = 6;
    const step = 360 / n;
    const peg = 4 * step;
    assert.equal(winnerIndex(angleForLocal(peg + 0.35), n), 4);
  });
});

describe("winnerIndex pointer mapping", () => {
  it("maps pointerLocal back to the same index", () => {
    const n = 7;
    const step = 360 / n;
    for (let i = 0; i < n; i++) {
      const local = i * step + step * 0.35;
      const angle = angleForLocal(local);
      assert.ok(Math.abs(pointerLocal(angle) - local) < 1e-6);
      assert.equal(winnerIndex(angle, n), i);
    }
  });
});
