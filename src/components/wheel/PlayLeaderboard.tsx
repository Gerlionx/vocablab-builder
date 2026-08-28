import { useEffect, useRef, useState, type ReactNode } from "react";
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

  const ptsLabel = `${settings.pointsCorrect} pts direct · ${settings.pointsRevealed} pts with hints`;

  if (teamsOn) {
    const visibleTeams = palettes
      .slice(0, teamCount)
      .map((color, i) => ({ color, i, score: scores[i] ?? 0 }))
      .filter((entry) => timeMatch || entry.score > 0);

    return (
      <ScoreRail
        ruleLabel={ruleLabel}
        ptsLabel={timeMatch ? undefined : ptsLabel}
        emptyHint="Team scores appear after the first correct answer."
        hasEntries={visibleTeams.length > 0}
      >
        {visibleTeams.map(({ color, i, score }) => (
          <TeamScoreCard
            key={color.id}
            label={color.label}
            score={score}
            fill={color.fill}
            ink={color.ink}
            active={turn === i}
            burst={burst === i}
            plus={plusFly === i ? plusValue : null}
            clock={timeMatch ? (banks[i] ?? 0) : null}
            enterKey={`team-${color.id}`}
          />
        ))}
      </ScoreRail>
    );
  }

  const ranked = [...players]
    .map((p) => ({ name: p.name, score: playerScores[p.name] ?? 0 }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return (
    <ScoreRail
      ruleLabel={ruleLabel}
      ptsLabel={ptsLabel}
      emptyHint="Scores appear after the first correct answer."
      hasEntries={ranked.length > 0}
    >
      {ranked.map((entry, i) => (
        <SoloScoreCard
          key={entry.name}
          name={entry.name}
          score={entry.score}
          rank={i + 1}
          active={entry.name === activePlayer}
          burst={entry.name === activePlayer && burst === 0}
          plus={entry.name === activePlayer && plusFly === 0 ? plusValue : null}
          enterKey={entry.name}
        />
      ))}
    </ScoreRail>
  );
}

function ScoreRail({
  ruleLabel,
  ptsLabel,
  emptyHint,
  hasEntries,
  children,
}: {
  ruleLabel: string;
  ptsLabel?: string | undefined;
  emptyHint: string;
  hasEntries: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-4 sm:px-4">
      <header className="shrink-0 border-b border-border/50 pb-3">
        <p className="font-kids text-base font-semibold leading-snug text-muted-foreground sm:text-lg">
          {ruleLabel}
        </p>
        {ptsLabel ? (
          <p className="mt-1 font-kids text-xs font-medium leading-snug text-muted-foreground/80 sm:text-sm">
            {ptsLabel}
          </p>
        ) : null}
      </header>

      <ol
        className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Scores"
      >
        {children}
      </ol>

      {!hasEntries ? (
        <p className="mt-2 shrink-0 text-center font-kids text-sm leading-snug text-muted-foreground/70">
          {emptyHint}
        </p>
      ) : null}
    </div>
  );
}

function useEnterAnimation(enterKey: string) {
  const seenRef = useRef<Set<string>>(new Set());
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (seenRef.current.has(enterKey)) return;
    seenRef.current.add(enterKey);
    setEntering(true);
    const id = window.setTimeout(() => setEntering(false), 650);
    return () => window.clearTimeout(id);
  }, [enterKey]);

  return entering;
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
  enterKey,
}: {
  label: string;
  score: number;
  fill: string;
  ink: string;
  active: boolean;
  burst: boolean;
  plus: number | null;
  clock: number | null;
  enterKey: string;
}) {
  const entering = useEnterAnimation(enterKey);
  const urgent = clock != null && clock <= 10 && clock > 0 && active;

  return (
    <li
      className={`relative list-none ${entering ? "vocablab-leaderboard-enter" : ""}`}
      aria-label={`${label}, ${score} points`}
    >
      <div
        className="flex flex-col items-center rounded-2xl px-4 py-3 shadow-md"
        style={{
          background: fill,
          color: ink,
          animation: active ? "vocablab-glow-breathe 1.8s ease-in-out infinite" : undefined,
          outline: active ? `3px solid ${fill}` : undefined,
          outlineOffset: 3,
        }}
      >
        <span
          className="font-kids font-semibold tabular-nums leading-none"
          style={{
            fontSize: "clamp(2rem, 4vw, 2.8rem)",
            animation: burst ? "vocablab-score-burst 0.45s ease" : undefined,
          }}
        >
          {score}
        </span>
        <span className="mt-1 font-kids text-base font-semibold leading-none">{label}</span>
        {clock != null ? (
          <span
            className="mt-1 font-kids text-xl tabular-nums"
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
          className="pointer-events-none absolute left-1/2 top-0 font-kids text-2xl font-semibold"
          style={{
            color: fill,
            animation: "vocablab-float-plus 0.7s ease forwards",
          }}
          aria-hidden="true"
        >
          +{plus}
        </span>
      ) : null}
    </li>
  );
}

function SoloScoreCard({
  name,
  score,
  rank,
  active,
  burst,
  plus,
  enterKey,
}: {
  name: string;
  score: number;
  rank: number;
  active: boolean;
  burst: boolean;
  plus: number | null;
  enterKey: string;
}) {
  const entering = useEnterAnimation(enterKey);

  return (
    <li
      className={`relative list-none ${entering ? "vocablab-leaderboard-enter" : ""}`}
      aria-label={`${name}, rank ${rank}, ${score} points`}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-md ring-1 ${
          active ? "ring-primary ring-offset-2 ring-offset-background" : "ring-border/60"
        }`}
        style={{
          background: active ? "oklch(0.97 0.02 220)" : "var(--card)",
          animation: active ? "vocablab-glow-breathe 1.8s ease-in-out infinite" : undefined,
        }}
      >
        <span className="w-7 shrink-0 text-center font-kids text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          #{rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-kids text-base font-semibold leading-tight text-foreground">
            {name}
          </p>
        </div>
        <span
          className="shrink-0 font-kids font-semibold tabular-nums leading-none text-foreground"
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
            animation: burst ? "vocablab-score-burst 0.45s ease" : undefined,
          }}
        >
          {score}
        </span>
      </div>
      {plus != null ? (
        <span
          className="pointer-events-none absolute right-3 top-0 font-kids text-xl font-semibold text-primary"
          style={{ animation: "vocablab-float-plus 0.7s ease forwards" }}
          aria-hidden="true"
        >
          +{plus}
        </span>
      ) : null}
    </li>
  );
}
