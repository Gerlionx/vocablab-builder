import type { Difficulty, Word } from "@/lib/vocab-data";

export const VOCAB_BACKUP_MARKER = "VOCABLAB_BACKUP_V1";

export type VocabBackupPayload = {
  version: 1;
  exportedAt: number;
  words: Word[];
};

export type DuplicateMatch = {
  incoming: Word;
  existing: Word;
  reason: "id" | "phrase";
};

export type VocabMergePlan = {
  duplicates: DuplicateMatch[];
  missing: Word[];
  /** Incoming words that match an existing entry (same as duplicates' incoming). */
  conflicting: Word[];
};

export type VocabMergeMode = "overwrite_all" | "add_missing";

const DIFFICULTIES: readonly Difficulty[] = ["Low", "Medium", "High"];

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function phraseKey(w: Pick<Word, "year" | "french" | "english">) {
  return `${w.year.trim().toLowerCase()}::${w.french.trim().toLowerCase()}::${w.english.trim().toLowerCase()}`;
}

function isDifficulty(raw: unknown): raw is Difficulty {
  return raw === "Low" || raw === "Medium" || raw === "High";
}

/** Normalise one word from backup JSON; drop invalid rows. */
export function normaliseBackupWord(raw: unknown): Word | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o["id"] === "string" ? o["id"].trim() : "";
  const year = typeof o["year"] === "string" ? o["year"].trim() : "";
  const term = typeof o["term"] === "string" ? o["term"].trim() : "";
  const topic = typeof o["topic"] === "string" ? o["topic"].trim() : "";
  const french = typeof o["french"] === "string" ? o["french"].trim() : "";
  const english = typeof o["english"] === "string" ? o["english"].trim() : "";
  if (!id || !year || !term || !topic || !french || !english) return null;
  const difficulty = isDifficulty(o["difficulty"]) ? o["difficulty"] : "Medium";
  const imageRaw = o["image"];
  const image =
    typeof imageRaw === "string" && imageRaw.trim() ? imageRaw.trim() : undefined;
  const word: Word = { id, year, term, topic, difficulty, french, english };
  if (image) word.image = image;
  return word;
}

export function buildVocabBackupPayload(words: Word[]): VocabBackupPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    words: words.map((w) => {
      const row: Word = {
        id: w.id,
        year: w.year,
        term: w.term,
        topic: w.topic,
        difficulty: DIFFICULTIES.includes(w.difficulty) ? w.difficulty : "Medium",
        french: w.french,
        english: w.english,
      };
      if (w.image) row.image = w.image;
      return row;
    }),
  };
}

/**
 * HTML Word document (.doc) — human-readable table plus a JSON payload
 * teachers can restore later via Restore / load.
 */
