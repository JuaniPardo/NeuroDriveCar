import {
  getPolygonSegmentIntersection,
  type Intersection,
  type Point,
  type Segment,
} from '../collision/geometry';
import { Controls } from './Controls';
import {
  DEFAULT_CAR_PHYSICS,
  getRotationDelta,
  type CarPhysicsConfig,
  updateSteeringAngle,
  updateSpeed,
} from './Physics';

const CAR_BODY_COLOR = '#7fe0c4';
const DAMAGED_CAR_BODY_COLOR = '#7a3a3a';
const CAR_CABIN_COLOR = '#163039';
const DAMAGED_CAR_CABIN_COLOR = '#261315';
const CAR_OUTLINE_COLOR = '#ecfff7';
const DAMAGED_CAR_OUTLINE_COLOR = '#ffc0c0';
const FRONT_MARKER_COLOR = '#f4fff9';
const FRONT_LIGHT_COLOR = '#f8ffcc';
const REAR_LIGHT_COLOR = '#ff6b6b';
const REAR_BUMPER_COLOR = '#5c1f28';
const DEBUG_VECTOR_SPEED_SCALE = 0.28;
const DEBUG_FORWARD_VECTOR_LENGTH = 34;
const ENABLE_DEBUG_VECTORS = true;
const ENABLE_COLLISION_DEBUG = true;
const COLLISION_POINT_RADIUS = 4;

export class Car {
  public x: number;
  public y: number;
  public readonly width: number;
  public readonly height: number;
  public angle = 0;
  public speed = 0;
  public steeringAngle = 0;
  public damaged = false;
  public readonly polygon: Point[];
  public collisionPoint: Point | null = null;

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
    this.polygon = createCarPolygon();

