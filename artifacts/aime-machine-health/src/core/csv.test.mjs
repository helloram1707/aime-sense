import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryCsv, parseMeasurementCsv } from "./csv.ts";

function observation(samples, options = {}) {
  return {
    id: "obs-1",
    machineId: "MOTOR-01",
    source: "LIVE_SENSOR",
    capturedAtMs: 1_800_000_000_000,
    samples,
    validation: {
      totalReceived: samples.length,
      validSamples: samples.length,
      rejectedSamples: 0,
      rejectionCounts: {},
      observationDurationMs: 4_000,
      intervalMinMs: 50,
      intervalMedianMs: 50,
      intervalMaxMs: 50,
      suitableForAnalysis: true,
      diagnostics: [],
    },
    rmsMps2: 0.25,
    decision: {
      status: "NORMAL",
      alertRaised: false,
      reason: "Below the configured warning limit.",
      observedRmsMps2: 0.25,
      warningThresholdMps2: 0.3,
      criticalThresholdMps2: 0.5,
      source: "LIVE_SENSOR",
      observedAtMs: 1_800_000_000_000,
      recommendedAction: "Continue routine observation.",
      nextAlertState: {
        activeStatus: "NORMAL",
        warningStreak: 0,
        recoveryStreak: 0,
      },
    },
    ...options,
  };
}

test("[CSV-01] exported sensor rows import as IMPORTED_DATA with original lineage", () => {
  const source = observation([
    {
      machineId: "MOTOR-01",
      monotonicMs: 100,
      wallClockMs: 1_800_000_000_000,
      x: 1.25,
      y: -0.5,
      z: 0.25,
      unit: "m/s²",
      dataSource: "LIVE_SENSOR",
    },
  ]);

  const parsed = parseMeasurementCsv(buildHistoryCsv([source]));
  const sample = parsed.samples[0];

  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.samples.length, 1);
  assert.equal(sample.machineId, "MOTOR-01");
  assert.equal(sample.dataSource, "IMPORTED_DATA");
  assert.equal(sample.originalDataSource, "LIVE_SENSOR");
  assert.equal(sample.x, 1.25);
  assert.equal(sample.y, -0.5);
  assert.equal(sample.unit, "m/s²");
});

test("[CSV-02] quotes commas, quotes and newlines in cells", () => {
  const source = observation(
    [
      {
        machineId: "MOTOR,\nNORTH",
        monotonicMs: 100,
        wallClockMs: 1_800_000_000_000,
        x: 1,
        y: 0,
        z: -1,
        unit: "m/s²",
        dataSource: "LIVE_SENSOR",
      },
    ],
    { machineId: "MOTOR,\nNORTH" },
  );

  const parsed = parseMeasurementCsv(buildHistoryCsv([source]));
  assert.equal(parsed.samples.length, 1);
  assert.equal(parsed.samples[0].machineId, "MOTOR,\nNORTH");
});

test("[CSV-03] rejects files without the supported measurement schema", () => {
  const parsed = parseMeasurementCsv("machineId,value\nMOTOR-01,2\n");
  assert.equal(parsed.samples.length, 0);
  assert.match(parsed.errors[0], /Missing CSV columns/);
});

test("[CSV-04] preserves unknown original sources as imported lineage", () => {
  const csv = [
    "machineId,monotonicMs,wallClockMs,xMps2,yMps2,zMps2,unit,dataSource",
    "MOTOR-01,100,1800000000000,1,2,3,m/s²,CUSTOM_SENSOR",
  ].join("\n");

  const parsed = parseMeasurementCsv(csv);
  assert.equal(parsed.samples[0].dataSource, "IMPORTED_DATA");
  assert.equal(parsed.samples[0].originalDataSource, "CUSTOM_SENSOR");
});

test("[CSV-05] prevents spreadsheet formulas from being emitted as active text", () => {
  const csv = buildHistoryCsv([
    observation(
      [
        {
          machineId: "=1+1",
          monotonicMs: 100,
          wallClockMs: 1_800_000_000_000,
          x: 1,
          y: 0,
          z: 0,
          unit: "m/s²",
          dataSource: "LIVE_SENSOR",
        },
      ],
      { machineId: "=1+1" },
    ),
  ]);

  assert.match(csv, /"'=1\+1"/);
});
