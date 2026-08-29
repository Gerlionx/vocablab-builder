import { Link } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import type { WheelGameModeId } from "@/lib/wheel-modes";
import { WHEEL_GAME_MODES } from "@/lib/wheel-modes";

const WHEEL_CONIC =
  "conic-gradient(var(--wheel-1) 0deg 60deg, var(--wheel-2) 60deg 120deg, var(--wheel-3) 120deg 180deg, var(--wheel-4) 180deg 240deg, var(--wheel-5) 240deg 300deg, var(--wheel-6) 300deg 360deg)";

export type ModeChip = {
  id: WheelGameModeId | string;
  label: string;
  active?: boolean;
  /** On Create: mode exists but is not yet on the Activity board. */
  dormant?: boolean;
};

type ActivityPosterCardProps = {
  to?: "/wheel" | "/game-settings/wheel" | string;
  search?: { mode?: WheelGameModeId };
  /** Hero headline — on Activity this is the mode name. */
  title: string;
  /** Optional small game label (unused on Activity — art carries the game). */
  eyebrow?: string;
  teaser: string;
  modes?: readonly ModeChip[];
  /** Poster art under the wash. Defaults to the Standard Wheel poster. */
  artSrc?: string;
  /** Themes the mode title colour on Activity cards. */
  modeId?: WheelGameModeId | string;
  /** When set, card is visual-only (e.g. coming soon). */
  disabled?: boolean;
  /** Create hub: tap a mode chip to activate / set it for the Activity board. */
  onModeClick?: (modeId: string) => void;
  /** Fired when the card link is opened (Activity board). */
  onOpen?: () => void;
};

export function ActivityPosterCard({
  to,
  search,
  title,
  teaser,
  modes = [],
  artSrc = "/wheel-of-names-poster.png",
  modeId,
  disabled = false,
  onModeClick,
  onOpen,
}: ActivityPosterCardProps) {
  function handleModeClick(event: MouseEvent, nextModeId: string) {
    if (!onModeClick) return;
    event.preventDefault();
    event.stopPropagation();
    onModeClick(nextModeId);
  }

  const cardClass = [
    "vocablab-activity-card",
    modeId ? `is-mode-${modeId}` : "",
    disabled || !to ? "is-disabled" : "",
    to && !disabled ? "group focus:outline-none" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <div className="vocablab-activity-card-stage" aria-hidden="true">
        <img src={artSrc} alt="" className="vocablab-activity-card-art" />
        <div className="vocablab-activity-card-wash" />
        <div className="vocablab-activity-card-sparkles" />
        <div
          className="vocablab-activity-card-wheel"
          style={{ background: WHEEL_CONIC }}
          title="Wheel of Names"
        />
      </div>

      <div className="vocablab-activity-card-body">
        <div className="vocablab-activity-card-copy">
          <div className="vocablab-activity-card-head">
            <h2 className="vocablab-activity-card-title font-kids">{title}</h2>
            {modes.length ? (
              <ul className="vocablab-activity-card-modes" aria-label="Game modes">
                {modes.map((mode) => {
                  const className = [
                    "vocablab-activity-card-mode",
                    "font-kids",
                    mode.active ? "is-active" : "",
                    mode.dormant ? "is-dormant" : "",
                    onModeClick ? "is-toggle" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  if (onModeClick) {
                    return (
                      <li key={mode.id}>
                        <button
                          type="button"
                          className={className}
                          aria-pressed={Boolean(mode.active)}
                          onClick={(e) => handleModeClick(e, String(mode.id))}
                        >
                          {mode.label}
                          {mode.active ? <span className="sr-only"> (active)</span> : null}
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={mode.id} className={className}>
                      {mode.label}
                      {mode.active ? <span className="sr-only"> (active)</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <p className="vocablab-activity-card-teaser">{teaser}</p>
        </div>
      </div>
    </>
  );

  if (disabled || !to) {
    return (
      <div className={cardClass} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link
      to={to}
      {...(search ? { search } : {})}
      className={cardClass}
      onClick={() => onOpen?.()}
    >
      {body}
    </Link>
  );
}

/** All registry modes — for Create: green = on the Activity board. */
export function allWheelModeChips(
  _activeMode: WheelGameModeId,
  enabled: readonly WheelGameModeId[],
): ModeChip[] {
  return WHEEL_GAME_MODES.map((mode) => {
    const onBoard = enabled.includes(mode.id);
    return {
      id: mode.id,
      label: mode.label,
      active: onBoard,
      dormant: !onBoard,
    };
  });
}

/** Only activated modes — for the Activity board. */
export function boardWheelModeChips(
  activeMode: WheelGameModeId,
  enabled: readonly WheelGameModeId[],
): ModeChip[] {
  return WHEEL_GAME_MODES.filter((mode) => enabled.includes(mode.id)).map((mode) => ({
    id: mode.id,
    label: mode.label,
    active: mode.id === activeMode,
  }));
}

/** Poster art per Wheel mode for the Activity board. */
export function wheelModePosterSrc(modeId: WheelGameModeId): string {
  if (modeId === "time") return "/wheel-of-time-poster.png";
  return "/wheel-of-names-poster.png";
}
