import { ArrowUpRight } from "@phosphor-icons/react";
import anime from "animejs";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AsteroidDossierModal } from "../components/ui/AsteroidDossierModal";
import { NusantaraDataPlate } from "../components/ui/NusantaraDataPlate";
import { AMBIENT_PEBBLES, ASTEROID_SHAPES } from "../data/asteroidField";
import { computeFlowVideoRect, FLOW_METEOR_ANCHORS } from "../data/flowManifest";
import {
  PROJECTS,
  t,
  UI_COPY,
  type DomainCategory,
  type Locale,
  type ProjectRecord,
} from "../data/portfolio";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { SPRING_SNAPPY } from "../lib/motion";

export type ProjectFilter = "All" | DomainCategory;

const FILTER_OPTIONS: { key: ProjectFilter; label: { id: string; en: string } }[] = [
  { key: "All", label: UI_COPY.filterAll },
  { key: "Web Dev", label: UI_COPY.filterWeb },
  { key: "Data & BI", label: UI_COPY.filterBI },
  { key: "Info Systems", label: UI_COPY.filterIS },
];

type BodyState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hovered: boolean;
  dragging: boolean;
  scale: number;
  zBoost: number;
};

type ProjectsGalleryProps = {
  lang: Locale;
  filter: ProjectFilter;
  activeProjectId: string;
  detailOpenTick: number;
  onChangeFilter: (f: ProjectFilter) => void;
};

