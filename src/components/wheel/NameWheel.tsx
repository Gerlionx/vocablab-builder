import { polar, winnerIndex } from "@/lib/wheel-math";
import type { SlicePaint } from "@/lib/team-colors";

export type WheelSlice = {
  name: string;
} & SlicePaint;

export function NameWheel({
  slices,
  angle,
  clickerDeg = 0,
  motion,
  accent,
  namesVisible = true,
  hotGlow = true,
}: {
  slices: WheelSlice[];
  angle: number;
  clickerDeg?: number | undefined;
  motion?: "exit" | "enter" | "to-idle" | "desk-enter" | null;
  accent?: string | undefined;
  namesVisible?: boolean | undefined;
  hotGlow?: boolean | undefined;
}) {
  const n = Math.max(1, slices.length);
  const step = 360 / n;
  const hot = winnerIndex(angle, n);
  const fontSize = n > 14 ? 16 : n > 10 ? 19 : n > 6 ? 22 : 25;

  const paths = slices.map((slice, i) => {
    const start = i * step;
    const [x1, y1] = polar(200, 200, 198, start);
    const [x2, y2] = polar(200, 200, 198, start + step);
    const mid = start + step / 2;
    const [hx, hy] = polar(200, 200, 168, mid);
    return {
      ...slice,
      d: `M200 200 L${x1} ${y1} A198 198 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`,
      mid,
      hx,
      hy,
    };
  });
  const hotSlice = paths[hot];

  const pegs = Array.from({ length: n }, (_, i) => {
    const [x, y] = polar(200, 200, 193.5, i * step);
    return { x, y };
  });

  const anim =
    motion === "exit"
      ? "vocablab-wheel-exit 0.72s cubic-bezier(0.4, 0, 0.2, 1) both"
      : motion === "enter"
        ? "vocablab-wheel-enter 0.65s cubic-bezier(0.2, 1.1, 0.3, 1) both"
        : motion === "to-idle"
          ? "vocablab-wheel-to-idle 0.85s cubic-bezier(0.22, 1, 0.36, 1) both"
          : motion === "desk-enter"
            ? "vocablab-wheel-desk-enter 0.78s cubic-bezier(0.22, 1, 0.36, 1) both"
            : undefined;

  return (
    <div
      className="wheel-stage"
      style={{
        animation: anim,
        flexShrink: 0,
      }}
    >
      <div className="wheel-floor" />
      <div className="wheel-body">
        <div className="wheel-chrome">
          <div className="wheel-gleam" />
          <div className="wheel-inner">
            <svg
              viewBox="0 0 400 400"
              className="size-full"
              style={{ transform: `rotate(${angle}deg)` }}
              aria-hidden="true"
            >
              <defs>
                {hotSlice ? (
                  <radialGradient
                    id="wheel-hot-glow"
                    gradientUnits="userSpaceOnUse"
                    cx={hotSlice.hx}
                    cy={hotSlice.hy}
                    r="118"
                  >
                    <stop offset="0%" stopColor="oklch(1 0 0)" stopOpacity="0.58" />
                    <stop offset="38%" stopColor="oklch(1 0 0)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="oklch(1 0 0)" stopOpacity="0" />
                  </radialGradient>
                ) : null}
              </defs>
              {paths.map((s, i) => (
                <g key={`slice-${i}`}>
                  <path
                    d={s.d}
                    fill={s.fill}
                    stroke="oklch(1 0 0 / 0.16)"
                    strokeWidth="1.2"
                  />
                  {i === hot && hotGlow ? (
                    <path
                      className="wheel-hot-glow"
                      d={s.d}
                      fill="url(#wheel-hot-glow)"
                      stroke="none"
                    />
                  ) : null}
                  {s.name ? (
                    <text
                      className={namesVisible ? "wheel-slice-name" : "wheel-slice-name is-hidden"}
                      x="200"
                      y="200"
                      fill={s.ink}
                      stroke={s.stroke}
                      strokeWidth="5.5"
                      strokeLinejoin="round"
                      paintOrder="stroke"
                      fontSize={fontSize}
                      fontWeight="800"
                      fontFamily="Fredoka, Trebuchet MS, sans-serif"
                      textAnchor="end"
                      dominantBaseline="middle"
                      transform={`rotate(${s.mid - 90} 200 200) translate(176 0)`}
                    >
                      {s.name.length > 12 ? `${s.name.slice(0, 11)}…` : s.name}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
            <div className="wheel-glass" />
          </div>
          <svg
            className="wheel-pegs"
            viewBox="0 0 400 400"
            style={{ transform: `rotate(${angle}deg)` }}
            aria-hidden="true"
          >
            {pegs.map((peg, i) => (
              <circle key={i} cx={peg.x} cy={peg.y} r="2.8" fill="oklch(0.32 0.03 70)" />
            ))}
          </svg>
        </div>
      </div>
      <div className="wheel-pointer-wrap">
        <svg
          className="wheel-pointer"
          viewBox="0 0 180 52"
          aria-hidden="true"
          style={{ transform: `rotate(${clickerDeg}deg)` }}
        >
          <path
            d="M1 26 L 40 26 C 62 26, 86 14, 112 13 L 140 17 A 18 18 0 0 1 140 35 L 112 39 C 86 38, 62 26, 40 26 L 1 26 Z"
            fill={accent ?? "oklch(0.78 0.16 88)"}
            stroke="oklch(0.99 0.02 90)"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            d="M1 26 L 40 26 C 62 26, 86 14, 112 13 L 140 17 A 18 18 0 0 1 140 35 L 112 39 C 86 38, 62 26, 40 26 L 1 26 Z"
            fill="none"
            stroke="oklch(0.18 0.03 80)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle
            cx="158"
            cy="26"
            r="16"
            fill={accent ?? "oklch(0.78 0.16 88)"}
            stroke="oklch(0.99 0.02 90)"
            strokeWidth="3.2"
          />
          <circle
            cx="158"
            cy="26"
            r="16"
            fill="none"
            stroke="oklch(0.18 0.03 80)"
            strokeWidth="1.6"
          />
          <circle cx="152" cy="21" r="5.5" fill="oklch(1 0 0 / 0.4)" />
        </svg>
      </div>
    </div>
  );
}
