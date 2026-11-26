export type FlowSlotId =
  | "eclipse-arrive"
  | "eclipse-shatter"
  | "kaltim-atlas"
  | "eclipse-horizon";

export type FlowSequenceSpec = {
  /** Number of extracted WebP frames (0 means procedural fallback renders until converted) */
  frameCount: number;
  width: number;
  height: number;
  /** Public URL template with `{i}` replaced by 4-digit zero-padded 1-based frame index */
  urlPattern: string;
};

/** Exact calibrated resting planet circle on 1280x720 Google Flow frames (normalized to video dimensions) */
export const FLOW_PLANET_ANCHOR = {
  cx: 0.7893,
  cy: 0.5778,
  rOfHeight: 0.4938,
} as const;

/** Exact calibrated blazing meteor head positions on the final pure-meteor shatter frame (normalized 1280x720) */
export const FLOW_METEOR_ANCHORS: readonly { x: number; y: number }[] = [
  { x: 0.37, y: 0.37 }, // 0: TelyuCan (top-left meteor)
  { x: 0.64, y: 0.43 }, // 1: Telyuji (top-right meteor)
  { x: 0.16, y: 0.43 }, // 2: Credit Card Fraud Dashboard (far-left meteor)
  { x: 0.34, y: 0.69 }, // 3: PokéData ML (lower-center meteor)
  { x: 0.66, y: 0.56 }, // 4: Nusantara Atlas Kaltim (lower-right meteor)
] as const;

/**
 * Shared projection rect mapping 1280x720 video space into viewport space so the Google Flow canvas,
 * interactive 3D WebGL planet, and meteor-to-card origins stay pixel-locked at any screen size.
 */
export function computeFlowVideoRect(vw: number, vh: number, vidW = 1280, vidH = 720) {
  const isCompact = vw < 900;
  if (isCompact && vh > vw) {
    // Portrait phone/tablet: keep right edge flush (zero video cutoff seam) while bringing planet
    // generously into the lower viewport below the top Hero copy & CTAs
    const scale = Math.min((vw * 1.28) / vidW, (vh * 0.54) / vidH);
    const dw = vidW * scale;
    const dh = vidH * scale;
    const dx = vw - dw;
    const dy = vh * 0.7 - FLOW_PLANET_ANCHOR.cy * dh;
    return { dx, dy, dw, dh, scale, isCompact };
  }
  const scale = isCompact ? Math.min(vw / vidW, vh / vidH) : Math.max(vw / vidW, vh / vidH);
  const dw = vidW * scale;
  const dh = vidH * scale;
  const dx = (vw - dw) * 0.5;
  const dy = (vh - dh) * 0.5;
  return { dx, dy, dw, dh, scale, isCompact };
}

export const FLOW_MANIFEST: Record<FlowSlotId, FlowSequenceSpec> = {
  "eclipse-arrive": {
    frameCount: 64,
    width: 1280,
    height: 720,
    urlPattern: "/sequences/eclipse-arrive/frame_{i}.webp",
  },
  "eclipse-shatter": {
    frameCount: 64,
    width: 1280,
    height: 720,
    urlPattern: "/sequences/eclipse-shatter/frame_{i}.webp",
  },
  "kaltim-atlas": {
    frameCount: 0,
    width: 960,
    height: 540,
    urlPattern: "/sequences/kaltim-atlas/frame_{i}.webp",
  },
  "eclipse-horizon": {
    frameCount: 0,
    width: 1280,
    height: 720,
    urlPattern: "/sequences/eclipse-horizon/frame_{i}.webp",
  },
};
