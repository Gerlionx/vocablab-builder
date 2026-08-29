import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  facetOptionCounts,
  filterWords,
  normalizeSearchText,
  searchWords,
  toggleFilterValue,
} from "./vocab-filter.ts";

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
  {
    id: "3",
    year: "Year 8",
    term: "Term 1",
    topic: "Weather",
    difficulty: "Medium",
    french: "L'été",
    english: "Summer",
  },
];

describe("filterWords", () => {
  it("treats empty lists as all by default", () => {
    assert.equal(filterWords(sample, { years: [], terms: [], topics: [], difficulties: [] }).length, 3);
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
    assert.equal(years["Year 8"], 2);
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

describe("toggleFilterValue", () => {
  it("adds a missing value and removes an existing one", () => {
    assert.deepEqual(toggleFilterValue([], "Year 7"), ["Year 7"]);
    assert.deepEqual(toggleFilterValue(["Year 7", "Year 8"], "Year 7"), ["Year 8"]);
    assert.deepEqual(toggleFilterValue(["Year 8"], "Year 7"), ["Year 8", "Year 7"]);
  });
});

describe("searchWords", () => {
  it("returns nothing for an empty query", () => {
    assert.deepEqual(searchWords(sample, "  "), []);
  });

  it("matches French or English as you type", () => {
    assert.equal(searchWords(sample, "bon").map((w) => w.id).join(), "1");
    assert.equal(searchWords(sample, "hell").map((w) => w.id).join(), "1");
    assert.equal(searchWords(sample, "spo").map((w) => w.id).sort().join(), "2");
  });

  it("ignores accents so ete finds été", () => {
    assert.equal(normalizeSearchText("L'été"), "l'ete");
    assert.equal(searchWords(sample, "ete").map((w) => w.id).join(), "3");
  });

  it("matches topic labels", () => {
    assert.equal(searchWords(sample, "greet").map((w) => w.id).join(), "1");
  });
});
