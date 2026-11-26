/**
 * Lightweight zero-render shared bridge synchronizing 3D EclipseGlobe rotation
 * with multi-depth background starfield parallax in AmbientStarfield.
 */
export const skyMotion = {
  targetX: 0,
  targetY: 0,
};

export function addSkyDrift(dx: number, dy: number): void {
  skyMotion.targetX += dx;
  skyMotion.targetY += dy;
}
