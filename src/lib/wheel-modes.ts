/**
 * Wheel game modes.
 *
 * `basic` is the original classroom loop: spin → land on a name → ask a word →
 * mark correct/miss. Future modes branch from this registry — do not fold new
 * play styles into Basic; add a new id instead.
 */
export type WheelGameModeId = "basic";

export type WheelGameModeDef = {
  id: WheelGameModeId;
  label: string;
  blurb: string;
};

export const WHEEL_GAME_MODES: readonly WheelGameModeDef[] = [
  {
    id: "basic",
    label: "Basic",
    blurb:
      "The original mode. Spin the wheel, ask the word, score the answer. Teams optional.",
  },
] as const;

export const DEFAULT_WHEEL_GAME_MODE: WheelGameModeId = "basic";

export function wheelGameModeDef(id: WheelGameModeId | string | undefined): WheelGameModeDef {
  const found = WHEEL_GAME_MODES.find((m) => m.id === id);
  return found ?? WHEEL_GAME_MODES[0]!;
}

export function normaliseWheelGameMode(raw: unknown): WheelGameModeId {
  if (raw === "basic") return "basic";
  return DEFAULT_WHEEL_GAME_MODE;
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
    const rule =
      opts.winMode === "time" ? `${opts.secondsPerTeam}s banks` : `first to ${opts.scoreToWin}`;
    return `${mode} · ${rule} · ${ask}`;
  }
  return mode;
}
