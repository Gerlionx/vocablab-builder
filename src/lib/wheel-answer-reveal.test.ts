import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRevealPlan,
  canRevealMore,
  displayAnswer,
  maskText,
} from "./wheel-answer-reveal.ts";

describe("buildRevealPlan", () => {
  it("reveals multi-word answers word by word", () => {
    assert.deepEqual(buildRevealPlan("How are you"), ["How", "How are", "How are you"]);
  });

  it("chunks single tokens into progressive steps", () => {
    const plan = buildRevealPlan("Bonjour");
    assert.equal(plan.at(-1), "Bonjour");
    assert.ok(plan.length >= 2);
  });
});

describe("displayAnswer", () => {
  const plan = buildRevealPlan("la mère");

  it("hides the answer before any reveal step", () => {
    const view = displayAnswer(plan, 0);
    assert.equal(view.visible, "");
    assert.equal(view.masked, "la mère");
    assert.equal(view.complete, false);
  });

  it("shows partial text after a reveal step", () => {
    const view = displayAnswer(plan, 1);
    assert.equal(view.visible, "la");
    assert.equal(view.complete, false);
  });
});

describe("canRevealMore", () => {
  it("allows reveals until the plan is exhausted", () => {
    const plan = buildRevealPlan("one two");
    assert.equal(canRevealMore(0, plan), true);
    assert.equal(canRevealMore(plan.length, plan), false);
  });
});

describe("maskText", () => {
  it("preserves spaces while masking letters", () => {
    assert.equal(maskText("a b"), "• •");
  });
});
