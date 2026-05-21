import type { BrainGenome } from '../ai/Brain';
import { cloneBrainGenome, createMutatedGenome } from '../ai/mutation';
import { Car } from '../car/Car';
import { DEFAULT_CAR_PHYSICS } from '../car/Physics';
import type { Point, Segment } from '../collision/geometry';
import { THEME } from '../utils/visualTheme';

const DEFAULT_POPULATION_SIZE = 25;
const POPULATION_CAR_WIDTH = 42;
const POPULATION_CAR_HEIGHT = 74;
const NON_BEST_CAR_OPACITY = 0.26;
const DAMAGED_CAR_OPACITY = 0.12;
const BEST_CAR_RING_RADIUS_PADDING = 16;
const BEST_CAR_LABEL_OFFSET = 54;
const AGENT_MARKER_RADIUS = 3.5;
const DEFAULT_MUTATION_AMOUNT = 0.18;
const STALL_PROGRESS_EPSILON = 0.25;
const STALL_TIMEOUT_SECONDS = 2.5;
const LOW_SPEED_THRESHOLD = 36;
const SEEDED_MUTATION_MIN = 0.05;
const SEEDED_MUTATION_MAX = 0.2;
const FITNESS_SURVIVAL_BONUS = 18;
const FITNESS_EARLY_CRASH_WINDOW_SECONDS = 6;
const FITNESS_EARLY_CRASH_PENALTY = 120;
const FITNESS_LATERAL_OFFSET_PENALTY = 0.12;
const FITNESS_STEERING_PENALTY = 18;
const FITNESS_STAGNATION_PENALTY = 48;
const FITNESS_FORWARD_SPEED_BONUS = 44;
const FITNESS_EDGE_PROXIMITY_PENALTY = 76;
const FITNESS_FRONT_OBSTACLE_PENALTY = 58;
const FITNESS_SAFE_AVOIDANCE_REWARD = 90;
const EDGE_DANGER_DISTANCE = 52;
const FRONT_OBSTACLE_SIGNAL_THRESHOLD = 0.55;
const FRONT_OBSTACLE_CLEAR_REWARD_DELTA = 0.16;

export type PopulationSource = 'random' | 'saved';

export interface PopulationManagerOptions {
  spawnX: number;
  spawnY: number;
  populationSize?: number;
  generation?: number;
  mutationAmount?: number;
  seedGenome?: BrainGenome | null;
}

export interface PopulationResetOptions {
  populationSize?: number;
  mutationAmount?: number;
}

export interface PopulationStats {
  populationSize: number;
  aliveCount: number;
  crashedCount: number;
  bestCarIndex: number;
  bestProgress: number;
  generation: number;
  populationSource: PopulationSource;
  mutationAmount: number;
}

export class PopulationManager {
  private readonly spawnX: number;
  private readonly spawnY: number;
  private populationSize: number;
  private mutationAmount: number;
  private readonly cars: Car[] = [];
  private readonly progressByCar: number[] = [];
  private readonly stallTimeByCar: number[] = [];
  private readonly survivalTimeByCar: number[] = [];
  private readonly lateralOffsetByCar: number[] = [];
  private readonly steeringEffortByCar: number[] = [];
  private readonly lowSpeedTimeByCar: number[] = [];
  private readonly fitnessByCar: number[] = [];
  private readonly forwardSpeedByCar: number[] = [];
  private readonly edgeExposureByCar: number[] = [];
  private readonly frontObstaclePenaltyByCar: number[] = [];
  private readonly obstacleAvoidanceRewardByCar: number[] = [];
  private readonly previousFrontObstacleSignalByCar: number[] = [];
  private readonly stats: PopulationStats;
  private generation = 1;
  private seedGenome: BrainGenome | null = null;
  private populationSource: PopulationSource = 'random';

  public constructor(options: PopulationManagerOptions) {
    this.spawnX = options.spawnX;
    this.spawnY = options.spawnY;
    this.populationSize = Math.max(1, options.populationSize ?? DEFAULT_POPULATION_SIZE);
    this.generation = Math.max(1, options.generation ?? 1);
    this.mutationAmount = Math.max(0, options.mutationAmount ?? DEFAULT_MUTATION_AMOUNT);
    this.setSeedGenome(options.seedGenome ?? null);
    this.stats = {
      populationSize: this.populationSize,
      aliveCount: this.populationSize,
      crashedCount: 0,
      bestCarIndex: 0,
      bestProgress: 0,
      generation: this.generation,
      populationSource: this.populationSource,
      mutationAmount: this.mutationAmount,
    };

    this.reset();
  }

