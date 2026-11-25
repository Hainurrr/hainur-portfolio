import anime from "animejs";
import { prefersReducedMotion } from "../hooks/useReducedMotion";

export const EASE_OUT_EXPO = "easeOutExpo";
export const EASE_OUT_QUART = "easeOutQuart";
export const EASE_CALM = "easeOutCubic";
export const SPRING_SNAPPY = "spring(1, 90, 11, 0)";
export const SPRING_GENTLE = "spring(1, 70, 14, 0)";

type TargetInput = Element | null | undefined | Iterable<Element | null | undefined>;
type ClearableProp = "transform" | "opacity" | "clipPath";

function toHtmlList(targets: TargetInput): HTMLElement[] {
  if (!targets) return [];
  if (targets instanceof Element) {
    return targets instanceof HTMLElement ? [targets] : [];
  }
  const out: HTMLElement[] = [];
  for (const item of targets) {
    if (item instanceof HTMLElement) out.push(item);
  }
  return out;
}

/**
 * Temporarily suppresses CSS transform/clip-path transitions while Anime.js owns an element,
 * preventing CSS transitions from smearing 60fps JS-driven frames.
 */
export function markAnimating(targets: TargetInput): void {
  for (const el of toHtmlList(targets)) {
    el.dataset.animating = "true";
  }
}

/**
 * Releases Anime.js inline styles once a one-shot animation completes so CSS :hover transforms
 * and natural opacity remain crisp and responsive.
 */
export function clearAnimated(
  targets: TargetInput,
  props: ClearableProp[] = ["transform", "opacity"],
): void {
  for (const el of toHtmlList(targets)) {
    delete el.dataset.animating;
    for (const prop of props) {
      el.style[prop] = "";
    }
  }
}

/**
 * Softly primes elements currently below the viewport fold for a deliberate reading reveal.
 * Never touches elements already inside or above the viewport on load/anchor-jump.
 */
export function primeBelowFold(targets: TargetInput, yOffset = 34, opacity = 0.08): void {
  for (const el of toHtmlList(targets)) {
    el.dataset.animating = "true";
    el.style.opacity = String(opacity);
    el.style.transform = `translateY(${yOffset}px)`;
  }
}

/**
 * Attaches a subtle Anime.js spring magnetic pull to a button or tile on fine-pointer devices.
 */
export function attachMagnetic(el: HTMLElement | null, strength = 0.2): () => void {
  if (!el || prefersReducedMotion()) return () => undefined;
  if (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches) {
    return () => undefined;
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
    el.dataset.animating = "true";
    anime.remove(el);
    anime({
      targets: el,
      translateX: dx,
      translateY: dy,
      duration: 240,
      easing: "easeOutQuad",
    });
  };

  const onLeave = () => {
    anime.remove(el);
    anime({
      targets: el,
      translateX: 0,
      translateY: 0,
      duration: 620,
      easing: SPRING_SNAPPY,
      complete: () => {
        delete el.dataset.animating;
        el.style.transform = "";
      },
    });
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);

  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    anime.remove(el);
    delete el.dataset.animating;
    el.style.transform = "";
  };
}

/**
 * Tracks fine-pointer coordinates inside an element (`--mx`, `--my`) for tactile radial spotlight sheen
 * and optional gentle micro-3D card tilt (`--rx`, `--ry`). Zero React re-renders.
 */
