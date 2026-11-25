import anime from "animejs";
import { useEffect, useId, useRef } from "react";
import { prefersReducedMotion } from "../../hooks/useReducedMotion";
import { SPRING_SNAPPY } from "../../lib/motion";

type BrandMarkProps = {
  size?: number;
  animateOnMount?: boolean;
};

/**
 * Original Geometric HF Eclipse Monogram, animated with Anime.js SVG stroke drawing.
 * Replays a crisp solar-crescent draw sweep on mount (optional) and on pointer hover.
 */
export function BrandMark({ size = 30, animateOnMount = false }: BrandMarkProps) {
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const busyRef = useRef(false);

  const playDraw = () => {
    const svg = svgRef.current;
    if (!svg || prefersReducedMotion() || busyRef.current) return;
    busyRef.current = true;

    const arc = svg.querySelector(".hf-arc");
    const glyph = svg.querySelector(".hf-glyph");
    const dot = svg.querySelector(".hf-dot");

    anime.remove([arc, glyph, dot]);
    const tl = anime.timeline({
      easing: "easeOutExpo",
      complete: () => {
        busyRef.current = false;
      },
    });

    tl.add({
      targets: arc,
      strokeDashoffset: [anime.setDashoffset, 0],
      duration: 720,
    })
      .add(
        {
          targets: glyph,
          strokeDashoffset: [anime.setDashoffset, 0],
          duration: 560,
        },
        "-=480",
      )
      .add(
        {
          targets: dot,
          scale: [0, 1],
          opacity: [0, 1],
          duration: 520,
          easing: SPRING_SNAPPY,
        },
        "-=340",
      );
  };

  useEffect(() => {
    if (animateOnMount) {
      playDraw();
    }
    const svg = svgRef.current;
    return () => {
      if (svg) anime.remove(svg.querySelectorAll("*"));
    };
  }, [animateOnMount]);

  return (
    <svg
      ref={svgRef}
      className="hf-monogram"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      onPointerEnter={playDraw}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef0c7" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Outer partial solar eclipse crescent */}
      <path
        className="hf-arc"
        d="M47 14 A23 23 0 1 0 47 50"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Architectural H·F ligature */}
      <path
        className="hf-glyph"
        d="M23 20 V44 M23 32 H38 M38 20 V32 M38 20 H49 M38 32 H46"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="square"
      />
      {/* Orbital signal dot */}
      <circle
        className="hf-dot"
        cx="49"
        cy="44"
        r="3.4"
        fill="#f59e0b"
        style={{ transformOrigin: "49px 44px" }}
      />
    </svg>
  );
}
