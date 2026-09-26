import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { repository } from '@/data';
import { hasErrors, validateSignIn } from '@/domain/validation';
import { finishAuth } from '@/features/booking/continueToCheckout';
import { colors, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { startSession } from './session';

// S13 — Cognito sign-in with an email or a Qatar mobile number.
export function SignInScreen({ next }: { next?: string }) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const values = { identifier, password };
  const errors = submitted ? validateSignIn(values) : {};

  const onSubmit = async () => {
    setSubmitted(true);
    setFormError(null);
    if (hasErrors(validateSignIn(values)) || loading) return;
    setLoading(true);
    try {
      const result = await repository.signIn(identifier, password);
      setLoading(false);
      if (result.status === 'confirm') {
        // Email not confirmed yet: a new code was sent; enter it on the Create Account screen.
        const params = { confirm: result.username, destination: result.destination ?? '', ...(next ? { next } : {}) };
        router.replace({ pathname: '/auth/sign-up', params });
        return;
      }
      startSession(result.account);
      finishAuth(next);
    } catch (e) {
      setFormError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} contentStyle={styles.content}>
      <View style={styles.headings}>
        <AppText variant="titleL">{t('signIn.title')}</AppText>
        <AppText color={colors.textSecondary}>{t('signIn.body')}</AppText>
      </View>
      <View style={styles.form}>
        <TextField
          label={t('signIn.identifier')}
          value={identifier}
          onChangeText={setIdentifier}
          error={errors.identifier && t(errors.identifier)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label={t('signIn.password')}
          value={password}
          onChangeText={setPassword}
          error={errors.password && t(errors.password)}
          password
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <Button variant="text" label={t('signIn.forgot')} onPress={() => router.push('/auth/forgot-password')} style={styles.forgot} />
      </View>
      {formError ? (
        <AppText color={colors.error} accessibilityLiveRegion="polite">
          {formError}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label={t('signIn.submit')} onPress={onSubmit} loading={loading} />
        <Button
          variant="outlined"
          label={t('signIn.createAccount')}
          onPress={() => router.replace({ pathname: '/auth/sign-up', params: next ? { next } : {} })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  headings: { gap: space.sm },
  form: { gap: space.lg },
  forgot: { alignSelf: 'flex-end' },
  actions: { gap: space.md },
});
