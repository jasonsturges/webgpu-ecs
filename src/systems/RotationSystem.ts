import type { World } from '../ecs/World.ts';
import { quatFromAxisAngle, quatMultiply, quatNormalize } from '../renderer/MathUtils.ts';

const DEG2RAD = Math.PI / 180;

export function rotationSystem(world: World, dt: number): void {
  for (const [id, speed] of world.rotationSpeeds) {
    const rot = world.rotations.get(id);
    if (!rot) continue;

    const dx = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, speed.x * dt * DEG2RAD);
    const dy = quatFromAxisAngle({ x: 0, y: 1, z: 0 }, speed.y * dt * DEG2RAD);
    const dz = quatFromAxisAngle({ x: 0, y: 0, z: 1 }, speed.z * dt * DEG2RAD);

    rot.value = quatNormalize(quatMultiply(rot.value, quatMultiply(dx, quatMultiply(dy, dz))));
  }
}
