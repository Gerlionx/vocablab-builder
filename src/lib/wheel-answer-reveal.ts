/**
 * Progressive answer reveal for Wheel question rounds.
 * Each hint uncovers a length-based chunk of letters at random positions.
 * The last letter is never revealed by a hint.
 */

function letterIndexes(text: string): number[] {
  const idxs: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i]!)) idxs.push(i);
  }
  return idxs;
}

/** How many letters each hint should uncover for this answer. */
export function hintStride(answer: string): number {
  const text = answer.trim();
  const n = letterIndexes(text).length;
  if (n <= 3) return 1;
  const complex = /[\s'’\-/.()]/.test(text) ? 1 : 0;
  if (n <= 6) return 2;
  if (n <= 11) return 3 + (complex && n >= 9 ? 1 : 0);
  return Math.min(n - 1, 4 + complex);
}

function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], random: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/**
 * Cumulative sets of revealed letter indexes after each hint.
 * Deterministic for a given answer so React re-renders stay stable.
 */
export function buildRevealPlan(answer: string): number[][] {
  const text = answer.trim();
  if (!text) return [];

  const letterIdxs = letterIndexes(text);
  if (letterIdxs.length <= 1) return [];

  const hintable = letterIdxs.slice(0, -1);
  const stride = hintStride(text);
  const order = shuffleInPlace([...hintable], mulberry32(seedFrom(text)));
  const steps: number[][] = [];
  const revealed: number[] = [];

  for (let i = 0; i < order.length; i += stride) {
    revealed.push(...order.slice(i, i + stride));
    steps.push([...revealed].sort((a, b) => a - b));
  }
  return steps;
}

export type RevealDisplay = {
  /** Full-length view: revealed letters in place, ● for hidden letters, spaces kept. */
  shown: string;
  /** True when every letter is visible. */
  complete: boolean;
};

export function renderReveal(full: string, revealed: ReadonlySet<number> | readonly number[]): string {
  const text = full.trim();
  const open = revealed instanceof Set ? revealed : new Set(revealed);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (/\s/.test(ch)) out += ch;
    else out += open.has(i) ? ch : "●";
  }
  return out;
}

export function displayAnswer(full: string, step: number): RevealDisplay {
  const text = full.trim();
  if (!text) return { shown: "", complete: true };
  const plan = buildRevealPlan(text);
  if (step <= 0 || !plan.length) {
    return { shown: maskText(text), complete: false };
  }
  const idx = Math.min(step - 1, plan.length - 1);
  const revealed = plan[idx] ?? [];
  const shown = renderReveal(text, revealed);
  const hiddenLetters = letterIndexes(text).filter((i) => !revealed.includes(i)).length;
  return {
    shown,
    complete: hiddenLetters === 0,
  };
}

export function canRevealMore(step: number, plan: number[][]): boolean {
  return plan.length > 0 && step < plan.length;
}

export function maskText(text: string): string {
  return text
    .split("")
    .map((ch) => (/\s/.test(ch) ? ch : "●"))
    .join("");
}
