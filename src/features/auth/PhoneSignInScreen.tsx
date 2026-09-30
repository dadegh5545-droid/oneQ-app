import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { repository } from '@/data';
import { RepositoryError } from '@/data/repository';
import { isValidQatarMobile } from '@/domain/validation';
import { finishAuth } from '@/features/booking/continueToCheckout';
import { ltr } from '@/i18n';
import { colors, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { startSession } from './session';

// Seconds before another code can be requested (each code is an SMS).
const RESEND_SECONDS = 30;

// Passwordless sign-in: Qatar mobile number → 6-digit SMS code (Cognito SMS_OTP). Accounts are still created
// with an email on the Create Account screen.
export function PhoneSignInScreen({ next }: { next?: string }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState<'send' | 'confirm' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const phoneError = submitted && step === 'phone' && !isValidQatarMobile(phone) ? t('validation.phone') : undefined;
  const codeError = submitted && step === 'code' && !/^\d{6}$/.test(code.trim()) ? t('validation.code') : undefined;

  const send = async () => {
    setSubmitted(true);
    setFormError(null);
    setNotFound(false);
    if (!isValidQatarMobile(phone) || loading || cooldown > 0) return;
    setLoading('send');
    try {
      const sent = await repository.startSmsSignIn(phone);
      setDestination(sent.destination);
      setCode('');
      setSubmitted(false);
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setNotFound(e instanceof RepositoryError && e.code === 'ACCOUNT_NOT_FOUND');
      setFormError(errorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const confirm = async () => {
    setSubmitted(true);
    setFormError(null);
    if (!/^\d{6}$/.test(code.trim()) || loading) return;
    setLoading('confirm');
    try {
      const account = await repository.confirmSmsSignIn(code);
      startSession(account);
      finishAuth(next);
    } catch (e) {
      setFormError(errorMessage(e));
      // An expired sign-in needs a new code; a wrong code can be corrected.
      if (e instanceof RepositoryError && e.code === 'CODE_EXPIRED') setCode('');
      setLoading(null);
    }
  };

  const changeNumber = () => {
    setStep('phone');
    setSubmitted(false);
    setFormError(null);
  };

  const errorText = formError ? (
    <AppText color={colors.error} accessibilityLiveRegion="polite">
      {formError}
    </AppText>
  ) : null;

  if (step === 'code') {
    return (
      <Screen scroll edges={['bottom']} contentStyle={styles.content}>
        <View style={styles.headings}>
          <AppText variant="titleL">{t('phoneSignIn.codeTitle')}</AppText>
          <AppText color={colors.textSecondary}>
            {destination ? t('phoneSignIn.codeBody', { destination: ltr(destination) }) : t('phoneSignIn.codeBodyGeneric')}
          </AppText>
        </View>
        <TextField
          label={t('phoneSignIn.code')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          error={codeError}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          returnKeyType="go"
          onSubmitEditing={confirm}
        />
        {errorText}
        <View style={styles.actions}>
          <Button label={t('signIn.submit')} onPress={confirm} loading={loading === 'confirm'} />
          <Button
            variant="text"
            label={cooldown > 0 ? t('phoneSignIn.resendIn', { seconds: cooldown }) : t('phoneSignIn.resend')}
            onPress={send}
            disabled={cooldown > 0}
            loading={loading === 'send'}
            style={styles.center}
          />
          <Button variant="text" label={t('phoneSignIn.changeNumber')} onPress={changeNumber} style={styles.center} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']} contentStyle={styles.content}>
      <View style={styles.headings}>
        <AppText variant="titleL">{t('phoneSignIn.title')}</AppText>
        <AppText color={colors.textSecondary}>{t('phoneSignIn.body')}</AppText>
      </View>
      <TextField
        label={t('phoneSignIn.phone')}
        prefix="+974"
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
        error={phoneError}
        keyboardType="phone-pad"
        maxLength={8}
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="go"
        onSubmitEditing={send}
      />
      {errorText}
      <View style={styles.actions}>
        <Button label={t('phoneSignIn.send')} onPress={send} loading={loading === 'send'} />
        {notFound ? (
          <Button
            variant="outlined"
            label={t('signIn.createAccount')}
            onPress={() => router.replace({ pathname: '/auth/sign-up', params: next ? { next } : {} })}
          />
        ) : null}
        <Button
          variant="text"
          label={t('phoneSignIn.usePassword')}
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
  actions: { gap: space.md },
  center: { alignSelf: 'center' },
});
