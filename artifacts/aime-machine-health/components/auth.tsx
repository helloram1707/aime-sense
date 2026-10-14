import { router } from 'expo-router';
import React, { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { MONO } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

import { Image } from 'react-native';

/** Official AIME Sense logo icon. */
export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
      }}
      resizeMode="contain"
    />
  );
}

export function Wordmark() {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <BrandMark size={44} />
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ color: '#38BDF8', fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.5 }}>
            AIME
          </Text>
          <Text style={{ color: '#0D9488', fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.5 }}>
            Sense
          </Text>
        </View>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 }}>
          Affordable Machine Health Monitoring
        </Text>
      </View>
    </View>
  );
}

/** Plain, left-aligned page used by sign-in and sign-up. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const colors = useColors();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAwareScrollViewCompat
        bottomOffset={48}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 18 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wordmark />
          <Pressable onPress={goBack} accessibilityRole="button" hitSlop={10}>
            <Text style={{ color: colors.mutedForeground, fontFamily: MONO, fontSize: 12 }}>BACK</Text>
          </Pressable>
        </View>
        <View style={{ gap: 6, paddingTop: 22, paddingBottom: 6 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        {children}
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

export function AuthInput({
  label,
  secure = false,
  error,
  ...props
}: TextInputProps & {
  label: string;
  secure?: boolean;
  error?: string;
}) {
  const colors = useColors();
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.critical : focused ? colors.primary : colors.input,
            borderWidth: focused ? 2 : 1,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={hidden}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
          style={[styles.input, { color: colors.foreground }]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
          >
            <Text style={{ color: colors.primary, fontFamily: MONO, fontWeight: '700', fontSize: 11 }}>
              {hidden ? 'SHOW' : 'HIDE'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.critical }]}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, opacity: loading ? 0.6 : pressed ? 0.88 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
        {loading ? 'Please wait…' : label}
      </Text>
    </Pressable>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: colors.critical,
        backgroundColor: `${colors.critical}12`,
        padding: 12,
        borderRadius: 4,
      }}
    >
      <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.8, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  label: { fontSize: 10, letterSpacing: 0.8, fontFamily: MONO, fontWeight: '700', textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, borderRadius: 8, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 12 },
  error: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  button: { minHeight: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
