import { createFileRoute, Link } from "@tanstack/react-router";

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
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <Link
        to="/home"
        className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        &larr; Home
      </Link>
      <h1 className="font-kids text-4xl font-semibold tracking-tight text-foreground">
        Create
      </h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Prep before the bell. Pick a game, save lessons with vocabulary and a game mode, then in
        class you only load a lesson and paste names.
      </p>

      <div className="mt-12 max-w-sm">
        <Link
          to="/game-settings/wheel"
          className="group block rounded-3xl bg-card p-8 ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <div
            className="size-20 rounded-full ring-4 ring-primary/30 transition-transform duration-700 group-hover:rotate-45"
            style={{
              background:
                "conic-gradient(var(--wheel-1) 0deg 60deg, var(--wheel-2) 60deg 120deg, var(--wheel-3) 120deg 180deg, var(--wheel-4) 180deg 240deg, var(--wheel-5) 240deg 300deg, var(--wheel-6) 300deg 360deg)",
            }}
          />
          <h2 className="mt-6 text-xl font-semibold tracking-tight">Wheel of names</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Lessons, vocabulary, and game modes — starting with Basic.
          </p>
          <p className="mt-4 text-sm font-semibold text-primary">Open →</p>
        </Link>
      </div>
    </main>
  );
}
