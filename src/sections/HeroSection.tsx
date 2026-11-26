import { ArrowDownRight, ArrowUpRight, LinkedinLogo } from "@phosphor-icons/react";
import anime from "animejs";
import { useEffect, useLayoutEffect, useRef } from "react";
import { EclipseGlobe } from "../components/canvas/EclipseGlobe";
import { ScrollSequenceCanvas } from "../components/canvas/ScrollSequenceCanvas";
import { computeFlowVideoRect, FLOW_MANIFEST } from "../data/flowManifest";
import { PROFILE, PROJECTS, SKILL_ROLES, t, UI_COPY, type Locale } from "../data/portfolio";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { attachMagnetic, clearAnimated, EASE_OUT_EXPO } from "../lib/motion";

type HeroSectionProps = {
  lang: Locale;
  activeProjectId: string;
  onSelectNode: (id: string, jumpToArchive?: boolean) => void;
};

function VisualSplitWord({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`split-line ${className}`} aria-hidden="true">
      {[...text].map((ch, idx) => (
        <span key={idx} className="split-char-mask">
          <span className="split-char js-hero-char">{ch === " " ? "\u00A0" : ch}</span>
        </span>
      ))}
    </span>
  );
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

export function HeroSection({ lang, activeProjectId, onSelectNode }: HeroSectionProps) {
  const runwayRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const copyColRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const metaGroupRef = useRef<HTMLDivElement>(null);
  const arriveLayerRef = useRef<HTMLDivElement>(null);
  const globeLayerRef = useRef<HTMLDivElement>(null);
  const shatterVideoLayerRef = useRef<HTMLDivElement>(null);
  const shatterBloomRef = useRef<HTMLDivElement>(null);
  const primaryCtaRef = useRef<HTMLAnchorElement>(null);
  const secondaryCtaRef = useRef<HTMLAnchorElement>(null);

  const arriveProgressRef = useRef(0);
  const shatterProgressRef = useRef(0);
  const globeInteractiveRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const hasFlowVideos =
    FLOW_MANIFEST["eclipse-arrive"].frameCount > 0 &&
    FLOW_MANIFEST["eclipse-shatter"].frameCount > 0;

  // Initial dramatic Name-Only display typography reveal
  useLayoutEffect(() => {
    const root = runwayRef.current;
    if (!root || reducedMotion) return;

    const chars = root.querySelectorAll(".js-hero-char");
    anime.set(chars, { translateY: "108%" });

    const tl = anime.timeline({
      easing: EASE_OUT_EXPO,
      complete: () => clearAnimated(chars),
    });
    tl.add({
      targets: chars,
      translateY: ["108%", "0%"],
      duration: 860,
      delay: anime.stagger(34),
    });

    return () => {
      tl.pause();
      anime.remove(chars);
      clearAnimated(chars);
    };
  }, [reducedMotion]);

  // Continuous 3-Phase Hybrid Cinema -> Interactive -> Meteor Handoff directly into real `#projects`:
  //   0.00 -> 0.23: Name-only opening glides left; Google Flow `eclipse-arrive` brings the giant planet in
  //   0.23 -> 0.60: Seamless pixel-locked handoff to interactive 3D Cassiopeia Planet (drag 360° & click stars)
  //   0.55 -> 1.00: Seamless handoff to Google Flow `eclipse-shatter` (molten cracks -> supernova -> 5 blazing meteors)
  // Runs in useLayoutEffect so centering and initial opacity=0 apply BEFORE the browser's first paint (zero flash).
  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const sticky = stickyRef.current;
    if (!runway || !sticky || reducedMotion) return;

    let raf = 0;
    let initialized = false;
    let smoothP = 0;

    const tick = () => {
      raf = 0;
      const rect = runway.getBoundingClientRect();
      const vw = sticky.clientWidth || window.innerWidth || 1280;
      const vh = sticky.clientHeight || window.innerHeight || 800;
      const scrollable = Math.max(1, rect.height - vh);
      const targetP = clamp01(-rect.top / scrollable);

      if (!initialized) {
        smoothP = targetP;
        initialized = true;
      } else {
        const diff = targetP - smoothP;
        smoothP = Math.abs(diff) < 0.00035 ? targetP : smoothP + diff * 0.12;
      }

      const p = smoothP;
      const vr = computeFlowVideoRect(vw, vh, 1280, 720);

      // Feed raw target track into ScrollSequenceCanvas (same 0.12 smooth damping in lockstep)
      // Rebalanced timing gives a generous scroll dwell pause on the interactive 3D planet (0.22 -> 0.60)
      arriveProgressRef.current = clamp01(targetP / 0.23);
      shatterProgressRef.current = clamp01((targetP - 0.58) / 0.29);

      // Overlapping silk-smooth crossfade curves with generous interactive globe dwell
      const globeIn = easeOutCubic((p - 0.19) / 0.07);
      const globeOut = 1 - easeOutCubic((p - 0.56) / 0.1);
      const globeAlpha = globeIn * globeOut;
      globeInteractiveRef.current = globeAlpha > 0.72;

      const arriveAlpha = 1 - easeOutCubic((p - 0.21) / 0.06);
      // Shatter crossfades gently over 0.55 -> 0.65 so cracks ignite smoothly after the interactive dwell,
      // peaks with blazing meteors around 0.85..0.88, then zooms & dissolves into rising cards (0.85 -> 0.99)
      const shatterIn = easeOutCubic((p - 0.55) / 0.1);
      const shatterOut = 1 - easeOutCubic((p - 0.85) / 0.14);
      const shatterVideoAlpha = shatterIn * shatterOut;
      const shatterZoom = 1 + clamp01((p - 0.81) / 0.19) * 0.18;

      // Dual-peak warm solar-ember veil: soft ignition pulse across globe->shatter handoff + meteor burst bridge
      const ignitePulse =
        easeOutCubic((p - 0.54) / 0.06) * (1 - easeOutCubic((p - 0.61) / 0.08)) * 0.36;
      const bloomRise = easeOutCubic((p - 0.78) / 0.09);
      const bloomFall = 1 - easeOutCubic((p - 0.87) / 0.12);
      const bloomAlpha = Math.min(0.86, ignitePulse + bloomRise * bloomFall * 0.78);

      // 1. Copy column: centered Name-Only at p=0 without ever pushing mobile skill pills off-screen
      if (copyColRef.current) {
        const revealT = easeOutCubic(p / 0.23);
        const parentLeft = copyColRef.current.parentElement?.offsetLeft ?? 0;
        const exitAlpha = 1 - clamp01((p - 0.58) / 0.1);
        const exitShiftY = -clamp01((p - 0.58) / 0.12) * 28;

        if (vr.isCompact) {
          const h1W = headingRef.current?.offsetWidth || 240;
          const h1CenterX = Math.max(0, vw * 0.5 - (parentLeft + h1W * 0.5));
          const currY = (1 - revealT) * (vh * 0.22);
          copyColRef.current.style.transform = `translate3d(0px, ${(currY + exitShiftY).toFixed(1)}px, 0)`;
          if (headingRef.current) {
            headingRef.current.style.transform = `translate3d(${(h1CenterX * (1 - revealT)).toFixed(1)}px, 0, 0)`;
          }
        } else {
          const naturalW = copyColRef.current.offsetWidth || 320;
          const centerShiftX = vw * 0.5 - (parentLeft + naturalW * 0.5);
          const currX = centerShiftX * (1 - revealT);
          const currScale = 1.14 - 0.14 * revealT;
          copyColRef.current.style.transform = `translate3d(${currX.toFixed(1)}px, ${exitShiftY.toFixed(1)}px, 0) scale(${currScale.toFixed(4)})`;
          if (headingRef.current) {
            headingRef.current.style.transform = "";
          }
        }

        copyColRef.current.style.opacity = exitAlpha.toFixed(3);
        copyColRef.current.style.pointerEvents = exitAlpha > 0.25 ? "auto" : "none";
      }

      if (metaGroupRef.current) {
        const metaT = easeOutCubic((p - 0.08) / 0.15);
        metaGroupRef.current.style.opacity = metaT.toFixed(3);
        metaGroupRef.current.style.transform = `translateY(${((1 - metaT) * 18).toFixed(1)}px)`;
        metaGroupRef.current.style.pointerEvents = metaT > 0.35 && p < 0.62 ? "auto" : "none";
      }

      // 2. Layer opacities & interactive pointer handoff
      if (arriveLayerRef.current) {
        arriveLayerRef.current.style.opacity = arriveAlpha.toFixed(3);
        arriveLayerRef.current.style.visibility = arriveAlpha > 0.01 ? "visible" : "hidden";
      }

      if (globeLayerRef.current) {
        globeLayerRef.current.style.opacity = globeAlpha.toFixed(3);
        globeLayerRef.current.style.visibility = globeAlpha > 0.01 ? "visible" : "hidden";
        globeLayerRef.current.style.pointerEvents = globeAlpha > 0.55 ? "auto" : "none";
      }

      if (shatterVideoLayerRef.current) {
        shatterVideoLayerRef.current.style.opacity = shatterVideoAlpha.toFixed(3);
        shatterVideoLayerRef.current.style.transform = `scale(${shatterZoom.toFixed(4)})`;
        shatterVideoLayerRef.current.style.visibility = shatterVideoAlpha > 0.01 ? "visible" : "hidden";
      }

      if (shatterBloomRef.current) {
        shatterBloomRef.current.style.opacity = bloomAlpha.toFixed(3);
        shatterBloomRef.current.style.visibility = bloomAlpha > 0.01 ? "visible" : "hidden";
      }

      if (Math.abs(targetP - smoothP) >= 0.00035) {
        raf = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (headingRef.current) headingRef.current.style.transform = "";
      if (copyColRef.current) {
        copyColRef.current.style.transform = "";
        copyColRef.current.style.opacity = "";
        copyColRef.current.style.pointerEvents = "";
      }
      if (metaGroupRef.current) {
        metaGroupRef.current.style.transform = "";
        metaGroupRef.current.style.opacity = "";
        metaGroupRef.current.style.pointerEvents = "";
      }
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const cleanups = [
      attachMagnetic(primaryCtaRef.current, 0.18),
      attachMagnetic(secondaryCtaRef.current, 0.18),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  return (
    <section
      ref={runwayRef}
      id="overview"
      className={`obs-hero-runway ${reducedMotion ? "is-reduced" : ""}`}
      aria-labelledby="hero-heading"
    >
      <div ref={stickyRef} className="obs-hero-sticky">
        {/* Layer 1: Google Flow `eclipse-arrive` (pitch-black space -> monumental planet gliding in) */}
        {!reducedMotion && hasFlowVideos && (
          <div ref={arriveLayerRef} className="obs-flow-layer">
            <ScrollSequenceCanvas
              slot="eclipse-arrive"
              progressRef={arriveProgressRef}
              useHeroRect
              className="obs-flow-canvas"
            />
          </div>
        )}

        {/* Layer 2: Interactive 360° Draggable 3D Eclipse Planet + Clickable Cassiopeia Stars */}
        <div ref={globeLayerRef} className="obs-planet-layer">
          <EclipseGlobe
            nodes={PROJECTS}
            activeNodeId={activeProjectId}
            lang={lang}
            matchFlowPlanet={hasFlowVideos && !reducedMotion}
            interactiveActiveRef={globeInteractiveRef}
            onSelectNode={onSelectNode}
          />
        </div>

        {/* Layer 3: Google Flow `eclipse-shatter` (molten cracks -> supernova -> 5 blazing meteors handing off into `#projects`) */}
        {!reducedMotion && hasFlowVideos && (
          <>
            <div ref={shatterVideoLayerRef} className="obs-flow-layer obs-flow-shatter">
              <ScrollSequenceCanvas
                slot="eclipse-shatter"
                progressRef={shatterProgressRef}
                useHeroRect
                className="obs-flow-canvas"
              />
            </div>
            <div ref={shatterBloomRef} className="obs-shatter-bloom" aria-hidden="true" />
          </>
        )}

        <div className="obs-stage-vignette" aria-hidden="true" />

        {/* Left Editorial Identity (starts pure centered Name-Only at scroll=0) */}
        <div className="obs-hero-content">
          <div ref={copyColRef} className="obs-hero-copy">
            <h1 ref={headingRef} id="hero-heading" className="obs-h1">
              <span className="sr-only">{PROFILE.fullName}</span>
              <VisualSplitWord text={PROFILE.firstName} />
              <VisualSplitWord text={PROFILE.lastName} className="obs-h1-accent" />
            </h1>

            <div ref={metaGroupRef} className="obs-hero-meta">
              <ul className="obs-pillars" aria-label={lang === "id" ? "Skill dan peran utama" : "Core skills and roles"}>
                {SKILL_ROLES.map((skill) => (
                  <li key={skill.en}>{t(skill, lang)}</li>
                ))}
              </ul>

              <div className="obs-actions">
                <a ref={primaryCtaRef} href="#projects" className="btn-solar">
                  {t(UI_COPY.heroPrimaryCta, lang)}
                  <ArrowDownRight size={16} weight="bold" aria-hidden="true" />
                </a>
                <a
                  ref={secondaryCtaRef}
                  href={PROFILE.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  <LinkedinLogo size={17} weight="fill" aria-hidden="true" />
                  {t(UI_COPY.heroSecondaryCta, lang)}
                  <ArrowUpRight size={14} aria-hidden="true" />
                  <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
