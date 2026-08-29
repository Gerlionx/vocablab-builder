import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { endTeacherSession } from "@/lib/teacher-session";
import {
  changeEmailFn,
  changePasswordFn,
  getSessionFn,
  logoutFn,
} from "@/lib/api/auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Profile — Vocablab" },
      {
        name: "description",
        content: "Manage your Vocablab teacher profile, email, and password.",
      },
      { property: "og:title", content: "Profile — Vocablab" },
      {
        property: "og:description",
        content: "Manage your Vocablab teacher profile, email, and password.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [profile, setProfile] = useState<{ email: string; displayName: string } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    void getSessionFn().then((t) => {
      if (t) {
        setProfile({ email: t.email, displayName: t.displayName });
        setNewEmail(t.email);
      }
    });
  }, []);

  return (
    <AppChrome>
      <main className="mx-auto max-w-lg px-6 pb-24 pt-8">
        <Link
          to="/home"
          className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>
        <h1 className="text-4xl font-medium tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile?.displayName ?? "Teacher"}
          {profile?.email ? ` · ${profile.email}` : ""}
        </p>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Change email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the address you use to sign in. Confirm with your current password.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setEmailMsg(null);
              setEmailError(null);
              const trimmed = newEmail.trim();
              if (!trimmed.includes("@")) {
                setEmailError("Enter a valid email address.");
                return;
              }
              setEmailBusy(true);
              void (async () => {
                try {
                  const result = await changeEmailFn({
                    data: { newEmail: trimmed, currentPassword: emailPassword },
                  });
                  setProfile((p) =>
                    p ? { ...p, email: result.email } : { email: result.email, displayName: "Teacher" },
                  );
                  setNewEmail(result.email);
                  setEmailPassword("");
                  setEmailMsg("Email updated.");
                } catch (err) {
                  const status = err instanceof Response ? err.status : 0;
                  if (status === 409) setEmailError("That email is already in use.");
                  else if (status === 400) setEmailError("Check the email and your current password.");
                  else setEmailError("Could not update email. Check your password and try again.");
                } finally {
                  setEmailBusy(false);
                }
              })();
            }}
          >
            <div>
              <label htmlFor="new-email" className="mb-1.5 ml-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="new-email"
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="email-password" className="mb-1.5 ml-1 block text-sm font-medium">
                Current password
              </label>
              <input
                id="email-password"
                type="password"
                autoComplete="current-password"
                required
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={emailBusy}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {emailBusy ? "Saving…" : "Save email"}
            </button>
            {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
            {emailMsg ? <p className="text-sm text-success">{emailMsg}</p> : null}
          </form>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your current password, then choose a new one (at least 8 characters).
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPwMsg(null);
              setPwError(null);
              if (newPassword !== confirmPassword) {
                setPwError("New passwords do not match.");
                return;
              }
              if (newPassword.length < 8) {
                setPwError("New password must be at least 8 characters.");
                return;
              }
              setPwBusy(true);
              void (async () => {
                try {
                  await changePasswordFn({
                    data: { currentPassword, newPassword },
                  });
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPwMsg("Password updated.");
                } catch {
                  setPwError("Could not update password. Check your current password.");
                } finally {
                  setPwBusy(false);
                }
              })();
            }}
          >
            <div>
              <label htmlFor="current-password" className="mb-1.5 ml-1 block text-sm font-medium">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 ml-1 block text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 ml-1 block text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={pwBusy}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pwBusy ? "Saving…" : "Save password"}
            </button>
            {pwError ? <p className="text-sm text-destructive">{pwError}</p> : null}
            {pwMsg ? <p className="text-sm text-success">{pwMsg}</p> : null}
          </form>
        </section>

        <div className="mt-16">
          <Link
            to="/"
            onClick={() => {
              void logoutFn();
              endTeacherSession();
            }}
            className="text-sm font-medium text-destructive transition-opacity hover:opacity-80"
          >
            Log out
          </Link>
        </div>
      </main>
    </AppChrome>
  );
}
