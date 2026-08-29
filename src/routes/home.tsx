import { createFileRoute, Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/AppChrome";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Vocablab" },
      {
        name: "description",
        content:
          "Start a classroom activity or manage your French vocabulary from the Vocablab home screen.",
      },
      { property: "og:title", content: "Home — Vocablab" },
      {
        property: "og:description",
        content:
          "Start a classroom activity or manage your French vocabulary from the Vocablab home screen.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppChrome>
      <main className="flex min-h-[calc(100vh-5.5rem)] min-h-[calc(100dvh-5.5rem)] flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h1 className="sr-only">Vocablab home</h1>
        <Link to="/create" className="vocablab-activity-orb" aria-label="Open Activity">
          <span className="vocablab-activity-orb-glow" aria-hidden="true" />
          <span className="vocablab-activity-orb-ring" aria-hidden="true" />
          <span className="vocablab-activity-orb-face" aria-hidden="true" />
          <span className="vocablab-activity-orb-label font-kids">Activity</span>
        </Link>
      </main>
    </AppChrome>
  );
}
