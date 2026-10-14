import { Accelerometer } from '@/src/core/accelerometer';
import React, { useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import {
  ActionButton,
  AppScreen,
  BodyText,
  EmptyState,
  InlineNotice,
  MachineChoice,
  MONO,
  Panel,
  ScreenHeading,
  SectionTitle,
  SmallLabel,
  SourceBadge,
  StatusBadge,
  TextField,
  formatDateTime,
  formatMetric,
  uiStyles,
} from '@/components/ui';
import { DashboardHero } from '@/components/DashboardHero';
import { useHealthStore } from '@/context/HealthStore';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/src/i18n/I18nContext';
import { calculateDowntimeCost } from '@/src/core/downtimeEstimator';
import { evaluateMaintenancePriority, type ChecklistItem } from '@/src/core/maintenancePriority';
import { evaluateEarlyWarning } from '@/src/core/earlyWarning';

export default function OverviewScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const {
    machines,
    observations,
    activeMachine,
    activeMachineId,
    addMachine,
    updateMachine,
    deleteMachine,
    selectMachine,
    logMaintenance,
    logOperatorObservation,
    operatorObservations,
    ready,
    storageError,
  } = useHealthStore();

  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  // Machine registration form state
  const [machineId, setMachineId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electric motor');
  const [location, setLocation] = useState('Bay 1 · Main Line');
  const [runHours, setRunHours] = useState('120');
  const [lastServiceDate, setLastServiceDate] = useState('2026-09-01');
  const [serviceInterval, setServiceInterval] = useState('500');
  const [hourlyDowntimeCost, setHourlyDowntimeCost] = useState('2500');
  const [warningRatio, setWarningRatio] = useState('1.5');
  const [criticalRatio, setCriticalRatio] = useState('2.0');
  const [formError, setFormError] = useState('');

  // Interactive Downtime Estimator adjustments
  const [customHourlyCost, setCustomHourlyCost] = useState('');
  const [customOutageHours, setCustomOutageHours] = useState('');

  // Early Warning Sensory Observation Modal / Form state
  const [showSensoryLogger, setShowSensoryLogger] = useState(false);
  const [abnormalNoise, setAbnormalNoise] = useState(false);
  const [highSurfaceTemp, setHighSurfaceTemp] = useState(false);
  const [looseMounting, setLooseMounting] = useState(false);
  const [oilLeakage, setOilLeakage] = useState(false);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [sensoryNotice, setSensoryNotice] = useState('');

  // Check sensor availability on mount
  useEffect(() => {
    let current = true;
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

  const latestRecord = useMemo(
    () =>
      observations.find((record) => record.machineId === activeMachine?.id) ??
      null,
    [activeMachine?.id, observations],
  );

  const activeAlertCount = observations.filter(
    (record) =>
      record.machineId === activeMachine?.id &&
      record.decision.alertRaised &&
      (record.decision.status === 'WARNING' ||
        record.decision.status === 'CRITICAL'),
  ).length;

  // Maintenance Priority Evaluation
  const maintenanceResult = useMemo(() => {
    if (!activeMachine) return null;
    return evaluateMaintenancePriority({
      id: activeMachine.id,
      name: activeMachine.name,
      category: activeMachine.category,
      status: latestRecord?.decision.status ?? 'INSUFFICIENT_DATA',
      runHours: activeMachine.runHours,
      serviceIntervalHours: activeMachine.serviceIntervalHours,
      lastServiceDate: activeMachine.lastServiceDate,
      rmsMps2: latestRecord?.rmsMps2,
      baselineRmsMps2: activeMachine.baseline?.rmsMps2,
      warningStreak: activeMachine.alertState?.warningStreak,
    });
  }, [activeMachine, latestRecord]);

  // Downtime Cost Evaluation
  const downtimeResult = useMemo(() => {
    if (!activeMachine) return null;
    const costPerHour = Number(customHourlyCost) || activeMachine.hourlyDowntimeCost || 2500;
    const repairHours = Number(customOutageHours) || (latestRecord?.decision.status === 'CRITICAL' ? 12 : 6);
    return calculateDowntimeCost({
      hourlyDowntimeCost: costPerHour,
      estimatedRepairHours: repairHours,
      status: latestRecord?.decision.status ?? 'INSUFFICIENT_DATA',
      runHours: activeMachine.runHours,
      serviceIntervalHours: activeMachine.serviceIntervalHours,
    });
  }, [activeMachine, customHourlyCost, customOutageHours, latestRecord]);

  // Early Warning Indicators Evaluation
  const earlyWarningResult = useMemo(() => {
    if (!activeMachine) return null;
    const machineReadings = observations
      .filter((o) => o.machineId === activeMachine.id)
      .map((o) => ({ rmsMps2: o.rmsMps2, capturedAtMs: o.capturedAtMs }));

    return evaluateEarlyWarning({
      machineId: activeMachine.id,
      readings: machineReadings,
      baseline: activeMachine.baseline,
      thresholds: activeMachine.thresholds,
      observations: operatorObservations,
    });
  }, [activeMachine, observations, operatorObservations]);

  // Submit machine registration
  const submitMachine = () => {
    const warning = Number(warningRatio);
    const critical = Number(criticalRatio);
    const error = addMachine({
      id: machineId,
      name,
      category,
      location,
      runHours: Number(runHours) || 0,
      lastServiceDate,
      serviceIntervalHours: Number(serviceInterval) || 500,
      hourlyDowntimeCost: Number(hourlyDowntimeCost) || 2500,
      thresholds: { warningRatio: warning, criticalRatio: critical },
    });
    if (error) {
      setFormError(error);
      return;
    }
    setMachineId('');
    setName('');
    setCategory('Electric motor');
    setLocation('Bay 1 · Main Line');
    setRunHours('0');
    setLastServiceDate(new Date().toISOString().slice(0, 10));
    setServiceInterval('500');
    setHourlyDowntimeCost('2500');
    setWarningRatio('1.5');
    setCriticalRatio('2.0');
    setFormError('');
    setShowRegistration(false);
  };

  // Submit operator physical sensory observation
  const submitSensoryObservation = () => {
    if (!activeMachine) return;
    logOperatorObservation({
      machineId: activeMachine.id,
      abnormalNoise,
      highSurfaceTemp,
      looseMounting,
      oilLeakage,
      operatorNotes,
    });
    setSensoryNotice('Observation logged into machine early warning history.');
    setShowSensoryLogger(false);
    setAbnormalNoise(false);
    setHighSurfaceTemp(false);
    setLooseMounting(false);
    setOilLeakage(false);
    setOperatorNotes('');
  };

  // Toggle checklist task completion
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  useEffect(() => {
    if (maintenanceResult?.items) {
      setChecklistItems(maintenanceResult.items);
    }
  }, [maintenanceResult]);

  const toggleChecklistItem = (itemId: string) => {
    setChecklistItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const completeInspection = () => {
    if (!activeMachine || !maintenanceResult) return;
    logMaintenance({
      machineId: activeMachine.id,
      priority: maintenanceResult.priority,
      checklist: checklistItems,
      notes: 'Completed operator inspection checklist on shop floor.',
    });
    setSensoryNotice(t.alertAcknowledged);
  };

  if (!ready) {
    return (
      <AppScreen>
        <ScreenHeading eyebrow={t.appName} title="Loading local records" />
        <BodyText muted>Opening the saved machine list and measurement history.</BodyText>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {/* Brand Hero & Health Status Dashboard Header */}
      <DashboardHero />

      {storageError ? (
        <Panel>
          <BodyText>{storageError}</BodyText>
        </Panel>
      ) : null}

      {/* Sensor Readiness Panel */}
      <Panel>
        <View style={uiStyles.spread}>
          <View style={{ flex: 1, gap: 5 }}>
            <SmallLabel>{t.deviceSensor}</SmallLabel>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
              {sensorAvailable === null
                ? 'Checking accelerometer…'
                : sensorAvailable
                  ? t.sensorDetected
                  : t.sensorUnavailable}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={sensorAvailable ? 'motion-sensor' : 'motion-sensor-off'}
            size={25}
            color={sensorAvailable ? colors.success : colors.mutedForeground}
          />
        </View>
        <BodyText muted>
          {sensorAvailable
            ? 'Sensor availability confirmed. Readings are tagged LIVE_SENSOR only upon successful physical capture.'
            : 'No accelerometer is available on this device or browser. Test Lab provides reproducible simulated benchmarks.'}
        </BodyText>
      </Panel>

      {/* Registered Machines Section */}
      <View>
        <SectionTitle
          title={t.registeredMachines}
          trailing={
            machines.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowRegistration((shown) => !shown)}
                testID="toggle-machine-form"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                  {t.addMachine}
                </Text>
              </Pressable>
            ) : null
          }
        />
        {machines.length === 0 ? (
          <EmptyState
            icon="engine-outline"
            title={t.noMachineRegistered}
            detail={t.noMachineDetail}
          />
        ) : (
          <View style={uiStyles.wrap}>
            {machines.map((machine) => (
              <MachineChoice
                key={machine.id}
                id={machine.id}
                name={machine.name}
                selected={machine.id === activeMachineId}
                onPress={() => selectMachine(machine.id)}
              />
            ))}
          </View>
        )}
      </View>

      {/* Machine Registration Form */}
      {showRegistration || machines.length === 0 ? (
        <Panel>
          <SectionTitle title={t.registerMachineTitle} />
          <TextField
            label={t.machineIdLabel}
            value={machineId}
            onChangeText={setMachineId}
            placeholder="PUMP-01"
            autoCapitalize="characters"
            testID="machine-id-input"
          />
          <TextField
            label={t.machineNameLabel}
            value={name}
            onChangeText={setName}
            placeholder="Workshop Cooling Pump"
            testID="machine-name-input"
          />
          <View style={[uiStyles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.machineCategoryLabel}
                value={category}
                onChangeText={setCategory}
                placeholder="Electric motor, pump, lathe"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.machineLocationLabel}
                value={location}
                onChangeText={setLocation}
                placeholder="Shop Floor Bay 2"
              />
            </View>
          </View>

          {/* Run Hours & Last Service Date */}
          <View style={[uiStyles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.runHoursLabel}
                value={runHours}
                onChangeText={setRunHours}
                keyboardType="numeric"
                placeholder="120"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.lastServiceDateLabel}
                value={lastServiceDate}
                onChangeText={setLastServiceDate}
                placeholder="2026-09-01"
              />
            </View>
          </View>

          {/* Service Interval & Hourly Downtime Cost */}
          <View style={[uiStyles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.serviceIntervalLabel}
                value={serviceInterval}
                onChangeText={setServiceInterval}
                keyboardType="numeric"
                placeholder="500"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.hourlyDowntimeCostLabel}
                value={hourlyDowntimeCost}
                onChangeText={setHourlyDowntimeCost}
                keyboardType="numeric"
                placeholder="2500"
              />
            </View>
          </View>

          {/* Thresholds */}
          <View style={[uiStyles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.warningRatioLabel}
                value={warningRatio}
                onChangeText={setWarningRatio}
                keyboardType="decimal-pad"
                placeholder="1.5"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t.criticalRatioLabel}
                value={criticalRatio}
                onChangeText={setCriticalRatio}
                keyboardType="decimal-pad"
                placeholder="2.0"
              />
            </View>
          </View>

          <BodyText muted>
            Threshold ratios compare readings against the machine-specific baseline. Defaults are prototype parameters.
          </BodyText>
          {formError ? <InlineNotice tone="warning">{formError}</InlineNotice> : null}
          <ActionButton
            label={t.saveMachineButton}
            icon="content-save-outline"
            onPress={submitMachine}
            testID="save-machine-button"
          />
        </Panel>
      ) : null}

      {/* Active Machine Operational Details & Status Card */}
      {activeMachine ? (
        <Panel>
          <View style={uiStyles.spread}>
            <View style={{ flex: 1, gap: 4 }}>
              <SmallLabel>{activeMachine.name}</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 18 }}>
                {activeMachine.id}
              </Text>
            </View>
            <StatusBadge
              status={latestRecord?.decision.status ?? 'INSUFFICIENT_DATA'}
            />
          </View>

          {/* Machine Operational Stats */}
          <View style={[uiStyles.wrap, { justifyContent: 'space-between', paddingVertical: 4 }]}>
            <View style={{ minWidth: 90 }}>
              <SmallLabel>{t.runHoursLabel.split(' ')[0]}</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 14, fontWeight: '700' }}>
                {activeMachine.runHours} hrs
              </Text>
            </View>
            <View style={{ minWidth: 90 }}>
              <SmallLabel>{t.lastServiceDateLabel.split(' ')[0]}</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 13 }}>
                {activeMachine.lastServiceDate || 'Not recorded'}
              </Text>
            </View>
            <View style={{ minWidth: 90 }}>
              <SmallLabel>Service Due</SmallLabel>
              <Text
                style={{
                  color: activeMachine.runHours >= activeMachine.serviceIntervalHours ? colors.warning : colors.foreground,
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {activeMachine.serviceIntervalHours} hrs
              </Text>
            </View>
          </View>

          {latestRecord ? (
            <>
              <View style={uiStyles.spread}>
                <BodyText muted>{t.latestRms}</BodyText>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                  {formatMetric(latestRecord.rmsMps2)}
                </Text>
              </View>
              <View style={uiStyles.spread}>
                <BodyText muted>{t.observedAt}</BodyText>
                <BodyText>{formatDateTime(latestRecord.capturedAtMs)}</BodyText>
              </View>
              <SourceBadge
                source={latestRecord.source}
                originalDataSource={latestRecord.originalDataSource}
              />
              <BodyText>{latestRecord.decision.reason}</BodyText>
            </>
          ) : (
            <BodyText muted>
              No measurements have been assessed for this machine yet. The system will not presume normal health without baseline data.
            </BodyText>
          )}

          <View style={[uiStyles.spread, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
            <BodyText muted>{t.baselineLabel}</BodyText>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
              {activeMachine.baseline
                ? `${formatMetric(activeMachine.baseline.rmsMps2)} · ${activeMachine.baseline.source.replaceAll('_', ' ')}`
                : t.notEstablished}
            </Text>
          </View>
          <View style={uiStyles.spread}>
            <BodyText muted>{t.recordedAlerts}</BodyText>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
              {activeAlertCount}
            </Text>
          </View>
        </Panel>
      ) : null}

      {/* Feature 3: Maintenance Priority Suggestions */}
      {maintenanceResult ? (
        <Panel>
          <View style={uiStyles.spread}>
            <SectionTitle title={t.maintenancePrioritiesTitle} />
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor:
                  maintenanceResult.priority === 'P1'
                    ? '#B3372E20'
                    : maintenanceResult.priority === 'P2'
                      ? '#A8620A20'
                      : '#2F7A4F20',
              }}
            >
              <Text
                style={{
                  fontFamily: MONO,
                  fontWeight: '700',
                  fontSize: 12,
                  color:
                    maintenanceResult.priority === 'P1'
                      ? colors.critical
                      : maintenanceResult.priority === 'P2'
                        ? colors.warning
                        : colors.success,
                }}
              >
                {maintenanceResult.title}
              </Text>
            </View>
          </View>
          <BodyText>{maintenanceResult.reason}</BodyText>
          <View style={uiStyles.spread}>
            <SmallLabel>TIMEFRAME</SmallLabel>
            <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 12 }}>
              {maintenanceResult.recommendedTimeframe}
            </Text>
          </View>

          {/* Checklist */}
          <View style={{ gap: 8, marginTop: 4 }}>
            <SmallLabel>{t.checklistTitle}</SmallLabel>
            {checklistItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleChecklistItem(item.id)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 }}
              >
                <MaterialCommunityIcons
                  name={item.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={20}
                  color={item.completed ? colors.success : colors.mutedForeground}
                />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: item.completed ? colors.mutedForeground : colors.foreground,
                    textDecorationLine: item.completed ? 'line-through' : 'none',
                  }}
                >
                  {item.task}
                </Text>
              </Pressable>
            ))}
          </View>

          <ActionButton
            label={t.markCompleted}
            icon="clipboard-check-outline"
            variant="secondary"
            onPress={completeInspection}
          />
        </Panel>
      ) : null}

      {/* Feature 4: Downtime Cost Estimator */}
      {downtimeResult ? (
        <Panel>
          <SectionTitle title={t.downtimeEstimatorTitle} />
          <BodyText muted>{t.downtimeEstimatorSubtitle}</BodyText>

          <View style={[uiStyles.wrap, { justifyContent: 'space-between', paddingVertical: 4 }]}>
            <View style={{ minWidth: 120 }}>
              <SmallLabel>{t.hourlyRate}</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 16, fontWeight: '700' }}>
                ₹{downtimeResult.hourlyDowntimeCost.toLocaleString()}
              </Text>
            </View>
            <View style={{ minWidth: 120 }}>
              <SmallLabel>{t.estimatedHours}</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 16, fontWeight: '700' }}>
                {downtimeResult.estimatedRepairHours} hrs
              </Text>
            </View>
          </View>

          {/* Interactive Outage / Cost adjustments */}
          <View style={[uiStyles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Adjust Rate (₹/hr)"
                value={customHourlyCost}
                onChangeText={setCustomHourlyCost}
                keyboardType="numeric"
                placeholder={String(activeMachine?.hourlyDowntimeCost || 2500)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Adjust Outage (hrs)"
                value={customOutageHours}
                onChangeText={setCustomOutageHours}
                keyboardType="numeric"
                placeholder="6"
              />
            </View>
          </View>

          <View style={[styles.costCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <View style={uiStyles.spread}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.foreground }}>
                {t.estimatedRiskCost}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color: colors.critical }}>
                ₹{downtimeResult.expectedRiskCost.toLocaleString()}
              </Text>
            </View>
            <View style={uiStyles.spread}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.foreground }}>
                {t.preventiveCost}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 14, color: colors.foreground }}>
                ₹{downtimeResult.preventiveMaintenanceCost.toLocaleString()}
              </Text>
            </View>
            <View style={[uiStyles.spread, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }]}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.success }}>
                {t.estimatedSavings}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 17, fontWeight: '700', color: colors.success }}>
                ₹{downtimeResult.estimatedNetSavings.toLocaleString()}
              </Text>
            </View>
          </View>

          <BodyText muted>{downtimeResult.recommendation}</BodyText>
        </Panel>
      ) : null}

      {/* Feature 5: Early Warning Indicators */}
      {earlyWarningResult ? (
        <Panel>
          <View style={uiStyles.spread}>
            <SectionTitle title={t.earlyWarningTitle} />
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: earlyWarningResult.earlyWarningTriggered ? '#A8620A20' : '#2F7A4F20',
              }}
            >
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: '700',
                  color: earlyWarningResult.earlyWarningTriggered ? colors.warning : colors.success,
                }}
              >
                Score: {earlyWarningResult.compositeEarlyWarningScore}/100
              </Text>
            </View>
          </View>
          <BodyText muted>{t.earlyWarningSubtitle}</BodyText>

          {/* Proximity & Trend Stats */}
          <View style={[uiStyles.wrap, { justifyContent: 'space-between', paddingVertical: 4 }]}>
            <View>
              <SmallLabel>{t.thresholdProximity}</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 15, fontWeight: '700' }}>
                {earlyWarningResult.thresholdProximityPct}%
              </Text>
            </View>
            <View>
              <SmallLabel>{t.vibrationTrend}</SmallLabel>
              <Text
                style={{
                  color:
                    earlyWarningResult.trendDirection === 'ACCELERATING'
                      ? colors.critical
                      : earlyWarningResult.trendDirection === 'RISING'
                        ? colors.warning
                        : colors.success,
                  fontFamily: MONO,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {earlyWarningResult.trendDirection === 'ACCELERATING'
                  ? t.acceleratingTrend.split(' · ')[0]
                  : earlyWarningResult.trendDirection === 'RISING'
                    ? t.risingTrend.split(' · ')[0]
                    : t.stableTrend.split(' · ')[0]}
              </Text>
            </View>
            <View>
              <SmallLabel>Physical Flags</SmallLabel>
              <Text style={{ color: colors.foreground, fontFamily: MONO, fontSize: 15, fontWeight: '700' }}>
                {earlyWarningResult.physicalSensoryFlagsCount} logged
              </Text>
            </View>
          </View>

          {earlyWarningResult.warningDetails.length > 0 ? (
            <View style={{ gap: 4, marginVertical: 4 }}>
              {earlyWarningResult.warningDetails.map((detail, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.warning} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.foreground }}>
                    {detail}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {sensoryNotice ? <InlineNotice>{sensoryNotice}</InlineNotice> : null}

          {/* Button to open operator sensory observation logger */}
          <ActionButton
            label={showSensoryLogger ? 'Close Physical Observation' : t.logOperatorObservation}
            icon="clipboard-edit-outline"
            variant="secondary"
            onPress={() => setShowSensoryLogger((val) => !val)}
          />

          {showSensoryLogger ? (
            <View style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <SmallLabel>OPERATOR SENSORY FLAGS (REAL WORKSHOP DATA)</SmallLabel>

              <Pressable
                onPress={() => setAbnormalNoise((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <MaterialCommunityIcons
                  name={abnormalNoise ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
                  {t.auditoryNotice}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHighSurfaceTemp((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <MaterialCommunityIcons
                  name={highSurfaceTemp ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
                  {t.thermalNotice}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLooseMounting((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <MaterialCommunityIcons
                  name={looseMounting ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
                  {t.looseMountNotice}
                </Text>
              </Pressable>

              <TextField
                label="Operator Notes / Observations"
                value={operatorNotes}
                onChangeText={setOperatorNotes}
                placeholder="Observed slight belt chatter during startup shift"
              />

              <ActionButton
                label="Save Physical Observation"
                icon="check"
                onPress={submitSensoryObservation}
              />
            </View>
          ) : null}
        </Panel>
      ) : null}

      {/* Educational & Screening Disclaimer */}
      <Panel>
        <SectionTitle title={t.readingTheResult} />
        <BodyText>
          RMS is the vector root-mean-square acceleration calculated after window-mean removal. It serves as a practical, low-cost screening signal to alert maintenance personnel early, without expensive proprietary sensors.
        </BodyText>
        <SourceBadge source="SIMULATED_DATA" />
        <BodyText muted>
          Simulated demo readings are always explicitly tagged. They are never blended with live machine sensor recordings.
        </BodyText>
      </Panel>
    </AppScreen>
  );
}

const styles = {
  costCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginVertical: 4,
  },
};
