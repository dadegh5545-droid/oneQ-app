import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { repository } from '@/data';
import { hasErrors, validateReset } from '@/domain/validation';
import { colors, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

// Forgot password (06 §4.2): step 1 identifier → code; step 2 code + new password.
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [reset, setReset] = useState({ code: '', password: '', confirm: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const identifierError = submitted && step === 1 && !identifier.trim() ? t('validation.identifier') : undefined;
  const errors = submitted && step === 2 ? validateReset(reset) : {};
  const set = (key: keyof typeof reset) => (v: string) => setReset((s) => ({ ...s, [key]: v }));

  const run = async (action: () => Promise<void>) => {
    setFormError(null);
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onSend = () => {
    setSubmitted(true);
    if (!identifier.trim() || loading) return;
    run(async () => {
      const { demoCode } = await repository.requestPasswordReset(identifier);
      if (demoCode) toast(t('forgot.demoCode', { code: demoCode }));
      setSubmitted(false);
      setStep(2);
    });
  };

  const onReset = () => {
    setSubmitted(true);
    if (hasErrors(validateReset(reset)) || loading) return;
    run(async () => {
      await repository.confirmPasswordReset(identifier, reset.code, reset.password);
      toast(t('forgot.success'));
      router.back();
    });
  };

  return (
    <Screen scroll edges={['bottom']} contentStyle={styles.content}>
      <View style={styles.headings}>
        <AppText variant="titleL">{t('forgot.title')}</AppText>
        {step === 1 ? <AppText color={colors.textSecondary}>{t('forgot.body')}</AppText> : null}
      </View>
      {step === 1 ? (
        <TextField
          label={t('forgot.identifier')}
          value={identifier}
          onChangeText={setIdentifier}
          error={identifierError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
        />
      ) : (
        <View style={styles.form}>
          <TextField
            label={t('forgot.code')}
            value={reset.code}
            onChangeText={(v) => set('code')(v.replace(/\D/g, ''))}
            error={errors.code && t(errors.code)}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          <TextField
            label={t('forgot.newPassword')}
            value={reset.password}
            onChangeText={set('password')}
            error={errors.password && t(errors.password)}
            password
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label={t('forgot.confirm')}
            value={reset.confirm}
            onChangeText={set('confirm')}
            error={errors.confirm && t(errors.confirm)}
            password
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </View>
      )}
      {formError ? (
        <AppText color={colors.error} accessibilityLiveRegion="polite">
          {formError}
        </AppText>
      ) : null}
      <Button label={step === 1 ? t('forgot.send') : t('forgot.submit')} onPress={step === 1 ? onSend : onReset} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  headings: { gap: space.sm },
  form: { gap: space.lg },
});
