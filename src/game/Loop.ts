import type { Renderable, Updatable } from './types';

const MAX_DELTA_TIME_SECONDS = 0.1;

export class Loop {
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private readonly updatable: Updatable;
  private readonly renderable: Renderable;

  public constructor(updatable: Updatable, renderable: Renderable) {
    this.updatable = updatable;
    this.renderable = renderable;
  }

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.lastFrameTime = performance.now();
    this.animationFrameId = window.requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (this.animationFrameId === null) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private readonly tick = (currentFrameTime: number): void => {
    const rawDeltaTimeSeconds =
      (currentFrameTime - this.lastFrameTime) / 1000;
    const deltaTimeSeconds = Math.min(
      rawDeltaTimeSeconds,
      MAX_DELTA_TIME_SECONDS
    );

    this.lastFrameTime = currentFrameTime;

    this.updatable.update(deltaTimeSeconds);
    this.renderable.render();

    this.animationFrameId = window.requestAnimationFrame(this.tick);
  };
}
