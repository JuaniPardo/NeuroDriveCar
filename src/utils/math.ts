export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

export function inverseLerp(start: number, end: number, value: number): number {
  if (start === end) {
    return 0;
  }

  return (value - start) / (end - start);
}

export function moveTowards(
  current: number,
  target: number,
  maxDelta: number
): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

export function remapClamped(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  const alpha = clamp(inverseLerp(inputMin, inputMax, value), 0, 1);

  return lerp(outputMin, outputMax, alpha);
}

export function normalizeAngle(angle: number): number {
  let normalizedAngle = angle % (Math.PI * 2);

  if (normalizedAngle > Math.PI) {
    normalizedAngle -= Math.PI * 2;
  } else if (normalizedAngle < -Math.PI) {
    normalizedAngle += Math.PI * 2;
  }

  return normalizedAngle;
}
