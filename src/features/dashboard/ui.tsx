import type { ReactNode } from 'react';
import { Pressable, ScrollView, Switch, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { makeStyles, radius, space, useTheme } from '@/theme';

// Building blocks of the facility and admin dashboards: white cards with large corners on the cream background,
// large numbers, section-colour accents. Every colour comes from the theme.

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="titleL">{title}</AppText>
        {subtitle ? <AppText color={colors.textSecondary}>{subtitle}</AppText> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Panel({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  const styles = useStyles();
  return (
    <View style={[styles.panel, style]}>
      {title || action ? (
        <View style={styles.panelHead}>
          {title ? (
            <AppText variant="headline" style={styles.flex}>
              {title}
            </AppText>
          ) : (
            <View style={styles.flex} />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// Responsive grid: as many columns of at least `min` points as fit.
export function Grid({ children, min = 220 }: { children: ReactNode; min?: number }) {
  const styles = useStyles();
  return <View style={styles.grid}>{Array.isArray(children) ? children.map((c, i) => <View key={i} style={[styles.cell, { minWidth: min }]}>{c}</View>) : <View style={[styles.cell, { minWidth: min }]}>{children}</View>}</View>;
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: IconName }) {
  const { colors, sectionAccent } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: sectionAccent.accentSoft }]}>
        <Icon name={icon} size={20} color={sectionAccent.accentInk} />
      </View>
      <AppText color={colors.textSecondary}>{label}</AppText>
      <AppText variant="displayL" lang="en" style={styles.statValue}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="bodyS" color={colors.textTertiary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, sectionAccent } = useTheme();
  const styles = useStyles();
  const palette: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: colors.successTint, fg: colors.success },
    warning: { bg: colors.primaryTint, fg: colors.accent },
    danger: { bg: colors.primaryTint, fg: colors.error },
    neutral: { bg: colors.surfaceVariant, fg: colors.textSecondary },
    accent: { bg: sectionAccent.accentSoft, fg: sectionAccent.accentInk },
  };
  const p = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]}>
      <AppText variant="bodyS" color={p.fg} style={styles.badgeText}>
        {label}
      </AppText>
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <AppText variant="label">{label}</AppText>
        {hint ? (
          <AppText variant="bodyS" color={colors.textSecondary}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.outline }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export function EmptyRow({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <AppText color={colors.textTertiary} style={styles.empty}>
      {text}
    </AppText>
  );
}

// One-line list row: start text, optional middle and end content.
export function ListRow({ title, subtitle, end, onPress }: { title: string; subtitle?: string; end?: ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const body = (
    <>
      <View style={styles.flex}>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodyS" color={colors.textSecondary} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {end}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.row}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

// Horizontal chips that scroll on narrow screens.
export function ChipRow({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {children}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  headerText: { gap: space.xs, flexShrink: 1 },
  headerRight: { minWidth: 280, flexGrow: 0 },
  panel: { gap: space.md, padding: space.xl, borderRadius: 24, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  cell: { flexGrow: 1, flexBasis: 0 },
  stat: { gap: space.xs, padding: space.xl, borderRadius: 24, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  statIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  statValue: { marginTop: space.xs },
  badge: { alignSelf: 'flex-start', paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { fontSize: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  empty: { paddingVertical: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  chips: { gap: space.sm, paddingVertical: space.xs },
}));
