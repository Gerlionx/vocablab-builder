import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppChrome } from "@/components/AppChrome";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account & invitations — Vocablab" },
      {
        name: "description",
        content:
          "Invite a colleague to Vocablab and see which invitations are pending or accepted.",
      },
      { property: "og:title", content: "Account & invitations — Vocablab" },
      {
        property: "og:description",
        content:
          "Invite a colleague to Vocablab and see which invitations are pending or accepted.",
      },
    ],
  }),
  component: AccountPage,
});

type Invite = { email: string; status: "Pending" | "Accepted" };

const SEED: Invite[] = [
  { email: "david.smith@school.ac.uk", status: "Pending" },
  { email: "sarah.jones@school.ac.uk", status: "Accepted" },
  { email: "h.patel@school.ac.uk", status: "Accepted" },
];

function AccountPage() {
  const [invites, setInvites] = useState<Invite[]>(SEED);
  const [email, setEmail] = useState("");

  return (
    <AppChrome>
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-8">
        <Link
          to="/home"
          className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>
        <h1 className="text-4xl font-medium tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as Marie · marie.claire@school.ac.uk
        </p>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            Invite a teacher
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              setInvites((prev) => [
                { email: email.trim(), status: "Pending" },
                ...prev,
              ]);
              setEmail("");
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@school.ac.uk"
              className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:opacity-90 active:scale-[0.98]"
            >
              Send
            </button>
          </form>
        </section>

        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Invitations
          </h2>
          <ul className="mt-4">
            {invites.map((inv) => (
              <li
                key={inv.email}
                className="flex items-center justify-between border-b border-line py-3.5"
              >
                <span className="text-sm font-medium">{inv.email}</span>
                <span className="flex items-center gap-3">
                  {inv.status === "Pending" ? (
                    <>
                      <Link
                        to="/set-password"
                        className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
                      >
                        Accept invite
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        Pending
                      </span>
                    </>
                  ) : (
                    <span className="rounded-md bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      Accepted
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16">
          <Link
            to="/"
            className="text-sm font-medium text-destructive transition-opacity hover:opacity-80"
          >
            Log out
          </Link>
        </div>
      </main>
    </AppChrome>
  );
}
