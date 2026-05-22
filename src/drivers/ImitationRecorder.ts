import type { DriverMode } from './DriverMode';

export interface ImitationSample {
  readonly inputs: readonly number[];
  readonly outputs: {
    readonly forward: number;
    readonly brake: number;
    readonly steer: number;
  };
  readonly timestamp: number;
  readonly driverMode: Extract<DriverMode, 'manual' | 'heuristic'>;
}

const DEFAULT_MAX_SAMPLES = 2048;

export class ImitationRecorder {
  private readonly maxSamples: number;
  private readonly samples: ImitationSample[] = [];

  public constructor(maxSamples = DEFAULT_MAX_SAMPLES) {
    this.maxSamples = Math.max(1, maxSamples);
  }

  public clear(): void {
    this.samples.length = 0;
  }

  public record(sample: ImitationSample): void {
    if (this.samples.length >= this.maxSamples) {
      this.samples.shift();
    }

    this.samples.push({
      inputs: [...sample.inputs],
      outputs: {
        ...sample.outputs,
      },
      timestamp: sample.timestamp,
      driverMode: sample.driverMode,
    });
  }

  public getSamples(): readonly ImitationSample[] {
    return this.samples;
  }

  public getSampleCount(): number {
    return this.samples.length;
  }
}
