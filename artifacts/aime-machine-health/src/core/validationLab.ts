import { createDemoWindow } from './demoData.ts';
import {
  calculateVibrationRms,
  createBaseline,
  evaluateHealth,
  validateWindow,
  type AlertState,
  type DataSource,
  type MeasurementSample,
  type ValidationReport,
} from './healthEngine.ts';

export interface LabResult {
  id: string;
  purpose: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const MACHINE_ID = 'LAB-MOTOR';
const BASE_TIME = 1_000_000;
const WALL_TIME = 1_800_000_000_000;
const thresholds = { warningRatio: 1.5, criticalRatio: 2 };

function makeSamples(
  source: DataSource = 'SIMULATED_DATA',
  count = 81,
): MeasurementSample[] {
  return Array.from({ length: count }, (_, index) => ({
    machineId: MACHINE_ID,
    monotonicMs: BASE_TIME + index * 50,
    ...(source === 'LIVE_SENSOR'
      ? { receiptMonotonicMs: BASE_TIME + index * 50 }
      : {}),
    wallClockMs: WALL_TIME + index * 50,
    x: 0.2 * Math.sin((2 * Math.PI * 3 * index) / 20),
    y: 0.2 * Math.sin((2 * Math.PI * 3 * index) / 20 + (2 * Math.PI) / 3),
    z: 0.2 * Math.sin((2 * Math.PI * 3 * index) / 20 + (4 * Math.PI) / 3),
    unit: 'm/s²',
    dataSource: source,
  }));
}

function report(samples: readonly unknown[], source: DataSource = 'SIMULATED_DATA') {
  return validateWindow(samples, {
    expectedMachineId: MACHINE_ID,
    nowMonotonicMs:
      source === 'LIVE_SENSOR' ? BASE_TIME + 4_000 : undefined,
  });
}

function baselineFor(source: DataSource = 'SIMULATED_DATA') {
  return {
    machineId: MACHINE_ID,
    source,
    rmsMps2: 0.245,
    establishedAtMs: WALL_TIME,
    sampleCount: 81,
    durationMs: 4_000,
    method: 'WINDOW_MEAN_REMOVAL_VECTOR_RMS' as const,
    confirmedReferenceCondition: true as const,
  };
}

function assess(
  currentReport: ValidationReport,
  currentRmsMps2: number | null,
  options: {
    baseline?: ReturnType<typeof baselineFor> | null;
    state?: AlertState;
    sensorAvailable?: boolean;
  } = {},
) {
  return evaluateHealth({
    machineId: MACHINE_ID,
    report: currentReport,
    observedRmsMps2: currentRmsMps2,
    baseline: options.baseline === undefined ? baselineFor() : options.baseline,
    thresholds,
    previousAlertState: options.state,
    sensorAvailable: options.sensorAvailable ?? true,
    observedAtMs: WALL_TIME + 4_000,
  });
}

function result(
  id: string,
  purpose: string,
  expected: string,
  actual: string,
): LabResult {
  return { id, purpose, expected, actual, passed: expected === actual };
}

export function runValidationLab(): LabResult[] {
  const cases: LabResult[] = [];
  const good = makeSamples();
  const goodReport = report(good);
  const goodRms = calculateVibrationRms(goodReport);
  const live = makeSamples('LIVE_SENSOR');

  cases.push(
    result(
      'VAL-01',
      'Accept finite signed acceleration samples.',
      'suitable',
      goodReport.suitableForAnalysis ? 'suitable' : 'rejected',
    ),
  );

  const nanSamples = makeSamples();
  nanSamples[4].x = Number.NaN;
  const nanReport = report(nanSamples);
  cases.push(
    result(
      'VAL-02',
      'Reject NaN and infinite values.',
      'invalid value reported',
      nanReport.rejectionCounts.INVALID_VALUE ? 'invalid value reported' : 'not reported',
    ),
  );

  const missingSamples = makeSamples();
  delete (missingSamples[4] as Partial<MeasurementSample>).z;
  const missingReport = report(missingSamples);
  cases.push(
    result(
      'VAL-03',
      'Reject a missing required axis.',
      'missing field reported',
      missingReport.rejectionCounts.MISSING_REQUIRED_FIELD
        ? 'missing field reported'
        : 'not reported',
    ),
  );

  const badTimestamp = makeSamples();
  badTimestamp[3].wallClockMs = Number.NaN;
  const badTimestampReport = report(badTimestamp);
  cases.push(
    result(
      'VAL-04',
      'Reject an invalid wall-clock timestamp.',
      'invalid timestamp reported',
      badTimestampReport.rejectionCounts.INVALID_TIMESTAMP
        ? 'invalid timestamp reported'
        : 'not reported',
    ),
  );

  for (const [id, purpose, change, reason] of [
    [
      'VAL-05',
      'Detect a duplicate timestamp.',
      (samples: MeasurementSample[]) => {
        samples[4].monotonicMs = samples[3].monotonicMs;
      },
      'DUPLICATE_TIMESTAMP',
    ],
    [
      'VAL-06',
      'Reject out-of-order samples.',
      (samples: MeasurementSample[]) => {
        samples[4].monotonicMs = samples[3].monotonicMs - 1;
      },
      'OUT_OF_ORDER_TIMESTAMP',
    ],
  ] as const) {
    const sampleSet = makeSamples();
    change(sampleSet);
    const testReport = report(sampleSet);
    cases.push(
      result(
        id,
        purpose,
        'rejected',
        testReport.rejectionCounts[reason] ? 'rejected' : 'not rejected',
      ),
    );
  }

  const staleReport = validateWindow(live, {
    expectedMachineId: MACHINE_ID,
    nowMonotonicMs: BASE_TIME + 10_000,
  });
  cases.push(
    result(
      'VAL-07',
      'Reject a stale live window.',
      'stale data reported',
      staleReport.rejectionCounts.REJECTED_STALE_DATA
        ? 'stale data reported'
        : 'not reported',
    ),
  );

  const shortSamples = makeSamples('SIMULATED_DATA', 8);
  const shortReport = report(shortSamples);
  cases.push(
    result(
      'VAL-08',
      'Prevent a health assessment with too few samples.',
      'INSUFFICIENT_DATA',
      assess(shortReport, null).status,
    ),
  );

  const briefSamples = makeSamples('SIMULATED_DATA', 41);
  briefSamples.forEach((sample, index) => {
    sample.monotonicMs = BASE_TIME + index * 10;
  });
  const briefReport = report(briefSamples);
  const briefVibration = calculateVibrationRms(briefReport);
  const baseline = briefVibration
    ? createBaseline(
        MACHINE_ID,
        briefReport,
        briefVibration,
        WALL_TIME,
        true,
      )
    : null;
  cases.push(
    result(
      'VAL-09',
      'Prevent a baseline from an observation shorter than two seconds.',
      'no baseline',
      baseline ? 'baseline created' : 'no baseline',
    ),
  );

  const knownVector = makeSamples('SIMULATED_DATA', 41).map(
    (sample, index) => ({
      ...sample,
      monotonicMs: BASE_TIME + index * 50,
      x: index % 2 === 0 ? 1 : 3,
      y: 0,
      z: 0,
    }),
  );
  const knownReport = report(knownVector);
  const knownRms = calculateVibrationRms(knownReport);
  cases.push(
    result(
      'VAL-10',
      'Check RMS against a hand-calculated vector fixture.',
      '1.000 m/s²',
      knownRms ? `${knownRms.rmsMps2.toFixed(3)} m/s²` : 'unavailable',
    ),
  );

  cases.push(
    result(
      'VAL-11',
      'Require an operator confirmation before baseline creation.',
      'blocked without confirmation',
      goodRms &&
        !createBaseline(MACHINE_ID, goodReport, goodRms, WALL_TIME, false)
        ? 'blocked without confirmation'
        : 'baseline created',
    ),
  );

  const eligibleBaseline =
    goodRms &&
    createBaseline(MACHINE_ID, goodReport, goodRms, WALL_TIME, true);
  cases.push(
    result(
      'VAL-12',
      'Create a baseline from a suitable confirmed window.',
      'baseline created',
      eligibleBaseline ? 'baseline created' : 'no baseline',
    ),
  );

  cases.push(
    result(
      'VAL-13',
      'Report NORMAL only for a valid measurement below its warning limit.',
      'NORMAL',
      assess(goodReport, 0.3).status,
    ),
  );

  const warningFirst = assess(goodReport, 0.4);
  const warningSecond = assess(goodReport, 0.4, {
    state: warningFirst.nextAlertState,
  });
  cases.push(
    result(
      'VAL-14',
      'Confirm WARNING after two consecutive warning windows.',
      'second window raises alert',
      warningSecond.alertRaised ? 'second window raises alert' : 'alert not raised',
    ),
  );

  cases.push(
    result(
      'VAL-15',
      'Trigger CRITICAL when the configured boundary is reached.',
      'CRITICAL',
      assess(goodReport, baselineFor().rmsMps2 * 2).status,
    ),
  );

  cases.push(
    result(
      'VAL-16',
      'Never report NORMAL when the sensor is unavailable.',
      'SENSOR_UNAVAILABLE',
      assess(goodReport, 0.3, { sensorAvailable: false }).status,
    ),
  );

  const activeCritical: AlertState = {
    activeStatus: 'CRITICAL',
    warningStreak: 0,
    recoveryStreak: 0,
  };
  const invalidDecision = assess(shortReport, null, {
    state: activeCritical,
  });
  cases.push(
    result(
      'VAL-17',
      'Do not let invalid data clear an active alert.',
      'status unchanged',
      JSON.stringify(invalidDecision.nextAlertState) ===
        JSON.stringify(activeCritical)
        ? 'status unchanged'
        : 'status changed',
    ),
  );

  const mixed = makeSamples();
  mixed[4].dataSource = 'LIVE_SENSOR';
  mixed[4].receiptMonotonicMs = mixed[4].monotonicMs;
  const mixedReport = report(mixed);
  cases.push(
    result(
      'VAL-18',
      'Prevent live and simulated data from sharing an observation.',
      'MIXED source rejected',
      mixedReport.source === 'MIXED' && !mixedReport.suitableForAnalysis
        ? 'MIXED source rejected'
        : 'accepted',
    ),
  );

  const gap = makeSamples();
  for (let index = 20; index < gap.length; index += 1) {
    gap[index].monotonicMs += 500;
  }
  const gapReport = report(gap);
  cases.push(
    result(
      'VAL-19',
      'Reject a window containing an excessive sample gap.',
      'sampling gap reported',
      gapReport.rejectionCounts.REJECTED_SAMPLING_GAP
        ? 'sampling gap reported'
        : 'not reported',
    ),
  );

  const criticalDecision = assess(goodReport, 0.6);
  const recoveryOne = assess(goodReport, 0.3, {
    state: criticalDecision.nextAlertState,
  });
  const recoveryTwo = assess(goodReport, 0.3, {
    state: recoveryOne.nextAlertState,
  });
  cases.push(
    result(
      'VAL-20',
      'Clear a critical alert only after two recovery windows.',
      'first retained, second clears',
      recoveryOne.status === 'CRITICAL' && recoveryTwo.status === 'NORMAL'
        ? 'first retained, second clears'
        : 'recovery rule failed',
    ),
  );

  const sourceMismatch = assess(
    report(makeSamples('LIVE_SENSOR'), 'LIVE_SENSOR'),
    0.3,
  );
  cases.push(
    result(
      'VAL-21',
      'Do not compare a live observation with a simulated baseline.',
      'DATA_INVALID',
      sourceMismatch.status,
    ),
  );

  const imported = createDemoWindow(MACHINE_ID, 'normal').map((sample) => ({
    ...sample,
    dataSource: 'IMPORTED_DATA' as const,
    originalDataSource: 'SIMULATED_DATA',
  }));
  const importedReport = report(imported, 'IMPORTED_DATA');
  cases.push(
    result(
      'VAL-22',
      'Keep imported records labelled separately from their original source.',
      'IMPORTED_DATA',
      importedReport.source,
    ),
  );

  return cases;
}
