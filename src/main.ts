import './style.css';
import { Renderer } from './renderer/Renderer.ts';

async function main(): Promise<void> {
  if (!navigator.gpu) {
    document.body.innerHTML = '<p class="error">WebGPU is not supported in this browser.</p>';
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    document.body.innerHTML = '<p class="error">No WebGPU adapter found.</p>';
    return;
  }

  const device = await adapter.requestDevice();

  const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;

  function resize(): void {
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width  = Math.floor(canvas.clientWidth  * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const renderer = new Renderer(device, canvas);

  // Camera mouse input — mirrors the Raylib / MetalKit camera controller
  let isDragging   = false;
  let lastMouseX   = 0;
  let lastMouseY   = 0;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    const cam = renderer.camera;
    if (cam.mode === 'autoOrbit') {
      const pos  = cam.eye;
      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      cam.manualAngleH  = Math.atan2(pos.z, pos.x) * (180 / Math.PI);
      cam.manualAngleV  = dist > 0.001 ? Math.asin(Math.max(-1, Math.min(1, pos.y / dist))) * (180 / Math.PI) : 30;
      cam.manualRadius  = Math.max(5, dist);
      cam.mode = 'manual';
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    renderer.camera.manualAngleH += dx * 0.3;
    renderer.camera.manualAngleV  = Math.max(-89, Math.min(89, renderer.camera.manualAngleV + dy * 0.3));
  });

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button !== 0 || !isDragging) return;
    isDragging = false;

    const cam = renderer.camera;
    if (cam.mode === 'manual') {
      const rad = cam.orbitAngle * (Math.PI / 180);
      cam.returnStartPos  = { ...cam.eye };
      cam.returnTargetPos = {
        x: Math.cos(rad) * cam.orbitRadius,
        y: cam.orbitHeight,
        z: Math.sin(rad) * cam.orbitRadius,
      };
      cam.returnProgress = 0;
      cam.mode = 'returning';
    }
  });

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? 400 : 1) * 0.05;
    renderer.camera.orbitRadius  = Math.max(5, Math.min(50, renderer.camera.orbitRadius  + delta));
    renderer.camera.manualRadius = Math.max(5, Math.min(50, renderer.camera.manualRadius + delta));
  }, { passive: false });

  function loop(ts: number): void {
    renderer.frame(ts);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main().catch(console.error);
