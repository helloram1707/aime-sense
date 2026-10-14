import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import {
  ActionButton,
  AppScreen,
  BodyText,
  EmptyState,
  InlineNotice,
  MachineChoice,
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
import { analyzeWindowForMachine } from '@/src/core/analyzeWindow';
import { createDemoWindow, type DemoLevel } from '@/src/core/demoData';
import { parseMeasurementCsv } from '@/src/core/csv';
import { runValidationLab, type LabResult } from '@/src/core/validationLab';
import {
  calculateVibrationRms,
  createBaseline,
  validateWindow,
} from '@/src/core/healthEngine';

export default function LabScreen() {
  const colors = useColors();
  const {
    machines,
    activeMachine,
    activeMachineId,
    selectMachine,
    recordObservation,
    setBaseline,
  } = useHealthStore();
  const [results, setResults] = useState<LabResult[]>(() => runValidationLab());
  const [demoReferenceConfirmed, setDemoReferenceConfirmed] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const passCount = useMemo(
    () => results.filter((item) => item.passed).length,
    [results],
  );

  function recordSimulation(level: DemoLevel, count = 1) {
    if (!activeMachine) return;
    setNotice('');
    let alertState = activeMachine.alertState;
    for (let index = 0; index < count; index += 1) {
      const capturedAtMs = Date.now() + index * 4_100;
      const samples = createDemoWindow(
        activeMachine.id,
        level,
        capturedAtMs - 4_000,
      );
      const analysis = analyzeWindowForMachine({
        machine: activeMachine,
        samples,
        observedAtMs: capturedAtMs,
        previousAlertState: alertState,
      });
      recordObservation(analysis.record);
      alertState = analysis.record.decision.nextAlertState;
    }
    setNotice(
      `${count} controlled ${level} demo window${count === 1 ? '' : 's'} recorded as SIMULATED_DATA. These are generated values, not machine measurements.`,
    );
  }

  function establishDemoBaseline() {
    if (!activeMachine || !demoReferenceConfirmed) return;
    const capturedAtMs = Date.now();
    const samples = createDemoWindow(
      activeMachine.id,
      'reference',
      capturedAtMs - 4_000,
    );
    const report = validateWindow(samples, {
      expectedMachineId: activeMachine.id,
      minSamples: 24,
      minDurationMs: 2_000,
    });
    const vibration = calculateVibrationRms(report);
    if (!vibration) {
      setNotice('The reference demo did not pass validation. No baseline was created.');
      return;
    }
    const baseline = createBaseline(
      activeMachine.id,
      report,
      vibration,
      capturedAtMs,
      true,
    );
    if (!baseline) {
      setNotice('The simulated reference could not be established as a baseline.');
      return;
    }
    const analysis = analyzeWindowForMachine({
      machine: activeMachine,
      samples,
      observedAtMs: capturedAtMs,
    });
    recordObservation(analysis.record);
    setBaseline(activeMachine.id, baseline);
    setDemoReferenceConfirmed(false);
    setNotice(
      'A SIMULATED_DATA-only demo baseline was created. It cannot be compared with LIVE_SENSOR or IMPORTED_DATA.',
    );
  }

  async function importCsv() {
    if (!activeMachine || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        setBusy(false);
        return;
      }
      const asset = picked.assets[0];
      const file = new File(asset.uri);
      const parsed = parseMeasurementCsv(await file.text());
      if (parsed.samples.length === 0) {
        setNotice(parsed.errors.join(' ') || 'No measurement rows were found in that file.');
        return;
      }
      const analysis = analyzeWindowForMachine({
        machine: activeMachine,
        samples: parsed.samples,
        observedAtMs: Date.now(),
        originalDataSource: parsed.originalDataSource,
      });
      recordObservation(analysis.record);
      setNotice(
        [
          `Imported ${parsed.samples.length} rows as IMPORTED_DATA. ${analysis.report.validSamples} rows passed validation.`,
          parsed.errors.join(' '),
          analysis.record.decision.reason,
        ]
          .filter(Boolean)
          .join(' '),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `CSV import failed: ${error.message}`
          : 'CSV import failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!activeMachine) {
    return (
      <AppScreen>
        <ScreenHeading eyebrow="TEST LAB" title="Validate the rules." />
        <EmptyState
          icon="flask-outline"
          title="Register a machine first"
          detail="The fixed validation suite can run without a machine; demo observations need a selected machine."
        />
        <Panel>
          <ActionButton
            label="Run 22 logic checks"
            icon="refresh"
            variant="secondary"
            onPress={() => setResults(runValidationLab())}
          />
          <BodyText>{passCount} / {results.length} checks currently pass.</BodyText>
        </Panel>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScreenHeading
        eyebrow="TEST LAB · CONTROLLED INPUTS"
        title="Test the same rules."
        description="The cases below call the production validation, RMS, baseline, and decision functions. Their generated fixtures are not real factory readings."
      />

      <View>
        <SectionTitle title="Selected machine" />
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
      </View>

      {notice ? <InlineNotice>{notice}</InlineNotice> : null}

      <Panel>
        <View style={uiStyles.spread}>
          <View style={{ gap: 4 }}>
            <SmallLabel>DETERMINISTIC SUITE</SmallLabel>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 22 }}>
              {passCount} / {results.length}
            </Text>
          </View>
          <ActionButton
            label="Re-run checks"
            icon="refresh"
            variant="secondary"
            onPress={() => setResults(runValidationLab())}
            testID="rerun-validation-suite"
          />
        </View>
        <BodyText muted>
          PASS means the expected result matched the actual output from the app’s rule engine. It does not mean the model was tested on industrial machinery.
        </BodyText>
        {results.map((item) => (
          <View
            key={item.id}
            style={[styles.testRow, { borderTopColor: colors.border }]}
            testID={`lab-result-${item.id}`}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>
                {item.id} · {item.purpose}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 }}>
                Expected: {item.expected} · Actual: {item.actual}
              </Text>
            </View>
            <Text style={{ color: item.passed ? colors.success : colors.critical, fontFamily: 'Inter_700Bold', fontSize: 10 }}>
              {item.passed ? 'PASS' : 'FAIL'}
            </Text>
          </View>
        ))}
      </Panel>

      <Panel>
        <SectionTitle title="Set up an explicit demo reference" />
        <SourceBadge source="SIMULATED_DATA" />
        <BodyText>
          This deterministic reference is only for rehearsing the demo. It must not be presented as a healthy real machine or compared with a phone measurement.
        </BodyText>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: demoReferenceConfirmed }}
          onPress={() => setDemoReferenceConfirmed((value) => !value)}
          testID="confirm-simulated-reference"
          style={[uiStyles.row, { alignItems: 'flex-start' }]}
        >
          <MaterialCommunityIcons
            name={demoReferenceConfirmed ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
            size={22}
            color={colors.primary}
          />
          <BodyText style={{ flex: 1 }}>
            I understand this is generated data. If a baseline already exists, I intend to replace it for a simulation-only demonstration.
          </BodyText>
        </Pressable>
        <ActionButton
          label={activeMachine.baseline ? 'Replace with simulated demo baseline' : 'Create simulated demo baseline'}
          icon="target"
          variant="secondary"
          disabled={!demoReferenceConfirmed}
          onPress={establishDemoBaseline}
          testID="create-demo-baseline"
        />
        {activeMachine.baseline ? (
          <>
            <SmallLabel>Current baseline source</SmallLabel>
            <SourceBadge source={activeMachine.baseline.source} />
            <BodyText muted>
              Replacement is explicit because a baseline from one source must not be used for another.
            </BodyText>
          </>
        ) : null}
      </Panel>

      <Panel>
        <SectionTitle title="Controlled demonstration cases" />
        <BodyText muted>
          Run these only after creating a simulated baseline above. Every record remains labelled SIMULATED_DATA.
        </BodyText>
        <View style={uiStyles.wrap}>
          <ActionButton
            label="Normal"
            icon="check-circle-outline"
            variant="secondary"
            onPress={() => recordSimulation('normal')}
          />
          <ActionButton
            label="Warning × 2"
            icon="alert-outline"
            variant="secondary"
            onPress={() => recordSimulation('warning', 2)}
          />
          <ActionButton
            label="Critical"
            icon="alert-octagon-outline"
            variant="secondary"
            onPress={() => recordSimulation('critical')}
          />
          <ActionButton
            label="Recover × 2"
            icon="backup-restore"
            variant="outline"
            onPress={() => recordSimulation('normal', 2)}
          />
        </View>
        <BodyText>
          The warning case needs two valid windows. Critical triggers at the configured boundary. Recovery needs two consecutive windows below the warning boundary.
        </BodyText>
      </Panel>

      <Panel>
        <SectionTitle title="Import a CSV window" />
        <BodyText>
          Choose a CSV using the column format exported from History. Every imported row is relabelled IMPORTED_DATA, with its original source retained as file lineage when available.
        </BodyText>
        <ActionButton
          label={busy ? 'Reading file…' : 'Choose CSV file'}
          icon="file-upload-outline"
          variant="outline"
          disabled={busy}
          onPress={() => void importCsv()}
          testID="import-csv-button"
        />
        <BodyText muted>
          A valid analysis needs at least 24 rows, 2 seconds of duration, increasing timestamps, consistent source and machine ID, m/s² units, and no sample gap above the permitted limit.
        </BodyText>
      </Panel>

      <Panel>
        <SectionTitle title="Latest lab-created assessment" />
        {activeMachine.baseline ? (
          <>
            <SourceBadge source={activeMachine.baseline.source} />
            <BodyText>
              Baseline {formatMetric(activeMachine.baseline.rmsMps2)} · established {formatDateTime(activeMachine.baseline.establishedAtMs)}
            </BodyText>
          </>
        ) : (
          <BodyText muted>No baseline set. Run the explicit simulated reference step to start a controlled demo.</BodyText>
        )}
      </Panel>
    </AppScreen>
  );
}

const styles = {
  testRow: {
    borderTopWidth: 1,
    paddingTop: 9,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
  },
};
