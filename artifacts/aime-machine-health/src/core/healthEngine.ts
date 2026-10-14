export const DATA_SOURCES = [
  "LIVE_SENSOR",
  "IMPORTED_DATA",
  "SIMULATED_DATA",
] as const;

export type DataSource = (typeof DATA_SOURCES)[number];
export type ReportSource = DataSource | "MIXED" | "UNKNOWN";

export const VALIDATION_REASONS = [
  "MISSING_REQUIRED_FIELD",
  "INVALID_VALUE",
  "INVALID_TIMESTAMP",
  "INVALID_UNIT",
  "UNKNOWN_SOURCE",
  "MACHINE_MISMATCH",
  "DUPLICATE_TIMESTAMP",
  "OUT_OF_ORDER_TIMESTAMP",
  "OUT_OF_RANGE",
  "REJECTED_STALE_DATA",
  "REJECTED_SAMPLING_GAP",
  "REJECTED_MIXED_SOURCE",
  "INSUFFICIENT_SAMPLES",
  "INSUFFICIENT_DURATION",
] as const;

export type ValidationReason = (typeof VALIDATION_REASONS)[number];

export type HealthStatus =
  | "NORMAL"
  | "WARNING"
  | "CRITICAL"
  | "INSUFFICIENT_DATA"
  | "SENSOR_UNAVAILABLE"
  | "DATA_INVALID";

export interface MeasurementSample {
  machineId: string;
  /** Native sensor event timestamp in monotonic milliseconds, where available. */
  monotonicMs: number;
  /** JavaScript monotonic time when the native sensor callback reached the app. */
  receiptMonotonicMs?: number;
  wallClockMs: number;
  x: number;
  y: number;
  z: number;
  unit: "m/s²";
  dataSource: DataSource;
}

export interface ValidationDiagnostic {
  reason: ValidationReason;
  message: string;
  sampleIndex?: number;
}

export interface ValidationConfig {
  expectedMachineId: string;
  nowMonotonicMs?: number;
  maxLiveAgeMs?: number;
  minSamples?: number;
  minDurationMs?: number;
  maxGapMs?: number;
  maxAbsAxisMps2?: number;
}

export interface ValidationReport {
  source: ReportSource;
  totalReceived: number;
  validSamples: number;
  rejectedSamples: number;
  rejectionCounts: Partial<Record<ValidationReason, number>>;
  observationDurationMs: number;
  intervalMinMs: number | null;
  intervalMedianMs: number | null;
  intervalMaxMs: number | null;
  suitableForAnalysis: boolean;
  acceptedSamples: MeasurementSample[];
  diagnostics: ValidationDiagnostic[];
}

export interface VibrationResult {
  rmsMps2: number;
  sampleCount: number;
  durationMs: number;
  method: "WINDOW_MEAN_REMOVAL_VECTOR_RMS";
}

export interface Baseline {
  machineId: string;
  source: DataSource;
  rmsMps2: number;
  establishedAtMs: number;
  sampleCount: number;
  durationMs: number;
  method: "WINDOW_MEAN_REMOVAL_VECTOR_RMS";
  confirmedReferenceCondition: true;
}

export interface HealthThresholds {
  warningRatio: number;
  criticalRatio: number;
}

export interface AlertState {
  activeStatus: "NORMAL" | "WARNING" | "CRITICAL";
  warningStreak: number;
  recoveryStreak: number;
}

export interface HealthDecision {
  status: HealthStatus;
  alertRaised: boolean;
  reason: string;
  observedRmsMps2: number | null;
  warningThresholdMps2: number | null;
  criticalThresholdMps2: number | null;
  source: ReportSource;
  observedAtMs: number;
  recommendedAction: string;
  nextAlertState: AlertState;
}

