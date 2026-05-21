import type { BrainSnapshot } from '../ai/Brain';
import type { CarControlMode, SteeringDebugSnapshot } from '../car/Car';
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
const PANEL_PADDING = 12;
const SENSOR_STRIP_HEIGHT = 14;

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
  steeringDebug: SteeringDebugSnapshot;
  laneCenterOffset: number;
  edgeProximity: number;
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

interface HudRow {
  label: string;
  value: string;
  valueColor?: string;
}

export class Hud {
  private readonly neuralVisualizer: NeuralVisualizer;

  public constructor() {
    this.neuralVisualizer = new NeuralVisualizer();
  }

  public render(ctx: CanvasRenderingContext2D, data: HudRenderData): void {
    const margin = 16;
    const panelX = margin;
    const panelY = margin;
    const panelWidth = Math.min(372, Math.max(326, data.width * 0.29));
    const panelHeight = 476;
    const neuralPanelWidth = Math.min(420, Math.max(320, data.width * 0.22));
    const neuralPanelHeight = Math.min(360, Math.max(300, data.height * 0.34));
    const neuralPanelX = data.width - neuralPanelWidth - margin;
    const neuralPanelY = margin;

    this.renderMainPanel(ctx, panelX, panelY, panelWidth, panelHeight, data);
    this.neuralVisualizer.render(
      ctx,
      neuralPanelX,
      neuralPanelY,
      neuralPanelWidth,
      neuralPanelHeight,
      data.brainSnapshot
    );
  }

