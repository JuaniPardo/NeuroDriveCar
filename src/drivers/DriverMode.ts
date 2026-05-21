export const DRIVER_MODE_OPTIONS = ['manual', 'ai', 'heuristic'] as const;

export type DriverMode = (typeof DRIVER_MODE_OPTIONS)[number];

export function formatDriverModeLabel(mode: DriverMode): string {
  if (mode === 'manual') {
    return 'Manual';
  }

  if (mode === 'heuristic') {
    return 'Heuristic';
  }

  return 'AI';
}
