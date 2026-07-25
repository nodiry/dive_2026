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
import { useLogin } from '@/hooks/useAuthMutations';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const { signIn } = useAuth();
  const mutation = useLogin();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    mutation.mutate(
      { identifier, password },
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
          {t('auth.login')}
        </Txt>
        <Txt variant="body" color="slate" style={styles.intro}>
          {t('auth.loginIntro')}
        </Txt>

        <View style={styles.fields}>
          <View style={styles.field}>
            <Txt variant="label">{t('auth.identifier')}</Txt>
            <Input
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>
          <View style={styles.field}>
            <Txt variant="label">{t('auth.password')}</Txt>
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
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
          label={mutation.isPending ? t('auth.loginPending') : t('auth.loginSubmit')}
          onPress={submit}
          loading={mutation.isPending}
          disabled={!identifier || !password}
          style={styles.submit}
        />

        <PressableScale onPress={() => router.replace('/signup')} style={styles.link}>
          <Txt variant="caption">
            {t('auth.noAccount')} <Txt style={styles.linkText}>{t('auth.signup')}</Txt>
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
