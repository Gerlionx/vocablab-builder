import type { Word } from "@/lib/vocab-data";

const KEY = "vocablab.wordPatches";

export type WordPatch = Partial<
  Pick<Word, "french" | "english" | "year" | "term" | "topic" | "difficulty" | "image">
>;

export function loadWordPatches(): Record<string, WordPatch> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, WordPatch>;
  } catch {
    return {};
  }
}

export function saveWordPatch(id: string, patch: WordPatch) {
  if (typeof window === "undefined") return;
  const all = loadWordPatches();
  all[id] = { ...all[id], ...patch };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function applyWordPatches(words: Word[], patches = loadWordPatches()): Word[] {
  if (!Object.keys(patches).length) return words;
  return words.map((w) => {
    const p = patches[w.id];
    if (!p) return w;
    const next: Word = { ...w, ...p };
    if (p.image === "" || p.image === null) {
      delete next.image;
    }
    return next;
  });
}
