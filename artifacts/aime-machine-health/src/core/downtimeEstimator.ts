import type { HealthStatus } from './healthEngine';

export interface DowntimeEstimateInput {
  hourlyDowntimeCost: number; // in INR (₹)
  estimatedRepairHours?: number; // typical outage duration in hours
  status: HealthStatus;
  runHours?: number;
  serviceIntervalHours?: number;
}

export interface DowntimeEstimateResult {
  hourlyDowntimeCost: number;
  estimatedRepairHours: number;
  unplannedOutageCost: number; // total breakdown cost if unmitigated
  riskProbability: number; // 0.05 to 0.95
  expectedRiskCost: number; // risk-weighted exposure
  preventiveMaintenanceCost: number; // cost of timely scheduled maintenance
  estimatedNetSavings: number; // savings achieved by avoiding catastrophic breakdown
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

/**
 * Calculates financial risk exposure and ROI of proactive maintenance.
 * Small manufacturing units often lose ₹5,000 - ₹50,000 per hour during machine stalls.
 */
export function calculateDowntimeCost(
  input: DowntimeEstimateInput,
): DowntimeEstimateResult {
  const hourlyRate = Math.max(0, Number(input.hourlyDowntimeCost) || 2500);
  const defaultHours =
    input.status === 'CRITICAL' ? 12 : input.status === 'WARNING' ? 6 : 4;
  const repairHours = Math.max(1, Number(input.estimatedRepairHours) || defaultHours);

  // Unplanned catastrophic outage cost: lost production + rush technician/parts
  const directProductionLoss = hourlyRate * repairHours;
  const emergencyRepairOverhead = hourlyRate * 1.5; // emergency tech / expedited replacement
  const unplannedOutageCost = directProductionLoss + emergencyRepairOverhead;

  // Base failure probability from vibration status
  let riskProbability = 0.05; // Normal baseline risk
  if (input.status === 'WARNING') {
    riskProbability = 0.45;
  } else if (input.status === 'CRITICAL') {
    riskProbability = 0.90;
  } else if (input.status === 'DATA_INVALID' || input.status === 'INSUFFICIENT_DATA') {
    riskProbability = 0.20;
  }

  // Adjust for run hours exceeding service interval
  if (
    input.runHours &&
    input.serviceIntervalHours &&
    input.runHours > input.serviceIntervalHours
  ) {
    const overdueFactor = Math.min(
      0.3,
      ((input.runHours - input.serviceIntervalHours) / input.serviceIntervalHours) * 0.2,
    );
    riskProbability = Math.min(0.98, riskProbability + overdueFactor);
  }

  const expectedRiskCost = Math.round(unplannedOutageCost * riskProbability);

  // Proactive preventive maintenance cost (typical small-unit inspection + grease/alignment)
  const preventiveMaintenanceCost = Math.round(Math.min(hourlyRate * 1.5, 4500));

  // Net estimated savings if addressed before breakdown
  const estimatedNetSavings = Math.max(
    0,
    expectedRiskCost - preventiveMaintenanceCost,
  );

  let urgencyLevel: DowntimeEstimateResult['urgencyLevel'] = 'LOW';
  let recommendation = 'Machine is operating within normal parameters. Continue standard scheduled checks.';

  if (riskProbability >= 0.75) {
    urgencyLevel = 'CRITICAL';
    recommendation = `High breakdown risk! Unplanned stoppage may cause an estimated ₹${unplannedOutageCost.toLocaleString()} loss. Perform immediate inspection before next production run.`;
  } else if (riskProbability >= 0.35) {
    urgencyLevel = 'HIGH';
    recommendation = `Elevated vibration detected. Scheduling a ₹${preventiveMaintenanceCost.toLocaleString()} preventive service can protect against a potential ₹${expectedRiskCost.toLocaleString()} outage exposure.`;
  } else if (riskProbability >= 0.15) {
    urgencyLevel = 'MEDIUM';
    recommendation = 'Monitor vibration closely during next shift. Verify run hours against maintenance interval.';
  }

  return {
    hourlyDowntimeCost: hourlyRate,
    estimatedRepairHours: repairHours,
    unplannedOutageCost,
    riskProbability,
    expectedRiskCost,
    preventiveMaintenanceCost,
    estimatedNetSavings,
    urgencyLevel,
    recommendation,
  };
}
