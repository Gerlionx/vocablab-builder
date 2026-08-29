import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TEAM_LABELS, parseNames } from "./parse-names.ts";

describe("parseNames", () => {
  it("splits messy classroom pastes", () => {
    assert.deepEqual(parseNames("Amy\nBen, Cara; Dan | Eve/Fay"), [
      "Amy",
      "Ben",
      "Cara",
      "Dan",
      "Eve",
      "Fay",
    ]);
  });

  it("strips bullets and collapses spaces", () => {
    assert.deepEqual(parseNames("  •  Ada  Lovelace  \n- Bob"), ["Ada Lovelace", "Bob"]);
  });

  it("dedupes case-insensitively while keeping first spelling", () => {
    assert.deepEqual(parseNames("Mia\nmia\nMIA\nNoah"), ["Mia", "Noah"]);
  });

  it("ignores empty chunks", () => {
    assert.deepEqual(parseNames(",;\n  \n|"), []);
  });

  it("exposes six team labels", () => {
    assert.equal(TEAM_LABELS.length, 6);
    assert.equal(TEAM_LABELS[0], "Team A");
  });
});
