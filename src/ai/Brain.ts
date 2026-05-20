import type { ControlState } from '../car/Controls';
import { NeuralNetwork } from './NeuralNetwork';

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
  readonly layerSizes: readonly number[];
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

    for (let index = 0; index < this.lastOutputs.length; index += 1) {
      this.lastOutputs[index] = outputs[index];
    }

    return {
      forward: outputs[0] === 1,
      left: outputs[1] === 1,
      right: outputs[2] === 1,
      reverse: outputs[3] === 1,
    };
  }

  public getSnapshot(sensorInputs: readonly number[]): BrainSnapshot {
    return {
      inputs: sensorInputs,
      outputs: this.lastOutputs,
      layerSizes: this.network.layerSizes,
    };
  }
}
