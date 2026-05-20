import type { Segment } from '../collision/geometry';

export interface Ray extends Segment {
  angle: number;
}

export function createRay(): Ray {
  return {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    angle: 0,
  };
}

export function updateRay(
  ray: Ray,
  originX: number,
  originY: number,
  angle: number,
  length: number
): void {
  ray.angle = angle;
  ray.start.x = originX;
  ray.start.y = originY;
  ray.end.x = originX - Math.sin(angle) * length;
  ray.end.y = originY - Math.cos(angle) * length;
}
