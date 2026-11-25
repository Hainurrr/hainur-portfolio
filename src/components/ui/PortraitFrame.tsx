import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

type PortraitFrameProps = {
  src: string;
  revealSrc?: string;
  width: number;
  height: number;
  alt: string;
};

/**
 * Background-free transparent studio portrait with a 60fps HTML5 2D Canvas spotlight reveal mask.
 * Uses pure Canvas compositing (`destination-out` + `destination-in`) so hover transformation works
 * reliably on every browser/GPU with zero background box or CSS mask-image repaint glitches.
 */
export function PortraitFrame({ src, revealSrc, width, height, alt }: PortraitFrameProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  const [lockedReveal, setLockedReveal] = useState(false);
  const lockedRef = useRef(false);
  lockedRef.current = lockedReveal;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const stateRef = useRef({
    tx: 170,
    ty: 170,
    cx: 170,
    cy: 170,
    cr: 0,
    hovering: false,
    raf: 0,
    w: 340,
    h: 425,
    dpr: 1,
  });

  const imgsRef = useRef<{
    base: HTMLImageElement | null;
    baseReady: boolean;
    reveal: HTMLImageElement | null;
    revealReady: boolean;
    tempCanvas: HTMLCanvasElement | null;
  }>({
    base: null,
    baseReady: false,
    reveal: null,
    revealReady: false,
    tempCanvas: null,
  });

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const st = stateRef.current;
    const imgs = imgsRef.current;
    const { w, h, dpr, cx, cy, cr } = st;
    const fullR = Math.hypot(w, h) * 1.12;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // 1. Draw transparent Hainur portrait cutout with gentle soft bottom fade (zero rectangular background)
    if (imgs.baseReady && imgs.base) {
      const iw = imgs.base.naturalWidth || width;
      const ih = imgs.base.naturalHeight || height;
      const drawH = h * 0.94;
      const drawW = (iw / ih) * drawH;
      const drawX = (w - drawW) * 0.5;
      const drawY = h - drawH + h * 0.015;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(imgs.base, drawX, drawY, drawW, drawH);

      // Feather bottom 9% softly into space so the blazer hem has no hard horizontal line
      ctx.globalCompositeOperation = "destination-out";
      const fadeGrad = ctx.createLinearGradient(0, h * 0.89, 0, h);
      fadeGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      fadeGrad.addColorStop(1, "rgba(0, 0, 0, 1)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, h * 0.89, w, h * 0.12);
      ctx.restore();
    }

    // 2. Spotlight transform: dissolve Hainur inside cursor radius & composite transparent STTGL cutout
    if (imgs.revealReady && imgs.reveal && cr > 0.6) {
      const isFull = lockedRef.current && cr >= fullR * 0.95;

      // Clear Hainur inside the active spotlight so STTGL replaces him cleanly
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      if (isFull) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
      } else {
        const eraseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        eraseGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
        eraseGrad.addColorStop(0.58, "rgba(0, 0, 0, 1)");
        eraseGrad.addColorStop(0.84, "rgba(0, 0, 0, 0.55)");
        eraseGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = eraseGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Prepare offscreen masked STTGL character layer
      if (!imgs.tempCanvas) {
        imgs.tempCanvas = document.createElement("canvas");
      }
      const tc = imgs.tempCanvas;
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (tc.width !== pw || tc.height !== ph) {
        tc.width = pw;
        tc.height = ph;
      }
      const tctx = tc.getContext("2d");
      if (tctx) {
        tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        tctx.clearRect(0, 0, w, h);

        const rw = imgs.reveal.naturalWidth || 680;
        const rh = imgs.reveal.naturalHeight || 850;
        const coverScale = Math.max(w / rw, h / rh);
        const rDrawW = rw * coverScale;
        const rDrawH = rh * coverScale;
        const rDrawX = (w - rDrawW) * 0.5;
        const rDrawY = (h - rDrawH) * 0.5;

        tctx.globalCompositeOperation = "source-over";
        tctx.drawImage(imgs.reveal, rDrawX, rDrawY, rDrawW, rDrawH);

        if (!isFull) {
          tctx.globalCompositeOperation = "destination-in";
          const maskGrad = tctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
          maskGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
          maskGrad.addColorStop(0.62, "rgba(0, 0, 0, 1)");
          maskGrad.addColorStop(0.86, "rgba(0, 0, 0, 0.48)");
          maskGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          tctx.fillStyle = maskGrad;
          tctx.beginPath();
          tctx.arc(cx, cy, cr, 0, Math.PI * 2);
          tctx.fill();
        }

        // Composite masked STTGL layer directly onto main canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(tc, 0, 0);
        ctx.restore();
      }

      // Subtle glowing spiral-energy halo around the moving spotlight perimeter
      if (!isFull && cr > 8) {
        const ringAlpha = Math.min(1, cr / 70) * 0.58;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 0.88, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(94, 234, 212, ${ringAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = "rgba(45, 212, 191, 0.55)";
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const kickLoop = () => {
    const st = stateRef.current;
    if (reducedRef.current) {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      const fullR = Math.hypot(st.w, st.h) * 1.12;
      const targetR = lockedRef.current ? fullR : st.hovering ? Math.max(115, st.w * 0.42) : 0;
      st.cx = st.tx;
      st.cy = st.ty;
      st.cr = targetR;
      drawFrame();
      return;
    }

    if (st.raf) return;
    const tick = () => {
      st.raf = 0;
      const fullR = Math.hypot(st.w, st.h) * 1.12;
      const targetR = lockedRef.current ? fullR : st.hovering ? Math.max(115, st.w * 0.42) : 0;

      st.cx += (st.tx - st.cx) * 0.24;
      st.cy += (st.ty - st.cy) * 0.24;
      st.cr += (targetR - st.cr) * 0.18;

      const settled =
        Math.abs(st.tx - st.cx) < 0.35 &&
        Math.abs(st.ty - st.cy) < 0.35 &&
        Math.abs(targetR - st.cr) < 0.4;

      if (settled) {
        st.cx = st.tx;
        st.cy = st.ty;
        st.cr = targetR;
      }

      drawFrame();

      if (!settled) {
        st.raf = requestAnimationFrame(tick);
      }
    };

    st.raf = requestAnimationFrame(tick);
  };

  // Load both transparent cutout images and bind ResizeObserver + bulletproof global pointer tracking
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let alive = true;
    const imgs = imgsRef.current;
    const st = stateRef.current;

    const baseImg = new Image();
    baseImg.decoding = "async";
    imgs.base = baseImg;
    imgs.baseReady = false;
    baseImg.onload = () => {
      if (!alive) return;
      imgs.baseReady = true;
      drawFrame();
    };
    baseImg.src = src;
    if (baseImg.complete && baseImg.naturalWidth > 0) {
      imgs.baseReady = true;
    }

    if (revealSrc) {
      const revImg = new Image();
      revImg.decoding = "async";
      imgs.reveal = revImg;
      imgs.revealReady = false;
      revImg.onload = () => {
        if (!alive) return;
        imgs.revealReady = true;
        drawFrame();
      };
      revImg.src = revealSrc;
      if (revImg.complete && revImg.naturalWidth > 0) {
        imgs.revealReady = true;
      }
    }

    const syncSize = () => {
      const box = stage.getBoundingClientRect();
      const nw = Math.max(160, Math.round(box.width));
      const nh = Math.max(200, Math.round(box.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      st.w = nw;
      st.h = nh;
      st.dpr = dpr;
      canvas.width = Math.round(nw * dpr);
      canvas.height = Math.round(nh * dpr);
      drawFrame();
    };

    const ro = new ResizeObserver(syncSize);
    ro.observe(stage);
    syncSize();

    const supportsHover =
      typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;

    // Global mouse/pointer check on hover-capable devices guarantees hover works even when scrolling under a resting cursor
    const handleGlobalMove = (e: MouseEvent | PointerEvent) => {
      if (!supportsHover) return;
      if ("pointerType" in e && e.pointerType === "touch") return;
      const box = stage.getBoundingClientRect();
      const inside =
        e.clientX >= box.left &&
        e.clientX <= box.right &&
        e.clientY >= box.top &&
        e.clientY <= box.bottom;

      if (inside) {
        const x = e.clientX - box.left;
        const y = e.clientY - box.top;
        const wasHovering = st.hovering;
        st.tx = x;
        st.ty = y;
        if (!wasHovering && st.cr < 2) {
          st.cx = x;
          st.cy = y;
        }
        st.hovering = true;
        kickLoop();
      } else if (st.hovering) {
        st.hovering = false;
        kickLoop();
      }
    };

    if (supportsHover) {
      window.addEventListener("pointermove", handleGlobalMove, { passive: true });
      window.addEventListener("mousemove", handleGlobalMove, { passive: true });
    }

    return () => {
      alive = false;
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      ro.disconnect();
      if (supportsHover) {
        window.removeEventListener("pointermove", handleGlobalMove);
        window.removeEventListener("mousemove", handleGlobalMove);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, revealSrc]);

  useEffect(() => {
    kickLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedReveal, reducedMotion]);

  const updateLocal = (clientX: number, clientY: number, isEnter: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    const box = stage.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    const st = stateRef.current;
    st.tx = x;
    st.ty = y;
    if (isEnter && st.cr < 2) {
      st.cx = x;
      st.cy = y;
    }
    st.hovering = true;
    kickLoop();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    updateLocal(e.clientX, e.clientY, false);
  };

  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && !window.matchMedia?.("(hover: hover)").matches) return;
    updateLocal(e.clientX, e.clientY, false);
  };

  const onLeave = () => {
    stateRef.current.hovering = false;
    kickLoop();
  };

  const toggleReveal = () => {
    if (!revealSrc) return;
    const st = stateRef.current;
    if (!st.hovering) {
      st.tx = st.w * 0.5;
      st.ty = st.h * 0.36;
      if (st.cr < 2) {
        st.cx = st.tx;
        st.cy = st.ty;
      }
    }
    setLockedReveal((v) => !v);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleReveal();
    }
  };

  return (
    <figure className="dossier-photo">
      <div
        ref={stageRef}
        className={`dossier-stage ${revealSrc ? "has-reveal" : ""}`}
        role={revealSrc ? "button" : undefined}
        tabIndex={revealSrc ? 0 : undefined}
        aria-pressed={revealSrc ? lockedReveal : undefined}
        aria-label={alt}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") updateLocal(e.clientX, e.clientY, true);
        }}
        onPointerMove={onPointerMove}
        onMouseMove={onMouseMove}
        onPointerLeave={onLeave}
        onMouseLeave={onLeave}
        onClick={toggleReveal}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvasRef} className="dossier-canvas" aria-hidden="true" />
        <img src={src} width={width} height={height} alt={alt} className="sr-only" />
      </div>
    </figure>
  );
}
