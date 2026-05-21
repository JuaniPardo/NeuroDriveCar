import type { BrainSnapshot } from '../ai/Brain';
import type {
  CarControlMode,
  LaneAwarenessSnapshot,
  SensorAwarenessSnapshot,
  SteeringDebugSnapshot,
} from '../car/Car';
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
const SENSOR_STRIP_HEIGHT = 12;

export interface HudRenderData {
  width: number;
  height: number;
  framesPerSecond: number;
  controlMode: CarControlMode;
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
  sensorReadings: readonly number[];
  brainSnapshot: BrainSnapshot | null;
  fitness: FitnessDiagnosticSnapshot;
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
    const mainPanelWidth = Math.min(378, Math.max(336, data.width * 0.29));
    const mainPanelHeight = data.showHelp ? 650 : 566;
    const neuralPanelWidth = Math.min(420, Math.max(320, data.width * 0.22));
    const neuralPanelHeight = Math.min(360, Math.max(300, data.height * 0.34));

    this.renderMainPanel(ctx, margin, margin, mainPanelWidth, mainPanelHeight, data);
    this.neuralVisualizer.render(
      ctx,
      data.width - neuralPanelWidth - margin,
      margin,
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
    const headerHeight = 52;
    const sectionGap = 8;
    const sectionHeight = 66;
    const footerHeight = data.showHelp ? 126 : 44;
    const contentX = x + PANEL_PADDING;
    const contentWidth = width - PANEL_PADDING * 2;
    const footerY = y + height - footerHeight - PANEL_PADDING;

    ctx.save();
    ctx.fillStyle = THEME.hud.panelBackground;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    this.renderHeader(ctx, contentX, y + PANEL_PADDING, contentWidth, data);

    let cursorY = y + PANEL_PADDING + headerHeight;

    this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      sectionHeight,
      'SELECTED CAR',
      [
        {
          label: 'STATE',
          value: data.damaged ? 'DAMAGED' : 'ACTIVE',
          valueColor: data.damaged ? THEME.hud.alertColor : THEME.hud.okColor,
        },
        {
          label: 'MODE',
          value: data.controlMode.toUpperCase(),
          valueColor:
            data.controlMode === 'ai' ? THEME.hud.aiColor : THEME.hud.valueColor,
        },
        {
          label: 'SPEED',
          value: `${Math.abs(data.speed).toFixed(1)} ${getVelocityDirectionLabel(data.speed)}`,
        },
        {
          label: 'PROGRESS',
          value: data.traveledDistance.toFixed(1),
        },
      ]
    );
    cursorY += sectionHeight + sectionGap;

