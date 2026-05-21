import { Car, type CarAppearance } from '../car/Car';
import { DEFAULT_CAR_PHYSICS } from '../car/Physics';
import type { Point, Segment } from '../collision/geometry';
import { THEME } from '../utils/visualTheme';
import { Road } from '../world/Road';
import {
  DEFAULT_TRAFFIC_SETTINGS,
  resolveTrafficSettings,
  type ResolvedTrafficSettings,
  type TrafficSettings,
} from './trafficSettings';

const MIN_TRAFFIC_INITIAL_GAP = 120;
const TRAFFIC_SPAWN_MARGIN = 24;
const TRAFFIC_DESPAWN_DISTANCE = 420;
const TRAFFIC_CAR_WIDTH = 40;
const TRAFFIC_CAR_HEIGHT = 72;
const TRAFFIC_COLLISION_MARGIN = 18;
const ENABLE_TRAFFIC_DEBUG = true;

const TRAFFIC_APPEARANCE: Partial<CarAppearance> = {
  ...THEME.car.traffic,
};

interface TrafficVehicle {
  readonly car: Car;
  readonly laneIndex: number;
}

export class TrafficManager {
  private readonly road: Road;
  private readonly vehicles: TrafficVehicle[] = [];
  private readonly trafficCars: Car[] = [];
  private readonly trafficPolygons: Point[][] = [];
  private settings: ResolvedTrafficSettings = resolveTrafficSettings(
    DEFAULT_TRAFFIC_SETTINGS
  );
  private nextSpawnY = 0;
  private patternIndex = 0;

  public constructor(road: Road) {
    this.road = road;
  }

  public reset(playerCar: Car): void {
    this.clear();
    this.patternIndex = 0;

    if (!this.settings.enabled || this.settings.patterns.length === 0) {
      this.nextSpawnY = playerCar.y - this.settings.spawnDistance;
      return;
    }

    this.seedInitialTraffic(playerCar);
  }

  public destroy(): void {
    this.clear();
  }

