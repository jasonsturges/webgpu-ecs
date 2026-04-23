import solidWGSL from './shaders-solid.wgsl?raw';
import lineWGSL  from './shaders-line.wgsl?raw';

import { World }         from '../ecs/World.ts';
import { makeCameraState, cameraSystem } from '../systems/CameraSystem.ts';
import type { CameraState } from '../systems/CameraSystem.ts';
import { movementSystem }  from '../systems/MovementSystem.ts';
import { rotationSystem }  from '../systems/RotationSystem.ts';
import { makeRotatingObject } from '../entities/Prefabs.ts';

import {
  mat4Perspective, mat4LookAt, mat4ModelMatrix, mat4NormalMatrix, mat4Identity,
} from './MathUtils.ts';

import {
  makeBoxGeometry, makeGridGeometry, makeBoundingBoxGeometry, makeGPUBuffer,
} from './Mesh.ts';

// Uniform buffer sizes (bytes)
const FRAME_SIZE  = 144; // mat4 + mat4 + vec4
const OBJECT_SIZE = 144; // mat4 + mat4 + vec4
const LINE_SIZE   =  80; // mat4 + vec4

export class Renderer {
  private device:       GPUDevice;
  private context:      GPUCanvasContext;
  private format:       GPUTextureFormat;
  private depthTexture: GPUTexture | null = null;

  private solidPipeline: GPURenderPipeline;
  private linePipeline:  GPURenderPipeline;

  // Shared frame uniform buffer + bind group (works with both pipelines via compatible layouts)
  private frameBuffer:   GPUBuffer;
  private solidFrameBG:  GPUBindGroup;
  private lineFrameBG:   GPUBindGroup;

  // Per-entity object uniforms
  private entityBuffers:   Map<number, GPUBuffer>;
  private entityBindGroups: Map<number, GPUBindGroup>;

  // Line object uniforms
  private gridLineBuffer:  GPUBuffer;
  private bbLineBuffer:    GPUBuffer;
  private gridLineBG:      GPUBindGroup;
  private bbLineBG:        GPUBindGroup;

  // Geometry
  private boxVertexBuffer: GPUBuffer;
  private boxIndexBuffer:  GPUBuffer;
  private boxIndexCount:   number;
  private gridVertexBuffer: GPUBuffer;
  private gridVertexCount:  number;
  private bbVertexBuffer:  GPUBuffer;
  private bbVertexCount:   number;

  world:  World;
  camera: CameraState;

  private lastTime = 0;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.device = device;
    this.world  = new World();
    this.camera = makeCameraState();

    const ctx = canvas.getContext('webgpu');
    if (!ctx) throw new Error('WebGPU context unavailable');
    this.context = ctx;
    this.format  = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({ device, format: this.format, alphaMode: 'opaque' });

