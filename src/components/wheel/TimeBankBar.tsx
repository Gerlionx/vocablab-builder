/** Team-coloured bank bar — full at question start, empties as time spends. */
export function TimeBankBar({
  totalSeconds,
  remainingSeconds,
  color,
  paused,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  color: string;
  paused: boolean;
}) {
  const total = Math.max(0.001, totalSeconds);
  const left = Math.max(0, remainingSeconds);
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const display = Math.max(0, Math.ceil(left - 1e-6));

  return (
    <div
      className="vocablab-time-bank"
      data-paused={paused ? "true" : "false"}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={display}
      aria-label={paused ? `Time bank paused at ${display} seconds` : `Time bank ${display} seconds left`}
    >
      <div className="vocablab-time-bank-track">
        <div
          className="vocablab-time-bank-fill"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 12px color-mix(in oklab, ${color} 40%, transparent)`,
          }}
        />
      </div>
      <p className="vocablab-time-bank-meta font-kids">
        <span style={{ color }}>{display}s</span>
        <span className="vocablab-time-bank-hint">
          {paused ? "Paused" : "Bank left"}
        </span>
      </p>
    </div>
  );
}
