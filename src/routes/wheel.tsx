import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SEED_NAMES } from "@/lib/vocab-data";

export const Route = createFileRoute("/wheel")({
  head: () => ({
    meta: [
      { title: "Wheel of names — Vocablab" },
      {
        name: "description",
        content:
          "A big, colourful, projector-friendly wheel of names for picking a student at random in class.",
      },
      { property: "og:title", content: "Wheel of names — Vocablab" },
      {
        property: "og:description",
        content:
          "A big, colourful, projector-friendly wheel of names for picking a student at random in class.",
      },
    ],
  }),
  component: WheelPage,
});

const WHEEL_COLOURS = [
  "var(--wheel-1)",
  "var(--wheel-2)",
  "var(--wheel-3)",
  "var(--wheel-4)",
  "var(--wheel-5)",
  "var(--wheel-6)",
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

function WheelPage() {
  const [raw, setRaw] = useState(SEED_NAMES.join("\n"));
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const names = useMemo(() => {
    const list = raw
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    return list.length ? list : ["Add names"];
  }, [raw]);

  const segments = useMemo(() => {
    const step = 360 / names.length;
    return names.map((name, i) => {
      const start = i * step;
      const end = start + step;
      const [x1, y1] = polar(200, 200, 195, start);
      const [x2, y2] = polar(200, 200, 195, end);
      const large = step > 180 ? 1 : 0;
      return {
        name,
        fill: WHEEL_COLOURS[i % WHEEL_COLOURS.length],
        d: `M200 200 L${x1} ${y1} A195 195 0 ${large} 1 ${x2} ${y2} Z`,
        mid: start + step / 2,
      };
    });
  }, [names]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1.4fr_1fr]">
      {/* Stage */}
      <div className="relative flex flex-col items-center justify-center bg-surface/60 px-6 py-16">
        <Link
          to="/create"
          className="absolute left-6 top-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back
        </Link>

        <h1 className="mb-8 text-3xl font-medium tracking-tight">
          Wheel of names
        </h1>

        <div className="relative aspect-square w-full max-w-[540px]">
          <svg
            viewBox="0 0 400 400"
            className="size-full drop-shadow-2xl"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning
                ? "transform 4.2s cubic-bezier(0.15, 0, 0.15, 1)"
                : undefined,
            }}
            onTransitionEnd={() => setSpinning(false)}
            aria-hidden="true"
          >
            <circle cx="200" cy="200" r="199" fill="var(--primary)" />
            {segments.map((s, i) => (
              <g key={`${s.name}-${i}`}>
                <path d={s.d} fill={s.fill} stroke="var(--background)" strokeWidth="2" />
                <text
                  x="200"
                  y="200"
                  fill="var(--foreground)"
                  fontSize="17"
                  fontWeight="700"
                  textAnchor="end"
                  dominantBaseline="middle"
                  transform={`rotate(${s.mid - 90} 200 200) translate(178 0)`}
                >
                  {s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name}
                </text>
              </g>
            ))}
            <circle
              cx="200"
              cy="200"
              r="26"
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth="6"
            />
          </svg>

          {/* Pointer */}
          <div className="pointer-events-none absolute -right-2 top-1/2 size-0 -translate-y-1/2 border-y-[18px] border-r-[30px] border-y-transparent border-r-primary" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (spinning) return;
            setSpinning(true);
            setAngle((a) => a + 1440 + Math.floor(Math.random() * 360));
          }}
          className="mt-12 rounded-full bg-primary px-16 py-6 text-2xl font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-ring focus:ring-offset-8 focus:ring-offset-background active:scale-95 disabled:opacity-60"
          disabled={spinning}
        >
          {spinning ? "Spinning…" : "Spin"}
        </button>
      </div>

      {/* Roster */}
      <div className="flex flex-col px-8 py-10">
        <label
          htmlFor="roster"
          className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Student names
        </label>
        <textarea
          id="roster"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste one name per line…"
          className="min-h-[50vh] flex-1 resize-none rounded-2xl bg-surface/60 p-6 font-serif text-lg leading-relaxed ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-4 max-w-[40ch] text-xs text-muted-foreground">
          One name per line. Names are placed around the wheel automatically.
        </p>
      </div>
    </div>
  );
}
