import { lerp } from '../utils/math';

const LATERAL_FOLLOW_STIFFNESS = 8;

export class Camera {
  public x = 0;
  public y = 0;

  public reset(targetX = 0, targetY = 0): void {
    this.x = targetX;
    this.y = targetY;
  }

  public follow(
    targetX: number,
    targetY: number,
    deltaTimeSeconds: number
  ): void {
    if (this.x === 0 && this.y === 0) {
      this.x = targetX;
      this.y = targetY;
      return;
    }

    const lateralAlpha = 1 - Math.exp(-LATERAL_FOLLOW_STIFFNESS * deltaTimeSeconds);

    this.x = lerp(this.x, targetX, lateralAlpha);
    this.y = targetY;
  }
}
