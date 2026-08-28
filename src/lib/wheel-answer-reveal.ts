/**
 * Progressive answer reveal for Wheel question rounds.
 * Multi-word answers reveal word-by-word; single tokens reveal in chunks.
 */

export function buildRevealPlan(answer: string): string[] {
  const text = answer.trim();
  if (!text) return [];

  const words = text.split(/\s+/);
  if (words.length > 1) {
    const steps: string[] = [];
    for (let i = 0; i < words.length; i++) {
      steps.push(words.slice(0, i + 1).join(" "));
    }
    return steps;
  }

  const len = text.length;
  if (len <= 3) return [text];

  const targetSteps = Math.min(4, Math.max(2, Math.ceil(len / 3)));
  const steps: string[] = [];
  for (let i = 1; i <= targetSteps; i++) {
    const revealed = Math.round((len * i) / targetSteps);
    steps.push(text.slice(0, revealed));
  }

  const unique = [...new Set(steps)];
  if (unique[unique.length - 1] !== text) unique.push(text);
  return unique;
}

export type RevealDisplay = {
  visible: string;
  /** Remaining answer text not yet revealed (for masked display). */
  masked: string;
  /** True when the full answer is visible. */
  complete: boolean;
};

export function displayAnswer(plan: string[], step: number): RevealDisplay {
  if (!plan.length) return { visible: "", masked: "", complete: true };
  const full = plan[plan.length - 1]!;
  if (step <= 0) {
    return { visible: "", masked: full, complete: false };
  }
  const idx = Math.min(step - 1, plan.length - 1);
  const visible = plan[idx] ?? "";
  const masked = visible.length < full.length ? full.slice(visible.length) : "";
  return { visible, masked, complete: visible.length >= full.length };
}

export function canRevealMore(step: number, plan: string[]): boolean {
  return plan.length > 0 && step < plan.length;
}

export function maskText(text: string): string {
  return text
    .split("")
    .map((ch) => (/\s/.test(ch) ? ch : "•"))
    .join("");
}
