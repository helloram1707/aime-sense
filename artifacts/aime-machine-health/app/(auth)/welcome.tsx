import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, Wordmark } from '@/components/auth';
import { MONO } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/src/i18n/I18nContext';
import type { SupportedLanguage } from '@/src/i18n/translations';

export default function WelcomeScreen() {
  const colors = useColors();
  const { t, language, setLanguage } = useI18n();
  const { enterDemoMode } = useAuth();

  const points = [
    {
      n: '01',
      title: 'Uses the phone you already have',
      detail: 'The accelerometer is the sensor. Zero initial hardware expense.',
    },
    {
      n: '02',
      title: 'Validates every window rigorously',
      detail: 'Invalid, missing, or irregular samples are flagged. Never zero-filled.',
    },
    {
      n: '03',
      title: 'Explainable maintenance priorities',
      detail: 'Transparent threshold ratios, downtime cost estimator, and shop-floor checklists.',
    },
  ];

  const languages: Array<{ code: SupportedLanguage; label: string }> = [
    { code: 'en', label: 'EN' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Top Header with Wordmark and Language Switcher */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark />
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

      <View style={{ gap: 12 }}>
        <View style={[styles.challengeBadge, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Text style={[styles.challengeText, { color: colors.primary }]}>
            {t.problemStatementBadge}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {t.welcomeTitle}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {t.welcomeSubtitle}
        </Text>

        <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
          {points.map((p) => (
            <View key={p.n} style={[styles.point, { borderBottomColor: colors.border }]}>
              <Text style={[styles.num, { color: colors.primary }]}>{p.n}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.pointTitle, { color: colors.foreground }]}>{p.title}</Text>
                <Text style={[styles.pointDetail, { color: colors.mutedForeground }]}>{p.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <PrimaryButton
          label={t.createAccount}
          onPress={() => router.push('/sign-up')}
          testID="welcome-create-account"
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sign-in')}
          style={{ alignItems: 'center', paddingVertical: 6 }}
          testID="welcome-sign-in"
        >
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            {t.signIn}
          </Text>
        </Pressable>

        {/* Clearly labeled demo access */}
        <Pressable
          accessibilityRole="button"
          onPress={() => enterDemoMode()}
          style={[styles.demoBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          testID="welcome-demo-mode"
        >
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
            {t.demoMode}
          </Text>
        </Pressable>

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          OFFLINE-FIRST · LOCAL SECURE STORAGE · REST API READY
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, justifyContent: 'space-between' },
  challengeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  challengeText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: { fontSize: 32, lineHeight: 36, letterSpacing: -1, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  point: { flexDirection: 'row', gap: 14, paddingVertical: 10, borderBottomWidth: 1 },
  num: { fontFamily: MONO, fontWeight: '700', fontSize: 13, paddingTop: 2 },
  pointTitle: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  pointDetail: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  demoBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.8, textAlign: 'center', marginTop: 2 },
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
});
