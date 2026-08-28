import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/wheel-math";
import { rainbowPaint, type colorById } from "@/lib/team-colors";

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
  burst: number | null;
  plusFly: number | null;
  plusValue: number;
  activePlayer: string | null;
}) {
  if (teamsOn) {
    const visibleTeams = palettes
      .slice(0, teamCount)
      .map((color, i) => ({ color, i, score: scores[i] ?? 0 }))
      .filter((entry) => entry.score > 0);

    if (visibleTeams.length === 0) return null;

    return (
      <ol
        className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-16 sm:px-5"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Scores"
      >
        {visibleTeams.map(({ color, i, score }) => (
          <ScoreRow
            key={color.id}
            label={color.label}
            score={score}
            fill={color.fill}
            ink={color.ink}
            burst={burst === i}
            plus={plusFly === i ? plusValue : null}
            clock={timeMatch ? (banks[i] ?? 0) : null}
            urgent={timeMatch && (banks[i] ?? 0) <= 10 && (banks[i] ?? 0) > 0 && turn === i}
            enterKey={`team-${color.id}`}
          />
        ))}
      </ol>
    );
  }

  const nameIndex = new Map(players.map((p, i) => [p.name, i]));
  const ranked = [...players]
    .map((p) => ({ name: p.name, score: playerScores[p.name] ?? 0 }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  if (ranked.length === 0) return null;

  return (
    <ol
      className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-16 sm:px-5"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Scores"
    >
      {ranked.map((entry) => {
        const paint = rainbowPaint(nameIndex.get(entry.name) ?? 0);
        return (
          <ScoreRow
            key={entry.name}
            label={entry.name}
            score={entry.score}
            fill={paint.fill}
            ink={paint.ink}
            burst={entry.name === activePlayer && burst === 0}
            plus={entry.name === activePlayer && plusFly === 0 ? plusValue : null}
            clock={null}
            urgent={false}
            enterKey={entry.name}
          />
        );
      })}
    </ol>
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

function ScoreRow({
  label,
  score,
  fill,
  ink,
  burst,
  plus,
  clock,
  urgent,
  enterKey,
}: {
  label: string;
  score: number;
  fill: string;
  ink: string;
  burst: boolean;
  plus: number | null;
  clock: number | null;
  urgent: boolean;
  enterKey: string;
}) {
  const entering = useEnterAnimation(enterKey);

  return (
    <li
      className={`relative list-none ${entering ? "vocablab-leaderboard-enter" : ""}`}
      aria-label={`${label}, ${score} points`}
    >
      <span
        className="inline-flex w-full min-w-0 items-center justify-between gap-3 rounded-full px-3 py-1.5 font-kids text-sm font-semibold shadow-sm"
        style={{ background: fill, color: ink }}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span
          className="shrink-0 tabular-nums leading-none"
          style={{
            fontSize: "clamp(1.35rem, 2.8vw, 1.75rem)",
            animation: burst ? "vocablab-score-burst 0.45s ease" : undefined,
          }}
        >
          {score}
        </span>
      </span>
      {clock != null ? (
        <span
          className="mt-1 block text-right font-kids text-sm tabular-nums"
          style={{
            color: ink,
            animation: urgent ? "vocablab-timer-urgent 0.5s ease-in-out infinite" : undefined,
          }}
        >
          {formatClock(clock)}
        </span>
      ) : null}
      {plus != null ? (
        <span
          className="pointer-events-none absolute right-2 top-0 font-kids text-xl font-semibold"
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
