/**
 * Score-to-win race helpers.
 *
 * Teams: once anyone hits the target, play continues until every team has the
 * same number of completed turns (catch-up), then highest score wins (ties share).
 *
 * Solo: first player to reach the target wins immediately — no catch-up.
 */

export function reachedScoreToWin(scores: number[], scoreToWin: number): boolean {
  return scores.some((s) => s >= scoreToWin);
}

export function spinCountsEqual(counts: number[]): boolean {
  if (counts.length === 0) return true;
  const first = counts[0]!;
  return counts.every((c) => c === first);
}

/**
 * Teams only: end after someone hit the target and all teams have equal spins.
 */
export function shouldEndScoreMatch(
  scores: number[],
  spinCounts: number[],
  scoreToWin: number,
): boolean {
  if (scores.length === 0 || scores.length !== spinCounts.length) return false;
  if (!reachedScoreToWin(scores, scoreToWin)) return false;
  return spinCountsEqual(spinCounts);
}

/** Solo: end as soon as any player has reached the target. */
export function shouldEndSoloScoreMatch(scores: number[], scoreToWin: number): boolean {
  return reachedScoreToWin(scores, scoreToWin);
}

/**
 * Next contestant (after `from`) who still has fewer spins than the leader.
 * Used so trailing teams get catch-up turns once the target is reached.
 */
export function nextCatchUpIndex(from: number, spinCounts: number[]): number | null {
  const n = spinCounts.length;
  if (n === 0) return null;
  const max = Math.max(...spinCounts);
  for (let step = 1; step <= n; step++) {
    const cand = (from + step) % n;
    if ((spinCounts[cand] ?? 0) < max) return cand;
  }
  return null;
}

export type RankedEntry = { id: string; score: number; place: number };

/** Competition ranking: equal scores share a place; next place skips (1, 1, 3). */
export function rankScores(entries: { id: string; score: number }[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const out: RankedEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!;
    const place = i > 0 && e.score === sorted[i - 1]!.score ? out[i - 1]!.place : i + 1;
    out.push({ id: e.id, score: e.score, place });
  }
  return out;
}

export function teamWinnerFromScores(scores: number[]): number | "draw" {
  if (scores.length === 0) return "draw";
  const max = Math.max(...scores, 0);
  const ids = scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
  return ids.length === 1 ? ids[0]! : "draw";
}
