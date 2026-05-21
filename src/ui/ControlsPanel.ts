import type { PopulationSource } from '../population/PopulationManager';
import {
  formatSimulationSpeedLabel,
  MUTATION_RATE_OPTIONS,
  POPULATION_SIZE_OPTIONS,
  SIMULATION_SPEED_OPTIONS,
  type MutationRateOption,
  type PopulationSizeOption,
  type SimulationControlSnapshot,
  type SimulationSpeedOption,
} from '../game/simulationControls';
import {
  TRAFFIC_DENSITY_OPTIONS,
  TRAFFIC_SPAWN_DISTANCE_PRESET_OPTIONS,
  TRAFFIC_SPEED_PRESET_OPTIONS,
  TRAINING_TRAFFIC_PHASE_OPTIONS,
  type TrafficDensity,
  type TrafficSettings,
  type TrafficSpawnDistancePreset,
  type TrafficSpeedPreset,
  type TrainingTrafficPhase,
} from '../traffic/trafficSettings';

interface ControlsPanelCallbacks {
  onTogglePause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: SimulationSpeedOption) => void;
  onPopulationSizeChange: (size: PopulationSizeOption) => void;
  onMutationRateChange: (rate: MutationRateOption) => void;
  onTrafficEnabledChange: (enabled: boolean) => void;
  onTrafficPhaseChange: (phase: TrainingTrafficPhase) => void;
  onTrafficDensityChange: (density: TrafficDensity) => void;
  onTrafficSpeedPresetChange: (preset: TrafficSpeedPreset) => void;
  onTrafficSpawnDistancePresetChange: (preset: TrafficSpawnDistancePreset) => void;
}

export interface ControlsPanelSnapshot extends SimulationControlSnapshot {
  generation: number;
  activePopulationSize: number;
  activeMutationRate: number;
  populationSource: PopulationSource;
  savedBrainExists: boolean;
  activeTrafficSettings: TrafficSettings;
  selectedTrafficSettings: TrafficSettings;
}

export class ControlsPanel {
  private readonly root: HTMLDivElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly speedButtons = new Map<SimulationSpeedOption, HTMLButtonElement>();
  private readonly populationSizeSelect: HTMLSelectElement;
  private readonly mutationRateSelect: HTMLSelectElement;
  private readonly trafficEnabledSelect: HTMLSelectElement;
  private readonly trafficPhaseSelect: HTMLSelectElement;
  private readonly trafficDensitySelect: HTMLSelectElement;
  private readonly trafficSpeedSelect: HTMLSelectElement;
  private readonly trafficSpawnSelect: HTMLSelectElement;
  private readonly activeRunValue: HTMLSpanElement;
  private readonly activePopulationValue: HTMLSpanElement;
  private readonly activeMutationValue: HTMLSpanElement;
  private readonly populationSourceValue: HTMLSpanElement;
  private readonly savedBrainValue: HTMLSpanElement;
  private readonly activeTrafficPhaseValue: HTMLSpanElement;
  private readonly activeTrafficSummaryValue: HTMLSpanElement;
  private readonly feedbackValue: HTMLParagraphElement;
  private readonly clickListener: (event: MouseEvent) => void;
  private readonly changeListener: (event: Event) => void;
  private readonly callbacks: ControlsPanelCallbacks;

