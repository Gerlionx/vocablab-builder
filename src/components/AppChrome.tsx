import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { endTeacherSession } from "@/lib/teacher-session";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      {children}
    </div>
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
    <nav className="flex items-center justify-between px-6 py-6 sm:px-10">
      <Link
        to="/home"
        className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground"
      >
        Vocablab
      </Link>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-accent"
        >
          Dorina
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-popover py-1.5 shadow-xl ring-1 ring-border"
          >
            <Link
              to="/game-settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-popover-foreground transition-colors hover:bg-muted"
            >
              Create
            </Link>
            <Link
              to="/vocabulary"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-popover-foreground transition-colors hover:bg-muted"
            >
              Vocabulary
            </Link>
            <div className="my-1 h-px bg-border" />
            <Link
              to="/"
              onClick={() => {
                endTeacherSession();
                setOpen(false);
              }}
              className="block px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-muted"
            >
              Log out
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
