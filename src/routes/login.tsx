import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { VocabLabLogo } from "@/components/VocabLabLogo";
import { beginTeacherSession } from "@/lib/teacher-session";
import { loginFn } from "@/lib/api/auth";

export const Route = createFileRoute("/login")({
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="vocablab-login-shell">
      <div className="vocablab-login-panel">
        <Link to="/" className="vocablab-login-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <VocabLabLogo />
        </Link>
        <p className="vocablab-login-kicker">Teacher sign in</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const email = (form.elements.namedItem("email") as HTMLInputElement).value;
            const password = (form.elements.namedItem("password") as HTMLInputElement).value;
            setBusy(true);
            setError(null);
            void (async () => {
              try {
                await loginFn({ data: { email, password } });
                beginTeacherSession();
                navigate({ to: "/home" });
              } catch (err) {
                console.error(err);
                setError("Invalid email or password");
              } finally {
                setBusy(false);
              }
            })();
          }}
          className="vocablab-login-form"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 ml-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm ring-1 ring-input transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="pb-1">
            <label htmlFor="password" className="mb-1.5 ml-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm ring-1 ring-input transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
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

        <Link
          to="/"
          className="mt-8 block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to VocabLab
        </Link>
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
