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

interface ControlsPanelCallbacks {
  onTogglePause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: SimulationSpeedOption) => void;
  onPopulationSizeChange: (size: PopulationSizeOption) => void;
  onMutationRateChange: (rate: MutationRateOption) => void;
}

export interface ControlsPanelSnapshot extends SimulationControlSnapshot {
  generation: number;
  activePopulationSize: number;
  activeMutationRate: number;
  populationSource: PopulationSource;
  savedBrainExists: boolean;
}

export class ControlsPanel {
  private readonly root: HTMLDivElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly speedButtons = new Map<SimulationSpeedOption, HTMLButtonElement>();
  private readonly populationSizeSelect: HTMLSelectElement;
  private readonly mutationRateSelect: HTMLSelectElement;
  private readonly activeRunValue: HTMLSpanElement;
  private readonly activePopulationValue: HTMLSpanElement;
  private readonly activeMutationValue: HTMLSpanElement;
  private readonly populationSourceValue: HTMLSpanElement;
  private readonly savedBrainValue: HTMLSpanElement;
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
      <div class="controls-panel__section controls-panel__section--status">
        <div class="controls-panel__status-row"><span>Run</span><span data-field="run"></span></div>
        <div class="controls-panel__status-row"><span>Active Pop</span><span data-field="active-population"></span></div>
        <div class="controls-panel__status-row"><span>Active Mut</span><span data-field="active-mutation"></span></div>
        <div class="controls-panel__status-row"><span>Source</span><span data-field="population-source"></span></div>
        <div class="controls-panel__status-row"><span>Saved Brain</span><span data-field="saved-brain"></span></div>
      </div>
      <p class="controls-panel__feedback" data-field="feedback"></p>
      <p class="controls-panel__hint">Keys: P pause, R restart, 1-4 speed, [ ] population, - / = mutation</p>
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
    this.activeRunValue.textContent = `GEN ${snapshot.generation}`;
    this.activePopulationValue.textContent = String(snapshot.activePopulationSize);
    this.activeMutationValue.textContent = snapshot.activeMutationRate.toFixed(2);
    this.populationSourceValue.textContent = snapshot.populationSource.toUpperCase();
    this.savedBrainValue.textContent = snapshot.savedBrainExists ? 'READY' : 'NONE';
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
