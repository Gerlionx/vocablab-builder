import {
  DEFAULT_WHEEL_SETTINGS,
  type AskDirection,
  type WinMode,
  type WheelSettings,
} from "@/lib/game-settings";
import {
  DEFAULT_WHEEL_GAME_MODE,
  describeWheelGameMode,
  normaliseWheelGameMode,
  type WheelGameModeId,
} from "@/lib/wheel-modes";

/**
 * Saved Wheel lessons — vocab + play mode only.
 * Pupil names are never stored (GDPR); they are pasted in class.
 */
const LIST_KEY = "vocablab.wheelLessons.v1";
const LEGACY_KEYS = [
  "vocablab.wheelSetups.v3",
  "vocablab.wheelSetups.v2",
  "vocablab.wheelSetups.v1",
] as const;
const LAST_KEY = "vocablab.wheelLessons.last";
const MAX_SAVED = 40;
const TITLE_MAX = 48;

export type WheelLesson = {
  id: string;
  title: string;
  savedAt: number;
  years: string[];
  terms: string[];
  topics: string[];
  difficulties: string[];
  /** Game mode for this lesson. Basic is the original spin → ask → score loop. */
  gameMode: WheelGameModeId;
  askDirection: AskDirection;
  /** Basic-mode win rule (score race or timed banks). */
  winMode: WinMode;
  scoreToWin: number;
  pointsCorrect: number;
  secondsPerTeam: number;
};

function newId() {
  return `L_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function tidyLessonTitle(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
}

export function suggestLessonTitle(years: string[], topics: string[]) {
  const yearBit = years.length ? years.join(" + ") : "All years";
  if (topics.length === 1) return `${yearBit} · ${topics[0]}`;
  if (topics.length > 1) return `${yearBit} · ${topics.length} topics`;
  return yearBit;
}

function asList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const out = value.map(String).map((s) => s.trim()).filter(Boolean);
    return out.length ? [...new Set(out)] : [...fallback];
  }
  if (typeof value === "string" && value.trim() && value !== "All") return [value.trim()];
  return [...fallback];
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function lessonToSettings(lesson: WheelLesson): WheelSettings {
  return {
    gameMode: lesson.gameMode,
    winMode: lesson.winMode,
    scoreToWin: lesson.scoreToWin,
    pointsCorrect: lesson.pointsCorrect,
    secondsPerTeam: lesson.secondsPerTeam,
    askDirection: lesson.askDirection,
  };
}

export function describeLesson(
  lesson: Pick<
    WheelLesson,
    "gameMode" | "winMode" | "scoreToWin" | "secondsPerTeam" | "askDirection"
  >,
) {
  return describeWheelGameMode(lesson.gameMode ?? DEFAULT_WHEEL_GAME_MODE, lesson);
}

function scrubLegacy() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

function migrateLegacy(): WheelLesson[] {
  if (typeof window === "undefined") return [];
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      return parsed.map(normaliseLesson).filter((s): s is WheelLesson => s !== null);
    } catch {
      /* next */
    }
  }
  return [];
}

export function listWheelLessons(): WheelLesson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      const list = parsed.map(normaliseLesson).filter((s): s is WheelLesson => s !== null);
      writeList(list);
      scrubLegacy();
      return list;
    }
    const legacy = migrateLegacy();
    scrubLegacy();
    if (legacy.length) writeList(legacy);
    return legacy;
  } catch {
    return [];
  }
}

function writeList(list: WheelLesson[]) {
  localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
}

export function lastWheelLessonId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_KEY);
}

export function rememberWheelLessonId(id: string | null) {
  if (typeof window === "undefined") return;
  if (!id) localStorage.removeItem(LAST_KEY);
  else localStorage.setItem(LAST_KEY, id);
}

export function lastWheelLesson(): WheelLesson | null {
  const id = lastWheelLessonId();
  if (!id) return null;
  return listWheelLessons().find((s) => s.id === id) ?? null;
}

export function blankLessonDraft(defaults: WheelSettings = DEFAULT_WHEEL_SETTINGS): Omit<
  WheelLesson,
  "id" | "savedAt"
> {
  return {
    title: "",
    years: ["Year 7"],
    terms: ["Term 1"],
    topics: [],
    difficulties: [],
    gameMode: defaults.gameMode ?? DEFAULT_WHEEL_GAME_MODE,
    askDirection: defaults.askDirection,
    winMode: defaults.winMode,
    scoreToWin: defaults.scoreToWin,
    pointsCorrect: defaults.pointsCorrect,
    secondsPerTeam: defaults.secondsPerTeam,
  };
}

export function upsertWheelLesson(
  input: Omit<WheelLesson, "id" | "savedAt"> & { id?: string },
): WheelLesson {
  const title =
    tidyLessonTitle(input.title) || suggestLessonTitle(input.years, input.topics);
  const list = listWheelLessons();
  const byId = input.id ? list.find((s) => s.id === input.id) : undefined;
  const byTitle = list.find((s) => s.title.toLowerCase() === title.toLowerCase());
  const existing = byId ?? byTitle;
  const saved: WheelLesson = {
    id: existing?.id ?? newId(),
    title,
    savedAt: Date.now(),
    years: asList(input.years, ["Year 7"]),
    terms: asList(input.terms, []),
    topics: asList(input.topics, []),
    difficulties: asList(input.difficulties, []),
    gameMode: normaliseWheelGameMode(input.gameMode),
    askDirection:
      input.askDirection === "french" || input.askDirection === "english"
        ? input.askDirection
        : "random",
    winMode: input.winMode === "time" ? "time" : "score",
    scoreToWin: clamp(Number(input.scoreToWin) || DEFAULT_WHEEL_SETTINGS.scoreToWin, 5, 200),
    pointsCorrect: clamp(
      Number(input.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect,
      1,
      20,
    ),
    secondsPerTeam: clamp(
      Number(input.secondsPerTeam) || DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
      15,
      300,
    ),
  };
  writeList([saved, ...list.filter((s) => s.id !== saved.id)].slice(0, MAX_SAVED));
  rememberWheelLessonId(saved.id);
  return saved;
}

export function deleteWheelLesson(id: string) {
  const next = listWheelLessons().filter((s) => s.id !== id);
  writeList(next);
  if (lastWheelLessonId() === id) rememberWheelLessonId(next[0]?.id ?? null);
}

function normaliseLesson(raw: unknown): WheelLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<WheelLesson> & {
    year?: string;
    term?: string;
    topic?: string;
    difficulty?: string;
  };
  if (typeof s.id !== "string" || typeof s.title !== "string") return null;
  const askDirection: AskDirection =
    s.askDirection === "french" || s.askDirection === "english" ? s.askDirection : "random";
  return {
    id: s.id,
    title: tidyLessonTitle(s.title) || "Lesson",
    savedAt: typeof s.savedAt === "number" ? s.savedAt : Date.now(),
    years: asList(s.years ?? s.year, ["Year 7"]),
    terms: asList(s.terms ?? s.term, []),
    topics: asList(s.topics ?? s.topic, []),
    difficulties: asList(s.difficulties ?? s.difficulty, []),
    gameMode: normaliseWheelGameMode(s.gameMode),
    askDirection,
    winMode: s.winMode === "time" ? "time" : "score",
    scoreToWin: clamp(Number(s.scoreToWin) || DEFAULT_WHEEL_SETTINGS.scoreToWin, 5, 200),
    pointsCorrect: clamp(
      Number(s.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect,
      1,
      20,
    ),
    secondsPerTeam: clamp(
      Number(s.secondsPerTeam) || DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
      15,
      300,
    ),
  };
}
