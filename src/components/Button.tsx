import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

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
      {loading ? <ActivityIndicator size={20} color={textColor} /> : <AppText variant="label" color={textColor}>{label}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  // minHeight (not height) so larger system font sizes grow the button instead of clipping its label.
  primary: { minHeight: 52, backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  outlined: { minHeight: 52, borderWidth: 1, borderColor: colors.primary },
  text: { minHeight: 32, paddingHorizontal: space.sm, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
