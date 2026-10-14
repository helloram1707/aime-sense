import type { Machine, ObservationRecord } from '@/context/HealthStore';
import {
  calculateVibrationRms,
  evaluateHealth,
  validateWindow,
  type AlertState,
  type MeasurementSample,
  type ValidationReport,
  type VibrationResult,
} from './healthEngine';

export interface WindowAnalysis {
  report: ValidationReport;
  vibration: VibrationResult | null;
  record: ObservationRecord;
}

export function analyzeWindowForMachine(input: {
  machine: Machine;
  samples: readonly unknown[];
  nowMonotonicMs?: number;
  observedAtMs?: number;
  sensorAvailable?: boolean;
  previousAlertState?: AlertState;
  originalDataSource?: string | null;
}): WindowAnalysis {
  const observedAtMs = input.observedAtMs ?? Date.now();
  const report = validateWindow(input.samples, {
    expectedMachineId: input.machine.id,
    nowMonotonicMs: input.nowMonotonicMs,
    maxLiveAgeMs: 2_000,
    minSamples: 24,
    minDurationMs: 2_000,
    maxGapMs: 250,
    maxAbsAxisMps2: 100,
  });
  const vibration = calculateVibrationRms(report);
  const decision = evaluateHealth({
    machineId: input.machine.id,
    report,
    observedRmsMps2: vibration?.rmsMps2 ?? null,
    baseline: input.machine.baseline,
    thresholds: input.machine.thresholds,
    previousAlertState: input.previousAlertState ?? input.machine.alertState,
    sensorAvailable: input.sensorAvailable ?? true,
    observedAtMs,
  });

  const record: ObservationRecord = {
    id: `${observedAtMs}-${Math.random().toString(36).slice(2, 9)}`,
    machineId: input.machine.id,
    source: report.source,
    ...(input.originalDataSource
      ? { originalDataSource: input.originalDataSource }
      : {}),
    capturedAtMs: observedAtMs,
    samples: input.samples as MeasurementSample[],
    validation: {
      totalReceived: report.totalReceived,
      validSamples: report.validSamples,
      rejectedSamples: report.rejectedSamples,
      rejectionCounts: Object.fromEntries(
        Object.entries(report.rejectionCounts).map(([key, value]) => [
          key,
          value ?? 0,
        ]),
      ),
      observationDurationMs: report.observationDurationMs,
      intervalMinMs: report.intervalMinMs,
      intervalMedianMs: report.intervalMedianMs,
      intervalMaxMs: report.intervalMaxMs,
      suitableForAnalysis: report.suitableForAnalysis,
      diagnostics: report.diagnostics,
    },
    rmsMps2: vibration?.rmsMps2 ?? null,
    decision,
  };

  return { report, vibration, record };
}
