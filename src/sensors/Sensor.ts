import {
  getNearestPolygonSegmentIntersection,
  getNearestSegmentIntersection,
  type Intersection,
  type Point,
  type Segment,
} from '../collision/geometry';
import { lerp } from '../utils/math';
import { createRay, type Ray, updateRay } from './Ray';

const SENSOR_RAY_COLOR = 'rgba(135, 255, 224, 0.92)';
const SENSOR_BLOCKED_RAY_COLOR = 'rgba(255, 122, 122, 0.9)';
const SENSOR_HIT_COLOR = '#ffe08f';
const SENSOR_LABEL_COLOR = 'rgba(223, 242, 233, 0.88)';
const SENSOR_READING_DECIMALS = 2;
const SENSOR_ANGLE_LABEL_OFFSET = 16;
const SENSOR_VALUE_LABEL_OFFSET = 12;
const SENSOR_HIT_POINT_RADIUS = 3;

export interface SensorConfig {
  forwardRayCount: number;
  forwardRayLength: number;
  forwardRaySpread: number;
  enableSideRays: boolean;
  sideRayLength: number;
  enableRearRay: boolean;
  rearRayLength: number;
}

export interface SensorReading extends Intersection {
  value: number;
}

export const DEFAULT_SENSOR_CONFIG: SensorConfig = {
  forwardRayCount: 5,
  forwardRayLength: 240,
  forwardRaySpread: Math.PI * 0.6,
  enableSideRays: true,
  sideRayLength: 160,
  enableRearRay: true,
  rearRayLength: 120,
};

interface SensorRayDefinition {
  angleOffset: number;
  length: number;
}

export class Sensor {
  public readonly rays: Ray[];
  public readonly readings: Array<SensorReading | null>;
  public readonly normalizedReadings: number[];
  private readonly config: SensorConfig;

  public constructor(config: Partial<SensorConfig> = {}) {
    this.config = {
      ...DEFAULT_SENSOR_CONFIG,
      ...config,
    };
    this.rays = [];
    this.readings = [];
    this.normalizedReadings = [];

    const rayDefinitions = this.getRayDefinitions();

    for (let index = 0; index < rayDefinitions.length; index += 1) {
      this.rays.push(createRay());
      this.readings.push(null);
      this.normalizedReadings.push(0);
    }
  }

  public update(
    originX: number,
    originY: number,
    headingAngle: number,
    roadBorders: readonly Segment[],
    trafficPolygons: readonly (readonly Point[])[]
  ): void {
    this.castRays(originX, originY, headingAngle);

    for (let index = 0; index < this.rays.length; index += 1) {
      const ray = this.rays[index];
      const reading = this.getClosestReading(ray, roadBorders, trafficPolygons);

      this.readings[index] = reading;
      this.normalizedReadings[index] = reading === null ? 0 : reading.value;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let index = 0; index < this.rays.length; index += 1) {
      const ray = this.rays[index];
      const reading = this.readings[index];
      const visibleEnd = reading === null ? ray.end : reading;

      ctx.strokeStyle = SENSOR_RAY_COLOR;
      ctx.beginPath();
      ctx.moveTo(ray.start.x, ray.start.y);
      ctx.lineTo(visibleEnd.x, visibleEnd.y);
      ctx.stroke();

      if (reading !== null) {
        ctx.strokeStyle = SENSOR_BLOCKED_RAY_COLOR;
        ctx.beginPath();
        ctx.moveTo(reading.x, reading.y);
        ctx.lineTo(ray.end.x, ray.end.y);
        ctx.stroke();

        ctx.fillStyle = SENSOR_HIT_COLOR;
        ctx.beginPath();
        ctx.arc(
          reading.x,
          reading.y,
          SENSOR_HIT_POINT_RADIUS,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      this.renderRayLabels(ctx, ray, visibleEnd, index);
    }

    ctx.restore();
  }

  public getHitCount(): number {
    let hitCount = 0;

    for (const reading of this.readings) {
      if (reading !== null) {
        hitCount += 1;
      }
    }

    return hitCount;
  }

  private castRays(
    originX: number,
    originY: number,
    headingAngle: number
  ): void {
    const rayDefinitions = this.getRayDefinitions();

    for (let index = 0; index < this.rays.length; index += 1) {
      const rayDefinition = rayDefinitions[index];
      const rayAngle = headingAngle + rayDefinition.angleOffset;

      updateRay(
        this.rays[index],
        originX,
        originY,
        rayAngle,
        rayDefinition.length
      );
    }
  }

  private getRayDefinitions(): SensorRayDefinition[] {
    const rayDefinitions: SensorRayDefinition[] = [];

    if (this.config.enableSideRays) {
      rayDefinitions.push({
        angleOffset: Math.PI * 0.5,
        length: this.config.sideRayLength,
      });
    }

    const forwardRayCount = Math.max(1, this.config.forwardRayCount);

    for (let index = 0; index < forwardRayCount; index += 1) {
      const ratio = forwardRayCount === 1 ? 0.5 : index / (forwardRayCount - 1);

      rayDefinitions.push({
        angleOffset: lerp(
          this.config.forwardRaySpread * 0.5,
          -this.config.forwardRaySpread * 0.5,
          ratio
        ),
        length: this.config.forwardRayLength,
      });
    }

    if (this.config.enableSideRays) {
      rayDefinitions.push({
        angleOffset: -Math.PI * 0.5,
        length: this.config.sideRayLength,
      });
    }

    if (this.config.enableRearRay) {
      rayDefinitions.push({
        angleOffset: Math.PI,
        length: this.config.rearRayLength,
      });
    }

    return rayDefinitions;
  }

  private getClosestReading(
    ray: Ray,
    roadBorders: readonly Segment[],
    trafficPolygons: readonly (readonly Point[])[]
  ): SensorReading | null {
    let closestIntersection = getNearestSegmentIntersection(ray, roadBorders);

    for (const polygon of trafficPolygons) {
      const intersection = getNearestPolygonSegmentIntersection(polygon, ray);

      if (intersection === null) {
        continue;
      }

      if (
        closestIntersection === null ||
        intersection.offset < closestIntersection.offset
      ) {
        closestIntersection = intersection;
      }
    }

    if (closestIntersection === null) {
      return null;
    }

    return {
      ...closestIntersection,
      value: 1 - closestIntersection.offset,
    };
  }

  private renderRayLabels(
    ctx: CanvasRenderingContext2D,
    ray: Ray,
    visibleEnd: Point,
    index: number
  ): void {
    const readingValue = this.normalizedReadings[index];
    const directionX = -Math.sin(ray.angle);
    const directionY = -Math.cos(ray.angle);
    const angleLabelX = ray.end.x + directionX * SENSOR_ANGLE_LABEL_OFFSET;
    const angleLabelY = ray.end.y + directionY * SENSOR_ANGLE_LABEL_OFFSET;
    const valueLabelX =
      visibleEnd.x + directionX * SENSOR_VALUE_LABEL_OFFSET;
    const valueLabelY =
      visibleEnd.y + directionY * SENSOR_VALUE_LABEL_OFFSET;

    ctx.fillStyle = SENSOR_LABEL_COLOR;
    ctx.fillText(
      `${Math.round(((ray.angle * 180) / Math.PI) % 360)}deg`,
      angleLabelX,
      angleLabelY
    );
    ctx.fillText(
      readingValue.toFixed(SENSOR_READING_DECIMALS),
      valueLabelX,
      valueLabelY
    );
  }
}
