import { ArrowUpRight, GithubLogo, LinkedinLogo, WhatsappLogo } from "@phosphor-icons/react";
import anime from "animejs";
import { useEffect, useRef } from "react";
import { ScrollSequenceCanvas } from "../components/canvas/ScrollSequenceCanvas";
import { BrandMark } from "../components/ui/BrandMark";
import { FLOW_MANIFEST } from "../data/flowManifest";
import { PROFILE, t, UI_COPY, type Locale } from "../data/portfolio";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  attachMagnetic,
  attachSpotlight,
  bindScrollScrub,
  clearAnimated,
  EASE_OUT_EXPO,
  markAnimating,
  observeScrollItems,
  primeBelowFold,
  SPRING_GENTLE,
} from "../lib/motion";

type ContactFinaleProps = {
  lang: Locale;
};

export function ContactFinale({ lang }: ContactFinaleProps) {
  const footRef = useRef<HTMLElement>(null);
  const horizonRef = useRef<HTMLDivElement>(null);
  const horizonProgressRef = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const hasHorizonClip = FLOW_MANIFEST["eclipse-horizon"].frameCount > 0;

  useEffect(() => {
    if (reducedMotion) return;
    const cleanups = tileRefs.current.flatMap((el) => [
      attachMagnetic(el, 0.12),
      attachSpotlight(el),
    ]);
    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  // Scrubbed Solar Eclipse Horizon emergence + calm closing reading reveal
  useEffect(() => {
    const foot = footRef.current;
    if (!foot || reducedMotion) return;

    const cleanups: (() => void)[] = [];

    if (hasHorizonClip) {
      let raf = 0;
      const syncHorizon = () => {
        raf = 0;
        const rect = foot.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const startY = vh;
        const endY = Math.max(vh - rect.height + 24, vh * 0.3);
        const span = Math.max(1, startY - endY);
        horizonProgressRef.current = Math.max(0, Math.min(1, (startY - rect.top) / span));
      };
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(syncHorizon);
      };
      syncHorizon();
      window.addEventListener("scroll", schedule, { passive: true });
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", schedule);
      });
    } else if (horizonRef.current) {
      cleanups.push(
        bindScrollScrub(
          foot,
          () => {
            const tl = anime.timeline({ autoplay: false, easing: "easeOutQuad" });
            tl.add({
              targets: horizonRef.current,
              translateY: [110, 0],
              scale: [0.84, 1],
              opacity: [0.3, 1],
              duration: 1000,
            });
            return tl;
          },
          {
            start: 1.0,
            end: 0.35,
            finishAtBottom: true,
            resetTargets: () => [horizonRef.current],
          },
        ),
      );
    }

    if (topRef.current) {
      const getTopItems = (el: HTMLElement) => ({
        heading: el.querySelectorAll(".finale-h2, .finale-note"),
        tiles: el.querySelectorAll(".channel-tile"),
      });
      cleanups.push(
        observeScrollItems(
          [topRef.current],
          (el) => {
            const { heading, tiles } = getTopItems(el);
            const all = [...Array.from(heading), ...Array.from(tiles)];
            markAnimating(all);
            const tl = anime.timeline({
              easing: EASE_OUT_EXPO,
              complete: () => clearAnimated(all),
            });
            tl.add({
              targets: heading,
              translateY: [28, 0],
              opacity: [0.06, 1],
              duration: 840,
              delay: anime.stagger(130),
            }).add(
              {
                targets: tiles,
                translateY: [34, 0],
                scale: [0.975, 1],
                opacity: [0.08, 1],
                duration: 860,
                delay: anime.stagger(150),
                easing: SPRING_GENTLE,
              },
              "-=560",
            );
          },
          {
            prime: (el) => {
              const { heading, tiles } = getTopItems(el);
              primeBelowFold(heading, 28, 0.06);
              primeBelowFold(tiles, 34, 0.08);
            },
            restore: (el) => {
              const { heading, tiles } = getTopItems(el);
              clearAnimated([...Array.from(heading), ...Array.from(tiles)]);
            },
          },
        ),
      );
    }

    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  return (
    <footer ref={footRef} id="connect" className="eclipse-footer" aria-labelledby="connect-title">
      <div className={`eclipse-horizon ${hasHorizonClip ? "has-flow-clip" : ""}`} aria-hidden="true">
        {hasHorizonClip ? (
          <ScrollSequenceCanvas
            slot="eclipse-horizon"
            progressRef={horizonProgressRef}
            className="eclipse-horizon-canvas"
          />
        ) : (
          <div ref={horizonRef} className="eclipse-horizon-ring" />
        )}
      </div>

      <div className="footer-wrap">
        <div ref={topRef} className="finale-top">
          <h2 id="connect-title" className="finale-h2">
            {t(UI_COPY.contactHeading, lang)}
          </h2>
          <p className="finale-note">{t(UI_COPY.contactNote, lang)}</p>

          <div className="channel-tiles">
            <a
              ref={(el) => {
                tileRefs.current[0] = el;
              }}
              href={PROFILE.links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-tile channel-tile-solar channel-tile-wa"
            >
              <div className="channel-tile-head">
                <WhatsappLogo size={22} weight="fill" aria-hidden="true" />
                <ArrowUpRight size={18} weight="bold" className="channel-arrow" aria-hidden="true" />
              </div>
              <strong>WhatsApp</strong>
              <p>{t(UI_COPY.contactWhatsAppSub, lang)}</p>
              <span className="mono channel-handle">wa.me/6281348508082</span>
              <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
            </a>

            <a
              ref={(el) => {
                tileRefs.current[1] = el;
              }}
              href={PROFILE.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-tile"
            >
              <div className="channel-tile-head">
                <LinkedinLogo size={22} weight="fill" aria-hidden="true" />
                <ArrowUpRight size={18} weight="bold" className="channel-arrow" aria-hidden="true" />
              </div>
              <strong>LinkedIn</strong>
              <p>{t(UI_COPY.contactLinkedInSub, lang)}</p>
              <span className="mono channel-handle">/in/hainur-fadillah-8081521ba</span>
              <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
            </a>

            <a
              ref={(el) => {
                tileRefs.current[2] = el;
              }}
              href={PROFILE.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-tile"
            >
              <div className="channel-tile-head">
                <GithubLogo size={22} weight="fill" aria-hidden="true" />
                <ArrowUpRight size={18} weight="bold" className="channel-arrow" aria-hidden="true" />
              </div>
              <strong>GitHub</strong>
              <p>{t(UI_COPY.contactGitHubSub, lang)}</p>
              <span className="mono channel-handle">github.com/Hainurrr</span>
              <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
            </a>
          </div>
        </div>

        <div className="footer-legal">
          <a href="#overview" className="footer-brand">
            <BrandMark size={24} />
            <span>HAINUR FADILLAH</span>
          </a>
          <span>© {new Date().getFullYear()} Hainur Fadillah · {PROFILE.location}</span>
        </div>
      </div>
    </footer>
  );
}
