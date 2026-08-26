import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppChrome } from "@/components/AppChrome";

export const Route = createFileRoute("/game-settings")({
  head: () => ({
    meta: [
      { title: "Game settings — Vocablab" },
      {
        name: "description",
        content: "Prepare lessons and play modes for each Vocablab classroom game.",
      },
    ],
  }),
  component: GameSettingsLayout,
});

function GameSettingsLayout() {
  return (
    <AppChrome>
      <Outlet />
    </AppChrome>
  );
}
