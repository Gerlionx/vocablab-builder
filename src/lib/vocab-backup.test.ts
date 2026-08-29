import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Word } from "./vocab-data.ts";
import {
  applyVocabMerge,
  buildVocabBackupPayload,
  parseVocabBackupDoc,
  planVocabMerge,
  serializeVocabBackupDoc,
  vocabBackupFilename,
} from "./vocab-backup.ts";

const sample: Word[] = [
  {
    id: "w1",
    year: "Year 8",
    term: "Term 1",
    topic: "Greetings",
    difficulty: "Low",
    french: "bonjour",
    english: "hello",
  },
  {
    id: "w2",
    year: "Year 8",
    term: "Term 1",
    topic: "Greetings",
    difficulty: "Medium",
    french: "au revoir",
    english: "goodbye",
  },
];

describe("vocab backup serialize / parse", () => {
  it("round-trips words through a Word .doc backup", () => {
    const html = serializeVocabBackupDoc(sample);
    assert.match(html, /VocabLab vocabulary backup/);
    assert.match(html, /bonjour/);
    const parsed = parseVocabBackupDoc(html);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.words.length, 2);
    assert.deepEqual(
      parsed.words.map((w) => w.id),
      ["w1", "w2"],
    );
    assert.equal(parsed.words[0]?.french, "bonjour");
    assert.equal(parsed.words[0]?.english, "hello");
  });

  it("rejects files without the VocabLab marker", () => {
    assert.throws(
      () => parseVocabBackupDoc("<html><body>not a backup</body></html>"),
      /not a VocabLab vocabulary backup/,
    );
  });

  it("builds a dated .doc filename", () => {
    assert.equal(
      vocabBackupFilename(new Date("2026-08-29T12:00:00Z")),
      "vocablab-vocabulary-2026-08-29.doc",
    );
  });

  it("keeps image paths in the payload when present", () => {
    const withImg: Word[] = [{ ...sample[0]!, image: "lib:abc" }];
    const payload = buildVocabBackupPayload(withImg);
    assert.equal(payload.words[0]?.image, "lib:abc");
  });
});

describe("vocab backup merge plan", () => {
  it("flags id duplicates and lists missing words", () => {
    const incoming: Word[] = [
      { ...sample[0]!, english: "hi" },
      {
        id: "w9",
        year: "Year 9",
        term: "Term 2",
        topic: "Sport",
        difficulty: "High",
        french: "le sport",
        english: "sport",
      },
    ];
    const plan = planVocabMerge(sample, incoming);
    assert.equal(plan.duplicates.length, 1);
    assert.equal(plan.duplicates[0]?.reason, "id");
    assert.equal(plan.missing.length, 1);
    assert.equal(plan.missing[0]?.id, "w9");
  });

  it("flags phrase duplicates when ids differ", () => {
    const incoming: Word[] = [
      {
        id: "other",
        year: "Year 8",
        term: "Term 1",
        topic: "Greetings",
        difficulty: "Low",
        french: "Bonjour",
        english: "Hello",
      },
    ];
    const plan = planVocabMerge(sample, incoming);
    assert.equal(plan.duplicates.length, 1);
    assert.equal(plan.duplicates[0]?.reason, "phrase");
    assert.equal(plan.missing.length, 0);
  });
});

describe("vocab backup apply merge", () => {
  it("overwrite_all replaces the bank with the backup", () => {
    const incoming: Word[] = [
      {
        id: "w9",
        year: "Year 9",
        term: "Term 1",
        topic: "Food",
        difficulty: "Low",
        french: "le pain",
        english: "bread",
      },
    ];
    const next = applyVocabMerge(sample, incoming, "overwrite_all");
    assert.equal(next.length, 1);
    assert.equal(next[0]?.id, "w9");
  });

  it("add_missing keeps existing and appends only new words", () => {
    const incoming: Word[] = [
      { ...sample[0]! },
      {
        id: "w9",
        year: "Year 9",
        term: "Term 1",
        topic: "Food",
        difficulty: "Low",
        french: "le pain",
        english: "bread",
      },
    ];
    const next = applyVocabMerge(sample, incoming, "add_missing");
    assert.equal(next.length, 3);
    assert.ok(next.some((w) => w.id === "w1"));
    assert.ok(next.some((w) => w.id === "w2"));
    assert.ok(next.some((w) => w.id === "w9"));
  });

  it("reports no duplicates when restoring into an empty bank", () => {
    const plan = planVocabMerge([], sample);
    assert.equal(plan.duplicates.length, 0);
    assert.equal(plan.missing.length, 2);
    const next = applyVocabMerge([], sample, "add_missing");
    assert.equal(next.length, 2);
  });
});
