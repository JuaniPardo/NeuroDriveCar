import { cloneBrainGenome } from '../ai/mutation';
import { Car } from '../car/Car';
import {
  DRIVER_MODE_OPTIONS,
  formatDriverModeLabel,
  type DriverMode,
} from '../drivers/DriverMode';
import { ImitationRecorder } from '../drivers/ImitationRecorder';
import { PopulationManager } from '../population/PopulationManager';
import {
  MUTATION_RATE_OPTIONS,
  POPULATION_SIZE_OPTIONS,
  type MutationRateOption,
  type PopulationSizeOption,
  type RunningSimulationSpeed,
  type SimulationControlSnapshot,
  type SimulationSpeedOption,
} from './simulationControls';
import { TrafficManager } from '../traffic/TrafficManager';
import {
  createTrafficSettingsFromPhase,
  deriveTrafficPhase,
  type TrafficDensity,
  type TrafficSettings,
  type TrafficSpawnDistancePreset,
  type TrafficSpeedPreset,
  type TrainingTrafficPhase,
} from '../traffic/trafficSettings';
import { ControlsPanel } from '../ui/ControlsPanel';
import { Hud } from '../ui/Hud';
import {
  deleteBestBrain,
  loadBestBrain,
  loadTrafficSettings,
  saveBestBrain,
  saveTrafficSettings,
  type SavedBrainRecord,
} from '../utils/storage';
import { Road } from '../world/Road';
import { Camera } from './Camera';
import { Loop } from './Loop';
import type { Renderable, Updatable } from './types';

const BACKGROUND_TOP_COLOR = '#081114';
const BACKGROUND_BOTTOM_COLOR = '#020507';
const FRAME_SMOOTHING = 0.1;
const WORLD_RENDER_BUFFER = 180;
const HORIZON_LINE_COLOR = 'rgba(120, 195, 169, 0.08)';
const POPULATION_LANE_INDEX = 1;
const RESTART_KEY = 'r';
const PAUSE_KEY = 'p';
const SAVE_BRAIN_KEY = 's';
const LOAD_BRAIN_KEY = 'l';
const DELETE_BRAIN_KEY = 'd';
const SPEED_ZERO_KEY = '1';
const SPEED_ONE_KEY = '2';
const SPEED_TWO_KEY = '3';
const SPEED_FIVE_KEY = '4';
const POPULATION_DECREASE_KEY = '[';
const POPULATION_INCREASE_KEY = ']';
const MUTATION_DECREASE_KEY = '-';
const MUTATION_INCREASE_KEY = '=';
const TOGGLE_HELP_KEY = 'h';
const TOGGLE_NEURAL_VISUALIZER_KEY = 'v';
const TOGGLE_CONTROLS_KEY = 'c';
const TOGGLE_ADVANCED_DIAGNOSTICS_KEY = 'd';
const CYCLE_DRIVER_MODE_KEY = 'm';
const DEFAULT_RUNNING_SPEED: RunningSimulationSpeed = 1;
const DEFAULT_POPULATION_SIZE: PopulationSizeOption = 25;
const DEFAULT_MUTATION_RATE: MutationRateOption = 0.2;
const RANDOM_POPULATION_MESSAGE = 'Random population active.';
const DRIVER_RENDER_LABEL_OFFSET = 58;
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

interface SimulationControlState {
  paused: boolean;
  runningSpeedMultiplier: RunningSimulationSpeed;
  selectedPopulationSize: PopulationSizeOption;
  selectedMutationRate: MutationRateOption;
  lastActionMessage: string;
}

interface DriverBenchmarkState {
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

interface DriverBenchmarkSnapshot {
  progress: number;
  survivalTime: number;
  fitness: number;
  alive: boolean;
}

export class Game implements Updatable, Renderable {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly loop: Loop;
  private readonly resizeObserver: () => void;
  private readonly road: Road;
  private readonly camera: Camera;
  private readonly populationManager: PopulationManager;
  private readonly heuristicCar: Car;
  private readonly manualCar: Car;
  private readonly trafficManager: TrafficManager;
  private readonly hud: Hud;
  private readonly controlsPanel: ControlsPanel;
  private readonly imitationRecorder = new ImitationRecorder();
  private readonly populationSpawnX: number;
  private readonly populationSpawnY: number;
  private readonly keyCommandListener: (event: KeyboardEvent) => void;
  private backgroundGradient: CanvasGradient | null = null;
  private width = 0;
  private height = 0;
  private framesPerSecond = 0;
  private followTargetX = 0;
  private followTargetY = 0;
  private savedBrainRecord: SavedBrainRecord | null = null;
  private persistenceMessage = RANDOM_POPULATION_MESSAGE;
  private selectedTrafficSettings: TrafficSettings = loadTrafficSettings();
  private activeTrafficSettings: TrafficSettings = loadTrafficSettings();
  private selectedDriverMode: DriverMode = 'ai';
  private heuristicBenchmark: DriverBenchmarkState = createDriverBenchmarkState();
  private readonly controlState: SimulationControlState = {
    paused: false,
    runningSpeedMultiplier: DEFAULT_RUNNING_SPEED,
    selectedPopulationSize: DEFAULT_POPULATION_SIZE,
    selectedMutationRate: DEFAULT_MUTATION_RATE,
    lastActionMessage: 'Simulation ready.',
  };
  private showHudHelp = false;
  private showNeuralVisualizer = true;
  private showControlsPanel = true;
  private showAdvancedDiagnostics = false;

