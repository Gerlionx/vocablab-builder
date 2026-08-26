import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  endTeacherSession,
  isPublicPath,
  isTeacherIdleExpired,
  isTeacherSessionActive,
  touchTeacherActivity,
} from "@/lib/teacher-session";

/**
 * Keeps the teacher login alive on activity, boots idle logouts (~15 min),
 * and sends unauthenticated users back to the login screen.
 */
export function SessionGuard() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const publicRoute = isPublicPath(pathname);

    if (!publicRoute && !isTeacherSessionActive()) {
      navigate({ to: "/" });
      return;
    }

    if (publicRoute) return;

    const onActivity = () => touchTeacherActivity();
    const windowEvents = ["pointerdown", "keydown", "mousemove", "touchstart", "scroll"] as const;
    for (const ev of windowEvents) window.addEventListener(ev, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onActivity);

    const tick = window.setInterval(() => {
      if (isTeacherIdleExpired()) {
        endTeacherSession();
        navigate({ to: "/" });
      }
    }, 10_000);

    return () => {
      for (const ev of windowEvents) window.removeEventListener(ev, onActivity);
      document.removeEventListener("visibilitychange", onActivity);
      window.clearInterval(tick);
    };
  }, [navigate, pathname]);

  return null;
}
