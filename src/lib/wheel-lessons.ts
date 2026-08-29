import {
  DEFAULT_WHEEL_SETTINGS,
  type AskDirection,
  type WinMode,
  type WheelSettings,
} from "./game-settings.ts";
import {
  DEFAULT_WHEEL_GAME_MODE,
  describeWheelGameMode,
  normaliseWheelGameMode,
  type WheelGameModeId,
} from "./wheel-modes.ts";

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
  /** Word ids kept out of this lesson (still in the bank). */
  excludedWordIds: string[];
  /** Game mode for this lesson. Basic is the original spin → ask → score loop. */
  gameMode: WheelGameModeId;
  askDirection: AskDirection;
  /** Basic-mode win rule (score race or timed banks). */
  winMode: WinMode;
  scoreToWin: number;
  pointsCorrect: number;
  pointsRevealed: number;
  pointsSkip: number;
  secondsPerTeam: number;
  bufferSeconds: number;
  skipPenaltySeconds: number;
};

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
}

export function isLessonUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export function tidyLessonTitle(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
}

export function suggestLessonTitle(years: string[], topics: string[]) {
  return abbreviateLessonTitle({ years, terms: [], topics, difficulties: [] });
}

/** Compact lesson name from filter selection — short but readable on the board. */
export function abbreviateLessonTitle(opts: {
  years: string[];
  terms: string[];
  topics: string[];
  difficulties: string[];
}) {
  if (
    !opts.years.length &&
    !opts.terms.length &&
    !opts.topics.length &&
    !opts.difficulties.length
  ) {
    return tidyLessonTitle("New lesson");
  }
  const yearBit = opts.years.length
    ? opts.years.map(abbrevYear).join("+")
    : "AllY";
  const termBit = opts.terms.length
    ? opts.terms.map((t) => t.replace(/^Term\s+/i, "T")).join("+")
    : "AllT";
  const topicBit =
    opts.topics.length === 0
      ? "All topics"
      : opts.topics.length === 1
        ? abbrevTopic(opts.topics[0]!)
        : `${opts.topics.length} topics`;
  const levelBit = opts.difficulties.length
    ? ` · ${opts.difficulties.map((d) => d.slice(0, 1)).join("")}`
    : "";
  return tidyLessonTitle(`${yearBit} · ${termBit} · ${topicBit}${levelBit}`);
}

function abbrevYear(year: string) {
  if (year === "Year 7") return "Y7";
  if (year === "Year 8") return "Y8";
  if (year === "Year 9 Mixed Ability") return "Y9MA";
  if (year === "Year 9 More Able") return "Y9More";
  return year.replace(/^Year\s+/i, "Y");
}

function abbrevTopic(topic: string) {
  if (topic.length <= 18) return topic;
  return `${topic.slice(0, 16).trimEnd()}…`;
}

function asList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const out = value
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
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
    winMode: "score",
    scoreToWin: lesson.scoreToWin,
    pointsCorrect: lesson.pointsCorrect,
    pointsRevealed: lesson.pointsRevealed,
    pointsSkip: lesson.pointsSkip,
    secondsPerTeam: lesson.secondsPerTeam,
    bufferSeconds: lesson.bufferSeconds ?? DEFAULT_WHEEL_SETTINGS.bufferSeconds,
    skipPenaltySeconds:
      lesson.skipPenaltySeconds ?? DEFAULT_WHEEL_SETTINGS.skipPenaltySeconds,
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

export function blankLessonDraft(
  defaults: WheelSettings = DEFAULT_WHEEL_SETTINGS,
): Omit<WheelLesson, "id" | "savedAt"> {
  return {
    title: "",
    years: [],
    terms: [],
    topics: [],
    difficulties: [],
    excludedWordIds: [],
    gameMode: defaults.gameMode ?? DEFAULT_WHEEL_GAME_MODE,
    askDirection: defaults.askDirection,
    winMode: defaults.winMode,
    scoreToWin: defaults.scoreToWin,
    pointsCorrect: defaults.pointsCorrect,
    pointsRevealed: defaults.pointsRevealed,
    pointsSkip: defaults.pointsSkip,
    secondsPerTeam: defaults.secondsPerTeam,
    bufferSeconds: defaults.bufferSeconds,
    skipPenaltySeconds: defaults.skipPenaltySeconds,
  };
}

function defaultPointsRevealed(pointsCorrect: number): number {
  return Math.max(0, Math.min(pointsCorrect, Math.floor(pointsCorrect / 2) || 1));
}