  public constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');

    const context = this.canvas.getContext('2d');

    if (context === null) {
      throw new Error('Canvas 2D context is not available.');
    }

    this.context = context;
    this.loop = new Loop(this, this);
    this.road = new Road();
    this.camera = new Camera();
    this.hud = new Hud();
    this.refreshSavedBrainState(true);
    this.populationSpawnX = this.road.getLaneCenter(POPULATION_LANE_INDEX);
    this.populationSpawnY = 0;
    this.populationManager = new PopulationManager({
      road: this.road,
      spawnX: this.populationSpawnX,
      spawnY: this.populationSpawnY,
      populationSize: this.controlState.selectedPopulationSize,
      mutationAmount: this.controlState.selectedMutationRate,
      seedGenome: this.savedBrainRecord?.genome ?? null,
    });
    this.heuristicCar = new Car(this.populationSpawnX, this.populationSpawnY, 42, 74, undefined, {
      controlMode: 'heuristic',
    });
    this.manualCar = new Car(this.populationSpawnX, this.populationSpawnY, 42, 74, undefined, {
      controlMode: 'manual',
    });
    this.trafficManager = new TrafficManager(this.road);
    this.controlsPanel = new ControlsPanel(this.container, {
      onTogglePause: () => {
        this.togglePause();
      },
      onRestart: () => {
        this.restartSimulation('Simulation restarted.');
      },
      onSpeedChange: (speed: SimulationSpeedOption) => {
        this.setSimulationSpeed(speed);
      },
      onPopulationSizeChange: (size: PopulationSizeOption) => {
        this.setPopulationSize(size);
      },
      onMutationRateChange: (rate: MutationRateOption) => {
        this.setMutationRate(rate);
      },
      onDriverModeChange: (mode: DriverMode) => {
        this.setSelectedDriverMode(mode);
      },
      onTrafficEnabledChange: (enabled: boolean) => {
        this.setTrafficEnabled(enabled);
      },
      onTrafficPhaseChange: (phase: TrainingTrafficPhase) => {
        this.setTrafficPhase(phase);
      },
      onTrafficDensityChange: (density: TrafficDensity) => {
        this.setTrafficDensity(density);
      },
      onTrafficSpeedPresetChange: (preset: TrafficSpeedPreset) => {
        this.setTrafficSpeedPreset(preset);
      },
      onTrafficSpawnDistancePresetChange: (preset: TrafficSpawnDistancePreset) => {
        this.setTrafficSpawnDistancePreset(preset);
      },
    });
    this.resizeObserver = () => {
      this.resize();
    };
    this.keyCommandListener = (event: KeyboardEvent) => {
      this.handleKeyCommand(event);
    };

    this.container.append(this.canvas);
    this.context.imageSmoothingEnabled = false;
    this.controlsPanel.setVisible(this.showControlsPanel);

    this.resize();
    this.synchronizeSimulationWorld();
    this.handleSavedBrainCompatibility();
    this.camera.reset(this.populationSpawnX, this.populationSpawnY);
    this.followTargetX = this.populationSpawnX;
    this.followTargetY = this.populationSpawnY;
    window.addEventListener('resize', this.resizeObserver);
    window.addEventListener('keydown', this.keyCommandListener);
  }

  public start(): void {
    this.loop.start();
  }

  public destroy(): void {
    this.loop.stop();
    this.controlsPanel.destroy();
    this.manualCar.destroy();
    this.heuristicCar.destroy();
    this.populationManager.destroy();
    this.trafficManager.destroy();
    window.removeEventListener('resize', this.resizeObserver);
    window.removeEventListener('keydown', this.keyCommandListener);
    this.canvas.remove();
  }

  public update(deltaTimeSeconds: number): void {
    this.updateFrameRate(deltaTimeSeconds);

    if (this.controlState.paused) {
      return;
    }

    for (
      let stepIndex = 0;
      stepIndex < this.controlState.runningSpeedMultiplier;
      stepIndex += 1
    ) {
      this.advanceSimulation(deltaTimeSeconds);
    }
  }

