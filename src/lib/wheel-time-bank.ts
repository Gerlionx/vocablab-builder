/**
 * Time bank mode — elimination by response time, not score.
 *
 * Round clock shows remaining bank, or the buffer once a contestant has escaped
 * with bank < buffer. Got it deducts elapsed time. Missed / clock expiry
 * eliminates. Skip does not count (no bank change).
 */

export type TimeBankEscapeResult = {
  bank: number;
  /** Next round uses buffer seconds on the clock. */
  inBufferZone: boolean;
};

/** Seconds shown on the round clock at question start. */
export function roundClockSeconds(
  remainingBank: number,
  bufferSeconds: number,
  inBufferZone: boolean,
): number {
  const buffer = Math.max(1, Math.round(bufferSeconds));
  if (inBufferZone) return buffer;
  return Math.max(0, remainingBank);
}

/** After a correct escape outside or inside the buffer zone. */
export function applyCorrectEscape(
  remainingBank: number,
  elapsedSeconds: number,
  bufferSeconds: number,
  alreadyInBufferZone: boolean,
): TimeBankEscapeResult {
  const buffer = Math.max(1, Math.round(bufferSeconds));
  const elapsed = Math.max(0, elapsedSeconds);
  const bank = Math.max(0, remainingBank - elapsed);
  if (alreadyInBufferZone) {
    return { bank, inBufferZone: true };
  }
  return { bank, inBufferZone: bank < buffer };
}

/**
 * Optional Skip penalty: deduct a fixed cost from the bank, then re-spin
 * the same contestant. Does not eliminate by itself.
 * `penaltySeconds <= 0` means Skip is free.
 */
export function applySkipPenalty(
  remainingBank: number,
  penaltySeconds: number,
  bufferSeconds: number,
  alreadyInBufferZone: boolean,
): TimeBankEscapeResult {
  const penalty = Math.max(0, penaltySeconds);
  if (penalty <= 0) {
    return { bank: remainingBank, inBufferZone: alreadyInBufferZone };
  }
  return applyCorrectEscape(remainingBank, penalty, bufferSeconds, alreadyInBufferZone);
}

/**
 * Skip with penalty can leave bank at 0. Teacher still re-spins the same
 * side; elimination only happens on Missed / round-clock expiry.
 */

export function shouldEliminateOnFail(): true {
  return true;
}

/** Match ends when 0 or 1 contestants remain alive. */
export function shouldEndTimeBankMatch(aliveCount: number): boolean {
  return aliveCount <= 1;
}

export function countAlive(eliminated: readonly boolean[]): number {
  return eliminated.reduce((n, out) => n + (out ? 0 : 1), 0);
}

export function aliveIndices(eliminated: readonly boolean[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < eliminated.length; i++) {
    if (!eliminated[i]) out.push(i);
  }
  return out;
}

/** Sole survivor index, or null if none / multiple. */
export function soleSurvivorIndex(eliminated: readonly boolean[]): number | null {
  const alive = aliveIndices(eliminated);
  return alive.length === 1 ? alive[0]! : null;
}

export type TimeBankRankEntry = {
  id: string;
  bank: number;
  eliminated: boolean;
  /** Lower is better (1 = winner). */
  place: number;
};

/**
 * Leaderboard: alive first (higher bank better), then eliminated
 * (later elimination order = better among the dead).
 * `eliminationOrder` lists contestant ids in the order they were eliminated.
 */
export function rankTimeBankContestants(
  entries: { id: string; bank: number; eliminated: boolean }[],
  eliminationOrder: readonly string[],
): TimeBankRankEntry[] {
  const orderIndex = new Map(eliminationOrder.map((id, i) => [id, i]));
  const sorted = [...entries].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (!a.eliminated && !b.eliminated) {
      return b.bank - a.bank || a.id.localeCompare(b.id);
    }
    const ai = orderIndex.get(a.id) ?? -1;
    const bi = orderIndex.get(b.id) ?? -1;
    // Later elimination ranks higher among the dead.
    return bi - ai || a.id.localeCompare(b.id);
  });
  return sorted.map((e, i) => ({ ...e, place: i + 1 }));
}

/** Elapsed seconds from a countdown that started at `startedAt` with `clockSeconds`. */
export function elapsedFromRoundClock(
  clockSeconds: number,
  secondsLeft: number,
): number {
  const start = Math.max(0, clockSeconds);
  const left = Math.max(0, secondsLeft);
  return Math.min(start, Math.max(0, start - left));
}
