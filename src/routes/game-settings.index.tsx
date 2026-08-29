import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ActivityPosterCard,
  wheelOfNamesModeChips,
} from "@/components/ActivityPosterCard";
import { DEFAULT_WHEEL_SETTINGS, loadWheelSettings } from "@/lib/game-settings";
import { DEFAULT_WHEEL_GAME_MODE, type WheelGameModeId } from "@/lib/wheel-modes";

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
  const [activeMode, setActiveMode] = useState<WheelGameModeId>(DEFAULT_WHEEL_GAME_MODE);

  useEffect(() => {
    setActiveMode(loadWheelSettings().gameMode ?? DEFAULT_WHEEL_SETTINGS.gameMode);
  }, []);

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
        Prep before the bell. Pick a game, save lessons with vocabulary and a game mode, then in
        class you only load a lesson and paste names.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:max-w-4xl">
        <ActivityPosterCard
          to="/game-settings/wheel"
          title="Wheel of Names"
          teaser="Lessons, vocabulary, and game modes."
          modes={wheelOfNamesModeChips(activeMode)}
        />
        <ActivityPosterCard
          title="Wheel of Time"
          teaser="Coming soon — prep for time-bank lessons."
          modes={[{ id: "time-bank", label: "Time bank", active: false }]}
          disabled
        />
      </div>
    </main>
  );
}
