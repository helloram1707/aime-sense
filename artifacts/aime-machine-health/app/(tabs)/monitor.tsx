import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppState,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  ActionButton,
  AppScreen,
  BodyText,
  EmptyState,
  InlineNotice,
  Panel,
  ScreenHeading,
  SectionTitle,
  SmallLabel,
  SourceBadge,
  StatusBadge,
  formatDateTime,
  formatMetric,
  uiStyles,
} from '@/components/ui';
import { useHealthStore } from '@/context/HealthStore';
import { useColors } from '@/hooks/useColors';
import {
  analyzeWindowForMachine,
} from '@/src/core/analyzeWindow';
import {
  createBaseline,
  type HealthDecision,
  type MeasurementSample,
  type ReportSource,
} from '@/src/core/healthEngine';

const GRAVITY_MPS2 = 9.80665;
const REQUESTED_INTERVAL_MS = 50;
const CAPTURE_WINDOW_MS = 4_000;

interface CompletedCapture {
  report: ReturnType<typeof analyzeWindowForMachine>['report'];
  vibration: ReturnType<typeof analyzeWindowForMachine>['vibration'];
  source: ReportSource;
  observedAtMs: number;
  decision: HealthDecision;
}

function monotonicNow(): number | undefined {
  const value = globalThis.performance?.now?.();
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

import { useI18n } from '@/src/i18n/I18nContext';
import {
  generateExternalSensorPacket,
  parseExternalSensorSamples,
  type ExternalSensorDevice,
} from '@/src/core/sensorManager';

export default function MonitorScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { activeMachine, observations, recordObservation, setBaseline } =
    useHealthStore();
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sensorError, setSensorError] = useState('');
  const [sampleCount, setSampleCount] = useState(0);
  const [currentReading, setCurrentReading] = useState<MeasurementSample | null>(null);
  const [recentSamples, setRecentSamples] = useState<MeasurementSample[]>([]);
  const [lastCapture, setLastCapture] = useState<CompletedCapture | null>(null);
  const [referenceConfirmed, setReferenceConfirmed] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sampleBufferRef = useRef<MeasurementSample[]>([]);
  const captureOpenRef = useRef(false);

  const latestHistory = useMemo(
    () => observations.filter((record) => record.machineId === activeMachine?.id),
    [activeMachine?.id, observations],
  );

  useEffect(() => {
    let current = true;
    if (Platform.OS === 'web') {
      setSensorAvailable(false);
      return () => {
        current = false;
      };
    }
    Accelerometer.isAvailableAsync()
      .then((available) => {
        if (current) setSensorAvailable(available);
      })
      .catch(() => {
        if (current) setSensorAvailable(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const previousMachineIdRef = useRef<string | null>(activeMachine?.id ?? null);
  useEffect(() => {
    if (
      previousMachineIdRef.current !== activeMachine?.id &&
      captureOpenRef.current
    ) {
      stopPendingCapture();
      setSensorError('Capture stopped because the selected machine changed. Start a new window for the selected machine.');
    }
    previousMachineIdRef.current = activeMachine?.id ?? null;
  }, [activeMachine?.id]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && captureOpenRef.current) {
        stopPendingCapture();
        setSensorError('Capture stopped because the app left the foreground. Start a new window when ready.');
      }
    });
    return () => {
      appStateSubscription.remove();
      stopPendingCapture();
    };
  }, []);

  function stopPendingCapture() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    captureOpenRef.current = false;
    setCapturing(false);
  }

  function completeCapture() {
    const samples = [...sampleBufferRef.current];
    stopPendingCapture();
    if (!activeMachine) return;

    const observedAtMs = Date.now();
    const analysis = analyzeWindowForMachine({
      machine: activeMachine,
      samples,
      nowMonotonicMs: monotonicNow(),
      observedAtMs,
      sensorAvailable: true,
    });
    recordObservation(analysis.record);
    setLastCapture({
      report: analysis.report,
      vibration: analysis.vibration,
      source: analysis.report.source,
      observedAtMs,
      decision: analysis.record.decision,
    });
    setReferenceConfirmed(false);
  }

  async function startCapture() {
    if (!activeMachine || capturing) return;
    setSensorError('');
    setLastCapture(null);
    setReferenceConfirmed(false);

    if (Platform.OS === 'web') {
      setSensorAvailable(false);
      setSensorError('The browser preview cannot access the phone accelerometer. Open this app on an Android phone to collect live readings.');
      return;
    }

    try {
      const available = await Accelerometer.isAvailableAsync();
      setSensorAvailable(available);
      if (!available) {
        setSensorError('No accelerometer is available on this device. A valid health result was not created.');
        return;
      }

      sampleBufferRef.current = [];
      setRecentSamples([]);
      setSampleCount(0);
      Accelerometer.setUpdateInterval(REQUESTED_INTERVAL_MS);
      captureOpenRef.current = true;
      setCapturing(true);
      subscriptionRef.current = Accelerometer.addListener((measurement) => {
        const receiptMonotonicMs = monotonicNow();
        if (receiptMonotonicMs === undefined) return;
        const sample: MeasurementSample = {
          machineId: activeMachine.id,
          monotonicMs: measurement.timestamp * 1_000,
          receiptMonotonicMs,
          wallClockMs: Date.now(),
          x: measurement.x * GRAVITY_MPS2,
          y: measurement.y * GRAVITY_MPS2,
          z: measurement.z * GRAVITY_MPS2,
          unit: 'm/s²',
          dataSource: 'LIVE_SENSOR',
        };
        sampleBufferRef.current.push(sample);
        setCurrentReading(sample);
        if (sampleBufferRef.current.length % 4 === 0) {
          setSampleCount(sampleBufferRef.current.length);
          setRecentSamples(sampleBufferRef.current.slice(-36));
        }
      });
      timerRef.current = setTimeout(completeCapture, CAPTURE_WINDOW_MS);
    } catch (error) {
      stopPendingCapture();
      setSensorAvailable(false);
      setSensorError(
        error instanceof Error
          ? `The accelerometer could not start: ${error.message}`
          : 'The accelerometer could not start.',
      );
    }
  }

  function establishBaseline() {
    if (
      !activeMachine ||
      !referenceConfirmed ||
      !lastCapture?.report.suitableForAnalysis ||
      !lastCapture.vibration
    ) {
      return;
    }
    const baseline = createBaseline(
      activeMachine.id,
      lastCapture.report,
      lastCapture.vibration,
      lastCapture.observedAtMs,
      true,
    );
    if (!baseline) {
      setSensorError('This window cannot be used as a baseline. Check the validation report and data source.');
      return;
    }
    setBaseline(activeMachine.id, baseline);
    setSensorError('');
    setReferenceConfirmed(false);
  }

  function startExternalCapture() {
    if (!activeMachine || capturing) return;
    setSensorError('');
    setLastCapture(null);
    setReferenceConfirmed(false);

    const device: ExternalSensorDevice = {
      id: `node-${activeMachine.id}`,
      name: `ESP32 Industrial Node (${activeMachine.id})`,
      type: 'BLE_ACCEL',
      model: 'ADXL355-Industrial',
      macOrIp: '24:6F:28:B2:1A:9C',
      assignedMachineId: activeMachine.id,
      status: 'STREAMING',
      sampleRateHz: 50,
      packetsReceived: 1,
    };

    const packet = generateExternalSensorPacket(
      device,
      48,
      activeMachine.baseline ? activeMachine.baseline.rmsMps2 * 1.15 : 0.45,
    );
    const samples = parseExternalSensorSamples(packet);
    setRecentSamples(samples.slice(-36));
    setCurrentReading(samples[samples.length - 1]);
    setSampleCount(samples.length);

    const observedAtMs = Date.now();
    const analysis = analyzeWindowForMachine({
      machine: activeMachine,
      samples,
      nowMonotonicMs: monotonicNow(),
      observedAtMs,
      sensorAvailable: true,
    });
    recordObservation(analysis.record);
    setLastCapture({
      report: analysis.report,
      vibration: analysis.vibration,
      source: analysis.report.source,
      observedAtMs,
      decision: analysis.record.decision,
    });
  }

  if (!activeMachine) {
    return (
      <AppScreen>
        <ScreenHeading eyebrow={t.appName} title="Monitor a machine" />
        <EmptyState
          icon="engine-outline"
          title="Register a machine first"
          detail="Use the Overview tab to add a machine, then come back to collect a sensor window."
        />
      </AppScreen>
    );
  }

  const diagnostics = lastCapture?.report.diagnostics ?? [];

  return (
    <AppScreen>
      <ScreenHeading
        eyebrow={`MEASUREMENT · ${activeMachine.id}`}
        title="Capture a window."
        description={`Collect ${CAPTURE_WINDOW_MS / 1_000} seconds of accelerometer readings for ${activeMachine.name}.`}
      />

      <Panel>
        <View style={uiStyles.spread}>
          <View style={{ flex: 1, gap: 4 }}>
            <SmallLabel>ACCELEROMETER</SmallLabel>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
              {Platform.OS === 'web'
                ? 'Open on Android for phone sensor'
                : sensorAvailable === null
                ? 'Checking availability'
                : sensorAvailable
                  ? 'Available on this device'
                  : 'Unavailable here'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={sensorAvailable ? 'motion-sensor' : 'motion-sensor-off'}
            size={25}
            color={sensorAvailable ? colors.success : colors.mutedForeground}
          />
        </View>
        <BodyText muted>
          The phone sensor reports acceleration in g. AIME converts each axis using 9.80665 m/s² per g. The requested sample interval is 50 ms; actual intervals are measured and checked.
        </BodyText>
        <InlineNotice>
          Place the phone securely against the machine only when safe and permitted. Hand movement, gravity, mounting, orientation, and phone sensor limits can affect results.
        </InlineNotice>
        {sensorError ? <InlineNotice tone="warning">{sensorError}</InlineNotice> : null}
        <ActionButton
          label={capturing ? `Collecting ${sampleBufferRef.current.length} samples…` : t.startLiveCapture}
          icon={capturing ? 'chart-timeline-variant' : 'record-circle-outline'}
          onPress={() => void startCapture()}
          disabled={capturing}
          testID="start-live-capture"
        />
        <ActionButton
          label="Test External Sensor Node (BLE / WiFi)"
          icon="bluetooth-connect"
          variant="secondary"
          onPress={startExternalCapture}
          disabled={capturing}
        />
      </Panel>

      {capturing || currentReading ? (
        <Panel>
          <SectionTitle title={capturing ? 'Incoming live samples' : 'Latest live sample'} />
          <View style={uiStyles.wrap}>
            <SourceBadge source="LIVE_SENSOR" />
            <View style={[uiStyles.row, { gap: 5 }]}>
              <SmallLabel>Samples</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                {capturing ? sampleBufferRef.current.length : sampleCount}
              </Text>
            </View>
          </View>
          {currentReading ? (
            <View style={[uiStyles.wrap, { justifyContent: 'space-between' }]}>
              {[
                ['X', currentReading.x],
                ['Y', currentReading.y],
                ['Z', currentReading.z],
              ].map(([axis, value]) => (
                <View key={String(axis)} style={{ minWidth: 74, gap: 3 }}>
                  <SmallLabel>{String(axis)} AXIS</SmallLabel>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                    {Number(value).toFixed(3)} m/s²
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={[styles.waveform, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {recentSamples.map((sample, index) => {
              const vector = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2);
              return (
                <View
                  key={`${sample.monotonicMs}-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      height: Math.max(4, Math.min(48, vector * 6)),
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              );
            })}
          </View>
          <BodyText muted>
            Recent vector magnitude is drawn from the incoming phone samples; it is not a frequency spectrum.
          </BodyText>
        </Panel>
      ) : null}

      {lastCapture ? (
        <Panel>
          <View style={uiStyles.spread}>
            <SectionTitle title="Window assessment" />
            <StatusBadge status={lastCapture.decision.status} />
          </View>
          <SourceBadge source={lastCapture.report.source} />
          <View style={uiStyles.spread}>
            <BodyText muted>Vector RMS</BodyText>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 }}>
              {formatMetric(lastCapture.vibration?.rmsMps2)}
            </Text>
          </View>
          <View style={uiStyles.spread}>
            <BodyText muted>Valid samples</BodyText>
            <BodyText>{lastCapture.report.validSamples} / {lastCapture.report.totalReceived}</BodyText>
          </View>
          <View style={uiStyles.spread}>
            <BodyText muted>Observed window</BodyText>
            <BodyText>{(lastCapture.report.observationDurationMs / 1_000).toFixed(2)} s</BodyText>
          </View>
          <View style={uiStyles.spread}>
            <BodyText muted>Sample interval, median</BodyText>
            <BodyText>
              {lastCapture.report.intervalMedianMs === null
                ? 'Not available'
                : `${lastCapture.report.intervalMedianMs.toFixed(1)} ms`}
            </BodyText>
          </View>
          <BodyText>{lastCapture.decision.reason}</BodyText>
          {diagnostics.length > 0 ? (
            <View style={{ gap: 7 }}>
              <SmallLabel>Validation findings</SmallLabel>
              {diagnostics.slice(0, 5).map((item, index) => (
                <BodyText key={`${item.reason}-${index}`} muted>
                  {item.reason.replaceAll('_', ' ')}: {item.message}
                </BodyText>
              ))}
            </View>
          ) : null}
          {lastCapture.report.suitableForAnalysis && lastCapture.vibration ? (
            <>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: referenceConfirmed }}
                onPress={() => setReferenceConfirmed((value) => !value)}
                testID="confirm-reference-condition"
                style={[uiStyles.row, { alignItems: 'flex-start' }]}
              >
                <MaterialCommunityIcons
                  name={referenceConfirmed ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
                  size={22}
                  color={colors.primary}
                />
                <BodyText style={{ flex: 1 }}>
                  I confirm this machine is in a suitable, stable reference condition for its current mounting and operating state.
                </BodyText>
              </Pressable>
              <ActionButton
                label={activeMachine.baseline ? 'Replace this machine’s baseline' : 'Establish baseline from this window'}
                icon="target"
                variant="secondary"
                disabled={!referenceConfirmed}
                onPress={establishBaseline}
                testID="establish-baseline"
              />
            </>
          ) : null}
          <BodyText muted>
            Captured {formatDateTime(lastCapture.observedAtMs)}. Window-mean subtraction is only a simple gravity-offset estimate; it does not remove phone movement or produce standards-compliant vibration data.
          </BodyText>
        </Panel>
      ) : null}

      <Panel>
        <SectionTitle title="Current reference" />
        {activeMachine.baseline ? (
          <>
            <SourceBadge source={activeMachine.baseline.source} />
            <BodyText>
              {formatMetric(activeMachine.baseline.rmsMps2)} · established {formatDateTime(activeMachine.baseline.establishedAtMs)}
            </BodyText>
            <BodyText muted>
              Comparisons require the same machine and data source. A simulated or imported baseline will not be compared with a live sensor window.
            </BodyText>
          </>
        ) : (
          <BodyText muted>
            No baseline yet. Capture a valid window and confirm that the machine is in a suitable reference condition before setting one.
          </BodyText>
        )}
      </Panel>

      {latestHistory.length > 0 ? (
        <Panel>
          <SectionTitle title="Most recent saved window" />
          <SourceBadge source={latestHistory[0].source} originalDataSource={latestHistory[0].originalDataSource} />
          <StatusBadge status={latestHistory[0].decision.status} />
          <BodyText>{formatDateTime(latestHistory[0].capturedAtMs)} · {latestHistory[0].validation.validSamples} valid samples</BodyText>
        </Panel>
      ) : null}
    </AppScreen>
  );
}

const styles = {
  waveform: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 3,
  },
  waveBar: { flex: 1, maxWidth: 6, borderRadius: 4 },
};
