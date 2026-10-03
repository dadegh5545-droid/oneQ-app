import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { makeStyles, space, useTheme } from '@/theme';

export type Column<T> = { key: string; title: string; width: number; render: (row: T) => ReactNode };

// A table that scrolls sideways on narrow screens; columns follow the reading direction.
export function DataTable<T>({ columns, rows, keyOf, onRowPress, emptyText }: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  onRowPress?: (row: T) => void;
  emptyText: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const cell = (content: ReactNode, width: number, key: string) => (
    <View key={key} style={[styles.cell, { width }]}>
      {typeof content === 'string' || typeof content === 'number' ? (
        <AppText numberOfLines={2} style={styles.cellText}>
          {String(content)}
        </AppText>
      ) : (
        content
      )}
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scroll}>
      <View style={styles.table}>
        <View style={[styles.row, styles.headRow]}>
          {columns.map((c) => (
            <View key={c.key} style={[styles.cell, { width: c.width }]}>
              <AppText variant="bodyS" color={colors.textSecondary}>
                {c.title}
              </AppText>
            </View>
          ))}
        </View>
        {rows.length === 0 ? (
          <AppText color={colors.textTertiary} style={styles.empty}>
            {emptyText}
          </AppText>
        ) : (
          rows.map((row) =>
            onRowPress ? (
              <Pressable key={keyOf(row)} accessibilityRole="button" onPress={() => onRowPress(row)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                {columns.map((c) => cell(c.render(row), c.width, c.key))}
              </Pressable>
            ) : (
              <View key={keyOf(row)} style={styles.row}>
                {columns.map((c) => cell(c.render(row), c.width, c.key))}
              </View>
            ),
          )
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  scroll: { flexGrow: 1 },
  table: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant, minHeight: 48 },
  headRow: { minHeight: 36 },
  cell: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  cellText: { fontSize: 14 },
  empty: { padding: space.lg },
  pressed: { backgroundColor: colors.surfaceVariant },
}));
