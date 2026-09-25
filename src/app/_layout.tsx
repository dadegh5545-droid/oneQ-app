import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { currentLanguage, initI18n } from '@/i18n';
import { arabicFonts, colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  const ready = i18nReady && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootStack />
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { t } = useTranslation();
  const titleFont = currentLanguage() === 'ar' ? arabicFonts.bodySemi : fonts.bodySemi;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: titleFont, fontSize: 18 },
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: t('common.back'),
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="gym/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="gym/[id]/plans" options={{ title: t('screens.plans') }} />
      <Stack.Screen name="gym/[id]/trainers" options={{ title: t('screens.trainers') }} />
      <Stack.Screen name="trainer/[id]" options={{ title: '' }} />
      <Stack.Screen name="booking/index" options={{ title: t('screens.booking') }} />
      <Stack.Screen name="checkout/guest" options={{ title: '' }} />
      <Stack.Screen name="checkout/index" options={{ title: t('screens.checkout') }} />
      <Stack.Screen
        name="checkout/success/[id]"
        options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="bookings/[id]" options={{ title: t('screens.bookingDetails') }} />
      <Stack.Screen name="auth/sign-in" options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen name="auth/sign-up" options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen name="auth/forgot-password" options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen name="info/[slug]" options={{ title: '' }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}
