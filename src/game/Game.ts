import { cloneBrainGenome } from '../ai/mutation';
import { PopulationManager } from '../population/PopulationManager';
import { TrafficManager } from '../traffic/TrafficManager';
import { Hud } from '../ui/Hud';
import {
  deleteBestBrain,
  loadBestBrain,
  saveBestBrain,
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
const POPULATION_SIZE = 25;
const RESTART_KEY = 'r';
const SAVE_BRAIN_KEY = 's';
const LOAD_BRAIN_KEY = 'l';
const DELETE_BRAIN_KEY = 'd';
const RANDOM_POPULATION_MESSAGE = 'Random population active.';

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
      spawnX: this.populationSpawnX,
      spawnY: this.populationSpawnY,
      populationSize: POPULATION_SIZE,
      seedGenome: this.savedBrainRecord?.genome ?? null,
    });
    this.trafficManager = new TrafficManager(this.road);
    this.resizeObserver = () => {
      this.resize();
    };
    this.keyCommandListener = (event: KeyboardEvent) => {
      this.handleKeyCommand(event);
    };

    this.container.append(this.canvas);
    this.context.imageSmoothingEnabled = false;

    this.resize();
    this.restartSimulation();
    window.addEventListener('resize', this.resizeObserver);
    window.addEventListener('keydown', this.keyCommandListener);
  }

  public start(): void {
    this.loop.start();
  }

  public destroy(): void {
    this.loop.stop();
    this.populationManager.destroy();
    this.trafficManager.destroy();
    window.removeEventListener('resize', this.resizeObserver);
    window.removeEventListener('keydown', this.keyCommandListener);
    this.canvas.remove();
  }

  public update(deltaTimeSeconds: number): void {
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
    this.populationManager.refreshStats();

    const bestCar = this.populationManager.getBestCar();

    this.followTargetX = bestCar.x;
    this.followTargetY = bestCar.y;
    this.camera.follow(this.followTargetX, this.followTargetY, deltaTimeSeconds);

    const instantFramesPerSecond = deltaTimeSeconds > 0 ? 1 / deltaTimeSeconds : 0;

    if (this.framesPerSecond === 0) {
      this.framesPerSecond = instantFramesPerSecond;
      return;
    }

    this.framesPerSecond +=
      (instantFramesPerSecond - this.framesPerSecond) * FRAME_SMOOTHING;
  }

  public render(): void {
    const ctx = this.context;
    const bestCar = this.populationManager.getBestCar();
    const populationStats = this.populationManager.getStats();

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
      savedBrainExists: this.savedBrainRecord !== null,
      savedBestDistance: this.savedBrainRecord?.bestDistance ?? null,
      populationSource: populationStats.populationSource,
      mutationAmount: populationStats.mutationAmount,
      persistenceMessage: this.persistenceMessage,
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
      this.restartSimulation();
    }
  }

  private restartSimulation(nextMessage?: string): void {
    this.populationManager.reset();
    this.trafficManager.reset(this.populationManager.getBestCar());
    this.populationManager.updateSensors(
      this.road.borderSegments,
      this.trafficManager.getTrafficPolygons()
    );
    this.populationManager.refreshStats();
    this.camera.reset(this.populationSpawnX, this.populationSpawnY);
    this.followTargetX = this.populationSpawnX;
    this.followTargetY = this.populationSpawnY;
    this.framesPerSecond = 0;

    if (nextMessage !== undefined) {
      this.persistenceMessage = nextMessage;
      return;
    }

    this.updatePersistenceMessageForCurrentSeed();
  }

  private saveCurrentBestBrain(): void {
    const genome = this.populationManager.getBestBrainGenome();

    if (genome === null) {
      this.persistenceMessage = 'No AI brain available to save.';
      return;
    }

    const bestDistance = this.populationManager.getStats().bestProgress;
    const savedRecord = saveBestBrain(cloneBrainGenome(genome), bestDistance);

    if (savedRecord === null) {
      this.persistenceMessage = 'localStorage unavailable. Save skipped.';
      return;
    }

    this.savedBrainRecord = savedRecord;
    this.populationManager.setSeedGenome(savedRecord.genome);
    this.persistenceMessage = `Saved best brain @ ${bestDistance.toFixed(1)}.`;
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
}
