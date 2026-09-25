import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RatingInline } from '@/components/RatingInline';
import { gymLocation, type Gym } from '@/domain/models';
import { useDraft } from '@/features/booking/draftStore';
import { FavoriteButton } from '@/features/favorites/FavoriteButton';
import { colors, radius, space } from '@/theme';
import { rating } from '@/utils/format';

export const openGym = (gym: Gym) => {
  useDraft.getState().startWithGym(gym);
  router.push({ pathname: '/gym/[id]', params: { id: gym.id } });
};

// Gym list card (S03, S04, S06, S18)
export function GymListCard({ gym }: { gym: Gym }) {
  const { t } = useTranslation();
  const a11y = `${gym.name}, ${gymLocation(gym)}, ${rating(gym.rating)}, ${t('common.reviewsCount', { count: gym.reviewCount })}`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={() => openGym(gym)} style={styles.card}>
      <FavoriteButton gymId={gym.id} />
      <View style={styles.body}>
        <AppText variant="headline" numberOfLines={1}>
          {gym.name}
        </AppText>
        <AppText color={colors.textSecondary} numberOfLines={1}>
          {gymLocation(gym)}
        </AppText>
        <RatingInline rating={gym.rating} reviewCount={gym.reviewCount} />
      </View>
      <Image source={gym.images[0]} style={styles.image} contentFit="cover" transition={150} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 114,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, gap: space.xs },
  image: { width: 80, height: 80, borderRadius: radius.sm, backgroundColor: colors.surfaceVariant },
});
