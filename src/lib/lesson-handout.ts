import type { AskDirection } from "@/lib/game-settings";
import type { WheelGameModeId } from "@/lib/wheel-modes";

/** Snapshot passed from the builder into the dedicated lesson preview page. */
export type LessonHandoutWord = {
  id: string;
  french: string;
  english: string;
  year: string;
  term: string;
  topic: string;
  difficulty: string;
  /** Optional illustration — teachers can grow this collection over time. */
  image?: string;
};

export type LessonHandout = {
  title: string;
  years: string[];
  terms: string[];
  topics: string[];
  difficulties: string[];
  gameMode: WheelGameModeId;
  askDirection: AskDirection;
  scoreToWin: number;
  words: LessonHandoutWord[];
  /** Word ids removed from this lesson only (not deleted from the bank). */
  excludedWordIds: string[];
  savedAt: number;
};

const KEY = "vocablab.lessonHandout.v1";

export function stashLessonHandout(handout: LessonHandout) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(handout));
}

export function loadLessonHandout(): LessonHandout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonHandout;
    if (!parsed || !Array.isArray(parsed.words)) return null;
    return {
      ...parsed,
      excludedWordIds: Array.isArray(parsed.excludedWordIds) ? parsed.excludedWordIds : [],
      words: parsed.words,
    };
  } catch {
    return null;
  }
}

export function saveLessonHandout(handout: LessonHandout) {
  stashLessonHandout({ ...handout, savedAt: Date.now() });
}

/** Visible words in handout order, minus exclusions. */
export function handoutVisibleWords(handout: LessonHandout): LessonHandoutWord[] {
  const skip = new Set(handout.excludedWordIds);
  return handout.words.filter((w) => !skip.has(w.id));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeFilename(title: string) {
  const base = title.trim().replace(/[^\w\s\-]+/g, "").replace(/\s+/g, "-") || "lesson";
  return base.slice(0, 48);
}

/**
 * Free export: HTML Word / LibreOffice can open (no paid SDK).
 * Uses the well-known HTML-as-.doc pattern Microsoft Word accepts.
 */
export function downloadLessonAsWord(handout: LessonHandout, words: LessonHandoutWord[]) {
  const rows = words
    .map((w, i) => {
      const img = w.image
        ? `<td style="padding:8px 10px;border-bottom:1px solid #ddd;width:56px;"><img src="${escapeHtml(w.image)}" width="48" height="48" style="object-fit:contain;border-radius:6px;" /></td>`
        : `<td style="padding:8px 10px;border-bottom:1px solid #ddd;width:56px;"></td>`;
      return `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;width:2.5em;color:#666;">${i + 1}</td>
          ${img}
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;font-weight:600;">${escapeHtml(w.french)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${escapeHtml(w.english)}</td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(handout.title || "Lesson")}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; }
  h1 { font-size: 22pt; margin: 0 0 6pt; }
  .meta { color: #555; font-size: 11pt; margin-bottom: 18pt; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #333; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.06em; color: #555; }
</style>
</head>
<body>
  <h1>${escapeHtml(handout.title || "Lesson")}</h1>
  <p class="meta">${words.length} words · VocabLab</p>
  <table>
    <thead><tr><th>#</th><th></th><th>French</th><th>English</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  downloadBlob(
    `${safeFilename(handout.title)}.doc`,
    new Blob([html], { type: "application/msword" }),
  );
}

/** Free PDF path: open the system print dialog (Save as PDF / Print). */
export function printLessonHandout() {
  window.print();
}