    // Bind group layouts (shared between pipelines so we can reuse frameBuffer bind group)
    const frameLayout = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform', minBindingSize: FRAME_SIZE },
      }],
    });

    const solidObjectLayout = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform', minBindingSize: OBJECT_SIZE },
      }],
    });

    const lineObjectLayout = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform', minBindingSize: LINE_SIZE },
      }],
    });

    // Pipelines
    this.solidPipeline = this.buildSolidPipeline(device, frameLayout, solidObjectLayout);
    this.linePipeline  = this.buildLinePipeline(device, frameLayout, lineObjectLayout);

    // Frame uniform buffer (shared, one write per frame)
    this.frameBuffer = device.createBuffer({
      size: FRAME_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.solidFrameBG = device.createBindGroup({
      layout: frameLayout,
      entries: [{ binding: 0, resource: { buffer: this.frameBuffer } }],
    });
    this.lineFrameBG = device.createBindGroup({
      layout: frameLayout,
      entries: [{ binding: 0, resource: { buffer: this.frameBuffer } }],
    });

    // Scene
    this.buildScene();

    // Per-entity GPU resources
    this.entityBuffers    = new Map();
    this.entityBindGroups = new Map();
    for (const id of this.world.renderables.keys()) {
      const buf = device.createBuffer({
        size: OBJECT_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.entityBuffers.set(id, buf);
      this.entityBindGroups.set(id, device.createBindGroup({
        layout: solidObjectLayout,
        entries: [{ binding: 0, resource: { buffer: buf } }],
      }));
    }

    // Line uniform buffers
    this.gridLineBuffer = device.createBuffer({ size: LINE_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bbLineBuffer   = device.createBuffer({ size: LINE_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.gridLineBG = device.createBindGroup({
      layout: lineObjectLayout,
      entries: [{ binding: 0, resource: { buffer: this.gridLineBuffer } }],
    });
    this.bbLineBG = device.createBindGroup({
      layout: lineObjectLayout,
      entries: [{ binding: 0, resource: { buffer: this.bbLineBuffer } }],
    });

    // Geometry buffers
    const box = makeBoxGeometry();
    this.boxVertexBuffer = makeGPUBuffer(device, box.vertices, GPUBufferUsage.VERTEX);
    this.boxIndexBuffer  = makeGPUBuffer(device, box.indices,  GPUBufferUsage.INDEX);
    this.boxIndexCount   = box.indices.length;

    const grid = makeGridGeometry();
    this.gridVertexBuffer = makeGPUBuffer(device, grid, GPUBufferUsage.VERTEX);
    this.gridVertexCount  = grid.length / 3;

    const bb = makeBoundingBoxGeometry();
    this.bbVertexBuffer = makeGPUBuffer(device, bb, GPUBufferUsage.VERTEX);
    this.bbVertexCount  = bb.length / 3;
  }

  private buildSolidPipeline(
    device: GPUDevice,
    frameLayout: GPUBindGroupLayout,
    objectLayout: GPUBindGroupLayout,
  ): GPURenderPipeline {
    const module = device.createShaderModule({ code: solidWGSL });
    return device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout, objectLayout] }),
      vertex: {
        module,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 24,
          attributes: [
            { shaderLocation: 0, offset:  0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
          ],
        }],
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    });
  }

  private buildLinePipeline(
    device: GPUDevice,
    frameLayout: GPUBindGroupLayout,
    lineLayout: GPUBindGroupLayout,
  ): GPURenderPipeline {
    const module = device.createShaderModule({ code: lineWGSL });
    return device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout, lineLayout] }),
      vertex: {
        module,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 12,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
        }],
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'line-list' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' },
    });
  }

  private buildScene(): void {
    const outerColors: [number, number, number, number][] = [
      [1.00, 0.39, 0.20, 1],
      [0.84, 0.51, 0.27, 1],
      [0.69, 0.63, 0.35, 1],
      [0.55, 0.75, 0.43, 1],
      [0.39, 0.87, 0.51, 1],
    ];

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * 2 * Math.PI;
      const r = 5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const [cr, cg, cb, ca] = outerColors[i];
      makeRotatingObject(
        this.world,
        { x, y: 0, z },
        { x: -z * 0.5, y: 0, z: x * 0.5 },
        { x: 30 + i * 20, y: 60, z: 90 },
        1.5,
        { x: cr, y: cg, z: cb, w: ca },
      );
    }

    makeRotatingObject(
      this.world,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 45, y: 90, z: 30 },
      2.5,
      { x: 1, y: 0.1, z: 0.1, w: 1 },
    );
  }

  resizeDepthTexture(width: number, height: number): void {
    if (this.depthTexture) this.depthTexture.destroy();
    this.depthTexture = this.device.createTexture({
      size: [width, height],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  frame(timestamp: number): void {
    const dt = this.lastTime === 0 ? 0.016 : Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    movementSystem(this.world, dt);
    rotationSystem(this.world, dt);
    cameraSystem(this.camera, dt);

    const canvas = this.context.canvas as HTMLCanvasElement;
    const w = canvas.width, h = canvas.height;

    if (!this.depthTexture || this.depthTexture.width !== w || this.depthTexture.height !== h) {
      this.resizeDepthTexture(w, h);
    }

    // Write frame uniforms once
    const aspect    = w / h;
    const view      = mat4LookAt(this.camera.eye, { x: 0, y: 0, z: 0 });
    const proj      = mat4Perspective(this.camera.fovDegrees, aspect, 0.1, 200);
    const frameData = new Float32Array(FRAME_SIZE / 4);
    frameData.set(view, 0);
    frameData.set(proj, 16);
    const L = normalize3(1, 2, 1);
    frameData[32] = L[0]; frameData[33] = L[1]; frameData[34] = L[2]; frameData[35] = 0;
    this.device.queue.writeBuffer(this.frameBuffer, 0, frameData);

    // Write identity model for grid and bbox
    const identity = mat4Identity();
    writeLineUniforms(this.device, this.gridLineBuffer, identity, 0.5, 0.5, 0.5, 1);
    writeLineUniforms(this.device, this.bbLineBuffer,   identity, 0.4, 0.4, 0.4, 1);

    const cmd  = this.device.createCommandEncoder();
    const pass = cmd.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.08, g: 0.08, b: 0.08, a: 1 },
        loadOp:  'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTexture!.createView(),
        depthClearValue: 1,
        depthLoadOp:  'clear',
        depthStoreOp: 'store',
      },
    });

    // Solid boxes
    pass.setPipeline(this.solidPipeline);
    pass.setBindGroup(0, this.solidFrameBG);
    pass.setVertexBuffer(0, this.boxVertexBuffer);
    pass.setIndexBuffer(this.boxIndexBuffer, 'uint16');

    for (const [id, renderable] of this.world.renderables) {
      const pos = this.world.positions.get(id);
      const rot = this.world.rotations.get(id);
      const buf = this.entityBuffers.get(id);
      const bg  = this.entityBindGroups.get(id);
      if (!pos || !rot || !buf || !bg) continue;

      const model  = mat4ModelMatrix(pos.value, rot.value, renderable.scale);
      const normal = mat4NormalMatrix(model);
      const objData = new Float32Array(OBJECT_SIZE / 4);
      objData.set(model, 0);
      objData.set(normal, 16);
      objData[32] = renderable.color.x;
      objData[33] = renderable.color.y;
      objData[34] = renderable.color.z;
      objData[35] = renderable.color.w;
      this.device.queue.writeBuffer(buf, 0, objData);

      pass.setBindGroup(1, bg);
      pass.drawIndexed(this.boxIndexCount);
    }

    // Lines: grid + bounding box
    pass.setPipeline(this.linePipeline);
    pass.setBindGroup(0, this.lineFrameBG);

    pass.setVertexBuffer(0, this.gridVertexBuffer);
    pass.setBindGroup(1, this.gridLineBG);
    pass.draw(this.gridVertexCount);

    pass.setVertexBuffer(0, this.bbVertexBuffer);
    pass.setBindGroup(1, this.bbLineBG);
    pass.draw(this.bbVertexCount);

    pass.end();
    this.device.queue.submit([cmd.finish()]);
  }
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}

function writeLineUniforms(
  device: GPUDevice, buf: GPUBuffer,
  model: Float32Array,
  r: number, g: number, b: number, a: number,
): void {
  const data = new Float32Array(LINE_SIZE / 4);
  data.set(model, 0);
  data[16] = r; data[17] = g; data[18] = b; data[19] = a;
  device.queue.writeBuffer(buf, 0, data);
}
