import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateVibrationRms,
  createBaseline,
  evaluateHealth,
  validateWindow,
} from "./healthEngine.ts";
import { runValidationLab } from "./validationLab.ts";

const baseTime = 1_000_000;

function makeWindow({
  count = 41,
  intervalMs = 50,
  source = "SIMULATED_DATA",
  machineId = "MOTOR-01",
  x = () => 0,
  y = () => 0,
  z = () => 0,
} = {}) {
  return Array.from({ length: count }, (_, index) => ({
    machineId,
    monotonicMs: baseTime + index * intervalMs,
    receiptMonotonicMs: baseTime + index * intervalMs,
    wallClockMs: 1_800_000_000_000 + index * intervalMs,
    x: x(index),
    y: y(index),
    z: z(index),
    unit: "m/s²",
    dataSource: source,
  }));
}

function validReport(values = makeWindow(), overrides = {}) {
  return validateWindow(values, {
    expectedMachineId: "MOTOR-01",
    nowMonotonicMs: baseTime + 2_000,
    ...overrides,
  });
}

function makeBaseline(source = "SIMULATED_DATA", rmsMps2 = 1) {
  return {
    machineId: "MOTOR-01",
    source,
    rmsMps2,
    establishedAtMs: 1_800_000_000_000,
    sampleCount: 40,
    durationMs: 1_950,
    method: "WINDOW_MEAN_REMOVAL_VECTOR_RMS",
    confirmedReferenceCondition: true,
  };
}

function evaluate({
  report = validReport(),
  rms = 1,
  baseline = makeBaseline(),
  previousAlertState,
  sensorAvailable = true,
  warningRatio = 1.5,
  criticalRatio = 2,
} = {}) {
  return evaluateHealth({
    machineId: "MOTOR-01",
    report,
    observedRmsMps2: rms,
    baseline,
    thresholds: { warningRatio, criticalRatio },
    previousAlertState,
    sensorAvailable,
    observedAtMs: 1_800_000_002_000,
  });
}

test("[VAL-01] accepts finite signed acceleration samples", () => {
  const report = validReport(
    makeWindow({ x: (index) => (index % 2 === 0 ? -0.2 : 0.2) }),
  );
  assert.equal(report.suitableForAnalysis, true);
  assert.equal(report.validSamples, 41);
  assert.equal(report.source, "SIMULATED_DATA");
});

test("[VAL-02] rejects NaN and infinite acceleration", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const samples = makeWindow();
    samples[2].x = bad;
    const report = validReport(samples);
    assert.equal(report.suitableForAnalysis, false);
    assert.ok(report.rejectionCounts.INVALID_VALUE);
  }
});

test("[VAL-03] handles missing required fields without zero-filling", () => {
  const samples = makeWindow();
  delete samples[4].z;
  const report = validReport(samples);
  assert.equal(report.suitableForAnalysis, false);
  assert.equal(report.validSamples, 40);
  assert.ok(report.rejectionCounts.MISSING_REQUIRED_FIELD);
});

test("[VAL-04] rejects invalid monotonic or wall-clock timestamps", () => {
  const samples = makeWindow();
  samples[5].wallClockMs = Number.NaN;
  assert.ok(validReport(samples).rejectionCounts.INVALID_TIMESTAMP);
});

test("[VAL-05] detects duplicate timestamps", () => {
  const samples = makeWindow();
  samples[5].monotonicMs = samples[4].monotonicMs;
  assert.ok(validReport(samples).rejectionCounts.DUPLICATE_TIMESTAMP);
});

test("[VAL-06] rejects out-of-order samples", () => {
  const samples = makeWindow();
  samples[5].monotonicMs = samples[4].monotonicMs - 10;
  assert.ok(validReport(samples).rejectionCounts.OUT_OF_ORDER_TIMESTAMP);
});

test("[VAL-07] rejects stale live observations", () => {
  const samples = makeWindow({ source: "LIVE_SENSOR" });
  const report = validateWindow(samples, {
    expectedMachineId: "MOTOR-01",
    nowMonotonicMs: baseTime + 10_000,
    maxLiveAgeMs: 2_000,
  });
  assert.equal(report.suitableForAnalysis, false);
  assert.ok(report.rejectionCounts.REJECTED_STALE_DATA);
});

test("[VAL-08] refuses an assessment with too few samples", () => {
  const report = validReport(makeWindow({ count: 8 }));
  assert.equal(report.suitableForAnalysis, false);
  assert.ok(report.rejectionCounts.INSUFFICIENT_SAMPLES);
  assert.equal(evaluate({ report }).status, "INSUFFICIENT_DATA");
});

test("[VAL-09] refuses a short observation window", () => {
  const report = validReport(
    makeWindow({ count: 40, intervalMs: 10 }),
    { minDurationMs: 2_000 },
  );
  assert.equal(report.suitableForAnalysis, false);
  assert.ok(report.rejectionCounts.INSUFFICIENT_DURATION);
  assert.equal(
    createBaseline(
      "MOTOR-01",
      report,
      { rmsMps2: 0.5, sampleCount: 40, durationMs: 390, method: "WINDOW_MEAN_REMOVAL_VECTOR_RMS" },
      1_800_000_000_000,
      true,
    ),
    null,
  );
});

