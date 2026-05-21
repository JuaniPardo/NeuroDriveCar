import type { Brain, BrainGenome } from './Brain';
import type { NeuralNetworkSnapshot } from './NeuralNetwork';

interface MutableLayerSnapshot {
  inputCount: number;
  outputCount: number;
  weights: number[][];
  biases: number[];
  outputs: number[];
  visualOutputs: number[];
}

interface MutableNetworkSnapshot {
  layerSizes: number[];
  layers: MutableLayerSnapshot[];
}

export function cloneBrainGenome(genome: BrainGenome): BrainGenome {
  return {
    network: cloneNetworkSnapshot(genome.network),
  };
}

export function applyMutatedGenome(
  brain: Brain,
  genome: BrainGenome,
  mutationAmount: number
): void {
  const nextGenome = cloneBrainGenome(genome);

  mutateNetworkSnapshot(nextGenome.network, mutationAmount);
  brain.importGenome(nextGenome);
}

function cloneNetworkSnapshot(
  snapshot: NeuralNetworkSnapshot
): NeuralNetworkSnapshot {
  const mutableSnapshot: MutableNetworkSnapshot = {
    layerSizes: [...snapshot.layerSizes],
    layers: snapshot.layers.map((layer) => ({
      inputCount: layer.inputCount,
      outputCount: layer.outputCount,
      weights: layer.weights.map((row) => [...row]),
      biases: [...layer.biases],
      outputs: [...layer.outputs],
      visualOutputs: [...layer.visualOutputs],
    })),
  };

  return mutableSnapshot;
}

function mutateNetworkSnapshot(
  snapshot: NeuralNetworkSnapshot,
  mutationAmount: number
): void {
  const mutableSnapshot = snapshot as MutableNetworkSnapshot;

  for (let layerIndex = 0; layerIndex < mutableSnapshot.layers.length; layerIndex += 1) {
    const layer = mutableSnapshot.layers[layerIndex];

    for (let outputIndex = 0; outputIndex < layer.outputCount; outputIndex += 1) {
      layer.biases[outputIndex] = mutateValue(
        layer.biases[outputIndex],
        mutationAmount
      );

      for (let inputIndex = 0; inputIndex < layer.inputCount; inputIndex += 1) {
        layer.weights[outputIndex][inputIndex] = mutateValue(
          layer.weights[outputIndex][inputIndex],
          mutationAmount
        );
      }
    }
  }
}

function mutateValue(value: number, mutationAmount: number): number {
  return value + (Math.random() * 2 - 1) * mutationAmount;
}
