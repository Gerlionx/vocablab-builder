import { DEMO_NAMES, USE_DEMO_NAMES } from "@/lib/vocab-data";
import { splitTeams } from "@/lib/team-colors";
import { isWheelGameModeId, type WheelGameModeId } from "@/lib/wheel-modes";

/** Pupil names live only in the teacher login session (sessionStorage). Cleared on log out / idle. */
export const TEACHER_IDLE_MS = 15 * 60 * 1000;

const AUTH_KEY = "vocablab.teacher.auth";
const NAMES_KEY = "vocablab.teacher.names";
const ROSTER_KEY = "vocablab.teacher.roster";
const ACTIVITY_KEY = "vocablab.teacher.activity";
const WHEEL_MATCH_KEY = "vocablab.teacher.wheelMatch";

const PUBLIC_PATHS = new Set(["/", "/set-password"]);

/** In-memory activity so idle checks stay accurate without hammering sessionStorage. */
let memoryActivityMs = 0;

function blankRoster(): string[][] {
  return [[], [], []];
}

function padRoster(parts: string[][]): string[][] {
  return [parts[0] ?? [], parts[1] ?? [], parts[2] ?? []];
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export function touchTeacherActivity() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(AUTH_KEY) !== "1") return;
  const now = Date.now();
  memoryActivityMs = now;
  const raw = sessionStorage.getItem(ACTIVITY_KEY);
  const last = raw ? Number(raw) : 0;
  if (Number.isFinite(last) && now - last < 5_000) return;
  sessionStorage.setItem(ACTIVITY_KEY, String(now));
}

export function isTeacherIdleExpired() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(AUTH_KEY) !== "1") return false;
  const raw = sessionStorage.getItem(ACTIVITY_KEY);
  const stored = raw ? Number(raw) : 0;
  const last = Math.max(memoryActivityMs, Number.isFinite(stored) ? stored : 0);
  if (last <= 0) return true;
  return Date.now() - last >= TEACHER_IDLE_MS;
}

export function isTeacherSessionActive() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(AUTH_KEY) !== "1") return false;
  if (isTeacherIdleExpired()) {
    endTeacherSession();
    return false;
  }
  return true;
}

/** Start a teacher login. Seeds demo names once per session while testing. */
export function beginTeacherSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_KEY, "1");
  touchTeacherActivity();
  if (USE_DEMO_NAMES && sessionStorage.getItem(NAMES_KEY) == null) {
    writeSessionNames(DEMO_NAMES.join("\n"));
    writeSessionRoster(padRoster(splitTeams(DEMO_NAMES, 2)));
  }
}

/**
 * End the teacher login and wipe every pupil-identifying field for this browser tab.
 * Durable game settings (filters, scoring) stay in localStorage — they are not pupil data.
 */
export function endTeacherSession() {
  if (typeof window === "undefined") return;
  memoryActivityMs = 0;
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(NAMES_KEY);
  sessionStorage.removeItem(ROSTER_KEY);
  sessionStorage.removeItem(ACTIVITY_KEY);
  sessionStorage.removeItem(WHEEL_MATCH_KEY);
}

export function readSessionNames(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(NAMES_KEY) ?? "";
}

export function writeSessionNames(text: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NAMES_KEY, text);
  touchTeacherActivity();
}

export function readSessionRoster(): string[][] {
  if (typeof window === "undefined") return blankRoster();
  try {
    const raw = sessionStorage.getItem(ROSTER_KEY);
    if (!raw) return blankRoster();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return blankRoster();
    return padRoster(parsed.map((col) => (Array.isArray(col) ? col.map(String) : [])));
  } catch {
    return blankRoster();
  }
}

export function writeSessionRoster(roster: string[][]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ROSTER_KEY, JSON.stringify(padRoster(roster)));
  touchTeacherActivity();
}

/** Fresh names box for Reset — demo list while testing, empty for real school use. */
export function resetSessionNamesForDesk() {
  if (USE_DEMO_NAMES) {
    writeSessionNames(DEMO_NAMES.join("\n"));
    writeSessionRoster(padRoster(splitTeams(DEMO_NAMES, 2)));
  } else {
    writeSessionNames("");
    writeSessionRoster(blankRoster());
  }
}

/**
 * Live wheel match (scores, turn, teams mode). Survives refresh in this tab;
 * wiped on log out / idle with the rest of the teacher session.
 */
