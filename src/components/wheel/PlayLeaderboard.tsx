import { useEffect, useRef, useState, type ReactNode } from "react";
import { rainbowPaint, type colorById } from "@/lib/team-colors";

type Palette = ReturnType<typeof colorById>;

const PILL_WIDTH = "min(15rem, 32vw)";
const PILL_TYPE = "clamp(1.05rem, 2.2vmin, 1.7rem)";

export function PlayLeaderboard({
  teamsOn,
  teamCount,
  scores,
  playerScores,
  players,
  palettes,
  playerScoredAt,
  teamScoredAt,
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
  playerScoredAt: Record<string, number>;
  teamScoredAt: number[];
  burst: number | null;
  plusFly: number | null;
  plusValue: number;
  activePlayer: string | null;
}) {
  if (teamsOn) {
    const teams = palettes
      .slice(0, teamCount)
      .map((color, i) => ({
        color,
        i,
        score: scores[i] ?? 0,
        at: teamScoredAt[i] ?? 0,
      }))
      .filter((team) => team.score > 0)
      .sort((a, b) => b.score - a.score || a.at - b.at);

    if (!teams.length) return null;

    if (teamCount === 2) {
      const left = palettes[0] ? { color: palettes[0], i: 0, score: scores[0] ?? 0 } : null;
      const right = palettes[1] ? { color: palettes[1], i: 1, score: scores[1] ?? 0 } : null;
      return (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30" aria-label="Scores">
          {left && left.score > 0 ? (
            <div className="absolute left-3 top-12 sm:left-4 sm:top-14" style={{ width: PILL_WIDTH }}>
              <ScoreRow
                label={left.color.label}
                score={left.score}
                fill={left.color.fill}
                ink={left.color.ink}
                burst={burst === 0}
                plus={plusFly === 0 ? plusValue : null}
                enterKey={`team-${left.color.id}`}
              />
            </div>
          ) : null}
          {right && right.score > 0 ? (
            <div className="absolute right-3 top-12 sm:right-4 sm:top-14" style={{ width: PILL_WIDTH }}>
              <ScoreRow
                label={right.color.label}
                score={right.score}
                fill={right.color.fill}
                ink={right.color.ink}
                burst={burst === 1}
                plus={plusFly === 1 ? plusValue : null}
                enterKey={`team-${right.color.id}`}
              />
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <ScoreStack ariaLabel="Scores">
        {teams.map(({ color, i, score }) => (
          <ScoreRow
            key={color.id}
            label={color.label}
            score={score}
            fill={color.fill}
            ink={color.ink}
            burst={burst === i}
            plus={plusFly === i ? plusValue : null}
            enterKey={`team-${color.id}`}
          />
        ))}
      </ScoreStack>
    );
  }

  const nameIndex = new Map(players.map((p, i) => [p.name, i]));
  const ranked = [...players]
    .map((p) => ({
      name: p.name,
      score: playerScores[p.name] ?? 0,
      at: playerScoredAt[p.name] ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.at - b.at || a.name.localeCompare(b.name));

  if (!ranked.length) return null;

  return (
    <ScoreStack ariaLabel="Scores">
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
            enterKey={entry.name}
          />
        );
      })}
    </ScoreStack>
  );
}

function ScoreStack({ children, ariaLabel }: { children: ReactNode; ariaLabel: string }) {
  return (
    <div
      className="flex w-full flex-col items-stretch gap-1.5 px-3 pt-14 pb-2"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label={ariaLabel}
    >
      {children}
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
    const id = window.setTimeout(() => setEntering(false), 700);
    return () => window.clearTimeout(id);
  }, [enterKey]);

  return entering;
}

function ScoreRow({
  label,
  score,
  fill,
  ink: _ink,
  burst,
  plus,
  enterKey,
}: {
  label: string;
  score: number;
  fill: string;
  ink: string;
  burst: boolean;
  plus: number | null;
  enterKey: string;
}) {
  const entering = useEnterAnimation(enterKey);
  const ptsLabel = `${score} pts`;

  return (
    <div
      className={`relative w-full ${entering ? "vocablab-leaderboard-enter" : ""}`}
      aria-label={`${label}, ${ptsLabel}`}
    >
      <span
        className="flex w-full items-center justify-between gap-2 rounded-full py-1.5 pl-3.5 pr-3 font-kids font-semibold shadow-sm"
        style={{
          background: fill,
          color: "oklch(0.995 0 0)",
          fontSize: PILL_TYPE,
          animation: burst ? "vocablab-score-burst 0.45s ease" : undefined,
        }}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{ptsLabel}</span>
      </span>
      {plus != null ? (
        <span
          className="pointer-events-none absolute -top-3 right-2 font-kids text-sm font-semibold"
          style={{
            color: fill,
            animation: "vocablab-float-plus 0.7s ease forwards",
          }}
          aria-hidden="true"
        >
          +{plus}
        </span>
      ) : null}
    </div>
  );
}
