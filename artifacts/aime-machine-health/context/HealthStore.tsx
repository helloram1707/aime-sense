import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AlertState,
  Baseline,
  DataSource,
  HealthDecision,
  HealthThresholds,
  ReportSource,
  ValidationDiagnostic,
} from '@/src/core/healthEngine';
import type { ChecklistItem, PriorityLevel } from '@/src/core/maintenancePriority';
import type { OperatorObservation } from '@/src/core/earlyWarning';

export const SOURCE_LABELS: Record<DataSource, string> = {
  LIVE_SENSOR: 'Live phone sensor',
  IMPORTED_DATA: 'Imported measurement',
  SIMULATED_DATA: 'Simulated case',
};

const STORAGE_KEY = 'aime-sense:v2';
const MAX_HISTORY_RECORDS = 150;

export interface Machine {
  id: string;
  name: string;
  category: string;
  location: string;
  runHours: number;
  lastServiceDate: string;
  serviceIntervalHours: number;
  hourlyDowntimeCost: number;
  thresholds: HealthThresholds;
  baseline: Baseline | null;
  alertState: AlertState;
  createdAtMs: number;
}

export interface StoredValidation {
  totalReceived: number;
  validSamples: number;
  rejectedSamples: number;
  rejectionCounts: Record<string, number>;
  observationDurationMs: number;
  intervalMinMs: number | null;
  intervalMedianMs: number | null;
  intervalMaxMs: number | null;
  suitableForAnalysis: boolean;
  diagnostics: ValidationDiagnostic[];
}

export interface ObservationRecord {
  id: string;
  machineId: string;
  source: ReportSource;
  originalDataSource?: string;
  capturedAtMs: number;
  samples: unknown[];
  validation: StoredValidation;
  rmsMps2: number | null;
  decision: HealthDecision;
  acknowledged?: boolean;
}

export interface MaintenanceLogRecord {
  id: string;
  machineId: string;
  priority: PriorityLevel;
  checklist: ChecklistItem[];
  notes?: string;
  operatorName?: string;
  completedAtMs: number;
}

interface PersistedState {
  schemaVersion: 2;
  machines: Machine[];
  observations: ObservationRecord[];
  activeMachineId: string | null;
  maintenanceLogs: MaintenanceLogRecord[];
  operatorObservations: OperatorObservation[];
}

export type SyncStatus = 'OFFLINE_LOCAL' | 'SYNCED' | 'SYNCING' | 'ERROR';

