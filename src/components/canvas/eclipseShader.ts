import { quatConjugate, writeQuatToMat3ColumnMajor, type Quat } from "./globeMath";

const VERTEX_SHADER_SOURCE = `
attribute vec2 aClipVertex;
varying vec2 vNdc;
void main() {
  vNdc = aClipVertex;
  gl_Position = vec4(aClipVertex, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 vNdc;

uniform vec2 uViewport;
uniform vec2 uPlanetCenter;
uniform float uPlanetRadius;
uniform mat3 uWorldFromView;
uniform float uDpr;
uniform float uElapsedSec;

float hashScalar3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float valueNoise3(vec3 pos) {
  vec3 cell = floor(pos);
  vec3 fpart = fract(pos);
  vec3 u = fpart * fpart * (3.0 - 2.0 * fpart);
  float c000 = hashScalar3(cell + vec3(0.0, 0.0, 0.0));
  float c100 = hashScalar3(cell + vec3(1.0, 0.0, 0.0));
  float c010 = hashScalar3(cell + vec3(0.0, 1.0, 0.0));
  float c110 = hashScalar3(cell + vec3(1.0, 1.0, 0.0));
  float c001 = hashScalar3(cell + vec3(0.0, 0.0, 1.0));
  float c101 = hashScalar3(cell + vec3(1.0, 0.0, 1.0));
  float c011 = hashScalar3(cell + vec3(0.0, 1.0, 1.0));
  float c111 = hashScalar3(cell + vec3(1.0, 1.0, 1.0));
  float x00 = mix(c000, c100, u.x);
  float x10 = mix(c010, c110, u.x);
  float x01 = mix(c001, c101, u.x);
  float x11 = mix(c011, c111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

float fractalNoise3(vec3 pos) {
  float sum = 0.0;
  float amp = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    sum += amp * valueNoise3(pos);
    pos = pos * 2.04 + vec3(11.3, 6.7, 4.9);
    amp *= 0.5;
  }
  return sum;
}

float hashScalar2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise2(vec2 pos) {
  vec2 cell = floor(pos);
  vec2 fpart = fract(pos);
  vec2 u = fpart * fpart * (3.0 - 2.0 * fpart);
  float a = hashScalar2(cell);
  float b = hashScalar2(cell + vec2(1.0, 0.0));
  float c = hashScalar2(cell + vec2(0.0, 1.0));
  float d = hashScalar2(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fractalNoise2(vec2 pos) {
  float sum = 0.0;
  float amp = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    sum += amp * valueNoise2(pos);
    pos = pos * 2.02 + vec2(7.3, 3.8);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uvScreen = vec2(vNdc.x * 0.5 + 0.5, 0.5 - vNdc.y * 0.5);
  vec2 pixelPos = uvScreen * uViewport;
  vec2 diskCoord = vec2(pixelPos.x - uPlanetCenter.x, uPlanetCenter.y - pixelPos.y) / uPlanetRadius;

  float radial = length(diskCoord);
  float limbDistanceCss = (radial - 1.0) * uPlanetRadius / uDpr;
  float azimuth = atan(diskCoord.y, diskCoord.x);

  float frameFade =
    smoothstep(0.0, 0.06, uvScreen.x) *
    (1.0 - smoothstep(0.94, 1.0, uvScreen.x)) *
    smoothstep(0.0, 0.06, uvScreen.y) *
    (1.0 - smoothstep(0.94, 1.0, uvScreen.y));

  vec3 surfaceColor = vec3(0.0);
  float surfaceAlpha = 0.0;
  vec3 sunKeyDir = normalize(vec3(-0.52, 0.44, 0.72));
  float edgeFeather = 2.0 * uDpr / uPlanetRadius;

  if (radial < 1.0 + edgeFeather) {
    vec2 unitDisk = radial > 1.0 ? diskCoord / radial : diskCoord;
    float depthZ = sqrt(max(0.0, 1.0 - dot(unitDisk, unitDisk)));
    vec3 cameraNormal = vec3(unitDisk, depthZ);
    vec3 worldNormal = normalize(uWorldFromView * cameraNormal);

    float macroRelief = fractalNoise3(worldNormal * 2.8);
    float craterRelief = fractalNoise3(worldNormal * 8.4 + vec3(macroRelief * 1.15));
    float fineGrain = fractalNoise3(worldNormal * 18.0);
    float terrain = macroRelief * 0.55 + craterRelief * 0.32 + fineGrain * 0.13;

    float lonRad = atan(worldNormal.x, worldNormal.z);
    float latRad = asin(clamp(worldNormal.y, -1.0, 1.0));
    float meridianStep = 3.14159265 / 6.0;
    float lonGap = abs(fract(lonRad / meridianStep + 0.5) - 0.5) * meridianStep * max(0.24, cos(latRad));
    float latGap = abs(fract(latRad / meridianStep + 0.5) - 0.5) * meridianStep;
    float graticule = max(
      1.0 - smoothstep(0.0016, 0.0046, lonGap),
      1.0 - smoothstep(0.0016, 0.0046, latGap)
    );
    float equatorLine = 1.0 - smoothstep(0.0022, 0.0058, abs(latRad));

    float diffuse = pow(max(0.0, dot(cameraNormal, sunKeyDir)), 0.72);
    vec3 umbraTone = vec3(0.016, 0.014, 0.020);
    vec3 basaltTone = vec3(0.145, 0.118, 0.105);
    vec3 regolithTone = vec3(0.32, 0.23, 0.16);
    vec3 emberDust = vec3(0.62, 0.30, 0.10);

    vec3 albedo = mix(basaltTone, regolithTone, smoothstep(0.34, 0.72, terrain));
    albedo += emberDust * smoothstep(0.62, 0.86, craterRelief) * 0.28;

    vec3 lit = mix(umbraTone, albedo, 0.14 + 0.86 * diffuse);
    lit *= (0.34 + 0.66 * pow(depthZ, 0.45));
    lit += vec3(0.98, 0.76, 0.42) * graticule * (0.032 + 0.042 * depthZ);
    lit += vec3(0.99, 0.84, 0.52) * equatorLine * 0.075;

    float fresnelRim = pow(1.0 - depthZ, 3.0);
    float diamondArc = pow(max(0.0, cos(azimuth - 2.34)), 3.2);
    lit += vec3(1.0, 0.62, 0.18) * fresnelRim * (0.62 + 0.85 * diamondArc);

    surfaceColor = lit;
    surfaceAlpha = 1.0 - smoothstep(-0.5, 0.5, limbDistanceCss * uDpr);
  }

  float outsideCss = max(limbDistanceCss, 0.0);
  float coronaTurb = fractalNoise2(
    vec2(cos(azimuth) * 2.6 + uElapsedSec * 0.11, sin(azimuth) * 2.6 - uElapsedSec * 0.08)
  );
  float streamerMod = 0.84 + 0.46 * coronaTurb + 0.15 * sin(azimuth * 9.0 + uElapsedSec * 0.45);
  float diamondFocus = exp(-pow(sin((azimuth - 2.34) * 0.5) / 0.25, 2.0));

  float flareBloom = diamondFocus * exp(-outsideCss / (58.0 * streamerMod)) * frameFade;
  float innerCorona = (0.50 * streamerMod + 0.36 * diamondFocus) * exp(-outsideCss / (28.0 * streamerMod)) * frameFade;
  float outerCorona = (0.22 + 0.14 * diamondFocus) * exp(-outsideCss / (96.0 + 26.0 * coronaTurb)) * frameFade;
  float brightRing = (0.94 + 0.06 * diamondFocus) * exp(-pow(limbDistanceCss / (1.85 + 0.65 * diamondFocus), 2.0));

  vec3 innerCoronaCol = vec3(0.98, 0.56, 0.12);
  vec3 outerCoronaCol = vec3(0.74, 0.26, 0.06);
  vec3 ringTint = mix(vec3(1.0, 0.86, 0.56), vec3(1.0, 0.98, 0.90), diamondFocus);

  vec3 coronaPremul =
    innerCoronaCol * innerCorona +
    outerCoronaCol * outerCorona * (1.0 - innerCorona) +
    vec3(1.0, 0.92, 0.72) * flareBloom * 0.52;
  float coronaAlpha = clamp(innerCorona + outerCorona * (1.0 - innerCorona) + flareBloom * 0.36, 0.0, 1.0);

  vec3 planetOverCorona = surfaceColor * surfaceAlpha + coronaPremul * (1.0 - surfaceAlpha);
  float combinedAlpha = surfaceAlpha + coronaAlpha * (1.0 - surfaceAlpha);

  vec3 finalPremul = ringTint * brightRing + planetOverCorona * (1.0 - brightRing);
  float finalAlpha = clamp(brightRing + combinedAlpha * (1.0 - brightRing), 0.0, 1.0);

  gl_FragColor = vec4(finalPremul, finalAlpha);
}
`;