  public render(): void {
    const ctx = this.context;
    const selectedCar = this.getSelectedCar();
    const populationStats = this.populationManager.getStats();
    const steeringDebug = selectedCar.getSteeringDebugSnapshot();
    const laneAwareness = selectedCar.getLaneAwarenessSnapshot();
    const sensorAwareness = selectedCar.getSensorAwarenessSnapshot();
    const bestAiFitness = this.populationManager.getBestCarFitnessSnapshot();
    const heuristicBenchmark = this.getHeuristicBenchmarkSnapshot();

    ctx.clearRect(0, 0, this.width, this.height);
    this.renderBackground(ctx);
    this.renderWorld(ctx);
    this.hud.render(ctx, {
      width: this.width,
      height: this.height,
      framesPerSecond: this.framesPerSecond,
      controlMode: selectedCar.getControlMode(),
      selectedDriverMode: this.selectedDriverMode,
      speed: selectedCar.speed,
      damaged: selectedCar.damaged,
      traveledDistance: this.getSelectedDriverProgress(),
      trafficCount: this.trafficManager.getActiveCount(),
      laneSpeedLabel: this.trafficManager.getLaneSpeedDebugLabel(),
      activeTrafficSettings: this.activeTrafficSettings,
      selectedTrafficSettings: this.selectedTrafficSettings,
      steeringDebug,
      laneAwareness,
      sensorAwareness,
      heuristicDebug: selectedCar.getHeuristicDebugSnapshot(),
      sensorReadings: selectedCar.getSensorReadings(),
      brainSnapshot: selectedCar.getBrainSnapshot(),
      fitness:
        this.selectedDriverMode === 'ai'
          ? bestAiFitness
          : createSyntheticFitnessSnapshot(this.getSelectedDriverProgress(), selectedCar.damaged),
      bestAiFitness: bestAiFitness.totalFitness,
      heuristicFitness: heuristicBenchmark.fitness,
      aiHeuristicRatio:
        heuristicBenchmark.fitness <= 0
          ? 0
          : bestAiFitness.totalFitness / heuristicBenchmark.fitness,
      bestAiProgress: populationStats.bestProgress,
      heuristicProgress: heuristicBenchmark.progress,
      bestAiSurvivalTime: this.getBestAiSurvivalTime(),
      heuristicSurvivalTime: heuristicBenchmark.survivalTime,
      populationSize: populationStats.populationSize,
      aliveCount: populationStats.aliveCount,
      crashedCount: populationStats.crashedCount,
      bestCarIndex: populationStats.bestCarIndex,
      generation: populationStats.generation,
      paused: this.controlState.paused,
      simulationSpeed: this.getSimulationSpeedMultiplier(),
      selectedPopulationSize: this.controlState.selectedPopulationSize,
      selectedMutationRate: this.controlState.selectedMutationRate,
      lastControlAction: this.controlState.lastActionMessage,
      savedBrainExists: this.savedBrainRecord !== null,
      savedBrainCompatible: this.isSavedBrainCompatible(),
      savedBestDistance: this.savedBrainRecord?.bestDistance ?? null,
      populationSource: populationStats.populationSource,
      mutationAmount: populationStats.mutationAmount,
      persistenceMessage: this.persistenceMessage,
      showHelp: this.showHudHelp,
      showAdvancedDiagnostics: this.showAdvancedDiagnostics,
      showNeuralVisualizer: this.showNeuralVisualizer,
      showControlsPanel: this.showControlsPanel,
      curriculumPhase: this.simulation.curriculum.currentPhase.name,
    });
    this.controlsPanel.render({
      ...this.getControlSnapshot(),
      selectedDriverMode: this.selectedDriverMode,
      generation: populationStats.generation,
      activePopulationSize: populationStats.populationSize,
      activeMutationRate: populationStats.mutationAmount,
      populationSource: populationStats.populationSource,
      savedBrainExists: this.savedBrainRecord !== null,
      activeTrafficSettings: this.activeTrafficSettings,
      selectedTrafficSettings: this.selectedTrafficSettings,
    });
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.width = nextWidth;
    this.height = nextHeight;
    this.canvas.width = Math.round(nextWidth * nextPixelRatio);
    this.canvas.height = Math.round(nextHeight * nextPixelRatio);
    this.canvas.style.width = `${nextWidth}px`;
    this.canvas.style.height = `${nextHeight}px`;

    this.context.setTransform(nextPixelRatio, 0, 0, nextPixelRatio, 0, 0);
    this.backgroundGradient = this.createBackgroundGradient();
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    if (this.backgroundGradient === null) {
      this.backgroundGradient = this.createBackgroundGradient();
    }

    ctx.fillStyle = this.backgroundGradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderWorld(ctx: CanvasRenderingContext2D): void {
    const screenCenterX = this.width * 0.5;
    const screenAnchorY = this.height * 0.78;
    const visibleTop = this.camera.y - screenAnchorY - WORLD_RENDER_BUFFER;
    const visibleBottom =
      this.camera.y + (this.height - screenAnchorY) + WORLD_RENDER_BUFFER;

    ctx.save();
    ctx.translate(screenCenterX - this.camera.x, screenAnchorY - this.camera.y);
    this.renderWorldBackdrop(ctx, visibleTop, visibleBottom);
    this.road.render(ctx, visibleTop, visibleBottom);
    this.road.renderDebug(ctx, visibleTop, visibleBottom);
    this.trafficManager.render(ctx);
    this.trafficManager.renderDebug(ctx, visibleTop, visibleBottom);
    this.populationManager.render(ctx);
    this.renderComparisonCars(ctx);
    ctx.restore();
  }

  private handleKeyCommand(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === PAUSE_KEY) {
      event.preventDefault();
      this.togglePause();
      return;
    }

    if (key === TOGGLE_HELP_KEY) {
      event.preventDefault();
      this.showHudHelp = !this.showHudHelp;
      this.controlState.lastActionMessage = this.showHudHelp
        ? 'HUD help expanded.'
        : 'HUD help collapsed.';
      return;
    }

    if (key === TOGGLE_NEURAL_VISUALIZER_KEY) {
      event.preventDefault();
      this.showNeuralVisualizer = !this.showNeuralVisualizer;
      this.controlState.lastActionMessage = this.showNeuralVisualizer
        ? 'Neural visualizer shown.'
        : 'Neural visualizer hidden.';
      return;
    }

    if (key === TOGGLE_CONTROLS_KEY) {
      event.preventDefault();
      this.showControlsPanel = !this.showControlsPanel;
      this.controlsPanel.setVisible(this.showControlsPanel);
      this.controlState.lastActionMessage = this.showControlsPanel
        ? 'Controls panel shown.'
        : 'Controls panel hidden.';
      return;
    }

    if (key === CYCLE_DRIVER_MODE_KEY) {
      event.preventDefault();
      this.cycleDriverMode();
      return;
    }

    if (key === TOGGLE_ADVANCED_DIAGNOSTICS_KEY) {
      event.preventDefault();
      this.showAdvancedDiagnostics = !this.showAdvancedDiagnostics;
      this.controlState.lastActionMessage = this.showAdvancedDiagnostics
        ? 'Advanced diagnostics shown.'
        : 'Advanced diagnostics hidden.';
      return;
    }

    if (key === SAVE_BRAIN_KEY) {
      event.preventDefault();
      this.saveCurrentBestBrain();
      return;
    }

    if (key === LOAD_BRAIN_KEY) {
      event.preventDefault();
      this.loadSavedBrainIntoPopulation();
      return;
    }

    if (key === DELETE_BRAIN_KEY) {
      event.preventDefault();
      this.deleteSavedBrainAndReset();
      return;
    }

    if (key === RESTART_KEY) {
      event.preventDefault();
      this.restartSimulation('Simulation restarted.');
      return;
    }

    if (key === SPEED_ZERO_KEY) {
      event.preventDefault();
      this.setSimulationSpeed(0);
      return;
    }

    if (key === SPEED_ONE_KEY) {
      event.preventDefault();
      this.setSimulationSpeed(1);
      return;
    }

    if (key === SPEED_TWO_KEY) {
      event.preventDefault();
      this.setSimulationSpeed(2);
      return;
    }

    if (key === SPEED_FIVE_KEY) {
      event.preventDefault();
      this.setSimulationSpeed(5);
      return;
    }

    if (key === POPULATION_DECREASE_KEY) {
      event.preventDefault();
      this.cyclePopulationSize(-1);
      return;
    }

    if (key === POPULATION_INCREASE_KEY) {
      event.preventDefault();
      this.cyclePopulationSize(1);
      return;
    }

    if (key === MUTATION_DECREASE_KEY) {
      event.preventDefault();
      this.cycleMutationRate(-1);
      return;
    }

    if (key === MUTATION_INCREASE_KEY) {
      event.preventDefault();
      this.cycleMutationRate(1);
    }
  }

