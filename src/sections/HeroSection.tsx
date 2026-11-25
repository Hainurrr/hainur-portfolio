import { ArrowDownRight, ArrowUpRight, LinkedinLogo } from "@phosphor-icons/react";
import anime from "animejs";
import { useEffect, useLayoutEffect, useRef } from "react";
import { EclipseGlobe } from "../components/canvas/EclipseGlobe";
import { ScrollSequenceCanvas } from "../components/canvas/ScrollSequenceCanvas";
import { computeFlowVideoRect, FLOW_MANIFEST } from "../data/flowManifest";
import { PROFILE, PROJECTS, t, UI_COPY, type Locale } from "../data/portfolio";
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
  //   0.00 -> 0.27: Name-only opening glides left; Google Flow `eclipse-arrive` brings the giant planet in
  //   0.27 -> 0.51: Seamless pixel-locked handoff to interactive 3D Cassiopeia Planet (drag 360° & click stars)
  //   0.51 -> 1.00: Seamless handoff to Google Flow `eclipse-shatter` (molten cracks -> supernova -> 5 blazing meteors dissolving right into the real `#projects` cards!)
  useEffect(() => {
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

      // Feed raw target track into ScrollSequenceCanvas (which applies the exact same 0.12 smooth damping in lockstep)
      arriveProgressRef.current = clamp01(targetP / 0.27);
      // Pure meteor explosion sequence (64 frames: molten cracks -> blast -> 5 blazing meteors, zero wireframe boxes)
      shatterProgressRef.current = clamp01((targetP - 0.51) / 0.34);

      // Overlapping crossfade curves with zero dark flash
      const globeIn = easeOutCubic((p - 0.23) / 0.06);
      const globeOut = 1 - easeOutCubic((p - 0.5) / 0.06);
      const globeAlpha = globeIn * globeOut;

      const arriveAlpha = 1 - easeOutCubic((p - 0.26) / 0.05);
      // Shatter fades in over 0.49 -> 0.55, peaks with blazing meteors around 0.83..0.86, then zooms & dissolves smoothly behind rising cards (0.83 -> 0.99)
      const shatterIn = easeOutCubic((p - 0.49) / 0.06);
      const shatterOut = 1 - easeOutCubic((p - 0.83) / 0.16);
      const shatterVideoAlpha = shatterIn * shatterOut;
      const shatterZoom = 1 + clamp01((p - 0.8) / 0.2) * 0.16;

      // Subtle warm solar-ember atmospheric bridge peaking right as the meteors morph into real cards
      const bloomRise = easeOutCubic((p - 0.75) / 0.1);
      const bloomFall = 1 - easeOutCubic((p - 0.85) / 0.14);
      const bloomAlpha = bloomRise * bloomFall * 0.78;

      // 1. Copy column: mathematically centered Name-Only at p=0 (using actual H1 width so mobile centers dead-on), glides flush-left as planet arrives
      if (copyColRef.current) {
        const revealT = easeOutCubic(p / 0.26);
        const parentLeft = copyColRef.current.parentElement?.offsetLeft ?? 0;
        const naturalW =
          (vr.isCompact ? headingRef.current?.offsetWidth : copyColRef.current.offsetWidth) || 320;
        const centerShiftX = vw * 0.5 - (parentLeft + naturalW * 0.5);
        const startScale = vr.isCompact ? 1.0 : 1.14;
        const currX = centerShiftX * (1 - revealT);
        const currY = vr.isCompact ? (1 - revealT) * (vh * 0.25) : 0;
        const currScale = startScale - (startScale - 1) * revealT;
        const exitAlpha = 1 - clamp01((p - 0.5) / 0.11);
        const exitShiftY = -clamp01((p - 0.5) / 0.13) * 28;

        copyColRef.current.style.transform = `translate3d(${currX.toFixed(1)}px, ${(currY + exitShiftY).toFixed(1)}px, 0) scale(${currScale.toFixed(4)})`;
        copyColRef.current.style.opacity = exitAlpha.toFixed(3);
        copyColRef.current.style.pointerEvents = exitAlpha > 0.25 ? "auto" : "none";
      }

      if (metaGroupRef.current) {
        const metaT = easeOutCubic((p - 0.09) / 0.17);
        metaGroupRef.current.style.opacity = metaT.toFixed(3);
        metaGroupRef.current.style.transform = `translateY(${((1 - metaT) * 18).toFixed(1)}px)`;
        metaGroupRef.current.style.pointerEvents = metaT > 0.35 && p < 0.54 ? "auto" : "none";
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
              <ul className="obs-pillars" aria-label={lang === "id" ? "Bidang fokus utama" : "Core focus areas"}>
                <li>Web Development</li>
                <li>Data &amp; Business Intelligence</li>
                <li>{lang === "id" ? "Sistem Informasi" : "Information Systems"}</li>
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
