import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, space } from '@/theme';

// S13 — UI only; validation and the sign-in action are wired in Phase 3.
export function SignInScreen() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

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
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
        />
        <TextField
          label={t('signIn.password')}
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="current-password"
          textContentType="password"
        />
        <Button variant="text" label={t('signIn.forgot')} onPress={() => router.push('/auth/forgot-password')} style={styles.forgot} />
      </View>
      <View style={styles.actions}>
        <Button label={t('signIn.submit')} onPress={() => {}} disabled />
        <Button variant="outlined" label={t('signIn.createAccount')} onPress={() => router.push('/auth/sign-up')} />
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
