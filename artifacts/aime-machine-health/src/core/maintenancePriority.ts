import type { HealthStatus } from './healthEngine';

export type PriorityLevel = 'P1' | 'P2' | 'P3';

export interface ChecklistItem {
  id: string;
  task: string;
  category: 'MECHANICAL' | 'LUBRICATION' | 'ELECTRICAL' | 'MOUNTING';
  completed: boolean;
  notes?: string;
}

export interface MaintenancePriorityResult {
  machineId: string;
  machineName: string;
  priority: PriorityLevel;
  score: number; // 0 to 100
  title: string;
  reason: string;
  recommendedTimeframe: string;
  items: ChecklistItem[];
}

export interface MachineContextInput {
  id: string;
  name: string;
  category: string;
  status: HealthStatus;
  runHours?: number;
  serviceIntervalHours?: number;
  lastServiceDate?: string;
  rmsMps2?: number | null;
  baselineRmsMps2?: number | null;
  warningStreak?: number;
}

export function generateDefaultChecklist(category: string, status: HealthStatus): ChecklistItem[] {
  const isElevated = status === 'WARNING' || status === 'CRITICAL';
  const cat = category.toLowerCase();

  const items: ChecklistItem[] = [
    {
      id: 'chk-mount',
      task: 'Inspect foundation anchor bolts, baseplate level, and frame rigidity for loose fasteners.',
      category: 'MOUNTING',
      completed: false,
    },
    {
      id: 'chk-lube',
      task: 'Check bearing grease level and look for discoloration, contamination, or dry seals.',
      category: 'LUBRICATION',
      completed: false,
    },
  ];

  if (cat.includes('motor') || cat.includes('pump') || cat.includes('compressor')) {
    items.push({
      id: 'chk-align',
      task: 'Verify shaft coupling alignment (angular and parallel) and check flexible spider/bushing wear.',
      category: 'MECHANICAL',
      completed: false,
    });
    items.push({
      id: 'chk-temp',
      task: 'Perform non-contact thermal check on drive-end and non-drive-end bearing housings.',
      category: 'MECHANICAL',
      completed: false,
    });
  }

  if (cat.includes('pump')) {
    items.push({
      id: 'chk-cavitation',
      task: 'Inspect suction pressure and pipe strain to verify no cavitation or impeller recirculation.',
      category: 'MECHANICAL',
      completed: false,
    });
  }

  if (cat.includes('motor')) {
    items.push({
      id: 'chk-elec',
      task: 'Check terminal box connections, grounding bond, and listen for 2x line frequency magnetic hum.',
      category: 'ELECTRICAL',
      completed: false,
    });
  }

  if (isElevated) {
    items.unshift({
      id: 'chk-immediate',
      task: 'Perform safe visual inspection while rotating at low speed or uncoupled if permissible.',
      category: 'MECHANICAL',
      completed: false,
    });
  }

  return items;
}

export function evaluateMaintenancePriority(
  machine: MachineContextInput,
): MaintenancePriorityResult {
  let score = 10; // baseline
  let priority: PriorityLevel = 'P3';
  let title = 'P3 · Routine Maintenance';
  let reason = 'Vibration levels are within expected reference baseline limits.';
  let recommendedTimeframe = 'Next regular maintenance cycle (30 days)';

  const runHours = machine.runHours || 0;
  const interval = machine.serviceIntervalHours || 500;
  const isOverdue = runHours >= interval;
  const overdueHours = runHours - interval;

  if (machine.status === 'CRITICAL') {
    score = 95;
    priority = 'P1';
    title = 'P1 · Immediate Action Required';
    reason = 'Vibration exceeds critical threshold ratio. Operating under this condition risks catastrophic breakdown.';
    recommendedTimeframe = 'Immediate · Before next production shift';
  } else if (machine.status === 'WARNING') {
    score = 75;
    priority = 'P2';
    title = 'P2 · Scheduled Service Recommended';
    reason = 'Vibration is elevated above warning threshold. Consecutive anomaly windows indicate progressive wear or looseness.';
    recommendedTimeframe = 'Within 48 hours';
  } else if (isOverdue) {
    score = 50 + Math.min(20, Math.round((overdueHours / interval) * 20));
    priority = 'P2';
    title = 'P2 · Service Interval Overdue';
    reason = `Machine has operated ${runHours} hrs (service interval is ${interval} hrs). Lubrication and alignment verification due.`;
    recommendedTimeframe = 'Within 5 operating days';
  } else if (machine.warningStreak && machine.warningStreak > 0) {
    score = 40;
    priority = 'P3';
    title = 'P3 · Active Observation Candidate';
    reason = 'Single reading reached warning candidate. Repeat measurement to confirm trend.';
    recommendedTimeframe = 'Inspect during current shift';
  }

  const items = generateDefaultChecklist(machine.category, machine.status);

  return {
    machineId: machine.id,
    machineName: machine.name,
    priority,
    score,
    title,
    reason,
    recommendedTimeframe,
    items,
  };
}
