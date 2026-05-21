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
const STATUS_LINE_HEIGHT = 22;
const STATUS_TOP_PADDING = 14;
const STATUS_SECTION_GAP = 10;
const INSTRUCTIONS_TITLE_COLOR = '#cde7d5';
const INSTRUCTIONS_TEXT_COLOR = '#9db7aa';
const VALUE_TEXT_COLOR = '#f1f7f4';
const SECTION_LABEL_COLOR = '#7f9b90';
const SECTION_DIVIDER_COLOR = 'rgba(127, 224, 196, 0.1)';

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
    const statusPanelHeight = 520;
    const instructionsPanelY = statusPanelY + statusPanelHeight + 12;
    const instructionsPanelHeight = 94;
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
    this.renderInstructionsPanel(
      ctx,
      statusPanelX,
      instructionsPanelY,
      statusPanelWidth,
      instructionsPanelHeight
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
    const valueX = x + width - 12;
    let cursorY = y + STATUS_TOP_PADDING;

    ctx.save();
    ctx.fillStyle = PANEL_BACKGROUND_COLOR;
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PANEL_TEXT_COLOR;
    ctx.fillText(PANEL_TITLE, textX, cursorY);
    cursorY += STATUS_LINE_HEIGHT + 4;

    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'FPS', data.framesPerSecond.toFixed(1));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderDivider(ctx, x + 12, x + width - 12, cursorY);
    cursorY += STATUS_SECTION_GAP;

    this.renderSectionLabel(ctx, textX, cursorY, 'VEHICLE');
    cursorY += STATUS_LINE_HEIGHT - 2;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'STATE', statusLabel, statusColor);
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'MODE',
      data.controlMode.toUpperCase(),
      controlModeColor
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'SPEED',
      `${Math.abs(data.speed).toFixed(1)} ${getVelocityDirectionLabel(data.speed)}`
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'PROG', data.traveledDistance.toFixed(1));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'CTRL',
      formatControlState(data.controlState)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderDivider(ctx, x + 12, x + width - 12, cursorY);
    cursorY += STATUS_SECTION_GAP;

    this.renderSectionLabel(ctx, textX, cursorY, 'POPULATION');
    cursorY += STATUS_LINE_HEIGHT - 2;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'BEST',
      `${data.bestCarIndex + 1} / GEN ${data.generation}`
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'POP', String(data.populationSize));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'ALIVE', String(data.aliveCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'CRASH', String(data.crashedCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'B MAX', data.bestProgress.toFixed(1));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderDivider(ctx, x + 12, x + width - 12, cursorY);
    cursorY += STATUS_SECTION_GAP;

    this.renderSectionLabel(ctx, textX, cursorY, 'TRAFFIC');
    cursorY += STATUS_LINE_HEIGHT - 2;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'COUNT', String(data.trafficCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'TARGET', data.trafficTargetSpeed.toFixed(1));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'LANES', data.laneSpeedLabel);
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'S HIT', String(data.sensorHitCount));
    cursorY += STATUS_LINE_HEIGHT + 2;
    this.renderSectionLabel(ctx, textX, cursorY, 'SENSORS');
    cursorY += 18;

    this.renderSensorStrip(ctx, x + 12, cursorY, width - 24, data.sensorReadings);

    ctx.restore();
  }

  private renderKeyValueRow(
    ctx: CanvasRenderingContext2D,
    labelX: number,
    valueX: number,
    y: number,
    label: string,
    value: string,
    valueColor = VALUE_TEXT_COLOR
  ): void {
    ctx.font = '9px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = PANEL_MUTED_TEXT_COLOR;
    ctx.fillText(label, labelX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = valueColor;
    ctx.fillText(value, valueX, y);
    ctx.textAlign = 'left';
  }

  private renderSectionLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string
  ): void {
    ctx.font = '8px "SF Mono", Monaco, monospace';
    ctx.fillStyle = SECTION_LABEL_COLOR;
    ctx.fillText(label, x, y);
  }

  private renderDivider(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    y: number
  ): void {
    ctx.strokeStyle = SECTION_DIVIDER_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, y + 0.5);
    ctx.lineTo(endX, y + 0.5);
    ctx.stroke();
  }

  private renderInstructionsPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const textX = x + 12;
    const line1Y = y + 12;
    const line2Y = line1Y + 24;
    const line3Y = line2Y + 18;
    const line4Y = line3Y + 18;

    ctx.save();
    ctx.fillStyle = PANEL_BACKGROUND_COLOR;
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.textBaseline = 'top';
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.fillStyle = INSTRUCTIONS_TITLE_COLOR;
    ctx.fillText('INSTRUCTIONS', textX, line1Y);

    ctx.fillStyle = INSTRUCTIONS_TEXT_COLOR;
    ctx.font = '9px "SF Mono", Monaco, monospace';
    ctx.fillText('Best brain is auto-saved in localStorage.', textX, line2Y);
    ctx.fillText('Reload or press R to restart from the saved champion.', textX, line3Y);
    ctx.fillText('Population cars mutate around the current best genome.', textX, line4Y);
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
