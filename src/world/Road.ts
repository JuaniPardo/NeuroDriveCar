import { clampLaneIndex, Lane } from './Lane';

const DEFAULT_LANE_COUNT = 3;
const DEFAULT_LANE_WIDTH = 128;
const ROAD_SHOULDER_WIDTH = 24;
const BORDER_WIDTH = 6;
const DASH_LENGTH = 36;
const DASH_GAP = 28;

export class Road {
  public readonly x: number;
  public readonly laneCount: number;
  public readonly laneWidth: number;
  public readonly width: number;
  public readonly left: number;
  public readonly right: number;
  public readonly borders: readonly [number, number];
  private readonly lanes: Lane[];

  public constructor(
    x = 0,
    laneCount = DEFAULT_LANE_COUNT,
    laneWidth = DEFAULT_LANE_WIDTH
  ) {
    this.x = x;
    this.laneCount = laneCount;
    this.laneWidth = laneWidth;
    this.width = laneCount * laneWidth;
    this.left = x - this.width * 0.5;
    this.right = x + this.width * 0.5;
    this.borders = [this.left, this.right] as const;
    this.lanes = [];

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const laneLeft = this.left + laneIndex * laneWidth;
      this.lanes.push(new Lane(laneIndex, laneLeft, laneWidth));
    }
  }

  public getLaneCenter(index: number): number {
    const safeIndex = clampLaneIndex(index, this.laneCount);

    return this.lanes[safeIndex].center;
  }

  public getLane(index: number): Lane {
    const safeIndex = clampLaneIndex(index, this.laneCount);

    return this.lanes[safeIndex];
  }

  public render(
    ctx: CanvasRenderingContext2D,
    visibleTop: number,
    visibleBottom: number
  ): void {
    const segmentTop = visibleTop;
    const segmentBottom = visibleBottom;
    const segmentHeight = segmentBottom - segmentTop;
    const shoulderLeft = this.left - ROAD_SHOULDER_WIDTH;
    const shoulderRight = this.right + ROAD_SHOULDER_WIDTH;

    ctx.save();

    ctx.fillStyle = '#050b0e';
    ctx.fillRect(shoulderLeft, segmentTop, shoulderRight - shoulderLeft, segmentHeight);

    ctx.fillStyle = '#11181d';
    ctx.fillRect(this.left, segmentTop, this.width, segmentHeight);

    ctx.strokeStyle = '#a6c0b4';
    ctx.lineWidth = 2;
    ctx.setLineDash([DASH_LENGTH, DASH_GAP]);
    ctx.lineDashOffset = -visibleTop;

    for (let laneIndex = 1; laneIndex < this.laneCount; laneIndex += 1) {
      const separatorX = this.left + laneIndex * this.laneWidth;

      ctx.beginPath();
      ctx.moveTo(separatorX, segmentTop);
      ctx.lineTo(separatorX, segmentBottom);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = '#ebfff4';
    ctx.lineWidth = BORDER_WIDTH;

    for (const borderX of this.borders) {
      ctx.beginPath();
      ctx.moveTo(borderX, segmentTop);
      ctx.lineTo(borderX, segmentBottom);
      ctx.stroke();
    }

    ctx.restore();
  }
}
