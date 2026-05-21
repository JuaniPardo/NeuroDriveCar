export interface NeuralLayerSnapshot {
  readonly inputCount: number;
  readonly outputCount: number;
  readonly weights: readonly (readonly number[])[];
  readonly biases: readonly number[];
  readonly outputs: readonly number[];
  readonly visualOutputs: readonly number[];
}

export interface NeuralNetworkSnapshot {
  readonly layerSizes: readonly number[];
  readonly layers: readonly NeuralLayerSnapshot[];
}

const FORWARD_OUTPUT_INDEX = 0;
const REVERSE_OUTPUT_INDEX = 3;
const INITIAL_FORWARD_OUTPUT_BIAS = 0.55;
const INITIAL_REVERSE_OUTPUT_BIAS = -0.25;

export class NeuralLayer {
  public readonly inputCount: number;
  public readonly outputCount: number;
  public readonly weights: number[][];
  public readonly biases: number[];
  public readonly outputs: number[];
  public readonly visualOutputs: number[];

  public constructor(
    inputCount: number,
    outputCount: number,
    outputBiases: Partial<Record<number, number>> = {}
  ) {
    this.inputCount = inputCount;
    this.outputCount = outputCount;
    this.weights = [];
    this.biases = [];
    this.outputs = new Array(outputCount).fill(0);
    this.visualOutputs = new Array(outputCount).fill(0);

    for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
      const row = new Array(inputCount).fill(0);

      for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
        row[inputIndex] = randomWeight();
      }

      this.weights.push(row);
      this.biases.push(randomWeight());
    }

    for (const [outputIndexText, outputBias] of Object.entries(outputBiases)) {
      const outputIndex = Number(outputIndexText);

      if (
        !Number.isInteger(outputIndex) ||
        outputIndex < 0 ||
        outputIndex >= this.outputCount ||
        outputBias === undefined ||
        outputBias === 0
      ) {
        continue;
      }

      this.biases[outputIndex] += outputBias;
    }
  }

  public feedForward(inputs: readonly number[]): readonly number[] {
    for (let outputIndex = 0; outputIndex < this.outputCount; outputIndex += 1) {
      let sum = this.biases[outputIndex];

      for (let inputIndex = 0; inputIndex < this.inputCount; inputIndex += 1) {
        sum += inputs[inputIndex] * this.weights[outputIndex][inputIndex];
      }

      this.visualOutputs[outputIndex] = sigmoid(sum);
      this.outputs[outputIndex] = sum > 0 ? 1 : 0;
    }

    return this.visualOutputs;
  }

  public getSnapshot(): NeuralLayerSnapshot {
    return {
      inputCount: this.inputCount,
      outputCount: this.outputCount,
      weights: this.weights,
      biases: this.biases,
      outputs: this.outputs,
      visualOutputs: this.visualOutputs,
    };
  }

  public applySnapshot(snapshot: NeuralLayerSnapshot): void {
    if (
      snapshot.inputCount !== this.inputCount ||
      snapshot.outputCount !== this.outputCount
    ) {
      throw new Error('NeuralLayer snapshot shape does not match the target layer.');
    }

    for (let outputIndex = 0; outputIndex < this.outputCount; outputIndex += 1) {
      this.biases[outputIndex] = snapshot.biases[outputIndex];

      for (let inputIndex = 0; inputIndex < this.inputCount; inputIndex += 1) {
        this.weights[outputIndex][inputIndex] =
          snapshot.weights[outputIndex][inputIndex];
      }
    }
  }
}

export class NeuralNetwork {
  public readonly layerSizes: readonly number[];
  public readonly layers: NeuralLayer[];
  public readonly outputs: number[];

  public constructor(layerSizes: readonly number[]) {
    if (layerSizes.length < 2) {
      throw new Error('NeuralNetwork requires at least an input and output layer.');
    }

    this.layerSizes = [...layerSizes];
    this.layers = [];
    this.outputs = new Array(layerSizes[layerSizes.length - 1]).fill(0);

    for (let index = 0; index < layerSizes.length - 1; index += 1) {
      const isOutputLayer = index === layerSizes.length - 2;

      this.layers.push(
        new NeuralLayer(
          layerSizes[index],
          layerSizes[index + 1],
          isOutputLayer
            ? {
                [FORWARD_OUTPUT_INDEX]: INITIAL_FORWARD_OUTPUT_BIAS,
                [REVERSE_OUTPUT_INDEX]: INITIAL_REVERSE_OUTPUT_BIAS,
              }
            : {}
        )
      );
    }
  }

  public feedForward(inputs: readonly number[]): readonly number[] {
    if (inputs.length !== this.layerSizes[0]) {
      throw new Error(
        `Expected ${this.layerSizes[0]} neural inputs but received ${inputs.length}.`
      );
    }

    let activations = inputs;

    for (let index = 0; index < this.layers.length; index += 1) {
      activations = this.layers[index].feedForward(activations);
    }

    const outputLayer = this.layers[this.layers.length - 1];

    for (let index = 0; index < this.outputs.length; index += 1) {
      this.outputs[index] = outputLayer.outputs[index];
    }

    return this.outputs;
  }

  public getSnapshot(): NeuralNetworkSnapshot {
    return {
      layerSizes: this.layerSizes,
      layers: this.layers.map((layer) => layer.getSnapshot()),
    };
  }

  public applySnapshot(snapshot: NeuralNetworkSnapshot): void {
    if (snapshot.layerSizes.length !== this.layerSizes.length) {
      throw new Error('NeuralNetwork snapshot layer count does not match.');
    }

    for (let index = 0; index < this.layerSizes.length; index += 1) {
      if (snapshot.layerSizes[index] !== this.layerSizes[index]) {
        throw new Error('NeuralNetwork snapshot layer sizes do not match.');
      }
    }

    for (let index = 0; index < this.layers.length; index += 1) {
      this.layers[index].applySnapshot(snapshot.layers[index]);
    }
  }
}

function randomWeight(): number {
  return Math.random() * 2 - 1;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}
