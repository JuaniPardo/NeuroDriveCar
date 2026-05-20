import type { BrainSnapshot } from '../ai/Brain';
import type { CarControlMode } from '../car/Car';
import type { ControlState } from '../car/Controls';
import { NeuralVisualizer } from './NeuralVisualizer';

const PANEL_BACKGROUND_COLOR = 'rgba(4, 12, 15, 0.84)';
const PANEL_BORDER_COLOR = 'rgba(127, 224, 196, 0.28)';
const PANEL_TEXT_COLOR = '#d7e5de';
const PANEL_MUTED_TEXT_COLOR = '#9db7aa';
const PANEL_ALERT_COLOR = '#ff8a75';
const PANEL_OK_COLOR = '#cde7d5';
const PANEL_AI_COLOR = '#8fe1ff';
const PANEL_WARNING_COLOR = '#f0c67a';
const PANEL_POSITIVE_COLOR = '#9cf0bd';
const PANEL_TITLE = 'NEURODRIVECAR / MVP 08';
const SENSOR_DECIMALS = 2;
const STATUS_LINE_HEIGHT = 28;
const STATUS_TOP_PADDING = 14;
const STATUS_SECTION_GAP = 6;

export interface HudRenderData {
  width: number;
  height: number;
  framesPerSecond: number;
  controlMode: CarControlMode;
  speed: number;
  damaged: boolean;
  traveledDistance: number;
  trafficCount: number;
  trafficTargetSpeed: number;
  laneSpeedLabel: string;
  sensorHitCount: number;
  sensorReadings: readonly number[];
  controlState: Readonly<ControlState>;
  brainSnapshot: BrainSnapshot | null;
}

export class Hud {
  private readonly neuralVisualizer: NeuralVisualizer;

  public constructor() {
    this.neuralVisualizer = new NeuralVisualizer();
  }

  public render(ctx: CanvasRenderingContext2D, data: HudRenderData): void {
    const margin = 16;
    const statusPanelX = margin;
    const statusPanelY = margin;
    const statusPanelWidth = Math.min(232, Math.max(196, data.width * 0.19));
    const statusPanelHeight = 324;
    const neuralPanelWidth = Math.min(420, Math.max(320, data.width * 0.22));
    const neuralPanelHeight = Math.min(360, Math.max(300, data.height * 0.34));
    const neuralPanelX = data.width - neuralPanelWidth - margin;
    const neuralPanelY = margin;

    this.renderStatusPanel(
      ctx,
      statusPanelX,
      statusPanelY,
      statusPanelWidth,
      statusPanelHeight,
      data
    );
    this.neuralVisualizer.render(
      ctx,
      neuralPanelX,
      neuralPanelY,
      neuralPanelWidth,
      neuralPanelHeight,
      data.brainSnapshot
    );
  }

