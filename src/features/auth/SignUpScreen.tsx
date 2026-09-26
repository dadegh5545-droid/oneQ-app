import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { repository } from '@/data';
import { formatLocalPhone, hasErrors, validateSignUp } from '@/domain/validation';
import { finishAuth } from '@/features/booking/continueToCheckout';
import { colors, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { useSession } from './sessionStore';

// Create Account (06 §4.1) — new in the rebuild; OTP verification arrives with Cognito in Phase 4.
export function SignUpScreen({ next }: { next?: string }) {
  const { t } = useTranslation();
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '', acceptTerms: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = submitted ? validateSignUp(values) : {};
  const set = <K extends keyof typeof values>(key: K) => (v: (typeof values)[K]) => setValues((s) => ({ ...s, [key]: v }));

  const onSubmit = async () => {
    setSubmitted(true);
    setFormError(null);
    if (hasErrors(validateSignUp(values)) || loading) return;
    setLoading(true);
    try {
      const account = await repository.signUp(values);
      useSession.getState().signIn(account);
      finishAuth(next);
    } catch (e) {
      setFormError(errorMessage(e));
      setLoading(false);
    }
  };

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
  form: { gap: space.lg },
  terms: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  flex: { flex: 1 },
  actions: { gap: space.md },
  center: { alignSelf: 'center' },
});
