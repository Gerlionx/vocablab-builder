import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIFFICULTIES,
  DEMO_NAMES,
  SEED_WORDS,
  TERMS,
  TOPICS,
  YEARS,
} from "./vocab-data.ts";

describe("vocab seed integrity", () => {
  it("has unique word ids", () => {
    const ids = SEED_WORDS.map((w) => w.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("keeps every seed word inside known facets", () => {
    const yearSet = new Set(YEARS);
    const termSet = new Set(TERMS);
    const topicSet = new Set(TOPICS);
    const diffSet = new Set(DIFFICULTIES);
    for (const word of SEED_WORDS) {
      assert.ok(yearSet.has(word.year), `unknown year ${word.year} on ${word.id}`);
      assert.ok(termSet.has(word.term), `unknown term ${word.term} on ${word.id}`);
      assert.ok(topicSet.has(word.topic), `unknown topic ${word.topic} on ${word.id}`);
      assert.ok(diffSet.has(word.difficulty), `unknown difficulty on ${word.id}`);
      assert.ok(word.french.trim(), `empty french on ${word.id}`);
      assert.ok(word.english.trim(), `empty english on ${word.id}`);
    }
  });

  it("includes all year bands in the seed", () => {
    const present = new Set(SEED_WORDS.map((w) => w.year));
    for (const year of YEARS) {
      assert.ok(present.has(year), `missing year band ${year}`);
    }
  });

  it("exports a non-empty demo roster", () => {
    assert.ok(DEMO_NAMES.length >= 8);
    assert.equal(new Set(DEMO_NAMES.map((n) => n.toLowerCase())).size, DEMO_NAMES.length);
  });

  it("keeps a substantial bank", () => {
    assert.ok(SEED_WORDS.length >= 500);
  });
});
