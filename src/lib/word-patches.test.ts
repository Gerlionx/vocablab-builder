import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Word } from "./vocab-data.ts";
import { applyWordPatches, loadWordPatches, saveWordPatch } from "./word-patches.ts";

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
  const local = memoryStorage();
  (globalThis as { localStorage?: Storage }).localStorage = local as unknown as Storage;
  (globalThis as { window?: unknown }).window = globalThis;
});

const sample: Word[] = [
  {
    id: "w1",
    year: "Year 7",
    term: "Term 1",
    topic: "Greetings",
    difficulty: "Low",
    french: "bonjour",
    english: "hello",
    image: "lib:old",
  },
  {
    id: "w2",
    year: "Year 7",
    term: "Term 1",
    topic: "Greetings",
    difficulty: "Medium",
    french: "merci",
    english: "thanks",
  },
];

describe("word patches", () => {
  it("starts empty and merges patches by id", () => {
    assert.deepEqual(loadWordPatches(), {});
    saveWordPatch("w1", { english: "hi" });
    saveWordPatch("w1", { french: "salut" });
    assert.deepEqual(loadWordPatches().w1, { english: "hi", french: "salut" });
  });

  it("applies patches onto words and clears image with empty string", () => {
    saveWordPatch("w1", { english: "hi", image: "" });
    const next = applyWordPatches(sample);
    assert.equal(next[0]?.english, "hi");
    assert.equal("image" in (next[0] ?? {}), false);
    assert.equal(next[1]?.english, "thanks");
  });

  it("returns the same array when there are no patches", () => {
    assert.equal(applyWordPatches(sample, {}), sample);
  });
});
