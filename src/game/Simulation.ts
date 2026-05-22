import { CurriculumManager } from '../training/CurriculumManager';
import { Road } from '../world/Road';
import { TrafficManager } from '../traffic/TrafficManager';
import { PopulationManager } from '../population/PopulationManager';
import { Car } from '../car/Car';
import { BrainGenome } from '../ai/Brain';
import {
  type TrafficSettings,
} from '../traffic/trafficSettings';
import {
  type PopulationSizeOption,
  type MutationRateOption,
} from './simulationControls';
import { DriverMode } from '../drivers/DriverMode';
import { Camera } from './Camera';
import { ImitationRecorder } from '../drivers/ImitationRecorder';
import { clamp } from '../utils/math';

const POPULATION_LANE_INDEX = 1;

const LOW_SPEED_THRESHOLD = 36;
const FITNESS_PROGRESS_WEIGHT = 0.42;
const FITNESS_SURVIVAL_BONUS = 16;
const FITNESS_EARLY_CRASH_WINDOW_SECONDS = 6;
const FITNESS_EARLY_CRASH_PENALTY = 120;
const FITNESS_STEERING_PENALTY = 18;
const FITNESS_STAGNATION_PENALTY = 48;
const FITNESS_EDGE_PROXIMITY_PENALTY = 76;
const FITNESS_FRONT_OBSTACLE_PENALTY = 58;
const FITNESS_SAFE_AVOIDANCE_REWARD = 90;
const FITNESS_LANE_OFFSET_PENALTY = 0.18;
const FITNESS_LANE_RECOVERY_REWARD = 220;
const FRONT_OBSTACLE_SIGNAL_THRESHOLD = 0.55;
const FRONT_OBSTACLE_CLEAR_REWARD_DELTA = 0.16;

export interface DriverBenchmarkState {
  progress: number;
  survivalTime: number;
  laneOffsetIntegral: number;
  steeringEffortIntegral: number;
  lowSpeedTime: number;
  edgeExposure: number;
  laneRecoveryReward: number;
  frontObstaclePenalty: number;
  obstacleAvoidanceReward: number;
  previousLaneOffset: number;
  previousFrontObstacleSignal: number;
}

export interface DriverBenchmarkSnapshot {
  progress: number;
  survivalTime: number;
  fitness: number;
  efficiency: number;
  safety: number;
  laneDiscipline: number;
}

export interface SimulationOptions {
  road: Road;
  populationSize: PopulationSizeOption;
  mutationRate: MutationRateOption;
  trafficSettings: TrafficSettings;
  driverMode: DriverMode;
  savedBrainGenome?: BrainGenome | null;
}

export class Simulation {
  public readonly road: Road;
  public readonly trafficManager: TrafficManager;
  public readonly populationManager: PopulationManager;
  public readonly curriculum = new CurriculumManager();
  public readonly manualCar: Car;
  public readonly heuristicCar: Car;
  public readonly camera: Camera;
  public readonly imitationRecorder: ImitationRecorder;
  public readonly heuristicBenchmark: DriverBenchmarkState;

  private selectedDriverMode: DriverMode;
  private activeTrafficSettings: TrafficSettings;

  constructor(options: SimulationOptions) {
    this.road = options.road;
    this.selectedDriverMode = options.driverMode;
    this.activeTrafficSettings = options.trafficSettings;

    this.trafficManager = new TrafficManager(this.road);
    this.trafficManager.setSettings(this.activeTrafficSettings);

    this.populationManager = new PopulationManager({
      road: this.road,
      spawnX: this.road.getLaneCenter(POPULATION_LANE_INDEX),
      spawnY: 0,
      populationSize: options.populationSize,
      mutationAmount: options.mutationRate,
      seedGenome: options.savedBrainGenome,
    });

    this.manualCar = new Car(
      this.road.getLaneCenter(POPULATION_LANE_INDEX),
      0,
      undefined,
      undefined,
      undefined,
      { controlMode: 'manual' }
    );

    this.heuristicCar = new Car(
      this.road.getLaneCenter(POPULATION_LANE_INDEX),
      0,
      undefined,
      undefined,
      undefined,
      { controlMode: 'heuristic' }
    );

    this.camera = new Camera();
    this.imitationRecorder = new ImitationRecorder();
    this.heuristicBenchmark = createDriverBenchmarkState();

    this.restart();
  }

  public restart(options?: Partial<SimulationOptions>): void {
    if (options?.driverMode) this.selectedDriverMode = options.driverMode;
    if (options?.trafficSettings) {
      this.activeTrafficSettings = options.trafficSettings;
      this.trafficManager.setSettings(this.activeTrafficSettings);
    }

    this.trafficManager.reset(this.getSelectedCar());
    this.populationManager.reset({
      populationSize: options?.populationSize,
      mutationAmount: options?.mutationRate,
      brainGenome: options?.savedBrainGenome,
    });

    this.manualCar.reset(this.road.getLaneCenter(POPULATION_LANE_INDEX), 0, 0);
    this.heuristicCar.reset(this.road.getLaneCenter(POPULATION_LANE_INDEX), 0, 0);

    this.imitationRecorder.clear();
    Object.assign(this.heuristicBenchmark, createDriverBenchmarkState());
    this.synchronize();
  }

