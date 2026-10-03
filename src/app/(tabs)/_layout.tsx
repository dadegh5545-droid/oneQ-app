import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { currentLanguage } from '@/i18n';
import { colors, useTheme } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// 03-NAVIGATION §2
const TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'home', label: 'tabs.home', icon: 'home-outline', iconActive: 'home' },
  { name: 'bookings', label: 'tabs.bookings', icon: 'calendar-blank-outline', iconActive: 'calendar-blank' },
  { name: 'favorites', label: 'tabs.favorites', icon: 'heart-outline', iconActive: 'heart' },
  { name: 'profile', label: 'tabs.profile', icon: 'account-outline', iconActive: 'account' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { arabicFonts, fonts } = useTheme();
  const labelFont = currentLanguage() === 'ar' ? arabicFonts.bodySemi : fonts.bodySemi;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Android resizes the window for the keyboard; without this the tab bar rides up above it (Home search).
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        // lineHeight keeps descenders (g, y, Arabic tails) inside the label box instead of clipping them.
        tabBarLabelStyle: { fontFamily: labelFont, fontSize: 12, lineHeight: 18 },
        // 64 pt + safe area (03 §2). Each item already pads 5 pt around its 28 pt icon box, so the bar keeps its
        // own padding small; 6 pt left the label only 13 pt and cut the glyphs.
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 3,
          paddingBottom: insets.bottom + 3,
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          borderTopWidth: 1,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            tabBarIcon: ({ focused, color, size }) => (
              <MaterialCommunityIcons name={focused ? tab.iconActive : tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
