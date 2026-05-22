import {
  type EnvironmentSegment,
  getSegmentIntersection,
  getNearestPolygonSegmentIntersection,
  type Intersection,
  type Point,
  type SensorHitType,
} from '../collision/geometry';
import { FONT_MONO, THEME } from '../utils/visualTheme';
import { createRay, type Ray, updateRay } from './Ray';

const SENSOR_READING_DECIMALS = 2;
const SENSOR_ANGLE_LABEL_OFFSET = 16;
const SENSOR_VALUE_LABEL_OFFSET = 12;
const SENSOR_HIT_POINT_RADIUS = 3;

export interface SensorConfig {
  rayCount: number;
  rayLength: number;
  rayAnglesDeg: readonly number[];
}

export interface SensorReading extends Intersection {
  value: number;
  hitType: SensorHitType;
}

export interface SensorHitSummary {
  border: number;
  lane: number;
  traffic: number;
  none: number;
}

export const DEFAULT_SENSOR_CONFIG: SensorConfig = {
  rayCount: 5,
  rayLength: 180,
  // Keep perception focused on the forward corridor to reduce noisy side stimuli.
  rayAnglesDeg: [-37.5, -18.75, 0, 18.75, 37.5],
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
      rayAnglesDeg: [...(config.rayAnglesDeg ?? DEFAULT_SENSOR_CONFIG.rayAnglesDeg)],
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
    environmentSegments: readonly EnvironmentSegment[],
    trafficPolygons: readonly (readonly Point[])[]
  ): void {
    this.castRays(originX, originY, headingAngle);

    for (let index = 0; index < this.rays.length; index += 1) {
      const ray = this.rays[index];
      const reading = this.getClosestReading(ray, environmentSegments, trafficPolygons);

      this.readings[index] = reading;
      this.normalizedReadings[index] = reading === null ? 0 : reading.value;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = `10px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const sensorOrigin = this.rays[0]?.start;

    if (sensorOrigin !== undefined) {
      ctx.fillStyle = THEME.sensor.originColor;
      ctx.beginPath();
      ctx.arc(sensorOrigin.x, sensorOrigin.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let index = 0; index < this.rays.length; index += 1) {
      const ray = this.rays[index];
      const reading = this.readings[index];
      const visibleEnd = reading === null ? ray.end : reading;

      ctx.strokeStyle = THEME.sensor.activeRayColor;
      ctx.beginPath();
      ctx.moveTo(ray.start.x, ray.start.y);
      ctx.lineTo(visibleEnd.x, visibleEnd.y);
      ctx.stroke();

      if (reading !== null) {
        ctx.strokeStyle = getBlockedRayColor(reading.hitType);
        ctx.beginPath();
        ctx.moveTo(reading.x, reading.y);
        ctx.lineTo(ray.end.x, ray.end.y);
        ctx.stroke();

        ctx.fillStyle = getHitPointColor(reading.hitType);
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

  public getHitSummary(): SensorHitSummary {
    const summary: SensorHitSummary = {
      border: 0,
      lane: 0,
      traffic: 0,
      none: 0,
    };

    for (const reading of this.readings) {
      if (reading === null) {
        summary.none += 1;
        continue;
      }

      summary[reading.hitType] += 1;
    }

    return summary;
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
    const targetRayCount = Math.max(1, this.config.rayCount);
    const configuredAngles = this.config.rayAnglesDeg.slice(0, targetRayCount);
    const fallbackAngles = DEFAULT_SENSOR_CONFIG.rayAnglesDeg;

    while (configuredAngles.length < targetRayCount) {
      const fallbackIndex = configuredAngles.length % fallbackAngles.length;
      configuredAngles.push(fallbackAngles[fallbackIndex]);
    }

    return configuredAngles.map((angleDeg) => ({
      angleOffset: degreesToRadians(angleDeg),
      length: this.config.rayLength,
    }));
  }

  private getClosestReading(
    ray: Ray,
    environmentSegments: readonly EnvironmentSegment[],
    trafficPolygons: readonly (readonly Point[])[]
  ): SensorReading | null {
    let closestIntersection = getNearestTypedSegmentIntersection(ray, environmentSegments);

    for (const polygon of trafficPolygons) {
      const intersection = getNearestPolygonSegmentIntersection(polygon, ray);

      if (intersection === null) {
        continue;
      }

      if (
        closestIntersection === null ||
        intersection.offset < closestIntersection.offset
      ) {
        closestIntersection = {
          ...intersection,
          hitType: 'traffic',
          value: 1 - intersection.offset,
        };
      }
    }

    if (closestIntersection === null) {
      return null;
    }

    return closestIntersection;
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

    ctx.fillStyle = THEME.sensor.labelColor;
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

function getNearestTypedSegmentIntersection(
  ray: Ray,
  environmentSegments: readonly EnvironmentSegment[]
): SensorReading | null {
  let closestReading: SensorReading | null = null;

  for (const candidate of environmentSegments) {
    const intersection = getSegmentIntersection(ray, candidate.segment);

    if (intersection === null) {
      continue;
    }

    if (closestReading === null || intersection.offset < closestReading.offset) {
      closestReading = {
        ...intersection,
        hitType: candidate.hitType,
        value: 1 - intersection.offset,
      };
    }
  }

  return closestReading;
}

function getBlockedRayColor(hitType: SensorHitType): string {
  if (hitType === 'traffic') {
    return THEME.sensor.trafficBlockedRayColor;
  }

  if (hitType === 'lane') {
    return THEME.sensor.laneBlockedRayColor;
  }

  return THEME.sensor.blockedRayColor;
}

function getHitPointColor(hitType: SensorHitType): string {
  if (hitType === 'traffic') {
    return THEME.sensor.trafficHitPointColor;
  }

  if (hitType === 'lane') {
    return THEME.sensor.laneHitPointColor;
  }

  return THEME.sensor.hitPointColor;
}

function degreesToRadians(angleDeg: number): number {
  return (angleDeg * Math.PI) / 180;
}
