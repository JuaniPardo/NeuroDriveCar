const FORWARD_KEYS = new Set(['ArrowUp', 'w', 'W']);
const REVERSE_KEYS = new Set(['ArrowDown', 's', 'S']);
const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

export interface ControlState {
  forward: boolean;
  reverse: boolean;
  left: boolean;
  right: boolean;
  steerIntent?: number;
}

export class Controls {
  public forward = false;
  public reverse = false;
  public left = false;
  public right = false;
  public steerIntent = 0;

  private attached = false;
  private readonly resetOnBlur = (): void => {
    this.reset();
  };

  public attach(): void {
    if (this.attached) {
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.resetOnBlur);
    this.attached = true;
  }

  public detach(): void {
    if (!this.attached) {
      return;
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.resetOnBlur);
    this.attached = false;
    this.reset();
  }

  public clear(): void {
    this.reset();
  }

  public applyState(state: ControlState): void {
    this.forward = state.forward;
    this.reverse = state.reverse;
    this.left = state.left;
    this.right = state.right;
    this.steerIntent = state.steerIntent ?? 0;
  }

  public getState(): ControlState {
    return {
      forward: this.forward,
      reverse: this.reverse,
      left: this.left,
      right: this.right,
      steerIntent: this.steerIntent,
    };
  }

  private reset(): void {
    this.forward = false;
    this.reverse = false;
    this.left = false;
    this.right = false;
    this.steerIntent = 0;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isControlKey(event.key)) {
      event.preventDefault();
    }

    this.setKeyState(event.key, true);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.isControlKey(event.key)) {
      event.preventDefault();
    }

    this.setKeyState(event.key, false);
  };

  private isControlKey(key: string): boolean {
    return (
      FORWARD_KEYS.has(key) ||
      REVERSE_KEYS.has(key) ||
      LEFT_KEYS.has(key) ||
      RIGHT_KEYS.has(key)
    );
  }

  private setKeyState(key: string, isPressed: boolean): void {
    if (FORWARD_KEYS.has(key)) {
      this.forward = isPressed;
      return;
    }

    if (REVERSE_KEYS.has(key)) {
      this.reverse = isPressed;
      return;
    }

    if (LEFT_KEYS.has(key)) {
      this.left = isPressed;
      this.steerIntent = Number(this.right) - Number(this.left);
      return;
    }

    if (RIGHT_KEYS.has(key)) {
      this.right = isPressed;
      this.steerIntent = Number(this.right) - Number(this.left);
    }
  }
}
