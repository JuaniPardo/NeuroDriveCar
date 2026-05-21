import type { ControlState } from '../car/Controls';
import { clamp } from '../utils/math';
import { Road } from '../world/Road';

const EDGE_AVOID_WEIGHT = 1.35;
const TARGET_LANE_WEIGHT = 0.95;
const HEADING_ALIGN_WEIGHT = 0.45;
const FRONT_BLOCK_WEIGHT = 0.7;
const TARGET_LANE_REACHED_EPSILON = 0.18;
const FRONT_OBSTACLE_BRAKE_DISTANCE = 26;
const EDGE_DANGER_THRESHOLD = 0.72;

export interface HeuristicDriverContext {
  x: number;
  y: number;
  angle: number;
  speed: number;
  road: Road;
  laneCenterOffsetNormalized: number;
  headingErrorNormalized: number;
  currentLaneBlocked: number;
  leftLaneClear: number;
  rightLaneClear: number;
  frontObstacleDistance: number | null;
  frontObstacleSignal: number;
  edgeProximity: number;
}

export interface HeuristicDriverDebugSnapshot {
  reason: string;
  targetLane: number | null;
  targetLaneOffsetNormalized: number;
}

export class HeuristicDriver {
  private targetLane: number | null = null;
  private reason = 'clear-forward';
  private targetLaneOffsetNormalized = 0;

  public reset(): void {
    this.targetLane = null;
    this.reason = 'clear-forward';
    this.targetLaneOffsetNormalized = 0;
  }

  public decide(context: HeuristicDriverContext): ControlState {
    const currentLane = context.road.getNearestLaneIndex(context.x);

    if (this.targetLane === null) {
      this.targetLane = currentLane;
    }

    if (context.currentLaneBlocked >= 0.5) {
      this.targetLane = this.chooseSaferLane(context, currentLane);
    } else if (this.targetLane !== currentLane) {
      const targetLaneCenter = context.road.getLaneCenter(this.targetLane);
      const halfLaneWidth = context.road.laneWidth * 0.5;
      const normalizedOffset =
        halfLaneWidth <= Number.EPSILON
          ? 0
          : clamp((context.x - targetLaneCenter) / halfLaneWidth, -2, 2);

      if (Math.abs(normalizedOffset) <= TARGET_LANE_REACHED_EPSILON) {
        this.targetLane = currentLane;
      }
    }

    const targetLaneCenter = context.road.getLaneCenter(this.targetLane ?? currentLane);
    const halfLaneWidth = context.road.laneWidth * 0.5;
    const targetLaneOffsetNormalized =
      halfLaneWidth <= Number.EPSILON
        ? 0
        : clamp((context.x - targetLaneCenter) / halfLaneWidth, -2, 2);
    const targetLaneSteer = clamp(-targetLaneOffsetNormalized, -1, 1);
    const headingAlignSteer = clamp(-context.headingErrorNormalized, -1, 1);

    let edgeAvoidSteer = 0;

    if (context.edgeProximity > 0) {
      const roadCenterOffset = context.x - context.road.x;
      edgeAvoidSteer =
        Math.sign(-roadCenterOffset || 0) * context.edgeProximity;
    }

    let frontAvoidSteer = 0;

    if (context.currentLaneBlocked >= 0.5) {
      if ((this.targetLane ?? currentLane) < currentLane) {
        frontAvoidSteer = -1;
      } else if ((this.targetLane ?? currentLane) > currentLane) {
        frontAvoidSteer = 1;
      } else {
        frontAvoidSteer = edgeAvoidSteer !== 0 ? edgeAvoidSteer : -context.laneCenterOffsetNormalized;
      }
    }

    const steerIntent = clamp(
      edgeAvoidSteer * EDGE_AVOID_WEIGHT +
        frontAvoidSteer * FRONT_BLOCK_WEIGHT +
        targetLaneSteer * TARGET_LANE_WEIGHT +
        headingAlignSteer * HEADING_ALIGN_WEIGHT,
      -1,
      1
    );

    const shouldBrake =
      context.frontObstacleDistance !== null &&
      context.frontObstacleDistance <= FRONT_OBSTACLE_BRAKE_DISTANCE &&
      context.currentLaneBlocked >= 0.5 &&
      context.leftLaneClear < 0.5 &&
      context.rightLaneClear < 0.5;

    this.reason = this.describeReason(
      context,
      currentLane,
      this.targetLane ?? currentLane
    );
    this.targetLaneOffsetNormalized = targetLaneOffsetNormalized;

    return {
      forward: !shouldBrake,
      reverse: shouldBrake,
      left: steerIntent < -0.08,
      right: steerIntent > 0.08,
      steerIntent,
    };
  }

  public getDebugSnapshot(): HeuristicDriverDebugSnapshot {
    return {
      reason: this.reason,
      targetLane: this.targetLane,
      targetLaneOffsetNormalized: this.targetLaneOffsetNormalized,
    };
  }

  private chooseSaferLane(
    context: HeuristicDriverContext,
    currentLane: number
  ): number {
    const canGoLeft = currentLane > 0 && context.leftLaneClear >= 0.5;
    const canGoRight =
      currentLane < context.road.laneCount - 1 && context.rightLaneClear >= 0.5;

    if (canGoLeft && canGoRight) {
      const roadMidLane = Math.floor(context.road.laneCount * 0.5);
      const towardCenterLane =
        Math.abs(currentLane - 1 - roadMidLane) <=
        Math.abs(currentLane + 1 - roadMidLane)
          ? currentLane - 1
          : currentLane + 1;

      return towardCenterLane;
    }

    if (canGoLeft) {
      return currentLane - 1;
    }

    if (canGoRight) {
      return currentLane + 1;
    }

    return currentLane;
  }

  private describeReason(
    context: HeuristicDriverContext,
    currentLane: number,
    targetLane: number
  ): string {
    if (context.edgeProximity >= EDGE_DANGER_THRESHOLD) {
      return 'edge-avoid';
    }

    if (context.currentLaneBlocked >= 0.5 && targetLane !== currentLane) {
      return 'front-blocked';
    }

    if (Math.abs(this.targetLaneOffsetNormalized) > 0.22) {
      return 'lane-center';
    }

    if (Math.abs(context.headingErrorNormalized) > 0.12) {
      return 'heading-align';
    }

    return 'clear-forward';
  }
}
