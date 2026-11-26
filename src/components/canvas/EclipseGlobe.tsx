import { ArrowDownRight, ArrowUpRight, X } from "@phosphor-icons/react";
import anime from "animejs";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
} from "react";
import { computeFlowVideoRect, FLOW_PLANET_ANCHOR } from "../../data/flowManifest";
import { t, UI_COPY, type Locale, type ProjectRecord } from "../../data/portfolio";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { EASE_OUT_EXPO } from "../../lib/motion";
import { addSkyDrift } from "../../lib/skyMotion";
import {
  CASSIOPEIA_EDGES,
  CASSIOPEIA_TITLE_VEC,
  drawCelestialStar,
  LABEL_OFFSET_DIR,
  REAL_AMBIENT_CONSTELLATIONS,
  SPHERE_STARS,
} from "./constellations";
import { createEclipseRenderer, renderCanvas2DFallback } from "./eclipseShader";
import {
  cartesianToGeo,
  DEG_TO_RAD,
  formatCelestialCoords,
  geoToCartesian,
  normalizeVec3,
  quatAngularDistance,
  quatConjugate,
  quatFromAxisAngle,
  quatMultiply,
  quatNormalize,
  quatSlerp,
  rotateVecByQuat,
  viewQuatForTarget,
  type Quat,
  type Vec3,
} from "./globeMath";

const IDLE_SPIN_DEG_PER_SEC = 4.2;
const KEYBOARD_STEP_RAD = 0.22;

type StageMetrics = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
  z: number;
};

type CalloutBox = {
  index: number;
  shown: boolean;
  opacity: number;
  starX: number;
  starY: number;
  boxX: number;
  boxY: number;
  width: number;
  height: number;
};

type EclipseGlobeProps = {
  nodes: ProjectRecord[];
  activeNodeId: string;
  lang: Locale;
  /** Align 3D WebGL planet geometry to the calibrated Google Flow hero frame */
  matchFlowPlanet?: boolean;
  /** Live ref toggled true when the hero scroll enters the interactive planet dwell zone */
  interactiveActiveRef?: MutableRefObject<boolean>;
  onSelectNode: (id: string, jumpToArchive?: boolean) => void;
};

function computeStageMetrics(width: number, height: number, lockToFlow: boolean): StageMetrics {
  const safeW = Math.max(300, width);
  const safeH = Math.max(360, height);
  if (lockToFlow) {
    const flowRect = computeFlowVideoRect(safeW, safeH, 1280, 720);
    return {
      width: safeW,
      height: safeH,
      centerX: flowRect.dx + FLOW_PLANET_ANCHOR.cx * flowRect.dw,
      centerY: flowRect.dy + FLOW_PLANET_ANCHOR.cy * flowRect.dh,
      radius: FLOW_PLANET_ANCHOR.rOfHeight * flowRect.dh,
    };
  }
  const compact = safeW < 900;
  return {
    width: safeW,
    height: safeH,
    centerX: compact ? safeW * 0.5 : safeW * 0.675,
    centerY: compact ? safeH * 0.59 : safeH * 0.51,
    radius: compact ? Math.min(safeW * 0.41, safeH * 0.29) : Math.min(safeH * 0.415, safeW * 0.31),
  };
}

function hitTestSphereSurface(metrics: StageMetrics, x: number, y: number): Vec3 | null {
  const nx = (x - metrics.centerX) / metrics.radius;
  const ny = (metrics.centerY - y) / metrics.radius;
  const r2 = nx * nx + ny * ny;
  if (r2 >= 0.99) return null;
  return { x: nx, y: ny, z: Math.sqrt(1 - r2) };
}

function resolveCalloutCollisions(
  callouts: CalloutBox[],
  stars: ProjectedPoint[],
  stageW: number,
  stageH: number,
  minTop = 84,
  minBottom = 48,
): void {
  const edgePad = stageW < 480 ? 10 : 14;
  const clampInside = (box: CalloutBox) => {
    box.boxX = Math.max(box.width * 0.5 + edgePad, Math.min(stageW - box.width * 0.5 - edgePad, box.boxX));
    box.boxY = Math.max(box.height * 0.5 + minTop, Math.min(stageH - box.height * 0.5 - minBottom, box.boxY));
  };

  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < callouts.length; i++) {
      const boxA = callouts[i];
      if (!boxA.shown) continue;
      clampInside(boxA);

      for (let j = i + 1; j < callouts.length; j++) {
        const boxB = callouts[j];
        if (!boxB.shown) continue;
        const reqX = (boxA.width + boxB.width) * 0.5 + 10;
        const reqY = (boxA.height + boxB.height) * 0.5 + 8;
        const overlapX = reqX - Math.abs(boxA.boxX - boxB.boxX);
        const overlapY = reqY - Math.abs(boxA.boxY - boxB.boxY);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapY <= overlapX) {
            const sign = boxA.boxY <= boxB.boxY ? -1 : 1;
            const shift = overlapY * 0.52;
            boxA.boxY += sign * shift;
            boxB.boxY -= sign * shift;
          } else {
            const sign = boxA.boxX <= boxB.boxX ? -1 : 1;
            const shift = overlapX * 0.52;
            boxA.boxX += sign * shift;
            boxB.boxX -= sign * shift;
          }
        }
      }

      for (let s = 0; s < stars.length; s++) {
        const pt = stars[s];
        if (pt.z < 0.08) continue;
        const clampedX = Math.max(boxA.boxX - boxA.width * 0.5, Math.min(pt.x, boxA.boxX + boxA.width * 0.5));
        const clampedY = Math.max(boxA.boxY - boxA.height * 0.5, Math.min(pt.y, boxA.boxY + boxA.height * 0.5));
        const gap = Math.hypot(pt.x - clampedX, pt.y - clampedY);
        if (gap < 18) {
          const push = (18 - gap) * 0.65;
          const dx = boxA.boxX - pt.x;
          const dy = boxA.boxY - pt.y;
          const len = Math.hypot(dx, dy) || 1;
          boxA.boxX += (dx / len) * push;
          boxA.boxY += (dy / len) * push;
        }
      }
      clampInside(boxA);
    }
  }
}

