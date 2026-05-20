import { Camera } from './Camera';
import { Loop } from './Loop';
import type { Renderable, Updatable } from './types';
import { Road } from '../world/Road';
import { Car } from '../car/Car';
import { TrafficManager } from '../traffic/TrafficManager';

const BACKGROUND_TOP_COLOR = '#081114';
const BACKGROUND_BOTTOM_COLOR = '#020507';
const FRAME_SMOOTHING = 0.1;
const WORLD_RENDER_BUFFER = 180;
const HORIZON_LINE_COLOR = 'rgba(120, 195, 169, 0.08)';
const PLAYER_LANE_INDEX = 1;
const RESTART_KEY = 'r';

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
  private readonly playerSpawnX: number;
  private readonly playerSpawnY: number;
  private readonly restartListener: (event: KeyboardEvent) => void;
  private backgroundGradient: CanvasGradient | null = null;
  private width = 0;
  private height = 0;
  private elapsedTimeSeconds = 0;
  private deltaTimeSeconds = 0;
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
    this.playerSpawnX = this.road.getLaneCenter(PLAYER_LANE_INDEX);
    this.playerSpawnY = 0;
    this.playerCar = new Car(this.playerSpawnX, this.playerSpawnY);
    this.trafficManager = new TrafficManager(this.road);
    this.resizeObserver = () => {
      this.resize();
    };
    this.restartListener = (event: KeyboardEvent) => {
      this.handleRestartKeyDown(event);
    };

    this.container.append(this.canvas);
    this.context.imageSmoothingEnabled = false;

    this.resize();
    this.restartSimulation();
    window.addEventListener('resize', this.resizeObserver);
    window.addEventListener('keydown', this.restartListener);
  }

  public start(): void {
    this.loop.start();
  }

  public destroy(): void {
    this.loop.stop();
    this.playerCar.destroy();
    this.trafficManager.destroy();
    window.removeEventListener('resize', this.resizeObserver);
    window.removeEventListener('keydown', this.restartListener);
    this.canvas.remove();
  }

  public update(deltaTimeSeconds: number): void {
    this.deltaTimeSeconds = deltaTimeSeconds;
    this.elapsedTimeSeconds += deltaTimeSeconds;
    this.playerCar.update(deltaTimeSeconds, this.road.borderSegments);
    this.trafficManager.update(
      deltaTimeSeconds,
      this.playerCar,
      this.road.borderSegments
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
    this.renderDebugOverlay(ctx);
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

  private renderDebugOverlay(ctx: CanvasRenderingContext2D): void {
    const panelWidth = 224;
    const panelHeight = 212;
    const x = 16;
    const y = 16;
    const trafficTargetSpeed = this.trafficManager.getTargetSpeed();
    const closingDelta = Math.abs(this.playerCar.speed) - trafficTargetSpeed;
    const statusLabel = this.playerCar.damaged ? 'DAMAGED' : 'ACTIVE';
    const statusColor = this.playerCar.damaged ? '#ff8a75' : '#cde7d5';
    const deltaColor = closingDelta >= 0 ? '#9cf0bd' : '#f0c67a';

    ctx.save();
    ctx.fillStyle = 'rgba(4, 12, 15, 0.84)';
    ctx.strokeStyle = 'rgba(127, 224, 196, 0.28)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, panelHeight - 1);

    ctx.fillStyle = '#d7e5de';
    ctx.font = '12px "SF Mono", Monaco, monospace';
    ctx.textBaseline = 'top';

    ctx.fillText('NEURODRIVECAR / MVP 05', x + 12, y + 12);
    ctx.fillText(`FPS ${this.framesPerSecond.toFixed(1)}`, x + 12, y + 36);

    ctx.fillStyle = statusColor;
    ctx.fillText(`STATE ${statusLabel}`, x + 12, y + 58);

    ctx.fillStyle = '#d7e5de';
    ctx.fillText(
      `SPEED ${Math.abs(this.playerCar.speed).toFixed(1)} ${this.getVelocityDirectionLabel()}`,
      x + 12,
      y + 80
    );
    ctx.fillText(`DIST ${this.traveledDistance.toFixed(1)}`, x + 12, y + 102);
    ctx.fillText(`TRAFFIC ${this.trafficManager.getActiveCount()}`, x + 12, y + 124);
    ctx.fillText(`T SPEED ${trafficTargetSpeed.toFixed(1)}`, x + 12, y + 146);

    ctx.fillStyle = deltaColor;
    ctx.fillText(`DELTA ${closingDelta.toFixed(1)}`, x + 12, y + 168);

    ctx.fillStyle = '#9db7aa';
    ctx.fillText(`L SPD ${this.trafficManager.getLaneSpeedDebugLabel()}`, x + 12, y + 190);

    ctx.restore();
  }

  private getVelocityDirectionLabel(): string {
    if (Math.abs(this.playerCar.speed) < 0.001) {
      return 'STOP';
    }

    return this.playerCar.speed > 0 ? 'FORWARD' : 'REVERSE';
  }

  private handleRestartKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() !== RESTART_KEY) {
      return;
    }

    event.preventDefault();
    this.restartSimulation();
  }

  private restartSimulation(): void {
    this.playerCar.reset(this.playerSpawnX, this.playerSpawnY);
    this.trafficManager.reset(this.playerCar);
    this.camera.reset(this.playerSpawnX, this.playerSpawnY);
    this.followTargetX = this.playerSpawnX;
    this.followTargetY = this.playerSpawnY;
    this.traveledDistance = 0;
    this.lastPlayerX = this.playerSpawnX;
    this.lastPlayerY = this.playerSpawnY;
    this.deltaTimeSeconds = 0;
    this.elapsedTimeSeconds = 0;
    this.framesPerSecond = 0;
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
