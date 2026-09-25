import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Review } from '@/domain/models';
import { rating, shortDate } from '@/utils/format';
import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export function ReviewCard({ review }: { review: Review }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="label" style={styles.author}>
          {review.authorName}
        </AppText>
        <View style={styles.badge}>
          <AppText variant="bodyS" color={colors.success}>
            {t('common.verified')}
          </AppText>
        </View>
      </View>
      <View style={styles.stars} accessibilityLabel={`${rating(review.rating)} / 5`}>
        <AppText variant="label" style={styles.value}>
          {rating(review.rating)}
        </AppText>
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name={i <= review.rating ? 'star' : 'star-outline'} size={14} color={colors.accent} />
        ))}
      </View>
      <AppText variant="bodyM">{review.text}</AppText>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {shortDate(review.date)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  author: { flexShrink: 1 },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.successTint },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { fontSize: 13, marginEnd: space.xs },
});