  private restartSimulation(nextMessage?: string): void {
    this.populationManager.reset({
      populationSize: this.controlState.selectedPopulationSize,
      mutationAmount: this.controlState.selectedMutationRate,
    });
    this.synchronizeSimulationWorld();
    this.camera.reset(this.populationSpawnX, this.populationSpawnY);
    this.followTargetX = this.populationSpawnX;
    this.followTargetY = this.populationSpawnY;
    this.framesPerSecond = 0;

    if (nextMessage !== undefined) {
      this.controlState.lastActionMessage = nextMessage;
      return;
    }

    this.controlState.lastActionMessage = this.buildRestartActionMessage();
  }

  private saveCurrentBestBrain(): void {
    const genome = this.populationManager.getBestBrainGenome();

    if (genome === null) {
      this.persistenceMessage = 'No AI brain available to save.';
      this.controlState.lastActionMessage = 'Save skipped: no AI brain available.';
      return;
    }

    const bestDistance = this.populationManager.getStats().bestProgress;
    const savedRecord = saveBestBrain(cloneBrainGenome(genome), bestDistance);

    if (savedRecord === null) {
      this.persistenceMessage = 'localStorage unavailable. Save skipped.';
      this.controlState.lastActionMessage = 'Save skipped: localStorage unavailable.';
      return;
    }

    this.savedBrainRecord = savedRecord;
    this.populationManager.setSeedGenome(savedRecord.genome);
    this.persistenceMessage = `Saved best brain @ ${bestDistance.toFixed(1)}.`;
    this.controlState.lastActionMessage = 'Saved current best brain.';
  }

