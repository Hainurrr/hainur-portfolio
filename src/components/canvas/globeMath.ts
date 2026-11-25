export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type Quat = {
  w: number;
  x: number;
  y: number;
  z: number;
};

export const DEG_TO_RAD = Math.PI / 180;

export function quatNormalize(q: Quat): Quat {
  const norm = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return {
    w: q.w / norm,
    x: q.x / norm,
    y: q.y / norm,
    z: q.z / norm,
  };
}

export function quatConjugate(q: Quat): Quat {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

export function quatFromAxisAngle(ax: number, ay: number, az: number, angleRad: number): Quat {
  const half = angleRad * 0.5;
  const s = Math.sin(half);
  return {
    w: Math.cos(half),
    x: ax * s,
    y: ay * s,
    z: az * s,
  };
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function quatAngularDistance(a: Quat, b: Quat): number {
  const dot = Math.min(1, Math.abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z));
  return 2 * Math.acos(dot);
}

export function quatSlerp(from: Quat, to: Quat, t: number): Quat {
  let dot = from.w * to.w + from.x * to.x + from.y * to.y + from.z * to.z;
  let tw = to.w;
  let tx = to.x;
  let ty = to.y;
  let tz = to.z;

  if (dot < 0) {
    dot = -dot;
    tw = -tw;
    tx = -tx;
    ty = -ty;
    tz = -tz;
  }

  if (dot > 0.9995) {
    return quatNormalize({
      w: from.w + (tw - from.w) * t,
      x: from.x + (tx - from.x) * t,
      y: from.y + (ty - from.y) * t,
      z: from.z + (tz - from.z) * t,
    });
  }

  const theta = Math.acos(Math.min(1, dot));
  const sinTheta = Math.sin(theta);
  const wFrom = Math.sin((1 - t) * theta) / sinTheta;
  const wTo = Math.sin(t * theta) / sinTheta;

  return {
    w: from.w * wFrom + tw * wTo,
    x: from.x * wFrom + tx * wTo,
    y: from.y * wFrom + ty * wTo,
    z: from.z * wFrom + tz * wTo,
  };
}

/** Rotates a 3D vector by unit quaternion q using Hamilton product shortcut. */
export function rotateVecByQuat(q: Quat, v: Vec3): Vec3 {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Writes column-major 3x3 rotation matrix for WebGL uniformMatrix3fv. */
export function writeQuatToMat3ColumnMajor(q: Quat, out: Float32Array): void {
  const xx = q.x * q.x;
  const yy = q.y * q.y;
  const zz = q.z * q.z;
  const xy = q.x * q.y;
  const xz = q.x * q.z;
  const yz = q.y * q.z;
  const wx = q.w * q.x;
  const wy = q.w * q.y;
  const wz = q.w * q.z;

  out[0] = 1 - 2 * (yy + zz);
  out[1] = 2 * (xy + wz);
  out[2] = 2 * (xz - wy);

  out[3] = 2 * (xy - wz);
  out[4] = 1 - 2 * (xx + zz);
  out[5] = 2 * (yz + wx);

  out[6] = 2 * (xz + wy);
  out[7] = 2 * (yz - wx);
  out[8] = 1 - 2 * (xx + yy);
}

export function normalizeVec3(v: Vec3): Vec3 {
  const mag = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

export function geoToCartesian(latDeg: number, lonDeg: number): Vec3 {
  const lat = latDeg * DEG_TO_RAD;
  const lon = lonDeg * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return {
    x: cosLat * Math.sin(lon),
    y: Math.sin(lat),
    z: cosLat * Math.cos(lon),
  };
}

export function cartesianToGeo(v: Vec3): { lat: number; lon: number } {
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, v.y))) / DEG_TO_RAD,
    lon: Math.atan2(v.x, v.z) / DEG_TO_RAD,
  };
}

/** Returns world-to-camera quaternion that centers (latDeg, lonDeg) directly toward +Z. */
export function viewQuatForTarget(latDeg: number, lonDeg: number): Quat {
  const pitch = quatFromAxisAngle(1, 0, 0, latDeg * DEG_TO_RAD);
  const yaw = quatFromAxisAngle(0, 1, 0, -lonDeg * DEG_TO_RAD);
  return quatNormalize(quatMultiply(pitch, yaw));
}

export function formatCelestialCoords(latDeg: number, lonDeg: number): string {
  const ns = latDeg >= 0 ? "N" : "S";
  const ew = lonDeg >= 0 ? "E" : "W";
  return `${Math.abs(latDeg).toFixed(1)}°${ns}  ${Math.abs(lonDeg).toFixed(1)}°${ew}`;
}
