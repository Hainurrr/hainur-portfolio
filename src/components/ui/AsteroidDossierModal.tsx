import {
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  Info,
  MagnifyingGlassPlus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import anime from "animejs";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, UI_COPY, type Locale, type ProjectRecord } from "../../data/portfolio";
import { animateCountUp, EASE_OUT_EXPO } from "../../lib/motion";
import { NusantaraDataPlate } from "./NusantaraDataPlate";

type AsteroidDossierModalProps = {
  project: ProjectRecord;
  lang: Locale;
  reducedMotion: boolean;
  onClose: () => void;
};

/** Full dossier modal + sample page zoom lightbox rendered cleanly into document.body via Portal. */
export function AsteroidDossierModal({
  project,
  lang,
  reducedMotion,
  onClose,
}: AsteroidDossierModalProps) {
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const modalMetricRef = useRef<HTMLElement>(null);
  const [zoomSampleIdx, setZoomSampleIdx] = useState<number | null>(null);

  useEffect(() => {
    setZoomSampleIdx(null);
    modalCloseRef.current?.focus();

    if (modalPanelRef.current && !reducedMotion) {
      anime.remove(modalPanelRef.current);
      anime({
        targets: modalPanelRef.current,
        scale: [0.93, 1],
        opacity: [0, 1],
        duration: 380,
        easing: EASE_OUT_EXPO,
      });
    }

    let countAnim: anime.AnimeInstance | undefined;
    if (modalMetricRef.current && project.metricValue && !reducedMotion) {
      countAnim = animateCountUp(
        modalMetricRef.current,
        project.metricValue,
        t(project.metricDisplay, lang),
        lang,
      );
    }

    return () => {
      countAnim?.pause();
    };
  }, [project, lang, reducedMotion]);

  useEffect(() => {
    const totalSamples = project.samplePages?.length ?? 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomSampleIdx !== null) {
          setZoomSampleIdx(null);
        } else {
          onClose();
        }
      } else if (zoomSampleIdx !== null && totalSamples > 1) {
        if (e.key === "ArrowRight") {
          setZoomSampleIdx((idx) => (idx === null ? 0 : (idx + 1) % totalSamples));
        } else if (e.key === "ArrowLeft") {
          setZoomSampleIdx((idx) => (idx === null ? 0 : (idx - 1 + totalSamples) % totalSamples));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, zoomSampleIdx, onClose]);

  const activeSample =
    project.samplePages && zoomSampleIdx !== null ? project.samplePages[zoomSampleIdx] : null;

  return createPortal(
    <>
      <div
        className="lightbox-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asteroid-modal-title"
        onClick={onClose}
      >
        <div
          ref={modalPanelRef}
          className={`asteroid-modal ${project.isContributor ? "is-contributor" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="asteroid-modal-head">
            <div className="asteroid-modal-title-wrap">
              <div className="asteroid-modal-pills">
                <span className={`work-role-pill ${project.isContributor ? "is-contributor" : ""}`}>
                  {t(project.role, lang)}
                </span>
                <span className="asteroid-modal-star mono">
                  {project.starGreek} Cas · {project.starName}
                </span>
              </div>
              <h3 id="asteroid-modal-title">{project.name}</h3>
            </div>

            <button
              ref={modalCloseRef}
              type="button"
              className="lightbox-close"
              aria-label={t(UI_COPY.lightboxClose, lang)}
              onClick={onClose}
            >
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <div className="asteroid-modal-scroll">
            <div className={`asteroid-modal-media ${project.demoVideo ? "is-video" : ""}`}>
              {project.demoVideo ? (
                <video
                  key={project.id}
                  className="asteroid-modal-video"
                  controls
                  autoPlay={!reducedMotion}
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster={project.demoVideo.poster}
                >
                  <source src={project.demoVideo.webm} type="video/webm" />
                  <source src={project.demoVideo.mp4} type="video/mp4" />
                </video>
              ) : project.screenshot ? (
                <img
                  src={project.screenshot.src}
                  width={project.screenshot.width}
                  height={project.screenshot.height}
                  alt={t(project.screenshot.alt, lang)}
                  className="asteroid-modal-img"
                />
              ) : (
                <NusantaraDataPlate lang={lang} />
              )}
            </div>

            {project.samplePages && project.samplePages.length > 0 && (
              <div className="asteroid-samples">
                <div className="asteroid-samples-head">
                  <span className="asteroid-samples-title mono">
                    {lang === "id" ? "Sampel Halaman" : "Sample Pages"}
                  </span>
                  <span className="asteroid-samples-count mono">
                    {project.samplePages.length} {lang === "id" ? "Tampilan" : "Views"}
                  </span>
                </div>
                <div className="asteroid-samples-grid">
                  {project.samplePages.map((sample, sIdx) => (
                    <button
                      key={sample.src}
                      type="button"
                      className="asteroid-sample-card"
                      onClick={() => setZoomSampleIdx(sIdx)}
                    >
                      <div className="asteroid-sample-thumb">
                        <img
                          src={sample.src}
                          width={sample.width}
                          height={sample.height}
                          alt={t(sample.alt, lang)}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="asteroid-sample-zoom" aria-hidden="true">
                          <MagnifyingGlassPlus size={15} weight="bold" />
                        </span>
                      </div>
                      <span className="asteroid-sample-label">{t(sample.title, lang)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="asteroid-modal-body">
              <p className="work-summary">{t(project.summary, lang)}</p>

              {project.teamCredit && (
                <p className="work-team-credit">
                  <UsersThree size={16} weight="bold" aria-hidden="true" />
                  <span>{t(project.teamCredit, lang)}</span>
                </p>
              )}

              {project.isContributor && project.contributorNote && (
                <div className="work-contrib-notice" role="note">
                  <Info size={16} weight="bold" aria-hidden="true" />
                  <span>{t(project.contributorNote, lang)}</span>
                </div>
              )}

              {project.highlights[lang].length > 0 && (
                <ul className="work-highlights">
                  {project.highlights[lang].map((hl) => (
                    <li key={hl}>{hl}</li>
                  ))}
                </ul>
              )}

              <div className="work-stack">
                {project.stack.map((item) => (
                  <span key={item} className="mono">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="asteroid-modal-foot">
            <div className="work-metric">
              <strong ref={modalMetricRef} className="tabular">
                {t(project.metricDisplay, lang)}
              </strong>
              <span>{t(project.metricLabel, lang)}</span>
            </div>

            <div className="asteroid-modal-actions">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`work-launch ${project.isContributor ? "is-contributor" : ""}`}
              >
                {project.isContributor
                  ? t(UI_COPY.cardLaunchPlatform, lang)
                  : t(UI_COPY.cardLaunchBuilt, lang)}
                <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
                <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {activeSample && project.samplePages && zoomSampleIdx !== null && (
        <div
          className="sample-zoom-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t(activeSample.title, lang)}
          onClick={() => setZoomSampleIdx(null)}
        >
          <div className="sample-zoom-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sample-zoom-head">
              <div>
                <strong>{t(activeSample.title, lang)}</strong>
                <span className="mono">
                  {zoomSampleIdx + 1} / {project.samplePages.length}
                </span>
              </div>
              <div className="sample-zoom-nav">
                {project.samplePages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="lightbox-close"
                      aria-label={lang === "id" ? "Halaman sebelumnya" : "Previous page"}
                      onClick={() =>
                        setZoomSampleIdx(
                          (zoomSampleIdx - 1 + project.samplePages!.length) %
                            project.samplePages!.length,
                        )
                      }
                    >
                      <CaretLeft size={18} weight="bold" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="lightbox-close"
                      aria-label={lang === "id" ? "Halaman berikutnya" : "Next page"}
                      onClick={() =>
                        setZoomSampleIdx((zoomSampleIdx + 1) % project.samplePages!.length)
                      }
                    >
                      <CaretRight size={18} weight="bold" aria-hidden="true" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="lightbox-close"
                  aria-label={t(UI_COPY.lightboxClose, lang)}
                  onClick={() => setZoomSampleIdx(null)}
                >
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </div>
            <img
              src={activeSample.src}
              width={activeSample.width}
              height={activeSample.height}
              alt={t(activeSample.alt, lang)}
              className="sample-zoom-img"
            />
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
