import { useEffect, useRef } from "react";
import { computeFlowVideoRect, FLOW_MANIFEST, type FlowSlotId } from "../../data/flowManifest";
import { useReducedMotion } from "../../hooks/useReducedMotion";

type ScrollSequenceCanvasProps = {
  slot: FlowSlotId;
  /** Ref tracking normalized scroll progress in [0, 1] driven by parent section */
  progressRef: React.MutableRefObject<number>;
  /** Use shared Flow viewport projection (cover on desktop, seamless #070607 contain on mobile) */
  useHeroRect?: boolean;
  className?: string;
};

const pad4 = (n: number) => String(n).padStart(4, "0");

/**
 * Apple-style 60fps scroll-scrubbed canvas for Google Flow Veo WebP frame sequences.
 * Uses progressive 2-pass preloading + smooth damped interpolation so wheel scrolling glides seamlessly.
 */
export function ScrollSequenceCanvas({
  slot,
  progressRef,
  useHeroRect = false,
  className = "",
}: ScrollSequenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const spec = FLOW_MANIFEST[slot];
  const hasRealSequence = spec.frameCount > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasRealSequence) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let alive = true;
    let raf = 0;
    let pass2Timer = 0;
    let visible = true;
    let width = 1280;
    let height = 720;
    let dpr = 1;
    let smoothProgress = progressRef.current;
    let lastDrawnIdx = -1;

    const images: (HTMLImageElement | null)[] = new Array(spec.frameCount).fill(null);
    const loaded: boolean[] = new Array(spec.frameCount).fill(false);

    const drawImage = (img: HTMLImageElement) => {
      const iw = img.naturalWidth || spec.width;
      const ih = img.naturalHeight || spec.height;
      ctx.fillStyle = "#070607";
      ctx.fillRect(0, 0, width, height);

      if (useHeroRect) {
        const { dx, dy, dw, dh } = computeFlowVideoRect(width, height, iw, ih);
        ctx.drawImage(img, dx, dy, dw, dh);

        // Seamless edge feathering directly over the drawn 16:9 rect boundaries so bright
        // supernova smoke/flames melt softly into #070607 space with zero hard horizontal cutoff
        const fadeY = Math.max(44, dh * 0.28);
        if (dy > -2) {
          const topY = Math.max(0, dy - 2);
          const gTop = ctx.createLinearGradient(0, topY, 0, topY + fadeY);
          gTop.addColorStop(0, "rgba(7, 6, 7, 1)");
          gTop.addColorStop(0.28, "rgba(7, 6, 7, 0.78)");
          gTop.addColorStop(0.62, "rgba(7, 6, 7, 0.28)");
          gTop.addColorStop(1, "rgba(7, 6, 7, 0)");
          ctx.fillStyle = gTop;
          ctx.fillRect(0, topY, width, fadeY);
        }
        if (dy + dh < height + 2) {
          const botY = Math.min(height, dy + dh + 2);
          const gBot = ctx.createLinearGradient(0, botY - fadeY, 0, botY);
          gBot.addColorStop(0, "rgba(7, 6, 7, 0)");
          gBot.addColorStop(0.38, "rgba(7, 6, 7, 0.28)");
          gBot.addColorStop(0.72, "rgba(7, 6, 7, 0.78)");
          gBot.addColorStop(1, "rgba(7, 6, 7, 1)");
          ctx.fillStyle = gBot;
          ctx.fillRect(0, botY - fadeY, width, fadeY);
        }

        const fadeX = Math.max(28, dw * 0.14);
        if (dx > 1) {
          const gLeft = ctx.createLinearGradient(dx - 2, 0, dx + fadeX, 0);
          gLeft.addColorStop(0, "rgba(7, 6, 7, 1)");
          gLeft.addColorStop(0.55, "rgba(7, 6, 7, 0.35)");
          gLeft.addColorStop(1, "rgba(7, 6, 7, 0)");
          ctx.fillStyle = gLeft;
          ctx.fillRect(dx - 2, 0, fadeX + 2, height);
        }
        if (dx + dw < width - 1) {
          const rEdge = dx + dw + 2;
          const gRight = ctx.createLinearGradient(rEdge - fadeX, 0, rEdge, 0);
          gRight.addColorStop(0, "rgba(7, 6, 7, 0)");
          gRight.addColorStop(0.45, "rgba(7, 6, 7, 0.35)");
          gRight.addColorStop(1, "rgba(7, 6, 7, 1)");
          ctx.fillStyle = gRight;
          ctx.fillRect(rEdge - fadeX, 0, fadeX + 2, height);
        }
      } else {
        const scale = Math.max(width / iw, height / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (width - dw) * 0.5;
        const dy = (height - dh) * 0.5;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    };

    const findBestLoadedFrame = (targetIdx: number): HTMLImageElement | null => {
      if (loaded[targetIdx] && images[targetIdx]) return images[targetIdx];
      for (let offset = 1; offset < spec.frameCount; offset++) {
        const prev = targetIdx - offset;
        if (prev >= 0 && loaded[prev] && images[prev]) return images[prev];
        const next = targetIdx + offset;
        if (next < spec.frameCount && loaded[next] && images[next]) return images[next];
      }
      return null;
    };

    const render = (force = false) => {
      const target = Math.max(0, Math.min(1, progressRef.current));
      if (reducedMotion) {
        smoothProgress = target;
      } else {
        const diff = target - smoothProgress;
        smoothProgress = Math.abs(diff) < 0.0005 ? target : smoothProgress + diff * 0.12;
      }

      const idx = Math.min(
        spec.frameCount - 1,
        Math.max(0, Math.round(smoothProgress * (spec.frameCount - 1))),
      );

      if (force || idx !== lastDrawnIdx) {
        const img = findBestLoadedFrame(idx);
        if (img) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawImage(img);
          lastDrawnIdx = idx;
        }
      }

      const stillMoving = !reducedMotion && Math.abs(target - smoothProgress) >= 0.0005;
      if (alive && visible && stillMoving) {
        raf = requestAnimationFrame(() => render(false));
      } else {
        raf = 0;
      }
    };

    const schedule = (force = false) => {
      if (!alive || !visible) return;
      if (force) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (!raf) {
        raf = requestAnimationFrame(() => render(force));
      }
    };

    const loadFrame = (idx: number) => {
      if (!alive || images[idx]) return;
      const img = new Image();
      img.decoding = "async";
      img.src = spec.urlPattern.replace("{i}", pad4(idx + 1));
      images[idx] = img;
      img.onload = () => {
        if (!alive) return;
        loaded[idx] = true;
        if (idx === 0 || idx === spec.frameCount - 1 || Math.abs(idx - lastDrawnIdx) <= 6) {
          schedule(true);
        }
      };
    };

    // Pass 1: First frame, last frame, and every 5th keyframe for instant scrub clarity
    loadFrame(0);
    loadFrame(spec.frameCount - 1);
    for (let i = 5; i < spec.frameCount - 1; i += 5) loadFrame(i);

    // Pass 2: Silently hydrate all remaining intermediate frames
    pass2Timer = window.setTimeout(() => {
      if (!alive) return;
      for (let i = 1; i < spec.frameCount - 1; i++) {
        if (i % 5 !== 0) loadFrame(i);
      }
    }, 90);

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(240, box.width);
      height = Math.max(180, box.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      lastDrawnIdx = -1;
      schedule(true);
    };

    const onScroll = () => schedule(false);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule(true);
      },
      { rootMargin: "260px 0px" },
    );
    io.observe(canvas);

    resize();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(pass2Timer);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [hasRealSequence, progressRef, reducedMotion, spec.frameCount, spec.height, spec.urlPattern, spec.width, useHeroRect]);

  return <canvas ref={canvasRef} className={`flow-seq-canvas ${className}`} aria-hidden="true" />;
}