export function attachSpotlight(
  el: HTMLElement | null,
  opts: { tiltDeg?: number } = {},
): () => void {
  if (!el || prefersReducedMotion()) return () => undefined;
  if (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches) {
    return () => undefined;
  }

  const tiltDeg = opts.tiltDeg ?? 0;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x.toFixed(1)}px`);
    el.style.setProperty("--my", `${y.toFixed(1)}px`);
    el.dataset.spot = "true";

    if (tiltDeg > 0) {
      const nx = (x / Math.max(1, rect.width) - 0.5) * 2;
      const ny = (y / Math.max(1, rect.height) - 0.5) * 2;
      el.style.setProperty("--rx", `${(-ny * tiltDeg).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(nx * tiltDeg).toFixed(2)}deg`);
    }
  };

  const onLeave = () => {
    el.dataset.spot = "false";
    if (tiltDeg > 0) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);

  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    delete el.dataset.spot;
    el.style.removeProperty("--mx");
    el.style.removeProperty("--my");
    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
  };
}

/**
 * Smoothly counts a verified numeric metric from 0 up to `targetValue` with locale formatting.
 */
export function animateCountUp(
  el: HTMLElement | null,
  targetValue: number,
  displayTemplate: string,
  locale: "id" | "en",
): anime.AnimeInstance | undefined {
  if (!el || prefersReducedMotion()) return undefined;
  const formatter = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US");
  const formattedFinal = formatter.format(targetValue);
  const suffix = displayTemplate.replace(formattedFinal, "").trim();
  const state = { val: 0 };

  return anime({
    targets: state,
    val: targetValue,
    duration: targetValue > 1000 ? 1150 : 720,
    easing: EASE_OUT_EXPO,
    round: 1,
    update: () => {
      const num = formatter.format(Math.round(state.val));
      el.textContent = suffix ? `${num} ${suffix}` : num;
    },
    complete: () => {
      el.textContent = displayTemplate;
    },
  });
}

export type ScrollScrubOptions = {
  /** Viewport fraction where progress starts (0 = top of viewport, 1 = bottom of viewport). */
  start?: number;
  /** Viewport fraction where progress finishes. */
  end?: number;
  /** Ensures progress reaches 100% when the element's bottom reaches the bottom of the viewport. */
  finishAtBottom?: boolean;
  /** Optional targets whose inline styles should be cleared on unmount or reduced-motion toggle. */
  resetTargets?: () => TargetInput;
};

/**
 * Scrubs an Anime.js timeline (`autoplay: false`) 1:1 with viewport scroll progress across `el`.
 * Pauses scroll calculations when outside the viewport and clears inline styles cleanly on teardown.
 */
export function bindScrollScrub(
  el: HTMLElement | null,
  buildTimeline: () => anime.AnimeTimelineInstance,
  opts: ScrollScrubOptions = {},
): () => void {
  if (!el || prefersReducedMotion()) return () => undefined;
  const { start = 1.0, end = 0.15, finishAtBottom = false, resetTargets } = opts;

  const tl = buildTimeline();
  let raf = 0;
  let active = true;

  const update = () => {
    raf = 0;
    if (!active) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const startY = vh * start;
    let endY = vh * end - rect.height * 0.35;
    if (finishAtBottom) {
      const bottomReachY = vh - rect.height + 24;
      endY = Math.max(endY, bottomReachY);
    }
    const span = Math.max(1, startY - endY);
    const raw = (startY - rect.top) / span;
    const progress = Math.min(1, Math.max(0, raw));
    tl.seek(tl.duration * progress);
  };

  const schedule = () => {
    if (!raf && active) raf = requestAnimationFrame(update);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      if (active) schedule();
    },
    { rootMargin: "180px 0px" },
  );
  io.observe(el);

  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  return () => {
    active = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    tl.pause();
    if (resetTargets) {
      const nodes = toHtmlList(resetTargets());
      anime.remove(nodes);
      clearAnimated(nodes, ["transform", "opacity", "clipPath"]);
    }
  };
}

/**
 * Scrubs a warm solar chapter hairline (`scaleX: 0 -> 1`) as a recruiter scrolls into a new section.
 */
export function bindSectionRule(ruleEl: HTMLElement | null): () => void {
  if (!ruleEl || prefersReducedMotion()) return () => undefined;
  return bindScrollScrub(
    ruleEl,
    () => {
      const tl = anime.timeline({ autoplay: false, easing: "easeOutQuad" });
      tl.add({
        targets: ruleEl,
        scaleX: [0, 1],
        opacity: [0.2, 1],
        duration: 1000,
      });
      return tl;
    },
    {
      start: 0.94,
      end: 0.48,
      resetTargets: () => [ruleEl],
    },
  );
}

export type ReadingRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  /** Called immediately ONLY for elements currently below the viewport fold so they unfold smoothly when reached. */
  prime?: (el: HTMLElement) => void;
  /** Called to immediately clear primed styles if the user jumps past an element or on teardown. */
  restore?: (el: HTMLElement) => void;
};

/**
 * Fires a calm, reading-paced Anime.js reveal as each section or card enters the reading zone.
 * Automatically restores any element skipped above the viewport (e.g. via anchor jump) so nothing ever stays dimmed.
 */
export function observeScrollItems(
  elements: Iterable<Element>,
  onEnter: (el: HTMLElement, index: number) => void,
  opts: ReadingRevealOptions = {},
): () => void {
  if (prefersReducedMotion()) return () => undefined;
  const list = Array.from(elements).filter((el): el is HTMLElement => el instanceof HTMLElement);
  if (!list.length || typeof IntersectionObserver === "undefined") return () => undefined;

  const indexMap = new Map<HTMLElement, number>();
  const pending = new Set<HTMLElement>();
  const vh = window.innerHeight || 900;

  list.forEach((el, idx) => {
    indexMap.set(el, idx);
    const rect = el.getBoundingClientRect();
    // Only prime items waiting below the initial viewport fold
    if (rect.top > vh * 0.92) {
      opts.prime?.(el);
    }
    pending.add(el);
  });

  const settle = (target: HTMLElement, instant: boolean) => {
    if (!pending.has(target)) return;
    pending.delete(target);
    io.unobserve(target);
    if (instant) {
      opts.restore?.(target);
      clearAnimated(target, ["transform", "opacity", "clipPath"]);
      return;
    }
    onEnter(target, indexMap.get(target) ?? 0);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          settle(target, false);
        } else if (entry.boundingClientRect.bottom < 0) {
          // User jumped past this element (e.g. via nav anchor) -> restore cleanly
          settle(target, true);
        }
      }
    },
    {
      threshold: opts.threshold ?? 0.1,
      rootMargin: opts.rootMargin ?? "0px 0px -12% 0px",
    },
  );

  list.forEach((el) => io.observe(el));

  return () => {
    io.disconnect();
    anime.remove(list);
    list.forEach((el) => {
      opts.restore?.(el);
    });
    clearAnimated(list, ["transform", "opacity", "clipPath"]);
  };
}