    this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      sectionHeight,
      'STEERING',
      [
        {
          label: 'LEFT OUTPUT',
          value: data.steeringDebug.leftOutput.toFixed(2),
        },
        {
          label: 'RIGHT OUTPUT',
          value: data.steeringDebug.rightOutput.toFixed(2),
        },
        {
          label: 'RAW INTENT',
          value: data.steeringDebug.rawSteerIntent.toFixed(2),
        },
        {
          label: 'SMOOTHED',
          value: data.steeringDebug.smoothedSteer.toFixed(2),
          valueColor: THEME.hud.aiColor,
        },
      ]
    );
    cursorY += sectionHeight + sectionGap;

    this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      sectionHeight,
      'LANE AWARENESS',
      [
        {
          label: 'CENTER OFFSET',
          value: data.laneAwareness.laneCenterOffsetNormalized.toFixed(2),
        },
        {
          label: 'HEADING ERR',
          value: data.laneAwareness.headingErrorNormalized.toFixed(2),
        },
        {
          label: 'LANE BLOCKED',
          value: data.laneAwareness.currentLaneBlocked.toFixed(2),
        },
        {
          label: 'L / R CLEAR',
          value: `${data.laneAwareness.leftLaneClear.toFixed(0)} / ${data.laneAwareness.rightLaneClear.toFixed(0)}`,
        },
      ]
    );
    cursorY += sectionHeight + sectionGap;

    this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      sectionHeight,
      'SENSOR AWARENESS',
      [
        {
          label: 'FRONT TRAFFIC',
          value:
            data.sensorAwareness.frontObstacleDistance === null
              ? '--'
              : data.sensorAwareness.frontObstacleDistance.toFixed(1),
        },
        {
          label: 'EDGE PROX',
          value: data.sensorAwareness.edgeProximity.toFixed(2),
        },
        {
          label: 'HITS',
          value: formatHitSummary(data.sensorAwareness),
        },
      ],
      data.sensorReadings
    );
    cursorY += sectionHeight + sectionGap;

    this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      sectionHeight,
      'FITNESS',
      [
        {
          label: 'TOTAL',
          value: data.fitness.totalFitness.toFixed(1),
          valueColor: THEME.hud.aiColor,
        },
        {
          label: 'PROG / SURV',
          value: `${data.fitness.progressReward.toFixed(1)} / ${data.fitness.survivalReward.toFixed(1)}`,
        },
        {
          label: 'REC / EDGE',
          value: `${data.fitness.laneRecoveryReward.toFixed(1)} / ${data.fitness.edgePenalty.toFixed(1)}`,
        },
        {
          label: 'STEER / OBS',
          value: `${data.fitness.steeringPenalty.toFixed(1)} / ${data.fitness.obstaclePenalty.toFixed(1)}`,
        },
      ]
    );
    cursorY += sectionHeight + sectionGap;

    this.renderSectionBox(
      ctx,
      contentX,
      cursorY,
      contentWidth,
      sectionHeight,
      'RUN STATUS',
      [
        {
          label: 'BEST / GEN',
          value: `${data.bestCarIndex + 1} / ${data.generation}`,
        },
        {
          label: 'ALIVE / POP',
          value: `${data.aliveCount} / ${data.populationSize}`,
        },
        {
          label: 'SIM / NEXT',
          value: `${formatSimulationSpeedLabel(data.simulationSpeed)} / ${data.selectedPopulationSize}`,
        },
        {
          label: 'TRAFFIC',
          value: `${data.activeTrafficSettings.phase} / ${data.trafficCount}`,
        },
      ]
    );

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
    ctx.fillText('SELECTED CAR DIAGNOSTICS', x, y);

    ctx.fillStyle = THEME.hud.mutedTextColor;
    ctx.font = `8px ${FONT_MONO}`;
    ctx.fillText('What does the AI think is happening right now?', x, y + 16);

    this.renderKeyValueRow(ctx, x, x + width, y + 32, 'FPS', data.framesPerSecond.toFixed(1));
    this.renderKeyValueRow(
      ctx,
      x + width * 0.42,
      x + width,
      y + 32,
      'SIM',
      data.paused ? 'PAUSED' : formatSimulationSpeedLabel(data.simulationSpeed),
      data.paused ? THEME.hud.alertColor : THEME.hud.okColor
    );

    ctx.strokeStyle = THEME.hud.panelDivider;
    ctx.beginPath();
    ctx.moveTo(x, y + 46.5);
    ctx.lineTo(x + width, y + 46.5);
    ctx.stroke();
  }

  private renderSectionBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    rows: readonly HudRow[],
    sensorReadings?: readonly number[]
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

    let cursorY = y + 22;

    if (sensorReadings !== undefined) {
      this.renderSensorStrip(ctx, x + 10, cursorY, width - 20, sensorReadings);
      cursorY += 16;
    }

    for (const row of rows) {
      this.renderKeyValueRow(ctx, x + 10, x + width - 10, cursorY, row.label, row.value, row.valueColor);
      cursorY += 12;
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
    ctx.fillStyle = THEME.hud.panelBackgroundStrong;
    ctx.strokeStyle = THEME.hud.panelBorder;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.fillStyle = THEME.hud.sectionLabelColor;
    ctx.font = `7px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillText(data.showHelp ? 'HELP / SYSTEM' : 'SYSTEM', x + 10, y + 8);

    ctx.font = `8px ${FONT_MONO}`;
    ctx.fillStyle = THEME.hud.mutedTextColor;
    ctx.fillText(`IO: ${truncateStatusMessage(data.persistenceMessage, 56)}`, x + 10, y + 22);
    ctx.fillText(`CTRL: ${truncateStatusMessage(data.lastControlAction, 54)}`, x + 10, y + 34);

    if (!data.showHelp) {
      ctx.fillText('H help   P pause   R restart   S/L/D brain io', x + 10, y + 46);
      return;
    }

    ctx.fillText(
      `SAVE: ${formatSavedBrainStatus(data.savedBrainExists, data.savedBrainCompatible, data.savedBestDistance)}`,
      x + 10,
      y + 48
    );
    ctx.fillText(
      `TRAFFIC: ${data.activeTrafficSettings.phase} active / ${formatTrafficSettingsLabel(data.selectedTrafficSettings)} next`,
      x + 10,
      y + 62
    );
    ctx.fillText(`LANES: ${data.laneSpeedLabel}`, x + 10, y + 76);
    ctx.fillText(
      `SRC: ${data.populationSource.toUpperCase()}   MUT: ${data.mutationAmount.toFixed(2)} / ${data.selectedMutationRate.toFixed(2)}`,
      x + 10,
      y + 90
    );
    ctx.fillText(
      'Keys: H help, P pause, R restart, 1-4 speed, [ ] pop, - = mut, S/L/D brain',
      x + 10,
      y + 104
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
      ctx.fillRect(slotX, y + (SENSOR_STRIP_HEIGHT - fillHeight), slotWidth, fillHeight);
      ctx.strokeStyle = THEME.hud.sensorBorderColor;
      ctx.strokeRect(slotX + 0.5, y + 0.5, slotWidth - 1, SENSOR_STRIP_HEIGHT - 1);
    }
  }
}

function getVelocityDirectionLabel(speed: number): string {
  if (Math.abs(speed) < 0.001) {
    return 'STOP';
  }

  return speed > 0 ? 'FWD' : 'REV';
}

function formatHitSummary(sensorAwareness: SensorAwarenessSnapshot): string {
  const { border, lane, traffic } = sensorAwareness.hitSummary;

  return `B:${border} L:${lane} T:${traffic}`;
}

function formatSavedBrainStatus(
  exists: boolean,
  compatible: boolean,
  bestDistance: number | null
): string {
  if (!exists) {
    return 'NONE';
  }

  const distanceLabel = bestDistance === null ? '--' : bestDistance.toFixed(1);

  return `${compatible ? 'READY' : 'INCOMP'} @ ${distanceLabel}`;
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
