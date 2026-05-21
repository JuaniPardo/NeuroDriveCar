import {
  getPolygonIntersection,
  getPolygonSegmentIntersection,
  type Intersection,
  type Point,
  type Segment,
} from '../collision/geometry';
import { Brain, BRAIN_OUTPUT_LABELS } from '../ai/Brain';
import type { BrainSnapshot } from '../ai/Brain';
import { Sensor, type SensorConfig } from '../sensors/Sensor';
import { clamp, lerp } from '../utils/math';
import { THEME } from '../utils/visualTheme';
import { Controls } from './Controls';
import {
  DEFAULT_CAR_PHYSICS,
  getRotationDelta,
  type CarPhysicsConfig,
  updateSteeringAngle,
  updateSpeed,
} from './Physics';

const DEBUG_VECTOR_SPEED_SCALE = 0.28;
const DEBUG_FORWARD_VECTOR_LENGTH = 34;
const ENABLE_DEBUG_VECTORS = true;
const ENABLE_COLLISION_DEBUG = true;
const COLLISION_POINT_RADIUS = 4;
const SENSOR_FORWARD_OFFSET_RATIO = 0.18;
const DEFAULT_AI_STEERING_SMOOTHING = 0.12;
const DEFAULT_AI_STEERING_STRENGTH = 0.55;

export interface AIControlConfig {
  steeringSmoothing: number;
  steeringStrength: number;
}

export type CarControlMode = 'player' | 'ai' | 'traffic';

export interface CarAppearance {
  bodyColor: string;
  damagedBodyColor: string;
  cabinColor: string;
  damagedCabinColor: string;
  outlineColor: string;
  damagedOutlineColor: string;
  frontMarkerColor: string;
  frontLightColor: string;
  rearLightColor: string;
  rearBumperColor: string;
  debugPolygonColor: string;
}

export interface CarOptions {
  controlMode?: CarControlMode;
  trafficSpeed?: number;
  appearance?: Partial<CarAppearance>;
  sensor?: Partial<SensorConfig> | false;
  aiControl?: Partial<AIControlConfig>;
}

export interface CarRenderOptions {
  renderSensors?: boolean;
  renderDebug?: boolean;
}

const DEFAULT_CAR_APPEARANCE: CarAppearance = {
  ...THEME.car.player,
};

