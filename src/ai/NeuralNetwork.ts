export class NeuralLayer {
  public readonly inputCount: number;
  public readonly outputCount: number;
  public readonly weights: number[][];
  public readonly biases: number[];
  public readonly outputs: number[];

  public constructor(inputCount: number, outputCount: number) {
    this.inputCount = inputCount;
    this.outputCount = outputCount;
    this.weights = [];
    this.biases = [];
    this.outputs = new Array(outputCount).fill(0);

    for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
      const row = new Array(inputCount).fill(0);

      for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
        row[inputIndex] = randomWeight();
      }

      this.weights.push(row);
      this.biases.push(randomWeight());
    }
  }

  public feedForward(inputs: readonly number[]): readonly number[] {
    for (let outputIndex = 0; outputIndex < this.outputCount; outputIndex += 1) {
      let sum = this.biases[outputIndex];

      for (let inputIndex = 0; inputIndex < this.inputCount; inputIndex += 1) {
        sum += inputs[inputIndex] * this.weights[outputIndex][inputIndex];
      }

      this.outputs[outputIndex] = sum > 0 ? 1 : 0;
    }

    return this.outputs;
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
      this.layers.push(new NeuralLayer(layerSizes[index], layerSizes[index + 1]));
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

    for (let index = 0; index < this.outputs.length; index += 1) {
      this.outputs[index] = activations[index];
    }

    return this.outputs;
  }
}

function randomWeight(): number {
  return Math.random() * 2 - 1;
}
