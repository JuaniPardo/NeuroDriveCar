import type { ControlState } from '../car/Controls';
import {
  NeuralNetwork,
  type NeuralLayerSnapshot,
  type NeuralNetworkSnapshot,
} from './NeuralNetwork';

const DEFAULT_HIDDEN_LAYER_SIZE = 6;
const FORWARD_OUTPUT_THRESHOLD = 0.48;
const STEERING_OUTPUT_THRESHOLD = 0.5;
const REVERSE_OUTPUT_THRESHOLD = 0.6;
const STEER_INTENT_DEAD_ZONE = 0.1;
const REVERSE_OBSTACLE_GATE_THRESHOLD = 0.7;

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

export interface BrainDecision extends ControlState {
  steerIntent: number;
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

  public decide(sensorInputs: readonly number[]): BrainDecision {
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
    const frontObstacleSignal = getFrontSensorSignal(sensorInputs);
    const forward =
      forwardVisual > reverseVisual &&
      forwardVisual > FORWARD_OUTPUT_THRESHOLD;
    const reverse =
      reverseVisual > forwardVisual &&
      reverseVisual > REVERSE_OUTPUT_THRESHOLD &&
      frontObstacleSignal > REVERSE_OBSTACLE_GATE_THRESHOLD;
    const left =
      leftVisual > rightVisual && leftVisual > STEERING_OUTPUT_THRESHOLD;
    const right =
      rightVisual > leftVisual && rightVisual > STEERING_OUTPUT_THRESHOLD;
    const rawSteerIntent = rightVisual - leftVisual;
    const steerIntent =
      Math.abs(rawSteerIntent) < STEER_INTENT_DEAD_ZONE ? 0 : rawSteerIntent;

    return {
      forward,
      left,
      right,
      reverse,
      steerIntent,
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

  public canImportGenome(genome: BrainGenome): boolean {
    const expectedLayerSizes = this.network.layerSizes;
    const snapshotLayerSizes = genome.network.layerSizes;

    if (expectedLayerSizes.length !== snapshotLayerSizes.length) {
      return false;
    }

    for (let index = 0; index < expectedLayerSizes.length; index += 1) {
      if (expectedLayerSizes[index] !== snapshotLayerSizes[index]) {
        return false;
      }
    }

    return true;
  }
}

function getFrontSensorSignal(sensorInputs: readonly number[]): number {
  if (sensorInputs.length === 0) {
    return 0;
  }

  const centerIndex = Math.floor(sensorInputs.length * 0.5);
  const leftIndex = Math.max(0, centerIndex - 1);
  const rightIndex = Math.min(sensorInputs.length - 1, centerIndex + 1);

  return Math.max(
    sensorInputs[leftIndex] ?? 0,
    sensorInputs[centerIndex] ?? 0,
    sensorInputs[rightIndex] ?? 0
  );
}