export function EclipseGlobe({
  nodes,
  activeNodeId,
  lang,
  matchFlowPlanet = false,
  interactiveActiveRef,
  onSelectNode,
}: EclipseGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereHitRef = useRef<HTMLDivElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const calloutButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const calloutDimsRef = useRef<{ width: number; height: number }[]>([]);
  const projectedStarsRef = useRef<ProjectedPoint[]>([]);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const coordReadoutRef = useRef<HTMLSpanElement>(null);
  const detailPopoverRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useReducedMotion();

  const [webglReady, setWebglReady] = useState(true);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
  const hasInteractedRef = useRef(false);
  const interactedAtRef = useRef<number | null>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const activeIdRef = useRef(activeNodeId);
  activeIdRef.current = activeNodeId;
  const hoveredIdRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const selectCallbackRef = useRef(onSelectNode);
  selectCallbackRef.current = onSelectNode;

  const targetQuatRef = useRef<Quat | null>(null);
  const nudgeRotationRef = useRef<((yawDelta: number, pitchDelta: number) => void) | null>(null);
  const requestRenderRef = useRef<() => void>(undefined);
  const shockwaveRef = useRef<{ starIndex: number; startedAt: number } | null>(null);

  const activeNode = nodes.find((item) => item.id === activeNodeId) ?? nodes[0];
  const inspectedNode = inspectedNodeId
    ? nodes.find((item) => item.id === inspectedNodeId) ?? null
    : null;

  const selectAndInspect = (record: ProjectRecord) => {
    const idx = nodes.findIndex((item) => item.id === record.id);
    if (idx >= 0) shockwaveRef.current = { starIndex: idx, startedAt: performance.now() };
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
      interactedAtRef.current = performance.now();
    }
    targetQuatRef.current = viewQuatForTarget(record.lat, record.lon);
    onSelectNode(record.id, false);
    setInspectedNodeId(record.id);
    requestRenderRef.current?.();
  };

  useEffect(() => {
    if (!inspectedNodeId) return;
    const panel = detailPopoverRef.current;
    if (panel && !reducedMotionRef.current) {
      anime.remove(panel);
      anime({
        targets: panel,
        translateY: [16, 0],
        opacity: [0, 1],
        duration: 380,
        easing: EASE_OUT_EXPO,
      });
    }
    const handleEsc = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") setInspectedNodeId(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [inspectedNodeId]);

  useEffect(() => {
    calloutDimsRef.current = calloutButtonsRef.current.map((btn) => ({
      width: btn?.offsetWidth || 112,
      height: btn?.offsetHeight || 36,
    }));
    requestRenderRef.current?.();
  }, [lang, nodes]);

  const syncedActiveIdRef = useRef(activeNodeId);
  useEffect(() => {
    if (coordReadoutRef.current) {
      coordReadoutRef.current.textContent = activeNode.coordLabel;
    }
    if (syncedActiveIdRef.current === activeNodeId) return;
    syncedActiveIdRef.current = activeNodeId;
    const match = nodesRef.current.find((item) => item.id === activeNodeId);
    if (match) {
      targetQuatRef.current = viewQuatForTarget(match.lat, match.lon);
      requestRenderRef.current?.();
    }
  }, [activeNodeId, activeNode.coordLabel]);

  useEffect(() => {
    requestRenderRef.current?.();
  }, [reducedMotion]);

  useEffect(() => {
    const container = containerRef.current;
    const glEl = webglCanvasRef.current;
    const chartEl = chartCanvasRef.current;
    if (!container || !glEl || !chartEl) return;

    let mounted = true;
    let rafHandle = 0;
    let inViewport = true;
    let renderer = createEclipseRenderer(glEl);
    setWebglReady(!!renderer);

    const ambientStarsPrepared = REAL_AMBIENT_CONSTELLATIONS.map((con) => ({
      name: con.name,
      labelPos: geoToCartesian(con.labelAt[0], con.labelAt[1]),
      vertices: con.stars.map((s) => ({ vec: geoToCartesian(s.lat, s.lon), mag: s.mag })),
      edges: con.edges,
    }));

    const initPortrait =
      typeof window !== "undefined" && window.innerWidth < 900 && window.innerHeight > window.innerWidth;
    let viewQuat: Quat = viewQuatForTarget(
      2,
      matchFlowPlanet ? (initPortrait ? 134 : 122) : 112,
    );
    let metrics: StageMetrics = { width: 1200, height: 760, centerX: 820, centerY: 380, radius: 300 };
    let prevTimestamp = performance.now();
    const mountTimestamp = prevTimestamp;
    let pauseAutoSpinUntil = -Infinity;
    let cueStartedAt: number | null = null;
    let greetPhaseRad = 0;

    const angularVel = { yaw: 0, pitch: 0 };
    const trackball = {
      active: false,
      pointerId: -1,
      isTouch: false,
      lastX: 0,
      lastY: 0,
      travelPx: 0,
      lastSampleMs: 0,
    };
    const hoverCursor = { overPlanet: false, x: 0, y: 0 };

    const rotateScreenSpace = (yawRad: number, pitchRad: number) => {
      const qYaw = quatFromAxisAngle(0, 1, 0, yawRad);
      const qPitch = quatFromAxisAngle(1, 0, 0, pitchRad);
      viewQuat = quatNormalize(quatMultiply(quatMultiply(qYaw, qPitch), viewQuat));
      // Pan the distant cosmic background sky in smooth 3D parallax with globe motion
      addSkyDrift(yawRad * 310, pitchRad * 310);
    };

    const enqueueFrame = () => {
      if (!rafHandle && mounted) {
        prevTimestamp = performance.now();
        rafHandle = requestAnimationFrame(renderFrame);
      }
    };

    nudgeRotationRef.current = (yawRad: number, pitchRad: number) => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        interactedAtRef.current = performance.now();
      }
      targetQuatRef.current = null;
      pauseAutoSpinUntil = performance.now() + 2100;
      rotateScreenSpace(yawRad, pitchRad);
      enqueueFrame();
    };

    const syncCanvasDimensions = () => {
      const bounds = container.getBoundingClientRect();
      metrics = computeStageMetrics(bounds.width, bounds.height, matchFlowPlanet);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const el of [glEl, chartEl]) {
        el.width = Math.round(metrics.width * dpr);
        el.height = Math.round(metrics.height * dpr);
        el.style.width = `${metrics.width}px`;
        el.style.height = `${metrics.height}px`;
      }
      // Lock touch-action: none strictly over the circular planet disc so dragging the globe
      // in ANY direction (including up/down) rotates the planet without scrolling the page,
      // while swiping outside the globe scrolls the page normally.
      if (sphereHitRef.current) {
        const hitR = metrics.radius * 1.02;
        sphereHitRef.current.style.left = `${(metrics.centerX - hitR).toFixed(1)}px`;
        sphereHitRef.current.style.top = `${(metrics.centerY - hitR).toFixed(1)}px`;
        sphereHitRef.current.style.width = `${(hitR * 2).toFixed(1)}px`;
        sphereHitRef.current.style.height = `${(hitR * 2).toFixed(1)}px`;
      }
      calloutDimsRef.current = calloutButtonsRef.current.map((btn) => ({
        width: btn?.offsetWidth || 112,
        height: btn?.offsetHeight || 36,
      }));
      if (!renderer) {
        renderCanvas2DFallback(glEl, metrics.centerX, metrics.centerY, metrics.radius, dpr);
      }
    };

    const projectWorldPoint = (worldVec: Vec3, altitude = 1.0): ProjectedPoint => {
      const cam = rotateVecByQuat(viewQuat, worldVec);
      return {
        x: metrics.centerX + cam.x * metrics.radius * altitude,
        y: metrics.centerY - cam.y * metrics.radius * altitude,
        z: cam.z,
      };
    };

    const renderFrame = (timestamp: number) => {
      rafHandle = 0;
      if (!mounted) return;

      const deltaMs = Math.min(64, timestamp - prevTimestamp);
      prevTimestamp = timestamp;
      const elapsedSec = (timestamp - mountTimestamp) / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const staticMode = reducedMotionRef.current || !renderer;
      let needsNextFrame = false;

      // Detect rising edge into the interactive scroll dwell zone: trigger purely visual
      // greeting sway, orbital gimbal arcs, rim ripple & Cassiopeia star shimmer wave (zero text)
      const isInteractiveNow = interactiveActiveRef ? interactiveActiveRef.current : true;
      if (!staticMode && isInteractiveNow && cueStartedAt === null && !hasInteractedRef.current) {
        cueStartedAt = timestamp;
        greetPhaseRad = 0;
        pauseAutoSpinUntil = timestamp + 1650;
      }

      if (!trackball.active && renderer) {
        const goal = targetQuatRef.current;
        if (goal) {
          if (staticMode) {
            viewQuat = goal;
            targetQuatRef.current = null;
          } else {
            const remaining = quatAngularDistance(viewQuat, goal);
            if (remaining < 0.008) {
              viewQuat = goal;
              targetQuatRef.current = null;
              pauseAutoSpinUntil = timestamp + 2100;
            } else {
              const blend = Math.min(1, 0.12 * (deltaMs / 16.7));
              viewQuat = quatSlerp(viewQuat, goal, blend);
              needsNextFrame = true;
            }
          }
        } else {
          // Gentle one-time kinetic greeting nudge so visitors immediately feel the planet is live 3D
          const cueAgeMs = cueStartedAt !== null ? timestamp - cueStartedAt : -1;
          if (!staticMode && !hasInteractedRef.current && cueAgeMs >= 0 && cueAgeMs < 1380) {
            const u = cueAgeMs / 1380;
            const envelope = Math.sin(u * Math.PI);
            const targetAngle = Math.sin(u * Math.PI * 2) * 0.115 * envelope;
            const deltaAngle = targetAngle - greetPhaseRad;
            greetPhaseRad = targetAngle;
            if (Math.abs(deltaAngle) > 1e-5) {
              rotateScreenSpace(deltaAngle, deltaAngle * 0.18);
            }
          } else {
            const speed = Math.hypot(angularVel.yaw, angularVel.pitch);
            if (speed > 2e-6) {
              rotateScreenSpace(angularVel.yaw * deltaMs, angularVel.pitch * deltaMs);
              const friction = Math.pow(0.93, deltaMs / 16.7);
              angularVel.yaw *= friction;
              angularVel.pitch *= friction;
              needsNextFrame = true;
            } else if (!staticMode && timestamp > pauseAutoSpinUntil) {
              const spinStep = IDLE_SPIN_DEG_PER_SEC * DEG_TO_RAD * (deltaMs / 1000);
              const worldSpin = quatFromAxisAngle(0, 1, 0, -spinStep);
              viewQuat = quatNormalize(quatMultiply(viewQuat, worldSpin));
              addSkyDrift(-spinStep * 135, 0);
            }
          }
        }
      }

      if (renderer) {
        renderer.render(
          viewQuat,
          metrics.centerX,
          metrics.centerY,
          metrics.radius,
          dpr,
          staticMode ? 0 : elapsedSec,
        );
      }

      const records = nodesRef.current;
      const worldNodes = records.map((item) => geoToCartesian(item.lat, item.lon));
      const screenNodes = worldNodes.map((vec) => projectWorldPoint(vec, 1.0));
      projectedStarsRef.current = screenNodes;
      const highlightedId = hoveredIdRef.current ?? activeIdRef.current;

      const isPortraitCompact = metrics.width < 900 && metrics.height > metrics.width;
      const radialLift = isPortraitCompact
        ? Math.max(30, Math.min(46, metrics.radius * 0.25))
        : Math.max(44, Math.min(68, metrics.radius * 0.24));
      const callouts: CalloutBox[] = records.map((record, index) => {
        const sp = screenNodes[index];
        const dims = calloutDimsRef.current[index] ?? { width: 112, height: 36 };
        const shown = sp.z > 0.08;
        const opacity = shown ? Math.min(1, (sp.z - 0.08) / 0.22) : 0;
        const pref = LABEL_OFFSET_DIR[record.id] ?? [0, -1];
        const outX = sp.x - metrics.centerX;
        const outY = sp.y - metrics.centerY;
        const outLen = Math.hypot(outX, outY) || 1;
        const dirX = pref[0] * 0.72 + (outX / outLen) * 0.28;
        const dirY = pref[1] * 0.72 + (outY / outLen) * 0.28;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        return {
          index,
          shown,
          opacity,
          starX: sp.x,
          starY: sp.y,
          boxX: sp.x + (dirX / dirLen) * radialLift,
          boxY: sp.y + (dirY / dirLen) * radialLift,
          width: dims.width,
          height: dims.height,
        };
      });

      const safeMinTop = isPortraitCompact
        ? Math.max(84, Math.round(metrics.centerY - metrics.radius - 26))
        : 84;
      const safeMinBottom = isPortraitCompact ? 64 : 48;
      resolveCalloutCollisions(callouts, screenNodes, metrics.width, metrics.height, safeMinTop, safeMinBottom);

      const ctx = chartEl.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, metrics.width, metrics.height);

        // Background celestial sphere stars
        for (let i = 0; i < SPHERE_STARS.length; i++) {
          const st = SPHERE_STARS[i];
          const pt = projectWorldPoint(st.vec, 0.996);
          if (pt.z < 0.06) continue;
          const limbFade = Math.min(1, (pt.z - 0.06) / 0.28);
          const twinkle = staticMode ? 0.85 : 0.62 + 0.38 * Math.sin(elapsedSec * 1.4 + st.phase);
          ctx.fillStyle = st.warm ? "#fef0c7" : "#e6dfd7";
          ctx.globalAlpha = st.a * limbFade * twinkle;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Ambient real constellations around the 360° sphere
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const con of ambientStarsPrepared) {
          const pts = con.vertices.map((v) => projectWorldPoint(v.vec, 1.0));
          for (const [startIdx, endIdx] of con.edges) {
            const p0 = pts[startIdx];
            const p1 = pts[endIdx];
            if (p0.z < 0.08 || p1.z < 0.08) continue;
            const vis = Math.min(1, Math.min(p0.z, p1.z) / 0.32);
            ctx.strokeStyle = `rgba(254, 240, 199, ${(0.22 * vis).toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }

          for (let i = 0; i < pts.length; i++) {
            const pt = pts[i];
            if (pt.z < 0.08) continue;
            const vis = Math.min(1, (pt.z - 0.08) / 0.26);
            const mag = con.vertices[i].mag;
            ctx.fillStyle = "rgba(254, 240, 199, 0.72)";
            ctx.globalAlpha = vis * (0.45 + 0.45 * mag);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.1 + mag * 1.15, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          const titlePt = projectWorldPoint(con.labelPos, 1.0);
          if (titlePt.z > 0.28) {
            const labelAlpha = Math.min(1, (titlePt.z - 0.28) / 0.35) * 0.34;
            ctx.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
            ctx.fillStyle = `rgba(254, 240, 199, ${labelAlpha.toFixed(3)})`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(con.name, titlePt.x, titlePt.y);
          }
        }

        const cassLabelPt = projectWorldPoint(CASSIOPEIA_TITLE_VEC, 1.0);
        if (cassLabelPt.z > 0.26) {
          const alpha = Math.min(1, (cassLabelPt.z - 0.26) / 0.34) * 0.48;
          ctx.font = '600 10.5px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = `rgba(254, 240, 199, ${alpha.toFixed(3)})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("CASSIOPEIA", cassLabelPt.x, cassLabelPt.y);
        }

        // Cassiopeia W geodesic arcs connecting the 5 portfolio works
        for (let edgeIdx = 0; edgeIdx < CASSIOPEIA_EDGES.length; edgeIdx++) {
          const [i0, i1] = CASSIOPEIA_EDGES[edgeIdx];
          const v0 = worldNodes[i0];
          const v1 = worldNodes[i1];
          if (!v0 || !v1) continue;

          const isContributorArm = records[i0]?.isContributor || records[i1]?.isContributor;
          const isEmphasized = records[i0]?.id === highlightedId || records[i1]?.id === highlightedId;

          ctx.beginPath();
          const subdivisions = 22;
          let drawing = false;
          for (let s = 0; s <= subdivisions; s++) {
            const frac = s / subdivisions;
            const arcVec = normalizeVec3({
              x: v0.x + (v1.x - v0.x) * frac,
              y: v0.y + (v1.y - v0.y) * frac,
              z: v0.z + (v1.z - v0.z) * frac,
            });
            const pt = projectWorldPoint(arcVec, 1.002);
            if (pt.z < 0.04) {
              drawing = false;
              continue;
            }
            if (drawing) ctx.lineTo(pt.x, pt.y);
            else ctx.moveTo(pt.x, pt.y);
            drawing = true;
          }

          ctx.lineWidth = isEmphasized ? 1.65 : 1.1;
          ctx.strokeStyle = isContributorArm
            ? `rgba(45, 212, 191, ${isEmphasized ? 0.88 : 0.46})`
            : `rgba(254, 240, 199, ${isEmphasized ? 0.92 : 0.56})`;
          ctx.stroke();

          if (!staticMode && isEmphasized) {
            const pulseFrac = (elapsedSec * 0.34 + edgeIdx * 0.24) % 1;
            const pulseVec = normalizeVec3({
              x: v0.x + (v1.x - v0.x) * pulseFrac,
              y: v0.y + (v1.y - v0.y) * pulseFrac,
              z: v0.z + (v1.z - v0.z) * pulseFrac,
            });
            const pulsePt = projectWorldPoint(pulseVec, 1.002);
            if (pulsePt.z > 0.1) {
              ctx.fillStyle = isContributorArm ? "#ccfbf1" : "#fffbeb";
              ctx.beginPath();
              ctx.arc(pulsePt.x, pulsePt.y, 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Leader lines linking each Cassiopeia star to its DOM callout badge
        for (let i = 0; i < callouts.length; i++) {
          const box = callouts[i];
          if (!box.shown || box.opacity < 0.05) continue;
          const record = records[i];
          const isFocused = record.id === highlightedId;
          const isTeal = !!record.isContributor;

          const anchorX = Math.max(box.boxX - box.width * 0.5, Math.min(box.starX, box.boxX + box.width * 0.5));
          const anchorY = Math.max(box.boxY - box.height * 0.5, Math.min(box.starY, box.boxY + box.height * 0.5));
          const dx = anchorX - box.starX;
          const dy = anchorY - box.starY;
          const span = Math.hypot(dx, dy);
          if (span > 11) {
            const startX = box.starX + (dx / span) * 10;
            const startY = box.starY + (dy / span) * 10;
            ctx.strokeStyle = isTeal
              ? `rgba(45, 212, 191, ${((isFocused ? 0.85 : 0.44) * box.opacity).toFixed(3)})`
              : `rgba(254, 240, 199, ${((isFocused ? 0.82 : 0.38) * box.opacity).toFixed(3)})`;
            ctx.lineWidth = isFocused ? 1.15 : 0.8;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(anchorX, anchorY);
            ctx.stroke();
          }
        }

        // Non-text interactive visual cues (activation rim ripple + delicate 360° orbital gimbal arcs + starlight wave)
        if (!staticMode && cueStartedAt !== null) {
          const cueAge = timestamp - cueStartedAt;

          // 1. Expanding golden activation ring from the planet rim when entering interactive dwell
          if (cueAge >= 0 && cueAge < 1150) {
            const u = cueAge / 1150;
            const ease = 1 - Math.pow(1 - u, 3);
            const rRing = metrics.radius * (1.0 + ease * 0.16);
            const ringAlpha = Math.sin(u * Math.PI) * 0.48;
            ctx.save();
            ctx.strokeStyle = `rgba(242, 232, 87, ${ringAlpha.toFixed(3)})`;
            ctx.lineWidth = 1.6 * (1 - u * 0.5);
            ctx.beginPath();
            ctx.arc(metrics.centerX, metrics.centerY, rRing, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 2. Sequential starlight ripple hopping across all 5 Cassiopeia stars (β -> α -> γ -> δ -> ε)
          const rippleOrder = [0, 1, 3, 2, 4];
          for (let step = 0; step < rippleOrder.length; step++) {
            const starAge = cueAge - (220 + step * 145);
            if (starAge < 0 || starAge > 760) continue;
            const starIdx = rippleOrder[step];
            const pt = screenNodes[starIdx];
            const rec = records[starIdx];
            if (!pt || pt.z < 0.08 || !rec) continue;
            const su = starAge / 760;
            const se = 1 - Math.pow(1 - su, 3);
            const sr = 7 + se * 28;
            const sa = (1 - su) * 0.72;
            ctx.save();
            ctx.strokeStyle = rec.isContributor
              ? `rgba(45, 212, 191, ${sa.toFixed(3)})`
              : `rgba(254, 240, 199, ${sa.toFixed(3)})`;
            ctx.lineWidth = 1.25 - su * 0.5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, sr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 3. Delicate 360° curved orbital gimbal arc arrows on the planet flank (purely visual, fades out once interacted)
          const fadeIn = Math.min(1, cueAge / 650);
          const fadeOut =
            interactedAtRef.current !== null
              ? Math.max(0, 1 - (timestamp - interactedAtRef.current) / 420)
              : 1;
          const gimbalAlpha = fadeIn * fadeOut;

          if (gimbalAlpha > 0.02) {
            const orbitR = metrics.radius * 1.075;
            const sway = Math.sin(elapsedSec * 2.1) * 0.055;
            const breathe = 0.42 + 0.22 * Math.sin(elapsedSec * 2.6);
            const alpha = gimbalAlpha * breathe;

            // Draw subtle curved double-ended drag arc along the visible western crescent rim (always in-frame on desktop & mobile!)
            const drawGimbalArc = (centerAng: number, halfSpan: number) => {
              const a0 = centerAng - halfSpan + sway;
              const a1 = centerAng + halfSpan + sway;
              ctx.save();
              ctx.strokeStyle = `rgba(254, 240, 199, ${alpha.toFixed(3)})`;
              ctx.lineWidth = 1.25;
              ctx.setLineDash([4, 5]);
              ctx.beginPath();
              ctx.arc(metrics.centerX, metrics.centerY, orbitR, a0, a1);
              ctx.stroke();
              ctx.setLineDash([]);

              // Minimalist chevron arrowheads at both ends of the orbital arc
              const drawChevron = (ang: number, dir: 1 | -1) => {
                const ex = metrics.centerX + Math.cos(ang) * orbitR;
                const ey = metrics.centerY + Math.sin(ang) * orbitR;
                const tangent = ang + (Math.PI / 2) * dir;
                const len = 6.5;
                ctx.beginPath();
                ctx.moveTo(
                  ex - Math.cos(tangent - 0.55) * len,
                  ey - Math.sin(tangent - 0.55) * len,
                );
                ctx.lineTo(ex, ey);
                ctx.lineTo(
                  ex - Math.cos(tangent + 0.55) * len,
                  ey - Math.sin(tangent + 0.55) * len,
                );
                ctx.stroke();
              };

              drawChevron(a0, -1);
              drawChevron(a1, 1);
              ctx.restore();
            };

            // Left-upper crescent flank (always visible in viewport on both desktop & portrait mobile)
            drawGimbalArc(Math.PI * 0.96, 0.24);
            // Lower-left equatorial arc
            drawGimbalArc(Math.PI * 0.58, 0.18);
          }
        }

        // Selection shockwave ring
        const wave = shockwaveRef.current;
        if (wave && !staticMode) {
          const progress = (timestamp - wave.startedAt) / 920;
          if (progress >= 1) {
            shockwaveRef.current = null;
          } else {
            const pt = screenNodes[wave.starIndex];
            const rec = records[wave.starIndex];
            if (pt && pt.z > 0.08 && rec) {
              const ease = 1 - Math.pow(1 - progress, 3);
              const ringRadius = 10 + ease * 48;
              const ringAlpha = (1 - progress) * 0.78;
              ctx.save();
              ctx.strokeStyle = rec.isContributor
                ? `rgba(45, 212, 191, ${ringAlpha.toFixed(3)})`
                : `rgba(254, 240, 199, ${ringAlpha.toFixed(3)})`;
              ctx.lineWidth = 1.4 - progress * 0.8;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, ringRadius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // 5 Magnitude-1 Cassiopeia Diffraction Stars
        for (let i = 0; i < records.length; i++) {
          const pt = screenNodes[i];
          if (!pt || pt.z < 0.06) continue;
          const record = records[i];
          const isFocused = record.id === highlightedId;
          const starAlpha = Math.min(1, (pt.z - 0.06) / 0.2);
          const breathe = staticMode ? 1 : 0.94 + 0.08 * Math.sin(elapsedSec * 2.2 + i * 1.3);
          drawCelestialStar(
            ctx,
            pt.x,
            pt.y,
            (isFocused ? 6.2 : 4.6) * breathe,
            !!record.isContributor,
            isFocused,
            starAlpha,
          );
        }
      }

      // Sync DOM callout badges
      for (let i = 0; i < callouts.length; i++) {
        const btn = calloutButtonsRef.current[i];
        if (!btn) continue;
        const box = callouts[i];
        btn.style.transform = `translate(${box.boxX.toFixed(1)}px, ${box.boxY.toFixed(1)}px)`;
        btn.style.opacity = box.opacity.toFixed(3);
        btn.style.visibility = box.opacity > 0.05 ? "visible" : "hidden";
        btn.tabIndex = box.opacity > 0.25 ? 0 : -1;
      }

      const reticle = cursorRingRef.current;
      if (reticle) {
        const showRing =
          hoverCursor.overPlanet &&
          !trackball.active &&
          !!hitTestSphereSurface(metrics, hoverCursor.x, hoverCursor.y);
        if (showRing) {
          reticle.style.transform = `translate(${hoverCursor.x.toFixed(1)}px, ${hoverCursor.y.toFixed(1)}px)`;
          reticle.dataset.on = "true";
        } else {
          reticle.dataset.on = "false";
        }
      }

      if (inViewport && (!staticMode || needsNextFrame || trackball.active)) {
        rafHandle = requestAnimationFrame(renderFrame);
      }
    };

    const handleContextLost = (evt: Event) => {
      evt.preventDefault();
      renderer?.destroy();
      renderer = undefined;
      setWebglReady(false);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      renderCanvas2DFallback(glEl, metrics.centerX, metrics.centerY, metrics.radius, dpr);
    };
    glEl.addEventListener("webglcontextlost", handleContextLost);

    syncCanvasDimensions();
    enqueueFrame();
    requestRenderRef.current = enqueueFrame;

    const resizeObs = new ResizeObserver(() => {
      syncCanvasDimensions();
      enqueueFrame();
    });
    resizeObs.observe(container);

    const viewObs = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      if (inViewport) enqueueFrame();
    });
    viewObs.observe(container);

    const handleVisibility = () => {
      inViewport = !document.hidden;
      if (inViewport) enqueueFrame();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const toStageCoords = (evt: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    };

    const isInteractiveChild = (evt: PointerEvent) =>
      !!(evt.target as Element | null)?.closest?.("button, a, .orb-star-popover");

    const pickNearestStar = (x: number, y: number, hitRadius = 26): ProjectRecord | undefined => {
      let chosenIdx = -1;
      let minDist = hitRadius;
      const pts = projectedStarsRef.current;
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        if (!pt || pt.z < 0.08) continue;
        const dist = Math.hypot(x - pt.x, y - pt.y);
        if (dist < minDist) {
          minDist = dist;
          chosenIdx = i;
        }
      }
      return chosenIdx >= 0 ? nodesRef.current[chosenIdx] : undefined;
    };

    const handlePointerMove = (evt: PointerEvent) => {
      if (!renderer) return;
      const pos = toStageCoords(evt);

      if (trackball.active && evt.pointerId === trackball.pointerId) {
        const stepX = pos.x - trackball.lastX;
        const stepY = pos.y - trackball.lastY;
        const nowMs = performance.now();
        const elapsedMs = Math.max(1, nowMs - trackball.lastSampleMs);
        trackball.lastX = pos.x;
        trackball.lastY = pos.y;
        trackball.lastSampleMs = nowMs;
        trackball.travelPx += Math.abs(stepX) + Math.abs(stepY);
        const yawStep = stepX / metrics.radius;
        const pitchStep = stepY / metrics.radius;
        rotateScreenSpace(yawStep, pitchStep);
        angularVel.yaw = yawStep / elapsedMs;
        angularVel.pitch = pitchStep / elapsedMs;
        enqueueFrame();
        return;
      }

      hoverCursor.x = pos.x;
      hoverCursor.y = pos.y;
      const onChild = isInteractiveChild(evt);
      const hoveredStar = onChild ? undefined : pickNearestStar(pos.x, pos.y);
      const surfacePoint = onChild ? null : hitTestSphereSurface(metrics, pos.x, pos.y);
      hoverCursor.overPlanet = evt.pointerType === "mouse" && !!surfacePoint && !hoveredStar;

      if (coordReadoutRef.current) {
        if (hoveredStar) {
          coordReadoutRef.current.textContent = hoveredStar.coordLabel;
        } else if (surfacePoint) {
          const worldDir = rotateVecByQuat(quatConjugate(viewQuat), surfacePoint);
          const geo = cartesianToGeo(worldDir);
          coordReadoutRef.current.textContent = formatCelestialCoords(geo.lat, geo.lon);
        } else {
          const current = nodesRef.current.find((item) => item.id === activeIdRef.current);
          if (current) coordReadoutRef.current.textContent = current.coordLabel;
        }
      }

      container.style.cursor = hoveredStar ? "pointer" : hoverCursor.overPlanet ? "grab" : "";
      enqueueFrame();
    };

    const handlePointerDown = (evt: PointerEvent) => {
      if (!renderer || evt.button !== 0 || isInteractiveChild(evt)) return;
      const pos = toStageCoords(evt);
      if (!hitTestSphereSurface(metrics, pos.x, pos.y)) return;

      const isTouch = evt.pointerType === "touch";
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        interactedAtRef.current = performance.now();
      }
      targetQuatRef.current = null;
      trackball.active = true;
      trackball.pointerId = evt.pointerId;
      trackball.isTouch = isTouch;
      trackball.lastX = pos.x;
      trackball.lastY = pos.y;
      trackball.lastSampleMs = performance.now();
      trackball.travelPx = 0;
      angularVel.yaw = 0;
      angularVel.pitch = 0;

      try {
        container.setPointerCapture?.(evt.pointerId);
      } catch {
        // Ignore synthetic capture rejection
      }
      container.style.cursor = "grabbing";
      evt.preventDefault();
      enqueueFrame();
    };

    const handlePointerRelease = (evt: PointerEvent) => {
      if (!trackball.active || evt.pointerId !== trackball.pointerId) return;
      const wasTouch = trackball.isTouch;
      const wasCancelled = evt.type === "pointercancel";
      trackball.active = false;
      const pos = toStageCoords(evt);

      try {
        if (container.hasPointerCapture?.(evt.pointerId)) {
          container.releasePointerCapture(evt.pointerId);
        }
      } catch {
        // Ignore capture release mismatch
      }

      if (wasCancelled) {
        angularVel.yaw = 0;
        angularVel.pitch = 0;
        container.style.cursor = "";
        return;
      }

      if (performance.now() - trackball.lastSampleMs > 90) {
        angularVel.yaw = 0;
        angularVel.pitch = 0;
      }

      if (trackball.travelPx < 6) {
        const starHit = pickNearestStar(pos.x, pos.y, wasTouch ? 36 : 26);
        if (starHit) {
          const idx = nodesRef.current.findIndex((item) => item.id === starHit.id);
          if (idx >= 0) shockwaveRef.current = { starIndex: idx, startedAt: performance.now() };
          targetQuatRef.current = viewQuatForTarget(starHit.lat, starHit.lon);
          selectCallbackRef.current(starHit.id, false);
          setInspectedNodeId(starHit.id);
        } else {
          setInspectedNodeId(null);
        }
      } else {
        pauseAutoSpinUntil = performance.now() + 2100;
        setInspectedNodeId(null);
      }

      container.style.cursor = hoverCursor.overPlanet ? "grab" : "";
      enqueueFrame();
    };

    // Native touchmove guard for iOS Safari / mobile browsers so vertical dragging inside the globe never scrolls the page
    const handleTouchMove = (evt: TouchEvent) => {
      if (trackball.active) {
        evt.preventDefault();
      }
    };

    const handlePointerLeave = () => {
      hoverCursor.overPlanet = false;
      if (coordReadoutRef.current) {
        const current = nodesRef.current.find((item) => item.id === activeIdRef.current);
        if (current) coordReadoutRef.current.textContent = current.coordLabel;
      }
      if (!trackball.active) container.style.cursor = "";
      enqueueFrame();
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointerup", handlePointerRelease);
    container.addEventListener("pointercancel", handlePointerRelease);
    container.addEventListener("pointerleave", handlePointerLeave);
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      mounted = false;
      cancelAnimationFrame(rafHandle);
      resizeObs.disconnect();
      viewObs.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      glEl.removeEventListener("webglcontextlost", handleContextLost);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointerup", handlePointerRelease);
      container.removeEventListener("pointercancel", handlePointerRelease);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeEventListener("touchmove", handleTouchMove);
      renderer?.destroy();
    };
  }, [matchFlowPlanet]);

  const handleKeyRotate = (evt: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!webglReady) return;
    if (evt.key === "ArrowLeft") {
      evt.preventDefault();
      nudgeRotationRef.current?.(-KEYBOARD_STEP_RAD, 0);
    } else if (evt.key === "ArrowRight") {
      evt.preventDefault();
      nudgeRotationRef.current?.(KEYBOARD_STEP_RAD, 0);
    } else if (evt.key === "ArrowUp") {
      evt.preventDefault();
      nudgeRotationRef.current?.(0, -KEYBOARD_STEP_RAD);
    } else if (evt.key === "ArrowDown") {
      evt.preventDefault();
      nudgeRotationRef.current?.(0, KEYBOARD_STEP_RAD);
    }
  };

  return (
    <div
      ref={containerRef}
      className="orb-monument"
      tabIndex={webglReady ? 0 : undefined}
      role="region"
      aria-label={
        lang === "id"
          ? "Planet Gerhana 3D interaktif dengan rasi bintang Cassiopeia untuk 5 proyek, gunakan tombol panah untuk memutar"
          : "Interactive 3D Solar Eclipse Planet with the Cassiopeia constellation for 5 projects, use arrow keys to rotate"
      }
      onKeyDown={handleKeyRotate}
    >
      <canvas ref={webglCanvasRef} className="orb-canvas" aria-hidden="true" />
      <canvas ref={chartCanvasRef} className="orb-overlay" aria-hidden="true" />
      <div ref={sphereHitRef} className="orb-sphere-hit" aria-hidden="true" />
      <div ref={cursorRingRef} className="orb-reticle" data-on="false" aria-hidden="true" />

      {nodes.map((node, index) => {
        const isActive = node.id === activeNodeId;
        return (
          <button
            key={node.id}
            ref={(el) => {
              calloutButtonsRef.current[index] = el;
            }}
            type="button"
            className={`orb-star-node ${node.isContributor ? "is-contributor" : ""} ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
            aria-label={`${node.starGreek} ${node.starName}, ${node.name}, ${t(node.role, lang)}`}
            onPointerEnter={() => {
              hoveredIdRef.current = node.id;
              requestRenderRef.current?.();
            }}
            onPointerLeave={() => {
              if (hoveredIdRef.current === node.id) hoveredIdRef.current = null;
              requestRenderRef.current?.();
            }}
            onClick={() => selectAndInspect(node)}
          >
            <span className="orb-star-callout">
              <strong>
                <span className="orb-star-greek mono">{node.starGreek}</span>
                {node.shortName}
              </strong>
              <em>{node.isContributor ? "Data Contributor" : t(node.shortTag, lang)}</em>
            </span>
          </button>
        );
      })}

      <div className="orb-monument-foot" aria-hidden="true">
        <span ref={coordReadoutRef} className="mono orb-coord-whisper">
          {activeNode.coordLabel}
        </span>
      </div>

      {inspectedNode && (
        <div
          ref={detailPopoverRef}
          className={`orb-star-popover ${inspectedNode.isContributor ? "is-contributor" : ""}`}
          role="dialog"
          aria-label={inspectedNode.name}
        >
          <div className="orb-popover-head">
            <div className="orb-popover-meta">
              <span className="mono orb-popover-star">
                {inspectedNode.starGreek} Cas · {inspectedNode.starName}
              </span>
              <span className={`orb-popover-role ${inspectedNode.isContributor ? "is-contributor" : ""}`}>
                {t(inspectedNode.role, lang)}
              </span>
            </div>
            <button
              type="button"
              className="orb-popover-close"
              aria-label={t(UI_COPY.globeCloseDetail, lang)}
              onClick={() => setInspectedNodeId(null)}
            >
              <X size={15} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <h2 className="orb-popover-title">{inspectedNode.name}</h2>
          <p className="orb-popover-desc">{t(inspectedNode.impactLine, lang)}</p>

          <div className="orb-popover-actions">
            <button
              type="button"
              className="orb-btn-ghost"
              onClick={() => {
                setInspectedNodeId(null);
                onSelectNode(inspectedNode.id, true);
              }}
            >
              {t(UI_COPY.globeDetails, lang)}
              <ArrowDownRight size={14} weight="bold" aria-hidden="true" />
            </button>
            <a
              href={inspectedNode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="orb-btn-solid"
            >
              {t(UI_COPY.globeLaunch, lang)}
              <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              <span className="sr-only"> {t(UI_COPY.opensNewTab, lang)}</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