export function upsertWheelLesson(
  input: Omit<WheelLesson, "id" | "savedAt"> & { id?: string },
): WheelLesson {
  const title = tidyLessonTitle(input.title) || suggestLessonTitle(input.years, input.topics);
  const list = listWheelLessons();
  const byId = input.id ? list.find((s) => s.id === input.id) : undefined;
  // Only merge by title when creating a new lesson (no id); never remap an explicit id.
  const byTitle = input.id
    ? undefined
    : list.find((s) => s.title.toLowerCase() === title.toLowerCase());
  const existing = byId ?? byTitle;
  const saved: WheelLesson = {
    id: existing?.id ?? (input.id && isLessonUuid(input.id) ? input.id : newId()),
    title,
    savedAt: Date.now(),
    years: asList(input.years, ["Year 7"]),
    terms: asList(input.terms, []),
    topics: asList(input.topics, []),
    difficulties: asList(input.difficulties, []),
    excludedWordIds: Array.isArray(input.excludedWordIds)
      ? [...new Set(input.excludedWordIds.map(String).filter(Boolean))]
      : [],
    gameMode: normaliseWheelGameMode(input.gameMode),
    askDirection:
      input.askDirection === "french" || input.askDirection === "english"
        ? input.askDirection
        : "random",
    winMode: "score",
    scoreToWin: clamp(Number(input.scoreToWin) || DEFAULT_WHEEL_SETTINGS.scoreToWin, 5, 200),
    pointsCorrect: clamp(
      Number(input.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect,
      1,
      20,
    ),
    pointsRevealed: clamp(
      typeof input.pointsRevealed === "number"
        ? input.pointsRevealed
        : defaultPointsRevealed(
            Number(input.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect,
          ),
      0,
      20,
    ),
    pointsSkip: clamp(
      typeof input.pointsSkip === "number" ? input.pointsSkip : DEFAULT_WHEEL_SETTINGS.pointsSkip,
      0,
      20,
    ),
    secondsPerTeam: clamp(
      Number(input.secondsPerTeam) || DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
      15,
      600,
    ),
    bufferSeconds: clamp(
      Number(input.bufferSeconds) || DEFAULT_WHEEL_SETTINGS.bufferSeconds,
      1,
      120,
    ),
    skipPenaltySeconds: clamp(
      typeof input.skipPenaltySeconds === "number"
        ? input.skipPenaltySeconds
        : DEFAULT_WHEEL_SETTINGS.skipPenaltySeconds,
      0,
      120,
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

/** Replace the local lesson cache with the server list (keeps offline fallback empty if remote is empty). */
export function replaceWheelLessonsCache(lessons: WheelLesson[]) {
  if (typeof window === "undefined") return;
  const normalised = lessons
    .map((lesson) => normaliseLesson(lesson))
    .filter((s): s is WheelLesson => s !== null)
    .sort((a, b) => b.savedAt - a.savedAt);
  writeList(normalised);
  const last = lastWheelLessonId();
  if (last && !normalised.some((s) => s.id === last)) {
    rememberWheelLessonId(normalised[0]?.id ?? null);
  }
}

export function writeWheelLessonCache(lesson: WheelLesson) {
  if (typeof window === "undefined") return;
  const list = listWheelLessons();
  writeList([lesson, ...list.filter((s) => s.id !== lesson.id)].slice(0, MAX_SAVED));
  rememberWheelLessonId(lesson.id);
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
    excludedWordIds: Array.isArray(s.excludedWordIds)
      ? [...new Set(s.excludedWordIds.map(String).filter(Boolean))]
      : [],
    gameMode: normaliseWheelGameMode(s.gameMode),
    askDirection,
    winMode: "score",
    scoreToWin: clamp(Number(s.scoreToWin) || DEFAULT_WHEEL_SETTINGS.scoreToWin, 5, 200),
    pointsCorrect: clamp(Number(s.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect, 1, 20),
    pointsRevealed: clamp(
      typeof s.pointsRevealed === "number"
        ? s.pointsRevealed
        : defaultPointsRevealed(Number(s.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect),
      0,
      20,
    ),
    pointsSkip: clamp(
      typeof s.pointsSkip === "number" ? s.pointsSkip : DEFAULT_WHEEL_SETTINGS.pointsSkip,
      0,
      20,
    ),
    secondsPerTeam: clamp(
      Number(s.secondsPerTeam) || DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
      15,
      600,
    ),
    bufferSeconds: clamp(
      Number(s.bufferSeconds) || DEFAULT_WHEEL_SETTINGS.bufferSeconds,
      1,
      120,
    ),
    skipPenaltySeconds: clamp(
      typeof s.skipPenaltySeconds === "number"
        ? s.skipPenaltySeconds
        : DEFAULT_WHEEL_SETTINGS.skipPenaltySeconds,
      0,
      120,
    ),
  };
}
