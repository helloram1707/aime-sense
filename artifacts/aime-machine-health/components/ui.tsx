import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import type { DataSource, HealthStatus, ReportSource } from '@/src/core/healthEngine';
import { SOURCE_LABELS } from '@/context/HealthStore';
import { useColors } from '@/hooks/useColors';

/** Monospace face used for readings, IDs and small labels (instrument feel). */
export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

const statusText: Record<HealthStatus, string> = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  INSUFFICIENT_DATA: 'INSUFFICIENT DATA',
  SENSOR_UNAVAILABLE: 'SENSOR UNAVAILABLE',
  DATA_INVALID: 'DATA INVALID',
};

export function AppScreen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const colors = useColors();
  const contentStyle = [
    styles.screenContent,
    Platform.OS === 'web' && styles.webTopInset,
  ];
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {scroll ? (
        <KeyboardAwareScrollViewCompat
          bottomOffset={48}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View style={[styles.screenContent, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function ScreenHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.heading}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{description}</Text>
      ) : null}
    </View>
  );
}

export function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {trailing}
    </View>
  );
}

export function BodyText({
  children,
  muted = false,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: object;
}) {
  const colors = useColors();
  return (
    <Text
      style={[
        styles.body,
        { color: muted ? colors.mutedForeground : colors.foreground },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function SmallLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>{children}</Text>;
}

export function StatusBadge({ status }: { status: HealthStatus }) {
  const colors = useColors();
  const tone =
    status === 'NORMAL'
      ? colors.success
      : status === 'WARNING'
        ? colors.warning
        : status === 'CRITICAL' || status === 'DATA_INVALID'
          ? colors.critical
          : colors.info;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${tone}1A`, borderColor: `${tone}50` },
      ]}
      accessibilityLabel={`Assessment status ${statusText[status]}`}
    >
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text style={[styles.badgeText, { color: tone }]}>{statusText[status]}</Text>
    </View>
  );
}

export function SourceBadge({
  source,
  originalDataSource,
}: {
  source: ReportSource;
  originalDataSource?: string;
}) {
  const colors = useColors();
  const label =
    source in SOURCE_LABELS
      ? SOURCE_LABELS[source as DataSource]
      : source === 'MIXED'
        ? 'Mixed sources'
        : 'Unknown source';
  return (
    <View style={[styles.sourceBadge, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.sourceText, { color: colors.secondaryForeground }]}>
        {label}
        {source === 'IMPORTED_DATA' && originalDataSource
          ? ` · originally ${originalDataSource.replaceAll('_', ' ').toLowerCase()}`
          : ''}
      </Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : 'transparent';
  const foregroundColor =
    variant === 'primary'
      ? colors.primaryForeground
      : colors.secondaryForeground;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: colors.border,
          opacity: disabled ? 0.48 : pressed ? 0.82 : 1,
        },
        variant === 'outline' && styles.outlineButton,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={foregroundColor} /> : null}
      <Text style={[styles.buttonText, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  testID,
  ...inputProps
}: TextInputProps & { label: string; error?: string; testID?: string }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        testID={testID}
        {...inputProps}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.critical : colors.input,
            color: colors.foreground,
          },
          inputProps.multiline && styles.multilineInput,
          inputProps.style,
        ]}
      />
      {error ? <Text style={[styles.errorText, { color: colors.critical }]}>{error}</Text> : null}
    </View>
  );
}

export function MachineChoice({
  id,
  name,
  selected,
  onPress,
}: {
  id: string;
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={`machine-choice-${id}`}
      style={[
        styles.machineChoice,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.machineChoiceName,
          { color: selected ? colors.accentForeground : colors.foreground },
        ]}
      >
        {name}
      </Text>
      <Text style={[styles.machineChoiceId, { color: colors.mutedForeground }]}>{id}</Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  detail: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.emptyState, { borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon} size={25} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground, textAlign: 'center' }]}>
        {detail}
      </Text>
    </View>
  );
}

export function InlineNotice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'critical';
}) {
  const colors = useColors();
  const color =
    tone === 'critical'
      ? colors.critical
      : tone === 'warning'
        ? colors.warning
        : colors.info;
  return (
    <View style={[styles.notice, { borderLeftColor: color, backgroundColor: `${color}12` }]}>
      <Text style={[styles.body, { color: colors.foreground }]}>{children}</Text>
    </View>
  );
}

export function formatDateTime(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return 'Time unavailable';
  return new Date(timestampMs).toLocaleString();
}

export function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(3)} m/s²`
    : 'Not available';
}

export const uiStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  divider: { height: 1, alignSelf: 'stretch' },
  value: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  valueSmall: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  fill: { flex: 1 },
  screenContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, gap: 14 },
  webTopInset: { paddingTop: 67, paddingBottom: 108 },
  heading: { gap: 5, paddingBottom: 3 },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, fontFamily: MONO, fontWeight: '700', textTransform: 'uppercase' },
  screenTitle: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontFamily: 'Inter_700Bold' },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  smallLabel: { fontSize: 10, lineHeight: 16, letterSpacing: 0.8, fontFamily: MONO, fontWeight: '700', textTransform: 'uppercase' },
  panel: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 12 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderRadius: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 1 },
  badgeText: { fontSize: 10, letterSpacing: 1, fontFamily: MONO, fontWeight: '700' },
  sourceBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  sourceText: { fontSize: 10, fontFamily: MONO },
  button: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlineButton: { borderWidth: 1 },
  buttonText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular' },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  errorText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  machineChoice: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minWidth: 100, maxWidth: 180, gap: 2 },
  machineChoiceName: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  machineChoiceId: { fontSize: 10, fontFamily: MONO },
  emptyState: { minHeight: 155, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 9 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  notice: { borderLeftWidth: 3, borderRadius: 4, padding: 12, gap: 6 },
});
