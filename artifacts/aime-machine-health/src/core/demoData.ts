import type { DataSource, MeasurementSample } from './healthEngine';

export type DemoLevel = 'reference' | 'normal' | 'warning' | 'critical';

const AMPLITUDE: Record<DemoLevel, number> = {
  reference: 0.1,
  normal: 0.12,
  warning: 0.18,
  critical: 0.24,
};

export function createDemoWindow(
  machineId: string,
  level: DemoLevel,
  wallClockStartMs = Date.now(),
): MeasurementSample[] {
  const amplitude = AMPLITUDE[level];
  const count = 81;
  const intervalMs = 50;
  const sampleRateHz = 1_000 / intervalMs;
  const frequencyHz = 3;

  return Array.from({ length: count }, (_, index) => {
    const phase =
      (2 * Math.PI * frequencyHz * index) / sampleRateHz;
    const values = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map(
      (offset) => amplitude * Math.sin(phase + offset),
    );
    return {
      machineId,
      monotonicMs: index * intervalMs,
      wallClockMs: wallClockStartMs + index * intervalMs,
      x: values[0],
      y: values[1],
      z: values[2],
      unit: 'm/s²' as const,
      dataSource: 'SIMULATED_DATA' satisfies DataSource,
    };
  });
}
