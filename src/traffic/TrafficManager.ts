import { Car, type CarAppearance } from '../car/Car';
import { DEFAULT_CAR_PHYSICS } from '../car/Physics';
import type { Segment } from '../collision/geometry';
import { Road } from '../world/Road';

const TRAFFIC_SPAWN_OFFSET = 280;
const TRAFFIC_SPAWN_DISTANCE = 1_400;
const TRAFFIC_DESPAWN_DISTANCE = 420;
const TRAFFIC_ROW_SPACING = 260;
const TRAFFIC_SPEED = 132;
const TRAFFIC_CAR_WIDTH = 40;
const TRAFFIC_CAR_HEIGHT = 72;
const TRAFFIC_COLLISION_MARGIN = 18;
const ENABLE_TRAFFIC_DEBUG = true;

const TRAFFIC_APPEARANCE: Partial<CarAppearance> = {
  bodyColor: '#d19f57',
  cabinColor: '#2a1d12',
  outlineColor: '#ffe8c4',
  frontMarkerColor: '#fff2d0',
  frontLightColor: '#fff1ba',
  rearLightColor: '#ff826c',
  rearBumperColor: '#6d3a2d',
  debugPolygonColor: 'rgba(233, 187, 108, 0.8)',
};

const TRAFFIC_PATTERN: readonly number[][] = [
  [1],
  [0, 2],
  [2],
  [0],
  [1, 2],
  [0, 1],
  [2],
  [0, 2],
];

interface TrafficVehicle {
  readonly car: Car;
  readonly laneIndex: number;
}

export class TrafficManager {
  private readonly road: Road;
  private readonly vehicles: TrafficVehicle[] = [];
  private nextSpawnY = 0;
  private patternIndex = 0;

  public constructor(road: Road) {
    this.road = road;
  }

  public reset(playerX: number, playerY: number): void {
    this.clear();
    this.nextSpawnY = playerY - TRAFFIC_SPAWN_OFFSET;
    this.patternIndex = 0;
    this.ensureTrafficAhead(playerX, playerY);
  }

  public destroy(): void {
    this.clear();
  }

  public update(
    deltaTimeSeconds: number,
    playerCar: Car,
    roadBorders: readonly Segment[]
  ): void {
    this.ensureTrafficAhead(playerCar.x, playerCar.y);

    for (const vehicle of this.vehicles) {
      vehicle.car.update(deltaTimeSeconds, roadBorders);
    }

    this.removePassedTraffic(playerCar.y);
    this.assessPlayerCollisions(playerCar);
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

  public getLaneDebugLabel(): string {
    if (this.vehicles.length === 0) {
      return 'NONE';
    }

    return this.vehicles
      .slice(0, 6)
      .map((vehicle) => `${vehicle.laneIndex + 1}`)
      .join(' ');
  }

  private ensureTrafficAhead(playerX: number, playerY: number): void {
    const spawnLimitY = playerY - TRAFFIC_SPAWN_DISTANCE;

    while (this.nextSpawnY >= spawnLimitY) {
      this.spawnPatternRow(playerX, playerY);
      this.nextSpawnY -= TRAFFIC_ROW_SPACING;
      this.patternIndex =
        (this.patternIndex + 1) % TRAFFIC_PATTERN.length;
    }
  }

  private spawnPatternRow(playerX: number, playerY: number): void {
    const lanePattern = TRAFFIC_PATTERN[this.patternIndex];

    for (const laneIndex of lanePattern) {
      const spawnX = this.road.getLaneCenter(laneIndex);

      if (!this.canSpawnAt(spawnX, this.nextSpawnY, playerX, playerY)) {
        continue;
      }

      this.vehicles.push({
        car: new Car(
          spawnX,
          this.nextSpawnY,
          TRAFFIC_CAR_WIDTH,
          TRAFFIC_CAR_HEIGHT,
          DEFAULT_CAR_PHYSICS,
          {
            controlMode: 'traffic',
            trafficSpeed: TRAFFIC_SPEED,
            appearance: TRAFFIC_APPEARANCE,
          }
        ),
        laneIndex,
      });
    }
  }

  private canSpawnAt(
    spawnX: number,
    spawnY: number,
    playerX: number,
    playerY: number
  ): boolean {
    if (
      Math.abs(playerX - spawnX) < TRAFFIC_CAR_WIDTH &&
      Math.abs(playerY - spawnY) < TRAFFIC_CAR_HEIGHT + TRAFFIC_COLLISION_MARGIN
    ) {
      return false;
    }

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
      writeIndex += 1;
    }

    this.vehicles.length = writeIndex;
  }

  private assessPlayerCollisions(playerCar: Car): void {
    if (playerCar.damaged) {
      return;
    }

    for (const vehicle of this.vehicles) {
      const collision = playerCar.getCollisionWith(vehicle.car.polygon);

      if (collision === null) {
        continue;
      }

      playerCar.damage(collision);
      return;
    }
  }

  private clear(): void {
    for (const vehicle of this.vehicles) {
      vehicle.car.destroy();
    }

    this.vehicles.length = 0;
  }
}
