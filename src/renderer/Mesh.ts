// Interleaved vertex: position(xyz) + normal(xyz) = 6 floats = 24 bytes
export function makeBoxGeometry(): { vertices: Float32Array; indices: Uint16Array } {
  const verts: number[] = [];
  const idxs: number[] = [];

  function addFace(
    v0: number[], v1: number[], v2: number[], v3: number[],
    n: number[],
  ): void {
    const base = verts.length / 6;
    for (const v of [v0, v1, v2, v3]) {
      verts.push(v[0], v[1], v[2], n[0], n[1], n[2]);
    }
    idxs.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const h = 0.5;
  addFace([ h,-h, h],[ h,-h,-h],[ h, h,-h],[ h, h, h], [ 1, 0, 0]); // +X
  addFace([-h,-h,-h],[-h,-h, h],[-h, h, h],[-h, h,-h], [-1, 0, 0]); // -X
  addFace([-h, h,-h],[ h, h,-h],[ h, h, h],[-h, h, h], [ 0, 1, 0]); // +Y
  addFace([-h,-h, h],[ h,-h, h],[ h,-h,-h],[-h,-h,-h], [ 0,-1, 0]); // -Y
  addFace([-h,-h, h],[ h,-h, h],[ h, h, h],[-h, h, h], [ 0, 0, 1]); // +Z
  addFace([ h,-h,-h],[-h,-h,-h],[-h, h,-h],[ h, h,-h], [ 0, 0,-1]); // -Z

  return { vertices: new Float32Array(verts), indices: new Uint16Array(idxs) };
}

// Line-list vertices: position(xyz) = 3 floats = 12 bytes
export function makeGridGeometry(size = 20, divisions = 20): Float32Array {
  const half = size / 2;
  const step = size / divisions;
  const pts: number[] = [];
  for (let i = 0; i <= divisions; i++) {
    const t = -half + i * step;
    pts.push(-half, 0, t,  half, 0, t);
    pts.push(t, 0, -half,  t, 0, half);
  }
  return new Float32Array(pts);
}

export function makeBoundingBoxGeometry(size = 20): Float32Array {
  const h = size / 2;
  const pts: number[] = [];
  function edge(ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    pts.push(ax, ay, az, bx, by, bz);
  }
  // Bottom
  edge(-h,-h,-h,  h,-h,-h);  edge( h,-h,-h,  h,-h, h);
  edge( h,-h, h, -h,-h, h);  edge(-h,-h, h, -h,-h,-h);
  // Top
  edge(-h, h,-h,  h, h,-h);  edge( h, h,-h,  h, h, h);
  edge( h, h, h, -h, h, h);  edge(-h, h, h, -h, h,-h);
  // Verticals
  edge(-h,-h,-h, -h, h,-h);  edge( h,-h,-h,  h, h,-h);
  edge( h,-h, h,  h, h, h);  edge(-h,-h, h, -h, h, h);
  return new Float32Array(pts);
}

export function makeGPUBuffer(device: GPUDevice, data: Float32Array | Uint16Array, usage: number): GPUBuffer {
  const buf = device.createBuffer({ size: data.byteLength, usage: usage | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(buf, 0, data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
  return buf;
}