  private loadSavedBrainIntoPopulation(): void {
    const savedRecord = this.refreshSavedBrainState(true);

    if (savedRecord === null) {
      this.populationManager.setSeedGenome(null);
      this.restartSimulation('No saved brain found. Random seed loaded.');
      return;
    }

    if (!this.populationManager.isGenomeCompatible(savedRecord.genome)) {
      this.populationManager.setSeedGenome(null);
      this.persistenceMessage =
        'Saved brain incompatible with current AI inputs. Random seed active.';
      this.controlState.lastActionMessage =
        'Saved brain incompatible. Loaded random population instead.';
      this.restartSimulation(this.controlState.lastActionMessage);
      return;
    }

    this.populationManager.setSeedGenome(savedRecord.genome);
    this.restartSimulation(`Loaded saved brain @ ${savedRecord.bestDistance.toFixed(1)}.`);
  }

  private deleteSavedBrainAndReset(): void {
    deleteBestBrain();
    this.savedBrainRecord = null;
    this.populationManager.setSeedGenome(null);
    this.restartSimulation('Saved brain deleted. Random seed loaded.');
  }

  private refreshSavedBrainState(clearInvalid: boolean): SavedBrainRecord | null {
    const result = loadBestBrain();

    if (result.status === 'loaded') {
      this.savedBrainRecord = {
        ...result.record,
        genome: cloneBrainGenome(result.record.genome),
      };

      return this.savedBrainRecord;
    }

    if (result.status === 'invalid' && clearInvalid) {
      deleteBestBrain();
      this.persistenceMessage = 'Corrupted saved brain cleared.';
    } else if (result.status === 'unavailable') {
      this.persistenceMessage = 'localStorage unavailable. Random seed active.';
    } else if (result.status === 'missing') {
      this.persistenceMessage = RANDOM_POPULATION_MESSAGE;
    }

    this.savedBrainRecord = null;

    return null;
  }

  private updatePersistenceMessageForCurrentSeed(): void {
    if (
      this.populationManager.getStats().populationSource === 'saved' &&
      this.savedBrainRecord !== null
    ) {
      this.persistenceMessage = `Saved seed active @ ${this.savedBrainRecord.bestDistance.toFixed(1)}.`;
      return;
    }

    if (this.savedBrainRecord !== null) {
      this.persistenceMessage = `Saved brain ready @ ${this.savedBrainRecord.bestDistance.toFixed(1)}.`;
      return;
    }

    if (this.persistenceMessage === 'Corrupted saved brain cleared.') {
      this.persistenceMessage = 'Corrupted brain removed. Random seed active.';
      return;
    }

    this.persistenceMessage = RANDOM_POPULATION_MESSAGE;
  }

  private synchronizeSimulationWorld(): void {
    this.trafficManager.setSettings(this.selectedTrafficSettings);
    this.activeTrafficSettings = {
      ...this.selectedTrafficSettings,
    };
    this.manualCar.reset(this.populationSpawnX, this.populationSpawnY);
    this.heuristicCar.reset(this.populationSpawnX, this.populationSpawnY);
    this.heuristicBenchmark = createDriverBenchmarkState();
    this.imitationRecorder.clear();
    this.trafficManager.reset(this.getLeaderCar());
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
    this.updatePersistenceMessageForCurrentSeed();
  }

  private advanceSimulation(deltaTimeSeconds: number): void {
    this.populationManager.update(deltaTimeSeconds, this.road.borderSegments);
    this.updateComparisonCars(deltaTimeSeconds);
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
    this.updateHeuristicBenchmark(deltaTimeSeconds);
    this.recordImitationSample();

    const followCar = this.getSelectedCar();

    this.followTargetX = followCar.x;
    this.followTargetY = followCar.y;
    this.camera.follow(this.followTargetX, this.followTargetY, deltaTimeSeconds);
  }

  private updateFrameRate(deltaTimeSeconds: number): void {
    const instantFramesPerSecond = deltaTimeSeconds > 0 ? 1 / deltaTimeSeconds : 0;

    if (this.framesPerSecond === 0) {
      this.framesPerSecond = instantFramesPerSecond;
      return;
    }

    this.framesPerSecond +=
      (instantFramesPerSecond - this.framesPerSecond) * FRAME_SMOOTHING;
  }

  private togglePause(): void {
    this.controlState.paused = !this.controlState.paused;
    this.controlState.lastActionMessage = this.controlState.paused
      ? 'Simulation paused.'
      : `Simulation resumed @ ${this.controlState.runningSpeedMultiplier}x.`;
  }

  private setSimulationSpeed(nextSpeed: SimulationSpeedOption): void {
    if (nextSpeed === 0) {
      this.controlState.paused = true;
      this.controlState.lastActionMessage = 'Simulation paused at 0x.';
      return;
    }

    this.controlState.paused = false;
    this.controlState.runningSpeedMultiplier = nextSpeed;
    this.controlState.lastActionMessage = `Simulation speed set to ${nextSpeed}x.`;
  }

  private setPopulationSize(nextPopulationSize: PopulationSizeOption): void {
    this.controlState.selectedPopulationSize = nextPopulationSize;
    this.controlState.lastActionMessage =
      `Population size armed: ${nextPopulationSize}. Restart to apply.`;
  }