export function ProjectsGallery({
  lang,
  filter,
  activeProjectId,
  detailOpenTick,
  onChangeFilter,
}: ProjectsGalleryProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterPillRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const asteroidRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coreRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const [inspectedProj, setInspectedProj] = useState<ProjectRecord | null>(null);
  const [isFreeField, setIsFreeField] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 860 : true,
  );
  const reducedMotion = useReducedMotion();

  const matchingIds = useMemo(() => {
    const list =
      filter === "All"
        ? PROJECTS
        : PROJECTS.filter((p) => p.categories.includes(filter));
    return new Set(list.map((p) => p.id));
  }, [filter]);

  const matchingRef = useRef(matchingIds);
  matchingRef.current = matchingIds;

  useEffect(() => {
    const check = () => setIsFreeField(window.innerWidth >= 860);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (detailOpenTick === 0) return;
    const found = PROJECTS.find((p) => p.id === activeProjectId);
    if (found) setInspectedProj(found);
  }, [detailOpenTick, activeProjectId]);

  // Spring-animated sliding pill indicator beneath active category filter button
  useEffect(() => {
    const bar = filterBarRef.current;
    const pill = filterPillRef.current;
    if (!bar || !pill) return;

    const syncPill = (instant = false) => {
      const activeBtn = bar.querySelector<HTMLButtonElement>(".ed-filter-btn.is-active");
      if (!activeBtn) return;
      const x = activeBtn.offsetLeft;
      const y = activeBtn.offsetTop;
      const w = activeBtn.offsetWidth;
      const h = activeBtn.offsetHeight;
      if (instant || reducedMotion) {
        anime.remove(pill);
        pill.style.transform = `translate(${x}px, ${y}px)`;
        pill.style.width = `${w}px`;
        pill.style.height = `${h}px`;
        pill.style.opacity = "1";
      } else {
        anime.remove(pill);
        anime({
          targets: pill,
          translateX: x,
          translateY: y,
          width: w,
          height: h,
          opacity: 1,
          duration: 460,
          easing: SPRING_SNAPPY,
        });
      }
    };

    syncPill(false);
    const onResize = () => syncPill(true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [filter, lang, reducedMotion]);

  const bodiesRef = useRef<BodyState[]>(
    ASTEROID_SHAPES.map((s) => ({
      x: s.initX * 1100,
      y: s.initY * 780,
      vx: s.initVx,
      vy: s.initVy,
      angle: 0,
      hovered: false,
      dragging: false,
      scale: 1,
      zBoost: 0,
    })),
  );
  const topZRef = useRef(10);
  const pointerFieldRef = useRef({ active: false, x: 0, y: 0 });
  const dragRef = useRef<{
    idx: number;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    offsetX: number;
    offsetY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    moved: boolean;
  } | null>(null);

  // Unified 60fps Zero-Gravity Asteroid Physics + 1:1 Scroll Meteor-Burst Handoff
  useEffect(() => {
    const section = sectionRef.current;
    const field = fieldRef.current;
    const head = headRef.current;
    const rule = ruleRef.current;
    if (!section || !field) return;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const easeOutCubic = (v: number) => 1 - Math.pow(1 - v, 3);

    if (isFreeField) {
      const fw = field.clientWidth || 1100;
      const fh = field.clientHeight || 800;
      bodiesRef.current.forEach((b, idx) => {
        const s = ASTEROID_SHAPES[idx];
        b.x = s.initX * fw;
        b.y = s.initY * fh;
        b.vx = s.initVx;
        b.vy = s.initVy;
      });
    }

    let alive = true;
    let inView = true;
    let raf = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let entryInitialized = false;
    let smoothEntry = reducedMotion ? 1 : 0;
    let smoothHead = reducedMotion ? 1 : 0;

    const resetOverlayElements = () => {
      if (head) {
        head.style.opacity = "";
        head.style.transform = "";
      }
      if (rule) {
        rule.style.opacity = "";
        rule.style.transform = "";
      }
      PROJECTS.forEach((_, idx) => {
        const core = coreRefs.current[idx];
        const tail = tailRefs.current[idx];
        if (core) {
          core.style.opacity = "0";
          core.style.visibility = "hidden";
        }
        if (tail) {
          tail.style.opacity = "0";
          tail.style.visibility = "hidden";
        }
      });
    };

    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;

      const dt = Math.min(0.048, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;
      const secTop = section.getBoundingClientRect().top;
      const fieldRect = field.getBoundingClientRect();
      const fw = fieldRect.width || 1100;
      const fh = fieldRect.height || 800;

      if (reducedMotion) {
        smoothHead = 1;
        smoothEntry = 1;
      } else {
        const targetHead = clamp01((vh * 0.96 - secTop) / Math.max(1, vh * 0.68));
        const targetEntry = clamp01((vh * 1.12 - fieldRect.top) / Math.max(1, vh * 0.88));
        if (!entryInitialized) {
          smoothHead = targetHead;
          smoothEntry = targetEntry;
          entryInitialized = true;
        } else {
          smoothHead += (targetHead - smoothHead) * 0.12;
          smoothEntry += (targetEntry - smoothEntry) * 0.12;
          if (Math.abs(targetHead - smoothHead) < 0.0005) smoothHead = targetHead;
          if (Math.abs(targetEntry - smoothEntry) < 0.0005) smoothEntry = targetEntry;
        }
      }

      const headEase = easeOutCubic(smoothHead);
      if (head) {
        if (smoothHead >= 0.998) {
          head.style.opacity = "";
          head.style.transform = "";
        } else {
          head.style.opacity = headEase.toFixed(3);
          head.style.transform = `translate3d(0, ${((1 - headEase) * 32).toFixed(1)}px, 0)`;
        }
      }
      if (rule) {
        rule.style.opacity = (0.15 + headEase * 0.85).toFixed(3);
        rule.style.transform = `scaleX(${headEase.toFixed(4)})`;
      }

      if (isFreeField) {
        const bodies = bodiesRef.current;
        const vr = computeFlowVideoRect(vw, vh, 1280, 720);
        const activeMatch = matchingRef.current;

        const dims = bodies.map((_, idx) => {
          const el = asteroidRefs.current[idx];
          return {
            w: el?.offsetWidth || 308,
            h: el?.offsetHeight || 256,
          };
        });

        if (!reducedMotion) {
          const ptr = pointerFieldRef.current;

          for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const isMatched = activeMatch.has(PROJECTS[i].id);
            const shape = ASTEROID_SHAPES[i];

            if (!isMatched) {
              b.scale += (0.68 - b.scale) * 0.12;
              continue;
            }

            const targetScale = b.dragging ? 1.06 : b.hovered ? 1.045 : 1;
            b.scale += (targetScale - b.scale) * 0.14;

            if (b.dragging) {
              b.angle += (0 - b.angle) * 0.18;
              continue;
            }

            if (b.hovered) {
              b.vx *= Math.pow(0.08, dt);
              b.vy *= Math.pow(0.08, dt);
              b.angle += (0 - b.angle) * 0.16;
            } else {
              const speed = Math.hypot(b.vx, b.vy);
              if (speed > 34) {
                const damp = Math.pow(0.28, dt);
                b.vx *= damp;
                b.vy *= damp;
              } else if (speed < 15) {
                const ang = speed > 0.2 ? Math.atan2(b.vy, b.vx) : shape.swayPhase + elapsed * 0.3;
                b.vx += Math.cos(ang) * 14 * dt;
                b.vy += Math.sin(ang) * 14 * dt;
              }

              if (ptr.active && smoothEntry > 0.85) {
                const dx = b.x - ptr.x;
                const dy = b.y - ptr.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 18 && dist < 215) {
                  const push = (1 - dist / 215) * 44 * dt;
                  b.vx += (dx / dist) * push;
                  b.vy += (dy / dist) * push;
                }
              }

              const targetAngle =
                Math.sin(elapsed * shape.swaySpeed + shape.swayPhase) * 5.8 +
                Math.max(-3.5, Math.min(3.5, b.vx * 0.08));
              b.angle += (targetAngle - b.angle) * 0.08;
            }

            b.x += b.vx * dt;
            b.y += b.vy * dt;

            const padX = dims[i].w * 0.5 + 14;
            const padY = dims[i].h * 0.5 + 14;
            const minX = Math.min(fw * 0.5, padX);
            const maxX = Math.max(fw * 0.5, fw - padX);
            const minY = Math.min(fh * 0.5, padY);
            const maxY = Math.max(fh * 0.5, fh - padY);

            if (b.x < minX) {
              b.x = minX;
              b.vx = Math.abs(b.vx) * 0.92 + 4;
            } else if (b.x > maxX) {
              b.x = maxX;
              b.vx = -Math.abs(b.vx) * 0.92 - 4;
            }
            if (b.y < minY) {
              b.y = minY;
              b.vy = Math.abs(b.vy) * 0.92 + 4;
            } else if (b.y > maxY) {
              b.y = maxY;
              b.vy = -Math.abs(b.vy) * 0.92 - 4;
            }
          }

          for (let i = 0; i < bodies.length; i++) {
            if (!activeMatch.has(PROJECTS[i].id)) continue;
            for (let j = i + 1; j < bodies.length; j++) {
              if (!activeMatch.has(PROJECTS[j].id)) continue;
              const a = bodies[i];
              const b = bodies[j];
              const rx = (dims[i].w + dims[j].w) * 0.53;
              const ry = (dims[i].h + dims[j].h) * 0.54;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const nx = dx / Math.max(1, rx);
              const ny = dy / Math.max(1, ry);
              const d = Math.hypot(nx, ny);
              if (d < 1) {
                const safeD = Math.max(0.001, d);
                const ux = nx / safeD;
                const uy = ny / safeD;
                const overlap = 1 - d;
                const pushX = ux * overlap * rx * 0.14;
                const pushY = uy * overlap * ry * 0.14;

                if (!a.dragging) {
                  a.x -= pushX;
                  a.y -= pushY;
                  a.vx -= ux * overlap * 32 * dt;
                  a.vy -= uy * overlap * 32 * dt;
                }
                if (!b.dragging) {
                  b.x += pushX;
                  b.y += pushY;
                  b.vx += ux * overlap * 32 * dt;
                  b.vy += uy * overlap * 32 * dt;
                }
              }
            }
          }
        }

        const flight = 1 - Math.pow(1 - smoothEntry, 3.1);
        const unfold = 1 - Math.pow(1 - smoothEntry, 2.2);

        for (let i = 0; i < bodies.length; i++) {
          const el = asteroidRefs.current[i];
          if (!el) continue;
          const b = bodies[i];
          const core = coreRefs.current[i];
          const tail = tailRefs.current[i];
          const isMatched = activeMatch.has(PROJECTS[i].id);

          const anchor = FLOW_METEOR_ANCHORS[i] ?? { x: 0.5, y: 0.5 };
          const meteorFieldX = vr.dx + anchor.x * vr.dw - fieldRect.left;
          const meteorFieldY = Math.max(
            -vh * 0.45,
            Math.min(fh * 0.85, vr.dy + anchor.y * vr.dh - fieldRect.top),
          );

          const dx = meteorFieldX - b.x;
          const dy = meteorFieldY - b.y;

          const currX = b.x + dx * (1 - flight);
          const currY = b.y + dy * (1 - flight);
          const totalScale = (0.24 + 0.76 * unfold) * b.scale;
          const finalAngle = b.angle + (dx >= 0 ? -1 : 1) * (1 - flight) * 14;
          const finalAlpha = isMatched ? clamp01(smoothEntry / 0.16) : 0;

          el.style.transform = `translate3d(${currX.toFixed(1)}px, ${currY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${totalScale.toFixed(4)}) rotate(${finalAngle.toFixed(2)}deg)`;
          el.style.opacity = finalAlpha.toFixed(3);
          el.style.pointerEvents = isMatched && smoothEntry > 0.35 ? "auto" : "none";
          el.style.zIndex = String(b.dragging ? 40 : b.hovered ? 32 : 8 + b.zBoost);

          if (core) {
            if (smoothEntry >= 0.992 || !isMatched) {
              core.style.opacity = "0";
              core.style.visibility = "hidden";
            } else {
              const coreAlpha =
                smoothEntry < 0.18
                  ? clamp01(smoothEntry / 0.14) * 0.96
                  : (1 - easeOutCubic((smoothEntry - 0.18) / 0.78)) * 0.96;
              core.style.opacity = coreAlpha.toFixed(3);
              core.style.visibility = coreAlpha > 0.01 ? "visible" : "hidden";
            }
          }

          if (tail) {
            if (smoothEntry >= 0.92 || smoothEntry <= 0.02 || !isMatched) {
              tail.style.opacity = "0";
              tail.style.visibility = "hidden";
            } else {
              const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) - finalAngle;
              const tailWindow = clamp01((smoothEntry - 0.02) / 0.84);
              const tailAlpha = Math.sin(tailWindow * Math.PI) * 0.94;
              const tailScale = 0.4 + (1 - flight) * 1.1;
              tail.style.opacity = tailAlpha.toFixed(3);
              tail.style.visibility = tailAlpha > 0.01 ? "visible" : "hidden";
              tail.style.transform = `rotate(${angleDeg.toFixed(1)}deg) scaleX(${tailScale.toFixed(3)})`;
            }
          }
        }
      } else {
        PROJECTS.forEach((proj, idx) => {
          const el = asteroidRefs.current[idx];
          if (!el) return;
          const isMatched = matchingRef.current.has(proj.id);
          el.style.transform = "";
          el.style.opacity = isMatched ? "" : "0";
          el.style.pointerEvents = isMatched ? "auto" : "none";
          el.style.zIndex = "";
        });
        resetOverlayElements();
      }

      if (alive && inView && isFreeField && !reducedMotion) {
        raf = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (alive && !raf) {
        lastTs = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) schedule();
      },
      { rootMargin: "260px 0px" },
    );
    io.observe(section);

    const onResize = () => {
      if (isFreeField) {
        const fw = field.clientWidth || 1100;
        const fh = field.clientHeight || 800;
        bodiesRef.current.forEach((b) => {
          b.x = Math.max(150, Math.min(fw - 150, b.x));
          b.y = Math.max(130, Math.min(fh - 130, b.y));
        });
      }
      schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      resetOverlayElements();
    };
  }, [isFreeField, reducedMotion]);

  const closeModal = () => {
    setInspectedProj(null);
    lastTriggerRef.current?.focus();
  };

  const onAsteroidPointerDown = (idx: number, e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    if (!isFreeField || e.button !== 0) return;

    const field = fieldRef.current;
    if (!field) return;
    const fRect = field.getBoundingClientRect();
    const b = bodiesRef.current[idx];
    const px = e.clientX - fRect.left;
    const py = e.clientY - fRect.top;

    b.dragging = true;
    b.zBoost = ++topZRef.current;

    dragRef.current = {
      idx,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: b.x - px,
      offsetY: b.y - py,
      lastX: b.x,
      lastY: b.y,
      lastTime: performance.now(),
      moved: false,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture rejection
    }
  };

  const onAsteroidPointerMove = (idx: number, e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.idx !== idx || drag.pointerId !== e.pointerId) return;
    const field = fieldRef.current;
    if (!field) return;

    const distMoved = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
    if (distMoved > 6) drag.moved = true;
    if (!drag.moved) return;

    const fRect = field.getBoundingClientRect();
    const b = bodiesRef.current[idx];
    const now = performance.now();
    const dt = Math.max(0.008, (now - drag.lastTime) / 1000);

    const nx = Math.max(90, Math.min(fRect.width - 90, e.clientX - fRect.left + drag.offsetX));
    const ny = Math.max(90, Math.min(fRect.height - 90, e.clientY - fRect.top + drag.offsetY));

    b.vx = Math.max(-180, Math.min(180, (nx - drag.lastX) / dt));
    b.vy = Math.max(-180, Math.min(180, (ny - drag.lastY) / dt));
    b.x = nx;
    b.y = ny;

    drag.lastX = nx;
    drag.lastY = ny;
    drag.lastTime = now;
  };

  const onAsteroidPointerUp = (idx: number, proj: ProjectRecord, e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.idx !== idx || drag.pointerId !== e.pointerId) return;

    const wasClick = !drag.moved;
    bodiesRef.current[idx].dragging = false;
    dragRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release mismatch
    }

    if (wasClick) {
      lastTriggerRef.current = e.currentTarget;
      setInspectedProj(proj);
    }
  };

  const onAsteroidKeyDown = (proj: ProjectRecord, e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lastTriggerRef.current = e.currentTarget;
      setInspectedProj(proj);
    }
  };

  return (
    <section ref={sectionRef} id="projects" className="ed-sec works-sec" aria-labelledby="projects-title">
      <div ref={ruleRef} className="section-rule" aria-hidden="true" />
      <div ref={headRef} className="ed-sec-head-split">
        <div className="ed-head-copy">
          <h2 id="projects-title" className="ed-h2">
            {t(UI_COPY.projectsHeading, lang)}
          </h2>
        </div>

        <div
          ref={filterBarRef}
          className="ed-filter-bar"
          role="group"
          aria-label={lang === "id" ? "Filter karya berdasarkan bidang" : "Filter works by domain"}
        >
          <span ref={filterPillRef} className="ed-filter-pill" aria-hidden="true" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              aria-pressed={filter === opt.key}
              className={`ed-filter-btn ${filter === opt.key ? "is-active" : ""}`}
              onClick={() => onChangeFilter(opt.key)}
            >
              {t(opt.label, lang)}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {lang === "id"
          ? `Menampilkan ${matchingIds.size} karya`
          : `Showing ${matchingIds.size} works`}
      </p>

      <div
        ref={fieldRef}
        className={`asteroid-field ${isFreeField ? "is-free" : "is-stacked"}`}
        onPointerMove={(e) => {
          if (!isFreeField || !fieldRef.current) return;
          const r = fieldRef.current.getBoundingClientRect();
          pointerFieldRef.current = { active: true, x: e.clientX - r.left, y: e.clientY - r.top };
        }}
        onPointerLeave={() => {
          pointerFieldRef.current.active = false;
        }}
      >
        <div className="asteroid-debris-layer" aria-hidden="true">
          {AMBIENT_PEBBLES.map((p, i) => (
            <span
              key={i}
              className="asteroid-pebble"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${Math.round(p.size * 0.78)}px`,
                clipPath: p.clip,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                ["--peb-rot" as string]: `${p.rot}deg`,
              }}
            />
          ))}
        </div>

        {PROJECTS.map((proj, idx) => {
          const shape = ASTEROID_SHAPES[idx];
          const isSelected = proj.id === activeProjectId;
          const isMatched = matchingIds.has(proj.id);

          if (!isFreeField && !isMatched) return null;

          return (
            <div
              key={proj.id}
              id={`node-${proj.id}`}
              ref={(el) => {
                asteroidRefs.current[idx] = el;
              }}
              role="button"
              tabIndex={isMatched ? 0 : -1}
              aria-label={`${proj.name} (${t(proj.role, lang)})`}
              className={`asteroid-body ${proj.isContributor ? "is-contributor" : ""} ${
                isSelected ? "is-selected" : ""
              }`}
              onPointerEnter={() => {
                bodiesRef.current[idx].hovered = true;
              }}
              onPointerLeave={() => {
                bodiesRef.current[idx].hovered = false;
              }}
              onPointerDown={(e) => onAsteroidPointerDown(idx, e)}
              onPointerMove={(e) => onAsteroidPointerMove(idx, e)}
              onPointerUp={(e) => onAsteroidPointerUp(idx, proj, e)}
              onPointerCancel={() => {
                bodiesRef.current[idx].dragging = false;
                if (dragRef.current?.idx === idx) dragRef.current = null;
              }}
              onClick={(e) => {
                if (!isFreeField && !(e.target as HTMLElement).closest("a")) {
                  lastTriggerRef.current = e.currentTarget;
                  setInspectedProj(proj);
                }
              }}
              onKeyDown={(e) => onAsteroidKeyDown(proj, e)}
            >
              <div
                ref={(el) => {
                  tailRefs.current[idx] = el;
                }}
                className="ast-meteor-tail"
                aria-hidden="true"
              />

              <div className="asteroid-rock" style={{ clipPath: shape.clipPath }}>
                <div
                  ref={(el) => {
                    coreRefs.current[idx] = el;
                  }}
                  className="ast-meteor-core"
                  aria-hidden="true"
                />

                <div className="asteroid-media">
                  {proj.demoVideo ? (
                    <video
                      className="asteroid-shot asteroid-video-preview"
                      autoPlay={!reducedMotion}
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      poster={proj.demoVideo.poster}
                      disablePictureInPicture
                      aria-hidden="true"
                    >
                      <source src={proj.demoVideo.webm} type="video/webm" />
                      <source src={proj.demoVideo.mp4} type="video/mp4" />
                    </video>
                  ) : proj.screenshot ? (
                    <img
                      src={proj.screenshot.src}
                      width={proj.screenshot.width}
                      height={proj.screenshot.height}
                      alt={t(proj.screenshot.alt, lang)}
                      className="asteroid-shot"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <NusantaraDataPlate lang={lang} compact />
                  )}
                </div>

                <div className="asteroid-info">
                  <div className="asteroid-top-meta">
                    <span className={`asteroid-role ${proj.isContributor ? "is-contributor" : ""}`}>
                      {proj.isContributor ? "Role: Data Contributor" : t(proj.shortTag, lang)}
                    </span>
                    <span className={`asteroid-star-inline mono ${proj.isContributor ? "is-contributor" : ""}`}>
                      {proj.starGreek} {proj.starName}
                    </span>
                  </div>

                  <h3>{proj.shortName}</h3>
                  <p className="asteroid-brief">{t(proj.summary, lang)}</p>

                  <div className="asteroid-foot">
                    <span className={`asteroid-metric mono ${proj.isContributor ? "is-contributor" : ""}`}>
                      {t(proj.metricDisplay, lang)}
                    </span>
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`asteroid-direct-link ${proj.isContributor ? "is-contributor" : ""}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{lang === "id" ? "Buka" : "Open"}</span>
                      <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                      <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
                    </a>
                  </div>
                </div>
              </div>

              <svg
                className="asteroid-rim-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {shape.facets.map((d, fIdx) => (
                  <path key={fIdx} d={d} className="asteroid-facet-line" vectorEffect="non-scaling-stroke" />
                ))}
                <polygon
                  points={shape.points}
                  className="asteroid-rim-poly"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          );
        })}
      </div>

      {inspectedProj && (
        <AsteroidDossierModal
          project={inspectedProj}
          lang={lang}
          reducedMotion={reducedMotion}
          onClose={closeModal}
        />
      )}
    </section>
  );
}