test("[VAL-10] creates a baseline only after explicit confirmation", () => {
  const report = validReport(
    makeWindow({ x: (index) => (index % 2 === 0 ? -1 : 1) }),
  );
  const rms = calculateVibrationRms(report);
  assert.ok(rms);
  assert.equal(
    createBaseline(
      "MOTOR-01",
      report,
      rms,
      1_800_000_002_000,
      false,
    ),
    null,
  );
  const baseline = createBaseline(
    "MOTOR-01",
    report,
    rms,
    1_800_000_002_000,
    true,
  );
  assert.equal(baseline?.source, "SIMULATED_DATA");
  assert.equal(baseline?.confirmedReferenceCondition, true);
});

test("[VAL-11] calculates known vector RMS after window-mean removal", () => {
  const report = validReport(
    makeWindow({
      count: 40,
      intervalMs: 100,
      minDurationMs: 2_000,
      x: (index) => (index % 2 === 0 ? 1 : 3),
    }),
    { minDurationMs: 2_000 },
  );
  assert.equal(report.suitableForAnalysis, true);
  const result = calculateVibrationRms(report);
  assert.ok(result);
  assert.equal(result.rmsMps2, 1);
  assert.equal(result.sampleCount, 40);
});

test("[VAL-12] returns NORMAL for a valid value below warning threshold", () => {
  assert.equal(evaluate({ rms: 1.49 }).status, "NORMAL");
});

test("[VAL-13] requires two consecutive warning windows", () => {
  const first = evaluate({ rms: 1.5 });
  assert.equal(first.status, "WARNING");
  assert.equal(first.alertRaised, false);
  const second = evaluate({
    rms: 1.5,
    previousAlertState: first.nextAlertState,
  });
  assert.equal(second.status, "WARNING");
  assert.equal(second.alertRaised, true);
});

test("[VAL-14] triggers CRITICAL at and above the critical boundary", () => {
  assert.equal(evaluate({ rms: 2 }).status, "CRITICAL");
  assert.equal(evaluate({ rms: 2.01 }).status, "CRITICAL");
});

test("[VAL-15] never reports NORMAL when no sensor is available", () => {
  assert.equal(evaluate({ sensorAvailable: false }).status, "SENSOR_UNAVAILABLE");
});

test("[VAL-16] invalid data cannot change an active alert state", () => {
  const validState = {
    activeStatus: "CRITICAL",
    warningStreak: 0,
    recoveryStreak: 0,
  };
  const invalid = evaluate({
    report: validReport(makeWindow({ count: 3 })),
    previousAlertState: validState,
  });
  assert.equal(invalid.status, "INSUFFICIENT_DATA");
  assert.deepEqual(invalid.nextAlertState, validState);
});

test("[VAL-17] refuses to compare different data sources", () => {
  const report = validReport(makeWindow({ source: "LIVE_SENSOR" }));
  const result = evaluate({
    report,
    rms: 1,
    baseline: makeBaseline("SIMULATED_DATA"),
  });
  assert.equal(result.status, "DATA_INVALID");
  assert.match(result.reason, /same machine and data source/i);
});

test("[VAL-18] mixed live and simulated rows make a window unsuitable", () => {
  const samples = makeWindow();
  samples[5].dataSource = "LIVE_SENSOR";
  const report = validReport(samples);
  assert.equal(report.source, "MIXED");
  assert.equal(report.suitableForAnalysis, false);
  assert.ok(report.rejectionCounts.REJECTED_MIXED_SOURCE);
});

test("[VAL-19] rejects an excessive sampling gap", () => {
  const samples = makeWindow();
  for (let index = 20; index < samples.length; index += 1) {
    samples[index].monotonicMs += 400;
  }
  const report = validReport(samples);
  assert.equal(report.suitableForAnalysis, false);
  assert.ok(report.rejectionCounts.REJECTED_SAMPLING_GAP);
});

test("[VAL-20] preserves a critical alert until two recovery windows", () => {
  const critical = evaluate({ rms: 2 });
  const firstRecovery = evaluate({
    rms: 1,
    previousAlertState: critical.nextAlertState,
  });
  assert.equal(firstRecovery.status, "CRITICAL");
  const secondRecovery = evaluate({
    rms: 1,
    previousAlertState: firstRecovery.nextAlertState,
  });
  assert.equal(secondRecovery.status, "NORMAL");
});

test("[VAL-21] accepts regular sample intervals and reports their timing", () => {
  const report = validReport(makeWindow({ intervalMs: 50 }));
  assert.equal(report.suitableForAnalysis, true);
  assert.equal(report.intervalMedianMs, 50);
  assert.equal(report.intervalMinMs, 50);
  assert.equal(report.intervalMaxMs, 50);
});

test("[LAB-01] every in-app validation laboratory case passes", () => {
  const cases = runValidationLab();
  assert.equal(cases.length, 22);
  assert.deepEqual(
    cases.filter((item) => !item.passed).map((item) => item.id),
    [],
  );
});
