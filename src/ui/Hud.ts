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
const PANEL_TITLE = 'NEURODRIVECAR / MVP 09';
const SENSOR_STRIP_HEIGHT = 16;
const STATUS_LINE_HEIGHT = 25;
const STATUS_TOP_PADDING = 14;
const STATUS_SECTION_GAP = 8;

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
  populationSize: number;
  aliveCount: number;
  crashedCount: number;
  bestCarIndex: number;
  bestProgress: number;
  generation: number;
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
    const statusPanelWidth = Math.min(340, Math.max(304, data.width * 0.26));
    const statusPanelHeight = Math.min(472, Math.max(420, data.height - margin * 2));
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
    const statusLabel = data.damaged ? 'DAMAGED' : 'ACTIVE';
    const statusColor = data.damaged ? PANEL_ALERT_COLOR : PANEL_OK_COLOR;
    const controlModeColor = data.controlMode === 'ai' ? PANEL_AI_COLOR : PANEL_TEXT_COLOR;
    const textX = x + 12;
    const line1Y = y + STATUS_TOP_PADDING;
    const compactLineHeight = STATUS_LINE_HEIGHT;
    const line2Y = line1Y + compactLineHeight;
    const line3Y = line2Y + compactLineHeight + STATUS_SECTION_GAP;
    const line4Y = line3Y + compactLineHeight;
    const line5Y = line4Y + compactLineHeight;
    const line6Y = line5Y + compactLineHeight;
    const line7Y = line6Y + compactLineHeight;
    const line8Y = line7Y + compactLineHeight + STATUS_SECTION_GAP;
    const line9Y = line8Y + compactLineHeight;
    const line10Y = line9Y + compactLineHeight;
    const line11Y = line10Y + compactLineHeight;
    const line12Y = line11Y + compactLineHeight;
    const line13Y = line12Y + compactLineHeight;
    const sensorLabelY = line13Y + compactLineHeight + 8;
    const sensorStripY = sensorLabelY + 18;

    ctx.save();
    ctx.fillStyle = PANEL_BACKGROUND_COLOR;
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PANEL_TEXT_COLOR;
    ctx.fillText(PANEL_TITLE, textX, line1Y);
    ctx.fillText(`FPS ${data.framesPerSecond.toFixed(1)}`, textX, line2Y);

    ctx.fillStyle = statusColor;
    ctx.fillText(`STATE ${statusLabel}`, textX, line3Y);

    ctx.fillStyle = controlModeColor;
    ctx.fillText(`MODE ${data.controlMode.toUpperCase()}`, textX, line4Y);

    ctx.fillStyle = PANEL_TEXT_COLOR;
    ctx.fillText(
      `SPEED ${Math.abs(data.speed).toFixed(1)} ${getVelocityDirectionLabel(data.speed)}`,
      textX,
      line5Y
    );
    ctx.fillText(`PROG ${data.traveledDistance.toFixed(1)}`, textX, line6Y);
    ctx.fillText(`BEST ${data.bestCarIndex + 1} / GEN ${data.generation}`, textX, line7Y);
    ctx.fillText(`POP ${data.populationSize}`, textX, line8Y);
    ctx.fillText(`ALIVE ${data.aliveCount}`, textX, line9Y);
    ctx.fillText(`CRASH ${data.crashedCount}`, textX, line10Y);
    ctx.fillText(`B MAX ${data.bestProgress.toFixed(1)}`, textX, line11Y);
    ctx.fillText(`TRAFFIC ${data.trafficCount}`, textX, line12Y);
    ctx.fillText(`T SPEED ${data.trafficTargetSpeed.toFixed(1)}`, textX, line13Y);

    ctx.fillStyle = PANEL_MUTED_TEXT_COLOR;
    ctx.font = '9px "SF Mono", Monaco, monospace';
    ctx.fillText(`L SPD ${data.laneSpeedLabel}`, textX, sensorLabelY - 44);
    ctx.fillText(`S HIT ${data.sensorHitCount}`, textX, sensorLabelY - 22);
    ctx.fillText(`CTRL ${formatControlState(data.controlState)}`, textX, sensorLabelY);
    ctx.fillText('SENSORS', textX, sensorLabelY + 18);

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
    const gap = 4;
    const slotWidth = (width - gap * (slotCount - 1)) / slotCount;
    const slotHeight = SENSOR_STRIP_HEIGHT;

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
    }
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
