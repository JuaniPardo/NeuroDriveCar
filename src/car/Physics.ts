import { clamp, inverseLerp, moveTowards } from '../utils/math';

export interface CarPhysicsConfig {
  acceleration: number;
  brakingDeceleration: number;
  reverseAcceleration: number;
  friction: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  maxSteeringAngle: number;
  steeringResponse: number;
  minSteeringSpeed: number;
  wheelBase: number;
}

export const DEFAULT_CAR_PHYSICS: CarPhysicsConfig = {
  acceleration: 280,
  brakingDeceleration: 520,
  reverseAcceleration: 160,
  friction: 180,
  maxForwardSpeed: 260,
  maxReverseSpeed: 90,
  maxSteeringAngle: 0.48,
  steeringResponse: 2.8,
  minSteeringSpeed: 12,
  wheelBase: 52,
};

export function updateSpeed(
  speed: number,
  deltaTimeSeconds: number,
  throttleInput: number,
  config: CarPhysicsConfig
): number {
  let nextSpeed = speed;

  if (throttleInput > 0) {
    if (nextSpeed < 0) {
      nextSpeed = moveTowards(
        nextSpeed,
        0,
        config.brakingDeceleration * deltaTimeSeconds
      );
    } else {
      nextSpeed += config.acceleration * deltaTimeSeconds;
    }
  } else if (throttleInput < 0) {
    if (nextSpeed > 0) {
      nextSpeed = moveTowards(
        nextSpeed,
        0,
        config.brakingDeceleration * deltaTimeSeconds
      );
    } else {
      nextSpeed -= config.reverseAcceleration * deltaTimeSeconds;
    }
  } else {
    nextSpeed = moveTowards(nextSpeed, 0, config.friction * deltaTimeSeconds);
  }

  return clamp(
    nextSpeed,
    -config.maxReverseSpeed,
    config.maxForwardSpeed
  );
}

export function updateSteeringAngle(
  steeringAngle: number,
  steeringInput: number,
  deltaTimeSeconds: number,
  config: CarPhysicsConfig
): number {
  const targetSteeringAngle = steeringInput * config.maxSteeringAngle;
  const steeringDelta = config.steeringResponse * deltaTimeSeconds;

  return moveTowards(steeringAngle, targetSteeringAngle, steeringDelta);
}

export function getRotationDelta(
  speed: number,
  steeringAngle: number,
  deltaTimeSeconds: number,
  config: CarPhysicsConfig
): number {
  const speedMagnitude = Math.abs(speed);

  if (
    speedMagnitude < config.minSteeringSpeed ||
    Math.abs(steeringAngle) < 0.0001
  ) {
    return 0;
  }

  const steeringFactor = clamp(
    inverseLerp(
      config.minSteeringSpeed,
      config.maxForwardSpeed,
      speedMagnitude
    ),
    0.35,
    1
  );

  return (
    (speed / config.wheelBase) *
    Math.tan(steeringAngle) *
    steeringFactor *
    deltaTimeSeconds
  );
}