  public destroy(): void {
    this.clear();
  }

  public reset(options: PopulationResetOptions = {}): void {
    if (options.populationSize !== undefined) {
      this.populationSize = Math.max(1, options.populationSize);
    }

    if (options.mutationAmount !== undefined) {
      this.mutationAmount = Math.max(0, options.mutationAmount);
    }

    this.clear();
    let activeSeedGenome = this.seedGenome;
    this.populationSource = activeSeedGenome === null ? 'random' : 'saved';

    for (let index = 0; index < this.populationSize; index += 1) {
      const car = new Car(
        this.spawnX,
        this.spawnY,
        POPULATION_CAR_WIDTH,
        POPULATION_CAR_HEIGHT,
        DEFAULT_CAR_PHYSICS,
        {
          controlMode: 'ai',
        }
      );

      if (
        activeSeedGenome !== null &&
        car.brain !== null &&
        !car.brain.canImportGenome(activeSeedGenome)
      ) {
        activeSeedGenome = null;
        this.populationSource = 'random';
      }

      if (activeSeedGenome !== null && car.brain !== null) {
        const genome =
          index === 0
            ? cloneBrainGenome(activeSeedGenome)
            : createMutatedGenome(activeSeedGenome, this.getMutationAmount(index));

        car.brain.importGenome(genome);
      }

      this.cars.push(car);
      this.progressByCar.push(0);
      this.stallTimeByCar.push(0);
      this.survivalTimeByCar.push(0);
      this.lateralOffsetByCar.push(0);
      this.steeringEffortByCar.push(0);
      this.lowSpeedTimeByCar.push(0);
      this.fitnessByCar.push(0);
      this.forwardSpeedByCar.push(0);
      this.edgeExposureByCar.push(0);
      this.frontObstaclePenaltyByCar.push(0);
      this.obstacleAvoidanceRewardByCar.push(0);
      this.previousFrontObstacleSignalByCar.push(0);
    }

    this.stats.generation = this.generation;
    this.stats.populationSource = this.populationSource;
    this.stats.mutationAmount = this.mutationAmount;
    this.refreshStats();
    this.generation += 1;
  }

  public setSeedGenome(genome: BrainGenome | null): void {
    this.seedGenome = genome === null ? null : cloneBrainGenome(genome);
  }

