import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors } from '@/theme';

import { useFavorites, useIsFavorite } from './store';

type Props = {
  gymId: string;
  // overlay: translucent circle on photos; outlined: on cards.
  variant?: 'overlay' | 'outlined';
};

export function FavoriteButton({ gymId, variant = 'outlined' }: Props) {
  const { t } = useTranslation();
  const saved = useIsFavorite(gymId);
  const toggle = useFavorites((s) => s.toggle);
  const overlay = variant === 'overlay';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? t('common.removeFavorite') : t('common.addFavorite')}
      accessibilityState={{ selected: saved }}
      hitSlop={4}
      onPress={() => toggle(gymId)}
      style={[styles.circle, overlay ? styles.overlay : styles.outlined]}
    >
      <Icon
        name={saved ? 'heart' : 'heart-outline'}
        size={20}
        color={saved ? colors.primary : overlay ? colors.onPrimary : colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  overlay: { backgroundColor: colors.overlayDark },
  outlined: { borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
});
