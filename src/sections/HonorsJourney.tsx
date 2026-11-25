import { ArrowUpRight } from "@phosphor-icons/react";
import anime from "animejs";
import { useEffect, useRef } from "react";
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

export function HonorsJourney({ lang }: HonorsJourneyProps) {
  const ruleRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const cleanups = [
      attachMagnetic(ctaRef.current, 0.16),
      attachSpotlight(cardRef.current, { tiltDeg: 1.6 }),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  // Clean scroll reveal: chapter rule -> title & link -> official Beasiswa Kukar Idaman image frame
  useEffect(() => {
    if (reducedMotion) return;
    const cleanups: (() => void)[] = [];

    if (ruleRef.current) {
      cleanups.push(bindSectionRule(ruleRef.current));
    }

    if (headRef.current) {
      const getItems = (el: HTMLElement) => el.querySelectorAll("h2, .scholarship-link-btn");
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
              duration: 820,
              delay: anime.stagger(110),
              easing: EASE_OUT_EXPO,
              complete: () => clearAnimated(items),
            });
          },
          {
            prime: (el) => primeBelowFold(getItems(el), 26, 0.06),
            restore: (el) => clearAnimated(getItems(el)),
          },
        ),
      );
    }

    if (cardRef.current) {
      cleanups.push(
        observeScrollItems(
          [cardRef.current],
          (card) => {
            const img = card.querySelector(".scholarship-img");
            markAnimating([card, img]);
            const tl = anime.timeline({
              easing: EASE_OUT_EXPO,
              complete: () => clearAnimated([card, img], ["transform", "opacity", "clipPath"]),
            });
            tl.add({
              targets: card,
              translateY: [42, 0],
              opacity: [0.08, 1],
              clipPath: ["inset(8% 0% 0% 0%)", "inset(0% 0% 0% 0%)"],
              duration: 940,
            });
            if (img) {
              tl.add(
                {
                  targets: img,
                  scale: [1.06, 1],
                  duration: 1100,
                  easing: EASE_CALM,
                },
                "-=940",
              );
            }
            if (glintRef.current) {
              tl.add(
                {
                  targets: glintRef.current,
                  translateX: ["-135%", "165%"],
                  opacity: [0, 0.72, 0],
                  duration: 1250,
                  easing: "easeInOutQuad",
                },
                "-=620",
              );
            }
          },
          {
            prime: (card) => primeBelowFold(card, 42, 0.08),
            restore: (card) =>
              clearAnimated([card, card.querySelector(".scholarship-img")], [
                "transform",
                "opacity",
                "clipPath",
              ]),
          },
        ),
      );
    }

    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  return (
    <section id="honors" className="ed-sec honors-sec" aria-labelledby="honors-title">
      <div ref={ruleRef} className="section-rule" aria-hidden="true" />

      <div className="scholarship-layout">
        <div ref={headRef} className="scholarship-head">
          <h2 id="honors-title" className="ed-h2">
            {t(UI_COPY.scholarshipTitle, lang)}
          </h2>

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

        <a
          ref={cardRef}
          href={PROFILE.links.scholarship}
          target="_blank"
          rel="noopener noreferrer"
          className="scholarship-frame"
          aria-label={`${t(UI_COPY.scholarshipTitle, lang)} ${t(UI_COPY.opensNewTab, lang)}`}
        >
          <span ref={glintRef} className="scholarship-glint" aria-hidden="true" />
          <img
            src={PROFILE.scholarshipMedia.src}
            width={PROFILE.scholarshipMedia.width}
            height={PROFILE.scholarshipMedia.height}
            alt={t(PROFILE.scholarshipMedia.alt, lang)}
            className="scholarship-img"
            loading="lazy"
            decoding="async"
          />
          <span className="scholarship-bar mono">
            <span>bis.telkomuniversity.ac.id/beasiswa-kukar-idaman</span>
            <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  );
}
