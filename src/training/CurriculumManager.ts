import type { TrafficSettings } from '../traffic/TrafficManager';

export type CurriculumPhase = 'road-only' | 'sparse-traffic' | 'normal-traffic' | 'dense-traffic';

export interface PhaseConfig {
  name: CurriculumPhase;
  trafficEnabled: boolean;
  trafficDensity: number;
  stabilityThreshold: number; // fitness/progress needed to advance
}

export const CURRICULUM_PHASES: PhaseConfig[] = [
  {
    name: 'road-only',
    trafficEnabled: false,
    trafficDensity: 0,
    stabilityThreshold: 5000,
  },
  {
    name: 'sparse-traffic',
    trafficEnabled: true,
    trafficDensity: 0.15,
    stabilityThreshold: 8000,
  },
  {
    name: 'normal-traffic',
    trafficEnabled: true,
    trafficDensity: 0.35,
    stabilityThreshold: 12000,
  },
  {
    name: 'dense-traffic',
    trafficEnabled: true,
    trafficDensity: 0.6,
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

  public getTrafficSettings(): Partial<TrafficSettings> {
    const config = this.currentPhase;
    return {
      enabled: config.trafficEnabled,
      density: config.trafficDensity,
    };
  }
}
