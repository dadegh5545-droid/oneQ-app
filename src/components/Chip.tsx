import { Pressable } from 'react-native';

import { makeStyles, radius, space, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
};

// Category/filter chip (07 §4.6). Without onPress it renders as a static tag.
export function Chip({ label, selected = false, icon, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fg = selected ? colors.onPrimary : colors.textPrimary;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      hitSlop={4}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? fg : colors.primary} /> : null}
      <AppText variant="label" color={fg} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  chip: {
    minHeight: 37,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    borderWidth: 1,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unselected: { backgroundColor: colors.surface, borderColor: colors.outline },
  label: { fontSize: 14 },
}));
