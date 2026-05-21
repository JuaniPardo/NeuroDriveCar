import { cloneBrainGenome } from '../ai/mutation';
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
const DEFAULT_RUNNING_SPEED: RunningSimulationSpeed = 1;
const DEFAULT_POPULATION_SIZE: PopulationSizeOption = 25;
const DEFAULT_MUTATION_RATE: MutationRateOption = 0.2;
const RANDOM_POPULATION_MESSAGE = 'Random population active.';

interface SimulationControlState {
  paused: boolean;
  runningSpeedMultiplier: RunningSimulationSpeed;
  selectedPopulationSize: PopulationSizeOption;
  selectedMutationRate: MutationRateOption;
  lastActionMessage: string;
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
  private readonly trafficManager: TrafficManager;
  private readonly hud: Hud;
  private readonly controlsPanel: ControlsPanel;
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
  private readonly controlState: SimulationControlState = {
    paused: false,
    runningSpeedMultiplier: DEFAULT_RUNNING_SPEED,
    selectedPopulationSize: DEFAULT_POPULATION_SIZE,
    selectedMutationRate: DEFAULT_MUTATION_RATE,
    lastActionMessage: 'Simulation ready.',
  };

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

    this.resize();
    this.synchronizeSimulationWorld();
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
    const bestCar = this.populationManager.getBestCar();
    const populationStats = this.populationManager.getStats();
    const steeringDebug = bestCar.getSteeringDebugSnapshot();

    ctx.clearRect(0, 0, this.width, this.height);
    this.renderBackground(ctx);
    this.renderWorld(ctx);
    this.hud.render(ctx, {
      width: this.width,
      height: this.height,
      framesPerSecond: this.framesPerSecond,
      controlMode: bestCar.getControlMode(),
      speed: bestCar.speed,
      damaged: bestCar.damaged,
      traveledDistance: populationStats.bestProgress,
      trafficCount: this.trafficManager.getActiveCount(),
      trafficTargetSpeed: this.trafficManager.getTargetSpeed(),
      laneSpeedLabel: this.trafficManager.getLaneSpeedDebugLabel(),
      activeTrafficSettings: this.activeTrafficSettings,
      selectedTrafficSettings: this.selectedTrafficSettings,
      steeringDebug,
      laneCenterOffset: this.road.getNearestLaneCenterOffsetNormalized(bestCar.x),
      edgeProximity: this.road.getBorderProximitySignal(bestCar.x),
      sensorHitCount: bestCar.getSensorHitCount(),
      sensorReadings: bestCar.getSensorReadings(),
      controlState: bestCar.getControlState(),
      brainSnapshot: bestCar.getBrainSnapshot(),
      populationSize: populationStats.populationSize,
      aliveCount: populationStats.aliveCount,
      crashedCount: populationStats.crashedCount,
      bestCarIndex: populationStats.bestCarIndex,
      bestProgress: populationStats.bestProgress,
      generation: populationStats.generation,
      paused: this.controlState.paused,
      simulationSpeed: this.getSimulationSpeedMultiplier(),
      selectedPopulationSize: this.controlState.selectedPopulationSize,
      selectedMutationRate: this.controlState.selectedMutationRate,
      lastControlAction: this.controlState.lastActionMessage,
      savedBrainExists: this.savedBrainRecord !== null,
      savedBestDistance: this.savedBrainRecord?.bestDistance ?? null,
      populationSource: populationStats.populationSource,
      mutationAmount: populationStats.mutationAmount,
      persistenceMessage: this.persistenceMessage,
    });
    this.controlsPanel.render({
      ...this.getControlSnapshot(),
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
    this.trafficManager.reset(this.populationManager.getBestCar());
    this.populationManager.updateSensors(
      this.road.borderSegments,
      this.trafficManager.getTrafficPolygons()
    );
    this.populationManager.updateTrainingSignals(0, this.road.borderSegments);
    this.populationManager.refreshStats();
    this.updatePersistenceMessageForCurrentSeed();
  }

  private advanceSimulation(deltaTimeSeconds: number): void {
    this.populationManager.update(deltaTimeSeconds, this.road.borderSegments);
    this.populationManager.refreshStats();

    const referenceCar = this.populationManager.getBestCar();

    this.trafficManager.update(
      deltaTimeSeconds,
      referenceCar,
      this.road.borderSegments,
      this.populationManager.getCars()
    );
    this.populationManager.updateSensors(
      this.road.borderSegments,
      this.trafficManager.getTrafficPolygons()
    );
    this.populationManager.updateTrainingSignals(
      deltaTimeSeconds,
      this.road.borderSegments
    );
    this.populationManager.refreshStats();

    const bestCar = this.populationManager.getBestCar();

    this.followTargetX = bestCar.x;
    this.followTargetY = bestCar.y;
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
}

function clampOptionIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length - 1, index));
}
