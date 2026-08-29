import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCorrectEscape,
  applySkipPenalty,
  countAlive,
  shouldEndTimeBankMatch,
  soleSurvivorIndex,
} from "./wheel-time-bank.ts";
import { pointsForAnswer, pointsForSkip } from "./wheel-scoring.ts";
import type { WheelSettings } from "./game-settings.ts";
import {
  nextCatchUpIndex,
  shouldEndScoreMatch,
  shouldEndSoloScoreMatch,
  teamWinnerFromScores,
} from "./wheel-score-race.ts";
import { pickPrompt, type PromptableWord } from "./wheel-prompt.ts";

const standard: WheelSettings = {
  gameMode: "basic",
  winMode: "score",
  scoreToWin: 10,
  pointsCorrect: 3,
  pointsRevealed: 1,
  pointsSkip: 0,
  secondsPerTeam: 90,
  bufferSeconds: 10,
  skipPenaltySeconds: 5,
  askDirection: "french",
};

const deck: PromptableWord[] = [
  { id: "a", french: "bonjour", english: "hello" },
  { id: "b", french: "merci", english: "thanks" },
  { id: "c", french: "salut", english: "hi" },
];

describe("wheel game simulation — Standard score race", () => {
  it("plays multiple team scenarios to a win with catch-up", () => {
    const target = 6;
    const scenarios = [
      // A hits target first; B catch-up; A wins
      { answers: [3, 2, 3, 3], spins: [2, 2], expectWinner: 0 },
      // Both reach six after B's catch-up turn — draw
      { answers: [3, 3, 3, 3], spins: [2, 2], expectWinner: "draw" as const },
      // Early miss for B, then catch-up still leaves A ahead
      { answers: [3, 0, 3, 1], spins: [2, 2], expectWinner: 0 },
    ];

    for (const scenario of scenarios) {
      const scores = [0, 0];
      const spins = [0, 0];
      let turn = 0;
      for (const pts of scenario.answers) {
        scores[turn]! += pts;
        spins[turn]! += 1;
        if (shouldEndScoreMatch(scores, spins, target)) break;
        const catchUp = nextCatchUpIndex(turn, spins);
        turn =
          reachedTargetNeedsCatchUp(scores, spins, target) && catchUp != null
            ? catchUp
            : (turn + 1) % 2;
      }
      assert.equal(shouldEndScoreMatch(scores, spins, target), true);
      assert.deepEqual(spins, scenario.spins);
      assert.equal(teamWinnerFromScores(scores), scenario.expectWinner);
    }
  });

  it("ends solo as soon as one player hits the target", () => {
    const target = 6;
    const scores = [0, 0, 0];
    const awards = [3, 3, 2, 3];
    let i = 0;
    while (!shouldEndSoloScoreMatch(scores, target) && i < awards.length) {
      scores[i % 3]! += awards[i]!;
      i += 1;
    }
    assert.equal(shouldEndSoloScoreMatch(scores, target), true);
    assert.ok(Math.max(...scores) >= target);
  });
});

function reachedTargetNeedsCatchUp(
  scores: number[],
  spins: number[],
  target: number,
): boolean {
  return scores.some((s) => s >= target) && !spins.every((c) => c === spins[0]);
}

describe("wheel game simulation — Time bank eliminate to one", () => {
  it("eliminates down to a sole survivor across scenarios", () => {
    const scenarios = [
      {
        banks: [40, 40, 40],
        events: [
          { i: 0, kind: "escape" as const, elapsed: 12 },
          { i: 1, kind: "out" as const },
          { i: 2, kind: "escape" as const, elapsed: 8 },
          { i: 0, kind: "out" as const },
        ],
        survivor: 2,
      },
      {
        banks: [30, 30],
        events: [
          { i: 0, kind: "escape" as const, elapsed: 20 },
          { i: 1, kind: "escape" as const, elapsed: 5 },
          { i: 0, kind: "out" as const },
        ],
        survivor: 1,
      },
    ];

    for (const scenario of scenarios) {
      const banks = [...scenario.banks];
      const eliminated = banks.map(() => false);
      const inBuffer = banks.map(() => false);
      const order: string[] = [];

      for (const ev of scenario.events) {
        if (eliminated[ev.i]) continue;
        if (ev.kind === "escape") {
          const next = applyCorrectEscape(
            banks[ev.i]!,
            ev.elapsed ?? 0,
            10,
            inBuffer[ev.i]!,
          );
          banks[ev.i] = next.bank;
          inBuffer[ev.i] = next.inBufferZone;
        } else {
          eliminated[ev.i] = true;
          order.push(String(ev.i));
        }
        if (shouldEndTimeBankMatch(countAlive(eliminated))) break;
      }

      assert.equal(shouldEndTimeBankMatch(countAlive(eliminated)), true);
      assert.equal(soleSurvivorIndex(eliminated), scenario.survivor);
      assert.equal(countAlive(eliminated), 1);
    }
  });
});

describe("wheel game simulation — scoring edge cases and deck", () => {
  it("applies skip penalty without eliminating in time bank", () => {
    const before = 40;
    const hit = applySkipPenalty(before, standard.skipPenaltySeconds, 10, false);
    assert.equal(hit.bank, 35);
    assert.equal(hit.inBufferZone, false);
    assert.equal(pointsForSkip(standard), 0);
  });

  it("awards zero points when the answer was fully revealed", () => {
    assert.equal(pointsForAnswer(standard, 0, true), 0);
    assert.equal(pointsForAnswer(standard, 2, true), 0);
  });

  it("reshuffles the lesson deck only after every word is used", () => {
    const used = new Set<string>();
    for (let i = 0; i < deck.length; i++) {
      const next = pickPrompt(deck, used, "french");
      assert.ok(next);
      assert.equal(next.reshuffled, false);
      used.add(next.word.id);
    }
    assert.equal(used.size, deck.length);

    const reshuffle = pickPrompt(deck, used, "french");
    assert.ok(reshuffle);
    assert.equal(reshuffle.reshuffled, true);
    // After reshuffle, UI keeps only the new word id in the used set.
    const after = new Set([reshuffle.word.id]);
    const second = pickPrompt(deck, after, "french");
    assert.ok(second);
    assert.equal(second.reshuffled, false);
    assert.notEqual(second.word.id, reshuffle.word.id);
  });
});
