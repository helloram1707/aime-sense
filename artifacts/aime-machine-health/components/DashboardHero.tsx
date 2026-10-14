import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MONO, SourceBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useHealthStore } from '@/context/HealthStore';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/src/i18n/I18nContext';
import type { SupportedLanguage } from '@/src/i18n/translations';
import type { HealthStatus } from '@/src/core/healthEngine';

export function DashboardHero() {
  const colors = useColors();
  const { user } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { machines, activeMachine, observations } = useHealthStore();

  const latest = activeMachine
    ? observations.find((record) => record.machineId === activeMachine.id) ?? null
    : null;

  const status: HealthStatus = latest?.decision.status ?? 'INSUFFICIENT_DATA';
  const tone =
    status === 'NORMAL'
      ? colors.success
      : status === 'WARNING'
        ? colors.warning
        : status === 'CRITICAL' || status === 'DATA_INVALID'
          ? colors.critical
          : colors.info;

  // Fleet Health Status breakdown (Green / Yellow / Red)
  const normalCount = machines.filter((m) => {
    const obs = observations.find((o) => o.machineId === m.id);
    return obs?.decision.status === 'NORMAL';
  }).length;

  const warningCount = machines.filter((m) => {
    const obs = observations.find((o) => o.machineId === m.id);
    return obs?.decision.status === 'WARNING';
  }).length;

  const criticalCount = machines.filter((m) => {
    const obs = observations.find((o) => o.machineId === m.id);
    return obs?.decision.status === 'CRITICAL';
  }).length;

  const baseline = activeMachine?.baseline?.rmsMps2 ?? null;
  const rms = latest?.rmsMps2 ?? null;
  const warn = activeMachine?.thresholds.warningRatio ?? 1.5;
  const crit = activeMachine?.thresholds.criticalRatio ?? 2.0;
  const ratio = rms !== null && baseline !== null && baseline > 0 ? rms / baseline : null;
  const scaleMax = Math.max(crit * 1.25, 1);
  const pct = (value: number) => `${Math.min(100, (value / scaleMax) * 100)}%` as `${number}%`;

  const statusDisplayMap: Record<HealthStatus, string> = {
    NORMAL: t.statusNormal,
    WARNING: t.statusWarning,
    CRITICAL: t.statusCritical,
    INSUFFICIENT_DATA: t.statusInsufficient,
    SENSOR_UNAVAILABLE: t.statusUnavailable,
    DATA_INVALID: t.statusInvalid,
  };

  const languages: Array<{ code: SupportedLanguage; label: string }> = [
    { code: 'en', label: 'EN' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  return (
    <View style={{ gap: 14 }}>
      {/* Top Bar: Problem Statement Badge + Multi-Language Switcher */}
      <View style={styles.topRow}>
        <View style={[styles.badgeContainer, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {t.problemStatementBadge}
          </Text>
        </View>

        {/* Language Switcher */}
        <View style={[styles.langSwitcher, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {languages.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => void setLanguage(l.code)}
              style={[
                styles.langBtn,
                language === l.code && { backgroundColor: colors.primary },
              ]}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.langBtnText,
                  { color: language === l.code ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Brand & Workshop Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 48, height: 48, borderRadius: 10 }}
            resizeMode="contain"
          />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 20 }}>
                AIME
              </Text>
              <Text style={{ color: '#0D9488', fontFamily: 'Inter_700Bold', fontSize: 20 }}>
                Sense
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 }}>
              {t.tagline}
            </Text>
          </View>
        </View>

        <Text style={[styles.owner, { color: colors.mutedForeground }]} numberOfLines={1}>
          {(user?.workshop ?? 'Workshop').toUpperCase()}
        </Text>
      </View>

      {/* Health Status Dashboard Summary (Simple Green / Yellow / Red) */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            {t.totalMachines}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {machines.length}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: '#2F7A4F18', borderColor: '#2F7A4F50' }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusPillText, { color: colors.success }]}>
            {normalCount} {t.normalCount.split(' ')[0]}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: '#A8620A18', borderColor: '#A8620A50' }]}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.statusPillText, { color: colors.warning }]}>
            {warningCount} {t.warningCount.split(' ')[0]}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: '#B3372E18', borderColor: '#B3372E50' }]}>
          <View style={[styles.dot, { backgroundColor: colors.critical }]} />
          <Text style={[styles.statusPillText, { color: colors.critical }]}>
            {criticalCount} {t.criticalCount.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* Main Active Machine Health Hero Panel */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.stripe, { backgroundColor: tone }]} />
        <View style={styles.body}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.machine, { color: colors.mutedForeground }]} numberOfLines={1}>
              {activeMachine ? `${activeMachine.id} · ${activeMachine.name}` : t.noMachineRegistered.toUpperCase()}
            </Text>
            {activeMachine ? (
              <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.mutedForeground }}>
                {activeMachine.category}
              </Text>
            ) : null}
          </View>

          <Text style={[styles.status, { color: tone }]}>
            {activeMachine ? statusDisplayMap[status] : t.addMachine}
          </Text>

          {activeMachine ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={[styles.value, { color: colors.foreground }]}>
                  {rms !== null ? rms.toFixed(3) : '—'}
                </Text>
                <Text style={[styles.unit, { color: colors.mutedForeground }]}>m/s² RMS</Text>
              </View>

              <View>
                <View style={[styles.track, { backgroundColor: colors.muted }]}>
                  {ratio !== null ? (
                    <View style={{ width: pct(ratio), height: '100%', backgroundColor: tone }} />
                  ) : null}
                  {[1, warn, crit].map((tick) => (
                    <View
                      key={tick}
                      style={{
                        position: 'absolute',
                        left: pct(tick),
                        top: -3,
                        bottom: -3,
                        width: 1.5,
                        backgroundColor: colors.foreground,
                        opacity: 0.55,
                      }}
                    />
                  ))}
                </View>
                <View style={{ height: 14 }}>
                  {[
                    { v: 1, t: 'BASE' },
                    { v: warn, t: 'WARN' },
                    { v: crit, t: 'CRIT' },
                  ].map((tick) => (
                    <Text
                      key={tick.t}
                      style={[
                        styles.tick,
                        { color: colors.mutedForeground, left: pct(tick.v), position: 'absolute' },
                      ]}
                    >
                      {tick.t}
                    </Text>
                  ))}
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {ratio !== null
                    ? `${ratio.toFixed(2)}× baseline · warn at ${warn}× · critical at ${crit}×`
                    : baseline === null
                      ? 'No baseline yet. Establish one in Monitor.'
                      : 'No assessed reading yet.'}
                </Text>
              </View>

              {latest ? (
                <SourceBadge source={latest.source} originalDataSource={latest.originalDataSource} />
              ) : null}
            </>
          ) : (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t.noMachineDetail}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  langSwitcher: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  langBtnText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
  },
  owner: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  summaryItem: {
    gap: 1,
  },
  summaryLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
  },
  panel: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  stripe: {
    width: 6,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  machine: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  status: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
  },
  value: {
    fontFamily: MONO,
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: -1,
  },
  unit: {
    fontFamily: MONO,
    fontSize: 12,
  },
  track: {
    height: 8,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
    overflow: 'visible',
  },
  tick: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.5,
    marginLeft: -10,
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});
