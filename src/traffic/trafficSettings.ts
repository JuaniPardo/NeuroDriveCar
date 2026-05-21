export const TRAFFIC_DENSITY_OPTIONS = ['none', 'sparse', 'normal', 'dense'] as const;
export const TRAINING_TRAFFIC_PHASE_OPTIONS = [
  'road-only',
  'sparse-traffic',
  'normal-traffic',
  'dense-traffic',
] as const;
export const TRAFFIC_SPEED_PRESET_OPTIONS = ['slow', 'normal', 'fast'] as const;
export const TRAFFIC_SPAWN_DISTANCE_PRESET_OPTIONS = [
  'far',
  'medium',
  'near',
] as const;
export const TRAFFIC_ENABLED_OPTIONS = [true, false] as const;

export type TrafficDensity = (typeof TRAFFIC_DENSITY_OPTIONS)[number];
export type TrainingTrafficPhase = (typeof TRAINING_TRAFFIC_PHASE_OPTIONS)[number];
export type TrafficSpeedPreset = (typeof TRAFFIC_SPEED_PRESET_OPTIONS)[number];
export type TrafficSpawnDistancePreset =
  (typeof TRAFFIC_SPAWN_DISTANCE_PRESET_OPTIONS)[number];

export interface TrafficSettings {
  enabled: boolean;
  density: TrafficDensity;
  phase: TrainingTrafficPhase;
  speedPreset: TrafficSpeedPreset;
  spawnDistancePreset: TrafficSpawnDistancePreset;
}

export interface ResolvedTrafficSettings extends TrafficSettings {
  readonly rowSpacing: number;
  readonly spawnDistance: number;
  readonly initialAheadRatio: number;
  readonly patterns: readonly (readonly number[])[];
  readonly laneSpeedMultipliers: readonly [number, number, number];
}

const NORMAL_TRAFFIC_PATTERN: readonly number[][] = [
  [1],
  [0, 2],
  [2],
  [0],
  [1, 2],
  [0, 1],
  [2],
  [0, 2],
] as const;

const SPARSE_TRAFFIC_PATTERN: readonly number[][] = [
  [1],
  [0],
  [2],
  [1],
  [0],
  [2],
] as const;

const DENSE_TRAFFIC_PATTERN: readonly number[][] = [
  [0, 1],
  [2],
  [1, 2],
  [0, 2],
  [1],
  [0, 1],
  [2],
  [0, 2],
] as const;

const DENSITY_CONFIG: Record<
  TrafficDensity,
  {
    rowSpacing: number;
    patterns: readonly (readonly number[])[];
  }
> = {
  none: {
    rowSpacing: 280,
    patterns: [],
  },
  sparse: {
    rowSpacing: 360,
    patterns: SPARSE_TRAFFIC_PATTERN,
  },
  normal: {
    rowSpacing: 260,
    patterns: NORMAL_TRAFFIC_PATTERN,
  },
  dense: {
    rowSpacing: 210,
    patterns: DENSE_TRAFFIC_PATTERN,
  },
};

const SPEED_CONFIG: Record<TrafficSpeedPreset, [number, number, number]> = {
  slow: [0.72, 0.62, 0.52],
  normal: [0.85, 0.7, 0.56],
  fast: [0.98, 0.82, 0.68],
};

const SPAWN_DISTANCE_CONFIG: Record<
  TrafficSpawnDistancePreset,
  {
    spawnDistance: number;
    initialAheadRatio: number;
  }
> = {
  far: {
    spawnDistance: 1_600,
    initialAheadRatio: 0.7,
  },
  medium: {
    spawnDistance: 1_400,
    initialAheadRatio: 2 / 3,
  },
  near: {
    spawnDistance: 1_100,
    initialAheadRatio: 0.58,
  },
};

const TRAFFIC_PHASE_PRESETS: Record<TrainingTrafficPhase, TrafficSettings> = {
  'road-only': {
    enabled: false,
    density: 'none',
    phase: 'road-only',
    speedPreset: 'normal',
    spawnDistancePreset: 'far',
  },
  'sparse-traffic': {
    enabled: true,
    density: 'sparse',
    phase: 'sparse-traffic',
    speedPreset: 'normal',
    spawnDistancePreset: 'far',
  },
  'normal-traffic': {
    enabled: true,
    density: 'normal',
    phase: 'normal-traffic',
    speedPreset: 'normal',
    spawnDistancePreset: 'medium',
  },
  'dense-traffic': {
    enabled: true,
    density: 'dense',
    phase: 'dense-traffic',
    speedPreset: 'fast',
    spawnDistancePreset: 'near',
  },
};

export const DEFAULT_TRAFFIC_SETTINGS: TrafficSettings = {
  ...TRAFFIC_PHASE_PRESETS['normal-traffic'],
};

export function createTrafficSettingsFromPhase(
  phase: TrainingTrafficPhase
): TrafficSettings {
  return {
    ...TRAFFIC_PHASE_PRESETS[phase],
  };
}

export function resolveTrafficSettings(
  settings: TrafficSettings
): ResolvedTrafficSettings {
  const density = settings.enabled ? settings.density : 'none';
  const densityConfig = DENSITY_CONFIG[density];
  const spawnConfig = SPAWN_DISTANCE_CONFIG[settings.spawnDistancePreset];

  return {
    ...settings,
    enabled: settings.enabled && density !== 'none',
    density,
    rowSpacing: densityConfig.rowSpacing,
    spawnDistance: spawnConfig.spawnDistance,
    initialAheadRatio: spawnConfig.initialAheadRatio,
    patterns: densityConfig.patterns,
    laneSpeedMultipliers: SPEED_CONFIG[settings.speedPreset],
  };
}

export function deriveTrafficPhase(
  settings: Pick<TrafficSettings, 'enabled' | 'density'>
): TrainingTrafficPhase {
  if (!settings.enabled || settings.density === 'none') {
    return 'road-only';
  }

  if (settings.density === 'sparse') {
    return 'sparse-traffic';
  }

  if (settings.density === 'dense') {
    return 'dense-traffic';
  }

  return 'normal-traffic';
}

export function isTrafficDensity(value: string): value is TrafficDensity {
  return TRAFFIC_DENSITY_OPTIONS.includes(value as TrafficDensity);
}

export function isTrainingTrafficPhase(value: string): value is TrainingTrafficPhase {
  return TRAINING_TRAFFIC_PHASE_OPTIONS.includes(value as TrainingTrafficPhase);
}

export function isTrafficSpeedPreset(value: string): value is TrafficSpeedPreset {
  return TRAFFIC_SPEED_PRESET_OPTIONS.includes(value as TrafficSpeedPreset);
}

export function isTrafficSpawnDistancePreset(
  value: string
): value is TrafficSpawnDistancePreset {
  return TRAFFIC_SPAWN_DISTANCE_PRESET_OPTIONS.includes(
    value as TrafficSpawnDistancePreset
  );
}
