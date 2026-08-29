import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ActivityPosterCard,
  wheelModePosterSrc,
} from "@/components/ActivityPosterCard";
import { AppChrome } from "@/components/AppChrome";
import {
  activateBoardMode,
  DEFAULT_BOARD_MODES,
  loadBoardModes,
  type BoardModesState,
} from "@/lib/game-settings";
import {
  DEFAULT_WHEEL_GAME_MODE,
  WHEEL_GAME_MODES,
  wheelGameModeDef,
  type WheelGameModeId,
} from "@/lib/wheel-modes";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create an activity — Vocablab" },
      {
        name: "description",
        content:
          "Choose a classroom activity to project. Wheel of Names picks a student at random.",
      },
      { property: "og:title", content: "Create an activity — Vocablab" },
      {
        property: "og:description",
        content:
          "Choose a classroom activity to project. Wheel of Names picks a student at random.",
      },
    ],
  }),
  component: CreatePage,
});

const MODE_TEASERS: Record<WheelGameModeId, string> = {
  basic: "Names spin. Someone lands. The room leans in.",
  time: "Start with a time bank. Escape on Got it — miss or timeout and you’re out.",
};

function CreatePage() {
  const [board, setBoard] = useState<BoardModesState>(DEFAULT_BOARD_MODES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBoard(loadBoardModes());
    setReady(true);
  }, []);

  const enabledModes = ready
    ? WHEEL_GAME_MODES.filter((mode) => board.enabled.includes(mode.id))
    : [wheelGameModeDef(DEFAULT_WHEEL_GAME_MODE)];

  return (
    <AppChrome>
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <Link
          to="/home"
          className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>
        <h1 className="font-kids text-4xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a mode for the board. Activate modes under Create first.
        </p>

        <div className="vocablab-activity-board mt-10">
          {enabledModes.map((mode) => {
            const playable = mode.playable;
            return (
              <ActivityPosterCard
                key={mode.id}
                {...(playable
                  ? { to: "/wheel" as const, search: { mode: mode.id } }
                  : {})}
                disabled={!playable}
                eyebrow="Wheel of Names"
                title={mode.label}
                modeId={mode.id}
                artSrc={wheelModePosterSrc(mode.id)}
                teaser={
                  playable
                    ? MODE_TEASERS[mode.id]
                    : "Coming soon — activate it now so it is ready when play ships."
                }
                onOpen={() => {
                  try {
                    sessionStorage.setItem("vocablab.wheel.playMode", mode.id);
                  } catch {
                    /* ignore */
                  }
                  const next = activateBoardMode(mode.id);
                  setBoard(next);
                }}
              />
            );
          })}
        </div>

        {ready && enabledModes.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No modes are on yet. Open Create → Wheel of Names and activate a game mode.
          </p>
        ) : null}
      </main>
    </AppChrome>
  );
}
