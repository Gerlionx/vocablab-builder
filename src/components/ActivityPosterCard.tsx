import { Link } from "@tanstack/react-router";
import type { WheelGameModeId } from "@/lib/wheel-modes";
import { WHEEL_GAME_MODES } from "@/lib/wheel-modes";

const WHEEL_CONIC =
  "conic-gradient(var(--wheel-1) 0deg 60deg, var(--wheel-2) 60deg 120deg, var(--wheel-3) 120deg 180deg, var(--wheel-4) 180deg 240deg, var(--wheel-5) 240deg 300deg, var(--wheel-6) 300deg 360deg)";

type ModeChip = {
  id: string;
  label: string;
  active?: boolean;
};

type ActivityPosterCardProps = {
  to?: string;
  title: string;
  teaser: string;
  modes: readonly ModeChip[];
  /** When set, card is visual-only (e.g. coming soon). */
  disabled?: boolean;
};

export function ActivityPosterCard({
  to,
  title,
  teaser,
  modes,
  disabled = false,
}: ActivityPosterCardProps) {
  const body = (
    <>
      <div className="vocablab-activity-card-stage" aria-hidden="true">
        <img
          src="/wheel-of-names-poster.png"
          alt=""
          className="vocablab-activity-card-art"
        />
        <div className="vocablab-activity-card-wash" />
        <div className="vocablab-activity-card-sparkles" />
        <div className="vocablab-activity-card-wheel" style={{ background: WHEEL_CONIC }} />
      </div>

      <div className="vocablab-activity-card-body">
        <h2 className="vocablab-activity-card-title font-kids">{title}</h2>
        <ul className="vocablab-activity-card-modes" aria-label="Game modes">
          {modes.map((mode) => (
            <li
              key={mode.id}
              className={
                mode.active
                  ? "vocablab-activity-card-mode is-active font-kids"
                  : "vocablab-activity-card-mode font-kids"
              }
            >
              {mode.label}
              {mode.active ? <span className="sr-only"> (active)</span> : null}
            </li>
          ))}
        </ul>
        <p className="vocablab-activity-card-teaser">{teaser}</p>
      </div>
    </>
  );

  if (disabled || !to) {
    return (
      <div
        className="vocablab-activity-card is-disabled"
        aria-disabled="true"
      >
        {body}
      </div>
    );
  }

  return (
    <Link to={to} className="vocablab-activity-card group focus:outline-none">
      {body}
    </Link>
  );
}

/** Modes for Wheel of Names — every registered mode, active one flagged. */
export function wheelOfNamesModeChips(activeMode: WheelGameModeId): ModeChip[] {
  return WHEEL_GAME_MODES.map((mode) => ({
    id: mode.id,
    label: mode.label,
    active: mode.id === activeMode,
  }));
}
