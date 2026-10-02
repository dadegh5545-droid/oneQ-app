import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { rating as fmtRating } from '@/utils/format';
import { space, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = { rating: number; reviewCount?: number };

// "4.9 ★ · 128 reviews" (07 §4.9)
export function RatingInline({ rating, reviewCount }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <AppText variant="label" style={styles.value}>
        {fmtRating(rating)}
      </AppText>
      <Icon name="star" size={14} color={colors.accent} />
      {reviewCount != null ? (
        <AppText variant="bodyS" color={colors.textSecondary}>
          · {t('common.reviewsCount', { count: reviewCount })}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  value: { fontSize: 13, lineHeight: 17 },
});
