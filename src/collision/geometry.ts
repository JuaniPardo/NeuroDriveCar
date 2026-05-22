import { lerp } from '../utils/math';

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  start: Point;
  end: Point;
}

export type SensorHitType = 'border' | 'lane' | 'traffic';

export interface EnvironmentSegment {
  segment: Segment;
  hitType: Exclude<SensorHitType, 'traffic'>;
}

export interface Intersection {
  x: number;
  y: number;
  offset: number;
}

export type Polygon = Point[];

const EPSILON = 1e-9;

export function getSegmentIntersection(
  first: Segment,
  second: Segment
): Intersection | null {
  const firstDeltaX = first.end.x - first.start.x;
  const firstDeltaY = first.end.y - first.start.y;
  const secondDeltaX = second.end.x - second.start.x;
  const secondDeltaY = second.end.y - second.start.y;
  const denominator =
    secondDeltaY * firstDeltaX - secondDeltaX * firstDeltaY;

  if (Math.abs(denominator) <= EPSILON) {
    return null;
  }

  const startDeltaX = first.start.x - second.start.x;
  const startDeltaY = first.start.y - second.start.y;
  const firstOffset =
    (secondDeltaX * startDeltaY - secondDeltaY * startDeltaX) / denominator;
  const secondOffset =
    (firstDeltaX * startDeltaY - firstDeltaY * startDeltaX) / denominator;

  if (
    firstOffset < -EPSILON ||
    firstOffset > 1 + EPSILON ||
    secondOffset < -EPSILON ||
    secondOffset > 1 + EPSILON
  ) {
    return null;
  }

  return {
    x: lerp(first.start.x, first.end.x, firstOffset),
    y: lerp(first.start.y, first.end.y, firstOffset),
    offset: firstOffset,
  };
}

export function polygonsIntersect(
  firstPolygon: readonly Point[],
  secondPolygon: readonly Point[]
): boolean {
  return getPolygonIntersection(firstPolygon, secondPolygon) !== null;
}

export function getPolygonIntersection(
  firstPolygon: readonly Point[],
  secondPolygon: readonly Point[]
): Intersection | null {
  for (let firstIndex = 0; firstIndex < firstPolygon.length; firstIndex += 1) {
    getPolygonEdge(firstPolygon, firstIndex, SHARED_EDGE);
    const firstSegment = { ...SHARED_EDGE };

    for (
      let secondIndex = 0;
      secondIndex < secondPolygon.length;
      secondIndex += 1
    ) {
      getPolygonEdge(secondPolygon, secondIndex, SHARED_EDGE);
      const secondSegment = { ...SHARED_EDGE };
      const intersection = getSegmentIntersection(firstSegment, secondSegment);

      if (intersection !== null) {
        return intersection;
      }
    }
  }

  if (isPointInsidePolygon(firstPolygon[0], secondPolygon)) {
    return { x: firstPolygon[0].x, y: firstPolygon[0].y, offset: 0 };
  }

  if (isPointInsidePolygon(secondPolygon[0], firstPolygon)) {
    return { x: secondPolygon[0].x, y: secondPolygon[0].y, offset: 0 };
  }

  return null;
}

function getPolygonEdge(
  polygon: readonly Point[],
  index: number,
  target: Segment
): void {
  const nextIndex = (index + 1) % polygon.length;
  target.start = polygon[index];
  target.end = polygon[nextIndex];
}

const SHARED_EDGE: Segment = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };

export function getPolygonSegmentIntersection(
  polygon: readonly Point[],
  segment: Segment
): Intersection | null {
  for (let index = 0; index < polygon.length; index += 1) {
    getPolygonEdge(polygon, index, SHARED_EDGE);
    const intersection = getSegmentIntersection(SHARED_EDGE, segment);

    if (intersection !== null) {
      return intersection;
    }
  }

  if (isPointInsidePolygon(segment.start, polygon)) {
    return { x: segment.start.x, y: segment.start.y, offset: 0 };
  }

  return null;
}

export function getNearestSegmentIntersection(
  segment: Segment,
  segments: readonly Segment[]
): Intersection | null {
  let nearestIntersection: Intersection | null = null;

  for (const candidate of segments) {
    const intersection = getSegmentIntersection(segment, candidate);

    if (intersection === null) {
      continue;
    }

    if (
      nearestIntersection === null ||
      intersection.offset < nearestIntersection.offset
    ) {
      nearestIntersection = intersection;
    }
  }

  return nearestIntersection;
}

export function getNearestPolygonSegmentIntersection(
  polygon: readonly Point[],
  segment: Segment
): Intersection | null {
  let nearestIntersection: Intersection | null = null;

  for (let index = 0; index < polygon.length; index += 1) {
    getPolygonEdge(polygon, index, SHARED_EDGE);
    const intersection = getSegmentIntersection(SHARED_EDGE, segment);

    if (intersection === null) {
      continue;
    }

    if (
      nearestIntersection === null ||
      intersection.offset < nearestIntersection.offset
    ) {
      nearestIntersection = intersection;
    }
  }

  if (nearestIntersection !== null) {
    return nearestIntersection;
  }

  if (isPointInsidePolygon(segment.start, polygon)) {
    return { x: segment.start.x, y: segment.start.y, offset: 0 };
  }

  return null;
}

export function isPointInsidePolygon(
  point: Point,
  polygon: readonly Point[]
): boolean {
  let isInside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const currentPoint = polygon[currentIndex];
    const previousPoint = polygon[previousIndex];
    const intersectsHorizontalRay =
      currentPoint.y > point.y !== previousPoint.y > point.y;

    if (!intersectsHorizontalRay) {
      continue;
    }

    const edgeRatio =
      (point.y - currentPoint.y) / (previousPoint.y - currentPoint.y);
    const edgeX = lerp(currentPoint.x, previousPoint.x, edgeRatio);

    if (point.x < edgeX) {
      isInside = !isInside;
    }
  }

  return isInside;
}

