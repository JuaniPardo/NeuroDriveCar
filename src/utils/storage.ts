import type { BrainGenome } from '../ai/Brain';
import type {
  NeuralLayerSnapshot,
  NeuralNetworkSnapshot,
} from '../ai/NeuralNetwork';
import {
  DEFAULT_TRAFFIC_SETTINGS,
  isTrafficDensity,
  isTrafficSpawnDistancePreset,
  isTrafficSpeedPreset,
  isTrainingTrafficPhase,
  type TrafficSettings,
} from '../traffic/trafficSettings';

export const BEST_BRAIN_STORAGE_KEY = 'neuroDriveCar.bestBrain.v1';
export const TRAFFIC_SETTINGS_STORAGE_KEY = 'neuroDriveCar.trafficSettings.v1';
const SAVED_BRAIN_VERSION = 1;
const BRAIN_SCHEMA_VERSION = 3;
const SAVED_TRAFFIC_SETTINGS_VERSION = 1;

export interface SavedBrainRecord {
  version: typeof SAVED_BRAIN_VERSION;
  brainSchemaVersion?: typeof BRAIN_SCHEMA_VERSION;
  savedAt: number;
  bestDistance: number;
  genome: BrainGenome;
}

interface SavedTrafficSettingsRecord {
  version: typeof SAVED_TRAFFIC_SETTINGS_VERSION;
  settings: TrafficSettings;
}

export type LoadSavedBrainResult =
  | {
      status: 'loaded';
      record: SavedBrainRecord;
    }
  | {
      status: 'missing' | 'invalid' | 'unavailable';
      record: null;
      reason?: string;
    };

export function saveBestBrain(
  genome: BrainGenome,
  bestDistance: number
): SavedBrainRecord | null {
  const storage = getLocalStorage();

  if (storage === null) {
    return null;
  }

  const record: SavedBrainRecord = {
    version: SAVED_BRAIN_VERSION,
    brainSchemaVersion: BRAIN_SCHEMA_VERSION,
    savedAt: Date.now(),
    bestDistance: Math.max(0, bestDistance),
    genome,
  };

  storage.setItem(BEST_BRAIN_STORAGE_KEY, JSON.stringify(record));

  return record;
}

export function loadBestBrain(): LoadSavedBrainResult {
  const storage = getLocalStorage();

  if (storage === null) {
    return {
      status: 'unavailable',
      record: null,
    };
  }

  const rawValue = storage.getItem(BEST_BRAIN_STORAGE_KEY);

  if (rawValue === null) {
    return {
      status: 'missing',
      record: null,
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isSavedBrainRecord(parsedValue)) {
      return {
        status: 'invalid',
        record: null,
        reason: 'Saved brain payload failed validation.',
      };
    }

    return {
      status: 'loaded',
      record: parsedValue,
    };
  } catch {
    return {
      status: 'invalid',
      record: null,
      reason: 'Saved brain payload is not valid JSON.',
    };
  }
}

export function deleteBestBrain(): void {
  const storage = getLocalStorage();

  if (storage === null) {
    return;
  }

  storage.removeItem(BEST_BRAIN_STORAGE_KEY);
}

export function saveTrafficSettings(settings: TrafficSettings): TrafficSettings {
  const storage = getLocalStorage();

  if (storage !== null) {
    const record: SavedTrafficSettingsRecord = {
      version: SAVED_TRAFFIC_SETTINGS_VERSION,
      settings,
    };

    storage.setItem(TRAFFIC_SETTINGS_STORAGE_KEY, JSON.stringify(record));
  }

  return settings;
}

export function loadTrafficSettings(): TrafficSettings {
  const storage = getLocalStorage();

  if (storage === null) {
    return {
      ...DEFAULT_TRAFFIC_SETTINGS,
    };
  }

  const rawValue = storage.getItem(TRAFFIC_SETTINGS_STORAGE_KEY);

  if (rawValue === null) {
    return {
      ...DEFAULT_TRAFFIC_SETTINGS,
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isSavedTrafficSettingsRecord(parsedValue)) {
      return {
        ...DEFAULT_TRAFFIC_SETTINGS,
      };
    }

    return {
      ...parsedValue.settings,
    };
  } catch {
    return {
      ...DEFAULT_TRAFFIC_SETTINGS,
    };
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage ?? null;
}

function isSavedBrainRecord(value: unknown): value is SavedBrainRecord {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === SAVED_BRAIN_VERSION &&
    value.brainSchemaVersion === BRAIN_SCHEMA_VERSION &&
    isFiniteNumber(value.savedAt) &&
    isFiniteNumber(value.bestDistance) &&
    isBrainGenome(value.genome)
  );
}

function isSavedTrafficSettingsRecord(
  value: unknown
): value is SavedTrafficSettingsRecord {
  return (
    isObject(value) &&
    value.version === SAVED_TRAFFIC_SETTINGS_VERSION &&
    isTrafficSettings(value.settings)
  );
}

function isTrafficSettings(value: unknown): value is TrafficSettings {
  return (
    isObject(value) &&
    typeof value.enabled === 'boolean' &&
    typeof value.density === 'string' &&
    typeof value.phase === 'string' &&
    typeof value.speedPreset === 'string' &&
    typeof value.spawnDistancePreset === 'string' &&
    isTrafficDensity(value.density) &&
    isTrainingTrafficPhase(value.phase) &&
    isTrafficSpeedPreset(value.speedPreset) &&
    isTrafficSpawnDistancePreset(value.spawnDistancePreset)
  );
}

function isBrainGenome(value: unknown): value is BrainGenome {
  return isObject(value) && isNeuralNetworkSnapshot(value.network);
}

function isNeuralNetworkSnapshot(value: unknown): value is NeuralNetworkSnapshot {
  if (!isObject(value)) {
    return false;
  }

  if (!isNumberArray(value.layerSizes) || value.layerSizes.length < 2) {
    return false;
  }

  if (!Array.isArray(value.layers) || value.layers.length !== value.layerSizes.length - 1) {
    return false;
  }

  for (let index = 0; index < value.layers.length; index += 1) {
    const layer = value.layers[index];
    const inputCount = value.layerSizes[index];
    const outputCount = value.layerSizes[index + 1];

    if (!isNeuralLayerSnapshot(layer, inputCount, outputCount)) {
      return false;
    }
  }

  return true;
}

function isNeuralLayerSnapshot(
  value: unknown,
  expectedInputCount: number,
  expectedOutputCount: number
): value is NeuralLayerSnapshot {
  if (!isObject(value)) {
    return false;
  }

  if (
    value.inputCount !== expectedInputCount ||
    value.outputCount !== expectedOutputCount ||
    !isNumberArray(value.biases) ||
    !isNumberArray(value.outputs) ||
    !isNumberArray(value.visualOutputs) ||
    !Array.isArray(value.weights)
  ) {
    return false;
  }

  if (
    value.biases.length !== expectedOutputCount ||
    value.outputs.length !== expectedOutputCount ||
    value.visualOutputs.length !== expectedOutputCount ||
    value.weights.length !== expectedOutputCount
  ) {
    return false;
  }

  for (let outputIndex = 0; outputIndex < value.weights.length; outputIndex += 1) {
    const row = value.weights[outputIndex];

    if (!isNumberArray(row) || row.length !== expectedInputCount) {
      return false;
    }
  }

  return true;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => isFiniteNumber(item));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