export function serializeVocabBackupDoc(words: Word[]): string {
  const payload = buildVocabBackupPayload(words);
  const json = JSON.stringify(payload);
  const rows = payload.words
    .map(
      (w) => `<tr>
  <td>${escapeHtml(w.year)}</td>
  <td>${escapeHtml(w.term)}</td>
  <td>${escapeHtml(w.topic)}</td>
  <td>${escapeHtml(w.difficulty)}</td>
  <td>${escapeHtml(w.french)}</td>
  <td>${escapeHtml(w.english)}</td>
</tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>VocabLab vocabulary backup</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; }
  h1 { font-size: 20pt; margin: 0 0 6pt; }
  .meta { color: #555; font-size: 11pt; margin-bottom: 14pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { border-bottom: 2px solid #333; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
</style>
</head>
<body>
  <h1>VocabLab vocabulary backup</h1>
  <p class="meta">${payload.words.length} words · keep this file to restore later</p>
  <table>
    <thead>
      <tr><th>Year</th><th>Term</th><th>Topic</th><th>Level</th><th>French</th><th>English</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <!-- ${VOCAB_BACKUP_MARKER}
${json}
-->
</body>
</html>`;
}

/** Extract backup payload from a VocabLab .doc / HTML file body. */
export function parseVocabBackupDoc(html: string): VocabBackupPayload {
  const marker = VOCAB_BACKUP_MARKER;
  const start = html.indexOf(`<!-- ${marker}`);
  if (start === -1) {
    throw new Error("This file is not a VocabLab vocabulary backup.");
  }
  const afterMarker = html.slice(start + `<!-- ${marker}`.length);
  const end = afterMarker.indexOf("-->");
  if (end === -1) {
    throw new Error("This backup file is damaged (missing end marker).");
  }
  const jsonText = afterMarker.slice(0, end).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("This backup file is damaged (invalid data).");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("This backup file is damaged (empty data).");
  }
  const o = parsed as Record<string, unknown>;
  if (o["version"] !== 1 || !Array.isArray(o["words"])) {
    throw new Error("This backup file uses an unsupported format.");
  }
  const words: Word[] = [];
  for (const row of o["words"] as unknown[]) {
    const w = normaliseBackupWord(row);
    if (w) words.push(w);
  }
  if (!words.length) {
    throw new Error("This backup file has no vocabulary words.");
  }
  return {
    version: 1,
    exportedAt: typeof o["exportedAt"] === "number" ? o["exportedAt"] : Date.now(),
    words,
  };
}

/** Plan a restore: which incoming words conflict, which are missing. */
export function planVocabMerge(existing: Word[], incoming: Word[]): VocabMergePlan {
  const byId = new Map(existing.map((w) => [w.id, w]));
  const byPhrase = new Map(existing.map((w) => [phraseKey(w), w]));
  const duplicates: DuplicateMatch[] = [];
  const missing: Word[] = [];
  const seenIncoming = new Set<string>();

  for (const word of incoming) {
    if (seenIncoming.has(word.id)) continue;
    seenIncoming.add(word.id);
    const byIdHit = byId.get(word.id);
    if (byIdHit) {
      duplicates.push({ incoming: word, existing: byIdHit, reason: "id" });
      continue;
    }
    const byPhraseHit = byPhrase.get(phraseKey(word));
    if (byPhraseHit) {
      duplicates.push({ incoming: word, existing: byPhraseHit, reason: "phrase" });
      continue;
    }
    missing.push(word);
  }

  return {
    duplicates,
    missing,
    conflicting: duplicates.map((d) => d.incoming),
  };
}

/**
 * Apply a restore choice.
 * - overwrite_all: replace the whole bank with the backup words
 * - add_missing: keep existing; append only non-duplicates from the backup
 */
export function applyVocabMerge(
  existing: Word[],
  incoming: Word[],
  mode: VocabMergeMode,
): Word[] {
  if (mode === "overwrite_all") {
    const seen = new Set<string>();
    const out: Word[] = [];
    for (const w of incoming) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      out.push(w);
    }
    return out;
  }
  const plan = planVocabMerge(existing, incoming);
  return [...existing, ...plan.missing];
}

export function vocabBackupFilename(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `vocablab-vocabulary-${y}-${m}-${d}.doc`;
}

export function downloadVocabBackup(words: Word[]) {
  if (typeof document === "undefined") return;
  const html = serializeVocabBackupDoc(words);
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = vocabBackupFilename();
  a.click();
  URL.revokeObjectURL(url);
}

const BANK_KEY = "vocablab.wordBank.v1";

/** Full teacher vocabulary bank (seed + edits + restores). */
export function loadPersistedWordBank(): Word[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BANK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const words: Word[] = [];
    for (const row of parsed) {
      const w = normaliseBackupWord(row);
      if (w) words.push(w);
    }
    return words.length ? words : null;
  } catch {
    return null;
  }
}

export function savePersistedWordBank(words: Word[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BANK_KEY, JSON.stringify(buildVocabBackupPayload(words).words));
}
