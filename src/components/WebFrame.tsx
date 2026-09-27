import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme';

// The web keeps the phone layout: at most this wide, centred on tablets and desktops, instead of stretching
// the mobile cards across the screen. Matches the boot screen in public/index.html.
export const WEB_MAX_WIDTH = 480;

// Width available to a screen: the window on native and narrow browsers, the centred column on wide ones.
export function useScreenWidth() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, WEB_MAX_WIDTH) : width;
}

export function WebFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return children;
  const framed = width > WEB_MAX_WIDTH;
  return (
    <View style={styles.backdrop}>
      <View style={[styles.column, framed && styles.framed]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceVariant },
  column: { flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH, overflow: 'hidden', backgroundColor: colors.background },
  framed: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.outline, boxShadow: '0 0 32px rgba(35, 26, 24, 0.08)' },
});
