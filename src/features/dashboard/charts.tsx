import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { makeStyles, radius, space, useTheme } from '@/theme';

// Lightweight charts drawn with views (no chart library).

const pct = (n: number) => `${n}%` as const;

export function BarChart({ points, formatValue }: { points: { label: string; value: number }[]; formatValue: (n: number) => string }) {
  const { colors, sectionAccent } = useTheme();
  const styles = useStyles();
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <View style={styles.chart} accessibilityRole="image" accessibilityLabel={points.map((p) => `${p.label}: ${formatValue(p.value)}`).join(', ')}>
      <View style={styles.bars}>
        {points.map((p, i) => (
          <View key={i} style={styles.barColumn}>
            <AppText variant="bodyS" color={colors.textSecondary} lang="en" numberOfLines={1} style={styles.barValue}>
              {p.value ? formatValue(p.value) : ''}
            </AppText>
            <View style={[styles.bar, { height: pct(Math.max(2, (p.value / max) * 100)), backgroundColor: p.value ? sectionAccent.accent : colors.surfaceVariant }]} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {points.map((p, i) => (
          <AppText key={i} variant="bodyS" color={colors.textTertiary} numberOfLines={1} style={styles.label}>
            {p.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

export function DistributionList({ items, emptyText }: { items: { label: string; count: number }[]; emptyText: string }) {
  const { colors, sectionAccent } = useTheme();
  const styles = useStyles();
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return <AppText color={colors.textTertiary}>{emptyText}</AppText>;
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={styles.itemHead}>
            <AppText variant="label" style={styles.flex} numberOfLines={1}>
              {item.label}
            </AppText>
            <AppText color={colors.textSecondary} lang="en">{`${item.count} · ${Math.round((item.count / total) * 100)}%`}</AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: pct((item.count / total) * 100), backgroundColor: sectionAccent.accent }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function StarDistribution({ counts }: { counts: number[] }) {
  const { colors, sectionAccent } = useTheme();
  const styles = useStyles();
  const total = Math.max(1, counts.reduce((s, c) => s + c, 0));
  return (
    <View style={styles.list}>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = counts[star - 1] ?? 0;
        return (
          <View key={star} style={styles.starRow}>
            <AppText variant="label" lang="en" style={styles.starLabel}>{`${star}`}</AppText>
            <Icon name="star" size={14} color={colors.accent} />
            <View style={[styles.track, styles.flex]}>
              <View style={[styles.fill, { width: pct((count / total) * 100), backgroundColor: sectionAccent.accent }]} />
            </View>
            <AppText color={colors.textSecondary} lang="en" style={styles.starCount}>{`${count}`}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  chart: { gap: space.sm },
  bars: { height: 170, flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 2 },
  barValue: { fontSize: 10 },
  bar: { width: '70%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  labels: { flexDirection: 'row', gap: space.xs },
  label: { flex: 1, fontSize: 10, textAlign: 'center' },
  list: { gap: space.md },
  item: { gap: space.xs },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceVariant, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  starLabel: { width: 12 },
  starCount: { minWidth: 28, textAlign: 'right' },
}));
