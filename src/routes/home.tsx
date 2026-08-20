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
      <main className="flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6">
        <h1 className="sr-only">Vocablab home</h1>
        <Link
          to="/create"
          className="grid size-40 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-4 focus:ring-offset-background active:scale-95"
        >
          <span className="text-sm font-medium uppercase tracking-[0.25em]">
            Create
          </span>
        </Link>
        <p className="mt-10 max-w-xs text-center text-sm text-muted-foreground">
          Everything else can wait. Pick an activity when you are ready.
        </p>
      </main>
    </AppChrome>
  );
}
