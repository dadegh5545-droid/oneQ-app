import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

type Props = {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  // radio: single-choice semantics (plans, payment, continue options); button: navigation cards.
  role?: 'radio' | 'button';
  style?: ViewStyle;
};

// Base for plan cards, radio option cards, payment rows and path cards (07 §4).
export function SelectableCard({ selected, onPress, children, accessibilityLabel, role = 'radio', style }: Props) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: selected } : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, borderWidth: 1.4, backgroundColor: colors.primaryTint },
  pressed: { opacity: 0.85 },
});
