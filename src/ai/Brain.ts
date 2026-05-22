import type { ControlState } from '../car/Controls';
import {
  NeuralNetwork,
  type NeuralLayerSnapshot,
  type NeuralNetworkSnapshot,
} from './NeuralNetwork';

const DEFAULT_HIDDEN_LAYER_SIZE = 6;
const FORWARD_OUTPUT_THRESHOLD = 0.45;
const STEERING_OUTPUT_THRESHOLD = 0.45;
const REVERSE_OUTPUT_THRESHOLD = 0.6;
const STEER_INTENT_DEAD_ZONE = 0.05;
const REVERSE_OBSTACLE_GATE_THRESHOLD = 0.7;

// Input order: all normalized sensor rays first, then lane-aware inputs.
export const BRAIN_LANE_AWARE_INPUT_LABELS = [
  'laneCenterOffsetNormalized',
  'headingErrorNormalized',
  'currentLaneBlocked',
  'leftLaneClear',
  'rightLaneClear',
] as const;

export const BRAIN_OUTPUT_LABELS = [
  'target-lane-keep',
  'target-lane-left',
  'target-lane-right',
  'speed-slow',
] as const;

export type BrainOutputLabel = (typeof BRAIN_OUTPUT_LABELS)[number];

export interface BrainSnapshot {
  readonly inputs: readonly number[];
  readonly inputLabels: readonly string[];
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

export interface BrainOutputDebugSnapshot {
  leftOutput: number;
  rightOutput: number;
  rawSteerIntent: number;
}

export class Brain {
  public readonly network: NeuralNetwork;
  public readonly lastOutputs: number[];
  public readonly lastBinaryOutputs: number[];
  private lastRawSteerIntent = 0;

  public constructor(inputCount: number, hiddenLayerSize = DEFAULT_HIDDEN_LAYER_SIZE) {
    this.network = new NeuralNetwork([
      inputCount,
      hiddenLayerSize,
      BRAIN_OUTPUT_LABELS.length,
    ]);
    this.lastOutputs = new Array(BRAIN_OUTPUT_LABELS.length).fill(0);
    this.lastBinaryOutputs = new Array(BRAIN_OUTPUT_LABELS.length).fill(0);
  }

  public decide(sensorInputs: readonly number[]): BrainDecision {
    const outputs = this.network.feedForward(sensorInputs);
    const outputLayer = this.network.layers[this.network.layers.length - 1];
    const visualOutputs = outputLayer?.visualOutputs ?? outputs;

    for (let index = 0; index < this.lastOutputs.length; index += 1) {
      this.lastOutputs[index] = visualOutputs[index] ?? 0;
      this.lastBinaryOutputs[index] = outputs[index] ?? 0;
    }

    const keepLaneVisual = visualOutputs[0] ?? 0;
    const leftLaneVisual = visualOutputs[1] ?? 0;
    const rightLaneVisual = visualOutputs[2] ?? 0;
    const slowDownVisual = visualOutputs[3] ?? 0;

    const left = leftLaneVisual > keepLaneVisual && leftLaneVisual > rightLaneVisual && leftLaneVisual > STEERING_OUTPUT_THRESHOLD;
    const right = rightLaneVisual > keepLaneVisual && rightLaneVisual > leftLaneVisual && rightLaneVisual > STEERING_OUTPUT_THRESHOLD;
    
    // speed-slow is active if it's the strongest or above threshold
    const reverse = slowDownVisual > FORWARD_OUTPUT_THRESHOLD;
    const forward = !reverse;

    const rawSteerIntent = rightLaneVisual - leftLaneVisual;
    this.lastRawSteerIntent = rawSteerIntent;
    const steerIntent = Math.abs(rawSteerIntent) < STEER_INTENT_DEAD_ZONE ? 0 : rawSteerIntent;

    return {
      forward,
      left,
      right,
      reverse,
      steerIntent,
    };
  }

  public getSnapshot(
    sensorInputs: readonly number[],
    inputLabels: readonly string[]
  ): BrainSnapshot {
    const network = this.network.getSnapshot();

    return {
      inputs: sensorInputs,
      inputLabels,
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

  public getOutputDebugSnapshot(): BrainOutputDebugSnapshot {
    return {
      leftOutput: this.lastOutputs[1] ?? 0,
      rightOutput: this.lastOutputs[2] ?? 0,
      rawSteerIntent: this.lastRawSteerIntent,
    };
  }
}

export function getBrainInputCount(sensorRayCount: number): number {
  return sensorRayCount + BRAIN_LANE_AWARE_INPUT_LABELS.length;
}

export function getBrainInputLabels(sensorRayCount: number): string[] {
  const labels: string[] = [];

  for (let index = 0; index < sensorRayCount; index += 1) {
    labels.push(`sensorRay${index + 1}`);
  }

  labels.push(...BRAIN_LANE_AWARE_INPUT_LABELS);

  return labels;
}

function getCurrentLaneBlockedInput(inputs: readonly number[]): number {
  const index = inputs.length - 3;

  if (index < 0) {
    return 0;
  }

  return inputs[index] ?? 0;
}
