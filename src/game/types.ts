export interface Updatable {
  update(deltaTimeSeconds: number): void;
}

export interface Renderable {
  render(): void;
}