  private setMutationRate(nextMutationRate: MutationRateOption): void {
    this.controlState.selectedMutationRate = nextMutationRate;
    this.controlState.lastActionMessage =
      `Mutation rate armed: ${nextMutationRate.toFixed(2)}. Restart to apply.`;
  }

  private setSelectedDriverMode(mode: DriverMode): void {
    this.selectedDriverMode = mode;
    this.simulation.setSelectedDriverMode(mode);
    this.simulation.curriculum.reset();
    this.simulation.trafficManager.setSettings(this.simulation.curriculum.getTrafficSettings());
    this.controlState.lastActionMessage = `Driver mode set to ${formatDriverModeLabel(mode)}.`;
  }

  private setTrafficEnabled(enabled: boolean): void {
    if (!enabled) {
      this.updateSelectedTrafficSettings(
        {
          enabled: false,
          density: 'none',
        },
        'Traffic disabled. Restart to apply.'
      );
      return;
    }

    const resumedPhase =
      this.selectedTrafficSettings.phase === 'road-only'
        ? 'normal-traffic'
        : this.selectedTrafficSettings.phase;
    const resumedPreset = createTrafficSettingsFromPhase(resumedPhase);

    this.updateSelectedTrafficSettings(
      {
        enabled: true,
        density: resumedPreset.density,
      },
      'Traffic enabled. Restart to apply.'
    );
  }

  private setTrafficPhase(phase: TrainingTrafficPhase): void {
    const nextSettings = createTrafficSettingsFromPhase(phase);

    this.selectedTrafficSettings = saveTrafficSettings(nextSettings);
    this.controlState.lastActionMessage =
      `Traffic phase armed: ${phase}. Restart to apply.`;
  }

  private setTrafficDensity(density: TrafficDensity): void {
    this.updateSelectedTrafficSettings(
      {
        enabled: density !== 'none',
        density,
      },
      `Traffic density armed: ${density}. Restart to apply.`
    );
  }

  private setTrafficSpeedPreset(preset: TrafficSpeedPreset): void {
    this.updateSelectedTrafficSettings(
      {
        speedPreset: preset,
      },
      `Traffic speed armed: ${preset}. Restart to apply.`
    );
  }

  private setTrafficSpawnDistancePreset(preset: TrafficSpawnDistancePreset): void {
    this.updateSelectedTrafficSettings(
      {
        spawnDistancePreset: preset,
      },
      `Traffic spawn armed: ${preset}. Restart to apply.`
    );
  }

  private cyclePopulationSize(direction: -1 | 1): void {
    const currentIndex = POPULATION_SIZE_OPTIONS.indexOf(
      this.controlState.selectedPopulationSize
    );
    const nextIndex = clampOptionIndex(
      currentIndex + direction,
      POPULATION_SIZE_OPTIONS.length
    );

    this.setPopulationSize(POPULATION_SIZE_OPTIONS[nextIndex]);
  }

  private cycleMutationRate(direction: -1 | 1): void {
    const currentIndex = MUTATION_RATE_OPTIONS.indexOf(
      this.controlState.selectedMutationRate
    );
    const nextIndex = clampOptionIndex(
      currentIndex + direction,
      MUTATION_RATE_OPTIONS.length
    );

    this.setMutationRate(MUTATION_RATE_OPTIONS[nextIndex]);
  }

  private cycleDriverMode(): void {
    const currentIndex = DRIVER_MODE_OPTIONS.indexOf(this.selectedDriverMode);
    const nextIndex = clampOptionIndex(currentIndex + 1, DRIVER_MODE_OPTIONS.length);

    this.setSelectedDriverMode(DRIVER_MODE_OPTIONS[nextIndex]);
  }

  private getSimulationSpeedMultiplier(): SimulationSpeedOption {
    return this.controlState.paused ? 0 : this.controlState.runningSpeedMultiplier;
  }

  private getControlSnapshot(): SimulationControlSnapshot {
    return {
      paused: this.controlState.paused,
      speedMultiplier: this.getSimulationSpeedMultiplier(),
      selectedPopulationSize: this.controlState.selectedPopulationSize,
      selectedMutationRate: this.controlState.selectedMutationRate,
      lastActionMessage: this.controlState.lastActionMessage,
    };
  }

  private buildRestartActionMessage(): string {
    return `Restarted GEN ${this.populationManager.getStats().generation} @ ${this.getSimulationSpeedMultiplier()}x.`;
  }

  private getSelectedCar(): Car {
    if (this.selectedDriverMode === 'manual') {
      return this.manualCar;
    }

    if (this.selectedDriverMode === 'heuristic') {
      return this.heuristicCar;
    }

    return this.populationManager.getBestCar();
  }

  private getSelectedDriverProgress(): number {
    if (this.selectedDriverMode === 'heuristic') {
      return this.heuristicBenchmark.progress;
    }

    if (this.selectedDriverMode === 'manual') {
      return Math.max(0, this.populationSpawnY - this.manualCar.y);
    }

    return this.populationManager.getStats().bestProgress;
  }

