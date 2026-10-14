import type { Baseline, HealthThresholds } from './healthEngine';

export interface OperatorObservation {
  id: string;
  machineId: string;
  timestamp: number;
  abnormalNoise: boolean;
  highSurfaceTemp: boolean;
  looseMounting: boolean;
  oilLeakage: boolean;
  operatorNotes: string;
  loggedBy?: string;
}

export interface EarlyWarningMetrics {
  machineId: string;
  latestRmsMps2: number | null;
  baselineRmsMps2: number | null;
  warningThresholdMps2: number | null;
  thresholdProximityPct: number; // 0% (at baseline) to 100% (at warning) or >100% (exceeded)
  trendRateOfRisePct: number | null; // % increase over past readings
  trendDirection: 'STABLE' | 'RISING' | 'ACCELERATING' | 'FALLING';
  compositeEarlyWarningScore: number; // 0 to 100
  earlyWarningTriggered: boolean;
  warningDetails: string[];
  physicalSensoryFlagsCount: number;
  latestObservation: OperatorObservation | null;
}

/**
 * Evaluates both real sensor readings and real operator sensory input.
 * Provides early detection before critical threshold breaches occur.
 */
export function evaluateEarlyWarning(params: {
  machineId: string;
  readings: Array<{ rmsMps2: number | null; capturedAtMs: number }>;
  baseline: Baseline | null;
  thresholds: HealthThresholds;
  observations?: OperatorObservation[];
}): EarlyWarningMetrics {
  const { machineId, readings, baseline, thresholds, observations = [] } = params;

  const validReadings = readings
    .filter((r): r is { rmsMps2: number; capturedAtMs: number } =>
      typeof r.rmsMps2 === 'number' && Number.isFinite(r.rmsMps2),
    )
    .sort((a, b) => b.capturedAtMs - a.capturedAtMs); // newest first

  const latest = validReadings[0]?.rmsMps2 ?? null;
  const base = baseline?.rmsMps2 ?? null;
  const warnRatio = thresholds?.warningRatio ?? 1.5;
  const warningThreshold = base ? base * warnRatio : null;

  let proximityPct = 0;
  if (latest !== null && base !== null && warningThreshold !== null) {
    if (warningThreshold > base) {
      const fraction = (latest - base) / (warningThreshold - base);
      proximityPct = Math.round(Math.max(0, fraction * 100));
    }
  }

  // Rate of rise calculation from past readings
  let rateOfRisePct: number | null = null;
  let trendDirection: EarlyWarningMetrics['trendDirection'] = 'STABLE';

  if (validReadings.length >= 2) {
    const rCurrent = validReadings[0].rmsMps2;
    const rPrevious = validReadings[1].rmsMps2;
    if (rPrevious > 0) {
      rateOfRisePct = Math.round(((rCurrent - rPrevious) / rPrevious) * 100);
      if (rateOfRisePct > 25) {
        trendDirection = 'ACCELERATING';
      } else if (rateOfRisePct > 10) {
        trendDirection = 'RISING';
      } else if (rateOfRisePct < -10) {
        trendDirection = 'FALLING';
      }
    }
  }

  // Operator sensory inputs
  const machineObservations = observations
    .filter((o) => o.machineId === machineId)
    .sort((a, b) => b.timestamp - a.timestamp);
  const latestObs = machineObservations[0] || null;

  let sensoryPoints = 0;
  const warningDetails: string[] = [];

  if (latestObs) {
    if (latestObs.abnormalNoise) {
      sensoryPoints += 25;
      warningDetails.push('Operator reported unusual noise or acoustic grinding.');
    }
    if (latestObs.highSurfaceTemp) {
      sensoryPoints += 25;
      warningDetails.push('Elevated surface casing temperature noted.');
    }
    if (latestObs.looseMounting) {
      sensoryPoints += 25;
      warningDetails.push('Physical loose mounting or baseplate vibration detected.');
    }
    if (latestObs.oilLeakage) {
      sensoryPoints += 15;
      warningDetails.push('Lubricant leakage or compromised seal noted.');
    }
  }

  // Proximity contribution (0 to 50 points)
  const proximityPoints = Math.min(50, Math.round(proximityPct * 0.5));
  if (proximityPct >= 80) {
    warningDetails.push(`Vibration is at ${proximityPct}% of the configured warning threshold.`);
  }

  // Trend contribution (0 to 25 points)
  let trendPoints = 0;
  if (trendDirection === 'ACCELERATING') {
    trendPoints = 25;
    warningDetails.push(`Rapid vibration acceleration (+${rateOfRisePct}% rise detected).`);
  } else if (trendDirection === 'RISING') {
    trendPoints = 15;
    warningDetails.push(`Steady vibration drift upward (+${rateOfRisePct}% rise).`);
  }

  const compositeScore = Math.min(100, proximityPoints + trendPoints + sensoryPoints);
  const earlyWarningTriggered = compositeScore >= 45;

  return {
    machineId,
    latestRmsMps2: latest,
    baselineRmsMps2: base,
    warningThresholdMps2: warningThreshold,
    thresholdProximityPct: proximityPct,
    trendRateOfRisePct: rateOfRisePct,
    trendDirection,
    compositeEarlyWarningScore: compositeScore,
    earlyWarningTriggered,
    warningDetails,
    physicalSensoryFlagsCount: (latestObs ? (latestObs.abnormalNoise ? 1 : 0) + (latestObs.highSurfaceTemp ? 1 : 0) + (latestObs.looseMounting ? 1 : 0) + (latestObs.oilLeakage ? 1 : 0) : 0),
    latestObservation: latestObs,
  };
}