  public constructor(container: HTMLElement, callbacks: ControlsPanelCallbacks) {
    this.callbacks = callbacks;
    this.root = document.createElement('div');
    this.root.className = 'controls-panel';
    this.root.innerHTML = `
      <div class="controls-panel__header">
        <p class="controls-panel__eyebrow">SIMULATION CONTROLS</p>
        <h2 class="controls-panel__title">Training Sandbox</h2>
      </div>
      <div class="controls-panel__actions">
        <button type="button" class="controls-panel__button" data-action="toggle-pause"></button>
        <button type="button" class="controls-panel__button controls-panel__button--secondary" data-action="restart">Restart Run</button>
      </div>
      <div class="controls-panel__section">
        <p class="controls-panel__label">Simulation Speed</p>
        <div class="controls-panel__speed-grid"></div>
      </div>
      <div class="controls-panel__section">
        <label class="controls-panel__label" for="population-size-select">Population Size</label>
        <select id="population-size-select" class="controls-panel__select"></select>
      </div>
      <div class="controls-panel__section">
        <label class="controls-panel__label" for="mutation-rate-select">Mutation Rate</label>
        <select id="mutation-rate-select" class="controls-panel__select"></select>
      </div>
      <div class="controls-panel__section">
        <p class="controls-panel__label">Traffic Settings</p>
        <div class="controls-panel__stack">
          <label class="controls-panel__field" for="traffic-phase-select">
            <span>Training Phase</span>
            <select id="traffic-phase-select" class="controls-panel__select"></select>
          </label>
          <label class="controls-panel__field" for="traffic-enabled-select">
            <span>Traffic Enabled</span>
            <select id="traffic-enabled-select" class="controls-panel__select">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <label class="controls-panel__field" for="traffic-density-select">
            <span>Traffic Density</span>
            <select id="traffic-density-select" class="controls-panel__select"></select>
          </label>
          <label class="controls-panel__field" for="traffic-speed-select">
            <span>Traffic Speed</span>
            <select id="traffic-speed-select" class="controls-panel__select"></select>
          </label>
          <label class="controls-panel__field" for="traffic-spawn-select">
            <span>Spawn Distance</span>
            <select id="traffic-spawn-select" class="controls-panel__select"></select>
          </label>
        </div>
      </div>
      <div class="controls-panel__section controls-panel__section--status">
        <div class="controls-panel__status-row"><span>Run</span><span data-field="run"></span></div>
        <div class="controls-panel__status-row"><span>Active Pop</span><span data-field="active-population"></span></div>
        <div class="controls-panel__status-row"><span>Active Mut</span><span data-field="active-mutation"></span></div>
        <div class="controls-panel__status-row"><span>Source</span><span data-field="population-source"></span></div>
        <div class="controls-panel__status-row"><span>Saved Brain</span><span data-field="saved-brain"></span></div>
        <div class="controls-panel__status-row"><span>Traffic Phase</span><span data-field="active-traffic-phase"></span></div>
        <div class="controls-panel__status-row"><span>Traffic</span><span data-field="active-traffic-summary"></span></div>
      </div>
      <p class="controls-panel__feedback" data-field="feedback"></p>
      <p class="controls-panel__hint">Keys: H help, P pause, R restart, 1-4 speed, [ ] population, - / = mutation</p>
      <p class="controls-panel__hint">Traffic changes are armed immediately and applied on restart/new generation.</p>
    `;

    this.pauseButton = getRequiredElement<HTMLButtonElement>(
      this.root,
      '[data-action="toggle-pause"]'
    );
    this.restartButton = getRequiredElement<HTMLButtonElement>(
      this.root,
      '[data-action="restart"]'
    );
    this.populationSizeSelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#population-size-select'
    );
    this.mutationRateSelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#mutation-rate-select'
    );
    this.trafficEnabledSelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#traffic-enabled-select'
    );
    this.trafficPhaseSelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#traffic-phase-select'
    );
    this.trafficDensitySelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#traffic-density-select'
    );
    this.trafficSpeedSelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#traffic-speed-select'
    );
    this.trafficSpawnSelect = getRequiredElement<HTMLSelectElement>(
      this.root,
      '#traffic-spawn-select'
    );
    this.activeRunValue = getRequiredElement<HTMLSpanElement>(this.root, '[data-field="run"]');
    this.activePopulationValue = getRequiredElement<HTMLSpanElement>(
      this.root,
      '[data-field="active-population"]'
    );
    this.activeMutationValue = getRequiredElement<HTMLSpanElement>(
      this.root,
      '[data-field="active-mutation"]'
    );
    this.populationSourceValue = getRequiredElement<HTMLSpanElement>(
      this.root,
      '[data-field="population-source"]'
    );
    this.savedBrainValue = getRequiredElement<HTMLSpanElement>(
      this.root,
      '[data-field="saved-brain"]'
    );
    this.activeTrafficPhaseValue = getRequiredElement<HTMLSpanElement>(
      this.root,
      '[data-field="active-traffic-phase"]'
    );
    this.activeTrafficSummaryValue = getRequiredElement<HTMLSpanElement>(
      this.root,
      '[data-field="active-traffic-summary"]'
    );
    this.feedbackValue = getRequiredElement<HTMLParagraphElement>(
      this.root,
      '[data-field="feedback"]'
    );

    this.buildSpeedButtons();
    this.buildSelectOptions();

    this.clickListener = (event: MouseEvent) => {
      this.handleClick(event);
    };
    this.changeListener = (event: Event) => {
      this.handleChange(event);
    };

    this.root.addEventListener('click', this.clickListener);
    this.root.addEventListener('change', this.changeListener);
    container.append(this.root);
  }

  public destroy(): void {
    this.root.removeEventListener('click', this.clickListener);
    this.root.removeEventListener('change', this.changeListener);
    this.root.remove();
  }

  public render(snapshot: ControlsPanelSnapshot): void {
    this.pauseButton.textContent = snapshot.paused ? 'Resume' : 'Pause';
    this.restartButton.disabled = false;
    this.populationSizeSelect.value = String(snapshot.selectedPopulationSize);
    this.mutationRateSelect.value = snapshot.selectedMutationRate.toFixed(2);
    this.trafficEnabledSelect.value = String(snapshot.selectedTrafficSettings.enabled);
    this.trafficPhaseSelect.value = snapshot.selectedTrafficSettings.phase;
    this.trafficDensitySelect.value = snapshot.selectedTrafficSettings.density;
    this.trafficSpeedSelect.value = snapshot.selectedTrafficSettings.speedPreset;
    this.trafficSpawnSelect.value = snapshot.selectedTrafficSettings.spawnDistancePreset;
    this.activeRunValue.textContent = `GEN ${snapshot.generation}`;
    this.activePopulationValue.textContent = String(snapshot.activePopulationSize);
    this.activeMutationValue.textContent = snapshot.activeMutationRate.toFixed(2);
    this.populationSourceValue.textContent = snapshot.populationSource.toUpperCase();
    this.savedBrainValue.textContent = snapshot.savedBrainExists ? 'READY' : 'NONE';
    this.activeTrafficPhaseValue.textContent = snapshot.activeTrafficSettings.phase.toUpperCase();
    this.activeTrafficSummaryValue.textContent = formatTrafficSummary(
      snapshot.activeTrafficSettings
    );
    this.feedbackValue.textContent = snapshot.lastActionMessage;

    for (const [speed, button] of this.speedButtons) {
      const isActive = speed === snapshot.speedMultiplier;

      button.classList.toggle('controls-panel__speed-button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  private buildSpeedButtons(): void {
    const container = getRequiredElement<HTMLDivElement>(this.root, '.controls-panel__speed-grid');

    for (const speed of SIMULATION_SPEED_OPTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'controls-panel__speed-button';
      button.dataset.speed = String(speed);
      button.textContent = formatSimulationSpeedLabel(speed);
      container.append(button);
      this.speedButtons.set(speed, button);
    }
  }

  private buildSelectOptions(): void {
    for (const size of POPULATION_SIZE_OPTIONS) {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = String(size);
      this.populationSizeSelect.append(option);
    }

    for (const rate of MUTATION_RATE_OPTIONS) {
      const option = document.createElement('option');
      option.value = rate.toFixed(2);
      option.textContent = rate.toFixed(2);
      this.mutationRateSelect.append(option);
    }

    for (const phase of TRAINING_TRAFFIC_PHASE_OPTIONS) {
      const option = document.createElement('option');
      option.value = phase;
      option.textContent = phase;
      this.trafficPhaseSelect.append(option);
    }

    for (const density of TRAFFIC_DENSITY_OPTIONS) {
      const option = document.createElement('option');
      option.value = density;
      option.textContent = density;
      this.trafficDensitySelect.append(option);
    }

    for (const preset of TRAFFIC_SPEED_PRESET_OPTIONS) {
      const option = document.createElement('option');
      option.value = preset;
      option.textContent = preset;
      this.trafficSpeedSelect.append(option);
    }

    for (const preset of TRAFFIC_SPAWN_DISTANCE_PRESET_OPTIONS) {
      const option = document.createElement('option');
      option.value = preset;
      option.textContent = preset;
      this.trafficSpawnSelect.append(option);
    }
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionButton = target.closest<HTMLElement>('[data-action]');

    if (actionButton !== null) {
      const action = actionButton.dataset.action;

      if (action === 'toggle-pause') {
        this.callbacks.onTogglePause();
        return;
      }

      if (action === 'restart') {
        this.callbacks.onRestart();
      }

      return;
    }

    const speedButton = target.closest<HTMLButtonElement>('[data-speed]');

    if (speedButton === null) {
      return;
    }

    const nextSpeed = Number(speedButton.dataset.speed);

    if (isSimulationSpeedOption(nextSpeed)) {
      this.callbacks.onSpeedChange(nextSpeed);
    }
  }

  private handleChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (target === this.populationSizeSelect) {
      const nextSize = Number(target.value);

      if (isPopulationSizeOption(nextSize)) {
        this.callbacks.onPopulationSizeChange(nextSize);
      }

      return;
    }

    if (target === this.mutationRateSelect) {
      const nextRate = Number(target.value);

      if (isMutationRateOption(nextRate)) {
        this.callbacks.onMutationRateChange(nextRate);
      }

      return;
    }

    if (target === this.trafficEnabledSelect) {
      this.callbacks.onTrafficEnabledChange(target.value === 'true');
      return;
    }

    if (target === this.trafficPhaseSelect) {
      if (isTrainingTrafficPhase(target.value)) {
        this.callbacks.onTrafficPhaseChange(target.value);
      }

      return;
    }

    if (target === this.trafficDensitySelect) {
      if (isTrafficDensity(target.value)) {
        this.callbacks.onTrafficDensityChange(target.value);
      }

      return;
    }

    if (target === this.trafficSpeedSelect) {
      if (isTrafficSpeedPreset(target.value)) {
        this.callbacks.onTrafficSpeedPresetChange(target.value);
      }

      return;
    }

    if (target === this.trafficSpawnSelect) {
      if (isTrafficSpawnDistancePreset(target.value)) {
        this.callbacks.onTrafficSpawnDistancePresetChange(target.value);
      }
    }
  }
}

