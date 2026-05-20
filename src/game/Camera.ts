export class Camera {
  public x = 0;
  public y = 0;

  public follow(targetX: number, targetY: number): void {
    this.x = targetX;
    this.y = targetY;
  }
}