  private getLeaderCar(): Car {
    const candidates = [this.populationManager.getBestCar(), this.heuristicCar];

    if (this.selectedDriverMode === 'manual') {
      candidates.push(this.manualCar);
    }

    let leader = candidates.find((candidate) => !candidate.damaged) ?? candidates[0];

    for (const candidate of candidates) {
      if (!candidate.damaged && candidate.y < leader.y) {
        leader = candidate;
      }
    }

    return leader;
  }

  private getCollisionSubjects(): readonly Car[] {
    return this.selectedDriverMode === 'manual'
      ? [...this.populationManager.getCars(), this.heuristicCar, this.manualCar]
      : [...this.populationManager.getCars(), this.heuristicCar];
  }

  private updateComparisonCars(deltaTimeSeconds: number): void {
    if (this.selectedDriverMode === 'manual') {
      this.manualCar.update(deltaTimeSeconds, this.road.borderSegments);
    }

    this.heuristicCar.update(deltaTimeSeconds, this.road.borderSegments);
  }

  private renderComparisonCars(ctx: CanvasRenderingContext2D): void {
    const selectedCar = this.getSelectedCar();

    if (this.selectedDriverMode === 'manual') {
      this.manualCar.render(ctx, {
        renderSensors: selectedCar === this.manualCar,
        renderDebug: true,
      });
      this.renderDriverLabel(ctx, this.manualCar, 'MANUAL');
    }

    this.heuristicCar.render(ctx, {
      renderSensors: selectedCar === this.heuristicCar,
      renderDebug: true,
    });
    this.renderDriverLabel(ctx, this.heuristicCar, 'HEUR');
  }

