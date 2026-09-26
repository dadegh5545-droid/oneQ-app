import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { isRTL } from '@/i18n';
import { colors } from '@/theme';

// Play the animation once per cold start only (02 S01 mobile UX).
let played = false;

// S01 — "One" fades in, "Q" + underline complete the wordmark, then Home (≤ 1.5 s).
export function SplashScreen() {
  const [one] = useState(() => new Animated.Value(0.4));
  const [q] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const goHome = () => router.replace('/home');
    if (played) return goHome();
    played = true;

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) return goHome();
      Animated.sequence([
        Animated.timing(one, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(q, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(500),
      ]).start(({ finished }) => finished && goHome());
    });
    return () => {
      cancelled = true;
    };
  }, [one, q]);

  return (
    <View style={styles.root} accessibilityLabel="OneQ">
      <View style={[styles.wordmark, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
        <Animated.View style={{ opacity: one }}>
          <AppText variant="displayXL" color={colors.background}>
            One
          </AppText>
        </Animated.View>
        <Animated.View style={{ opacity: q }}>
          <AppText variant="displayXL" color={colors.background}>
            Q
          </AppText>
        </Animated.View>
      </View>
      <Animated.View style={[styles.underline, { opacity: q }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  // The brand wordmark always reads left-to-right, even when the layout is RTL.
  wordmark: { flexDirection: 'row' },
  underline: { width: 68, height: 1, marginTop: 4, backgroundColor: 'rgba(247,240,234,0.7)' },
});
