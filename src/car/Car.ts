import { Controls } from './Controls';
import {
  DEFAULT_CAR_PHYSICS,
  getSteeringAmount,
  type CarPhysicsConfig,
  updateSpeed,
} from './Physics';

const CAR_BODY_COLOR = '#7fe0c4';
const CAR_CABIN_COLOR = '#163039';
const CAR_OUTLINE_COLOR = '#ecfff7';
const DEBUG_VECTOR_SPEED_SCALE = 0.45;
const DEBUG_FORWARD_VECTOR_LENGTH = 34;
const ENABLE_DEBUG_VECTORS = true;

export class Car {
  public x: number;
  public y: number;
  public readonly width: number;
  public readonly height: number;
  public angle = 0;
  public speed = 0;

  private readonly controls: Controls;
  private readonly physics: CarPhysicsConfig;

  public constructor(
    x: number,
    y: number,
    width = 42,
    height = 74,
    physics: CarPhysicsConfig = DEFAULT_CAR_PHYSICS
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.physics = physics;
    this.controls = new Controls();

    this.controls.attach();
  }

  public destroy(): void {
    this.controls.detach();
  }

  public update(deltaTimeSeconds: number): void {
    this.speed = updateSpeed(
      this.speed,
      deltaTimeSeconds,
      this.controls.forward,
      this.controls.reverse,
      this.physics
    );

    const steeringInput = Number(this.controls.right) - Number(this.controls.left);

    this.angle += getSteeringAmount(
      this.speed,
      deltaTimeSeconds,
      steeringInput,
      this.physics
    );

    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);
    const distance = this.speed * deltaTimeSeconds;

    this.x += sin * distance;
    this.y -= cos * distance;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = CAR_BODY_COLOR;
    ctx.strokeStyle = CAR_OUTLINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(
      -this.width * 0.5,
      -this.height * 0.5,
      this.width,
      this.height,
      8
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = CAR_CABIN_COLOR;
    ctx.fillRect(
      -this.width * 0.28,
      -this.height * 0.18,
      this.width * 0.56,
      this.height * 0.38
    );

    ctx.strokeStyle = 'rgba(236, 255, 247, 0.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.height * 0.34);
    ctx.lineTo(0, -this.height * 0.18);
    ctx.stroke();

    if (ENABLE_DEBUG_VECTORS) {
      this.renderDebugVectors(ctx);
    }

    ctx.restore();
  }

  private renderDebugVectors(ctx: CanvasRenderingContext2D): void {
    const velocityLength = this.speed * DEBUG_VECTOR_SPEED_SCALE;

    ctx.lineWidth = 2;

    ctx.strokeStyle = 'rgba(127, 224, 196, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -DEBUG_FORWARD_VECTOR_LENGTH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -velocityLength);
    ctx.stroke();
  }
}
