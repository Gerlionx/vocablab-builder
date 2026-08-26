import {
  DEFAULT_WHEEL_GAME_MODE,
  normaliseWheelGameMode,
  type WheelGameModeId,
} from "@/lib/wheel-modes";

const KEY = "vocablab.gameSettings.wheel";

export type WinMode = "score" | "time";
export type AskDirection = "french" | "english" | "random";

/** Runtime settings applied when a lesson (or defaults) starts a match. */
export type WheelSettings = {
  /** Which game mode drives the match. Basic is the original loop. */
  gameMode: WheelGameModeId;
  winMode: WinMode;
  scoreToWin: number;
  pointsCorrect: number;
  secondsPerTeam: number;
  askDirection: AskDirection;
};

export const DEFAULT_WHEEL_SETTINGS: WheelSettings = {
  gameMode: DEFAULT_WHEEL_GAME_MODE,
  winMode: "score",
  scoreToWin: 20,
  pointsCorrect: 3,
  secondsPerTeam: 90,
  askDirection: "random",
};

export function loadWheelSettings(): WheelSettings {
  if (typeof window === "undefined") return DEFAULT_WHEEL_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WHEEL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<WheelSettings> & { minutes?: number };
    const secondsFromLegacy =
      typeof parsed.minutes === "number" ? clamp(parsed.minutes * 30, 20, 300) : undefined;
    const askDirection: AskDirection =
      parsed.askDirection === "french" || parsed.askDirection === "english"
        ? parsed.askDirection
        : "random";
    return {
      gameMode: normaliseWheelGameMode(parsed.gameMode),
      winMode: parsed.winMode === "time" ? "time" : "score",
      scoreToWin: clamp(Number(parsed.scoreToWin) || DEFAULT_WHEEL_SETTINGS.scoreToWin, 5, 200),
      pointsCorrect: clamp(
        Number(parsed.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect,
        1,
        20,
      ),
      secondsPerTeam: clamp(
        Number(parsed.secondsPerTeam) || secondsFromLegacy || DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
        15,
        300,
      ),
      askDirection,
    };
  } catch {
    return DEFAULT_WHEEL_SETTINGS;
  }
}

export function saveWheelSettings(next: WheelSettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function describeSettings(s: WheelSettings) {
  const pts = s.pointsCorrect === 1 ? "1 point each" : `${s.pointsCorrect} points each`;
  const ask =
    s.askDirection === "french"
      ? "French → English"
      : s.askDirection === "english"
        ? "English → French"
        : "mixed";
  const mode = s.gameMode === "basic" ? "Basic" : s.gameMode;
  if (s.winMode === "time") {
    return `${mode} · Time · ${s.secondsPerTeam}s per team · ${pts} · ${ask}`;
  }
  return `${mode} · First to ${s.scoreToWin} · ${pts} · ${ask}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}
