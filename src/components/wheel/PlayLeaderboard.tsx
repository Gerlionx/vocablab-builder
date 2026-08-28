import type { WheelSettings } from "@/lib/game-settings";
import { formatClock } from "@/lib/wheel-math";
import type { colorById } from "@/lib/team-colors";

type Palette = ReturnType<typeof colorById>;

export function PlayLeaderboard({
  teamsOn,
  teamCount,
  scores,
  playerScores,
  players,
  palettes,
  banks,
  timeMatch,
  turn,
  settings,
  burst,
  plusFly,
  plusValue,
  activePlayer,
}: {
  teamsOn: boolean;
  teamCount: number;
  scores: number[];
  playerScores: Record<string, number>;
  players: { name: string; team: number }[];
  palettes: Palette[];
  banks: number[];
  timeMatch: boolean;
  turn: number;
  settings: WheelSettings;
  burst: number | null;
  plusFly: number | null;
  plusValue: number;
  activePlayer: string | null;
}) {
  const modeLabel = settings.gameMode === "basic" ? "Basic" : settings.gameMode;
  const ruleLabel =
    settings.winMode === "time"
      ? `${modeLabel} · Time`
      : `${modeLabel} · First to ${settings.scoreToWin}`;

  if (teamsOn) {
    return (
      <div className="relative z-30 w-full shrink-0 px-6 pt-3 pb-1">
        <p className="text-center font-kids text-xl font-semibold text-muted-foreground">
          {ruleLabel}
        </p>
        <div className="mt-2 flex items-start justify-center gap-5">
          {palettes.slice(0, teamCount).map((color, i) => (
            <TeamScoreCard
              key={color.id}
              label={color.label}
              score={scores[i] ?? 0}
              fill={color.fill}
              ink={color.ink}
              active={turn === i}
              burst={burst === i}
              plus={plusFly === i ? plusValue : null}
              clock={timeMatch ? (banks[i] ?? 0) : null}
            />
          ))}
        </div>
      </div>
    );
  }

  const ranked = [...players]
    .map((p) => ({ name: p.name, score: playerScores[p.name] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return (
    <div className="relative z-30 w-full shrink-0 px-4 pt-3 pb-1 sm:px-6">
      <p className="text-center font-kids text-xl font-semibold text-muted-foreground">
        {ruleLabel} · {settings.pointsCorrect} pts direct · {settings.pointsRevealed} pts with hints
      </p>
      <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-end justify-center gap-3">
        {ranked.map((entry, i) => (
          <SoloScoreCard
            key={entry.name}
            name={entry.name}
            score={entry.score}
            rank={i + 1}
            active={entry.name === activePlayer}
            burst={entry.name === activePlayer && burst === 0}
            plus={entry.name === activePlayer && plusFly === 0 ? plusValue : null}
          />
        ))}
      </div>
    </div>
  );
}

function TeamScoreCard({
  label,
  score,
  fill,
  ink,
  active,
  burst,
  plus,
  clock,
}: {
  label: string;
  score: number;
  fill: string;
  ink: string;
  active: boolean;
  burst: boolean;
  plus: number | null;
  clock: number | null;
}) {
  const urgent = clock != null && clock <= 10 && clock > 0 && active;
  return (
    <div className="relative min-w-36 text-center">
      <div
        className="inline-flex min-w-28 flex-col items-center rounded-3xl px-7 py-3 shadow-md"
        style={{
          background: fill,
          color: ink,
          animation: active ? "vocablab-glow-breathe 1.8s ease-in-out infinite" : undefined,
          outline: active ? `4px solid ${fill}` : undefined,
          outlineOffset: 4,
        }}
      >
        <span
          className="font-kids font-semibold tabular-nums leading-none"
          style={{
            fontSize: "clamp(2.6rem, 6.5vw, 4.4rem)",
            animation: burst ? "vocablab-score-burst 0.45s ease" : undefined,
          }}
        >
          {score}
        </span>
        <span className="mt-1 font-kids text-lg font-semibold leading-none">{label}</span>
        {clock != null ? (
          <span
            className="mt-1 font-kids text-2xl tabular-nums"
            style={{
              animation: urgent ? "vocablab-timer-urgent 0.5s ease-in-out infinite" : undefined,
            }}
          >
            {formatClock(clock)}
          </span>
        ) : null}
      </div>
      {plus != null ? (
        <span
          className="pointer-events-none absolute left-1/2 top-0 font-kids text-3xl font-semibold"
          style={{
            color: fill,
            animation: "vocablab-float-plus 0.7s ease forwards",
          }}
        >
          +{plus}
        </span>
      ) : null}
    </div>
  );
}

function SoloScoreCard({
  name,
  score,
  rank,
  active,
  burst,
  plus,
}: {
  name: string;
  score: number;
  rank: number;
  active: boolean;
  burst: boolean;
  plus: number | null;
}) {
  return (
    <div className="relative min-w-[7.5rem] text-center">
      <div
        className={`inline-flex min-w-[7rem] flex-col items-center rounded-2xl px-5 py-2.5 shadow-md ring-1 ${
          active ? "ring-primary ring-offset-2 ring-offset-background" : "ring-border/60"
        }`}
        style={{
          background: active ? "oklch(0.97 0.02 220)" : "var(--card)",
          animation: active ? "vocablab-glow-breathe 1.8s ease-in-out infinite" : undefined,
        }}
      >
        <span className="font-kids text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          #{rank}
        </span>
        <span
          className="font-kids font-semibold tabular-nums leading-none text-foreground"
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            animation: burst ? "vocablab-score-burst 0.45s ease" : undefined,
          }}
        >
          {score}
        </span>
        <span className="mt-0.5 max-w-[9rem] truncate font-kids text-base font-semibold leading-tight text-foreground">
          {name}
        </span>
      </div>
      {plus != null ? (
        <span
          className="pointer-events-none absolute left-1/2 top-0 font-kids text-2xl font-semibold text-primary"
          style={{ animation: "vocablab-float-plus 0.7s ease forwards" }}
        >
          +{plus}
        </span>
      ) : null}
    </div>
  );
}
