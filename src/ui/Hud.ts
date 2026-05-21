import type { BrainSnapshot } from '../ai/Brain';
import type {
  CarControlMode,
  LaneAwarenessSnapshot,
  SensorAwarenessSnapshot,
  SteeringDebugSnapshot,
} from '../car/Car';
import { formatDriverModeLabel, type DriverMode } from '../drivers/DriverMode';
import type { HeuristicDriverDebugSnapshot } from '../drivers/HeuristicDriver';
import {
  formatSimulationSpeedLabel,
  type MutationRateOption,
  type PopulationSizeOption,
  type SimulationSpeedOption,
} from '../game/simulationControls';
import type {
  FitnessDiagnosticSnapshot,
  PopulationSource,
} from '../population/PopulationManager';
import type { TrafficSettings } from '../traffic/trafficSettings';
import { FONT_MONO, THEME } from '../utils/visualTheme';
import { NeuralVisualizer } from './NeuralVisualizer';

const PANEL_PADDING = 12;
const SENSOR_STRIP_HEIGHT = 10;
const SECTION_GAP = 8;
const BASE_SECTION_HEIGHT = 54;
const PANEL_MARGIN = 16;

export interface HudRenderData {
  width: number;
  height: number;
  framesPerSecond: number;
  controlMode: CarControlMode;
  selectedDriverMode: DriverMode;
  speed: number;
  damaged: boolean;
  traveledDistance: number;
  trafficCount: number;
  laneSpeedLabel: string;
  activeTrafficSettings: TrafficSettings;
  selectedTrafficSettings: TrafficSettings;
  steeringDebug: SteeringDebugSnapshot;
  laneAwareness: LaneAwarenessSnapshot;
  sensorAwareness: SensorAwarenessSnapshot;
  heuristicDebug: HeuristicDriverDebugSnapshot;
  sensorReadings: readonly number[];
  brainSnapshot: BrainSnapshot | null;
  fitness: FitnessDiagnosticSnapshot;
  bestAiFitness: number;
  heuristicFitness: number;
  aiHeuristicRatio: number;
  bestAiProgress: number;
  heuristicProgress: number;
  bestAiSurvivalTime: number;
  heuristicSurvivalTime: number;
  populationSize: number;
  aliveCount: number;
  crashedCount: number;
  bestCarIndex: number;
  generation: number;
  paused: boolean;
  simulationSpeed: SimulationSpeedOption;
  selectedPopulationSize: PopulationSizeOption;
  selectedMutationRate: MutationRateOption;
  lastControlAction: string;
  savedBrainExists: boolean;
  savedBrainCompatible: boolean;
  savedBestDistance: number | null;
  populationSource: PopulationSource;
  mutationAmount: number;
  persistenceMessage: string;
  showHelp: boolean;
  showAdvancedDiagnostics: boolean;
  showNeuralVisualizer: boolean;
  showControlsPanel: boolean;
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
    const mainPanelWidth = Math.min(350, Math.max(300, data.width * 0.26));
    const mainPanelHeight = this.getMainPanelHeight(data);

    this.renderMainPanel(
      ctx,
      PANEL_MARGIN,
      PANEL_MARGIN,
      mainPanelWidth,
      mainPanelHeight,
      data
    );

