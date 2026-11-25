export type AsteroidShapeSpec = {
  clipPath: string;
  points: string;
  facets: string[];
  initX: number;
  initY: number;
  initVx: number;
  initVy: number;
  swayPhase: number;
  swaySpeed: number;
};

/** 5 unique faceted volcanic asteroid silhouettes with generous safe core for unclipped media, text & actions */
export const ASTEROID_SHAPES: readonly AsteroidShapeSpec[] = [
  {
    // 0: TelyuCan (broad angular basalt shard)
    clipPath:
      "polygon(5% 13%, 19% 3%, 65% 2%, 88% 7%, 98% 23%, 96% 74%, 85% 95%, 52% 98%, 17% 95%, 4% 77%, 2% 34%)",
    points: "5,13 19,3 65,2 88,7 98,23 96,74 85,95 52,98 17,95 4,77 2,34",
    facets: ["M5,13 L15,19 L19,3", "M96,74 L86,80 L85,95"],
    initX: 0.24,
    initY: 0.24,
    initVx: 21,
    initVy: 12,
    swayPhase: 0.3,
    swaySpeed: 0.42,
  },
  {
    // 1: Telyuji (crystalline obsidian fragment)
    clipPath:
      "polygon(9% 5%, 51% 2%, 84% 6%, 97% 20%, 98% 66%, 89% 92%, 63% 98%, 21% 96%, 5% 82%, 2% 40%, 5% 17%)",
    points: "9,5 51,2 84,6 97,20 98,66 89,92 63,98 21,96 5,82 2,40 5,17",
    facets: ["M84,6 L82,18 L97,20", "M5,82 L16,80 L21,96"],
    initX: 0.74,
    initY: 0.23,
    initVx: -19,
    initVy: 15,
    swayPhase: 1.7,
    swaySpeed: 0.37,
  },
  {
    // 2: Credit Card Fraud Dashboard (tabular volcanic monolith)
    clipPath:
      "polygon(4% 18%, 18% 4%, 61% 2%, 90% 9%, 98% 30%, 95% 78%, 81% 96%, 34% 98%, 10% 91%, 2% 58%)",
    points: "4,18 18,4 61,2 90,9 98,30 95,78 81,96 34,98 10,91 2,58",
    facets: ["M18,4 L22,15 L4,18", "M95,78 L83,84 L81,96"],
    initX: 0.19,
    initY: 0.74,
    initVx: 18,
    initVy: -14,
    swayPhase: 2.9,
    swaySpeed: 0.45,
  },
  {
    // 3: PokéData ML (faceted core meteorite)
    clipPath:
      "polygon(8% 8%, 38% 2%, 77% 4%, 95% 16%, 98% 58%, 91% 88%, 72% 97%, 28% 97%, 7% 86%, 2% 45%)",
    points: "8,8 38,2 77,4 95,16 98,58 91,88 72,97 28,97 7,86 2,45",
    facets: ["M77,4 L78,16 L95,16", "M7,86 L18,82 L28,97"],
    initX: 0.5,
    initY: 0.5,
    initVx: -16,
    initVy: -17,
    swayPhase: 4.1,
    swaySpeed: 0.39,
  },
  {
    // 4: Nusantara Atlas Kaltim (teal-obsidian contributor shard)
    clipPath:
      "polygon(7% 10%, 34% 2%, 73% 3%, 93% 14%, 98% 46%, 93% 83%, 76% 97%, 31% 98%, 9% 89%, 2% 49%)",
    points: "7,10 34,2 73,3 93,14 98,46 93,83 76,97 31,98 9,89 2,49",
    facets: ["M7,10 L18,17 L34,2", "M93,83 L80,86 L76,97"],
    initX: 0.81,
    initY: 0.75,
    initVx: -22,
    initVy: -12,
    swayPhase: 5.2,
    swaySpeed: 0.41,
  },
];

/** Subtle ambient drifting basalt micro-pebbles adding depth across the zero-gravity belt */
export const AMBIENT_PEBBLES = [
  { x: 6, y: 12, size: 18, rot: 14, dur: 17, delay: -2, clip: "polygon(15% 4%, 84% 12%, 96% 64%, 62% 96%, 10% 78%)" },
  { x: 46, y: 8, size: 14, rot: -28, dur: 21, delay: -7, clip: "polygon(22% 8%, 92% 18%, 80% 88%, 16% 94%, 4% 44%)" },
  { x: 93, y: 16, size: 22, rot: 42, dur: 19, delay: -5, clip: "polygon(8% 22%, 68% 4%, 95% 48%, 74% 94%, 18% 82%)" },
  { x: 11, y: 48, size: 12, rot: 72, dur: 24, delay: -11, clip: "polygon(20% 6%, 88% 26%, 90% 84%, 24% 92%, 6% 52%)" },
  { x: 37, y: 39, size: 15, rot: -15, dur: 20, delay: -9, clip: "polygon(10% 18%, 78% 6%, 96% 58%, 54% 96%, 12% 76%)" },
  { x: 63, y: 41, size: 11, rot: 33, dur: 23, delay: -3, clip: "polygon(28% 5%, 94% 24%, 82% 90%, 14% 86%, 6% 36%)" },
  { x: 91, y: 52, size: 16, rot: -48, dur: 18, delay: -13, clip: "polygon(14% 10%, 82% 8%, 96% 62%, 66% 94%, 12% 80%)" },
  { x: 8, y: 86, size: 20, rot: 22, dur: 22, delay: -6, clip: "polygon(18% 8%, 88% 14%, 94% 72%, 52% 96%, 8% 72%)" },
  { x: 38, y: 90, size: 13, rot: -64, dur: 19, delay: -14, clip: "polygon(12% 20%, 74% 4%, 96% 52%, 64% 95%, 16% 84%)" },
  { x: 68, y: 88, size: 17, rot: 19, dur: 25, delay: -8, clip: "polygon(24% 6%, 90% 22%, 86% 86%, 20% 94%, 4% 48%)" },
] as const;
