import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';

export type SummaryRow = { label: string; value: string | null | undefined };

type Props = {
  title?: string;
  rows: SummaryRow[];
  total?: { label: string; value: string };
};

// "Booking Summary" card (S11, S14, S17). Rows with no value are hidden.
export function SummaryCard({ title, rows, total }: Props) {
  return (
    <View style={styles.card}>
      {title ? <AppText variant="headline">{title}</AppText> : null}
      {rows
        .filter((r) => r.value)
        .map((r) => (
          <View key={r.label} style={styles.row}>
            <AppText color={colors.textSecondary}>{r.label}</AppText>
            <AppText variant="label" style={styles.value}>
              {r.value}
            </AppText>
          </View>
        ))}
      {total ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <AppText variant="label">{total.label}</AppText>
            <AppText variant="price" color={colors.primary}>
              {total.value}
            </AppText>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.xl, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg },
  value: { flexShrink: 1, fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.outline },
});
