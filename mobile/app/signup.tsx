import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui/controls';
import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useSignup } from '@/hooks/useAuthMutations';

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const { signIn } = useAuth();
  const mutation = useSignup();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    mutation.mutate(
      { username, email, password },
      {
        onSuccess: (data) => {
          signIn(data.token, data.user);
          goBack();
        },
        onError: (mutationError: Error) => setError(mutationError.message),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <PressableScale onPress={goBack} hitSlop={10}>
          <Ionicons name="close" size={24} color={Colors.slate} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Txt variant="eyebrow">{t('brand')}</Txt>
        <Txt variant="title" style={styles.title}>
          {t('auth.signup')}
        </Txt>
        <Txt variant="body" color="slate" style={styles.intro}>
          {t('auth.signupIntro')}
        </Txt>

        <View style={styles.fields}>
          <View style={styles.field}>
            <Txt variant="label">{t('auth.username')}</Txt>
            <Input value={username} onChangeText={setUsername} autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Txt variant="label">{t('auth.email')}</Txt>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.field}>
            <Txt variant="label">{t('auth.password')}</Txt>
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={submit}
            />
          </View>
        </View>

        {error ? (
          <Txt variant="caption" style={styles.error}>
            {error}
          </Txt>
        ) : null}

        <Button
          label={mutation.isPending ? t('auth.signupPending') : t('auth.signupSubmit')}
          onPress={submit}
          loading={mutation.isPending}
          disabled={!username || !email || password.length < 8}
          style={styles.submit}
        />

        <PressableScale onPress={() => router.replace('/login')} style={styles.link}>
          <Txt variant="caption">
            {t('auth.hasAccount')} <Txt style={styles.linkText}>{t('auth.login')}</Txt>
          </Txt>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, alignItems: 'flex-end' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { marginTop: Spacing.sm },
  intro: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  fields: { marginTop: Spacing.xl, gap: Spacing.lg },
  field: { gap: 6 },
  error: { color: Colors.violetDark, marginTop: Spacing.md },
  submit: { marginTop: Spacing.xl },
  link: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  linkText: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.violetDark },
});
