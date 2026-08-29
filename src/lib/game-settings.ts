import {
  DEFAULT_WHEEL_GAME_MODE,
  isWheelGameModeId,
  normaliseWheelGameMode,
  wheelGameModeDef,
  type WheelGameModeId,
} from "./wheel-modes.ts";

const KEY = "vocablab.gameSettings.wheel";
const BOARD_MODES_KEY = "vocablab.wheel.boardModes";

export type WinMode = "score" | "time";
export type AskDirection = "french" | "english" | "random";

/** Runtime settings applied when a lesson (or defaults) starts a match. */
export type WheelSettings = {
  /** Which game mode drives the match. Standard (`basic` id) is the original loop. */
  gameMode: WheelGameModeId;
  winMode: WinMode;
  scoreToWin: number;
  /** Points for a correct answer without using reveal hints. */
  pointsCorrect: number;
  /** Points for a correct answer after one or more reveal hints. */
  pointsRevealed: number;
  /** Points awarded on a skipped turn (0 = no penalty). */
  pointsSkip: number;
  /** Starting time bank (seconds) for Time bank mode; legacy timed matches. */
  secondsPerTeam: number;
  /** Time bank: when remaining bank is below this, next rounds use this clock. */
  bufferSeconds: number;
  /** Time bank: fixed seconds removed on Skip (0 = no Skip penalty). */
  skipPenaltySeconds: number;
  askDirection: AskDirection;
};

