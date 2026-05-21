import type { ControlState } from '../car/Controls';
import {
  NeuralNetwork,
  type NeuralLayerSnapshot,
  type NeuralNetworkSnapshot,
} from './NeuralNetwork';

const DEFAULT_HIDDEN_LAYER_SIZE = 6;

export const BRAIN_OUTPUT_LABELS = [
  'forward',
  'left',
  'right',
  'reverse',
] as const;

export type BrainOutputLabel = (typeof BRAIN_OUTPUT_LABELS)[number];

export interface BrainSnapshot {
  readonly inputs: readonly number[];
  readonly outputs: readonly number[];
  readonly visualOutputs: readonly number[];
  readonly outputLabels: readonly BrainOutputLabel[];
  readonly network: NeuralNetworkSnapshot;
  readonly hiddenLayers: readonly NeuralLayerSnapshot[];
}

export interface BrainGenome {
  readonly network: NeuralNetworkSnapshot;
}

export class Brain {
  public readonly network: NeuralNetwork;
  public readonly lastOutputs: number[];

  public constructor(inputCount: number, hiddenLayerSize = DEFAULT_HIDDEN_LAYER_SIZE) {
    this.network = new NeuralNetwork([
      inputCount,
      hiddenLayerSize,
      BRAIN_OUTPUT_LABELS.length,
    ]);
    this.lastOutputs = new Array(BRAIN_OUTPUT_LABELS.length).fill(0);
  }

  public decide(sensorInputs: readonly number[]): ControlState {
    const outputs = this.network.feedForward(sensorInputs);
    const outputLayer = this.network.layers[this.network.layers.length - 1];
    const visualOutputs = outputLayer?.visualOutputs ?? outputs;

    for (let index = 0; index < this.lastOutputs.length; index += 1) {
      this.lastOutputs[index] = outputs[index];
    }

    const forwardVisual = visualOutputs[0] ?? 0;
    const leftVisual = visualOutputs[1] ?? 0;
    const rightVisual = visualOutputs[2] ?? 0;
    const reverseVisual = visualOutputs[3] ?? 0;
    const noDriveCommand = outputs[0] === 0 && outputs[3] === 0;
    const bothDriveCommands = outputs[0] === 1 && outputs[3] === 1;
    const noSteerCommand = outputs[1] === 0 && outputs[2] === 0;
    const bothSteerCommands = outputs[1] === 1 && outputs[2] === 1;

    const forward =
      noDriveCommand
        ? forwardVisual >= reverseVisual
        : bothDriveCommands
          ? forwardVisual >= reverseVisual
          : outputs[0] === 1;
    const reverse =
      noDriveCommand
        ? false
        : bothDriveCommands
          ? reverseVisual > forwardVisual
          : outputs[3] === 1;
    const left =
      noSteerCommand
        ? false
        : bothSteerCommands
          ? leftVisual > rightVisual
          : outputs[1] === 1;
    const right =
      noSteerCommand
        ? false
        : bothSteerCommands
          ? rightVisual >= leftVisual
          : outputs[2] === 1;

    return {
      forward,
      left,
      right,
      reverse,
    };
  }

  public getSnapshot(sensorInputs: readonly number[]): BrainSnapshot {
    const network = this.network.getSnapshot();

    return {
      inputs: sensorInputs,
      outputs: this.lastOutputs,
      visualOutputs:
        network.layers[network.layers.length - 1]?.visualOutputs ?? this.lastOutputs,
      outputLabels: BRAIN_OUTPUT_LABELS,
      network,
      hiddenLayers: network.layers.slice(0, -1),
    };
  }

  public exportGenome(): BrainGenome {
    return {
      network: this.network.getSnapshot(),
    };
  }

  public importGenome(genome: BrainGenome): void {
    this.network.applySnapshot(genome.network);
  }
}