    this.controls.attach();
    this.updatePolygon();
  }

  public destroy(): void {
    this.controls.detach();
  }

  public reset(x: number, y: number, angle = 0): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.steeringAngle = 0;
    this.damaged = false;
    this.collisionPoint = null;
    this.controls.clear();
    this.updatePolygon();
  }

  public update(
    deltaTimeSeconds: number,
    roadBorders: readonly Segment[] = []
  ): void {
    if (this.damaged) {
      this.speed = 0;
      this.steeringAngle = 0;
      this.updatePolygon();
      return;
    }

    const throttleInput =
      Number(this.controls.forward) - Number(this.controls.reverse);

    this.speed = updateSpeed(
      this.speed,
      deltaTimeSeconds,
      throttleInput,
      this.physics
    );

    const steeringInput =
      Number(this.controls.right) - Number(this.controls.left);
    this.steeringAngle = updateSteeringAngle(
      this.steeringAngle,
      steeringInput,
      deltaTimeSeconds,
      this.physics
    );

    const rotationDelta = getRotationDelta(
      this.speed,
      this.steeringAngle,
      deltaTimeSeconds,
      this.physics
    );
    this.angle -= rotationDelta;

    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);
    const distance = this.speed * deltaTimeSeconds;

    this.x -= sin * distance;
    this.y += cos * distance;

    this.updatePolygon();
    this.assessDamage(roadBorders);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);

    ctx.fillStyle = this.damaged ? DAMAGED_CAR_BODY_COLOR : CAR_BODY_COLOR;
    ctx.strokeStyle = this.damaged
      ? DAMAGED_CAR_OUTLINE_COLOR
      : CAR_OUTLINE_COLOR;
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

    ctx.fillStyle = this.damaged ? DAMAGED_CAR_CABIN_COLOR : CAR_CABIN_COLOR;
    ctx.fillRect(
      -this.width * 0.28,
      -this.height * 0.18,
      this.width * 0.56,
      this.height * 0.38
    );

    ctx.fillStyle = FRONT_MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, -this.height * 0.42);
    ctx.lineTo(this.width * 0.14, -this.height * 0.28);
    ctx.lineTo(-this.width * 0.14, -this.height * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = FRONT_LIGHT_COLOR;
    ctx.fillRect(
      -this.width * 0.3,
      -this.height * 0.28,
      this.width * 0.14,
      this.height * 0.08
    );
    ctx.fillRect(
      this.width * 0.16,
      -this.height * 0.28,
      this.width * 0.14,
      this.height * 0.08
    );

    ctx.fillStyle = REAR_BUMPER_COLOR;
    ctx.fillRect(
      -this.width * 0.28,
      this.height * 0.28,
      this.width * 0.56,
      this.height * 0.08
    );

    ctx.fillStyle = REAR_LIGHT_COLOR;
    ctx.fillRect(
      -this.width * 0.3,
      this.height * 0.24,
      this.width * 0.14,
      this.height * 0.08
    );
    ctx.fillRect(
      this.width * 0.16,
      this.height * 0.24,
      this.width * 0.14,
      this.height * 0.08
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

    if (ENABLE_COLLISION_DEBUG) {
      this.renderCollisionDebug(ctx);
    }
  }

  private renderDebugVectors(ctx: CanvasRenderingContext2D): void {
    const velocityLength = this.speed * DEBUG_VECTOR_SPEED_SCALE;
    const speedDirection = this.speed >= 0 ? 1 : -1;

    ctx.lineWidth = 2;

    ctx.strokeStyle = 'rgba(127, 224, 196, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -DEBUG_FORWARD_VECTOR_LENGTH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -velocityLength * speedDirection);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.beginPath();
    ctx.arc(0, -velocityLength * speedDirection, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private assessDamage(roadBorders: readonly Segment[]): void {
    for (const roadBorder of roadBorders) {
      const collision = getPolygonSegmentIntersection(this.polygon, roadBorder);

      if (collision === null) {
        continue;
      }

      this.setDamaged(collision);
      return;
    }
  }

  private setDamaged(collision: Intersection): void {
    this.damaged = true;
    this.speed = 0;
    this.steeringAngle = 0;
    this.collisionPoint = { x: collision.x, y: collision.y };
  }

  private updatePolygon(): void {
    const halfWidth = this.width * 0.5;
    const halfHeight = this.height * 0.5;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    updatePolygonPoint(
      this.polygon[0],
      this.x,
      this.y,
      -halfWidth,
      -halfHeight,
      cos,
      sin
    );
    updatePolygonPoint(
      this.polygon[1],
      this.x,
      this.y,
      halfWidth,
      -halfHeight,
      cos,
      sin
    );
    updatePolygonPoint(
      this.polygon[2],
      this.x,
      this.y,
      halfWidth,
      halfHeight,
      cos,
      sin
    );
    updatePolygonPoint(
      this.polygon[3],
      this.x,
      this.y,
      -halfWidth,
      halfHeight,
      cos,
      sin
    );
  }

  private renderCollisionDebug(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.damaged
      ? 'rgba(255, 140, 140, 0.95)'
      : 'rgba(127, 224, 196, 0.75)';
    ctx.beginPath();
    ctx.moveTo(this.polygon[0].x, this.polygon[0].y);

    for (let index = 1; index < this.polygon.length; index += 1) {
      ctx.lineTo(this.polygon[index].x, this.polygon[index].y);
    }

    ctx.closePath();
    ctx.stroke();

    if (this.collisionPoint !== null) {
      ctx.fillStyle = 'rgba(255, 120, 120, 0.95)';
      ctx.beginPath();
      ctx.arc(
        this.collisionPoint.x,
        this.collisionPoint.y,
        COLLISION_POINT_RADIUS,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }
}

function createCarPolygon(): Point[] {
  return [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
}

function updatePolygonPoint(
  point: Point,
  centerX: number,
  centerY: number,
  localX: number,
  localY: number,
  cos: number,
  sin: number
): void {
  point.x = centerX + localX * cos + localY * sin;
  point.y = centerY - localX * sin + localY * cos;
}
