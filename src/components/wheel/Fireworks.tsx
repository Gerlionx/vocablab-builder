import { useEffect, useRef } from "react";

type Burst = {
  x: number;
  y: number;
  born: number;
  life: number;
  hue: number;
  particles: { a: number; v: number; s: number; drag: number }[];
};

/** Soft premium fireworks for the match-end overlay (canvas, projector-friendly). */
export function Fireworks({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const bursts: Burst[] = [];
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const palette = colors.length
      ? colors
      : ["oklch(0.84 0.16 88)", "oklch(0.92 0.04 95)", "#fff"];

    const spawn = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const count = 18 + Math.floor(Math.random() * 10);
      const particles = Array.from({ length: count }, () => ({
        a: Math.random() * Math.PI * 2,
        v: 1.6 + Math.random() * 3.8,
        s: 1.4 + Math.random() * 2.2,
        drag: 0.96 + Math.random() * 0.025,
      }));
      bursts.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: h * (0.12 + Math.random() * 0.38),
        born: now,
        life: 1100 + Math.random() * 700,
        hue: Math.floor(Math.random() * palette.length),
        particles,
      });
    };

    let lastSpawn = 0;
    const tick = (now: number) => {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (!reduced && now - lastSpawn > 380) {
        spawn(now);
        if (Math.random() > 0.45) spawn(now + 40);
        lastSpawn = now;
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]!;
        const age = now - b.born;
        if (age > b.life) {
          bursts.splice(i, 1);
          continue;
        }
        const t = age / b.life;
        const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        const color = palette[b.hue % palette.length]!;
        for (const p of b.particles) {
          const dist = p.v * age * 0.055 * Math.pow(p.drag, age * 0.05);
          const x = b.x + Math.cos(p.a) * dist;
          const y = b.y + Math.sin(p.a) * dist + age * age * 0.000045;
          const r = p.s * (1 - t * 0.65);
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.max(0, fade) * 0.9;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    // Opening salvo
    const t0 = performance.now();
    spawn(t0);
    spawn(t0 + 80);
    spawn(t0 + 160);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
