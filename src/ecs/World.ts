import type { PositionComponent } from '../components/Position.ts';
import type { VelocityComponent } from '../components/Velocity.ts';
import type { RotationComponent } from '../components/Rotation.ts';
import type { RotationSpeedComponent } from '../components/RotationSpeed.ts';
import type { BounceComponent } from '../components/Bounce.ts';
import type { RenderableComponent } from '../components/Renderable.ts';

export type EntityID = number;

export class World {
  private nextID = 0;

  positions      = new Map<EntityID, PositionComponent>();
  velocities     = new Map<EntityID, VelocityComponent>();
  rotations      = new Map<EntityID, RotationComponent>();
  rotationSpeeds = new Map<EntityID, RotationSpeedComponent>();
  bounces        = new Map<EntityID, BounceComponent>();
  renderables    = new Map<EntityID, RenderableComponent>();

  createEntity(): EntityID {
    return this.nextID++;
  }
}
