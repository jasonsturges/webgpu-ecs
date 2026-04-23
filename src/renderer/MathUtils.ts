export type Vec3 = { x: number; y: number; z: number };
export type Vec4 = { x: number; y: number; z: number; w: number };
export type Quat = { x: number; y: number; z: number; w: number };

// Column-major Float32Array, 16 elements.
// Index = col * 4 + row.

export function mat4Identity(): Float32Array {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

// Maps z to [0, 1] (WebGPU / Metal NDC).
export function mat4Perspective(fovYDeg: number, aspect: number, near: number, far: number): Float32Array {
  const fovY = (fovYDeg * Math.PI) / 180;
  const yScale = 1 / Math.tan(fovY / 2);
  const xScale = yScale / aspect;
  const zRange = far - near;
  const m = new Float32Array(16);
  m[0]  = xScale;
  m[5]  = yScale;
  m[10] = -far / zRange;
  m[11] = -1;
  m[14] = -(near * far) / zRange;
  return m;
}

export function mat4LookAt(eye: Vec3, center: Vec3, up: Vec3 = { x: 0, y: 1, z: 0 }): Float32Array {
  let zx = eye.x - center.x, zy = eye.y - center.y, zz = eye.z - center.z;
  const zLen = Math.sqrt(zx * zx + zy * zy + zz * zz);
  zx /= zLen; zy /= zLen; zz /= zLen;

  let xx = up.y * zz - up.z * zy, xy = up.z * zx - up.x * zz, xz = up.x * zy - up.y * zx;
  const xLen = Math.sqrt(xx * xx + xy * xy + xz * xz);
  xx /= xLen; xy /= xLen; xz /= xLen;

  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;

  const m = new Float32Array(16);
  m[0] = xx; m[1] = yx; m[2]  = zx; m[3]  = 0;
  m[4] = xy; m[5] = yy; m[6]  = zy; m[7]  = 0;
  m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
  m[12] = -(xx * eye.x + xy * eye.y + xz * eye.z);
  m[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);
  m[14] = -(zx * eye.x + zy * eye.y + zz * eye.z);
  m[15] = 1;
  return m;
}

export function mat4FromQuat(q: Quat): Float32Array {
  const { x, y, z, w } = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  const m = new Float32Array(16);
  m[0]  = 1 - (yy + zz);  m[1]  = xy + wz;      m[2]  = xz - wy;      m[3]  = 0;
  m[4]  = xy - wz;        m[5]  = 1 - (xx + zz); m[6]  = yz + wx;      m[7]  = 0;
  m[8]  = xz + wy;        m[9]  = yz - wx;       m[10] = 1 - (xx + yy); m[11] = 0;
  m[12] = 0;              m[13] = 0;              m[14] = 0;             m[15] = 1;
  return m;
}

export function mat4ModelMatrix(pos: Vec3, q: Quat, scale: number): Float32Array {
  const m = mat4FromQuat(q);
  m[0] *= scale; m[1] *= scale; m[2]  *= scale;
  m[4] *= scale; m[5] *= scale; m[6]  *= scale;
  m[8] *= scale; m[9] *= scale; m[10] *= scale;
  m[12] = pos.x; m[13] = pos.y; m[14] = pos.z;
  return m;
}

// Strips translation — valid for uniform scale.
export function mat4NormalMatrix(model: Float32Array): Float32Array {
  const m = model.slice();
  m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
  return m;
}

export function quatIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function quatFromAxisAngle(axis: Vec3, angleRad: number): Quat {
  const half = angleRad / 2;
  const s = Math.sin(half);
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function quatNormalize(q: Quat): Quat {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
