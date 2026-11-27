import {
  ArrowCounterClockwise,
  ArrowUpRight,
  LockSimple,
  X,
} from "@phosphor-icons/react";
import anime from "animejs";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { PROFILE, t, UI_COPY, type Locale } from "../data/portfolio";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  attachMagnetic,
  attachSpotlight,
  bindSectionRule,
  clearAnimated,
  EASE_CALM,
  EASE_OUT_EXPO,
  markAnimating,
  observeScrollItems,
  primeBelowFold,
} from "../lib/motion";

type HonorsJourneyProps = {
  lang: Locale;
};

type CursorPhase = "roam" | "clicking" | "open";

type RoamBounds = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  isCompact: boolean;
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export function HonorsJourney({ lang }: HonorsJourneyProps) {
  const cursorGradId = useId();
  const ruleRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  // Single unified floating cursor button + inner scale wrapper (tip anchored strictly at transform origin)
  const cursorRef = useRef<HTMLButtonElement>(null);
  const cursorBodyRef = useRef<HTMLSpanElement>(null);
  const catchRingRef = useRef<HTMLSpanElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);

  const loadBarRef = useRef<HTMLSpanElement>(null);
  const standbyRef = useRef<HTMLDivElement>(null);
  const pageStageRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);

  const demoTlRef = useRef<anime.AnimeTimelineInstance | null>(null);
  const glideRafRef = useRef<number | null>(null);
  const exitRafRef = useRef<number | null>(null);
  const roamRafRef = useRef<number | null>(null);

  // Live physics & roaming state (zero React re-renders per frame)
  const phaseRef = useRef<CursorPhase>("roam");
  const visibleRef = useRef(true);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const boundsRef = useRef<RoamBounds | null>(null);
  const clockRef = useRef(0.6);
  const speedScaleRef = useRef(1);
  const hoverScaleRef = useRef(1);
  const posRef = useRef({ x: 260, y: 92 });
  const velRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef(0);
  const emergeRef = useRef<{
    active: boolean;
    elapsed: number;
    duration: number;
    fromX: number;
    fromY: number;
  }>({ active: false, elapsed: 0, duration: 0.65, fromX: 0, fromY: 0 });

  const reducedMotion = useReducedMotion();
  // Always starts CLOSED before the user catches & clicks the floating cursor
  const [windowOpen, setWindowOpen] = useState(false);
  const [phase, setPhase] = useState<CursorPhase>("roam");

  const setCursorPhase = useCallback((next: CursorPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const applyCursorPose = useCallback(
    (x: number, y: number, rotDeg: number, bodyScale = 1, opacity?: number) => {
      const el = cursorRef.current;
      const body = cursorBodyRef.current;
      if (el) {
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotDeg.toFixed(2)}deg)`;
        if (opacity !== undefined) {
          el.style.opacity = String(opacity);
        }
      }
      if (body) {
        body.style.transform = `scale(${bodyScale.toFixed(3)})`;
      }
    },
    [],
  );

  const measureGeometry = useCallback(() => {
    const layout = layoutRef.current;
    const cta = ctaRef.current;
    const slot = slotRef.current;
    if (!layout || !cta || !slot) return null;

    const layoutRect = layout.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();

    const clickX = ctaRect.left - layoutRect.left + ctaRect.width * 0.52;
    const clickY = ctaRect.top - layoutRect.top + ctaRect.height * 0.54;

    const isTwoCol = slotRect.left > ctaRect.left + 80 && slotRect.height > 120;

    let bounds: RoamBounds;
    if (isTwoCol) {
      const minX = Math.max(ctaRect.right - layoutRect.left + 44, slotRect.left - layoutRect.left + 46);
      const maxX = Math.max(minX + 80, layoutRect.width - 54);
      const minY = Math.max(36, slotRect.top - layoutRect.top + 42);
      const maxY = Math.max(minY + 72, layoutRect.height - 52);
      bounds = {
        cx: (minX + maxX) * 0.5,
        cy: (minY + maxY) * 0.5,
        rx: Math.min(205, (maxX - minX) * 0.44),
        ry: Math.min(92, (maxY - minY) * 0.42),
        isCompact: false,
      };
    } else {
      const ctaRight = ctaRect.right - layoutRect.left;
      const ctaCenterY = ctaRect.top - layoutRect.top + ctaRect.height * 0.5;
      const availRight = layoutRect.width - ctaRight - 28;

      if (availRight >= 84) {
        const minX = ctaRight + 28;
        const maxX = layoutRect.width - 30;
        bounds = {
          cx: (minX + maxX) * 0.5,
          cy: ctaCenterY,
          rx: Math.min(72, Math.max(20, (maxX - minX) * 0.4)),
          ry: 20,
          isCompact: true,
        };
      } else {
        const minX = 36;
        const maxX = Math.max(minX + 60, layoutRect.width - 36);
        bounds = {
          cx: (minX + maxX) * 0.5,
          cy: ctaRect.bottom - layoutRect.top + 36,
          rx: (maxX - minX) * 0.36,
          ry: 14,
          isCompact: true,
        };
      }
    }

    const slotVisible = slotRect.height > 40;
    const originX = slotVisible
      ? ctaRect.left + ctaRect.width * 0.5 - (slotRect.left + slotRect.width * 0.5)
      : 0;
    const originY = slotVisible
      ? ctaRect.top + ctaRect.height * 0.5 - (slotRect.top + slotRect.height * 0.5)
      : -120;
    const exitCursorX = clamp(
      clickX + (isTwoCol ? 98 : 62),
      36,
      layoutRect.width - 36,
    );
    const exitCursorY = clickY + (isTwoCol ? 52 : 44);

    boundsRef.current = bounds;
    return {
      layoutRect,
      bounds,
      isTwoCol,
      clickX,
      clickY,
      originX,
      originY,
      exitCursorX,
      exitCursorY,
    };
  }, []);

  const stopActiveAnimations = useCallback(() => {
    if (glideRafRef.current !== null) {
      cancelAnimationFrame(glideRafRef.current);
      glideRafRef.current = null;
    }
    if (exitRafRef.current !== null) {
      cancelAnimationFrame(exitRafRef.current);
      exitRafRef.current = null;
    }
    demoTlRef.current?.pause();
    anime.remove([
      cursorRef.current,
      cursorBodyRef.current,
      catchRingRef.current,
      rippleRef.current,
      ctaRef.current,
      browserRef.current,
      loadBarRef.current,
      standbyRef.current,
      pageStageRef.current,
      glintRef.current,
    ]);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const cleanups = [
      attachMagnetic(ctaRef.current, 0.16),
      attachSpotlight(browserRef.current, { tiltDeg: 1.4 }),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  // Pre-paint initial placement so the floating cursor never flashes at (0, 0) on first load
  useLayoutEffect(() => {
    const geo = measureGeometry();
    if (!geo) return;
    const b = geo.bounds;
    const tVal = clockRef.current;
    const initX = reducedMotion
      ? geo.isTwoCol
        ? b.cx
        : clamp(geo.clickX + 104, 36, geo.layoutRect.width - 36)
      : b.cx + b.rx * Math.sin(tVal * 0.72) + b.rx * 0.16 * Math.cos(tVal * 1.65);
    const initY = reducedMotion
      ? geo.isTwoCol
        ? b.cy
        : geo.clickY
      : b.cy + b.ry * Math.sin(tVal * 1.02 + 0.55) + b.ry * 0.14 * Math.sin(tVal * 1.9);
    posRef.current = { x: initX, y: initY };
    rotRef.current = 0;
    applyCursorPose(initX, initY, 0, 1, 1);
  }, [reducedMotion, measureGeometry, applyCursorPose]);

  // Continuous zero-gravity roaming loop for the unified floating cursor
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    const syncStaticOrInitial = () => {
      if (phaseRef.current !== "roam") return;
      const geo = measureGeometry();
      if (!geo) return;
      if (reducedMotion) {
        const parkX = geo.isTwoCol
          ? geo.bounds.cx
          : clamp(geo.clickX + 104, 36, geo.layoutRect.width - 36);
        const parkY = geo.isTwoCol ? geo.bounds.cy : geo.clickY;
        posRef.current = { x: parkX, y: parkY };
        rotRef.current = 0;
        applyCursorPose(parkX, parkY, 0, 1, 1);
      }
    };

    syncStaticOrInitial();

    const ro = new ResizeObserver(syncStaticOrInitial);
    ro.observe(layout);
    window.addEventListener("resize", syncStaticOrInitial, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: "160px 0px" },
    );
    io.observe(layout);

    if (reducedMotion) {
      return () => {
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("resize", syncStaticOrInitial);
      };
    }

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (phaseRef.current === "roam" && visibleRef.current && !document.hidden) {
        const b = boundsRef.current ?? measureGeometry()?.bounds;
        if (b) {
          // Smoothly slow down when hovered or keyboard-focused so catching feels effortless
          const targetSpeed = focusedRef.current ? 0 : hoveredRef.current ? 0.18 : b.isCompact ? 1.15 : 1;
          speedScaleRef.current += (targetSpeed - speedScaleRef.current) * Math.min(1, dt * 8);

          const targetHoverScale = hoveredRef.current || focusedRef.current ? 1.1 : 1;
          hoverScaleRef.current += (targetHoverScale - hoverScaleRef.current) * Math.min(1, dt * 10);

          clockRef.current += dt * speedScaleRef.current;
          const tVal = clockRef.current;

          // Organic Lissajous zero-gravity float path
          const orbitX =
            b.cx +
            b.rx * Math.sin(tVal * 0.72) +
            b.rx * 0.16 * Math.cos(tVal * 1.65);
          const orbitY =
            b.cy +
            b.ry * Math.sin(tVal * 1.02 + 0.55) +
            b.ry * 0.14 * Math.sin(tVal * 1.9);

          let nextX = orbitX;
          let nextY = orbitY;
          let opacity = 1;
          let bodyScale = hoverScaleRef.current;

          // Smooth emergence back out from "Buka Halaman" right after the browser window closes
          if (emergeRef.current.active) {
            emergeRef.current.elapsed += dt;
            const p = Math.min(1, emergeRef.current.elapsed / emergeRef.current.duration);
            const ease = 1 - Math.pow(1 - p, 3);
            nextX = emergeRef.current.fromX + (orbitX - emergeRef.current.fromX) * ease;
            nextY = emergeRef.current.fromY + (orbitY - emergeRef.current.fromY) * ease;
            opacity = Math.min(1, p * 2.4);
            bodyScale = (0.64 + 0.36 * ease) * hoverScaleRef.current;
            if (p >= 1) {
              emergeRef.current.active = false;
            }
          }

          const rawVx = (nextX - posRef.current.x) / dt;
          const rawVy = (nextY - posRef.current.y) / dt;
          velRef.current = {
            x: velRef.current.x * 0.65 + rawVx * 0.35,
            y: velRef.current.y * 0.65 + rawVy * 0.35,
          };
          posRef.current = { x: nextX, y: nextY };

          const targetRot = clamp(velRef.current.x * 0.06, -11, 11);
          rotRef.current += (targetRot - rotRef.current) * Math.min(1, dt * 7);

          applyCursorPose(nextX, nextY, rotRef.current, bodyScale, opacity);
        }
      }

      roamRafRef.current = requestAnimationFrame(tick);
    };

    roamRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (roamRafRef.current !== null) {
        cancelAnimationFrame(roamRafRef.current);
        roamRafRef.current = null;
      }
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("resize", syncStaticOrInitial);
    };
  }, [reducedMotion, measureGeometry, applyCursorPose]);

  /** Seamless C1-continuous Bezier flight from the caught cursor's exact position/velocity straight to "Buka Halaman" */
  const runUnifiedClickSequence = useCallback(
    (fromX: number, fromY: number, startVx: number, startVy: number, startRot: number, startScale: number, showCatchBurst: boolean) => {
      const geo = measureGeometry();
      const cta = ctaRef.current;
      const cursor = cursorRef.current;
      const cursorBody = cursorBodyRef.current;
      const catchRing = catchRingRef.current;
      const ripple = rippleRef.current;
      const loadBar = loadBarRef.current;
      const standby = standbyRef.current;
      const pageStage = pageStageRef.current;
      const browser = browserRef.current;

      if (reducedMotion || !geo || !cta || !cursor || !cursorBody || !ripple || !loadBar || !standby || !pageStage || !browser) {
        if (cursor) cursor.style.opacity = "0";
        setWindowOpen(true);
        setCursorPhase("open");
        return;
      }

      stopActiveAnimations();
      setCursorPhase("clicking");
      setWindowOpen(false);
      hoveredRef.current = false;
      focusedRef.current = false;

      cta.removeAttribute("data-demo-press");
      cta.removeAttribute("data-demo-hover");
      markAnimating([browser, cta, pageStage]);

      // Keep browser window strictly hidden until AFTER the cursor clicks "Buka Halaman"
      browser.style.visibility = "hidden";
      browser.style.pointerEvents = "none";
      anime.set(browser, {
        translateX: geo.originX,
        translateY: geo.originY,
        scale: 0.14,
        rotate: -4,
        opacity: 0,
      });
      anime.set(ripple, {
        translateX: geo.clickX,
        translateY: geo.clickY,
        scale: 0.2,
        opacity: 0,
      });
      anime.set(loadBar, { scaleX: 0, opacity: 1 });
      anime.set(standby, { opacity: 1, translateY: 0 });
      anime.set(pageStage, { opacity: 0, translateY: 18, scale: 0.97 });

      // Subtle tactile golden catch spark right where the user caught the floating cursor
      if (showCatchBurst && catchRing) {
        anime.set(catchRing, {
          translateX: fromX,
          translateY: fromY,
          scale: 0.35,
          opacity: 0.9,
        });
        anime({
          targets: catchRing,
          scale: [0.35, 2.05],
          opacity: [0.88, 0],
          duration: 380,
          easing: "easeOutCubic",
        });
      }

      // C1-continuous cubic Bezier matching live floating velocity at t = 0
      const p0x = fromX;
      const p0y = fromY;
      const p3x = geo.clickX;
      const p3y = geo.clickY;
      const dist = Math.hypot(p3x - p0x, p3y - p0y);
      const flightSec = clamp(0.42 + dist / 960, 0.44, 0.72);

      const vMag = Math.hypot(startVx, startVy);
      const vCap = vMag > 180 ? 180 / vMag : 1;
      const p1x = p0x + startVx * vCap * (flightSec / 7.2);
      const p1y = p0y + startVy * vCap * (flightSec / 7.2);

      const dx = p3x - p0x;
      const dy = p3y - p0y;
      const arcLift = Math.min(40, dist * 0.14);
      const p2x = p3x - dx * 0.28;
      const p2y = p3y - dy * 0.28 - arcLift * 0.5;

      let hoverLit = false;
      const startTs = performance.now();

      const stepGlide = (now: number) => {
        const u = Math.min(1, (now - startTs) / (flightSec * 1000));
        // s'(0) = 2.4 gives exact C1 momentum handoff; s'(1) = 0 gives velvety landing
        const s = 1 - Math.pow(1 - u, 2.4);
        const inv = 1 - s;

        const curX =
          inv * inv * inv * p0x +
          3 * inv * inv * s * p1x +
          3 * inv * s * s * p2x +
          s * s * s * p3x;
        const curY =
          inv * inv * inv * p0y +
          3 * inv * inv * s * p1y +
          3 * inv * s * s * p2y +
          s * s * s * p3y;

        const rotEase = 1 - Math.pow(1 - u, 3);
        const curRot = startRot * (1 - rotEase);
        const curScale = startScale + (1 - startScale) * rotEase;

        posRef.current = { x: curX, y: curY };
        rotRef.current = curRot;
        applyCursorPose(curX, curY, curRot, curScale, 1);

        if (!hoverLit && u >= 0.84) {
          hoverLit = true;
          cta.dataset.demoHover = "true";
        }

        if (u < 1) {
          glideRafRef.current = requestAnimationFrame(stepGlide);
          return;
        }

        glideRafRef.current = null;
        // Lock exact tip on "Buka Halaman" before starting press click & window launch
        applyCursorPose(geo.clickX, geo.clickY, 0, 1, 1);
        cta.dataset.demoHover = "true";

        const tl = anime.timeline({
          easing: EASE_OUT_EXPO,
          complete: () => {
            cta.removeAttribute("data-demo-hover");
            cta.removeAttribute("data-demo-press");
            browser.style.pointerEvents = "";
            browser.style.visibility = "";
            clearAnimated([browser, cta], ["transform", "opacity"]);
            setCursorPhase("open");
          },
        });
        demoTlRef.current = tl;

        // Smooth zero-jerk curved departure after clicking "Buka Halaman"
        const startSmoothCursorExit = () => {
          const exitStartTs = performance.now();
          const exitDurMs = 780;
          const x0 = geo.clickX;
          const y0 = geo.clickY;
          const x2 = geo.exitCursorX;
          const y2 = geo.exitCursorY;
          // Gentle upward-outward Bezier control point so cursor lifts gracefully off the button
          const cx = x0 + (x2 - x0) * 0.44;
          const cy = y0 - 16;
          let hoverCleared = false;

          const stepExit = (ts: number) => {
            const u = Math.min(1, (ts - exitStartTs) / exitDurMs);
            // Smoothstep velocity starts at 0 px/s (no sudden jerk) and eases softly into rest
            const p = u * u * (3 - 2 * u);
            const inv = 1 - p;
            const curX = inv * inv * x0 + 2 * inv * p * cx + p * p * x2;
            const curY = inv * inv * y0 + 2 * inv * p * cy + p * p * y2;
            const curRot = 10 * p;
            const curScale = 1 - 0.18 * p;

            // Keep cursor crisp during initial liftoff, then dissolve cleanly into space
            const fadeT = clamp((u - 0.22) / 0.78, 0, 1);
            const fadeEase = fadeT * fadeT * (3 - 2 * fadeT);
            const curOpacity = 1 - fadeEase;

            if (!hoverCleared && u >= 0.22) {
              hoverCleared = true;
              cta.removeAttribute("data-demo-hover");
            }

            posRef.current = { x: curX, y: curY };
            rotRef.current = curRot;
            applyCursorPose(curX, curY, curRot, curScale, curOpacity);

            if (u < 1) {
              exitRafRef.current = requestAnimationFrame(stepExit);
            } else {
              exitRafRef.current = null;
            }
          };

          exitRafRef.current = requestAnimationFrame(stepExit);
        };

        // 1. Tactile click press of the exact same cursor onto "Buka Halaman"
        tl.add({
          targets: cursorBody,
          scale: [1, 0.78, 1],
          duration: 250,
          easing: "easeInOutQuad",
          begin: () => {
            cta.dataset.demoPress = "true";
          },
          complete: () => {
            cta.removeAttribute("data-demo-press");
            startSmoothCursorExit();
          },
        })
          .add(
            {
              targets: cta,
              scale: [1, 0.94, 1],
              duration: 250,
              easing: "easeInOutQuad",
            },
            "-=250",
          )
          .add(
            {
              targets: ripple,
              scale: [0.2, 2.5],
              opacity: [0.94, 0],
              duration: 520,
              easing: "easeOutCubic",
            },
            "-=180",
          )
          // 2. ONLY AFTER CLICK: Live browser window launches out of "Buka Halaman"
          .add(
            {
              targets: browser,
              translateX: [geo.originX, 0],
              translateY: [geo.originY, 0],
              scale: [0.14, 1],
              rotate: [-4, 0],
              opacity: [0, 1],
              duration: 740,
              easing: "easeOutBack",
              begin: () => {
                browser.style.visibility = "visible";
                setWindowOpen(true);
              },
            },
            "-=270",
          )
          // 3. Solar progress bar sweeps & live Beasiswa Kukar Idaman Telkom University page unfolds
          .add(
            {
              targets: loadBar,
              scaleX: [0, 0.74, 1],
              duration: 540,
              easing: "easeInOutQuad",
            },
            "-=380",
          )
          .add(
            {
              targets: standby,
              opacity: [1, 0],
              translateY: [0, -12],
              duration: 400,
              easing: EASE_CALM,
            },
            "-=200",
          )
          .add(
            {
              targets: pageStage,
              opacity: [0, 1],
              translateY: [18, 0],
              scale: [0.97, 1],
              duration: 680,
              easing: EASE_OUT_EXPO,
            },
            "-=360",
          )
          .add(
            {
              targets: loadBar,
              opacity: [1, 0],
              duration: 240,
              easing: "linear",
            },
            "-=440",
          );

        if (glintRef.current) {
          tl.add(
            {
              targets: glintRef.current,
              translateX: ["-135%", "165%"],
              opacity: [0, 0.55, 0],
              duration: 1000,
              easing: "easeInOutQuad",
            },
            "-=660",
          );
        }
      };

      glideRafRef.current = requestAnimationFrame(stepGlide);
    },
    [reducedMotion, measureGeometry, stopActiveAnimations, setCursorPhase, applyCursorPose],
  );

  /** Exit animation: smoothly folds the live browser window back into "Buka Halaman" and releases the floating cursor */
  const closeWindow = useCallback(
    (afterClose?: () => void) => {
      const browser = browserRef.current;
      const geo = measureGeometry();

      const finishClose = () => {
        setWindowOpen(false);
        if (afterClose) {
          afterClose();
          return;
        }
        // Release the exact same cursor smoothly out from "Buka Halaman" back into zero-gravity roam
        const freshGeo = measureGeometry();
        if (freshGeo) {
          posRef.current = { x: freshGeo.clickX, y: freshGeo.clickY };
          velRef.current = { x: 0, y: 0 };
          rotRef.current = 0;
          emergeRef.current = {
            active: !reducedMotion,
            elapsed: 0,
            duration: 0.65,
            fromX: freshGeo.clickX,
            fromY: freshGeo.clickY,
          };
          if (reducedMotion) {
            const parkX = freshGeo.isTwoCol
              ? freshGeo.bounds.cx
              : clamp(freshGeo.clickX + 104, 36, freshGeo.layoutRect.width - 36);
            const parkY = freshGeo.isTwoCol ? freshGeo.bounds.cy : freshGeo.clickY;
            applyCursorPose(parkX, parkY, 0, 1, 1);
          }
        }
        setCursorPhase("roam");
      };

      if (reducedMotion || !browser || !geo) {
        finishClose();
        return;
      }

      stopActiveAnimations();
      markAnimating(browser);
      setCursorPhase("clicking");

      const exitTl = anime.timeline({
        complete: () => {
          browser.style.visibility = "hidden";
          browser.style.pointerEvents = "none";
          clearAnimated(browser, ["transform", "opacity"]);
          finishClose();
        },
      });
      demoTlRef.current = exitTl;

      exitTl.add({
        targets: browser,
        translateX: [0, geo.originX],
        translateY: [0, geo.originY],
        scale: [1, 0.14],
        rotate: [0, -4],
        opacity: [1, 0],
        duration: 420,
        easing: "easeInBack",
      });
    },
    [reducedMotion, measureGeometry, stopActiveAnimations, setCursorPhase, applyCursorPose],
  );

  /** Catch handler: responds immediately on pointerDown so moving cursor never slips away mid-click */
  const handleCatchCursor = useCallback(() => {
    if (phaseRef.current !== "roam") return;
    runUnifiedClickSequence(
      posRef.current.x,
      posRef.current.y,
      velRef.current.x,
      velRef.current.y,
      rotRef.current,
      hoverScaleRef.current,
      true,
    );
  }, [runUnifiedClickSequence]);

  /** Replay from browser bar: folds window in, gracefully pops cursor out, then clicks "Buka Halaman" again */
  const handleReplay = useCallback(() => {
    if (phaseRef.current !== "open") return;
    closeWindow(() => {
      const geo = measureGeometry();
      if (!geo || reducedMotion) {
        setWindowOpen(true);
        setCursorPhase("open");
        return;
      }
      const launchX = geo.isTwoCol
        ? geo.bounds.cx
        : clamp(geo.clickX + 112, 36, geo.layoutRect.width - 36);
      const launchY = geo.isTwoCol ? geo.bounds.cy : Math.max(24, geo.clickY - 22);

      // Briefly emerge cursor from "Buka Halaman" to launch point, then curve right back to click
      const emergeStart = performance.now();
      const emergeDur = 320;
      const stepOut = (now: number) => {
        const u = Math.min(1, (now - emergeStart) / emergeDur);
        const ease = 1 - Math.pow(1 - u, 3);
        const x = geo.clickX + (launchX - geo.clickX) * ease;
        const y = geo.clickY + (launchY - geo.clickY) * ease;
        const rot = 6 * ease;
        applyCursorPose(x, y, rot, 0.72 + 0.28 * ease, Math.min(1, u * 2.2));
        if (u < 1) {
          glideRafRef.current = requestAnimationFrame(stepOut);
        } else {
          glideRafRef.current = null;
          runUnifiedClickSequence(launchX, launchY, 35, -24, rot, 1, false);
        }
      };
      glideRafRef.current = requestAnimationFrame(stepOut);
    });
  }, [closeWindow, measureGeometry, reducedMotion, setCursorPhase, applyCursorPose, runUnifiedClickSequence]);

  // Reveal heading & button calmly on scroll; NEVER auto-open the web window before user catches the cursor
  useEffect(() => {
    if (reducedMotion) return;
    const cleanups: (() => void)[] = [];

    if (ruleRef.current) {
      cleanups.push(bindSectionRule(ruleRef.current));
    }

    if (headRef.current) {
      const getItems = (el: HTMLElement) => el.querySelectorAll("h2, .scholarship-cta-row");
      cleanups.push(
        observeScrollItems(
          [headRef.current],
          (el) => {
            const items = getItems(el);
            markAnimating(items);
            anime({
              targets: items,
              translateY: [26, 0],
              opacity: [0.06, 1],
              duration: 740,
              delay: anime.stagger(100),
              easing: EASE_OUT_EXPO,
              complete: () => {
                clearAnimated(items);
                measureGeometry();
              },
            });
          },
          {
            threshold: 0.2,
            prime: (el) => primeBelowFold(getItems(el), 26, 0.06),
            restore: (el) => clearAnimated(getItems(el)),
          },
        ),
      );
    }

    return () => {
      stopActiveAnimations();
      cleanups.forEach((fn) => fn());
    };
  }, [reducedMotion, stopActiveAnimations, measureGeometry]);

  return (
    <section
      id="honors"
      className={`ed-sec honors-sec ${reducedMotion ? "is-reduced" : ""}`}
      aria-labelledby="honors-title"
    >
      <div ref={ruleRef} className="section-rule" aria-hidden="true" />

      <div ref={layoutRef} className="scholarship-layout">
        {/* Catch spark & click shockwave ripples */}
        {!reducedMotion && (
          <>
            <span ref={catchRingRef} className="scholarship-catch-ring" aria-hidden="true" />
            <span ref={rippleRef} className="scholarship-click-ripple" aria-hidden="true" />
          </>
        )}

        {/* Single unified floating cursor button: glides freely -> caught -> smoothly clicks "Buka Halaman" */}
        <button
          ref={cursorRef}
          type="button"
          className={`scholarship-floating-cursor is-${phase}`}
          aria-expanded={windowOpen}
          tabIndex={phase === "roam" ? 0 : -1}
          aria-label={
            lang === "id"
              ? "Tangkap dan klik kursor melayang untuk membuka tampilan live halaman beasiswa"
              : "Catch and click the floating cursor to open the live scholarship preview"
          }
          title="Click me"
          onPointerEnter={() => {
            hoveredRef.current = true;
          }}
          onPointerLeave={() => {
            hoveredRef.current = false;
          }}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse") {
              if (e.button !== 0) return;
              handleCatchCursor();
            } else {
              touchStartRef.current = { x: e.clientX, y: e.clientY };
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "mouse" || !touchStartRef.current) return;
            const moved = Math.hypot(
              e.clientX - touchStartRef.current.x,
              e.clientY - touchStartRef.current.y,
            );
            touchStartRef.current = null;
            if (moved < 18) {
              handleCatchCursor();
            }
          }}
          onPointerCancel={() => {
            touchStartRef.current = null;
          }}
          onClick={(e) => {
            // Keyboard activation (Enter / Space) triggers click with detail === 0
            if (e.detail === 0) {
              handleCatchCursor();
            }
          }}
        >
          <span className="scholarship-cursor-halo" aria-hidden="true" />
          <span className="scholarship-cursor-ring" aria-hidden="true" />
          <span ref={cursorBodyRef} className="scholarship-cursor-body">
            <svg
              className="scholarship-cursor-svg"
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id={cursorGradId}
                  x1="4"
                  y1="3"
                  x2="21"
                  y2="23"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#fff9e6" />
                  <stop offset="58%" stopColor="#f8e77c" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <path
                d="M4.5 3.5L22.5 12.1L14.5 14.8L11.2 22.8L4.5 3.5Z"
                fill={`url(#${cursorGradId})`}
                stroke="#090708"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <div ref={headRef} className="scholarship-head">
          <h2 id="honors-title" className="ed-h2">
            {t(UI_COPY.scholarshipTitle, lang)}
          </h2>

          <div className="scholarship-cta-row">
            <a
              ref={ctaRef}
              href={PROFILE.links.scholarship}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-solar scholarship-link-btn"
            >
              {t(UI_COPY.scholarshipCta, lang)}
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
              <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
            </a>
          </div>
        </div>

        {/* Browser window stays completely hidden until after the cursor clicks "Buka Halaman" */}
        <div ref={slotRef} className={`scholarship-slot ${windowOpen ? "is-open" : ""}`}>
          <div className="scholarship-slot-inner">
            <div
              ref={browserRef}
              className={`scholarship-frame scholarship-browser ${windowOpen ? "is-open" : ""}`}
              aria-hidden={!windowOpen}
            >
            <div className="scholarship-chrome">
              <div className="scholarship-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <a
                href={PROFILE.links.scholarship}
                target="_blank"
                rel="noopener noreferrer"
                className="scholarship-address mono"
                tabIndex={windowOpen ? 0 : -1}
              >
                <LockSimple size={12} weight="bold" aria-hidden="true" />
                <span>bis.telkomuniversity.ac.id/beasiswa-kukar-idaman</span>
                <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
                <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
              </a>

              <div className="scholarship-chrome-actions">
                {!reducedMotion && (
                  <button
                    type="button"
                    className="scholarship-chrome-btn"
                    tabIndex={windowOpen ? 0 : -1}
                    aria-label={lang === "id" ? "Putar ulang animasi buka halaman" : "Replay open animation"}
                    title={lang === "id" ? "Putar ulang" : "Replay"}
                    onClick={handleReplay}
                  >
                    <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="scholarship-chrome-btn is-close"
                  tabIndex={windowOpen ? 0 : -1}
                  aria-label={lang === "id" ? "Tutup jendela" : "Close window"}
                  title={lang === "id" ? "Tutup" : "Close"}
                  onClick={() => closeWindow()}
                >
                  <X size={14} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="scholarship-load-track" aria-hidden="true">
              <span ref={loadBarRef} className="scholarship-load-bar" />
            </div>

            <a
              href={PROFILE.links.scholarship}
              target="_blank"
              rel="noopener noreferrer"
              className="scholarship-viewport"
              tabIndex={windowOpen ? 0 : -1}
              aria-label={`${t(UI_COPY.scholarshipTitle, lang)} ${t(UI_COPY.opensNewTab, lang)}`}
            >
              <span ref={glintRef} className="scholarship-glint" aria-hidden="true" />

              {!reducedMotion && (
                <div ref={standbyRef} className="scholarship-standby" aria-hidden="true">
                  <div className="scholarship-standby-pulse" />
                  <span className="mono">bis.telkomuniversity.ac.id</span>
                </div>
              )}

              <div ref={pageStageRef} className="scholarship-page-stage">
                <img
                  src={PROFILE.scholarshipMedia.src}
                  width={PROFILE.scholarshipMedia.width}
                  height={PROFILE.scholarshipMedia.height}
                  alt={t(PROFILE.scholarshipMedia.alt, lang)}
                  className="scholarship-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </a>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
