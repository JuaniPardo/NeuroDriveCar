export const SIMULATION_SPEED_OPTIONS = [0, 1, 2, 5] as const;
export const POPULATION_SIZE_OPTIONS = [1, 5, 10, 25, 50] as const;
export const MUTATION_RATE_OPTIONS = [0.05, 0.1, 0.2, 0.4] as const;

export type SimulationSpeedOption = (typeof SIMULATION_SPEED_OPTIONS)[number];
export type RunningSimulationSpeed = Exclude<SimulationSpeedOption, 0>;
export type PopulationSizeOption = (typeof POPULATION_SIZE_OPTIONS)[number];
export type MutationRateOption = (typeof MUTATION_RATE_OPTIONS)[number];

export interface SimulationControlSnapshot {
  paused: boolean;
  speedMultiplier: SimulationSpeedOption;
  selectedPopulationSize: PopulationSizeOption;
  selectedMutationRate: MutationRateOption;
  laneAwareInputsEnabled: boolean;
  lastActionMessage: string;
}

export function formatSimulationSpeedLabel(speedMultiplier: SimulationSpeedOption): string {
  return speedMultiplier === 0 ? '0x / PAUSED' : `${speedMultiplier}x`;
}
