import { Loop } from './Loop';
import type { Renderable, Updatable } from './types';

const BACKGROUND_TOP_COLOR = '#081114';
const BACKGROUND_BOTTOM_COLOR = '#020507';
const GRID_LINE_COLOR = 'rgba(99, 172, 150, 0.08)';
const GRID_ACCENT_COLOR = 'rgba(127, 224, 196, 0.06)';
const FRAME_SMOOTHING = 0.1;

export class Game implements Updatable, Renderable {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly loop: Loop;
  private readonly resizeObserver: () => void;
  private backgroundGradient: CanvasGradient | null = null;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private elapsedTimeSeconds = 0;
  private deltaTimeSeconds = 0;
  private framesPerSecond = 0;

  public constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');

    const context = this.canvas.getContext('2d');

    if (context === null) {
      throw new Error('Canvas 2D context is not available.');
    }

    this.context = context;
    this.loop = new Loop(this, this);
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
    window.removeEventListener('resize', this.resizeObserver);
    this.canvas.remove();
  }

  public update(deltaTimeSeconds: number): void {
    this.deltaTimeSeconds = deltaTimeSeconds;
    this.elapsedTimeSeconds += deltaTimeSeconds;

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
    this.renderGrid(ctx);
    this.renderDebugOverlay(ctx);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.width = nextWidth;
    this.height = nextHeight;
    this.pixelRatio = nextPixelRatio;

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

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    const spacing = 48;
    const offsetY = (this.elapsedTimeSeconds * 18) % spacing;

    ctx.save();
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += spacing) {
      ctx.strokeStyle = x % (spacing * 4) === 0 ? GRID_ACCENT_COLOR : GRID_LINE_COLOR;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.height);
      ctx.stroke();
    }

    for (let y = -spacing; y <= this.height + spacing; y += spacing) {
      const lineY = y + offsetY;
      ctx.strokeStyle = y % (spacing * 4) === 0 ? GRID_ACCENT_COLOR : GRID_LINE_COLOR;
      ctx.beginPath();
      ctx.moveTo(0, lineY + 0.5);
      ctx.lineTo(this.width, lineY + 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderDebugOverlay(ctx: CanvasRenderingContext2D): void {
    const panelWidth = 210;
    const panelHeight = 96;
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

    ctx.fillText('NEURODRIVECAR / MVP 01', x + 12, y + 12);
    ctx.fillText(`FPS ${this.framesPerSecond.toFixed(1)}`, x + 12, y + 34);
    ctx.fillText(
      `DT ${(this.deltaTimeSeconds * 1000).toFixed(2)} ms`,
      x + 12,
      y + 50
    );
    ctx.fillText(`SIZE ${this.width} x ${this.height}`, x + 12, y + 66);
    ctx.fillText(`DPR ${this.pixelRatio.toFixed(2)}`, x + 12, y + 82);

    ctx.restore();
  }

  private createBackgroundGradient(): CanvasGradient {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, BACKGROUND_TOP_COLOR);
    gradient.addColorStop(1, BACKGROUND_BOTTOM_COLOR);

    return gradient;
  }
}
