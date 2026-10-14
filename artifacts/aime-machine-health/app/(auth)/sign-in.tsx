import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthInput, AuthShell, ErrorBanner, PrimaryButton } from '@/components/auth';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SignInScreen() {
  const colors = useColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    const problem = await signIn(email, password);
    setBusy(false);
    if (problem) setError(problem);
    // On success the root layout switches to the app automatically.
  };

  return (
    <AuthShell title="Sign in" subtitle="Open your workshop's machines and history.">
      <ErrorBanner message={error} />
      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@workshop.com"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        testID="signin-email"
      />
      <AuthInput
        label="Password"
        secure
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        textContentType="password"
        onSubmitEditing={submit}
        testID="signin-password"
      />
      <PrimaryButton label="Sign in" onPress={submit} loading={busy} testID="signin-submit" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 }}>
          No account yet?
        </Text>
        <Pressable onPress={() => router.replace('/sign-up')} accessibilityRole="link">
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Create one</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