function getRequiredElement<TElement extends Element>(
  root: ParentNode,
  selector: string
): TElement {
  const element = root.querySelector<TElement>(selector);

  if (element === null) {
    throw new Error(`Expected element "${selector}" to exist in controls panel.`);
  }

  return element;
}

function isSimulationSpeedOption(value: number): value is SimulationSpeedOption {
  return SIMULATION_SPEED_OPTIONS.includes(value as SimulationSpeedOption);
}

function isPopulationSizeOption(value: number): value is PopulationSizeOption {
  return POPULATION_SIZE_OPTIONS.includes(value as PopulationSizeOption);
}

function isMutationRateOption(value: number): value is MutationRateOption {
  return MUTATION_RATE_OPTIONS.includes(value as MutationRateOption);
}

function isTrainingTrafficPhase(value: string): value is TrainingTrafficPhase {
  return TRAINING_TRAFFIC_PHASE_OPTIONS.includes(value as TrainingTrafficPhase);
}

function isTrafficDensity(value: string): value is TrafficDensity {
  return TRAFFIC_DENSITY_OPTIONS.includes(value as TrafficDensity);
}

function isTrafficSpeedPreset(value: string): value is TrafficSpeedPreset {
  return TRAFFIC_SPEED_PRESET_OPTIONS.includes(value as TrafficSpeedPreset);
}

function isTrafficSpawnDistancePreset(
  value: string
): value is TrafficSpawnDistancePreset {
  return TRAFFIC_SPAWN_DISTANCE_PRESET_OPTIONS.includes(
    value as TrafficSpawnDistancePreset
  );
}

function formatTrafficSummary(settings: TrafficSettings): string {
  return [
    settings.enabled ? 'ON' : 'OFF',
    settings.density.toUpperCase(),
    settings.speedPreset.toUpperCase(),
    settings.spawnDistancePreset.toUpperCase(),
  ].join(' / ');
}
