import { Camera } from './Camera';
import { Loop } from './Loop';
import type { Renderable, Updatable } from './types';
import { Road } from '../world/Road';
import { Car } from '../car/Car';

const BACKGROUND_TOP_COLOR = '#081114';
const BACKGROUND_BOTTOM_COLOR = '#020507';
const FRAME_SMOOTHING = 0.1;
const WORLD_RENDER_BUFFER = 180;
const HORIZON_LINE_COLOR = 'rgba(120, 195, 169, 0.08)';
const PLAYER_LANE_INDEX = 1;

export class Game implements Updatable, Renderable {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly loop: Loop;
  private readonly resizeObserver: () => void;
  private readonly road: Road;
  private readonly camera: Camera;
  private readonly playerCar: Car;
  private backgroundGradient: CanvasGradient | null = null;
  private width = 0;
  private height = 0;
  private elapsedTimeSeconds = 0;
  private deltaTimeSeconds = 0;
  private framesPerSecond = 0;
  private followTargetX = 0;
  private followTargetY = 0;

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
    this.playerCar = new Car(this.road.getLaneCenter(PLAYER_LANE_INDEX), 0);
    this.resizeObserver = () => {
      this.resize();
    };

    this.container.append(this.canvas);
    this.context.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', this.resizeObserver);
  }

  public start(): void {
    this.loop.start();
  }

  public destroy(): void {
    this.loop.stop();
    this.playerCar.destroy();
    window.removeEventListener('resize', this.resizeObserver);
    this.canvas.remove();
  }

  public update(deltaTimeSeconds: number): void {
    this.deltaTimeSeconds = deltaTimeSeconds;
    this.elapsedTimeSeconds += deltaTimeSeconds;
    this.playerCar.update(deltaTimeSeconds, this.road.borderSegments);
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
    this.playerCar.render(ctx);
    ctx.restore();
  }

  private renderDebugOverlay(ctx: CanvasRenderingContext2D): void {
    const panelWidth = 236;
    const panelHeight = 224;
    const x = 16;
    const y = 16;

    ctx.save();
    ctx.fillStyle = 'rgba(4, 12, 15, 0.84)';
    ctx.strokeStyle = 'rgba(127, 224, 196, 0.28)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, panelHeight - 1);

    ctx.fillStyle = '#d7e5de';
    ctx.font = '12px "SF Mono", Monaco, monospace';
    ctx.textBaseline = 'top';

    ctx.fillText('NEURODRIVECAR / MVP 04', x + 12, y + 12);
    ctx.fillText(`FPS ${this.framesPerSecond.toFixed(1)}`, x + 12, y + 34);
    ctx.fillText(
      `DT ${(this.deltaTimeSeconds * 1000).toFixed(2)} ms`,
      x + 12,
      y + 50
    );
    ctx.fillText(`CAMERA ${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}`, x + 12, y + 66);
    ctx.fillText(`TARGET ${this.followTargetX.toFixed(1)}, ${this.followTargetY.toFixed(1)}`, x + 12, y + 82);
    ctx.fillText(`CAR ${this.playerCar.x.toFixed(1)}, ${this.playerCar.y.toFixed(1)}`, x + 12, y + 98);
    ctx.fillText(`SPEED ${this.playerCar.speed.toFixed(1)}`, x + 12, y + 114);
    ctx.fillText(`ANGLE ${this.playerCar.angle.toFixed(2)} rad`, x + 12, y + 130);
    ctx.fillText(`STEER ${this.playerCar.steeringAngle.toFixed(2)} rad`, x + 12, y + 146);
    ctx.fillText(
      `VEL DIR ${this.getVelocityDirectionLabel()}`,
      x + 12,
      y + 162
    );
    ctx.fillText(`LANE 1 ${this.road.getLaneCenter(0).toFixed(1)}`, x + 12, y + 178);
    ctx.fillText(`STATE ${this.playerCar.damaged ? 'DAMAGED' : 'ACTIVE'}`, x + 12, y + 194);
    ctx.fillText(
      `IMPACT ${this.getImpactLabel()}`,
      x + 12,
      y + 210
    );

    ctx.restore();
  }

  private getVelocityDirectionLabel(): string {
    if (Math.abs(this.playerCar.speed) < 0.001) {
      return 'STOP';
    }

    return this.playerCar.speed > 0 ? 'FORWARD' : 'REVERSE';
  }

  private getImpactLabel(): string {
    if (this.playerCar.collisionPoint === null) {
      return 'NONE';
    }

    const { x, y } = this.playerCar.collisionPoint;

    return `${x.toFixed(1)}, ${y.toFixed(1)}`;
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
