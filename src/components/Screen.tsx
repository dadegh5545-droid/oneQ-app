import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
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
  const host = useRef<View>(null);
  const [top, setTop] = useState(0);
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {/* iOS does not resize for the keyboard, so pad the content and sticky footer above it; Android resizes the window.
          KeyboardAvoidingView measures itself against its parent, so it is offset by the parent's window position (the header). */}
      <View ref={host} style={styles.fill} onLayout={() => host.current?.measureInWindow((_x, y) => setTop(y))}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={top}>
          {scroll ? (
            <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
          )}
          {footer ? <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </View>
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
