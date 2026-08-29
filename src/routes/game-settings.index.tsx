import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ActivityPosterCard,
  allWheelModeChips,
} from "@/components/ActivityPosterCard";
import {
  activateBoardMode,
  deactivateBoardMode,
  DEFAULT_BOARD_MODES,
  loadBoardModes,
  type BoardModesState,
} from "@/lib/game-settings";
import { DEFAULT_WHEEL_GAME_MODE, isWheelGameModeId } from "@/lib/wheel-modes";

export const Route = createFileRoute("/game-settings/")({
  head: () => ({
    meta: [
      { title: "Create — Vocablab" },
      {
        name: "description",
        content: "Prepare lessons and play modes for each Vocablab classroom game.",
      },
    ],
  }),
  component: GameSettingsHub,
});

function GameSettingsHub() {
  const [board, setBoard] = useState<BoardModesState>(DEFAULT_BOARD_MODES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBoard(loadBoardModes());
    setReady(true);
  }, []);

  function onModeClick(modeId: string) {
    if (!isWheelGameModeId(modeId)) return;
    const current = loadBoardModes();
    if (current.enabled.includes(modeId)) {
      // Tap a green (on-board) chip to remove it — at least one mode stays on.
      setBoard(deactivateBoardMode(modeId));
      return;
    }
    setBoard(activateBoardMode(modeId));
  }

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <Link
        to="/home"
        className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        &larr; Home
      </Link>
      <h1 className="font-kids text-4xl font-semibold tracking-tight text-foreground">Create</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        One game — Wheel of Names. Green badges are on the Activity board. Tap to turn a mode
        on or off. Open the card to build lessons.
      </p>

      <div className="mt-12 max-w-md">
        <ActivityPosterCard
          to="/game-settings/wheel"
          title="Wheel of Names"
          teaser="Lessons, vocabulary, and game modes."
          modes={
            ready
              ? allWheelModeChips(board.active, board.enabled)
              : allWheelModeChips(DEFAULT_WHEEL_GAME_MODE, [DEFAULT_WHEEL_GAME_MODE])
          }
          onModeClick={onModeClick}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Dim chips are off the board — tap to show them on Activity (green). Tap a green chip
          to remove it (at least one mode must stay on).
        </p>
      </div>
    </main>
  );
}
