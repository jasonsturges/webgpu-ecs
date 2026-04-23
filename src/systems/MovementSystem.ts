import type { World } from '../ecs/World.ts';

export function movementSystem(world: World, dt: number): void {
  for (const [id, vel] of world.velocities) {
    const pos    = world.positions.get(id);
    const bounce = world.bounces.get(id);
    if (!pos || !bounce) continue;

    pos.value.x += vel.value.x * dt;
    pos.value.y += vel.value.y * dt;
    pos.value.z += vel.value.z * dt;

    const { boundary: b, halfSize: h } = bounce;

    if (pos.value.x - h < -b || pos.value.x + h > b) {
      vel.value.x *= -1;
      pos.value.x  = pos.value.x < 0 ? -b + h : b - h;
    }
    if (pos.value.y - h < -b || pos.value.y + h > b) {
      vel.value.y *= -1;
      pos.value.y  = pos.value.y < 0 ? -b + h : b - h;
    }
    if (pos.value.z - h < -b || pos.value.z + h > b) {
      vel.value.z *= -1;
      pos.value.z  = pos.value.z < 0 ? -b + h : b - h;
    }
  }
}
