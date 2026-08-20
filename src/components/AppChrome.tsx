import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

      <div className="flex items-center gap-7">
        <Link
          to="/vocabulary"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "text-foreground" }}
        >
          Vocabulary
        </Link>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface active:bg-accent"
          >
            Marie
          </button>
          {open ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl bg-popover py-1.5 shadow-xl ring-1 ring-border"
            >
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-popover-foreground transition-colors hover:bg-surface"
              >
                Invite teacher
              </Link>
              <div className="my-1 h-px bg-line" />
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-surface"
              >
                Log out
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
