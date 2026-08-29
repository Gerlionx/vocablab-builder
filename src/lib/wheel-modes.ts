/**
 * Wheel game modes.
 *
 * `basic` is the Standard classroom loop (kept as id for saved lessons):
 * spin → land on a name → ask a word → mark correct/miss.
 * Future modes branch from this registry — add a new id instead of folding into Standard.
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
    label: "Standard",
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
  if (raw === "basic" || raw === "standard") return "basic";
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
    return `${mode} · first to ${opts.scoreToWin} · ${ask}`;
  }
  return mode;
}
