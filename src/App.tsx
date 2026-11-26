import { useCallback, useEffect, useState } from "react";
import { AmbientStarfield } from "./components/canvas/AmbientStarfield";
import { PROJECTS, type Locale } from "./data/portfolio";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { ContactFinale } from "./sections/ContactFinale";
import { HeroSection } from "./sections/HeroSection";
import { HonorsJourney } from "./sections/HonorsJourney";
import { NavBar } from "./sections/NavBar";
import { ProfileDiptych } from "./sections/ProfileDiptych";
import { ProjectsGallery, type ProjectFilter } from "./sections/ProjectsGallery";

export function App() {
  const [lang, setLang] = useState<Locale>("id");
  const [activeProjectId, setActiveProjectId] = useState<string>(PROJECTS[0].id);
  const [detailOpenTick, setDetailOpenTick] = useState(0);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("All");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === "id"
        ? "Hainur Fadillah | Frontend, Web Dev, Data Analytics, Cloud & AI, Design & Prototyping"
        : "Hainur Fadillah | Frontend, Web Dev, Data Analytics, Cloud & AI, Design & Prototyping";
  }, [lang]);

  const scrollToElement = useCallback(
    (id: string, block: ScrollLogicalPosition = "start") => {
      const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior, block });
      });
    },
    [reducedMotion],
  );

  const handleSelectFromGlobe = useCallback(
    (id: string, jumpToArchive = false) => {
      setActiveProjectId(id);
      if (jumpToArchive) {
        setProjectFilter("All");
        setDetailOpenTick((n) => n + 1);
        scrollToElement("projects", "start");
      }
    },
    [scrollToElement],
  );

  return (
    <div className="site-shell">
      <AmbientStarfield />
      <NavBar lang={lang} onChangeLang={setLang} />
      <main id="main-content">
        <HeroSection
          lang={lang}
          activeProjectId={activeProjectId}
          onSelectNode={handleSelectFromGlobe}
        />
        <ProjectsGallery
          lang={lang}
          filter={projectFilter}
          activeProjectId={activeProjectId}
          detailOpenTick={detailOpenTick}
          onChangeFilter={setProjectFilter}
        />
        <ProfileDiptych lang={lang} />
        <HonorsJourney lang={lang} />
      </main>
      <ContactFinale lang={lang} />
    </div>
  );
}

export default App;
