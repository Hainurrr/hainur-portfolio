import anime from "animejs";
import { useEffect, useRef } from "react";
import { PortraitFrame } from "../components/ui/PortraitFrame";
import { PROFILE, SKILL_ROLES, t, UI_COPY, type Locale } from "../data/portfolio";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  bindScrollScrub,
  bindSectionRule,
  clearAnimated,
  EASE_OUT_EXPO,
  markAnimating,
  observeScrollItems,
  primeBelowFold,
} from "../lib/motion";

type ProfileDiptychProps = {
  lang: Locale;
};

export function ProfileDiptych({ lang }: ProfileDiptychProps) {
  const secRef = useRef<HTMLElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const narrativeRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  const bioWords = t(UI_COPY.profileBio, lang).split(" ");

  useEffect(() => {
    const portrait = portraitRef.current;
    if (!portrait || reducedMotion) return;

    const cleanups: (() => void)[] = [];

    if (ruleRef.current) {
      cleanups.push(bindSectionRule(ruleRef.current));
    }

    // 1:1 scroll-illuminated word-by-word reading highlight across the profile bio
    if (bioRef.current) {
      const bioEl = bioRef.current;
      const words = bioEl.querySelectorAll<HTMLElement>(".js-bio-word");
      if (words.length) {
        cleanups.push(
          bindScrollScrub(
            bioEl,
            () => {
              const tl = anime.timeline({ autoplay: false, easing: "linear" });
              tl.add({
                targets: words,
                opacity: [0.32, 1],
                duration: 280,
                delay: anime.stagger(32),
              });
              return tl;
            },
            {
              start: 0.9,
              end: 0.36,
              resetTargets: () => words,
            },
          ),
        );
      }
    }

    // 1:1 scrubbed subtle float on the background-free portrait
    cleanups.push(
      bindScrollScrub(
        portrait,
        () => {
          const tl = anime.timeline({ autoplay: false, easing: "linear" });
          tl.add({ targets: portrait, translateY: [24, -18], duration: 1000 }, 0);
          return tl;
        },
        {
          start: 0.96,
          end: 0.05,
          resetTargets: () => [portrait],
        },
      ),
    );

    if (narrativeRef.current) {
      const getItems = (el: HTMLElement) => el.querySelectorAll("h2, .profile-facts > div");
      cleanups.push(
        observeScrollItems(
          [narrativeRef.current],
          (el) => {
            const items = getItems(el);
            markAnimating(items);
            anime({
              targets: items,
              translateY: [26, 0],
              opacity: [0.06, 1],
              duration: 840,
              delay: anime.stagger(130),
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

    return () => cleanups.forEach((fn) => fn());
  }, [lang, reducedMotion]);

  return (
    <section ref={secRef} id="profile" className="ed-sec profile-sec" aria-labelledby="profile-title">
      <div ref={ruleRef} className="section-rule" aria-hidden="true" />
      <div className="profile-layout">
        <div ref={narrativeRef} className="profile-narrative">
          <h2 id="profile-title" className="ed-h2">
            {t(UI_COPY.profileHeading, lang)}
          </h2>
          <p ref={bioRef} className="profile-text">
            {bioWords.map((word, idx) => (
              <span key={`${lang}-${idx}`} className="bio-word js-bio-word">
                {word}
                {idx < bioWords.length - 1 ? " " : ""}
              </span>
            ))}
          </p>

          <dl className="profile-facts">
            <div>
              <dt>{lang === "id" ? "Institusi" : "Institution"}</dt>
              <dd>Telkom University · S1 Sistem Informasi</dd>
            </div>
            <div>
              <dt>{lang === "id" ? "Asal & Domisili" : "Location"}</dt>
              <dd>{PROFILE.location}</dd>
            </div>
            <div>
              <dt>{lang === "id" ? "Skill & Peran" : "Skills & Roles"}</dt>
              <dd>
                <ul className="profile-skill-list">
                  {SKILL_ROLES.map((skill) => (
                    <li key={skill.en}>{t(skill, lang)}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>

        <div ref={portraitRef} className="profile-portrait-col">
          <PortraitFrame
            src={PROFILE.photos.academic.src}
            revealSrc={PROFILE.photos.academic.revealSrc}
            width={PROFILE.photos.academic.width}
            height={PROFILE.photos.academic.height}
            alt={t(PROFILE.photos.academic.alt, lang)}
          />
        </div>
      </div>
    </section>
  );
}
