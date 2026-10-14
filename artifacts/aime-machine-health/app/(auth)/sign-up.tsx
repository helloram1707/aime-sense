import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthInput, AuthShell, ErrorBanner, PrimaryButton } from '@/components/auth';
import { MONO } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    const problem = await signUp({ name, email, workshop, password });
    setBusy(false);
    if (problem) setError(problem);
    // On success the root layout switches to the app automatically.
  };

  return (
    <AuthShell title="Create account" subtitle="Set up your workshop. It takes under a minute.">
      <ErrorBanner message={error} />
      <AuthInput
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="Ravi Kumar"
        textContentType="name"
        testID="signup-name"
      />
      <AuthInput
        label="Workshop or unit"
        value={workshop}
        onChangeText={setWorkshop}
        placeholder="Sri Sai Engineering Works"
        testID="signup-workshop"
      />
      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@workshop.com"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        testID="signup-email"
      />
      <AuthInput
        label="Password (6+ characters)"
        secure
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        textContentType="newPassword"
        testID="signup-password"
      />
      <AuthInput
        label="Confirm password"
        secure
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
        textContentType="newPassword"
        onSubmitEditing={submit}
        testID="signup-confirm"
      />
      <PrimaryButton label="Create account" onPress={submit} loading={busy} testID="signup-submit" />
      <Text style={{ color: colors.mutedForeground, fontFamily: MONO, fontSize: 10, letterSpacing: 1, textAlign: 'center' }}>
        PROTOTYPE · ACCOUNT STAYS ON THIS PHONE
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 }}>
          Already registered?
        </Text>
        <Pressable onPress={() => router.replace('/sign-in')} accessibilityRole="link">
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