interface HealthStoreValue {
  machines: Machine[];
  observations: ObservationRecord[];
  maintenanceLogs: MaintenanceLogRecord[];
  operatorObservations: OperatorObservation[];
  activeMachine: Machine | null;
  activeMachineId: string | null;
  ready: boolean;
  storageError: string | null;
  syncStatus: SyncStatus;
  addMachine: (input: {
    id: string;
    name: string;
    category?: string;
    location?: string;
    runHours?: number;
    lastServiceDate?: string;
    serviceIntervalHours?: number;
    hourlyDowntimeCost?: number;
    thresholds: HealthThresholds;
  }) => string | null;
  updateMachine: (id: string, updates: Partial<Machine>) => string | null;
  deleteMachine: (id: string) => void;
  selectMachine: (id: string) => void;
  setBaseline: (machineId: string, baseline: Baseline) => void;
  recordObservation: (record: ObservationRecord) => void;
  logMaintenance: (input: {
    machineId: string;
    priority: PriorityLevel;
    checklist: ChecklistItem[];
    notes?: string;
    operatorName?: string;
  }) => void;
  logOperatorObservation: (input: Omit<OperatorObservation, 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (observationId: string) => void;
  resetAllData: () => Promise<void>;
  syncWithServer: (apiUrl?: string, token?: string) => Promise<boolean>;
}

const HealthStoreContext = createContext<HealthStoreValue | null>(null);

const initialAlertState: AlertState = {
  activeStatus: 'NORMAL',
  warningStreak: 0,
  recoveryStreak: 0,
};

export function HealthStoreProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLogRecord[]>([]);
  const [operatorObservations, setOperatorObservations] = useState<OperatorObservation[]>([]);
  const [activeMachineId, setActiveMachineId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('OFFLINE_LOCAL');

  // Load from persistent local storage
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted) return;
        if (value) {
          const parsed = JSON.parse(value) as Partial<PersistedState>;
          if (Array.isArray(parsed.machines)) {
            setMachines(parsed.machines);
          }
          if (Array.isArray(parsed.observations)) {
            setObservations(parsed.observations);
          }
          if (Array.isArray(parsed.maintenanceLogs)) {
            setMaintenanceLogs(parsed.maintenanceLogs);
          }
          if (Array.isArray(parsed.operatorObservations)) {
            setOperatorObservations(parsed.operatorObservations);
          }
          setActiveMachineId(parsed.activeMachineId ?? null);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setStorageError(
            error instanceof Error
              ? `Local history could not be loaded: ${error.message}`
              : 'Local history could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Save to persistent local storage on changes
  useEffect(() => {
    if (!ready) return;
    const state: PersistedState = {
      schemaVersion: 2,
      machines,
      observations,
      activeMachineId,
      maintenanceLogs,
      operatorObservations,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error: unknown) => {
      setStorageError(
        error instanceof Error
          ? `Local data could not be saved: ${error.message}`
          : 'Local data could not be saved.',
      );
    });
  }, [activeMachineId, machines, maintenanceLogs, observations, operatorObservations, ready]);

  const addMachine = useCallback(
    (input: {
      id: string;
      name: string;
      category?: string;
      location?: string;
      runHours?: number;
      lastServiceDate?: string;
      serviceIntervalHours?: number;
      hourlyDowntimeCost?: number;
      thresholds: HealthThresholds;
    }) => {
      const machineId = input.id.trim();
      const name = input.name.trim();
      if (!machineId || !name) return 'Enter both a machine ID and name.';
      if (machines.some((m) => m.id.toLowerCase() === machineId.toLowerCase())) {
        return 'That machine ID is already registered.';
      }
      if (
        !Number.isFinite(input.thresholds.warningRatio) ||
        !Number.isFinite(input.thresholds.criticalRatio) ||
        input.thresholds.warningRatio <= 1 ||
        input.thresholds.criticalRatio <= input.thresholds.warningRatio
      ) {
        return 'The critical ratio must be greater than the warning ratio, which must be above 1.0.';
      }

      const machine: Machine = {
        id: machineId,
        name,
        category: (input.category || 'Electric motor').trim(),
        location: (input.location || 'Shop Floor').trim(),
        runHours: Number(input.runHours) || 0,
        lastServiceDate: (input.lastServiceDate || '').trim(),
        serviceIntervalHours: Number(input.serviceIntervalHours) || 500,
        hourlyDowntimeCost: Number(input.hourlyDowntimeCost) || 2500,
        thresholds: input.thresholds,
        baseline: null,
        alertState: { ...initialAlertState },
        createdAtMs: Date.now(),
      };

      setMachines((current) => [...current, machine]);
      setActiveMachineId(machine.id);
      return null;
    },
    [machines],
  );

  const updateMachine = useCallback((id: string, updates: Partial<Machine>) => {
    setMachines((current) =>
      current.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    );
    return null;
  }, []);

  const deleteMachine = useCallback((id: string) => {
    setMachines((current) => current.filter((m) => m.id !== id));
    setObservations((current) => current.filter((o) => o.machineId !== id));
    setActiveMachineId((curr) => (curr === id ? null : curr));
  }, []);

  const selectMachine = useCallback((id: string) => {
    setActiveMachineId(id);
  }, []);

  const setBaseline = useCallback((machineId: string, baseline: Baseline) => {
    setMachines((current) =>
      current.map((machine) =>
        machine.id === machineId ? { ...machine, baseline } : machine,
      ),
    );
  }, []);

  const recordObservation = useCallback((record: ObservationRecord) => {
    setObservations((current) =>
      [record, ...current].slice(0, MAX_HISTORY_RECORDS),
    );
    setMachines((current) =>
      current.map((machine) =>
        machine.id === record.machineId
          ? { ...machine, alertState: record.decision.nextAlertState }
          : machine,
      ),
    );
  }, []);

  const logMaintenance = useCallback(
    (input: {
      machineId: string;
      priority: PriorityLevel;
      checklist: ChecklistItem[];
      notes?: string;
      operatorName?: string;
    }) => {
      const record: MaintenanceLogRecord = {
        id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        machineId: input.machineId,
        priority: input.priority,
        checklist: input.checklist,
        notes: input.notes,
        operatorName: input.operatorName,
        completedAtMs: Date.now(),
      };
      setMaintenanceLogs((current) => [record, ...current]);
    },
    [],
  );

  const logOperatorObservation = useCallback(
    (input: Omit<OperatorObservation, 'id' | 'timestamp'>) => {
      const obs: OperatorObservation = {
        ...input,
        id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      };
      setOperatorObservations((current) => [obs, ...current]);
    },
    [],
  );

  const acknowledgeAlert = useCallback((observationId: string) => {
    setObservations((current) =>
      current.map((obs) =>
        obs.id === observationId ? { ...obs, acknowledged: true } : obs,
      ),
    );
  }, []);

  const resetAllData = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setMachines([]);
    setObservations([]);
    setMaintenanceLogs([]);
    setOperatorObservations([]);
    setActiveMachineId(null);
  }, []);

  const syncWithServer = useCallback(
    async (apiUrl = 'https://aime-sense.onrender.com', token?: string) => {
      if (!token) {
        setSyncStatus('OFFLINE_LOCAL');
        return false;
      }
      setSyncStatus('SYNCING');
      try {
        const res = await fetch(`${apiUrl}/api/machines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setSyncStatus('SYNCED');
          return true;
        } else {
          setSyncStatus('OFFLINE_LOCAL');
          return false;
        }
      } catch {
        setSyncStatus('OFFLINE_LOCAL');
        return false;
      }
    },
    [],
  );

  const activeMachine =
    machines.find((m) => m.id === activeMachineId) ?? machines[0] ?? null;

  const value = useMemo<HealthStoreValue>(
    () => ({
      machines,
      observations,
      maintenanceLogs,
      operatorObservations,
      activeMachine,
      activeMachineId: activeMachine?.id ?? null,
      ready,
      storageError,
      syncStatus,
      addMachine,
      updateMachine,
      deleteMachine,
      selectMachine,
      setBaseline,
      recordObservation,
      logMaintenance,
      logOperatorObservation,
      acknowledgeAlert,
      resetAllData,
      syncWithServer,
    }),
    [
      activeMachine,
      addMachine,
      deleteMachine,
      machines,
      maintenanceLogs,
      observations,
      operatorObservations,
      ready,
      recordObservation,
      resetAllData,
      selectMachine,
      setBaseline,
      storageError,
      syncStatus,
      syncWithServer,
      updateMachine,
      logMaintenance,
      logOperatorObservation,
      acknowledgeAlert,
    ],
  );

  return (
    <HealthStoreContext.Provider value={value}>
      {children}
    </HealthStoreContext.Provider>
  );
}

export function useHealthStore(): HealthStoreValue {
  const ctx = useContext(HealthStoreContext);
  if (!ctx) {
    throw new Error('useHealthStore must be used inside <HealthStoreProvider>.');
  }
  return ctx;
}
