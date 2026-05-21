import type { BrainSnapshot } from '../ai/Brain';
import type { CarControlMode } from '../car/Car';
import type { ControlState } from '../car/Controls';
import {
  formatSimulationSpeedLabel,
  type MutationRateOption,
  type PopulationSizeOption,
  type SimulationSpeedOption,
} from '../game/simulationControls';
import type { PopulationSource } from '../population/PopulationManager';
import type { TrafficSettings } from '../traffic/trafficSettings';
import { FONT_MONO, THEME } from '../utils/visualTheme';
import { NeuralVisualizer } from './NeuralVisualizer';

const PANEL_TITLE = 'NEURODRIVECAR / MVP 12';
const SENSOR_STRIP_HEIGHT = 14;
const STATUS_LINE_HEIGHT = 18;
const STATUS_TOP_PADDING = 12;
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
  activeTrafficSettings: TrafficSettings;
  selectedTrafficSettings: TrafficSettings;
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
  paused: boolean;
  simulationSpeed: SimulationSpeedOption;
  selectedPopulationSize: PopulationSizeOption;
  selectedMutationRate: MutationRateOption;
  lastControlAction: string;
  savedBrainExists: boolean;
  savedBestDistance: number | null;
  populationSource: PopulationSource;
  mutationAmount: number;
  persistenceMessage: string;
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
    const statusPanelWidth = Math.min(324, Math.max(288, data.width * 0.24));
    const statusPanelHeight = 652;
    const instructionsPanelY = statusPanelY + statusPanelHeight + 10;
    const instructionsPanelHeight = 122;
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
    const statusColor = data.damaged ? THEME.hud.alertColor : THEME.hud.okColor;
    const controlModeColor =
      data.controlMode === 'ai' ? THEME.hud.aiColor : THEME.hud.textColor;
    const textX = x + 12;
    const valueX = x + width - 12;
    let cursorY = y + STATUS_TOP_PADDING;

    ctx.save();
    ctx.fillStyle = THEME.hud.panelBackground;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.font = `9px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = THEME.hud.textColor;
    ctx.fillText(PANEL_TITLE, textX, cursorY);
    cursorY += STATUS_LINE_HEIGHT + 4;

    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'FPS', data.framesPerSecond.toFixed(1));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'SIM',
      data.paused ? 'PAUSED' : 'RUNNING',
      data.paused ? THEME.hud.alertColor : THEME.hud.okColor
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'MULT',
      formatSimulationSpeedLabel(data.simulationSpeed)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderDivider(ctx, x + 12, x + width - 12, cursorY);
    cursorY += STATUS_SECTION_GAP;

    this.renderSectionLabel(ctx, textX, cursorY, 'VEHICLE');
    cursorY += 14;
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
    cursorY += 14;
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
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'NEXT POP',
      String(data.selectedPopulationSize)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'ALIVE', String(data.aliveCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'CRASH', String(data.crashedCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'B MAX', data.bestProgress.toFixed(1));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderDivider(ctx, x + 12, x + width - 12, cursorY);
    cursorY += STATUS_SECTION_GAP;

    this.renderSectionLabel(ctx, textX, cursorY, 'PERSISTENCE');
    cursorY += 14;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'SAVED',
      data.savedBrainExists ? 'YES' : 'NO',
      data.savedBrainExists ? THEME.hud.okColor : THEME.hud.mutedTextColor
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'SRC',
      data.populationSource.toUpperCase()
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'MUT',
      data.mutationAmount.toFixed(2)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'NEXT MUT',
      data.selectedMutationRate.toFixed(2)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'S BEST',
      data.savedBestDistance === null ? '--' : data.savedBestDistance.toFixed(1)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'IO',
      truncateStatusMessage(data.persistenceMessage, 28)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'CTRL',
      truncateStatusMessage(data.lastControlAction, 28)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderDivider(ctx, x + 12, x + width - 12, cursorY);
    cursorY += STATUS_SECTION_GAP;

    this.renderSectionLabel(ctx, textX, cursorY, 'TRAFFIC');
    cursorY += 14;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'COUNT', String(data.trafficCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'PHASE',
      data.activeTrafficSettings.phase
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'ENABLED',
      data.activeTrafficSettings.enabled ? 'TRUE' : 'FALSE'
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'DENS',
      data.activeTrafficSettings.density.toUpperCase()
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'SPEED',
      data.activeTrafficSettings.speedPreset.toUpperCase()
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'SPAWN',
      data.activeTrafficSettings.spawnDistancePreset.toUpperCase()
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'NEXT',
      formatTrafficSettingsLabel(data.selectedTrafficSettings)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(
      ctx,
      textX,
      valueX,
      cursorY,
      'TARGET',
      data.trafficTargetSpeed.toFixed(1)
    );
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'LANES', data.laneSpeedLabel);
    cursorY += STATUS_LINE_HEIGHT;
    this.renderKeyValueRow(ctx, textX, valueX, cursorY, 'S HIT', String(data.sensorHitCount));
    cursorY += STATUS_LINE_HEIGHT;
    this.renderSectionLabel(ctx, textX, cursorY, 'SENSORS');
    cursorY += 14;

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
    valueColor: string = THEME.hud.valueColor
  ): void {
    ctx.font = `8px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = THEME.hud.mutedTextColor;
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
    ctx.font = `7px ${FONT_MONO}`;
    ctx.fillStyle = THEME.hud.sectionLabelColor;
    ctx.fillText(label, x, y);
  }

  private renderDivider(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    y: number
  ): void {
    ctx.strokeStyle = THEME.hud.panelDivider;
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
    const line1Y = y + 10;
    const line2Y = line1Y + 18;
    const line3Y = line2Y + 14;
    const line4Y = line3Y + 14;
    const line5Y = line4Y + 14;
    const line6Y = line5Y + 14;

    ctx.save();
    ctx.fillStyle = THEME.hud.panelBackground;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.textBaseline = 'top';
    ctx.font = `9px ${FONT_MONO}`;
    ctx.fillStyle = THEME.hud.okColor;
    ctx.fillText('INSTRUCTIONS', textX, line1Y);

    ctx.fillStyle = THEME.hud.mutedTextColor;
    ctx.font = `8px ${FONT_MONO}`;
    ctx.fillText('P pause/resume   R restart   1-4 speed presets', textX, line2Y);
    ctx.fillText('[ and ] arm population size   - and = arm mutation', textX, line3Y);
    ctx.fillText('S save best brain   L load saved brain   D delete saved', textX, line4Y);
    ctx.fillText('Traffic phase/settings apply on restart or new generation.', textX, line5Y);
    ctx.fillText('Population/mutation apply on restart. Brain only uses localStorage.', textX, line6Y);
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
    const gap = 3;
    const slotWidth = (width - gap * (slotCount - 1)) / slotCount;
    const slotHeight = SENSOR_STRIP_HEIGHT;

    for (let index = 0; index < slotCount; index += 1) {
      const reading = sensorReadings[index] ?? 0;
      const fillHeight = slotHeight * reading;
      const slotX = x + index * (slotWidth + gap);
      const slotY = y;

      ctx.fillStyle = THEME.hud.sensorTrackColor;
      ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
      ctx.fillStyle = THEME.hud.sensorFillColor;
      ctx.fillRect(slotX, slotY + (slotHeight - fillHeight), slotWidth, fillHeight);
      ctx.strokeStyle = THEME.hud.sensorBorderColor;
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

  return speed > 0 ? 'FWD' : 'REV';
}

function truncateStatusMessage(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatTrafficSettingsLabel(settings: TrafficSettings): string {
  return [
    settings.enabled ? 'ON' : 'OFF',
    settings.density.toUpperCase(),
    settings.speedPreset.toUpperCase(),
    settings.spawnDistancePreset.toUpperCase(),
  ].join(' ');
}