  public update(deltaTimeSeconds: number, roadBorders: readonly Segment[]): void {
    for (let index = 0; index < this.cars.length; index += 1) {
      const car = this.cars[index];
      const previousBestProgress = this.progressByCar[index];

      car.update(deltaTimeSeconds, roadBorders);
      this.survivalTimeByCar[index] += deltaTimeSeconds;
      this.lateralOffsetByCar[index] +=
        Math.abs(car.x - this.spawnX) * deltaTimeSeconds;
      this.steeringEffortByCar[index] +=
        Math.abs(car.steeringAngle) * deltaTimeSeconds;

      if (Math.abs(car.speed) < LOW_SPEED_THRESHOLD) {
        this.lowSpeedTimeByCar[index] += deltaTimeSeconds;
      }

      const worldProgress = this.spawnY - car.y;
      const progressDelta = Math.max(0, worldProgress - previousBestProgress);

      if (progressDelta > 0) {
        this.progressByCar[index] = worldProgress;
      }

      if (car.damaged) {
        continue;
      }

      if (progressDelta > STALL_PROGRESS_EPSILON) {
        this.stallTimeByCar[index] = 0;
        continue;
      }

      if (progressDelta > 0 || Math.abs(car.speed) >= LOW_SPEED_THRESHOLD) {
        this.stallTimeByCar[index] = Math.max(
          0,
          this.stallTimeByCar[index] - deltaTimeSeconds * 0.5
        );
        continue;
      }

      this.stallTimeByCar[index] += deltaTimeSeconds;

      if (this.stallTimeByCar[index] >= STALL_TIMEOUT_SECONDS) {
        car.retire();
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

  public updateTrainingSignals(
    deltaTimeSeconds: number,
    roadBorders: readonly Segment[]
  ): void {
    for (let index = 0; index < this.cars.length; index += 1) {
      const car = this.cars[index];

      this.forwardSpeedByCar[index] +=
        car.getForwardSpeedRatio() * deltaTimeSeconds;

      const edgeDanger = this.getEdgeDangerSignal(car, roadBorders);
      this.edgeExposureByCar[index] += edgeDanger * deltaTimeSeconds;

      const frontObstacleSignal = getFrontObstacleSignal(car.getSensorReadings());

      if (frontObstacleSignal > FRONT_OBSTACLE_SIGNAL_THRESHOLD) {
        this.frontObstaclePenaltyByCar[index] +=
          frontObstacleSignal * deltaTimeSeconds;
      }

      if (
        !car.damaged &&
        this.previousFrontObstacleSignalByCar[index] >
          FRONT_OBSTACLE_SIGNAL_THRESHOLD &&
        frontObstacleSignal <
          this.previousFrontObstacleSignalByCar[index] -
            FRONT_OBSTACLE_CLEAR_REWARD_DELTA &&
        this.progressByCar[index] > 0 &&
        car.getForwardSpeedRatio() > 0.22
      ) {
        this.obstacleAvoidanceRewardByCar[index] +=
          this.previousFrontObstacleSignalByCar[index] - frontObstacleSignal;
      }

      this.previousFrontObstacleSignalByCar[index] = frontObstacleSignal;
    }
  }

  public refreshStats(): void {
    let aliveCount = 0;
    let bestAliveIndex = -1;
    let bestAliveFitness = -Infinity;
    let bestAliveProgress = -Infinity;
    let bestAliveY = Number.POSITIVE_INFINITY;
    let bestOverallIndex = 0;
    let bestOverallFitness = -Infinity;
    let bestOverallProgress = -Infinity;
    let bestOverallY = Number.POSITIVE_INFINITY;

    for (let index = 0; index < this.cars.length; index += 1) {
      const car = this.cars[index];
      const progress = this.progressByCar[index];
      const fitness = this.calculateFitnessScore(index, car);

      this.fitnessByCar[index] = fitness;

      if (
        this.isBetterCandidate(
          fitness,
          progress,
          car.y,
          bestOverallFitness,
          bestOverallProgress,
          bestOverallY
        )
      ) {
        bestOverallIndex = index;
        bestOverallFitness = fitness;
        bestOverallProgress = progress;
        bestOverallY = car.y;
      }

      if (car.damaged) {
        continue;
      }

      aliveCount += 1;

      if (
        this.isBetterCandidate(
          fitness,
          progress,
          car.y,
          bestAliveFitness,
          bestAliveProgress,
          bestAliveY
        )
      ) {
        bestAliveIndex = index;
        bestAliveFitness = fitness;
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
    this.stats.populationSource = this.populationSource;
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

  public getBestBrainGenome(): BrainGenome | null {
    return this.getBestCar().brain?.exportGenome() ?? null;
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
    ctx.fillStyle = THEME.car.emphasis.bestHaloFillColor;
    ctx.beginPath();
    ctx.arc(car.x, car.y, radius + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = THEME.car.emphasis.bestHaloColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(car.x, car.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = THEME.car.emphasis.bestLabelColor;
    ctx.font = '11px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`BEST ${index + 1}`, car.x, car.y - BEST_CAR_LABEL_OFFSET);
    ctx.restore();
  }

  private renderGhostHighlight(ctx: CanvasRenderingContext2D, car: Car): void {
    const radius = Math.max(car.width, car.height) * 0.5 + 10;

    ctx.strokeStyle = THEME.car.emphasis.ghostRingColor;
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

    ctx.fillStyle = THEME.car.emphasis.agentMarkerColor;
    ctx.beginPath();
    ctx.arc(markerX, markerY, AGENT_MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  private getMutationAmount(index: number): number {
    const baseMutationAmount = clampMutationAmount(
      this.mutationAmount,
      SEEDED_MUTATION_MIN,
      SEEDED_MUTATION_MAX
    );

    if (index <= 4) {
      return baseMutationAmount * 0.45;
    }

    if (index <= 12) {
      return baseMutationAmount * 0.8;
    }

    return baseMutationAmount;
  }

  private calculateFitnessScore(index: number, car: Car): number {
    const progress = this.progressByCar[index];
    const survivalBonus = this.survivalTimeByCar[index] * FITNESS_SURVIVAL_BONUS;
    const earlyCrashPenalty =
      car.damaged &&
      this.survivalTimeByCar[index] < FITNESS_EARLY_CRASH_WINDOW_SECONDS
        ? (FITNESS_EARLY_CRASH_WINDOW_SECONDS - this.survivalTimeByCar[index]) *
          FITNESS_EARLY_CRASH_PENALTY
        : 0;
    const lateralOffsetPenalty =
      this.lateralOffsetByCar[index] * FITNESS_LATERAL_OFFSET_PENALTY;
    const steeringPenalty =
      this.steeringEffortByCar[index] * FITNESS_STEERING_PENALTY;
    const stagnationPenalty =
      this.lowSpeedTimeByCar[index] * FITNESS_STAGNATION_PENALTY;
    const forwardSpeedBonus =
      this.forwardSpeedByCar[index] * FITNESS_FORWARD_SPEED_BONUS;
    const edgePenalty =
      this.edgeExposureByCar[index] * FITNESS_EDGE_PROXIMITY_PENALTY;
    const frontObstaclePenalty =
      this.frontObstaclePenaltyByCar[index] * FITNESS_FRONT_OBSTACLE_PENALTY;
    const obstacleAvoidanceReward =
      this.obstacleAvoidanceRewardByCar[index] * FITNESS_SAFE_AVOIDANCE_REWARD;

    return (
      progress +
      survivalBonus -
      edgePenalty -
      earlyCrashPenalty -
      frontObstaclePenalty -
      lateralOffsetPenalty -
      steeringPenalty -
      stagnationPenalty +
      forwardSpeedBonus +
      obstacleAvoidanceReward
    );
  }

  private isBetterCandidate(
    fitness: number,
    progress: number,
    y: number,
    bestFitness: number,
    bestProgress: number,
    bestY: number
  ): boolean {
    return (
      fitness > bestFitness ||
      (fitness === bestFitness && progress > bestProgress) ||
      (fitness === bestFitness && progress === bestProgress && y < bestY)
    );
  }

  private clear(): void {
    for (let index = 0; index < this.cars.length; index += 1) {
      this.cars[index].destroy();
    }

    this.cars.length = 0;
    this.progressByCar.length = 0;
    this.stallTimeByCar.length = 0;
    this.survivalTimeByCar.length = 0;
    this.lateralOffsetByCar.length = 0;
    this.steeringEffortByCar.length = 0;
    this.lowSpeedTimeByCar.length = 0;
    this.fitnessByCar.length = 0;
    this.forwardSpeedByCar.length = 0;
    this.edgeExposureByCar.length = 0;
    this.frontObstaclePenaltyByCar.length = 0;
    this.obstacleAvoidanceRewardByCar.length = 0;
    this.previousFrontObstacleSignalByCar.length = 0;
  }

  private getEdgeDangerSignal(
    car: Car,
    roadBorders: readonly Segment[]
  ): number {
    const nearestBorderDistance = car.getDistanceToNearestRoadBorder(roadBorders);

    if (!Number.isFinite(nearestBorderDistance)) {
      return 0;
    }

    return Math.max(0, 1 - nearestBorderDistance / EDGE_DANGER_DISTANCE);
  }
}

function clampMutationAmount(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getFrontObstacleSignal(sensorReadings: readonly number[]): number {
  if (sensorReadings.length === 0) {
    return 0;
  }

  const centerIndex = Math.floor(sensorReadings.length * 0.5);
  const leftIndex = Math.max(0, centerIndex - 1);
  const rightIndex = Math.min(sensorReadings.length - 1, centerIndex + 1);

  return Math.max(
    sensorReadings[leftIndex] ?? 0,
    sensorReadings[centerIndex] ?? 0,
    sensorReadings[rightIndex] ?? 0
  );
}
