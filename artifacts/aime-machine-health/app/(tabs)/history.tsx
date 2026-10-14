import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
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
import { buildHistoryCsv } from '@/src/core/csv';

export default function HistoryScreen() {
  const colors = useColors();
  const { machines, activeMachine, activeMachineId, observations, selectMachine } =
    useHealthStore();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const records = useMemo(
    () =>
      observations.filter((record) =>
        activeMachine ? record.machineId === activeMachine.id : true,
      ),
    [activeMachine, observations],
  );

  async function exportCsv() {
    if (busy || records.length === 0) return;
    setBusy(true);
    setNotice('');
    try {
      const content = buildHistoryCsv(records);
      const file = new File(
        Paths.cache,
        `aime-history-${Date.now()}.csv`,
      );
      file.write(content);
      if (!(await Sharing.isAvailableAsync())) {
        setNotice(
          Platform.OS === 'web'
            ? 'File sharing is not available in this browser preview. Use an Android device to export the CSV.'
            : 'System file sharing is not available on this device.',
        );
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export AIME measurement history',
      });
      setNotice(
        `${records.length} observation windows exported as CSV, including sample values, timestamps, units, source labels, validation outcomes, and assessment reasons.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `CSV export failed: ${error.message}`
          : 'CSV export failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen>
      <ScreenHeading
        eyebrow="LOCAL RECORDS"
        title="Measurement history."
        description="Stored on this device. Each window keeps its source, sample timing, validation findings, RMS, and rule outcome."
      />

      {machines.length > 0 ? (
        <View>
          <SectionTitle title="Machine filter" />
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
      ) : null}

      {notice ? <InlineNotice>{notice}</InlineNotice> : null}

      <Panel>
        <View style={uiStyles.spread}>
          <View style={{ gap: 4 }}>
            <SmallLabel>FILTERED WINDOWS</SmallLabel>
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 22 }}>
              {records.length}
            </Text>
          </View>
          <ActionButton
            label={busy ? 'Preparing…' : 'Export CSV'}
            icon="download-outline"
            variant="secondary"
            disabled={records.length === 0 || busy}
            onPress={() => void exportCsv()}
            testID="export-history-csv"
          />
        </View>
        <BodyText muted>
          The CSV includes the original sample values; imported windows are tagged IMPORTED_DATA and retain their original source if present.
        </BodyText>
      </Panel>

      {records.length === 0 ? (
        <EmptyState
          icon="history"
          title="No saved measurements"
          detail="Use Monitor for phone readings, or import a supported CSV in Test Lab. No example data is inserted automatically."
        />
      ) : (
        records.map((record) => (
          <Panel key={record.id}>
            <View style={uiStyles.spread}>
              <View style={{ flex: 1, gap: 3 }}>
                <SmallLabel>{record.machineId}</SmallLabel>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                  {formatDateTime(record.capturedAtMs)}
                </Text>
              </View>
              <StatusBadge status={record.decision.status} />
            </View>
            <SourceBadge
              source={record.source}
              originalDataSource={record.originalDataSource}
            />
            <View style={[uiStyles.spread, { alignItems: 'flex-start' }]}>
              <BodyText muted>Dynamic acceleration RMS</BodyText>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                {formatMetric(record.rmsMps2)}
              </Text>
            </View>
            <View style={[uiStyles.wrap, { justifyContent: 'space-between' }]}>
              <BodyText muted>
                {record.validation.validSamples}/{record.validation.totalReceived} valid samples
              </BodyText>
              <BodyText muted>
                {(record.validation.observationDurationMs / 1_000).toFixed(2)} s
              </BodyText>
            </View>
            <BodyText>{record.decision.reason}</BodyText>
            <View style={[styles.ruleBox, { borderLeftColor: colors.primary, backgroundColor: colors.background }]}>
              <SmallLabel>RECOMMENDED ACTION</SmallLabel>
              <BodyText>{record.decision.recommendedAction}</BodyText>
            </View>
            {record.validation.diagnostics.length > 0 ? (
              <View style={{ gap: 6 }}>
                <SmallLabel>VALIDATION DIAGNOSTICS</SmallLabel>
                {record.validation.diagnostics.slice(0, 4).map((item, index) => (
                  <BodyText key={`${item.reason}-${index}`} muted>
                    {item.reason.replaceAll('_', ' ')} · {item.message}
                  </BodyText>
                ))}
              </View>
            ) : null}
            <BodyText muted>
              {Array.isArray(record.samples) ? record.samples.length : 0} raw rows saved with this record.
            </BodyText>
          </Panel>
        ))
      )}
    </AppScreen>
  );
}

const styles = {
  ruleBox: {
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 11,
    gap: 6,
  },
};