  public update(deltaTimeSeconds: number): void {
    this.populationManager.update(deltaTimeSeconds, this.road.borderSegments);
    this.updateComparisonCars(deltaTimeSeconds);
    this.updateHeuristicBenchmark(deltaTimeSeconds);
    this.populationManager.refreshStats();

    const referenceCar = this.getLeaderCar();

    this.trafficManager.update(
      deltaTimeSeconds,
      referenceCar,
      this.road.borderSegments,
      this.getCollisionSubjects()
    );

    this.populationManager.updateSensors(
      this.trafficManager.getTrafficPolygons(),
      this.trafficManager.getTrafficCars()
    );

    this.manualCar.updateSensors(
      this.road.sensorSegments,
      this.trafficManager.getTrafficPolygons(),
      this.road,
      this.trafficManager.getTrafficCars()
    );

    this.heuristicCar.updateSensors(
      this.road.sensorSegments,
      this.trafficManager.getTrafficPolygons(),
      this.road,
      this.trafficManager.getTrafficCars()
    );

    this.populationManager.updateTrainingSignals(
      deltaTimeSeconds,
      this.road.borderSegments
    );

    this.populationManager.refreshStats();
    this.recordImitationSample();

    // Curriculum update
    const stats = this.populationManager.getStats();
    if (this.curriculum.update(stats.bestFitness)) {
      this.trafficManager.setSettings(this.curriculum.getTrafficSettings());
    }

    const followCar = this.getSelectedCar();
    this.camera.follow(followCar.x, followCar.y, deltaTimeSeconds);
  }

  public synchronize(): void {
    this.populationManager.updateSensors(
      this.trafficManager.getTrafficPolygons(),
      this.trafficManager.getTrafficCars()
    );
    this.manualCar.updateSensors(
      this.road.sensorSegments,
      this.trafficManager.getTrafficPolygons(),
      this.road,
      this.trafficManager.getTrafficCars()
    );
    this.heuristicCar.updateSensors(
      this.road.sensorSegments,
      this.trafficManager.getTrafficPolygons(),
      this.road,
      this.trafficManager.getTrafficCars()
    );
    this.populationManager.updateTrainingSignals(0, this.road.borderSegments);
    this.populationManager.refreshStats();
  }

  public getSelectedCar(): Car {
    if (this.selectedDriverMode === 'manual') {
      return this.manualCar;
    }
    if (this.selectedDriverMode === 'heuristic') {
      return this.heuristicCar;
    }
    return this.populationManager.getBestCar() ?? this.manualCar;
  }

  public getLeaderCar(): Car {
    const bestAi = this.populationManager.getBestCar();
    const candidates = [this.manualCar, this.heuristicCar];

    if (bestAi) {
      candidates.push(bestAi);
    }

    return candidates.reduce((leader, candidate) =>
      candidate.y < leader.y ? candidate : leader
    );
  }

  public getCollisionSubjects(): Car[] {
    return [
      this.manualCar,
      this.heuristicCar,
      ...this.populationManager.getCars(),
    ];
  }

  private updateComparisonCars(deltaTimeSeconds: number): void {
    if (this.selectedDriverMode !== 'manual') {
      this.manualCar.update(deltaTimeSeconds, this.road.borderSegments);
    }
    if (this.selectedDriverMode !== 'heuristic') {
      this.heuristicCar.update(deltaTimeSeconds, this.road.borderSegments);
    }
  }

  private updateHeuristicBenchmark(deltaTimeSeconds: number): void {
    if (this.heuristicCar.damaged) {
      return;
    }

    const progress = Math.max(0, -this.heuristicCar.y);
    const laneAwareness = this.heuristicCar.getLaneAwarenessSnapshot();
    const sensorAwareness = this.heuristicCar.getSensorAwarenessSnapshot();
    const steeringIntent = this.heuristicCar.getDrivingIntent().steeringIntent;
    const laneOffset = Math.abs(laneAwareness.laneCenterOffsetNormalized);
    const obstacleSignal = sensorAwareness.frontObstacleSignal;

    this.heuristicBenchmark.progress = progress;
    this.heuristicBenchmark.survivalTime += deltaTimeSeconds;
    this.heuristicBenchmark.laneOffsetIntegral += laneOffset * deltaTimeSeconds;
    this.heuristicBenchmark.steeringEffortIntegral +=
      Math.abs(steeringIntent) * deltaTimeSeconds;

    if (this.heuristicCar.speed < LOW_SPEED_THRESHOLD) {
      this.heuristicBenchmark.lowSpeedTime += deltaTimeSeconds;
    }

    if (sensorAwareness.edgeProximity > 0.5) {
      this.heuristicBenchmark.edgeExposure += deltaTimeSeconds;
    }

    if (
      laneOffset < this.heuristicBenchmark.previousLaneOffset &&
      laneOffset > 0.1
    ) {
      this.heuristicBenchmark.laneRecoveryReward +=
        (this.heuristicBenchmark.previousLaneOffset - laneOffset) *
        deltaTimeSeconds;
    }

    if (obstacleSignal > FRONT_OBSTACLE_SIGNAL_THRESHOLD) {
      this.heuristicBenchmark.frontObstaclePenalty +=
        obstacleSignal * deltaTimeSeconds;
    }

    if (
      this.heuristicBenchmark.previousFrontObstacleSignal >
        FRONT_OBSTACLE_SIGNAL_THRESHOLD &&
      obstacleSignal <=
        this.heuristicBenchmark.previousFrontObstacleSignal -
          FRONT_OBSTACLE_CLEAR_REWARD_DELTA
    ) {
      this.heuristicBenchmark.obstacleAvoidanceReward += 1;
    }

    this.heuristicBenchmark.previousLaneOffset = laneOffset;
    this.heuristicBenchmark.previousFrontObstacleSignal = obstacleSignal;
  }

