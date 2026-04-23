import type { World } from '../ecs/World.ts';
import type { Vec3, Vec4 } from '../renderer/MathUtils.ts';
import { quatIdentity } from '../renderer/MathUtils.ts';

export function makeRotatingObject(
  world: World,
  position: Vec3,
  velocity: Vec3,
  rotationSpeed: Vec3,
  size: number,
  color: Vec4,
): void {
  const id = world.createEntity();
  world.positions.set(id,      { value: { ...position } });
  world.velocities.set(id,     { value: { ...velocity } });
  world.rotations.set(id,      { value: quatIdentity() });
  world.rotationSpeeds.set(id, { x: rotationSpeed.x, y: rotationSpeed.y, z: rotationSpeed.z });
  world.bounces.set(id,        { boundary: 10, halfSize: size / 2 });
  world.renderables.set(id,    { color: { ...color }, scale: size });
}
