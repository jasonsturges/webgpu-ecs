import type { Vec3 } from '../renderer/MathUtils.ts';
import { vec3Lerp } from '../renderer/MathUtils.ts';

export type CameraMode = 'autoOrbit' | 'manual' | 'returning';

export interface CameraState {
  mode:            CameraMode;
  orbitAngle:      number;  // degrees
  orbitSpeed:      number;  // degrees/sec
  orbitRadius:     number;
  orbitHeight:     number;
  manualAngleH:    number;  // degrees
  manualAngleV:    number;  // degrees
  manualRadius:    number;
  returnProgress:  number;
  returnStartPos:  Vec3;
  returnTargetPos: Vec3;
  fovDegrees:      number;
  eye:             Vec3;
}

export function makeCameraState(): CameraState {
  const orbitRadius = 25;
  const orbitHeight = 15;
  const angle = 45 * (Math.PI / 180);
  return {
    mode:            'autoOrbit',
    orbitAngle:      45,
    orbitSpeed:      15,
    orbitRadius,
    orbitHeight,
    manualAngleH:    0,
    manualAngleV:    30,
    manualRadius:    25,
    returnProgress:  0,
    returnStartPos:  { x: 0, y: 0, z: 0 },
    returnTargetPos: { x: 0, y: 0, z: 0 },
    fovDegrees:      45,
    eye: {
      x: Math.cos(angle) * orbitRadius,
      y: orbitHeight,
      z: Math.sin(angle) * orbitRadius,
    },
  };
}

export function cameraSystem(camera: CameraState, dt: number): void {
  const DEG2RAD = Math.PI / 180;

  switch (camera.mode) {
    case 'autoOrbit': {
      camera.orbitAngle += camera.orbitSpeed * dt;
      if (camera.orbitAngle >= 360) camera.orbitAngle -= 360;
      const rad = camera.orbitAngle * DEG2RAD;
      camera.eye = {
        x: Math.cos(rad) * camera.orbitRadius,
        y: camera.orbitHeight,
        z: Math.sin(rad) * camera.orbitRadius,
      };
      break;
    }

    case 'manual': {
      const radH = camera.manualAngleH * DEG2RAD;
      const radV = camera.manualAngleV * DEG2RAD;
      camera.eye = {
        x: Math.cos(radH) * Math.cos(radV) * camera.manualRadius,
        y: Math.sin(radV) * camera.manualRadius,
        z: Math.sin(radH) * Math.cos(radV) * camera.manualRadius,
      };
      break;
    }

    case 'returning': {
      camera.returnProgress += dt * 2;
      if (camera.returnProgress >= 1) {
        camera.returnProgress = 1;
        camera.mode = 'autoOrbit';
      }

      const t = camera.returnProgress;
      const eased = 1 - (1 - t) * (1 - t);

      camera.orbitAngle += camera.orbitSpeed * dt;
      if (camera.orbitAngle >= 360) camera.orbitAngle -= 360;
      const rad = camera.orbitAngle * DEG2RAD;
      camera.returnTargetPos = {
        x: Math.cos(rad) * camera.orbitRadius,
        y: camera.orbitHeight,
        z: Math.sin(rad) * camera.orbitRadius,
      };

      camera.eye = vec3Lerp(camera.returnStartPos, camera.returnTargetPos, eased);
      break;
    }
  }
}
