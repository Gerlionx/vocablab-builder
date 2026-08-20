import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/set-password")({
  head: () => ({
    meta: [
      { title: "Set your password — Vocablab" },
      {
        name: "description",
        content:
          "Invited teachers choose a password here to finish joining the Vocablab department account.",
      },
      { property: "og:title", content: "Set your password — Vocablab" },
      {
        property: "og:description",
        content:
          "Invited teachers choose a password here to finish joining the Vocablab department account.",
      },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-medium tracking-tight">
          Set your password
        </h1>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          You have been invited to Vocablab.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/" });
          }}
          className="space-y-4 rounded-3xl bg-surface/60 p-8 ring-1 ring-border"
        >
          <div>
            <label
              htmlFor="invited-email"
              className="mb-1.5 ml-1 block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="invited-email"
              type="email"
              readOnly
              value="david.smith@school.ac.uk"
              className="w-full cursor-not-allowed rounded-xl bg-surface px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-input"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 ml-1 block text-sm font-medium"
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="pb-2">
            <label
              htmlFor="confirm-password"
              className="mb-1.5 ml-1 block text-sm font-medium"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:opacity-90 active:scale-[0.99]"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