const DEFAULT_ALERT_STATE: AlertState = {
  activeStatus: "NORMAL",
  warningStreak: 0,
  recoveryStreak: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDataSource = (value: unknown): value is DataSource =>
  typeof value === "string" &&
  (DATA_SOURCES as readonly string[]).includes(value);

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

function sourceOf(sources: Set<DataSource>): ReportSource {
  if (sources.size === 0) return "UNKNOWN";
  if (sources.size > 1) return "MIXED";
  return [...sources][0];
}

/**
 * Validates one complete sensor window. Invalid rows are never coerced to zero.
 * Samples with invalid values are excluded; any rejected row makes the whole
 * window unsuitable for health analysis so poor-quality windows cannot report
 * NORMAL. Imported and simulated data are not checked against the phone's
 * current monotonic clock.
 */
export function validateWindow(
  input: readonly unknown[],
  config: ValidationConfig,
): ValidationReport {
  const minimumSamples = config.minSamples ?? 24;
  const minimumDurationMs = config.minDurationMs ?? 2_000;
  const maxLiveAgeMs = config.maxLiveAgeMs ?? 2_000;
  const maxGapMs = config.maxGapMs ?? 250;
  const maxAbsAxisMps2 = config.maxAbsAxisMps2 ?? 100;

  const diagnostics: ValidationDiagnostic[] = [];
  const acceptedSamples: MeasurementSample[] = [];
  const sources = new Set<DataSource>();
  let lastAcceptedMonotonicMs: number | null = null;
  let rejectedRows = 0;

  input.forEach((raw, sampleIndex) => {
    const rowReasons = new Set<ValidationReason>();
    if (!isRecord(raw)) {
      diagnostics.push({
        reason: "MISSING_REQUIRED_FIELD",
        message: "This row is not a measurement object.",
        sampleIndex,
      });
      rejectedRows += 1;
      return;
    }

    const requiredFields = [
      "machineId",
      "monotonicMs",
      "wallClockMs",
      "x",
      "y",
      "z",
      "unit",
      "dataSource",
    ] as const;
    if (requiredFields.some((field) => !(field in raw))) {
      rowReasons.add("MISSING_REQUIRED_FIELD");
    }

    if (typeof raw.dataSource === "string" && isDataSource(raw.dataSource)) {
      sources.add(raw.dataSource);
    } else {
      rowReasons.add("UNKNOWN_SOURCE");
    }

    if (typeof raw.machineId !== "string" || raw.machineId.trim() === "") {
      rowReasons.add("MISSING_REQUIRED_FIELD");
    } else if (raw.machineId !== config.expectedMachineId) {
      rowReasons.add("MACHINE_MISMATCH");
    }

    const axes = [raw.x, raw.y, raw.z];
    if (
      axes.some(
        (axis) => typeof axis !== "number" || !Number.isFinite(axis),
      )
    ) {
      rowReasons.add("INVALID_VALUE");
    } else if (
      axes.some((axis) => Math.abs(axis as number) > maxAbsAxisMps2)
    ) {
      rowReasons.add("OUT_OF_RANGE");
    }

    if (raw.unit !== "m/s²") rowReasons.add("INVALID_UNIT");

    const monotonicMs = raw.monotonicMs;
    const wallClockMs = raw.wallClockMs;
    if (
      typeof monotonicMs !== "number" ||
      !Number.isFinite(monotonicMs) ||
      monotonicMs < 0 ||
      typeof wallClockMs !== "number" ||
      !Number.isFinite(wallClockMs) ||
      wallClockMs <= 0 ||
      ("receiptMonotonicMs" in raw &&
        (typeof raw.receiptMonotonicMs !== "number" ||
          !Number.isFinite(raw.receiptMonotonicMs) ||
          raw.receiptMonotonicMs < 0))
    ) {
      rowReasons.add("INVALID_TIMESTAMP");
    } else if (lastAcceptedMonotonicMs !== null) {
      if (monotonicMs === lastAcceptedMonotonicMs) {
        rowReasons.add("DUPLICATE_TIMESTAMP");
      } else if (monotonicMs < lastAcceptedMonotonicMs) {
        rowReasons.add("OUT_OF_ORDER_TIMESTAMP");
      }
    }

    if (rowReasons.size > 0) {
      rowReasons.forEach((reason) => {
        diagnostics.push({
          reason,
          message: diagnosticMessage(reason),
          sampleIndex,
        });
      });
      rejectedRows += 1;
      return;
    }

    const sample: MeasurementSample = {
      machineId: raw.machineId as string,
      monotonicMs: monotonicMs as number,
      ...(typeof raw.receiptMonotonicMs === "number"
        ? { receiptMonotonicMs: raw.receiptMonotonicMs }
        : {}),
      wallClockMs: wallClockMs as number,
      x: raw.x as number,
      y: raw.y as number,
      z: raw.z as number,
      unit: "m/s²",
      dataSource: raw.dataSource as DataSource,
    };
    acceptedSamples.push(sample);
    lastAcceptedMonotonicMs = sample.monotonicMs;
  });

  const source = sourceOf(sources);
  if (source === "MIXED") {
    diagnostics.push({
      reason: "REJECTED_MIXED_SOURCE",
      message:
        "A single observation window cannot combine live, imported, or simulated samples.",
    });
  }

  const intervals = acceptedSamples
    .slice(1)
    .map(
      (sample, index) =>
        sample.monotonicMs - acceptedSamples[index].monotonicMs,
    );
  const intervalMedianMs = median(intervals);
  const intervalMinMs = intervals.length ? Math.min(...intervals) : null;
  const intervalMaxMs = intervals.length ? Math.max(...intervals) : null;
  const first = acceptedSamples[0];
  const last = acceptedSamples[acceptedSamples.length - 1];
  const observationDurationMs =
    first && last ? last.monotonicMs - first.monotonicMs : 0;

  if (intervalMedianMs !== null && intervalMaxMs !== null) {
    const permittedGapMs = Math.max(maxGapMs, intervalMedianMs * 3);
    if (intervalMaxMs > permittedGapMs) {
      diagnostics.push({
        reason: "REJECTED_SAMPLING_GAP",
        message: `The largest sample interval (${formatNumber(intervalMaxMs)} ms) exceeds the permitted gap (${formatNumber(permittedGapMs)} ms).`,
      });
    }
  }

  if (source === "LIVE_SENSOR") {
    const newestReceiptTime = last?.receiptMonotonicMs;
    if (
      config.nowMonotonicMs === undefined ||
      newestReceiptTime === undefined
    ) {
      diagnostics.push({
        reason: "REJECTED_STALE_DATA",
        message:
          "Freshness could not be verified against a monotonic clock for this live sensor window.",
      });
    } else if (
      config.nowMonotonicMs - newestReceiptTime < 0 ||
      config.nowMonotonicMs - newestReceiptTime > maxLiveAgeMs
    ) {
      diagnostics.push({
        reason: "REJECTED_STALE_DATA",
        message: `The newest live sample is outside the ${formatNumber(maxLiveAgeMs)} ms freshness limit.`,
      });
    }
  }

  if (acceptedSamples.length < minimumSamples) {
    diagnostics.push({
      reason: "INSUFFICIENT_SAMPLES",
      message: `Need at least ${minimumSamples} valid samples; received ${acceptedSamples.length}.`,
    });
  }
  if (observationDurationMs < minimumDurationMs) {
    diagnostics.push({
      reason: "INSUFFICIENT_DURATION",
      message: `Need at least ${formatNumber(minimumDurationMs)} ms of observation; received ${formatNumber(observationDurationMs)} ms.`,
    });
  }

  const rejectionCounts: Partial<Record<ValidationReason, number>> = {};
  for (const item of diagnostics) {
    rejectionCounts[item.reason] = (rejectionCounts[item.reason] ?? 0) + 1;
  }

  const hasAnyRejectedRow = rejectedRows > 0;
  const hasBlockingDiagnostic = diagnostics.length > 0;
  const suitableForAnalysis =
    input.length > 0 &&
    acceptedSamples.length >= minimumSamples &&
    observationDurationMs >= minimumDurationMs &&
    !hasAnyRejectedRow &&
    !hasBlockingDiagnostic;

  return {
    source,
    totalReceived: input.length,
    validSamples: acceptedSamples.length,
    rejectedSamples: rejectedRows,
    rejectionCounts,
    observationDurationMs,
    intervalMinMs,
    intervalMedianMs,
    intervalMaxMs,
    suitableForAnalysis,
    acceptedSamples,
    diagnostics,
  };
}

function diagnosticMessage(reason: ValidationReason): string {
  const messages: Record<ValidationReason, string> = {
    MISSING_REQUIRED_FIELD: "One or more required measurement fields are missing.",
    INVALID_VALUE: "Acceleration values must be finite numbers.",
    INVALID_TIMESTAMP: "Monotonic and wall-clock timestamps must be valid.",
    INVALID_UNIT: "Acceleration unit must be m/s².",
    UNKNOWN_SOURCE: "Data source must be explicitly identified.",
    MACHINE_MISMATCH: "Measurement belongs to a different machine.",
    DUPLICATE_TIMESTAMP: "Two samples have the same monotonic timestamp.",
    OUT_OF_ORDER_TIMESTAMP:
      "Samples must be received in strictly increasing monotonic time order.",
    OUT_OF_RANGE: "An acceleration axis exceeds the configured sensor limit.",
    REJECTED_STALE_DATA: "Live data freshness could not be verified.",
    REJECTED_SAMPLING_GAP: "The observation contains an excessive sample gap.",
    REJECTED_MIXED_SOURCE:
      "An observation must contain only one data source.",
    INSUFFICIENT_SAMPLES: "The observation has too few valid samples.",
    INSUFFICIENT_DURATION: "The observation window is too short.",
  };
  return messages[reason];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Removes each axis' window mean (a simple DC/gravity-offset estimate) and
 * calculates the vector RMS of the remaining dynamic acceleration.
 * This is a screening feature, not frequency-weighted industrial vibration.
 */
export function calculateVibrationRms(
  report: ValidationReport,
): VibrationResult | null {
  if (!report.suitableForAnalysis || report.acceptedSamples.length === 0) {
    return null;
  }
  if (
    report.acceptedSamples.some(
      (sample) => sample.dataSource !== report.source,
    )
  ) {
    return null;
  }

  const count = report.acceptedSamples.length;
  const meanX =
    report.acceptedSamples.reduce((sum, sample) => sum + sample.x, 0) / count;
  const meanY =
    report.acceptedSamples.reduce((sum, sample) => sum + sample.y, 0) / count;
  const meanZ =
    report.acceptedSamples.reduce((sum, sample) => sum + sample.z, 0) / count;

  const meanSquaredVectorMagnitude =
    report.acceptedSamples.reduce((sum, sample) => {
      const dx = sample.x - meanX;
      const dy = sample.y - meanY;
      const dz = sample.z - meanZ;
      return sum + dx * dx + dy * dy + dz * dz;
    }, 0) / count;

  return {
    rmsMps2: Math.sqrt(meanSquaredVectorMagnitude),
    sampleCount: count,
    durationMs: report.observationDurationMs,
    method: "WINDOW_MEAN_REMOVAL_VECTOR_RMS",
  };
}

/**
 * A baseline is created only after the caller's explicit reference-condition
 * confirmation and a suitable single-source window.
 */
export function createBaseline(
  machineId: string,
  report: ValidationReport,
  vibration: VibrationResult,
  establishedAtMs: number,
  confirmedReferenceCondition: boolean,
): Baseline | null {
  if (
    !confirmedReferenceCondition ||
    !report.suitableForAnalysis ||
    report.source === "MIXED" ||
    report.source === "UNKNOWN" ||
    vibration.rmsMps2 <= 0 ||
    !Number.isFinite(vibration.rmsMps2) ||
    report.acceptedSamples.some((sample) => sample.machineId !== machineId)
  ) {
    return null;
  }

  return {
    machineId,
    source: report.source,
    rmsMps2: vibration.rmsMps2,
    establishedAtMs,
    sampleCount: vibration.sampleCount,
    durationMs: vibration.durationMs,
    method: vibration.method,
    confirmedReferenceCondition: true,
  };
}

export function evaluateHealth(input: {
  machineId: string;
  report: ValidationReport;
  observedRmsMps2: number | null;
  baseline: Baseline | null;
  thresholds: HealthThresholds;
  previousAlertState?: AlertState;
  sensorAvailable: boolean;
  observedAtMs: number;
}): HealthDecision {
  const previous = input.previousAlertState ?? DEFAULT_ALERT_STATE;
  const base = {
    observedRmsMps2: input.observedRmsMps2,
    source: input.report.source,
    observedAtMs: input.observedAtMs,
    warningThresholdMps2: null,
    criticalThresholdMps2: null,
  };
  const stateUnchanged = { ...previous };

  if (!input.sensorAvailable) {
    return {
      ...base,
      status: "SENSOR_UNAVAILABLE",
      alertRaised: false,
      reason: "No accelerometer is currently available on this device.",
      recommendedAction:
        "Check that the phone has an accelerometer. No health status was inferred.",
      nextAlertState: stateUnchanged,
    };
  }

  if (!input.report.suitableForAnalysis) {
    const insufficientOnly =
      input.report.diagnostics.length > 0 &&
      input.report.diagnostics.every((item) =>
        ["INSUFFICIENT_SAMPLES", "INSUFFICIENT_DURATION"].includes(
          item.reason,
        ),
      );
    return {
      ...base,
      status: insufficientOnly ? "INSUFFICIENT_DATA" : "DATA_INVALID",
      alertRaised: false,
      reason:
        input.report.diagnostics[0]?.message ??
        "The observation is not suitable for analysis.",
      recommendedAction: insufficientOnly
        ? "Collect a longer window with more valid samples."
        : "Discard this window, check the phone mounting and data quality, then try again.",
      nextAlertState: stateUnchanged,
    };
  }

  const baseline = input.baseline;
  const rms = input.observedRmsMps2;
  if (!baseline) {
    return {
      ...base,
      status: "INSUFFICIENT_DATA",
      alertRaised: false,
      reason: "No operator-confirmed reference baseline has been established.",
      recommendedAction:
        "Confirm the machine is in a suitable reference condition and establish a baseline.",
      nextAlertState: stateUnchanged,
    };
  }
  if (
    baseline.machineId !== input.machineId ||
    baseline.source !== input.report.source
  ) {
    return {
      ...base,
      status: "DATA_INVALID",
      alertRaised: false,
      reason:
        "A measurement can only be compared with a baseline from the same machine and data source.",
      recommendedAction:
        "Use a valid observation from the same machine and data source as its baseline.",
      nextAlertState: stateUnchanged,
    };
  }
  if (
    !Number.isFinite(baseline.rmsMps2) ||
    baseline.rmsMps2 <= 0 ||
    !Number.isFinite(rms) ||
    rms === null ||
    rms < 0
  ) {
    return {
      ...base,
      status: "DATA_INVALID",
      alertRaised: false,
      reason:
        "The current window, baseline, machine, or RMS value is missing or incompatible.",
      recommendedAction:
        "Use a valid observation from the same machine and data source as its baseline.",
      nextAlertState: stateUnchanged,
    };
  }

  const { warningRatio, criticalRatio } = input.thresholds;
  if (
    !Number.isFinite(warningRatio) ||
    !Number.isFinite(criticalRatio) ||
    warningRatio <= 1 ||
    criticalRatio <= warningRatio
  ) {
    return {
      ...base,
      status: "DATA_INVALID",
      alertRaised: false,
      reason: "Configured threshold ratios are invalid.",
      recommendedAction:
        "Set the warning ratio above 1.0 and the critical ratio above the warning ratio.",
      nextAlertState: stateUnchanged,
    };
  }

  const warningThresholdMps2 = baseline.rmsMps2 * warningRatio;
  const criticalThresholdMps2 = baseline.rmsMps2 * criticalRatio;
  const thresholdBase = {
    ...base,
    warningThresholdMps2,
    criticalThresholdMps2,
  };
  const warningAction =
    "Arrange a safe inspection of the machine and repeat the measurement under the same mounting and operating conditions.";

  if (previous.activeStatus !== "NORMAL") {
    if (rms < warningThresholdMps2) {
      const recoveryStreak = previous.recoveryStreak + 1;
      if (recoveryStreak >= 2) {
        return {
          ...thresholdBase,
          status: "NORMAL",
          alertRaised: false,
          reason:
            "Two consecutive valid windows fell below the warning threshold; the alert has cleared.",
          recommendedAction:
            "Continue routine monitoring. This does not certify that the machine is fault-free.",
          nextAlertState: { ...DEFAULT_ALERT_STATE },
        };
      }
      return {
        ...thresholdBase,
        status: previous.activeStatus,
        alertRaised: false,
        reason:
          "One valid window is below the warning threshold; a second consecutive window is required to clear the active alert.",
        recommendedAction: warningAction,
        nextAlertState: { ...previous, recoveryStreak },
      };
    }

    const escalated =
      rms >= criticalThresholdMps2
        ? "CRITICAL"
        : previous.activeStatus;
    return {
      ...thresholdBase,
      status: escalated,
      alertRaised: escalated === "CRITICAL" && previous.activeStatus !== "CRITICAL",
      reason:
        escalated === "CRITICAL"
          ? `Observed RMS ${formatNumber(rms)} m/s² is at or above the critical threshold ${formatNumber(criticalThresholdMps2)} m/s².`
          : "The active alert is retained until two consecutive valid windows fall below the warning threshold.",
      recommendedAction: warningAction,
      nextAlertState: {
        activeStatus: escalated,
        warningStreak: 0,
        recoveryStreak: 0,
      },
    };
  }

  if (rms >= criticalThresholdMps2) {
    return {
      ...thresholdBase,
      status: "CRITICAL",
      alertRaised: true,
      reason: `Observed RMS ${formatNumber(rms)} m/s² is at or above the critical threshold ${formatNumber(criticalThresholdMps2)} m/s².`,
      recommendedAction:
        "Stop only if it is safe and permitted by site procedures; arrange prompt inspection by a qualified person. Vibration alone does not identify a specific defect.",
      nextAlertState: {
        activeStatus: "CRITICAL",
        warningStreak: 0,
        recoveryStreak: 0,
      },
    };
  }

  if (rms >= warningThresholdMps2) {
    const warningStreak = previous.warningStreak + 1;
    const confirmed = warningStreak >= 2;
    return {
      ...thresholdBase,
      status: "WARNING",
      alertRaised: confirmed,
      reason: confirmed
        ? `Two consecutive valid windows reached the warning threshold of ${formatNumber(warningThresholdMps2)} m/s². Current RMS is ${formatNumber(rms)} m/s².`
        : `Warning candidate: current RMS ${formatNumber(rms)} m/s² is at or above ${formatNumber(warningThresholdMps2)} m/s². A second consecutive window is required to confirm the alert.`,
      recommendedAction: warningAction,
      nextAlertState: {
        activeStatus: confirmed ? "WARNING" : "NORMAL",
        warningStreak,
        recoveryStreak: 0,
      },
    };
  }

  return {
    ...thresholdBase,
    status: "NORMAL",
    alertRaised: false,
    reason: `Observed RMS ${formatNumber(rms)} m/s² is below the warning threshold ${formatNumber(warningThresholdMps2)} m/s².`,
    recommendedAction:
      "Continue routine monitoring. A normal rule result is not a guarantee that the machine is fault-free.",
    nextAlertState: { ...DEFAULT_ALERT_STATE },
  };
}
