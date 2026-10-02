import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';

import { makeStyles, radius, space, useTheme } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'outlined' | 'text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

// PrimaryButton / OutlinedButton / TextButton from 07 §4.
export function Button({ label, onPress, variant = 'primary', disabled, loading, accessibilityLabel, style }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const inactive = disabled || loading;
  const textColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={variant === 'text' ? 6 : undefined}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === 'primary' && pressed && styles.primaryPressed,
        variant !== 'primary' && pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size={20} color={textColor} /> : <AppText variant="label" color={textColor} style={styles.label}>{label}</AppText>}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  // Horizontal padding and centred lines keep a label that wraps at large text sizes off the rounded edges.
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: space.lg },
  label: { textAlign: 'center' },
  // minHeight (not height) so larger system font sizes grow the button instead of clipping its label.
  primary: { minHeight: 52, backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  outlined: { minHeight: 52, borderWidth: 1, borderColor: colors.primary },
  text: { minHeight: 32, paddingHorizontal: space.sm, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
}));
