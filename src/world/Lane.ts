import { clamp } from '../utils/math';

export class Lane {
  public readonly index: number;
  public readonly left: number;
  public readonly right: number;
  public readonly center: number;

  public constructor(index: number, left: number, width: number) {
    this.index = index;
    this.left = left;
    this.right = left + width;
    this.center = left + width * 0.5;
  }
}

export function clampLaneIndex(index: number, laneCount: number): number {
  return clamp(index, 0, laneCount - 1);
}
