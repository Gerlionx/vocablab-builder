import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { VocabLabLogo } from "@/components/VocabLabLogo";
import { logoutFn } from "@/lib/api/auth";
import { endTeacherSession } from "@/lib/teacher-session";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      {children}
    </div>
  );
}

function TeacherBadgeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="11" rx="2.2" fill="currentColor" opacity="0.18" />
      <path
        d="M4.2 5.8h11.6M4.2 9h7.5M4.2 12.2h9.2"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <circle cx="15.2" cy="15.4" r="2.35" fill="var(--wheel-3)" />
      <path
        d="M15.2 14.15v2.5M14 15.4h2.4"
        stroke="oklch(0.32 0.06 250)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopBar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <nav
      className="flex items-center justify-between gap-3 px-4 py-4 sm:px-10 sm:py-6"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
    >
      <Link
        to="/home"
        className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="VocabLab home"
      >
        <VocabLabLogo />
      </Link>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="vocablab-teacher-zone"
          data-open={open ? "true" : "false"}
        >
          <span className="vocablab-teacher-zone-badge">
            <TeacherBadgeIcon />
          </span>
          <span className="vocablab-teacher-zone-copy font-kids">Teacher Zone</span>
          <span className="vocablab-teacher-zone-chevron" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.2 5.2 7 9l3.8-3.8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {open ? (
          <div role="menu" className="vocablab-teacher-menu">
            <Link
              to="/vocabulary"
              onClick={() => setOpen(false)}
              className="vocablab-teacher-menu-item"
            >
              <span className="vocablab-teacher-menu-title">Vocabulary</span>
              <span className="vocablab-teacher-menu-hint">Browse the bank</span>
            </Link>
            <Link
              to="/game-settings"
              onClick={() => setOpen(false)}
              className="vocablab-teacher-menu-item"
            >
              <span className="vocablab-teacher-menu-title">Create</span>
              <span className="vocablab-teacher-menu-hint">Lessons & modes</span>
            </Link>
            <Link
              to="/game-settings/images"
              onClick={() => setOpen(false)}
              className="vocablab-teacher-menu-item"
            >
              <span className="vocablab-teacher-menu-title">Images</span>
              <span className="vocablab-teacher-menu-hint">Picture library</span>
            </Link>
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="vocablab-teacher-menu-item"
            >
              <span className="vocablab-teacher-menu-title">Profile</span>
              <span className="vocablab-teacher-menu-hint">Password & account</span>
            </Link>
            <div className="vocablab-teacher-menu-rule" />
            <Link
              to="/"
              onClick={() => {
                void logoutFn();
                endTeacherSession();
                setOpen(false);
              }}
              className="vocablab-teacher-menu-item is-danger"
            >
              <span className="vocablab-teacher-menu-title">Log out</span>
              <span className="vocablab-teacher-menu-hint">End this session</span>
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
