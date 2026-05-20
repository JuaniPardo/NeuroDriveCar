import { Camera } from './Camera';
import { Loop } from './Loop';
import type { Renderable, Updatable } from './types';
import { Road } from '../world/Road';
import { Car, type CarControlMode } from '../car/Car';
import { TrafficManager } from '../traffic/TrafficManager';
import { Hud } from '../ui/Hud';

const BACKGROUND_TOP_COLOR = '#081114';
const BACKGROUND_BOTTOM_COLOR = '#020507';
const FRAME_SMOOTHING = 0.1;
const WORLD_RENDER_BUFFER = 180;
const HORIZON_LINE_COLOR = 'rgba(120, 195, 169, 0.08)';
const PLAYER_LANE_INDEX = 1;
const RESTART_KEY = 'r';
const CONTROL_MODE_TOGGLE_KEY = 'm';

export class Game implements Updatable, Renderable {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly loop: Loop;
  private readonly resizeObserver: () => void;
  private readonly road: Road;
  private readonly camera: Camera;
  private readonly playerCar: Car;
  private readonly trafficManager: TrafficManager;
  private readonly hud: Hud;
  private readonly playerSpawnX: number;
  private readonly playerSpawnY: number;
  private readonly keyCommandListener: (event: KeyboardEvent) => void;
  private backgroundGradient: CanvasGradient | null = null;
  private width = 0;
  private height = 0;
  private elapsedTimeSeconds = 0;
  private framesPerSecond = 0;
  private followTargetX = 0;
  private followTargetY = 0;
  private traveledDistance = 0;
  private lastPlayerX = 0;
  private lastPlayerY = 0;

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
    this.playerSpawnX = this.road.getLaneCenter(PLAYER_LANE_INDEX);
    this.playerSpawnY = 0;
    this.playerCar = new Car(this.playerSpawnX, this.playerSpawnY, 42, 74, undefined, {
      controlMode: 'ai',
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
    this.playerCar.destroy();
    this.trafficManager.destroy();
    window.removeEventListener('resize', this.resizeObserver);
    window.removeEventListener('keydown', this.keyCommandListener);
    this.canvas.remove();
  }

  public update(deltaTimeSeconds: number): void {
    this.elapsedTimeSeconds += deltaTimeSeconds;
    this.playerCar.update(deltaTimeSeconds, this.road.borderSegments);
    this.trafficManager.update(
      deltaTimeSeconds,
      this.playerCar,
      this.road.borderSegments
    );
    this.playerCar.updateSensors(
      this.road.borderSegments,
      this.trafficManager.getTrafficPolygons()
    );
    this.traveledDistance += Math.hypot(
      this.playerCar.x - this.lastPlayerX,
      this.playerCar.y - this.lastPlayerY
    );
    this.lastPlayerX = this.playerCar.x;
    this.lastPlayerY = this.playerCar.y;
    this.followTargetX = this.playerCar.x;
    this.followTargetY = this.playerCar.y;
    this.camera.follow(
      this.followTargetX,
      this.followTargetY,
      deltaTimeSeconds
    );

    const instantFramesPerSecond =
      deltaTimeSeconds > 0 ? 1 / deltaTimeSeconds : 0;

    if (this.framesPerSecond === 0) {
      this.framesPerSecond = instantFramesPerSecond;
      return;
    }

    this.framesPerSecond +=
      (instantFramesPerSecond - this.framesPerSecond) * FRAME_SMOOTHING;
  }

  public render(): void {
    const ctx = this.context;

    ctx.clearRect(0, 0, this.width, this.height);
    this.renderBackground(ctx);
    this.renderWorld(ctx);
    this.hud.render(ctx, {
      width: this.width,
      height: this.height,
      framesPerSecond: this.framesPerSecond,
      controlMode: this.playerCar.getControlMode(),
      speed: this.playerCar.speed,
      damaged: this.playerCar.damaged,
      traveledDistance: this.traveledDistance,
      trafficCount: this.trafficManager.getActiveCount(),
      trafficTargetSpeed: this.trafficManager.getTargetSpeed(),
      laneSpeedLabel: this.trafficManager.getLaneSpeedDebugLabel(),
      sensorHitCount: this.playerCar.getSensorHitCount(),
      sensorReadings: this.playerCar.getSensorReadings(),
      controlState: this.playerCar.getControlState(),
      brainSnapshot: this.playerCar.getBrainSnapshot(),
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
    const visibleTop =
      this.camera.y - screenAnchorY - WORLD_RENDER_BUFFER;
    const visibleBottom =
      this.camera.y + (this.height - screenAnchorY) + WORLD_RENDER_BUFFER;

    ctx.save();
    ctx.translate(screenCenterX - this.camera.x, screenAnchorY - this.camera.y);
    this.renderWorldBackdrop(ctx, visibleTop, visibleBottom);
    this.road.render(ctx, visibleTop, visibleBottom);
    this.road.renderDebug(ctx, visibleTop, visibleBottom);
    this.trafficManager.render(ctx);
    this.trafficManager.renderDebug(ctx, visibleTop, visibleBottom);
    this.playerCar.render(ctx);
    ctx.restore();
  }

  private handleKeyCommand(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === RESTART_KEY) {
      event.preventDefault();
      this.restartSimulation();
      return;
    }

    if (key === CONTROL_MODE_TOGGLE_KEY) {
      event.preventDefault();
      this.togglePlayerControlMode();
    }
  }

  private restartSimulation(): void {
    this.playerCar.reset(this.playerSpawnX, this.playerSpawnY);
    this.trafficManager.reset(this.playerCar);
    this.playerCar.updateSensors(
      this.road.borderSegments,
      this.trafficManager.getTrafficPolygons()
    );
    this.camera.reset(this.playerSpawnX, this.playerSpawnY);
    this.followTargetX = this.playerSpawnX;
    this.followTargetY = this.playerSpawnY;
    this.traveledDistance = 0;
    this.lastPlayerX = this.playerSpawnX;
    this.lastPlayerY = this.playerSpawnY;
    this.elapsedTimeSeconds = 0;
    this.framesPerSecond = 0;
  }

  private togglePlayerControlMode(): void {
    const nextMode: CarControlMode =
      this.playerCar.getControlMode() === 'ai' ? 'player' : 'ai';

    this.playerCar.setControlMode(nextMode);
    this.playerCar.updateSensors(
      this.road.borderSegments,
      this.trafficManager.getTrafficPolygons()
    );
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
