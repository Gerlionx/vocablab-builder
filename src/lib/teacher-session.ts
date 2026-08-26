import { DEMO_NAMES, USE_DEMO_NAMES } from "@/lib/vocab-data";
import { splitTeams } from "@/lib/team-colors";

/** Pupil names live only in the teacher login session (sessionStorage). Cleared on log out / idle. */
export const TEACHER_IDLE_MS = 15 * 60 * 1000;

const AUTH_KEY = "vocablab.teacher.auth";
const NAMES_KEY = "vocablab.teacher.names";
const ROSTER_KEY = "vocablab.teacher.roster";
const ACTIVITY_KEY = "vocablab.teacher.activity";

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
