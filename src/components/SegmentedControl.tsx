import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <AppText variant="label" color={selected ? colors.primary : colors.textSecondary} style={styles.label}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', minHeight: 41, padding: space.xs, borderRadius: 14, backgroundColor: colors.surfaceVariant },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  selected: { backgroundColor: colors.surface },
  label: { fontSize: 15 },
});
