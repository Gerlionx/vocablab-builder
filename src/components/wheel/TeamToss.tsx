import { useEffect, useState } from "react";
import type { TeamColor } from "@/lib/team-colors";
import { playDrumroll, playTossReveal } from "@/lib/wheel-audio";

export function TeamToss({
  teams,
  winner,
  onDone,
}: {
  teams: TeamColor[];
  winner: number;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"spin" | "land">("spin");
  const [deg, setDeg] = useState(0);
  const pair = teams.length === 2;

  useEffect(() => {
    void playDrumroll(2600);
    const kick = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pair) {
          setDeg(5 * 360 + (winner === 1 ? 180 : 0));
          return;
        }
        const step = 360 / Math.max(1, teams.length);
        const mid = winner * step + step / 2;
        const landing = (90 - mid + 360) % 360;
        setDeg(5 * 360 + landing);
      });
    });
    const land = window.setTimeout(() => {
      setPhase("land");
      void playTossReveal();
    }, 2700);
    const done = window.setTimeout(onDone, 4200);
    return () => {
      cancelAnimationFrame(kick);
      window.clearTimeout(land);
      window.clearTimeout(done);
    };
  }, [onDone, pair, teams.length, winner]);

  const label = teams[winner]?.label ?? "Team";

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center">
      <p
        className="mb-10 font-kids font-semibold tracking-tight"
        style={{
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          color: phase === "land" ? teams[winner]?.fill : undefined,
        }}
      >
        {phase === "spin" ? "Who starts?" : `${label} starts`}
      </p>
      {pair ? (
        <div className="toss-scene">
          <div
            className="toss-coin"
            style={{
              transform: `rotateY(${deg}deg)`,
              transition: "transform 2.6s cubic-bezier(0.12, 0.72, 0.18, 1)",
            }}
          >
            <div
              className="toss-face toss-front"
              style={{ background: teams[0]?.fill, color: teams[0]?.ink }}
            >
              {teams[0]?.label}
            </div>
            <div
              className="toss-face toss-back"
              style={{ background: teams[1]?.fill, color: teams[1]?.ink }}
            >
              {teams[1]?.label}
            </div>
          </div>
        </div>
      ) : (
        <div className="toss-scene">
          <div className="relative size-[min(42vw,280px)]">
            <div
              className="size-full rounded-full shadow-2xl"
              style={{
                background: `conic-gradient(${teams
                  .map((t, i) => {
                    const a = (i / teams.length) * 360;
                    const b = ((i + 1) / teams.length) * 360;
                    return `${t.fill} ${a}deg ${b}deg`;
                  })
                  .join(", ")})`,
                transform: `rotate(${deg}deg)`,
                transition: "transform 2.6s cubic-bezier(0.12, 0.72, 0.18, 1)",
                boxShadow:
                  "0 24px 50px oklch(0.25 0.04 80 / 0.4), inset 0 3px 8px oklch(1 0 0 / 0.35)",
              }}
            />
            <div className="pointer-events-none absolute -right-1 top-1/2 size-0 -translate-y-1/2 border-y-[14px] border-r-[26px] border-y-transparent border-r-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
