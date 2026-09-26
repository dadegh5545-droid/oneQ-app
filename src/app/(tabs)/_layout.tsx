import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { currentLanguage } from '@/i18n';
import { arabicFonts, colors, fonts } from '@/theme';

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
  const labelFont = currentLanguage() === 'ar' ? arabicFonts.bodySemi : fonts.bodySemi;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontFamily: labelFont, fontSize: 12 },
        // 64 pt + safe area (03 §2); the default height clips Outfit labels.
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
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
