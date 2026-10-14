import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen, InlineNotice, MONO, ScreenHeading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useHealthStore } from '@/context/HealthStore';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/src/i18n/I18nContext';
import type { SupportedLanguage } from '@/src/i18n/translations';

function SpecRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.specRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.specValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function ActionRow({
  label,
  detail,
  onPress,
  danger = false,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: danger ? colors.critical : colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
          {label}
        </Text>
        {detail ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>{detail}</Text>
        ) : null}
      </View>
      {!danger ? <Text style={{ color: colors.mutedForeground, fontFamily: MONO, fontSize: 16 }}>›</Text> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { t, language, setLanguage } = useI18n();
  const { user, signOut, isOfflineMode } = useAuth();
  const { machines, observations, maintenanceLogs, resetAllData, syncStatus, syncWithServer } = useHealthStore();
  const [resetNotice, setResetNotice] = useState('');

  const initials =
    user?.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ?? '?';

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      void signOut();
      return;
    }
    Alert.alert('Sign out?', 'Your machines and history stay saved on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const confirmResetData = () => {
    const executeReset = async () => {
      await resetAllData();
      setResetNotice('All local machines, observations, and maintenance logs have been cleared.');
    };

    if (Platform.OS === 'web') {
      void executeReset();
      return;
    }
    Alert.alert(
      'Reset All Machine Data?',
      'This will remove all locally registered machines, baseline settings, and readings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset All Data', style: 'destructive', onPress: () => void executeReset() },
      ],
    );
  };

  const languages: Array<{ code: SupportedLanguage; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
  ];

  return (
    <AppScreen>
      <ScreenHeading eyebrow={t.appName} title={t.tabProfile} />

      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: '#0B2447' }]}>
          <Text style={{ color: '#F4F1EA', fontFamily: MONO, fontWeight: '700', fontSize: 20 }}>{initials}</Text>
          <View style={[styles.avatarEdge, { backgroundColor: '#0D9488' }]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 18 }}>{user?.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 13 }}>{user?.workshop}</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: MONO, fontSize: 11 }}>{user?.email}</Text>
        </View>
      </View>

      {resetNotice ? <InlineNotice>{resetNotice}</InlineNotice> : null}

      {/* Language Selector Section */}
      <View style={{ marginTop: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={[styles.specLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>
          {t.selectLanguage.toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {languages.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => void setLanguage(l.code)}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: language === l.code ? colors.primary : colors.border,
                backgroundColor: language === l.code ? colors.accent : colors.card,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  color: language === l.code ? colors.primary : colors.foreground,
                }}
              >
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <SpecRow label="REGISTERED MACHINES" value={String(machines.length)} />
        <SpecRow label="SAVED OBSERVATIONS" value={String(observations.length)} />
        <SpecRow label="COMPLETED INSPECTIONS" value={String(maintenanceLogs.length)} />
        <SpecRow
          label="STORAGE MODE"
          value={isOfflineMode ? 'Local Persistent (Offline-First)' : 'Connected Backend API'}
        />
        <SpecRow
          label="MEMBER SINCE"
          value={user ? new Date(user.createdAtMs).toLocaleDateString() : '—'}
        />
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
        <ActionRow
          label="Guide, Architecture & Sensor Plan"
          detail="Official NIT Andhra Pradesh statement & BLE/MQTT sensor specs"
          onPress={() => router.push('/guide')}
        />
        <ActionRow
          label="Reset All Machine & History Data"
          detail="Clear local SQLite/AsyncStorage database and reset state"
          onPress={confirmResetData}
          danger
        />
        <ActionRow label={t.signOut} onPress={confirmSignOut} danger />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  avatar: { width: 60, height: 60, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarEdge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  specLabel: { fontFamily: MONO, fontSize: 11, letterSpacing: 0.8, fontWeight: '700' },
  specValue: { fontFamily: MONO, fontSize: 14, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, gap: 8 },
});