export type EclipseRenderer = {
  render: (
    viewOrientation: Quat,
    centerX: number,
    centerY: number,
    radius: number,
    dpr: number,
    elapsedSec: number,
  ) => void;
  destroy: () => void;
};

export function createEclipseRenderer(canvas: HTMLCanvasElement): EclipseRenderer | undefined {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
  });
  if (!gl) return undefined;

  const buildShader = (stage: number, source: string): WebGLShader => {
    const shader = gl.createShader(stage);
    if (!shader) throw new Error("Unable to allocate WebGL shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "Shader compile failure";
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  };

  let program: WebGLProgram | null = null;
  let vertShader: WebGLShader | null = null;
  let fragShader: WebGLShader | null = null;

  try {
    vertShader = buildShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    fragShader = buildShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    program = gl.createProgram();
    if (!program) throw new Error("Unable to allocate WebGL program");
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Program link failure");
    }
  } catch {
    if (vertShader) gl.deleteShader(vertShader);
    if (fragShader) gl.deleteShader(fragShader);
    if (program) gl.deleteProgram(program);
    return undefined;
  }

  gl.useProgram(program);

  // Oversized single fullscreen triangle covers NDC [-1, 1] without seam diagonal
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const clipAttr = gl.getAttribLocation(program, "aClipVertex");
  gl.enableVertexAttribArray(clipAttr);
  gl.vertexAttribPointer(clipAttr, 2, gl.FLOAT, false, 0, 0);

  const uniformViewport = gl.getUniformLocation(program, "uViewport");
  const uniformCenter = gl.getUniformLocation(program, "uPlanetCenter");
  const uniformRadius = gl.getUniformLocation(program, "uPlanetRadius");
  const uniformWorldFromView = gl.getUniformLocation(program, "uWorldFromView");
  const uniformDpr = gl.getUniformLocation(program, "uDpr");
  const uniformElapsed = gl.getUniformLocation(program, "uElapsedSec");
  const mat3Scratch = new Float32Array(9);

  return {
    render(viewOrientation, centerX, centerY, radius, dpr, elapsedSec) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniformViewport, canvas.width, canvas.height);
      gl.uniform2f(uniformCenter, centerX * dpr, centerY * dpr);
      gl.uniform1f(uniformRadius, radius * dpr);
      writeQuatToMat3ColumnMajor(quatConjugate(viewOrientation), mat3Scratch);
      gl.uniformMatrix3fv(uniformWorldFromView, false, mat3Scratch);
      gl.uniform1f(uniformDpr, dpr);
      gl.uniform1f(uniformElapsed, elapsedSec);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
      if (program) gl.deleteProgram(program);
    },
  };
}

export function renderCanvas2DFallback(
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  radius: number,
  dpr: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  const corona = ctx.createRadialGradient(centerX, centerY, radius * 0.94, centerX, centerY, radius + 95);
  corona.addColorStop(0, "rgba(254, 240, 199, 0.92)");
  corona.addColorStop(0.14, "rgba(245, 158, 11, 0.56)");
  corona.addColorStop(0.45, "rgba(234, 88, 12, 0.18)");
  corona.addColorStop(1, "rgba(7, 6, 7, 0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 95, 0, Math.PI * 2);
  ctx.fill();

  const sphere = ctx.createRadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.35,
    radius * 0.08,
    centerX,
    centerY,
    radius,
  );
  sphere.addColorStop(0, "#2f241f");
  sphere.addColorStop(0.7, "#0b090a");
  sphere.addColorStop(0.95, "#2a1207");
  sphere.addColorStop(1, "#f59e0b");
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}