const DEFAULT_AI_CONTROL_CONFIG: AIControlConfig = {
  steeringSmoothing: DEFAULT_AI_STEERING_SMOOTHING,
  steeringStrength: DEFAULT_AI_STEERING_STRENGTH,
};

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
  public readonly sensor: Sensor | null;
  public readonly brain: Brain | null;

  private readonly controls: Controls;
  private readonly physics: CarPhysicsConfig;
  private controlMode: CarControlMode;
  private readonly trafficSpeed: number;
  private readonly appearanceOverrides: Partial<CarAppearance>;
  private readonly aiControl: AIControlConfig;
  private appearance: CarAppearance;
  private smoothedAiSteerIntent = 0;

  public constructor(
    x: number,
    y: number,
    width = 42,
    height = 74,
    physics: CarPhysicsConfig = DEFAULT_CAR_PHYSICS,
    options: CarOptions = {}
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.physics = physics;
    this.controlMode = options.controlMode ?? 'player';
    this.trafficSpeed = options.trafficSpeed ?? 0;
    this.appearanceOverrides = options.appearance ?? {};
    this.aiControl = {
      ...DEFAULT_AI_CONTROL_CONFIG,
      ...options.aiControl,
    };
    this.appearance = this.getAppearanceForMode(this.controlMode);
    this.controls = new Controls();
    this.polygon = createCarPolygon();
    this.sensor =
      this.controlMode !== 'traffic' && options.sensor !== false
        ? new Sensor(options.sensor)
        : null;
    this.brain =
      this.controlMode === 'ai' && this.sensor !== null
        ? new Brain(this.sensor.normalizedReadings.length)
        : null;

    if (this.controlMode === 'player') {
      this.controls.attach();
    }

    this.updatePolygon();
    this.updateSensors([], []);
  }

  public destroy(): void {
    this.controls.detach();
  }

  public reset(x: number, y: number, angle = 0): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = this.controlMode === 'traffic' ? this.trafficSpeed : 0;
    this.steeringAngle = 0;
    this.damaged = false;
    this.collisionPoint = null;
    this.smoothedAiSteerIntent = 0;
    this.controls.clear();
    this.updatePolygon();
    this.updateSensors([], []);
    this.syncBrainToSensors();
  }

  public update(deltaTimeSeconds: number, roadBorders: readonly Segment[] = []): void {
    if (this.damaged) {
      this.speed = 0;
      this.steeringAngle = 0;
      this.smoothedAiSteerIntent = 0;
      this.updatePolygon();
      return;
    }

    if (this.controlMode === 'traffic') {
      this.updateTraffic(deltaTimeSeconds, roadBorders);
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

    const steeringInput = this.getSteeringInput();
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

    this.advanceAlongHeading(this.speed * deltaTimeSeconds);

    this.updatePolygon();
    this.assessDamage(roadBorders);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    options: CarRenderOptions = {}
  ): void {
    const renderSensors = options.renderSensors ?? true;
    const renderDebug = options.renderDebug ?? true;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);

    ctx.fillStyle = this.damaged
      ? this.appearance.damagedBodyColor
      : this.appearance.bodyColor;
    ctx.strokeStyle = this.damaged
      ? this.appearance.damagedOutlineColor
      : this.appearance.outlineColor;
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

    ctx.fillStyle = THEME.car.emphasis.windshieldColor;
    ctx.beginPath();
    ctx.roundRect(
      -this.width * 0.24,
      -this.height * 0.36,
      this.width * 0.48,
      this.height * 0.16,
      5
    );
    ctx.fill();

    ctx.fillStyle = this.damaged
      ? this.appearance.damagedCabinColor
      : this.appearance.cabinColor;
    ctx.fillRect(
      -this.width * 0.28,
      -this.height * 0.18,
      this.width * 0.56,
      this.height * 0.38
    );

    ctx.fillStyle = this.appearance.frontMarkerColor;
    ctx.beginPath();
    ctx.moveTo(0, -this.height * 0.42);
    ctx.lineTo(this.width * 0.14, -this.height * 0.28);
    ctx.lineTo(-this.width * 0.14, -this.height * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.appearance.frontLightColor;
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

    ctx.fillStyle = this.appearance.rearBumperColor;
    ctx.fillRect(
      -this.width * 0.28,
      this.height * 0.28,
      this.width * 0.56,
      this.height * 0.08
    );

    ctx.fillStyle = this.appearance.rearLightColor;
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

    ctx.strokeStyle = THEME.car.emphasis.roofLineColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.height * 0.34);
    ctx.lineTo(0, -this.height * 0.18);
    ctx.stroke();

    if (this.damaged) {
      ctx.strokeStyle = THEME.car.emphasis.damageStripeColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-this.width * 0.22, -this.height * 0.14);
      ctx.lineTo(this.width * 0.22, this.height * 0.14);
      ctx.moveTo(this.width * 0.22, -this.height * 0.14);
      ctx.lineTo(-this.width * 0.22, this.height * 0.14);
      ctx.stroke();
    }

    if (renderDebug && ENABLE_DEBUG_VECTORS) {
      this.renderDebugVectors(ctx);
    }

    ctx.restore();

    if (renderSensors && this.sensor !== null) {
      this.sensor.render(ctx);
    }

    if (renderDebug && ENABLE_COLLISION_DEBUG) {
      this.renderCollisionDebug(ctx);
    }
  }

  public updateSensors(
    roadBorders: readonly Segment[],
    trafficPolygons: readonly (readonly Point[])[]
  ): void {
    if (this.sensor === null) {
      return;
    }

    const sensorOrigin = this.getSensorOrigin();
    this.sensor.update(
      sensorOrigin.x,
      sensorOrigin.y,
      this.angle,
      roadBorders,
      trafficPolygons
    );
    this.syncBrainToSensors();
  }

  public getSensorReadings(): readonly number[] {
    return this.sensor?.normalizedReadings ?? [];
  }

  public getBrainSnapshot(): BrainSnapshot | null {
    if (this.brain === null || this.sensor === null) {
      return null;
    }

    return this.brain.getSnapshot(this.sensor.normalizedReadings);
  }

  public getBrainOutputDebugLabel(): string {
    if (this.brain === null) {
      return 'NONE';
    }

    return this.brain.lastOutputs
      .map((value, index) => `${BRAIN_OUTPUT_LABELS[index][0].toUpperCase()}:${value}`)
      .join(' ');
  }

  public getControlMode(): CarControlMode {
    return this.controlMode;
  }

  public getControlState(): Readonly<ReturnType<Controls['getState']>> {
    return this.controls.getState();
  }

  public setControlMode(controlMode: CarControlMode): void {
    if (this.controlMode === controlMode || controlMode === 'traffic') {
      return;
    }

    if (this.controlMode === 'player') {
      this.controls.detach();
    }

    this.controlMode = controlMode;
    this.controls.clear();

    if (controlMode === 'player') {
      this.controls.attach();
    } else {
      this.syncBrainToSensors();
    }

    this.refreshAppearance();
  }

  public getSensorHitCount(): number {
    return this.sensor?.getHitCount() ?? 0;
  }

  public getDistanceToNearestRoadBorder(
    roadBorders: readonly Segment[]
  ): number {
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let pointIndex = 0; pointIndex < this.polygon.length; pointIndex += 1) {
      const point = this.polygon[pointIndex];

      for (let borderIndex = 0; borderIndex < roadBorders.length; borderIndex += 1) {
        const border = roadBorders[borderIndex];
        const distance = getDistancePointToSegment(point, border);

        if (distance < nearestDistance) {
          nearestDistance = distance;
        }
      }
    }

    return nearestDistance;
  }

  public getForwardSpeedRatio(): number {
    return clamp(this.speed / this.physics.maxForwardSpeed, 0, 1);
  }

  public getCollisionWith(otherPolygon: readonly Point[]): Intersection | null {
    return getPolygonIntersection(this.polygon, otherPolygon);
  }

  public damage(collisionPoint: Point): void {
    this.setDamaged(collisionPoint);
  }

  public retire(): void {
    this.damaged = true;
    this.speed = 0;
    this.steeringAngle = 0;
    this.smoothedAiSteerIntent = 0;
    this.collisionPoint = null;
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

  private updateTraffic(
    deltaTimeSeconds: number,
    roadBorders: readonly Segment[]
  ): void {
    this.speed = this.trafficSpeed;
    this.steeringAngle = 0;
    this.smoothedAiSteerIntent = 0;
    this.advanceAlongHeading(this.speed * deltaTimeSeconds);
    this.updatePolygon();
    this.assessDamage(roadBorders);
  }

  private advanceAlongHeading(distance: number): void {
    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);

    this.x -= sin * distance;
    this.y -= cos * distance;
  }

  private setDamaged(collision: Point): void {
    this.damaged = true;
    this.speed = 0;
    this.steeringAngle = 0;
    this.collisionPoint = { x: collision.x, y: collision.y };
  }

  private getSensorOrigin(): Point {
    const forwardOffset = this.height * SENSOR_FORWARD_OFFSET_RATIO;

    return {
      x: this.x - Math.sin(this.angle) * forwardOffset,
      y: this.y - Math.cos(this.angle) * forwardOffset,
    };
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
      : this.appearance.debugPolygonColor;
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

  private syncBrainToSensors(): void {
    if (this.controlMode !== 'ai' || this.brain === null || this.sensor === null) {
      return;
    }

    this.controls.applyState(this.brain.decide(this.sensor.normalizedReadings));
  }

  private getSteeringInput(): number {
    if (this.controlMode !== 'ai') {
      return Number(this.controls.right) - Number(this.controls.left);
    }

    const targetSteerIntent = clamp(this.controls.steerIntent, -1, 1);

    // AI steering is intentionally softened so lane-change attempts can emerge
    // through small corrections instead of immediate full-lock turns.
    this.smoothedAiSteerIntent = lerp(
      this.smoothedAiSteerIntent,
      targetSteerIntent,
      this.aiControl.steeringSmoothing
    );

    return this.smoothedAiSteerIntent * this.aiControl.steeringStrength;
  }

  private refreshAppearance(): void {
    this.appearance = this.getAppearanceForMode(this.controlMode);
  }

  private getAppearanceForMode(controlMode: CarControlMode): CarAppearance {
    if (controlMode === 'traffic') {
      return {
        ...THEME.car.traffic,
        ...this.appearanceOverrides,
      };
    }

    if (controlMode !== 'ai') {
      return {
        ...DEFAULT_CAR_APPEARANCE,
        ...this.appearanceOverrides,
      };
    }

    return {
      ...THEME.car.ai,
      ...this.appearanceOverrides,
    };
  }
}

function getDistancePointToSegment(point: Point, segment: Segment): number {
  const deltaX = segment.end.x - segment.start.x;
  const deltaY = segment.end.y - segment.start.y;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (segmentLengthSquared <= Number.EPSILON) {
    return Math.hypot(point.x - segment.start.x, point.y - segment.start.y);
  }

  const projection =
    ((point.x - segment.start.x) * deltaX +
      (point.y - segment.start.y) * deltaY) /
    segmentLengthSquared;
  const offset = clamp(projection, 0, 1);
  const nearestX = segment.start.x + deltaX * offset;
  const nearestY = segment.start.y + deltaY * offset;

  return Math.hypot(point.x - nearestX, point.y - nearestY);
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
