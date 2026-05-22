import { type TrafficSettings, type TrafficDensity } from '../traffic/trafficSettings';

export type CurriculumPhase = 'road-only' | 'sparse-traffic' | 'normal-traffic' | 'dense-traffic';

export interface PhaseConfig {
  name: CurriculumPhase;
  trafficEnabled: boolean;
  trafficDensity: TrafficDensity;
  stabilityThreshold: number; // fitness/progress needed to advance
}

export const CURRICULUM_PHASES: PhaseConfig[] = [
  {
    name: 'road-only',
    trafficEnabled: false,
    trafficDensity: 'none',
    stabilityThreshold: 5000,
  },
  {
    name: 'sparse-traffic',
    trafficEnabled: true,
    trafficDensity: 'sparse',
    stabilityThreshold: 8000,
  },
  {
    name: 'normal-traffic',
    trafficEnabled: true,
    trafficDensity: 'normal',
    stabilityThreshold: 12000,
  },
  {
    name: 'dense-traffic',
    trafficEnabled: true,
    trafficDensity: 'dense',
    stabilityThreshold: 20000,
  },
];

export class CurriculumManager {
  private currentPhaseIndex = 0;
  private consecutiveStabilityCount = 0;
  private readonly requiredStabilityGenerations = 2;

  public get currentPhase(): PhaseConfig {
    return CURRICULUM_PHASES[this.currentPhaseIndex]!;
  }

  public update(bestFitness: number): boolean {
    const config = this.currentPhase;
    
    if (bestFitness >= config.stabilityThreshold) {
      this.consecutiveStabilityCount++;
    } else {
      this.consecutiveStabilityCount = 0;
    }

    if (this.consecutiveStabilityCount >= this.requiredStabilityGenerations) {
      return this.advancePhase();
    }

    return false;
  }

  public advancePhase(): boolean {
    if (this.currentPhaseIndex < CURRICULUM_PHASES.length - 1) {
      this.currentPhaseIndex++;
      this.consecutiveStabilityCount = 0;
      return true;
    }
    return false;
  }

  public reset(): void {
    this.currentPhaseIndex = 0;
    this.consecutiveStabilityCount = 0;
  }

  public getTrafficSettings(): TrafficSettings {
    const config = this.currentPhase;
    return {
      enabled: config.trafficEnabled,
      density: config.trafficDensity,
      phase: config.name,
      speedPreset: 'normal',
      spawnDistancePreset: 'medium',
    };
  }
}
