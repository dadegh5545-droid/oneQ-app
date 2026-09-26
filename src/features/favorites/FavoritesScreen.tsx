import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useGyms } from '@/data';
import { GymListCard } from '@/features/gyms/GymListCard';
import { colors, space } from '@/theme';

import { useFavoriteIds } from './store';

// S18
export function FavoritesScreen() {
  const { t } = useTranslation();
  const ids = useFavoriteIds();
  const gyms = useGyms();

  const renderList = () => {
    if (gyms.isPending) return <LoadingState />;
    if (gyms.isError) return <EmptyState icon="alert-circle-outline" title={t('favorites.errorTitle')} />;
    const saved = gyms.data.filter((g) => ids.includes(g.id));
    if (saved.length === 0) {
      return (
        <EmptyState
          icon="heart-outline"
          title={t('favorites.emptyTitle')}
          body={t('favorites.emptyBody')}
          action={{ label: t('common.browseGyms'), onPress: () => router.navigate('/home') }}
        />
      );
    }
    return saved.map((g) => <GymListCard key={g.id} gym={g} />);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.headings}>
        <AppText variant="titleL">{t('favorites.title')}</AppText>
        <AppText color={colors.textSecondary}>{t('favorites.subtitle')}</AppText>
      </View>
      {renderList()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  headings: { gap: space.xs },
});