  private renderStatusPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    data: HudRenderData
  ): void {
    const closingDelta = Math.abs(data.speed) - data.trafficTargetSpeed;
    const statusLabel = data.damaged ? 'DAMAGED' : 'ACTIVE';
    const statusColor = data.damaged ? PANEL_ALERT_COLOR : PANEL_OK_COLOR;
    const controlModeColor = data.controlMode === 'ai' ? PANEL_AI_COLOR : PANEL_TEXT_COLOR;
    const deltaColor = closingDelta >= 0 ? PANEL_POSITIVE_COLOR : PANEL_WARNING_COLOR;
    const textX = x + 12;
    const line1Y = y + STATUS_TOP_PADDING;
    const line2Y = line1Y + STATUS_LINE_HEIGHT;
    const line3Y = line2Y + STATUS_LINE_HEIGHT + STATUS_SECTION_GAP;
    const line4Y = line3Y + STATUS_LINE_HEIGHT;
    const line5Y = line4Y + STATUS_LINE_HEIGHT;
    const line6Y = line5Y + STATUS_LINE_HEIGHT;
    const line7Y = line6Y + STATUS_LINE_HEIGHT;
    const line8Y = line7Y + STATUS_LINE_HEIGHT + STATUS_SECTION_GAP;
    const line9Y = line8Y + STATUS_LINE_HEIGHT;
    const line10Y = line9Y + STATUS_LINE_HEIGHT;
    const sensorStripY = line10Y + STATUS_LINE_HEIGHT + 6;

    ctx.save();
    ctx.fillStyle = PANEL_BACKGROUND_COLOR;
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.font = '11px "SF Mono", Monaco, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PANEL_TEXT_COLOR;
    ctx.fillText(PANEL_TITLE, textX, line1Y);
    ctx.fillText(`FPS ${data.framesPerSecond.toFixed(1)}`, textX, line2Y);

    ctx.fillStyle = statusColor;
    ctx.fillText(`STATE ${statusLabel}`, textX, line3Y);

    ctx.fillStyle = controlModeColor;
    ctx.fillText(`MODE ${data.controlMode.toUpperCase()}  [M]`, textX, line4Y);

    ctx.fillStyle = PANEL_TEXT_COLOR;
    ctx.fillText(
      `SPEED ${Math.abs(data.speed).toFixed(1)} ${getVelocityDirectionLabel(data.speed)}`,
      textX,
      line5Y
    );
    ctx.fillText(`DIST ${data.traveledDistance.toFixed(1)}`, textX, line6Y);
    ctx.fillText(`TRAFFIC ${data.trafficCount}`, textX, line7Y);
    ctx.fillText(`T SPEED ${data.trafficTargetSpeed.toFixed(1)}`, textX, line8Y);

    ctx.fillStyle = deltaColor;
    ctx.fillText(`DELTA ${closingDelta.toFixed(1)}`, textX, line9Y);

    ctx.fillStyle = PANEL_MUTED_TEXT_COLOR;
    ctx.fillText(`L SPD ${data.laneSpeedLabel}`, textX, line10Y);
    ctx.fillText(`S HIT ${data.sensorHitCount}`, textX, line10Y + STATUS_LINE_HEIGHT);
    ctx.fillText(
      `CTRL ${formatControlState(data.controlState)}`,
      textX,
      line10Y + STATUS_LINE_HEIGHT * 2
    );

    this.renderSensorStrip(ctx, x + 12, sensorStripY, width - 24, data.sensorReadings);

    ctx.restore();
  }

  private renderSensorStrip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    sensorReadings: readonly number[]
  ): void {
    const slotCount = Math.max(1, sensorReadings.length);
    const gap = 5;
    const slotWidth = (width - gap * (slotCount - 1)) / slotCount;
    const slotHeight = 22;

    for (let index = 0; index < slotCount; index += 1) {
      const reading = sensorReadings[index] ?? 0;
      const fillHeight = slotHeight * reading;
      const slotX = x + index * (slotWidth + gap);
      const slotY = y;

      ctx.fillStyle = 'rgba(12, 25, 29, 0.95)';
      ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
      ctx.fillStyle = 'rgba(135, 255, 224, 0.85)';
      ctx.fillRect(slotX, slotY + (slotHeight - fillHeight), slotWidth, fillHeight);
      ctx.strokeStyle = 'rgba(127, 224, 196, 0.28)';
      ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotWidth - 1, slotHeight - 1);

      ctx.fillStyle = PANEL_TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '9px "SF Mono", Monaco, monospace';
      ctx.fillText(
        reading.toFixed(SENSOR_DECIMALS),
        slotX + slotWidth * 0.5,
        slotY + slotHeight + 4
      );
    }

    ctx.textAlign = 'left';
  }
}

function formatControlState(controlState: Readonly<ControlState>): string {
  return [
    controlState.forward ? 'FWD' : '---',
    controlState.left ? 'L' : '-',
    controlState.right ? 'R' : '-',
    controlState.reverse ? 'REV' : '---',
  ].join(' ');
}

function getVelocityDirectionLabel(speed: number): string {
  if (Math.abs(speed) < 0.001) {
    return 'STOP';
  }

  return speed > 0 ? 'FORWARD' : 'REVERSE';
}
