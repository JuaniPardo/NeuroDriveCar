import { clamp, inverseLerp, moveTowards } from '../utils/math';

export interface CarPhysicsConfig {
  acceleration: number;
  brakingDeceleration: number;
  friction: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  steeringRate: number;
  minSteeringSpeed: number;
}

export const DEFAULT_CAR_PHYSICS: CarPhysicsConfig = {
  acceleration: 460,
  brakingDeceleration: 620,
  friction: 240,
  maxForwardSpeed: 320,
  maxReverseSpeed: 120,
  steeringRate: 2.6,
  minSteeringSpeed: 18,
};

export function updateSpeed(
  speed: number,
  deltaTimeSeconds: number,
  isAcceleratingForward: boolean,
  isAcceleratingReverse: boolean,
  config: CarPhysicsConfig
): number {
  let nextSpeed = speed;

  if (isAcceleratingForward) {
    nextSpeed += config.acceleration * deltaTimeSeconds;
  }

  if (isAcceleratingReverse) {
    nextSpeed -= config.brakingDeceleration * deltaTimeSeconds;
  }

  if (!isAcceleratingForward && !isAcceleratingReverse) {
    nextSpeed = moveTowards(nextSpeed, 0, config.friction * deltaTimeSeconds);
  }

  return clamp(
    nextSpeed,
    -config.maxReverseSpeed,
    config.maxForwardSpeed
  );
}

export function getSteeringAmount(
  speed: number,
  deltaTimeSeconds: number,
  steeringInput: number,
  config: CarPhysicsConfig
): number {
  if (steeringInput === 0) {
    return 0;
  }

  const speedMagnitude = Math.abs(speed);

  if (speedMagnitude < config.minSteeringSpeed) {
    return 0;
  }

  const steeringFactor = clamp(
    inverseLerp(
      config.minSteeringSpeed,
      config.maxForwardSpeed,
      speedMagnitude
    ),
    0.18,
    1
  );
  const direction = speed >= 0 ? 1 : -1;

  return (
    steeringInput *
    config.steeringRate *
    steeringFactor *
    direction *
    deltaTimeSeconds
  );
}
