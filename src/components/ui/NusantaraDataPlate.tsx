import { useEffect, useId, useRef } from "react";
import { FLOW_MANIFEST } from "../../data/flowManifest";
import { type Locale } from "../../data/portfolio";
import { ScrollSequenceCanvas } from "../canvas/ScrollSequenceCanvas";

type NusantaraDataPlateProps = {
  lang: Locale;
  compact?: boolean;
};

/** Dedicated East Kalimantan data-bridge plate for Nusantara Atlas (Role: Data Contributor). */
export function NusantaraDataPlate({ lang, compact = false }: NusantaraDataPlateProps) {
  const glowId = useId();
  const plateRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const hasFlowClip = FLOW_MANIFEST["kaltim-atlas"].frameCount > 0;

  useEffect(() => {
    if (!hasFlowClip || !plateRef.current) return;
    const el = plateRef.current;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      progressRef.current = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
    };
  }, [hasFlowClip]);

  return (
    <div ref={plateRef} className={`nusantara-plate ${hasFlowClip ? "has-flow-clip" : ""}`} aria-hidden="true">
      {hasFlowClip && (
        <ScrollSequenceCanvas slot="kaltim-atlas" progressRef={progressRef} className="nusantara-flow-bg" />
      )}
      <svg viewBox="0 0 640 330" className="nusantara-svg">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#070607" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="640" height="330" fill={hasFlowClip ? "rgba(7, 10, 11, 0.42)" : "#0b1112"} />
        <circle cx="320" cy="158" r="195" fill={`url(#${glowId})`} />

        <circle cx="320" cy="158" r="78" fill="none" stroke="rgba(45, 212, 191, 0.16)" strokeWidth="1" />
        <circle cx="320" cy="158" r="126" fill="none" stroke="rgba(45, 212, 191, 0.09)" strokeWidth="1" />

        <path
          d="M126 168 Q224 114 320 158"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.88"
        />
        <path
          d="M320 158 Q418 114 514 168"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.88"
        />
        <path
          d="M126 168 Q320 228 514 168"
          fill="none"
          stroke="rgba(45, 212, 191, 0.34)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        <circle r="3.6" fill="#fef0c7" className="nusa-packet">
          <animateMotion dur="3.4s" repeatCount="indefinite" path="M126 168 Q224 114 320 158" />
        </circle>
        <circle r="3.6" fill="#5eead4" className="nusa-packet">
          <animateMotion dur="3.4s" begin="1.15s" repeatCount="indefinite" path="M320 158 Q418 114 514 168" />
        </circle>

        <circle cx="126" cy="168" r="11" fill="none" stroke="#f59e0b" strokeWidth="1.4" className="nusa-radar-ping" />

        {[
          {
            x: 126,
            y: 168,
            label: lang === "id" ? "WARGA LOKAL" : "LOCAL REPORTS",
            sub: lang === "id" ? "Karhutla Kaltim" : "E. Kaltim Wildfires",
            warm: true,
          },
          {
            x: 320,
            y: 158,
            label: "KALIMANTAN TIMUR",
            sub: "Data Contributor",
            hi: true,
          },
          {
            x: 514,
            y: 168,
            label: "NUSANTARA ATLAS",
            sub: lang === "id" ? "Data Terbuka" : "Open Atlas",
          },
        ].map((pt) => (
          <g key={pt.label}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.hi ? 16 : 11}
              fill={pt.warm ? "rgba(245, 158, 11, 0.16)" : "rgba(45, 212, 191, 0.14)"}
              stroke={pt.warm ? "#f59e0b" : "#2dd4bf"}
              strokeWidth="1.5"
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.hi ? 5 : 3.5}
              fill={pt.hi ? "#fef0c7" : pt.warm ? "#f59e0b" : "#2dd4bf"}
            />
            <text x={pt.x} y={pt.y + 32} textAnchor="middle" className="nusa-label mono">
              {pt.label}
            </text>
            {!compact && (
              <text x={pt.x} y={pt.y + 48} textAnchor="middle" className="nusa-sub mono">
                {pt.sub}
              </text>
            )}
          </g>
        ))}

        <text x="320" y="294" textAnchor="middle" className="nusa-caption mono">
          {lang === "id"
            ? "FOKUS KALIMANTAN TIMUR · ROLE: DATA CONTRIBUTOR"
            : "EAST KALIMANTAN FOCUS · ROLE: DATA CONTRIBUTOR"}
        </text>
      </svg>
    </div>
  );
}
