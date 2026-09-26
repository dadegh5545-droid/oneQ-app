import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { repository } from '@/data';
import type { Account } from '@/domain/models';
import { formatLocalPhone, hasErrors, validateSignUp } from '@/domain/validation';
import { finishAuth } from '@/features/booking/continueToCheckout';
import { ltr } from '@/i18n';
import { colors, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { startSession } from './session';

type Props = { next?: string; confirm?: string; destination?: string };
type Pending = { username: string; destination: string | null };

// Create Account (06 §4.1). Cognito emails a 6-digit code; step 2 confirms it.
export function SignUpScreen({ next, confirm, destination }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '', acceptTerms: false });
  const [pending, setPending] = useState<Pending | null>(confirm ? { username: confirm, destination: destination || null } : null);
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = submitted && !pending ? validateSignUp(values) : {};
  const codeError = submitted && pending && !/^\d{6}$/.test(code) ? t('validation.code') : undefined;
  const set = <K extends keyof typeof values>(key: K) => (v: (typeof values)[K]) => setValues((s) => ({ ...s, [key]: v }));

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

  const signedIn = (account: Account) => {
    startSession(account);
    finishAuth(next);
  };

  const onSubmit = () => {
    setSubmitted(true);
    setFormError(null);
    if (hasErrors(validateSignUp(values)) || loading) return;
    run(async () => {
      const result = await repository.signUp(values);
      if (result.status === 'signedIn') return signedIn(result.account);
      setSubmitted(false);
      setPending({ username: result.username, destination: result.destination });
    });
  };

  const onConfirm = () => {
    setSubmitted(true);
    setFormError(null);
    if (!pending || !/^\d{6}$/.test(code) || loading) return;
    run(async () => {
      const account = await repository.confirmSignUp(pending.username, code);
      if (account) return signedIn(account);
      // Confirmed from the Sign In path (no automatic sign-in): sign in again.
      toast(t('signUp.confirmed'));
      router.replace({ pathname: '/auth/sign-in', params: next ? { next } : {} });
    });
  };

  const onResend = () => {
    if (!pending || loading) return;
    run(async () => {
      await repository.resendSignUpCode(pending.username);
      toast(t('signUp.codeResent'));
    });
  };

  if (pending) {
    return (
      <Screen scroll edges={['bottom']} contentStyle={styles.content}>
        <View style={styles.headings}>
          <AppText variant="titleL">{t('signUp.confirmTitle')}</AppText>
          <AppText color={colors.textSecondary}>
            {pending.destination ? t('signUp.confirmBody', { destination: ltr(pending.destination) }) : t('signUp.confirmBodyGeneric')}
          </AppText>
        </View>
        <TextField
          label={t('signUp.code')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          error={codeError}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={onConfirm}
        />
        {formError ? (
          <AppText color={colors.error} accessibilityLiveRegion="polite">
            {formError}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <Button label={t('signUp.confirmSubmit')} onPress={onConfirm} loading={loading} />
          <Button variant="text" label={t('signUp.resend')} onPress={onResend} style={styles.center} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={styles.content}>
      <AppText variant="titleL">{t('signUp.title')}</AppText>
      <View style={styles.form}>
        <TextField
          label={t('signUp.fullName')}
          value={values.fullName}
          onChangeText={set('fullName')}
          error={errors.fullName && t(errors.fullName)}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={60}
        />
        <TextField
          label={t('signUp.email')}
          value={values.email}
          onChangeText={set('email')}
          error={errors.email && t(errors.email)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t('signUp.phone')}
          prefix="+974"
          value={values.phone}
          onChangeText={(v) => set('phone')(formatLocalPhone(v))}
          error={errors.phone && t(errors.phone)}
          placeholder={t('guest.phoneHint')}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={9}
        />
        <TextField
          label={t('signUp.password')}
          value={values.password}
          onChangeText={set('password')}
          error={errors.password && t(errors.password)}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label={t('signUp.confirm')}
          value={values.confirm}
          onChangeText={set('confirm')}
          error={errors.confirm && t(errors.confirm)}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.acceptTerms }}
          onPress={() => set('acceptTerms')(!values.acceptTerms)}
          style={styles.terms}
        >
          <Icon
            name={values.acceptTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={values.acceptTerms ? colors.primary : errors.acceptTerms ? colors.error : colors.textSecondary}
          />
          <AppText style={styles.flex}>{t('signUp.terms')}</AppText>
        </Pressable>
        {errors.acceptTerms ? <AppText variant="bodyS" color={colors.error}>{t(errors.acceptTerms)}</AppText> : null}
      </View>
      {formError ? (
        <AppText color={colors.error} accessibilityLiveRegion="polite">
          {formError}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label={t('signUp.submit')} onPress={onSubmit} loading={loading} />
        <Button
          variant="text"
          label={t('signUp.haveAccount')}
          onPress={() => router.replace({ pathname: '/auth/sign-in', params: next ? { next } : {} })}
          style={styles.center}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  headings: { gap: space.sm },
  form: { gap: space.lg },
  terms: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  flex: { flex: 1 },
  actions: { gap: space.md },
  center: { alignSelf: 'center' },
});
