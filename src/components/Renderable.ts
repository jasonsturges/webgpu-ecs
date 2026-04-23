import type { Vec4 } from '../renderer/MathUtils.ts';

export interface RenderableComponent {
  color: Vec4;
  scale: number;
}
