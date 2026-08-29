/** Coloured countdown bar — full at question start, empties as time spends. */
export function RoundTimerBar({
  totalSeconds,
  remainingSeconds,
  color,
  paused,
  hint = "Time left",
}: {
  totalSeconds: number;
  remainingSeconds: number;
  color: string;
  paused: boolean;
  /** Right-side caption while running (e.g. "Bank left" / "Time left"). */
  hint?: string;
}) {
  const total = Math.max(0.001, totalSeconds);
  const left = Math.max(0, remainingSeconds);
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const display = Math.max(0, Math.ceil(left - 1e-6));

  return (
    <div
      className="vocablab-timer-bar"
      data-paused={paused ? "true" : "false"}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={display}
      aria-label={paused ? `Timer paused at ${display} seconds` : `${display} seconds left`}
    >
      <div className="vocablab-timer-bar-track">
        <div
          className="vocablab-timer-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 12px color-mix(in oklab, ${color} 40%, transparent)`,
          }}
        />
      </div>
      <p className="vocablab-timer-bar-meta font-kids">
        <span style={{ color }}>{display}s</span>
        <span className="vocablab-timer-bar-hint">{paused ? "Paused" : hint}</span>
      </p>
    </div>
  );
}