  private renderDriverLabel(
    ctx: CanvasRenderingContext2D,
    car: Car,
    label: string
  ): void {
    if (car.damaged) {
      return;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(236, 255, 247, 0.9)';
    ctx.font = '11px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, car.x, car.y - DRIVER_RENDER_LABEL_OFFSET);
    ctx.restore();
  }

  private updateHeuristicBenchmark(deltaTimeSeconds: number): void {
    const car = this.heuristicCar;
    const laneOffset = Math.abs(this.road.getNearestLaneCenterOffset(car.x));
    const sensorAwareness = car.getSensorAwarenessSnapshot();

    this.heuristicBenchmark.progress = Math.max(
      this.heuristicBenchmark.progress,
      this.populationSpawnY - car.y
    );
    this.heuristicBenchmark.survivalTime += deltaTimeSeconds;
    this.heuristicBenchmark.laneOffsetIntegral += laneOffset * deltaTimeSeconds;
    this.heuristicBenchmark.steeringEffortIntegral +=
      Math.abs(car.getSteeringDebugSnapshot().smoothedSteer) * deltaTimeSeconds;
    this.heuristicBenchmark.edgeExposure +=
      sensorAwareness.edgeProximity * deltaTimeSeconds;

    if (Math.abs(car.speed) < LOW_SPEED_THRESHOLD) {
      this.heuristicBenchmark.lowSpeedTime += deltaTimeSeconds;
    }

    if (
      !car.damaged &&
      Math.abs(this.heuristicBenchmark.previousLaneOffset) > laneOffset
    ) {
      this.heuristicBenchmark.laneRecoveryReward +=
        Math.abs(this.heuristicBenchmark.previousLaneOffset) - laneOffset;
    }

    if (sensorAwareness.frontObstacleSignal > FRONT_OBSTACLE_SIGNAL_THRESHOLD) {
      this.heuristicBenchmark.frontObstaclePenalty +=
        sensorAwareness.frontObstacleSignal * deltaTimeSeconds;
    }

    if (
      !car.damaged &&
      this.heuristicBenchmark.previousFrontObstacleSignal >
        FRONT_OBSTACLE_SIGNAL_THRESHOLD &&
      sensorAwareness.frontObstacleSignal <
        this.heuristicBenchmark.previousFrontObstacleSignal -
          FRONT_OBSTACLE_CLEAR_REWARD_DELTA &&
      car.getForwardSpeedRatio() > 0.22
    ) {
      this.heuristicBenchmark.obstacleAvoidanceReward +=
        this.heuristicBenchmark.previousFrontObstacleSignal -
        sensorAwareness.frontObstacleSignal;
    }

    this.heuristicBenchmark.previousLaneOffset = laneOffset;
    this.heuristicBenchmark.previousFrontObstacleSignal =
      sensorAwareness.frontObstacleSignal;
  }

  private getHeuristicBenchmarkSnapshot(): DriverBenchmarkSnapshot {
    return {
      progress: this.heuristicBenchmark.progress,
      survivalTime: this.heuristicBenchmark.survivalTime,
      fitness: this.calculateBenchmarkFitness(this.heuristicBenchmark, this.heuristicCar),
      alive: !this.heuristicCar.damaged,
    };
  }

  private getBestAiSurvivalTime(): number {
    return Math.max(0, (this.populationSpawnY - this.populationManager.getBestCar().y) / 80);
  }

  private calculateBenchmarkFitness(
    benchmark: DriverBenchmarkState,
    car: Car
  ): number {
    let totalFitness =
      benchmark.progress * FITNESS_PROGRESS_WEIGHT +
      benchmark.survivalTime * FITNESS_SURVIVAL_BONUS +
      benchmark.obstacleAvoidanceReward * FITNESS_SAFE_AVOIDANCE_REWARD +
      benchmark.laneRecoveryReward * FITNESS_LANE_RECOVERY_REWARD;

    totalFitness -= benchmark.edgeExposure * FITNESS_EDGE_PROXIMITY_PENALTY;
    totalFitness -= benchmark.steeringEffortIntegral * FITNESS_STEERING_PENALTY;
    totalFitness -= benchmark.lowSpeedTime * FITNESS_STAGNATION_PENALTY;
    totalFitness -= benchmark.frontObstaclePenalty * FITNESS_FRONT_OBSTACLE_PENALTY;
    totalFitness -= benchmark.laneOffsetIntegral * FITNESS_LANE_OFFSET_PENALTY;

    if (car.damaged && benchmark.survivalTime < FITNESS_EARLY_CRASH_WINDOW_SECONDS) {
      totalFitness -= FITNESS_EARLY_CRASH_PENALTY;
    }

    return totalFitness;
  }

  private recordImitationSample(): void {
    let sourceCar: Car | null = null;
    let driverMode: Extract<DriverMode, 'manual' | 'heuristic'> | null = null;

    if (this.selectedDriverMode === 'manual') {
      sourceCar = this.manualCar;
      driverMode = 'manual';
    } else if (this.selectedDriverMode === 'heuristic') {
      sourceCar = this.heuristicCar;
      driverMode = 'heuristic';
    }

    if (sourceCar === null || driverMode === null || sourceCar.damaged) {
      return;
    }

    const controlState = sourceCar.getControlState();

    this.imitationRecorder.record({
      inputs: [...sourceCar.getSensorReadings()],
      outputs: {
        forward: Number(controlState.forward),
        brake: Number(controlState.reverse),
        steer: controlState.steerIntent ?? 0,
      },
      timestamp: performance.now(),
      driverMode,
    });
  }

  private renderWorldBackdrop(
    ctx: CanvasRenderingContext2D,
    visibleTop: number,
    visibleBottom: number
  ): void {
    const bandSpacing = 160;
    const backdropWidth = this.width * 1.6;
    const startY = Math.floor(visibleTop / bandSpacing) * bandSpacing;

    ctx.save();
    ctx.strokeStyle = HORIZON_LINE_COLOR;
    ctx.lineWidth = 1;

    for (let y = startY; y <= visibleBottom; y += bandSpacing) {
      ctx.beginPath();
      ctx.moveTo(-backdropWidth, y + 0.5);
      ctx.lineTo(backdropWidth, y + 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  private createBackgroundGradient(): CanvasGradient {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, BACKGROUND_TOP_COLOR);
    gradient.addColorStop(1, BACKGROUND_BOTTOM_COLOR);

    return gradient;
  }

  private updateSelectedTrafficSettings(
    partialSettings: Partial<TrafficSettings>,
    message: string
  ): void {
    const nextSettings = {
      ...this.selectedTrafficSettings,
      ...partialSettings,
    };

    if (partialSettings.enabled !== undefined || partialSettings.density !== undefined) {
      nextSettings.phase = deriveTrafficPhase(nextSettings);
    }

    this.selectedTrafficSettings = saveTrafficSettings(nextSettings);
    this.controlState.lastActionMessage = message;
  }

  private handleSavedBrainCompatibility(): void {
    if (this.savedBrainRecord === null || this.isSavedBrainCompatible()) {
      return;
    }

    this.populationManager.setSeedGenome(null);
    this.persistenceMessage =
      'Saved brain incompatible with current AI inputs. Random seed active.';
    this.controlState.lastActionMessage =
      'Saved brain kept on disk but not loaded into this run.';
  }

  private isSavedBrainCompatible(): boolean {
    if (this.savedBrainRecord === null) {
      return false;
    }

    return this.populationManager.isGenomeCompatible(this.savedBrainRecord.genome);
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

function createSyntheticFitnessSnapshot(progress: number, damaged: boolean) {
  return {
    totalFitness: progress,
    progressReward: progress,
    survivalReward: 0,
    forwardSpeedReward: 0,
    laneAlignmentReward: 0,
    obstaclePenalty: 0,
    obstacleAvoidanceReward: 0,
    edgePenalty: 0,
    steeringPenalty: 0,
    steeringOscillationPenalty: 0,
    laneOffsetPenalty: 0,
    laneRecoveryReward: 0,
    sustainedSteerPenalty: 0,
    lateralOffsetPenalty: 0,
    stagnationPenalty: 0,
    earlyCrashPenalty: damaged ? FITNESS_EARLY_CRASH_PENALTY : 0,
  };
}

function clampOptionIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length - 1, index));
}