  private renderMainPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    data: HudRenderData
  ): void {
    const headerHeight = 56;
    const topStatusHeight = 34;
    const gridGap = 8;
    const footerHeight = 122;
    const sectionGap = 10;
    const sectionWidth = (width - PANEL_PADDING * 2 - sectionGap) * 0.5;
    const sectionHeight =
      height -
      PANEL_PADDING * 2 -
      headerHeight -
      topStatusHeight -
      footerHeight -
      gridGap * 2;
    const rowHeight = (sectionHeight - sectionGap) * 0.5;
    const leftColumnX = x + PANEL_PADDING;
    const rightColumnX = leftColumnX + sectionWidth + sectionGap;
    const gridTopY = y + PANEL_PADDING + headerHeight + gridGap + topStatusHeight + gridGap;
    const footerY = gridTopY + rowHeight * 2 + sectionGap;

    ctx.save();
    ctx.fillStyle = THEME.hud.panelBackground;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    this.renderHeader(ctx, x + PANEL_PADDING, y + PANEL_PADDING, width - PANEL_PADDING * 2);
    this.renderTopStatus(
      ctx,
      x + PANEL_PADDING,
      y + PANEL_PADDING + headerHeight,
      width - PANEL_PADDING * 2,
      topStatusHeight,
      data
    );

    this.renderSectionBox(
      ctx,
      leftColumnX,
      gridTopY,
      sectionWidth,
      rowHeight,
      'VEHICLE',
      this.getVehicleRows(data)
    );
    this.renderSectionBox(
      ctx,
      rightColumnX,
      gridTopY,
      sectionWidth,
      rowHeight,
      'POPULATION',
      this.getPopulationRows(data)
    );
    this.renderSectionBox(
      ctx,
      leftColumnX,
      gridTopY + rowHeight + sectionGap,
      sectionWidth,
      rowHeight,
      'PERSISTENCE',
      this.getPersistenceRows(data)
    );
    this.renderSectionBox(
      ctx,
      rightColumnX,
      gridTopY + rowHeight + sectionGap,
      sectionWidth,
      rowHeight,
      'TRAFFIC',
      this.getTrafficRows(data)
    );

    this.renderFooter(
      ctx,
      x + PANEL_PADDING,
      footerY,
      width - PANEL_PADDING * 2,
      footerHeight,
      data
    );
    ctx.restore();
  }

  private renderHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void {
    ctx.fillStyle = THEME.hud.textColor;
    ctx.font = `9px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText(PANEL_TITLE, x, y);

    ctx.strokeStyle = THEME.hud.panelDivider;
    ctx.beginPath();
    ctx.moveTo(x, y + 26.5);
    ctx.lineTo(x + width, y + 26.5);
    ctx.stroke();
  }

  private renderTopStatus(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    data: HudRenderData
  ): void {
    const halfWidth = width * 0.5;

    this.renderKeyValueRow(ctx, x, x + halfWidth - 8, y + 8, 'FPS', data.framesPerSecond.toFixed(1));
    this.renderKeyValueRow(
      ctx,
      x + halfWidth + 8,
      x + width,
      y + 8,
      'SIM',
      `${data.paused ? 'PAUSED' : 'RUNNING'} / ${formatSimulationSpeedLabel(data.simulationSpeed)}`,
      data.paused ? THEME.hud.alertColor : THEME.hud.okColor
    );

    ctx.strokeStyle = THEME.hud.panelDivider;
    ctx.beginPath();
    ctx.moveTo(x, y + height + 0.5);
    ctx.lineTo(x + width, y + height + 0.5);
    ctx.stroke();
  }

  private renderSectionBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    rows: readonly HudRow[]
  ): void {
    ctx.fillStyle = THEME.hud.panelBackgroundStrong;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.fillStyle = THEME.hud.sectionLabelColor;
    ctx.font = `7px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + 10, y + 8);

    let cursorY = y + 24;
    const valueX = x + width - 10;

    for (const row of rows) {
      this.renderKeyValueRow(ctx, x + 10, valueX, cursorY, row.label, row.value, row.valueColor);
      cursorY += 14;
    }
  }

  private renderFooter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    data: HudRenderData
  ): void {
    const textX = x + 10;

    ctx.fillStyle = THEME.hud.panelBackgroundStrong;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.fillStyle = THEME.hud.sectionLabelColor;
    ctx.font = `7px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText('INSTRUCTIONS', textX, y + 8);

    this.renderSensorStrip(ctx, x + 10, y + 22, width - 20, data.sensorReadings);

    ctx.font = `8px ${FONT_MONO}`;
    ctx.fillStyle = THEME.hud.mutedTextColor;
    ctx.fillText(`IO: ${truncateStatusMessage(data.persistenceMessage, 56)}`, textX, y + 44);
    ctx.fillText(`CTRL: ${truncateStatusMessage(data.lastControlAction, 54)}`, textX, y + 58);
    ctx.fillText('P pause/resume   R restart   1-4 speed presets', textX, y + 76);
    ctx.fillText('[ ] population   - = mutation   S / L / D brain io', textX, y + 90);
    ctx.fillText('Traffic settings apply on restart/new generation.', textX, y + 104);
  }

  private getVehicleRows(data: HudRenderData): HudRow[] {
    const statusColor = data.damaged ? THEME.hud.alertColor : THEME.hud.okColor;
    const controlModeColor =
      data.controlMode === 'ai' ? THEME.hud.aiColor : THEME.hud.textColor;

    return [
      {
        label: 'STATE',
        value: data.damaged ? 'DAMAGED' : 'ACTIVE',
        valueColor: statusColor,
      },
      {
        label: 'MODE',
        value: data.controlMode.toUpperCase(),
        valueColor: controlModeColor,
      },
      {
        label: 'SPEED',
        value: `${Math.abs(data.speed).toFixed(1)} ${getVelocityDirectionLabel(data.speed)}`,
      },
      {
        label: 'PROG',
        value: data.traveledDistance.toFixed(1),
      },
      {
        label: 'STEER',
        value: `${data.steeringDebug.rawSteerIntent.toFixed(2)} / ${data.steeringDebug.smoothedSteer.toFixed(2)}`,
        valueColor: THEME.hud.aiColor,
      },
      {
        label: 'OUT',
        value: `${data.steeringDebug.leftOutput.toFixed(2)} ${data.steeringDebug.rightOutput.toFixed(2)}`,
      },
      {
        label: 'LANE',
        value: data.laneCenterOffset.toFixed(2),
      },
      {
        label: 'EDGE',
        value: data.edgeProximity.toFixed(2),
      },
      {
        label: 'CTRL',
        value: formatControlState(data.controlState),
      },
    ];
  }

  private getPopulationRows(data: HudRenderData): HudRow[] {
    return [
      {
        label: 'BEST',
        value: String(data.bestCarIndex + 1),
      },
      {
        label: 'GEN',
        value: String(data.generation),
      },
      {
        label: 'POP',
        value: String(data.populationSize),
      },
      {
        label: 'NEXT POP',
        value: String(data.selectedPopulationSize),
      },
      {
        label: 'ALIVE',
        value: String(data.aliveCount),
      },
      {
        label: 'CRASH',
        value: String(data.crashedCount),
      },
      {
        label: 'B MAX',
        value: data.bestProgress.toFixed(1),
      },
    ];
  }

  private getPersistenceRows(data: HudRenderData): HudRow[] {
    return [
      {
        label: 'SAVED',
        value: data.savedBrainExists ? 'YES' : 'NO',
        valueColor: data.savedBrainExists
          ? THEME.hud.okColor
          : THEME.hud.mutedTextColor,
      },
      {
        label: 'SRC',
        value: data.populationSource.toUpperCase(),
      },
      {
        label: 'MUT',
        value: data.mutationAmount.toFixed(2),
      },
      {
        label: 'NEXT MUT',
        value: data.selectedMutationRate.toFixed(2),
      },
      {
        label: 'S BEST',
        value: data.savedBestDistance === null ? '--' : data.savedBestDistance.toFixed(1),
      },
    ];
  }

  private getTrafficRows(data: HudRenderData): HudRow[] {
    return [
      {
        label: 'PHASE',
        value: data.activeTrafficSettings.phase,
      },
      {
        label: 'COUNT',
        value: String(data.trafficCount),
      },
      {
        label: 'DENS',
        value: data.activeTrafficSettings.density.toUpperCase(),
      },
      {
        label: 'SPEED',
        value: data.activeTrafficSettings.speedPreset.toUpperCase(),
      },
      {
        label: 'SPAWN',
        value: data.activeTrafficSettings.spawnDistancePreset.toUpperCase(),
      },
      {
        label: 'NEXT',
        value: formatTrafficSettingsLabel(data.selectedTrafficSettings),
      },
      {
        label: 'TARGET',
        value: data.trafficTargetSpeed.toFixed(1),
      },
      {
        label: 'LANES',
        value: data.laneSpeedLabel,
      },
      {
        label: 'S HIT',
        value: String(data.sensorHitCount),
      },
    ];
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

    for (let index = 0; index < slotCount; index += 1) {
      const reading = sensorReadings[index] ?? 0;
      const fillHeight = SENSOR_STRIP_HEIGHT * reading;
      const slotX = x + index * (slotWidth + gap);

      ctx.fillStyle = THEME.hud.sensorTrackColor;
      ctx.fillRect(slotX, y, slotWidth, SENSOR_STRIP_HEIGHT);
      ctx.fillStyle = THEME.hud.sensorFillColor;
      ctx.fillRect(
        slotX,
        y + (SENSOR_STRIP_HEIGHT - fillHeight),
        slotWidth,
        fillHeight
      );
      ctx.strokeStyle = THEME.hud.sensorBorderColor;
      ctx.strokeRect(slotX + 0.5, y + 0.5, slotWidth - 1, SENSOR_STRIP_HEIGHT - 1);
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
  ].join(' ');
}
