import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, screenPadding } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  // Pushed screens get the top inset from the native header.
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

export function Screen({ children, scroll = false, edges = ['top'], contentStyle }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { paddingHorizontal: screenPadding, paddingVertical: screenPadding },
});