  public update(
    deltaTimeSeconds: number,
    referenceCar: Car,
    roadBorders: readonly Segment[],
    subjectCars: readonly Car[] = [referenceCar]
  ): void {
    for (const vehicle of this.vehicles) {
      vehicle.car.update(deltaTimeSeconds, roadBorders);
    }

    this.ensureTrafficAhead(referenceCar.y);
    this.removePassedTraffic(referenceCar.y);
    this.assessSubjectCollisions(subjectCars);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const vehicle of this.vehicles) {
      vehicle.car.render(ctx);
    }
  }

  public renderDebug(
    ctx: CanvasRenderingContext2D,
    visibleTop: number,
    visibleBottom: number
  ): void {
    if (!ENABLE_TRAFFIC_DEBUG) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(209, 159, 87, 0.32)';
    ctx.fillStyle = 'rgba(209, 159, 87, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.road.left, this.nextSpawnY);
    ctx.lineTo(this.road.right, this.nextSpawnY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '11px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    if (this.nextSpawnY >= visibleTop && this.nextSpawnY <= visibleBottom) {
      ctx.fillText('traffic spawn line', this.road.left + 12, this.nextSpawnY - 6);
    }

    for (const vehicle of this.vehicles) {
      if (vehicle.car.y < visibleTop || vehicle.car.y > visibleBottom) {
        continue;
      }

      ctx.fillText(
        `L${vehicle.laneIndex + 1}`,
        vehicle.car.x - 14,
        vehicle.car.y - vehicle.car.height * 0.7
      );
    }

    ctx.restore();
  }

  public getActiveCount(): number {
    return this.vehicles.length;
  }

  public getTrafficPolygons(): readonly (readonly Point[])[] {
    return this.trafficPolygons;
  }

  public getTrafficCars(): readonly Car[] {
    return this.trafficCars;
  }

  public setSettings(settings: TrafficSettings): void {
    this.settings = resolveTrafficSettings(settings);
  }

  public getSettings(): Readonly<ResolvedTrafficSettings> {
    return this.settings;
  }

  public getLaneDebugLabel(): string {
    if (this.vehicles.length === 0) {
      return 'NONE';
    }

    return this.vehicles
      .slice(0, 6)
      .map((vehicle) => `${vehicle.laneIndex + 1}`)
      .join(' ');
  }

  public getTargetSpeed(): number {
    return this.getLaneSpeed(1);
  }

  public getLaneSpeedDebugLabel(): string {
    return this.settings.laneSpeedMultipliers
      .map((multiplier) =>
        (DEFAULT_CAR_PHYSICS.maxForwardSpeed * multiplier).toFixed(0)
      )
      .join(' ');
  }

  private ensureTrafficAhead(playerY: number): void {
    const spawnLimitY = playerY - this.settings.spawnDistance;

    if (!this.settings.enabled || this.settings.patterns.length === 0) {
      return;
    }

    while (this.nextSpawnY >= spawnLimitY) {
      this.spawnPatternRowAt(this.nextSpawnY);
      this.advancePattern();
      this.nextSpawnY -= this.settings.rowSpacing;
    }
  }

  private spawnPatternRowAt(spawnY: number): void {
    const lanePattern = this.settings.patterns[this.patternIndex];

    if (lanePattern === undefined) {
      return;
    }

    for (const laneIndex of lanePattern) {
      const spawnX = this.road.getLaneCenter(laneIndex);

      if (!this.canSpawnAt(spawnX, spawnY)) {
        continue;
      }

      const car = new Car(
        spawnX,
        spawnY,
        TRAFFIC_CAR_WIDTH,
        TRAFFIC_CAR_HEIGHT,
        DEFAULT_CAR_PHYSICS,
        {
          controlMode: 'traffic',
          trafficSpeed: this.getLaneSpeed(laneIndex),
          appearance: TRAFFIC_APPEARANCE,
        }
      );

      this.vehicles.push({
        car,
        laneIndex,
      });
      this.trafficCars.push(car);
      this.trafficPolygons.push(car.polygon);
    }
  }

  private seedInitialTraffic(playerCar: Car): void {
    const initialGap = this.getInitialSpawnGap(playerCar);
    const aheadDistance = this.settings.spawnDistance;
    const behindDistance =
      this.settings.spawnDistance * (1 - this.settings.initialAheadRatio);
    const firstAheadRowY = playerCar.y - initialGap;
    const lastAheadRowY = playerCar.y - aheadDistance;
    const firstBehindRowY = playerCar.y + initialGap + this.settings.rowSpacing;
    const lastBehindRowY = playerCar.y + behindDistance;

    for (
      let spawnY = firstAheadRowY;
      spawnY >= lastAheadRowY;
      spawnY -= this.settings.rowSpacing
    ) {
      this.spawnPatternRowAt(spawnY);
      this.advancePattern();
    }

    for (
      let spawnY = firstBehindRowY;
      spawnY <= lastBehindRowY;
      spawnY += this.settings.rowSpacing
    ) {
      this.spawnPatternRowAt(spawnY);
      this.advancePattern();
    }

    this.nextSpawnY = lastAheadRowY - this.settings.rowSpacing;
  }

  private advancePattern(): void {
    if (this.settings.patterns.length === 0) {
      this.patternIndex = 0;
      return;
    }

    this.patternIndex = (this.patternIndex + 1) % this.settings.patterns.length;
  }

  private canSpawnAt(spawnX: number, spawnY: number): boolean {
    for (const vehicle of this.vehicles) {
      if (vehicle.car.x !== spawnX) {
        continue;
      }

      if (
        Math.abs(vehicle.car.y - spawnY) <
        TRAFFIC_CAR_HEIGHT + TRAFFIC_COLLISION_MARGIN
      ) {
        return false;
      }
    }

    return true;
  }

  private removePassedTraffic(playerY: number): void {
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < this.vehicles.length; readIndex += 1) {
      const vehicle = this.vehicles[readIndex];

      if (vehicle.car.y > playerY + TRAFFIC_DESPAWN_DISTANCE) {
        vehicle.car.destroy();
        continue;
      }

      this.vehicles[writeIndex] = vehicle;
      this.trafficPolygons[writeIndex] = vehicle.car.polygon;
      writeIndex += 1;
    }

    this.vehicles.length = writeIndex;
    this.trafficPolygons.length = writeIndex;
  }

  private assessSubjectCollisions(subjectCars: readonly Car[]): void {
    for (const subjectCar of subjectCars) {
      if (subjectCar.damaged) {
        continue;
      }

      for (const vehicle of this.vehicles) {
        const collision = subjectCar.getCollisionWith(vehicle.car.polygon);

        if (collision === null) {
          continue;
        }

        subjectCar.damage(collision);
        break;
      }
    }
  }

  private clear(): void {
    for (const vehicle of this.vehicles) {
      vehicle.car.destroy();
    }

    this.vehicles.length = 0;
    this.trafficCars.length = 0;
    this.trafficPolygons.length = 0;
  }

  private getInitialSpawnGap(playerCar: Car): number {
    const minimumClearGap =
      (playerCar.height + TRAFFIC_CAR_HEIGHT) * 0.5 + TRAFFIC_SPAWN_MARGIN;

    return Math.max(MIN_TRAFFIC_INITIAL_GAP, minimumClearGap);
  }

  private getLaneSpeed(laneIndex: number): number {
    const multiplier =
      this.settings.laneSpeedMultipliers[laneIndex] ??
      this.settings.laneSpeedMultipliers[1];

    return DEFAULT_CAR_PHYSICS.maxForwardSpeed * multiplier;
  }
}
