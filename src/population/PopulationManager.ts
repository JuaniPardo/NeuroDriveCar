import { Car } from '../car/Car';
import { DEFAULT_CAR_PHYSICS } from '../car/Physics';
import type { Point, Segment } from '../collision/geometry';

const DEFAULT_POPULATION_SIZE = 25;
const POPULATION_CAR_WIDTH = 42;
const POPULATION_CAR_HEIGHT = 74;
const NON_BEST_CAR_OPACITY = 0.52;
const DAMAGED_CAR_OPACITY = 0.24;
const BEST_CAR_RING_COLOR = 'rgba(143, 225, 255, 0.95)';
const BEST_CAR_LABEL_COLOR = 'rgba(223, 245, 255, 0.92)';
const BEST_CAR_RING_RADIUS_PADDING = 16;
const BEST_CAR_LABEL_OFFSET = 54;
const NON_BEST_RING_COLOR = 'rgba(109, 200, 255, 0.38)';
const AGENT_MARKER_COLOR = 'rgba(143, 225, 255, 0.82)';
const AGENT_MARKER_RADIUS = 3.5;

export interface PopulationManagerOptions {
  spawnX: number;
  spawnY: number;
  populationSize?: number;
  generation?: number;
}

export interface PopulationStats {
  populationSize: number;
  aliveCount: number;
  crashedCount: number;
  bestCarIndex: number;
  bestProgress: number;
  generation: number;
}

export class PopulationManager {
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly populationSize: number;
  private readonly cars: Car[] = [];
  private readonly progressByCar: number[] = [];
  private readonly stats: PopulationStats;

  public constructor(options: PopulationManagerOptions) {
    this.spawnX = options.spawnX;
    this.spawnY = options.spawnY;
    this.populationSize = Math.max(1, options.populationSize ?? DEFAULT_POPULATION_SIZE);
    this.stats = {
      populationSize: this.populationSize,
      aliveCount: this.populationSize,
      crashedCount: 0,
      bestCarIndex: 0,
      bestProgress: 0,
      generation: options.generation ?? 1,
    };

    this.reset();
  }

  public destroy(): void {
    this.clear();
  }

  public reset(): void {
    this.clear();

    for (let index = 0; index < this.populationSize; index += 1) {
      this.cars.push(
        new Car(
          this.spawnX,
          this.spawnY,
          POPULATION_CAR_WIDTH,
          POPULATION_CAR_HEIGHT,
          DEFAULT_CAR_PHYSICS,
          {
            controlMode: 'ai',
          }
        )
      );
      this.progressByCar.push(0);
    }

    this.refreshStats();
  }

  public update(deltaTimeSeconds: number, roadBorders: readonly Segment[]): void {
    for (let index = 0; index < this.cars.length; index += 1) {
      const car = this.cars[index];

      car.update(deltaTimeSeconds, roadBorders);

      const worldProgress = this.spawnY - car.y;

      if (worldProgress > this.progressByCar[index]) {
        this.progressByCar[index] = worldProgress;
      }
    }
  }

  public updateSensors(
    roadBorders: readonly Segment[],
    trafficPolygons: readonly (readonly Point[])[]
  ): void {
    for (let index = 0; index < this.cars.length; index += 1) {
      this.cars[index].updateSensors(roadBorders, trafficPolygons);
    }
  }

  public refreshStats(): void {
    let aliveCount = 0;
    let bestAliveIndex = -1;
    let bestAliveProgress = -Infinity;
    let bestAliveY = Number.POSITIVE_INFINITY;
    let bestOverallIndex = 0;
    let bestOverallProgress = -Infinity;
    let bestOverallY = Number.POSITIVE_INFINITY;

    for (let index = 0; index < this.cars.length; index += 1) {
      const car = this.cars[index];
      const progress = this.progressByCar[index];

      if (
        progress > bestOverallProgress ||
        (progress === bestOverallProgress && car.y < bestOverallY)
      ) {
        bestOverallIndex = index;
        bestOverallProgress = progress;
        bestOverallY = car.y;
      }

      if (car.damaged) {
        continue;
      }

      aliveCount += 1;

      if (
        progress > bestAliveProgress ||
        (progress === bestAliveProgress && car.y < bestAliveY)
      ) {
        bestAliveIndex = index;
        bestAliveProgress = progress;
        bestAliveY = car.y;
      }
    }

    const selectedBestIndex = bestAliveIndex === -1 ? bestOverallIndex : bestAliveIndex;
    const selectedBestProgress =
      bestAliveIndex === -1 ? Math.max(0, bestOverallProgress) : Math.max(0, bestAliveProgress);

    this.stats.populationSize = this.cars.length;
    this.stats.aliveCount = aliveCount;
    this.stats.crashedCount = this.cars.length - aliveCount;
    this.stats.bestCarIndex = selectedBestIndex;
    this.stats.bestProgress = selectedBestProgress;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const bestCar = this.getBestCar();

    for (let index = 0; index < this.cars.length; index += 1) {
      if (index === this.stats.bestCarIndex) {
        continue;
      }

      const car = this.cars[index];

      ctx.save();
      ctx.globalAlpha = car.damaged ? DAMAGED_CAR_OPACITY : NON_BEST_CAR_OPACITY;
      car.render(ctx, {
        renderSensors: false,
        renderDebug: false,
      });

      if (!car.damaged) {
        this.renderGhostHighlight(ctx, car);
        this.renderAgentMarker(ctx, car, index);
      }

      ctx.restore();
    }

    bestCar.render(ctx, {
      renderSensors: true,
      renderDebug: true,
    });
    this.renderBestCarHighlight(ctx, bestCar, this.stats.bestCarIndex);
  }

  public getCars(): readonly Car[] {
    return this.cars;
  }

  public getBestCar(): Car {
    return this.cars[this.stats.bestCarIndex];
  }

  public getStats(): Readonly<PopulationStats> {
    return this.stats;
  }

  private renderBestCarHighlight(
    ctx: CanvasRenderingContext2D,
    car: Car,
    index: number
  ): void {
    const radius = Math.max(car.width, car.height) * 0.5 + BEST_CAR_RING_RADIUS_PADDING;

    ctx.save();
    ctx.strokeStyle = BEST_CAR_RING_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(car.x, car.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = BEST_CAR_LABEL_COLOR;
    ctx.font = '11px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`BEST ${index + 1}`, car.x, car.y - BEST_CAR_LABEL_OFFSET);
    ctx.restore();
  }

  private renderGhostHighlight(ctx: CanvasRenderingContext2D, car: Car): void {
    const radius = Math.max(car.width, car.height) * 0.5 + 10;

    ctx.strokeStyle = NON_BEST_RING_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(car.x, car.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderAgentMarker(
    ctx: CanvasRenderingContext2D,
    car: Car,
    index: number
  ): void {
    const angle = index * 0.85;
    const radius = 30 + (index % 3) * 7;
    const markerX = car.x + Math.cos(angle) * radius;
    const markerY = car.y + Math.sin(angle) * radius;

    ctx.fillStyle = AGENT_MARKER_COLOR;
    ctx.beginPath();
    ctx.arc(markerX, markerY, AGENT_MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  private clear(): void {
    for (let index = 0; index < this.cars.length; index += 1) {
      this.cars[index].destroy();
    }

    this.cars.length = 0;
    this.progressByCar.length = 0;
  }
}
