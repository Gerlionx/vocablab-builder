import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGapFillPhrase,
  isWheelPlayableWord,
  pickPrompt,
  wheelPlayableWords,
  type PromptableWord,
} from "./wheel-prompt.ts";

const words: PromptableWord[] = [
  { id: "a", french: "bonjour", english: "hello" },
  { id: "b", french: "merci", english: "thank you" },
  { id: "c", french: "au revoir", english: "goodbye" },
];

describe("gap-fill exclusion", () => {
  it("detects ellipsis and blank runs as gap-fill", () => {
    assert.equal(isGapFillPhrase("J'ai … ans"), true);
    assert.equal(isGapFillPhrase("I have ... years of age"), true);
    assert.equal(isGapFillPhrase("le ……"), true);
    assert.equal(isGapFillPhrase("plus... que"), true);
    assert.equal(isGapFillPhrase("fill ___ here"), true);
    assert.equal(isGapFillPhrase("Bonjour"), false);
    assert.equal(isGapFillPhrase("ça va ?"), false);
  });

  it("drops gap-fill stems from the wheel deck", () => {
    const mixed: PromptableWord[] = [
      { id: "ok", french: "Bonjour", english: "Hello" },
      { id: "gap", french: "J'ai … ans", english: "I have … years of age" },
      { id: "dots", french: "plus... que", english: "more... than" },
    ];
    assert.deepEqual(
      wheelPlayableWords(mixed).map((w) => w.id),
      ["ok"],
    );
    assert.equal(isWheelPlayableWord(mixed[1]!), false);
  });

  it("never picks a gap-fill word", () => {
    const mixed: PromptableWord[] = [
      { id: "gap", french: "J'ai … ans", english: "I have … years of age" },
      { id: "ok", french: "merci", english: "thank you" },
    ];
    for (let i = 0; i < 30; i++) {
      const next = pickPrompt(mixed, new Set(), "french");
      assert.ok(next);
      assert.equal(next.word.id, "ok");
    }
    assert.equal(pickPrompt([mixed[0]!], new Set(), "french"), null);
  });
});

describe("pickPrompt lesson deck", () => {
  it("never repeats a word until every lesson word has been asked", () => {
    const used = new Set<string>();
    const seen: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const next = pickPrompt(words, used, "french");
      assert.ok(next);
      assert.equal(next.reshuffled, false);
      assert.equal(used.has(next.word.id), false);
      seen.push(next.word.id);
      used.add(next.word.id);
    }
    assert.deepEqual([...seen].sort(), ["a", "b", "c"]);
  });

  it("starts a new pass only after the full lesson is covered", () => {
    const used = new Set(words.map((w) => w.id));
    const next = pickPrompt(words, used, "english");
    assert.ok(next);
    assert.equal(next.reshuffled, true);
    assert.ok(words.some((w) => w.id === next.word.id));
  });

  it("avoids immediate repeat of the last word when reshuffling", () => {
    // Insertion order: a, b, c — last asked is c
    const used = new Set(["a", "b", "c"]);
    for (let i = 0; i < 20; i++) {
      const next = pickPrompt(words, used, "french");
      assert.ok(next);
      assert.notEqual(next.word.id, "c");
    }
  });

  it("returns null for an empty lesson", () => {
    assert.equal(pickPrompt([], new Set(), "random"), null);
  });
});
