import { clamp } from '../utils/math';

export interface LaneFollowingControllerOptions {
  laneCenteringWeight?: number;
  headingCorrectionWeight?: number;
  edgeAvoidanceWeight?: number;
  steeringSmoothing?: number;
}

export interface LaneFollowingControllerContext {
  vehicleX: number;
  vehicleHeading: number;
  targetLaneCenterX: number;
  roadWidth: number;
  laneWidth: number;
  edgeProximity: number; // -1 (left edge) to 1 (right edge), or 0 if far
  headingErrorNormalized: number; // -1 to 1
}

export class LaneFollowingController {
  private readonly laneCenteringWeight: number;
  private readonly headingCorrectionWeight: number;
  private readonly edgeAvoidanceWeight: number;
  private readonly steeringSmoothing: number;

  private lastSteerIntent = 0;

  constructor(options: LaneFollowingControllerOptions = {}) {
    this.laneCenteringWeight = options.laneCenteringWeight ?? 1.2;
    this.headingCorrectionWeight = options.headingCorrectionWeight ?? 0.8;
    this.edgeAvoidanceWeight = options.edgeAvoidanceWeight ?? 1.5;
    this.steeringSmoothing = options.steeringSmoothing ?? 0.2;
  }

  public calculateSteer(context: LaneFollowingControllerContext): number {
    const halfLaneWidth = context.laneWidth * 0.5;
    
    // 1. Lane Centering: how far from target lane center?
    // Normalized to [-1, 1] where 1 means half a lane width to the right of center.
    const laneOffset = context.vehicleX - context.targetLaneCenterX;
    const laneOffsetNormalized = halfLaneWidth > 0 
      ? clamp(laneOffset / halfLaneWidth, -2, 2) 
      : 0;
    
    // We want to steer in the opposite direction of the offset
    const centeringCorrection = -laneOffsetNormalized * this.laneCenteringWeight;

    // 2. Heading Correction: are we aligned with the road?
    // context.headingErrorNormalized is assumed to be -1 to 1.
    // We steer opposite to the heading error.
    const headingCorrection = -context.headingErrorNormalized * this.headingCorrectionWeight;

    // 3. Edge Avoidance
    // context.edgeProximity: positive means near right edge, negative means near left edge.
    // We steer away from the edge.
    const edgeCorrection = -context.edgeProximity * this.edgeAvoidanceWeight;

    // Combined Raw Steer
    const rawSteer = centeringCorrection + headingCorrection + edgeCorrection;

    // Smooth the steering output
    const targetSteer = clamp(rawSteer, -1, 1);
    const smoothedSteer = this.lastSteerIntent + (targetSteer - this.lastSteerIntent) * (1 - this.steeringSmoothing);
    
    this.lastSteerIntent = smoothedSteer;

    return smoothedSteer;
  }

  public reset(): void {
    this.lastSteerIntent = 0;
  }
}
