/**
 * Unit tests for new AIME Sense 2.0 features:
 * - Downtime Cost Estimator
 * - Maintenance Priority Suggestions
 * - Early Warning Indicators
 * - External Sensor Management
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDowntimeCost } from './downtimeEstimator.ts';
import { evaluateMaintenancePriority, generateDefaultChecklist } from './maintenancePriority.ts';
import { evaluateEarlyWarning } from './earlyWarning.ts';
import { generateExternalSensorPacket, parseExternalSensorSamples } from './sensorManager.ts';

test('1. Downtime Cost Estimator unit tests', async (t) => {
  await t.test('calculates normal baseline risk and savings', () => {
    const res = calculateDowntimeCost({
      hourlyDowntimeCost: 3000,
      estimatedRepairHours: 5,
      status: 'NORMAL',
      runHours: 200,
      serviceIntervalHours: 500,
    });
    assert.equal(res.hourlyDowntimeCost, 3000);
    assert.equal(res.estimatedRepairHours, 5);
    assert.equal(res.unplannedOutageCost, 3000 * 5 + 3000 * 1.5); // 19,500
    assert.equal(res.riskProbability, 0.05);
    assert.equal(res.urgencyLevel, 'LOW');
  });

  await t.test('calculates critical risk with elevated probability and urgency', () => {
    const res = calculateDowntimeCost({
      hourlyDowntimeCost: 4000,
      status: 'CRITICAL',
    });
    assert.equal(res.riskProbability, 0.90);
    assert.equal(res.urgencyLevel, 'CRITICAL');
    assert.ok(res.estimatedNetSavings > 0);
  });

  await t.test('escalates risk when run hours exceed service interval', () => {
    const res = calculateDowntimeCost({
      hourlyDowntimeCost: 3000,
      status: 'WARNING',
      runHours: 700,
      serviceIntervalHours: 500, // 200 hrs overdue
    });
    assert.ok(res.riskProbability > 0.45); // base 0.45 + overdue penalty
  });

  await t.test('handles zero and invalid inputs gracefully', () => {
    const res = calculateDowntimeCost({
      hourlyDowntimeCost: 0,
      status: 'NORMAL',
    });
    assert.equal(res.hourlyDowntimeCost, 2500); // fallback default
    assert.ok(Number.isFinite(res.expectedRiskCost));
  });
});

test('2. Maintenance Priority Suggestions unit tests', async (t) => {
  await t.test('evaluates critical vibration as P1 immediate priority', () => {
    const res = evaluateMaintenancePriority({
      id: 'MTR-01',
      name: 'Exhaust Motor',
      category: 'Electric motor',
      status: 'CRITICAL',
      runHours: 350,
      serviceIntervalHours: 500,
    });
    assert.equal(res.priority, 'P1');
    assert.equal(res.score, 95);
    assert.ok(res.items.some((i) => i.id === 'chk-immediate'));
  });

  await t.test('evaluates warning status as P2 scheduled priority', () => {
    const res = evaluateMaintenancePriority({
      id: 'PMP-02',
      name: 'Slurry Pump',
      category: 'Water pump',
      status: 'WARNING',
      runHours: 250,
      serviceIntervalHours: 500,
    });
    assert.equal(res.priority, 'P2');
    assert.equal(res.score, 75);
    assert.ok(res.items.some((i) => i.id === 'chk-cavitation'));
  });

  await t.test('evaluates overdue service interval as P2 priority even if normal', () => {
    const res = evaluateMaintenancePriority({
      id: 'CNC-01',
      name: 'Lathe Spindle',
      category: 'Lathe',
      status: 'NORMAL',
      runHours: 650,
      serviceIntervalHours: 500,
    });
    assert.equal(res.priority, 'P2');
    assert.ok(res.reason.includes('650 hrs'));
  });

  await t.test('generates category-specific checklist items', () => {
    const pumpItems = generateDefaultChecklist('Water pump', 'NORMAL');
    assert.ok(pumpItems.some((i) => i.id === 'chk-cavitation'));

    const motorItems = generateDefaultChecklist('Electric motor', 'NORMAL');
    assert.ok(motorItems.some((i) => i.id === 'chk-elec'));
  });
});

test('3. Early Warning Indicators unit tests', async (t) => {
  const dummyBaseline = {
    machineId: 'TEST-01',
    source: 'LIVE_SENSOR',
    rmsMps2: 0.40,
    establishedAtMs: Date.now() - 100000,
    sampleCount: 50,
    durationMs: 4000,
    method: 'WINDOW_MEAN_REMOVAL_VECTOR_RMS',
    confirmedReferenceCondition: true,
  };
  const thresholds = { warningRatio: 1.5, criticalRatio: 2.0 };

  await t.test('computes threshold proximity percentage accurately', () => {
    // Baseline: 0.40, Warning: 0.60. Reading: 0.50 -> halfway (50%)
    const res = evaluateEarlyWarning({
      machineId: 'TEST-01',
      readings: [{ rmsMps2: 0.50, capturedAtMs: Date.now() }],
      baseline: dummyBaseline,
      thresholds,
    });
    assert.equal(res.thresholdProximityPct, 50);
    assert.equal(res.trendDirection, 'STABLE');
  });

  await t.test('detects accelerating trend over consecutive readings', () => {
    const res = evaluateEarlyWarning({
      machineId: 'TEST-01',
      readings: [
        { rmsMps2: 0.55, capturedAtMs: Date.now() },
        { rmsMps2: 0.42, capturedAtMs: Date.now() - 5000 },
      ],
      baseline: dummyBaseline,
      thresholds,
    });
    assert.equal(res.trendDirection, 'ACCELERATING');
    assert.ok(res.trendRateOfRisePct > 25);
  });

  await t.test('incorporates operator sensory physical observations', () => {
    const res = evaluateEarlyWarning({
      machineId: 'TEST-01',
      readings: [{ rmsMps2: 0.48, capturedAtMs: Date.now() }],
      baseline: dummyBaseline,
      thresholds,
      observations: [
        {
          id: 'obs-01',
          machineId: 'TEST-01',
          timestamp: Date.now(),
          abnormalNoise: true,
          highSurfaceTemp: true,
          looseMounting: false,
          oilLeakage: false,
          operatorNotes: 'High acoustic pitch',
        },
      ],
    });
    assert.equal(res.physicalSensoryFlagsCount, 2);
    assert.ok(res.compositeEarlyWarningScore >= 50);
    assert.equal(res.earlyWarningTriggered, true);
  });
});

test('4. External Sensor Manager unit tests', async (t) => {
  const device = {
    id: 'sensor-node-01',
    name: 'Bearing Housing Node',
    type: 'BLE_ACCEL',
    model: 'ADXL355-ESP32',
    macOrIp: 'AA:BB:CC:11:22:33',
    assignedMachineId: 'MACHINE-01',
    status: 'CONNECTED',
    sampleRateHz: 50,
    packetsReceived: 0,
  };

  await t.test('generates valid synthetic external sensor packet', () => {
    const packet = generateExternalSensorPacket(device, 30, 0.40);
    assert.equal(packet.sensorId, 'sensor-node-01');
    assert.equal(packet.machineId, 'MACHINE-01');
    assert.equal(packet.samples.length, 30);
    assert.ok(packet.deviceToken);
  });

  await t.test('parses external sensor payload into MeasurementSample rows', () => {
    const packet = generateExternalSensorPacket(device, 25, 0.35);
    const samples = parseExternalSensorSamples(packet);
    assert.equal(samples.length, 25);
    assert.equal(samples[0].machineId, 'MACHINE-01');
    assert.equal(samples[0].unit, 'm/s²');
    assert.equal(samples[0].dataSource, 'LIVE_SENSOR');
  });
});
