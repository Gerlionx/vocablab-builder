/** Word shape needed to pick a lesson question. */
export type PromptableWord = {
  id: string;
  french: string;
  english: string;
};

/**
 * Gap-fill / completion stems (ellipsis or blank runs) belong in a different
 * exercise — not Wheel of Names translate Q&A.
 */
export function isGapFillPhrase(text: string): boolean {
  return /…|\.{2,}|_{2,}/.test(text);
}

/** True when both sides are complete phrases suitable for the wheel. */
export function isWheelPlayableWord(word: PromptableWord): boolean {
  return !isGapFillPhrase(word.french) && !isGapFillPhrase(word.english);
}

export function wheelPlayableWords<T extends PromptableWord>(words: T[]): T[] {
  return words.filter(isWheelPlayableWord);
}

/**
 * Pick the next question from a lesson.
 * Exhausts every unused word before any question can repeat.
 * When the lesson is fully covered, starts a new pass (`reshuffled`).
 * Gap-fill vocabulary (… / ...) is excluded automatically.
 */
export function pickPrompt<T extends PromptableWord>(
  words: T[],
  avoidIds: Set<string> = new Set(),
  direction: "french" | "english" | "random" = "random",
): {
  word: T;
  askFrench: boolean;
  /** True when every lesson word was already used and a new pass begins. */
  reshuffled: boolean;
} | null {
  const deck = wheelPlayableWords(words);
  if (!deck.length) return null;

  const fresh = deck.filter((word) => !avoidIds.has(word.id));
  let pool: T[] = fresh;
  let reshuffled = false;

  if (!pool.length) {
    // Full lesson covered — only now may questions repeat (new pass).
    reshuffled = true;
    pool = deck;
    // Avoid asking the same word twice in a row when the deck flips.
    if (deck.length > 1 && avoidIds.size) {
      const lastId = [...avoidIds].at(-1);
      const withoutLast = deck.filter((word) => word.id !== lastId);
      if (withoutLast.length) pool = withoutLast;
    }
  }

  const word = pool[Math.floor(Math.random() * pool.length)]!;
  const askFrench =
    direction === "french" ? true : direction === "english" ? false : Math.random() < 0.5;
  return { word, askFrench, reshuffled };
}
