import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { facetOptionCounts, filterWords } from "./vocab-filter.ts";

const sample = [
  {
    id: "1",
    year: "Year 7",
    term: "Term 1",
    topic: "Greetings",
    difficulty: "Medium",
    french: "Bonjour",
    english: "Hello",
  },
  {
    id: "2",
    year: "Year 8",
    term: "Term 2",
    topic: "Sport",
    difficulty: "Low",
    french: "Le sport",
    english: "Sport",
  },
];

describe("filterWords", () => {
  it("treats empty lists as all by default", () => {
    assert.equal(filterWords(sample, { years: [], terms: [], topics: [], difficulties: [] }).length, 2);
  });

  it("treats empty lists as none when emptyMeansAll is false", () => {
    assert.equal(
      filterWords(
        sample,
        { years: [], terms: [], topics: [], difficulties: [] },
        { emptyMeansAll: false },
      ).length,
      0,
    );
    assert.equal(
      filterWords(
        sample,
        {
          years: ["Year 7"],
          terms: ["Term 1"],
          topics: ["Greetings"],
          difficulties: ["Medium"],
        },
        { emptyMeansAll: false },
      ).length,
      1,
    );
  });

  it("counts facet options from playable vocabulary", () => {
    const years = facetOptionCounts(
      sample,
      { years: [], terms: [], topics: [], difficulties: [] },
      "years",
      ["Year 7", "Year 8", "Year 9"],
    );
    assert.equal(years["Year 7"], 1);
    assert.equal(years["Year 8"], 1);
    assert.equal(years["Year 9"], 0);

    const topicsWhenY7 = facetOptionCounts(
      sample,
      { years: ["Year 7"], terms: [], topics: [], difficulties: [] },
      "topics",
      ["Greetings", "Sport"],
    );
    assert.equal(topicsWhenY7.Greetings, 1);
    assert.equal(topicsWhenY7.Sport, 0);
  });
});
