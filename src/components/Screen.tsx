import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, screenPadding, space } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  // Pushed screens get the top inset from the native header.
  edges?: Edge[];
  contentStyle?: ViewStyle;
  // Sticky bottom CTA bar (07 §8).
  footer?: ReactNode;
};

export function Screen({ children, scroll = false, edges = ['top'], contentStyle, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { paddingHorizontal: screenPadding, paddingVertical: screenPadding },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: space.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },
});
