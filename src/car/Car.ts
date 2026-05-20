import { Controls } from './Controls';
import {
  DEFAULT_CAR_PHYSICS,
  getRotationDelta,
  type CarPhysicsConfig,
  updateSteeringAngle,
  updateSpeed,
} from './Physics';

const CAR_BODY_COLOR = '#7fe0c4';
const CAR_CABIN_COLOR = '#163039';
const CAR_OUTLINE_COLOR = '#ecfff7';
const FRONT_MARKER_COLOR = '#f4fff9';
const FRONT_LIGHT_COLOR = '#f8ffcc';
const REAR_LIGHT_COLOR = '#ff6b6b';
const REAR_BUMPER_COLOR = '#5c1f28';
const DEBUG_VECTOR_SPEED_SCALE = 0.28;
const DEBUG_FORWARD_VECTOR_LENGTH = 34;
const ENABLE_DEBUG_VECTORS = true;

export class Car {
  public x: number;
  public y: number;
  public readonly width: number;
  public readonly height: number;
  public angle = 0;
  public speed = 0;
  public steeringAngle = 0;

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
    const throttleInput = Number(this.controls.forward) - Number(this.controls.reverse);

    this.speed = updateSpeed(
      this.speed,
      deltaTimeSeconds,
      throttleInput,
      this.physics
    );

    const steeringInput = Number(this.controls.left) - Number(this.controls.right);
    this.steeringAngle = updateSteeringAngle(
      this.steeringAngle,
      steeringInput,
      deltaTimeSeconds,
      this.physics
    );

    this.angle += getRotationDelta(
      this.speed,
      this.steeringAngle,
      deltaTimeSeconds,
      this.physics
    );

    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);
    const distance = this.speed * deltaTimeSeconds;

    this.x -= sin * distance;
    this.y += cos * distance;
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

    ctx.fillStyle = FRONT_MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.42);
    ctx.lineTo(this.width * 0.14, this.height * 0.28);
    ctx.lineTo(-this.width * 0.14, this.height * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = FRONT_LIGHT_COLOR;
    ctx.fillRect(
      -this.width * 0.3,
      this.height * 0.2,
      this.width * 0.14,
      this.height * 0.08
    );
    ctx.fillRect(
      this.width * 0.16,
      this.height * 0.2,
      this.width * 0.14,
      this.height * 0.08
    );

    ctx.fillStyle = REAR_BUMPER_COLOR;
    ctx.fillRect(
      -this.width * 0.28,
      -this.height * 0.36,
      this.width * 0.56,
      this.height * 0.08
    );

    ctx.fillStyle = REAR_LIGHT_COLOR;
    ctx.fillRect(
      -this.width * 0.3,
      -this.height * 0.32,
      this.width * 0.14,
      this.height * 0.08
    );
    ctx.fillRect(
      this.width * 0.16,
      -this.height * 0.32,
      this.width * 0.14,
      this.height * 0.08
    );

    ctx.strokeStyle = 'rgba(236, 255, 247, 0.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.34);
    ctx.lineTo(0, this.height * 0.18);
    ctx.stroke();

    if (ENABLE_DEBUG_VECTORS) {
      this.renderDebugVectors(ctx);
    }

    ctx.restore();
  }

  private renderDebugVectors(ctx: CanvasRenderingContext2D): void {
    const velocityLength = this.speed * DEBUG_VECTOR_SPEED_SCALE;
    const speedDirection = this.speed >= 0 ? 1 : -1;

    ctx.lineWidth = 2;

    ctx.strokeStyle = 'rgba(127, 224, 196, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, DEBUG_FORWARD_VECTOR_LENGTH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, velocityLength * speedDirection);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.beginPath();
    ctx.arc(0, velocityLength * speedDirection, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
