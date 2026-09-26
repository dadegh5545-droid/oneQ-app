import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/StateView';

// S21 — friendly fallback, never shows exception text.
export default function NotFoundRoute() {
  const { t } = useTranslation();
  return (
    <Screen contentStyle={styles.content}>
      <EmptyState
        icon="map-marker-question-outline"
        title={t('notFound.title')}
        body={t('notFound.body')}
        action={{ label: t('common.home'), onPress: () => router.replace('/home') }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
});
