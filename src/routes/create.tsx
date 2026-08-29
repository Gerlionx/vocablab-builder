import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ActivityPosterCard,
  wheelOfNamesModeChips,
} from "@/components/ActivityPosterCard";
import { AppChrome } from "@/components/AppChrome";
import { DEFAULT_WHEEL_SETTINGS, loadWheelSettings } from "@/lib/game-settings";
import { DEFAULT_WHEEL_GAME_MODE, type WheelGameModeId } from "@/lib/wheel-modes";

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

function CreatePage() {
  const [activeMode, setActiveMode] = useState<WheelGameModeId>(DEFAULT_WHEEL_GAME_MODE);

  useEffect(() => {
    setActiveMode(loadWheelSettings().gameMode ?? DEFAULT_WHEEL_SETTINGS.gameMode);
  }, []);

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
          Choose an activity for the board. Prep lessons under Create first.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:max-w-4xl">
          <ActivityPosterCard
            to="/wheel"
            title="Wheel of Names"
            teaser="Names spin. Someone lands. The room leans in."
            modes={wheelOfNamesModeChips(activeMode)}
          />
          <ActivityPosterCard
            title="Wheel of Time"
            teaser="Coming soon — time-bank play, same spin energy."
            modes={[{ id: "time-bank", label: "Time bank", active: false }]}
            disabled
          />
        </div>
      </main>
    </AppChrome>
  );
}
