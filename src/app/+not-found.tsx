import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { colors, space } from '@/theme';

// S21 — friendly fallback, never shows exception text.
export default function NotFoundRoute() {
  const { t } = useTranslation();
  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="titleM">{t('notFound.title')}</AppText>
      <AppText color={colors.textSecondary}>{t('notFound.body')}</AppText>
      <Button variant="text" label={t('common.home')} onPress={() => router.replace('/home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: space.md },
});
