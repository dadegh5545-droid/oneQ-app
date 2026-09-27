import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as NativeSplash from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

// The native launch screen shows this same image at the same size in the same place (app.json, imageWidth 172),
// so the hand-off from the native splash is seamless. An image, not text: text line boxes differ per platform.
const WORDMARK = require('../../../assets/splash-wordmark.png') as number;

// Play the animation once per cold start only (02 S01 mobile UX).
let played = false;

// The native splash stays up until the wordmark is on screen; the timer covers an image that never reports.
const hideNativeSplash = () => NativeSplash.hide();

// S01 — the wordmark from the native splash gains its underline, then Home (≤ 1.5 s).
export function SplashScreen() {
  const [line] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Home is already below this screen (initialRouteName), so return to it instead of stacking a second one.
    const goHome = () => router.dismissTo('/home');
    const fallback = setTimeout(hideNativeSplash, 1000);
    if (played) {
      goHome();
      return () => clearTimeout(fallback);
    }
    played = true;

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) return goHome();
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.delay(450),
      ]).start(({ finished }) => finished && goHome());
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [line]);

  return (
    <View style={styles.root} accessible accessibilityLabel="OneQ">
      <View style={styles.wordmark}>
        <Image source={WORDMARK} style={styles.wordmark} contentFit="contain" onDisplay={hideNativeSplash} />
        <Animated.View style={[styles.underline, { opacity: line, transform: [{ scaleX: line }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  // 172 × 61 pt: the 64 pt Playfair wordmark plus 1 pt of margin, exactly as the native splash draws it.
  wordmark: { width: 172, height: 61 },
  // Hangs below the wordmark without moving it off the centre the native splash uses.
  underline: { position: 'absolute', top: 66, left: 52, width: 68, height: 1, backgroundColor: 'rgba(247,240,234,0.7)' },
});
