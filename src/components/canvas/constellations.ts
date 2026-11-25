import { DEG_TO_RAD, geoToCartesian, type Vec3 } from "./globeMath";

export const CASSIOPEIA_EDGES: readonly [number, number][] = [
  [0, 1],
  [1, 3],
  [3, 2],
  [2, 4],
];

export const CASSIOPEIA_TITLE_VEC: Vec3 = geoToCartesian(32, 112);

export const LABEL_OFFSET_DIR: Record<string, readonly [number, number]> = {
  telyucan: [-0.85, -0.78],
  telyuji: [-0.72, 0.88],
  "pokemon-analytics": [0.0, -1.0],
  "fraud-dashboard": [0.76, 0.88],
  "nusantara-atlas": [0.85, -0.76],
};

export type RealConstellation = {
  name: string;
  labelAt: [number, number];
  stars: { lat: number; lon: number; mag: number }[];
  edges: [number, number][];
};

export const REAL_AMBIENT_CONSTELLATIONS: RealConstellation[] = [
  {
    name: "CRUX",
    labelAt: [-31, 111],
    stars: [
      { lat: -38, lon: 112, mag: 0.95 },
      { lat: -63, lon: 108, mag: 1.0 },
      { lat: -48, lon: 98, mag: 0.72 },
      { lat: -50, lon: 124, mag: 0.92 },
      { lat: -55, lon: 103, mag: 0.5 },
    ],
    edges: [
      [0, 1],
      [2, 3],
    ],
  },
  {
    name: "ORION",
    labelAt: [34, -72],
    stars: [
      { lat: 20, lon: -88, mag: 1.0 },
      { lat: 16, lon: -56, mag: 0.85 },
      { lat: 27, lon: -72, mag: 0.58 },
      { lat: -2, lon: -80, mag: 0.82 },
      { lat: 0, lon: -72, mag: 0.88 },
      { lat: 2, lon: -64, mag: 0.78 },
      { lat: -24, lon: -84, mag: 0.76 },
      { lat: -22, lon: -52, mag: 1.0 },
    ],
    edges: [
      [0, 2],
      [2, 1],
      [0, 1],
      [0, 3],
      [1, 5],
      [3, 4],
      [4, 5],
      [3, 6],
      [5, 7],
      [6, 7],
    ],
  },
  {
    name: "URSA MAJOR",
    labelAt: [66, -18],
    stars: [
      { lat: 60, lon: -44, mag: 0.92 },
      { lat: 44, lon: -46, mag: 0.78 },
      { lat: 40, lon: -24, mag: 0.76 },
      { lat: 54, lon: -20, mag: 0.65 },
      { lat: 56, lon: -2, mag: 0.95 },
      { lat: 58, lon: 14, mag: 0.84 },
      { lat: 48, lon: 28, mag: 0.9 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: "SCORPIUS",
    labelAt: [11, -138],
    stars: [
      { lat: 4, lon: -124, mag: 0.76 },
      { lat: -4, lon: -120, mag: 0.78 },
      { lat: -12, lon: -122, mag: 0.68 },
      { lat: -10, lon: -134, mag: 1.0 },
      { lat: -19, lon: -140, mag: 0.66 },
      { lat: -29, lon: -146, mag: 0.74 },
      { lat: -41, lon: -152, mag: 0.64 },
      { lat: -43, lon: -162, mag: 0.78 },
      { lat: -35, lon: -170, mag: 0.92 },
      { lat: -30, lon: -165, mag: 0.72 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
    ],
  },
  {
    name: "CYGNUS",
    labelAt: [60, -140],
    stars: [
      { lat: 54, lon: -140, mag: 1.0 },
      { lat: 38, lon: -140, mag: 0.86 },
      { lat: 18, lon: -140, mag: 0.76 },
      { lat: 32, lon: -118, mag: 0.78 },
      { lat: 44, lon: -162, mag: 0.74 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [4, 1],
      [1, 3],
    ],
  },
  {
    name: "LYRA",
    labelAt: [46, 26],
    stars: [
      { lat: 38, lon: 22, mag: 1.0 },
      { lat: 39, lon: 33, mag: 0.6 },
      { lat: 32, lon: 27, mag: 0.65 },
      { lat: 21, lon: 23, mag: 0.76 },
      { lat: 21, lon: 34, mag: 0.76 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 2],
    ],
  },
];

export const SPHERE_STARS: { vec: Vec3; r: number; a: number; phase: number; warm: boolean }[] =
  Array.from({ length: 96 }, (_, i) => {
    const u = (((Math.sin(i * 17.31 + 1.9) * 43758.5453) % 1) + 1) % 1;
    const v = (((Math.sin(i * 63.17 + 4.3) * 29183.7461) % 1) + 1) % 1;
    const lon = u * 360 - 180;
    const lat = Math.asin(2 * v - 1) / DEG_TO_RAD;
    return {
      vec: geoToCartesian(lat, lon),
      r: 0.6 + (i % 4) * 0.3,
      a: 0.2 + (i % 5) * 0.1,
      phase: i * 1.41,
      warm: i % 3 !== 0,
    };
  });

export function drawCelestialStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isTeal: boolean,
  isActive: boolean,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const glowRadius = size * (isActive ? 4.4 : 3.2);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  if (isTeal) {
    grad.addColorStop(0, "rgba(204, 251, 241, 0.95)");
    grad.addColorStop(0.26, "rgba(45, 212, 191, 0.55)");
    grad.addColorStop(1, "rgba(45, 212, 191, 0)");
  } else {
    grad.addColorStop(0, "rgba(255, 250, 235, 0.98)");
    grad.addColorStop(0.28, "rgba(245, 158, 11, 0.58)");
    grad.addColorStop(1, "rgba(245, 158, 11, 0)");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  const spikeLen = size * (isActive ? 3.4 : 2.2);
  ctx.strokeStyle = isTeal ? "rgba(204, 251, 241, 0.86)" : "rgba(254, 240, 199, 0.9)";
  ctx.lineWidth = isActive ? 1.15 : 0.85;
  ctx.beginPath();
  ctx.moveTo(x - spikeLen, y);
  ctx.lineTo(x + spikeLen, y);
  ctx.moveTo(x, y - spikeLen);
  ctx.lineTo(x, y + spikeLen);
  ctx.stroke();

  if (isActive) {
    const diag = spikeLen * 0.44;
    ctx.strokeStyle = isTeal ? "rgba(45, 212, 191, 0.6)" : "rgba(245, 158, 11, 0.65)";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(x - diag, y - diag);
    ctx.lineTo(x + diag, y + diag);
    ctx.moveTo(x + diag, y - diag);
    ctx.lineTo(x - diag, y + diag);
    ctx.stroke();

    ctx.strokeStyle = isTeal ? "rgba(45, 212, 191, 0.72)" : "rgba(254, 240, 199, 0.68)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = isTeal ? "#f0fdfa" : "#fffdf7";
  ctx.beginPath();
  ctx.arc(x, y, size * (isActive ? 0.68 : 0.56), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
