import { useEffect, useRef } from "react";

const SPARK_COLORS = [
  "#f0f9ff",
  "#dbeafe",
  "#93c5fd",
  "#60a5fa",
  "#38bdf8",
  "#7dd3fc",
  "#bae6fd",
  "#ffffff",
];

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  kind: "star" | "cross";
};

function paintSpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
  color: string,
  alpha: number,
  kind: "star" | "cross",
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (kind === "cross") {
    ctx.lineWidth = Math.max(1.1, r * 0.22);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
  } else {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.lineTo(0, -r);
      ctx.lineTo(r * 0.22, -r * 0.22);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Slim primary bar with Christmas sparks travelling left → right. */
export function FuseWire({
  seconds,
  paused,
  resetKey,
}: {
  seconds: number;
  paused: boolean;
  resetKey: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const wrap = wrapRef.current;
    const fill = fillRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !fill || !canvas || !ctx) return;

    let cancelled = false;
    let raf = 0;
    const sparks: Spark[] = [];
    const duration = Math.max(0.2, seconds) * 1000;
    let start = performance.now();
    let frozen = 0;
    let last = performance.now();
    let spawnAcc = 0;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const spawn = (x: number, y: number) => {
      const n = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.25) * 70,
          vy: -20 - Math.random() * 70,
          life: 0,
          max: 0.28 + Math.random() * 0.42,
          size: 2.8 + Math.random() * 6.5,
          color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0]!,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 12,
          kind: Math.random() < 0.4 ? "cross" : "star",
        });
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (pausedRef.current) start = now - frozen;
      else frozen = Math.min(duration, now - start);

      const t = frozen / duration;
      const pad = canvas.width * 0.02;
      const track = Math.max(1, canvas.width - pad * 2);
      const cx = pad + t * track;
      const cy = canvas.height * 0.72;

      fill.style.width = `${Math.max(0.5, t * 100)}%`;

      if (!pausedRef.current && t < 1) {
        spawnAcc += dt;
        while (spawnAcc > 0.032) {
          spawnAcc -= 0.032;
          spawn(cx, cy);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26 * dpr);
      glow.addColorStop(0, "rgba(255,255,255,0.95)");
      glow.addColorStop(0.22, "rgba(125, 211, 252, 0.85)");
      glow.addColorStop(0.55, "rgba(56, 148, 210, 0.45)");
      glow.addColorStop(1, "rgba(40, 100, 180, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 26 * dpr, 0, Math.PI * 2);
      ctx.fill();
      paintSpark(ctx, cx, cy, 9 * dpr, now / 180, "#f0f9ff", 1, "star");
      paintSpark(ctx, cx, cy, 6.5 * dpr, now / 140, "#7dd3fc", 0.95, "cross");

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 90 * dt;
        s.rot += s.vr * dt;
        const k = 1 - s.life / s.max;
        if (k <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        paintSpark(ctx, s.x, s.y, s.size * dpr * (0.5 + k), s.rot, s.color, Math.max(0, k), s.kind);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [seconds, resetKey]);

  return (
    <div ref={wrapRef} className="vocablab-fuse" data-paused={paused ? "true" : "false"}>
      <div className="vocablab-fuse-track">
        <div ref={fillRef} className="vocablab-fuse-fill" />
      </div>
      <canvas ref={canvasRef} className="vocablab-fuse-sparks" />
    </div>
  );
}
