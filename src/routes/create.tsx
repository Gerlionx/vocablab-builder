import { createFileRoute, Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/AppChrome";

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
  return (
    <AppChrome>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <Link
          to="/home"
          className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>
        <h1 className="text-4xl font-medium tracking-tight">Create</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose an activity to put on the board.
        </p>

        <div className="mt-12 max-w-sm">
          <Link
            to="/wheel"
            className="group block rounded-3xl bg-card p-8 ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <div
              className="size-24 rounded-full ring-4 ring-primary transition-transform duration-700 group-hover:rotate-45"
              style={{
                background:
                  "conic-gradient(var(--wheel-1) 0deg 60deg, var(--wheel-2) 60deg 120deg, var(--wheel-3) 120deg 180deg, var(--wheel-4) 180deg 240deg, var(--wheel-5) 240deg 300deg, var(--wheel-6) 300deg 360deg)",
              }}
            />
            <h2 className="mt-6 text-xl font-semibold tracking-tight">
              Wheel of names
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Spin to pick a student for oral practice.
            </p>
          </Link>
        </div>
      </main>
    </AppChrome>
  );
}
