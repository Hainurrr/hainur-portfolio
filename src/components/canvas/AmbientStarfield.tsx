import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

type DustPoint = {
  x: number;
  y: number;
  r: number;
  a: number;
  depth: number;
  phase: number;
  warm: boolean;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  len: number;
};

/**
 * Multi-depth cosmic starfield fixed softly behind the obsidian canvas.
 * Drifts subtly with scroll parallax and spawns occasional faint solar meteors.
 */
export function AmbientStarfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points: DustPoint[] = Array.from({ length: 125 }, (_, i) => {
      const h1 = Math.abs(Math.sin(i * 15.731 + 2.31) * 41234.567) % 1;
      const h2 = Math.abs(Math.sin(i * 67.419 + 5.12) * 28912.345) % 1;
      const h3 = Math.abs(Math.sin(i * 31.113 + 7.77) * 17321.987) % 1;
      const layer = i % 3;
      return {
        x: h1,
        y: h2,
        r: 0.45 + h3 * (layer === 2 ? 1.25 : 0.85),
        a: 0.08 + (i % 6) * 0.04,
        depth: layer === 0 ? 0.05 : layer === 1 ? 0.12 : 0.22,
        phase: i * 1.17,
        warm: i % 3 !== 0,
      };
    });

    let alive = true;
    let raf = 0;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let scrollY = window.scrollY;
    let smoothScroll = scrollY;
    let nextMeteorAt = performance.now() + 3600;
    let meteor: ShootingStar | null = null;
    const t0 = performance.now();

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      drawStatic();
    };

    const drawStatic = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const p of points) {
        ctx.fillStyle = p.warm ? "#f8c97a" : "#e7ded4";
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (reducedMotion) {
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }

    const frame = (now: number) => {
      raf = 0;
      if (!alive || document.hidden) return;
      const elapsed = (now - t0) / 1000;
      smoothScroll += (scrollY - smoothScroll) * 0.1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const px = p.x * w;
        const rawY = (p.y * h - smoothScroll * p.depth) % h;
        const py = rawY < 0 ? rawY + h : rawY;
        const twinkle = 0.72 + 0.28 * Math.sin(elapsed * 0.9 + p.phase);

        ctx.fillStyle = p.warm ? "#f8c97a" : "#e7ded4";
        ctx.globalAlpha = p.a * twinkle;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional delicate solar shooting star across upper sky
      if (!meteor && now >= nextMeteorAt) {
        const startX = w * (0.18 + Math.random() * 0.64);
        const startY = h * (0.06 + Math.random() * 0.28);
        meteor = {
          x: startX,
          y: startY,
          vx: 8.5 + Math.random() * 3.5,
          vy: 3.2 + Math.random() * 1.8,
          life: 0,
          maxLife: 38 + Math.random() * 16,
          len: 76 + Math.random() * 44,
        };
      }

      if (meteor) {
        meteor.life += 1;
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        const t = meteor.life / meteor.maxLife;
        const alpha = Math.sin(Math.min(1, t) * Math.PI) * 0.55;
        const speed = Math.hypot(meteor.vx, meteor.vy) || 1;
        const tx = meteor.x - (meteor.vx / speed) * meteor.len;
        const ty = meteor.y - (meteor.vy / speed) * meteor.len;

        const grad = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty);
        grad.addColorStop(0, `rgba(254, 240, 199, ${alpha.toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(245, 158, 11, ${(alpha * 0.55).toFixed(3)})`);
        grad.addColorStop(1, "rgba(245, 158, 11, 0)");

        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.25;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        if (meteor.life >= meteor.maxLife) {
          meteor = null;
          nextMeteorAt = now + 7200 + Math.random() * 6800;
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };

    const onVis = () => {
      if (!document.hidden && !raf && alive) {
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reducedMotion]);

  return <canvas ref={ref} className="ambient-dust" aria-hidden="true" />;
}