export const DEFAULT_WHEEL_SETTINGS: WheelSettings = {
  gameMode: DEFAULT_WHEEL_GAME_MODE,
  winMode: "score",
  scoreToWin: 20,
  pointsCorrect: 3,
  pointsRevealed: 1,
  pointsSkip: 0,
  secondsPerTeam: 90,
  bufferSeconds: 10,
  skipPenaltySeconds: 0,
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
    const pointsCorrect = clamp(
      Number(parsed.pointsCorrect) || DEFAULT_WHEEL_SETTINGS.pointsCorrect,
      1,
      20,
    );
    return {
      gameMode: normaliseWheelGameMode(parsed.gameMode),
      winMode: "score",
      scoreToWin: clamp(Number(parsed.scoreToWin) || DEFAULT_WHEEL_SETTINGS.scoreToWin, 5, 200),
      pointsCorrect,
      pointsRevealed: clamp(
        typeof parsed.pointsRevealed === "number"
          ? parsed.pointsRevealed
          : Math.max(0, Math.min(pointsCorrect, Math.floor(pointsCorrect / 2) || 1)),
        0,
        20,
      ),
      pointsSkip: clamp(
        typeof parsed.pointsSkip === "number"
          ? parsed.pointsSkip
          : DEFAULT_WHEEL_SETTINGS.pointsSkip,
        0,
        20,
      ),
      secondsPerTeam: clamp(
        Number(parsed.secondsPerTeam) || secondsFromLegacy || DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
        15,
        600,
      ),
      bufferSeconds: clamp(
        Number(parsed.bufferSeconds) || DEFAULT_WHEEL_SETTINGS.bufferSeconds,
        1,
        120,
      ),
      skipPenaltySeconds: clamp(
        typeof parsed.skipPenaltySeconds === "number"
          ? parsed.skipPenaltySeconds
          : DEFAULT_WHEEL_SETTINGS.skipPenaltySeconds,
        0,
        120,
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

/** Modes the teacher activated for the Activity board (at least Standard). */
export type BoardModesState = {
  enabled: WheelGameModeId[];
  /** Green chip on Activity / Create cards. */
  active: WheelGameModeId;
};

export const DEFAULT_BOARD_MODES: BoardModesState = {
  enabled: [DEFAULT_WHEEL_GAME_MODE],
  active: DEFAULT_WHEEL_GAME_MODE,
};

export function loadBoardModes(): BoardModesState {
  if (typeof window === "undefined") return DEFAULT_BOARD_MODES;
  try {
    const raw = localStorage.getItem(BOARD_MODES_KEY);
    if (!raw) {
      const settings = loadWheelSettings();
      return { enabled: [settings.gameMode], active: settings.gameMode };
    }
    const parsed = JSON.parse(raw) as Partial<BoardModesState>;
    const enabled = Array.isArray(parsed.enabled)
      ? parsed.enabled.filter(isWheelGameModeId)
      : [];
    const unique = [...new Set(enabled)];
    if (unique.length === 0) unique.push(DEFAULT_WHEEL_GAME_MODE);
    const active = isWheelGameModeId(parsed.active) ? parsed.active : unique[0]!;
    return {
      enabled: unique,
      active: unique.includes(active) ? active : unique[0]!,
    };
  } catch {
    return DEFAULT_BOARD_MODES;
  }
}

export function saveBoardModes(next: BoardModesState) {
  const enabled = [...new Set(next.enabled.filter(isWheelGameModeId))];
  if (enabled.length === 0) enabled.push(DEFAULT_WHEEL_GAME_MODE);
  const active = enabled.includes(next.active) ? next.active : enabled[0]!;
  localStorage.setItem(BOARD_MODES_KEY, JSON.stringify({ enabled, active }));
  // Keep match settings in sync with the board's active mode.
  const settings = loadWheelSettings();
  if (settings.gameMode !== active) {
    saveWheelSettings({ ...settings, gameMode: active });
  }
}

/** Activate a mode onto the Activity board and make it the green active chip. */
export function activateBoardMode(id: WheelGameModeId): BoardModesState {
  const current = loadBoardModes();
  const enabled = current.enabled.includes(id) ? current.enabled : [...current.enabled, id];
  const next = { enabled, active: id };
  saveBoardModes(next);
  return next;
}

/** Remove a mode from the Activity board (keeps at least one). */
export function deactivateBoardMode(id: WheelGameModeId): BoardModesState {
  const current = loadBoardModes();
  if (current.enabled.length <= 1) return current;
  const enabled = current.enabled.filter((m) => m !== id);
  if (enabled.length === 0) return current;
  const active =
    current.active === id ? (enabled[0] ?? DEFAULT_WHEEL_GAME_MODE) : current.active;
  const next = { enabled, active };
  saveBoardModes(next);
  return next;
}

const MODE_SETTINGS_KEY = "vocablab.wheel.modeSettings";

export type StandardModeSettings = {
  askDirection: AskDirection;
  scoreToWin: number;
  pointsCorrect: number;
  pointsRevealed: number;
  pointsSkip: number;
};

export type TimeModeSettings = {
  askDirection: AskDirection;
  /** Starting seconds in each player/team time bank. */
  secondsPerTeam: number;
  /** Round clock floor after escaping with a low bank. */
  bufferSeconds: number;
  /** Seconds removed from the bank on Skip (0 = free Skip). */
  skipPenaltySeconds: number;
};

export type WheelModeSettingsStore = {
  basic: StandardModeSettings;
  time: TimeModeSettings;
};

export const DEFAULT_MODE_SETTINGS: WheelModeSettingsStore = {
  basic: {
    askDirection: DEFAULT_WHEEL_SETTINGS.askDirection,
    scoreToWin: DEFAULT_WHEEL_SETTINGS.scoreToWin,
    pointsCorrect: DEFAULT_WHEEL_SETTINGS.pointsCorrect,
    pointsRevealed: DEFAULT_WHEEL_SETTINGS.pointsRevealed,
    pointsSkip: DEFAULT_WHEEL_SETTINGS.pointsSkip,
  },
  time: {
    askDirection: DEFAULT_WHEEL_SETTINGS.askDirection,
    secondsPerTeam: DEFAULT_WHEEL_SETTINGS.secondsPerTeam,
    bufferSeconds: DEFAULT_WHEEL_SETTINGS.bufferSeconds,
    skipPenaltySeconds: DEFAULT_WHEEL_SETTINGS.skipPenaltySeconds,
  },
};

export function loadModeSettings(): WheelModeSettingsStore {
  if (typeof window === "undefined") return DEFAULT_MODE_SETTINGS;
  try {
    const raw = localStorage.getItem(MODE_SETTINGS_KEY);
    if (!raw) {
      const s = loadWheelSettings();
      return {
        basic: {
          askDirection: s.askDirection,
          scoreToWin: s.scoreToWin,
          pointsCorrect: s.pointsCorrect,
          pointsRevealed: s.pointsRevealed,
          pointsSkip: s.pointsSkip,
        },
        time: {
          askDirection: s.askDirection,
          secondsPerTeam: s.secondsPerTeam,
          bufferSeconds: s.bufferSeconds,
          skipPenaltySeconds: s.skipPenaltySeconds,
        },
      };
    }
    const parsed = JSON.parse(raw) as Partial<WheelModeSettingsStore>;
    return {
      basic: {
        askDirection:
          parsed.basic?.askDirection === "french" || parsed.basic?.askDirection === "english"
            ? parsed.basic.askDirection
            : DEFAULT_MODE_SETTINGS.basic.askDirection,
        scoreToWin: clamp(
          Number(parsed.basic?.scoreToWin) || DEFAULT_MODE_SETTINGS.basic.scoreToWin,
          5,
          200,
        ),
        pointsCorrect: clamp(
          Number(parsed.basic?.pointsCorrect) || DEFAULT_MODE_SETTINGS.basic.pointsCorrect,
          1,
          20,
        ),
        pointsRevealed: clamp(
          typeof parsed.basic?.pointsRevealed === "number"
            ? parsed.basic.pointsRevealed
            : DEFAULT_MODE_SETTINGS.basic.pointsRevealed,
          0,
          20,
        ),
        pointsSkip: clamp(
          typeof parsed.basic?.pointsSkip === "number"
            ? parsed.basic.pointsSkip
            : DEFAULT_MODE_SETTINGS.basic.pointsSkip,
          0,
          20,
        ),
      },
      time: {
        askDirection:
          parsed.time?.askDirection === "french" || parsed.time?.askDirection === "english"
            ? parsed.time.askDirection
            : DEFAULT_MODE_SETTINGS.time.askDirection,
        secondsPerTeam: clamp(
          Number(parsed.time?.secondsPerTeam) || DEFAULT_MODE_SETTINGS.time.secondsPerTeam,
          15,
          600,
        ),
        bufferSeconds: clamp(
          Number(parsed.time?.bufferSeconds) || DEFAULT_MODE_SETTINGS.time.bufferSeconds,
          1,
          120,
        ),
        skipPenaltySeconds: clamp(
          typeof parsed.time?.skipPenaltySeconds === "number"
            ? parsed.time.skipPenaltySeconds
            : DEFAULT_MODE_SETTINGS.time.skipPenaltySeconds,
          0,
          120,
        ),
      },
    };
  } catch {
    return DEFAULT_MODE_SETTINGS;
  }
}

export function saveModeSettings(next: WheelModeSettingsStore) {
  localStorage.setItem(MODE_SETTINGS_KEY, JSON.stringify(next));
}

/** Merge draft-facing fields from a mode's saved settings. */
export function applyModeSettingsToDraft<T extends {
  gameMode: WheelGameModeId;
  askDirection: AskDirection;
  scoreToWin: number;
  pointsCorrect: number;
  pointsRevealed: number;
  pointsSkip: number;
  secondsPerTeam: number;
  bufferSeconds: number;
  skipPenaltySeconds: number;
}>(draft: T, modeId: WheelGameModeId, store: WheelModeSettingsStore): T {
  if (modeId === "time") {
    return {
      ...draft,
      gameMode: "time",
      askDirection: store.time.askDirection,
      secondsPerTeam: store.time.secondsPerTeam,
      bufferSeconds: store.time.bufferSeconds,
      skipPenaltySeconds: store.time.skipPenaltySeconds,
    };
  }
  return {
    ...draft,
    gameMode: "basic",
    askDirection: store.basic.askDirection,
    scoreToWin: store.basic.scoreToWin,
    pointsCorrect: store.basic.pointsCorrect,
    pointsRevealed: store.basic.pointsRevealed,
    pointsSkip: store.basic.pointsSkip,
  };
}

const FUSE_KEY = "vocablab.wheel.fuse";

export type FuseConfig = {
  /** When false, no detonating wire and no fuse timeout. */
  enabled: boolean;
  seconds: number;
};

export const DEFAULT_FUSE: FuseConfig = { enabled: true, seconds: 30 };

export function loadFuseConfig(): FuseConfig {
  if (typeof window === "undefined") return DEFAULT_FUSE;
  try {
    const raw = localStorage.getItem(FUSE_KEY);
    if (!raw) return DEFAULT_FUSE;
    const parsed = JSON.parse(raw) as Partial<FuseConfig>;
    const seconds = Number(parsed.seconds);
    return {
      enabled: parsed.enabled !== false,
      seconds: Number.isFinite(seconds) ? clamp(seconds, 1, 600) : DEFAULT_FUSE.seconds,
    };
  } catch {
    return DEFAULT_FUSE;
  }
}

export function saveFuseConfig(next: FuseConfig) {
  localStorage.setItem(
    FUSE_KEY,
    JSON.stringify({
      enabled: Boolean(next.enabled),
      seconds: clamp(Number(next.seconds) || DEFAULT_FUSE.seconds, 1, 600),
    }),
  );
}

export function describeSettings(s: WheelSettings) {
  const pts = s.pointsCorrect === 1 ? "1 pt direct" : `${s.pointsCorrect} pts direct`;
  const reveal = s.pointsRevealed === 1 ? "1 pt hinted" : `${s.pointsRevealed} pts hinted`;
  const ask =
    s.askDirection === "french"
      ? "French → English"
      : s.askDirection === "english"
        ? "English → French"
        : "mixed";
  const mode = wheelGameModeDef(s.gameMode).label;
  return `${mode} · First to ${s.scoreToWin} · ${pts} · ${reveal} · ${ask}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}