  public getHeuristicBenchmarkSnapshot(): DriverBenchmarkSnapshot {
    return {
      progress: this.heuristicBenchmark.progress,
      survivalTime: this.heuristicBenchmark.survivalTime,
      fitness: this.calculateBenchmarkFitness(
        this.heuristicBenchmark,
        this.heuristicCar
      ),
      efficiency:
        1 -
        clamp(
          this.heuristicBenchmark.steeringEffortIntegral /
            Math.max(1, this.heuristicBenchmark.survivalTime),
          0,
          1
        ),
      safety:
        1 -
        clamp(
          this.heuristicBenchmark.edgeExposure /
            Math.max(1, this.heuristicBenchmark.survivalTime),
          0,
          1
        ),
      laneDiscipline:
        1 -
        clamp(
          this.heuristicBenchmark.laneOffsetIntegral /
            Math.max(1, this.heuristicBenchmark.survivalTime),
          0,
          1
        ),
    };
  }

  private calculateBenchmarkFitness(
    benchmark: DriverBenchmarkState,
    car: Car
  ): number {
    const survivalBonus =
      benchmark.survivalTime > FITNESS_EARLY_CRASH_WINDOW_SECONDS
        ? FITNESS_SURVIVAL_BONUS
        : 0;
    const crashPenalty =
      car.damaged && benchmark.survivalTime < FITNESS_EARLY_CRASH_WINDOW_SECONDS
        ? FITNESS_EARLY_CRASH_PENALTY
        : 0;

    const fitness =
      benchmark.progress * FITNESS_PROGRESS_WEIGHT +
      survivalBonus -
      crashPenalty -
      benchmark.steeringEffortIntegral * FITNESS_STEERING_PENALTY -
      benchmark.lowSpeedTime * FITNESS_STAGNATION_PENALTY -
      benchmark.edgeExposure * FITNESS_EDGE_PROXIMITY_PENALTY -
      benchmark.frontObstaclePenalty * FITNESS_FRONT_OBSTACLE_PENALTY +
      benchmark.obstacleAvoidanceReward * FITNESS_SAFE_AVOIDANCE_REWARD -
      benchmark.laneOffsetIntegral * FITNESS_LANE_OFFSET_PENALTY +
      benchmark.laneRecoveryReward * FITNESS_LANE_RECOVERY_REWARD;

    return Math.max(0, fitness);
  }

  private recordImitationSample(): void {
    if (this.selectedDriverMode !== 'manual' || this.manualCar.damaged) {
      return;
    }

    const readings = this.manualCar.getSensorReadings();
    if (readings === null) {
      return;
    }

    this.imitationRecorder.record({
      inputs: readings,
      outputs: {
        forward: this.manualCar.getControlState().forward ? 1 : 0,
        brake: this.manualCar.getControlState().reverse ? 1 : 0,
        steer: this.manualCar.getDrivingIntent().steeringIntent,
      },
      timestamp: Date.now(),
      driverMode: 'manual',
    });
  }

  public getActiveTrafficSettings(): TrafficSettings {
    return this.activeTrafficSettings;
  }

  public getDriverMode(): DriverMode {
    return this.selectedDriverMode;
  }

  public setSelectedDriverMode(mode: DriverMode): void {
    this.selectedDriverMode = mode;
  }

  public setTrafficSettings(settings: TrafficSettings): void {
    this.activeTrafficSettings = settings;
    this.trafficManager.setSettings(settings);
  }
}

function createDriverBenchmarkState(): DriverBenchmarkState {
  return {
    progress: 0,
    survivalTime: 0,
    laneOffsetIntegral: 0,
    steeringEffortIntegral: 0,
    lowSpeedTime: 0,
    edgeExposure: 0,
    laneRecoveryReward: 0,
    frontObstaclePenalty: 0,
    obstacleAvoidanceReward: 0,
    previousLaneOffset: 0,
    previousFrontObstacleSignal: 0,
  };
}
