import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Log in — Vocablab" },
      {
        name: "description",
        content:
          "Log in to Vocablab, the calm French vocabulary and classroom activity tool for secondary teachers.",
      },
      { property: "og:title", content: "Log in — Vocablab" },
      {
        property: "og:description",
        content:
          "Log in to Vocablab, the calm French vocabulary and classroom activity tool for secondary teachers.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [forgot, setForgot] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center text-2xl font-medium tracking-tight">
          Vocablab
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/home" });
          }}
          className="space-y-4 rounded-3xl bg-surface/60 p-8 ring-1 ring-border"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 ml-1 block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              defaultValue="marie.claire@school.ac.uk"
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm ring-1 ring-input transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="pb-2">
            <label
              htmlFor="password"
              className="mb-1.5 ml-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              defaultValue="password"
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm ring-1 ring-input transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:opacity-90 active:scale-[0.99]"
          >
            Log in
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setForgot(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>

      {forgot ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-popover p-8 text-center shadow-2xl ring-1 ring-border">
            <p className="text-lg font-medium">Not available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Password resets will arrive in a later version of Vocablab.
            </p>
            <button
              type="button"
              onClick={() => setForgot(false)}
              className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Back to log in
            </button>
          </div>
        </div>
      ) : null}

      <p className="sr-only">
        <Link to="/set-password">Set password</Link>
      </p>
    </div>
  );
}