export type WheelMatchSession = {
  v: 1;
  started: boolean;
  /** Which Activity mode this match was started as (basic | time). */
  gameMode?: WheelGameModeId;
  matchTeamsOn: boolean;
  teamsOn: boolean;
  teamCount: 2 | 3;
  turn: number;
  scores: number[];
  playerScores: Record<string, number>;
  playerScoredAt: Record<string, number>;
  teamScoredAt: number[];
  teamSpins: number[];
  playerSpins: Record<string, number>;
  banks: number[];
  /** Time bank: team eliminated flags (index = team id). */
  teamEliminated: boolean[];
  /** Time bank: team is on the buffer-round clock. */
  teamInBuffer: boolean[];
  /** Time bank: per-player remaining bank (solo). */
  playerBanks: Record<string, number>;
  playerEliminated: Record<string, boolean>;
  playerInBuffer: Record<string, boolean>;
  /** Contestant ids in elimination order (team index as string, or player name). */
  eliminationOrder: string[];
  usedWordIds: string[];
  colorIds: string[];
  winner: number | "draw" | null;
  soloPodium: { id: string; score: number; place: number }[] | null;
};

function asScoreMap(value: unknown, allowZero = false): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (allowZero ? n >= 0 : n > 0) out[k] = n;
  }
  return out;
}

function asPodium(
  value: unknown,
): { id: string; score: number; place: number }[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = typeof r["id"] === "string" ? r["id"] : "";
      const score = Number(r["score"]);
      const place = Math.round(Number(r["place"]));
      if (!id || !Number.isFinite(score) || !Number.isFinite(place) || place < 1) return null;
      return { id, score, place };
    })
    .filter((r): r is { id: string; score: number; place: number } => r != null);
  return rows.length ? rows : null;
}

function asNumList(value: unknown, len: number, fallback = 0): number[] {
  const src = Array.isArray(value) ? value.map((n) => Number(n)) : [];
  return Array.from({ length: len }, (_, i) =>
    Number.isFinite(src[i]) ? (src[i] as number) : fallback,
  );
}

function asBoolList(value: unknown, len: number, fallback = false): boolean[] {
  const src = Array.isArray(value) ? value : [];
  return Array.from({ length: len }, (_, i) =>
    typeof src[i] === "boolean" ? (src[i] as boolean) : fallback,
  );
}

function asBoolMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export function readWheelMatch(): WheelMatchSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WHEEL_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WheelMatchSession>;
    if (parsed.v !== 1 || typeof parsed.started !== "boolean") return null;
    const teamCount = parsed.teamCount === 3 ? 3 : 2;
    const winner =
      parsed.winner === "draw"
        ? "draw"
        : typeof parsed.winner === "number" && parsed.winner >= 0 && parsed.winner < 3
          ? parsed.winner
          : null;
    return {
      v: 1,
      started: parsed.started,
      ...(isWheelGameModeId(parsed.gameMode) ? { gameMode: parsed.gameMode } : {}),
      matchTeamsOn: Boolean(parsed.matchTeamsOn),
      teamsOn: Boolean(parsed.teamsOn),
      teamCount,
      turn: Math.min(2, Math.max(0, Math.round(Number(parsed.turn) || 0))),
      scores: asNumList(parsed.scores, 3, 0),
      playerScores: asScoreMap(parsed.playerScores),
      playerScoredAt: asScoreMap(parsed.playerScoredAt),
      teamScoredAt: asNumList(parsed.teamScoredAt, 3, 0),
      teamSpins: asNumList(parsed.teamSpins, 3, 0),
      playerSpins: asScoreMap(parsed.playerSpins, true),
      banks: asNumList(parsed.banks, 3, 90),
      teamEliminated: asBoolList(parsed.teamEliminated, 3, false),
      teamInBuffer: asBoolList(parsed.teamInBuffer, 3, false),
      playerBanks: asScoreMap(parsed.playerBanks, true),
      playerEliminated: asBoolMap(parsed.playerEliminated),
      playerInBuffer: asBoolMap(parsed.playerInBuffer),
      eliminationOrder: Array.isArray(parsed.eliminationOrder)
        ? parsed.eliminationOrder.map(String).filter(Boolean)
        : [],
      usedWordIds: Array.isArray(parsed.usedWordIds)
        ? parsed.usedWordIds.map(String).filter(Boolean)
        : [],
      colorIds: Array.isArray(parsed.colorIds)
        ? parsed.colorIds.map(String).filter(Boolean).slice(0, 3)
        : [],
      winner,
      soloPodium: asPodium(parsed.soloPodium),
    };
  } catch {
    return null;
  }
}

export function writeWheelMatch(match: WheelMatchSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WHEEL_MATCH_KEY, JSON.stringify(match));
  touchTeacherActivity();
}

export function clearWheelMatch() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(WHEEL_MATCH_KEY);
}
