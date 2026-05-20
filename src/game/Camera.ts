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
    _deltaTimeSeconds: number
  ): void {
    if (this.x === 0 && this.y === 0) {
      this.x = targetX;
      this.y = targetY;
      return;
    }

    this.x = targetX;
    this.y = targetY;
  }
}
