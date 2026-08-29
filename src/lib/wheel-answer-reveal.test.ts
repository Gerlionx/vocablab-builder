import {
  buildRevealPlan,
  canRevealMore,
  displayAnswer,
  hintStride,
  maskText,
  renderReveal,
} from "./wheel-answer-reveal.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("hintStride", () => {
  it("gives one letter at a time on very short words", () => {
    assert.equal(hintStride("oui"), 1);
    assert.equal(hintStride("hi"), 1);
  });

  it("opens bigger chunks as the answer gets longer", () => {
    assert.equal(hintStride("merci"), 2);
    assert.ok(hintStride("immangeable") >= 3);
    assert.ok(hintStride("je me chamaille avec") >= 4);
  });
});

describe("buildRevealPlan", () => {
  it("reveals one letter at a time on three-letter words and never the last letter", () => {
    const plan = buildRevealPlan("oui");
    assert.equal(plan.length, 2);
    assert.equal(plan[0]!.length, 1);
    assert.equal(plan[1]!.length, 2);
    assert.ok(!plan.at(-1)!.includes(2));
  });

  it("never reveals the last letter on a longer word", () => {
    const plan = buildRevealPlan("Bonjour");
    assert.ok(plan.length >= 1);
    const lastIdx = "Bonjour".length - 1;
    for (const step of plan) {
      assert.ok(!step.includes(lastIdx));
    }
    assert.equal(plan.at(-1)!.length, 6);
  });

  it("keeps at least one letter hidden on multi-word answers", () => {
    const plan = buildRevealPlan("How are you");
    assert.ok(plan.length > 0);
    const letters = "How are you".replace(/\s/g, "").length;
    assert.ok((plan.at(-1) ?? []).length < letters);
  });

  it("offers no hint for a single-letter answer", () => {
    assert.deepEqual(buildRevealPlan("a"), []);
    assert.equal(canRevealMore(0, []), false);
  });

  it("is stable for the same answer across calls", () => {
    assert.deepEqual(buildRevealPlan("immangeable"), buildRevealPlan("immangeable"));
  });

  it("picks letters from more than just the start", () => {
    const plan = buildRevealPlan("immangeable");
    const first = plan[0] ?? [];
    assert.ok(first.length >= 1);
    assert.ok(first.some((i) => i > 2));
  });
});

describe("displayAnswer", () => {
  it("hides the answer before any reveal step", () => {
    const view = displayAnswer("la mère", 0);
    assert.equal(view.shown, "●● ●●●●");
    assert.equal(view.complete, false);
  });

  it("shows random letters in place and never completes via hints", () => {
    const view = displayAnswer("la mère", 1);
    assert.match(view.shown, /[a-zàâäéèêëïîôùûüç]/i);
    assert.match(view.shown, /●/);
    assert.equal(view.complete, false);
    const last = displayAnswer("la mère", 99);
    assert.match(last.shown, /●/);
    assert.equal(last.complete, false);
  });
});

describe("canRevealMore", () => {
  it("allows reveals until the last letter would be shown", () => {
    const plan = buildRevealPlan("one two");
    assert.equal(canRevealMore(0, plan), true);
    assert.equal(canRevealMore(plan.length, plan), false);
  });
});

describe("maskText", () => {
  it("preserves spaces while masking letters", () => {
    assert.equal(maskText("a b"), "● ●");
  });
});

describe("renderReveal", () => {
  it("keeps revealed letters in their original places", () => {
    assert.equal(renderReveal("chat", [1, 3]), "●h●t");
  });
});
