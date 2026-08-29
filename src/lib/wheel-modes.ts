/**
 * Wheel of Names game modes.
 *
 * One game, several modes. `basic` (Standard) is the original classroom loop.
 * `time` (Time bank) is Wheel of Time play — bank/buffer/eliminate on the board.
 */
export type WheelGameModeId = "basic" | "time";

export type WheelGameModeDef = {
  id: WheelGameModeId;
  label: string;
  blurb: string;
  /** When false, mode can appear on the board but play is not ready yet. */
  playable: boolean;
};

export const WHEEL_GAME_MODES: readonly WheelGameModeDef[] = [
  {
    id: "basic",
    label: "Standard",
    blurb:
      "The original mode. Spin the wheel, ask the word, score the answer. Teams optional.",
    playable: true,
  },
  {
    id: "time",
    label: "Time bank",
    blurb:
      "Each side starts with a time bank. Got it spends time from the bank; miss or timeout eliminates. Last one standing wins.",
    playable: true,
  },
] as const;

export const DEFAULT_WHEEL_GAME_MODE: WheelGameModeId = "basic";

export function wheelGameModeDef(id: WheelGameModeId | string | undefined): WheelGameModeDef {
  const found = WHEEL_GAME_MODES.find((m) => m.id === id);
  return found ?? WHEEL_GAME_MODES[0]!;
}

export function normaliseWheelGameMode(raw: unknown): WheelGameModeId {
  if (raw === "time" || raw === "time-bank" || raw === "wheel-of-time") return "time";
  if (raw === "basic" || raw === "standard") return "basic";
  return DEFAULT_WHEEL_GAME_MODE;
}

export function isWheelGameModeId(raw: unknown): raw is WheelGameModeId {
  return raw === "basic" || raw === "time";
}

export function describeWheelGameMode(
  modeId: WheelGameModeId,
  opts: {
    winMode: "score" | "time";
    scoreToWin: number;
    secondsPerTeam: number;
    askDirection: "french" | "english" | "random";
  },
) {
  const mode = wheelGameModeDef(modeId).label;
  const ask =
    opts.askDirection === "french"
      ? "Fr→En"
      : opts.askDirection === "english"
        ? "En→Fr"
        : "Mix";
  if (modeId === "basic") {
    return `${mode} · first to ${opts.scoreToWin} · ${ask}`;
  }
  if (modeId === "time") {
    return `${mode} · ${opts.secondsPerTeam}s bank · ${ask}`;
  }
  return mode;
}
