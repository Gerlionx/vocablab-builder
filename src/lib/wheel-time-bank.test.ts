import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCorrectEscape,
  applySkipPenalty,
  countAlive,
  elapsedFromRoundClock,
  rankTimeBankContestants,
  roundClockSeconds,
  shouldEndTimeBankMatch,
  soleSurvivorIndex,
} from "./wheel-time-bank.ts";

describe("time bank round clock", () => {
  it("shows remaining bank before the buffer zone", () => {
    assert.equal(roundClockSeconds(24, 10, false), 24);
    assert.equal(roundClockSeconds(10, 10, false), 10);
  });

  it("shows buffer seconds once in the buffer zone", () => {
    assert.equal(roundClockSeconds(3, 10, true), 10);
    assert.equal(roundClockSeconds(0, 10, true), 10);
  });
});

describe("time bank correct escape", () => {
  it("deducts elapsed time and stays out of buffer when bank stays >= buffer", () => {
    const next = applyCorrectEscape(24, 8, 10, false);
    assert.equal(next.bank, 16);
    assert.equal(next.inBufferZone, false);
  });

  it("enters buffer zone after escaping with bank below buffer", () => {
    const next = applyCorrectEscape(12, 5, 10, false);
    assert.equal(next.bank, 7);
    assert.equal(next.inBufferZone, true);
  });

  it("stays in buffer zone on later escapes", () => {
    const next = applyCorrectEscape(7, 4, 10, true);
    assert.equal(next.bank, 3);
    assert.equal(next.inBufferZone, true);
  });

  it("computes elapsed from the round countdown", () => {
    assert.equal(elapsedFromRoundClock(24, 16), 8);
    assert.equal(elapsedFromRoundClock(10, 3), 7);
  });

  it("applies an optional skip penalty without eliminating", () => {
    const free = applySkipPenalty(40, 0, 10, false);
    assert.equal(free.bank, 40);
    assert.equal(free.inBufferZone, false);

    const hit = applySkipPenalty(40, 5, 10, false);
    assert.equal(hit.bank, 35);
    assert.equal(hit.inBufferZone, false);

    const intoBuffer = applySkipPenalty(12, 5, 10, false);
    assert.equal(intoBuffer.bank, 7);
    assert.equal(intoBuffer.inBufferZone, true);
  });
});

describe("time bank elimination / win", () => {
  it("ends when one contestant remains", () => {
    assert.equal(shouldEndTimeBankMatch(1), true);
    assert.equal(shouldEndTimeBankMatch(2), false);
    assert.equal(shouldEndTimeBankMatch(0), true);
  });

  it("finds the sole survivor", () => {
    assert.equal(soleSurvivorIndex([true, false, true]), 1);
    assert.equal(soleSurvivorIndex([false, false]), null);
    assert.equal(countAlive([true, false, true]), 1);
  });

  it("ranks alive by bank then eliminated by elimination order", () => {
    const ranked = rankTimeBankContestants(
      [
        { id: "a", bank: 5, eliminated: true },
        { id: "b", bank: 12, eliminated: false },
        { id: "c", bank: 0, eliminated: true },
      ],
      ["a", "c"],
    );
    assert.deepEqual(
      ranked.map((r) => r.id),
      ["b", "c", "a"],
    );
    assert.equal(ranked[0]?.place, 1);
  });
});