    if (data.showNeuralVisualizer) {
      const neuralPanelWidth = Math.min(400, Math.max(300, data.width * 0.22));
      const neuralPanelHeight = Math.min(360, Math.max(292, data.height * 0.34));

      this.neuralVisualizer.render(
        ctx,
        data.width - neuralPanelWidth - PANEL_MARGIN,
        PANEL_MARGIN,
        neuralPanelWidth,
        neuralPanelHeight,
        data.brainSnapshot
      );
    }
  }

  private getMainPanelHeight(data: HudRenderData): number {
    const sectionCount = data.showAdvancedDiagnostics ? 6 : 5;
    const footerHeight = data.showHelp ? 92 : 42;
    const headerHeight = 48;
    const baseHeight =
      PANEL_PADDING * 2 +
      headerHeight +
      footerHeight +
      sectionCount * BASE_SECTION_HEIGHT +
      (sectionCount - 1) * SECTION_GAP;

    return Math.min(data.height - PANEL_MARGIN * 2, baseHeight);
  }

  private renderMainPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    data: HudRenderData
  ): void {
    const contentX = x + PANEL_PADDING;
    const contentWidth = width - PANEL_PADDING * 2;
    const footerHeight = data.showHelp ? 92 : 42;
    const footerY = y + height - footerHeight - PANEL_PADDING;

    ctx.save();
    ctx.fillStyle = THEME.hud.panelBackground;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    this.renderHeader(ctx, contentX, y + PANEL_PADDING, contentWidth, data);

    let cursorY = y + PANEL_PADDING + 48;

    cursorY = this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      'SELECTED',
      [
        row('STATE', data.damaged ? 'DMGD' : 'LIVE', data.damaged ? THEME.hud.alertColor : THEME.hud.okColor),
        row('SPD', formatSignedValue(data.speed, 1)),
        row('PROG', formatValue(data.traveledDistance, 0)),
        row(
          'FIT',
          formatValue(
            data.selectedDriverMode === 'heuristic'
              ? data.heuristicFitness
              : data.fitness.totalFitness,
            0
          ),
          data.controlMode === 'ai' ? THEME.hud.aiColor : THEME.hud.valueColor
        ),
      ]
    );

    cursorY = this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      'STEER',
      [
        row('RAW', formatSignedValue(data.steeringDebug.rawSteerIntent, 2)),
        row('SMTH', formatSignedValue(data.steeringDebug.smoothedSteer, 2), THEME.hud.aiColor),
        row('DIR', String(data.steeringDebug.steeringDirection)),
        row(
          data.controlMode === 'heuristic' ? 'WHY' : 'HOLD',
          data.controlMode === 'heuristic'
            ? data.heuristicDebug.reason
            : formatValue(data.steeringDebug.sustainedSteerTime, 2)
        ),
      ]
    );

    cursorY = this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      'LANE',
      [
        row('OFF', formatSignedValue(data.laneAwareness.laneCenterOffsetNormalized, 2)),
        row('HEAD', formatSignedValue(data.laneAwareness.headingErrorNormalized, 2)),
        row('DLTA', formatSignedValue(data.laneAwareness.laneOffsetDelta, 2)),
        row(
          data.controlMode === 'heuristic' ? 'TLANE' : 'RCVR',
          data.controlMode === 'heuristic'
            ? formatTargetLaneLabel(data.heuristicDebug.targetLane)
            : formatSignedValue(data.steeringDebug.recoveryTrend, 2)
        ),
      ]
    );

    cursorY = this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      'RISK',
      [
        row('FRONT', data.sensorAwareness.frontObstacleDistance === null ? '--' : formatValue(data.sensorAwareness.frontObstacleDistance, 0)),
        row('EDGE', formatValue(data.sensorAwareness.edgeProximity, 2)),
        row('BLKD', formatValue(data.laneAwareness.currentLaneBlocked, 0)),
        row('CLR', `${formatValue(data.laneAwareness.leftLaneClear, 0)}/${formatValue(data.laneAwareness.rightLaneClear, 0)}`),
      ],
      data.sensorReadings
    );

    cursorY = this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      'RUN',
      [
        row('BEST', `${data.bestCarIndex + 1}/${data.generation}`),
        row('ALIVE', `${data.aliveCount}/${data.populationSize}`),
        row('SIM', data.paused ? 'PAUSE' : formatSimulationSpeedLabel(data.simulationSpeed)),
        row('A/H', formatRatioLabel(data.aiHeuristicRatio), THEME.hud.aiColor),
      ]
    );

    if (data.showAdvancedDiagnostics) {
      this.renderSectionBox(
        ctx,
        contentX,
        cursorY,
        contentWidth,
        'ADVANCED',
        [
          row('AI FIT', formatValue(data.bestAiFitness, 0), THEME.hud.aiColor),
          row('HEUR', formatValue(data.heuristicFitness, 0)),
          row('A/H P', `${formatValue(data.bestAiProgress, 0)}/${formatValue(data.heuristicProgress, 0)}`),
          row('A/H T', `${formatValue(data.bestAiSurvivalTime, 1)}/${formatValue(data.heuristicSurvivalTime, 1)}`),
        ]
      );
    }

    this.renderFooter(ctx, contentX, footerY, contentWidth, footerHeight, data);
    ctx.restore();
  }

  private renderHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    data: HudRenderData
  ): void {
    ctx.fillStyle = THEME.hud.textColor;
    ctx.font = `9px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText(`DRIVER: ${formatDriverModeLabel(data.selectedDriverMode).toUpperCase()}`, x, y);

    this.renderKeyValueRow(ctx, x, x + width * 0.45, y + 18, 'FPS', formatValue(data.framesPerSecond, 1));
    this.renderKeyValueRow(
      ctx,
      x + width * 0.48,
      x + width,
      y + 18,
      'MODE',
      formatDriverModeLabel(data.selectedDriverMode).toUpperCase(),
      data.controlMode === 'ai' ? THEME.hud.aiColor : THEME.hud.valueColor
    );
    this.renderKeyValueRow(
      ctx,
      x,
      x + width,
      y + 30,
      'VIEW',
      `${data.showNeuralVisualizer ? 'VIZ' : 'NO VIZ'} / ${data.showControlsPanel ? 'CTRL' : 'NO CTRL'} / ${data.showAdvancedDiagnostics ? 'ADV' : 'BASIC'}`,
      THEME.hud.mutedTextColor
    );

    ctx.strokeStyle = THEME.hud.panelDivider;
    ctx.beginPath();
    ctx.moveTo(x, y + 42.5);
    ctx.lineTo(x + width, y + 42.5);
    ctx.stroke();
  }

  private renderSectionBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    rows: readonly HudRow[],
    sensorReadings?: readonly number[]
  ): number {
    const rowHeight = 11;
    const sensorHeight = sensorReadings === undefined ? 0 : 14;
    const height = 20 + sensorHeight + rows.length * rowHeight + 6;

    ctx.fillStyle = THEME.hud.panelBackgroundStrong;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.fillStyle = THEME.hud.sectionLabelColor;
    ctx.font = `7px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + 10, y + 7);

    let cursorY = y + 19;

    if (sensorReadings !== undefined) {
      this.renderSensorStrip(ctx, x + 10, cursorY, width - 20, sensorReadings);
      cursorY += 16;
    }

    for (const currentRow of rows) {
      this.renderKeyValueRow(
        ctx,
        x + 10,
        x + width - 10,
        cursorY,
        currentRow.label,
        currentRow.value,
        currentRow.valueColor
      );
      cursorY += rowHeight;
    }

    return y + height + SECTION_GAP;
  }

  private renderFooter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    data: HudRenderData
  ): void {
    ctx.fillStyle = THEME.hud.panelBackgroundStrong;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.fillStyle = THEME.hud.sectionLabelColor;
    ctx.font = `7px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText(data.showHelp ? 'HELP' : 'STATUS', x + 10, y + 7);

    ctx.font = `8px ${FONT_MONO}`;
    ctx.fillStyle = THEME.hud.mutedTextColor;
    ctx.fillText(`IO ${truncateStatusMessage(data.persistenceMessage, 40)}`, x + 10, y + 19);
    ctx.fillText(`MSG ${truncateStatusMessage(data.lastControlAction, 38)}`, x + 10, y + 31);

    if (!data.showHelp) {
      ctx.fillText('H help  M driver  D adv  V viz  C ctrl', x + 10, y + 43);
      return;
    }

    ctx.fillText(
      `SAVE ${formatSavedBrainStatus(data.savedBrainExists, data.savedBrainCompatible, data.savedBestDistance)}`,
      x + 10,
      y + 43
    );
    ctx.fillText(
      `TRAF ${truncateStatusMessage(formatTrafficSettingsLabel(data.selectedTrafficSettings), 28)}  SRC ${data.populationSource.toUpperCase()}`,
      x + 10,
      y + 55
    );
    ctx.fillText(
      `A/H ${formatRatioLabel(data.aiHeuristicRatio)}  REC ${formatValue(data.mutationAmount, 2)}  LANE ${truncateStatusMessage(data.laneSpeedLabel, 14)}`,
      x + 10,
      y + 67
    );
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
    ctx.fillText(truncateStatusMessage(label, 8), labelX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = valueColor;
    ctx.fillText(truncateStatusMessage(value, 18), valueX, y);
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
    const gap = 2;
    const slotWidth = (width - gap * (slotCount - 1)) / slotCount;

    for (let index = 0; index < slotCount; index += 1) {
      const reading = sensorReadings[index] ?? 0;
      const fillHeight = SENSOR_STRIP_HEIGHT * reading;
      const slotX = x + index * (slotWidth + gap);

      ctx.fillStyle = THEME.hud.sensorTrackColor;
      ctx.fillRect(slotX, y, slotWidth, SENSOR_STRIP_HEIGHT);
      ctx.fillStyle = THEME.hud.sensorFillColor;
      ctx.fillRect(slotX, y + (SENSOR_STRIP_HEIGHT - fillHeight), slotWidth, fillHeight);
      ctx.strokeStyle = THEME.hud.sensorBorderColor;
      ctx.strokeRect(slotX + 0.5, y + 0.5, slotWidth - 1, SENSOR_STRIP_HEIGHT - 1);
    }
  }
}

function row(label: string, value: string, valueColor?: string): HudRow {
  return { label, value, valueColor };
}

function formatValue(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : '--';
}

function formatSignedValue(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    return '--';
  }

  const fixedValue = value.toFixed(decimals);

  return value > 0 ? `+${fixedValue}` : fixedValue;
}

function formatSavedBrainStatus(
  exists: boolean,
  compatible: boolean,
  bestDistance: number | null
): string {
  if (!exists) {
    return 'NONE';
  }

  const distanceLabel = bestDistance === null ? '--' : bestDistance.toFixed(0);

  return `${compatible ? 'READY' : 'INCOMP'} ${distanceLabel}`;
}

function formatTargetLaneLabel(targetLane: number | null): string {
  return targetLane === null ? '--' : `L${targetLane + 1}`;
}

function formatRatioLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '--';
  }

  return `${(value * 100).toFixed(0)}%`;
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
