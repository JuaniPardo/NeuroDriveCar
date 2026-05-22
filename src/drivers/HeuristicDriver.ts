import type { ControlState } from '../car/Controls';
import { clamp } from '../utils/math';
import { Road } from '../world/Road';

const TARGET_LANE_REACHED_EPSILON = 0.18;
const FRONT_OBSTACLE_BRAKE_DISTANCE = 26;
const EDGE_DANGER_THRESHOLD = 0.72;
const CURRENT_LANE_BLOCKED_THRESHOLD = 0.35;
const ADJACENT_LANE_CLEAR_THRESHOLD = 0.55;
const EMERGENCY_ADJACENT_LANE_CLEAR_THRESHOLD = 0.45;

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

    if (context.currentLaneBlocked >= CURRENT_LANE_BLOCKED_THRESHOLD) {
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

    const shouldBrake =
      context.frontObstacleDistance !== null &&
      context.frontObstacleDistance <= FRONT_OBSTACLE_BRAKE_DISTANCE &&
      context.currentLaneBlocked >= CURRENT_LANE_BLOCKED_THRESHOLD &&
      context.leftLaneClear < EMERGENCY_ADJACENT_LANE_CLEAR_THRESHOLD &&
      context.rightLaneClear < EMERGENCY_ADJACENT_LANE_CLEAR_THRESHOLD;

    this.reason = this.describeReason(
      context,
      currentLane,
      this.targetLane ?? currentLane
    );
    this.targetLaneOffsetNormalized = targetLaneOffsetNormalized;

    return {
      forward: !shouldBrake,
      reverse: shouldBrake,
      left: false, // Tactical layer doesn't use these anymore
      right: false,
      steerIntent: 0,
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
    const canGoLeft =
      currentLane > 0 && context.leftLaneClear >= ADJACENT_LANE_CLEAR_THRESHOLD;
    const canGoRight =
      currentLane < context.road.laneCount - 1 &&
      context.rightLaneClear >= ADJACENT_LANE_CLEAR_THRESHOLD;

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

    if (
      context.currentLaneBlocked >= CURRENT_LANE_BLOCKED_THRESHOLD &&
      targetLane !== currentLane
    ) {
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
