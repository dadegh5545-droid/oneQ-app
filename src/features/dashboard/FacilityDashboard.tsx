import { router, Slot, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import type { SectionInfo } from '@/data/amplify/dashboardRepository';
import type { FacilitySummary } from '@/domain/dashboard';
import { useSession } from '@/features/auth/sessionStore';
import { defaultTheme, sectionPalette, ThemeProvider, useTheme, type SectionColorKey } from '@/theme';

import { DashboardShell } from './DashboardShell';
import { useDashFacility, useDashSections, useMyFacilities } from './hooks';
import { menuFor } from './menu';

type FacilityDashboardValue = { facility: FacilitySummary; section: SectionInfo | null };

const FacilityContext = createContext<FacilityDashboardValue | null>(null);

// The facility shown by the current dashboard route (inside FacilityDashboardLayout).
export function useCurrentFacility() {
  const value = useContext(FacilityContext);
  if (!value) throw new Error('useCurrentFacility outside FacilityDashboardLayout');
  return value;
}

// Section names and labels are stored in Arabic (required) and English (optional, falls back to Arabic).
export const localized = (ar: string, en: string | null | undefined, isRTL: boolean) => (isRTL ? ar : en || ar);

// Shell + menu of one facility; the section's colour accents the dashboard (theme.sectionAccent).
export function FacilityDashboardLayout({ facilityId }: { facilityId: string }) {
  const { t } = useTranslation();
  const { isRTL } = useTheme();
  const isAdmin = useSession((s) => s.user?.isAdmin === true);
  const facility = useDashFacility(facilityId);
  const sections = useDashSections();
  const facilities = useMyFacilities();
  const pathname = usePathname();
  const section = sections.data?.find((s) => s.slug === facility.data?.sectionId) ?? null;
  const theme = useMemo(() => {
    const key = (section?.colorKey ?? 'burgundy') as SectionColorKey;
    return { ...defaultTheme, sectionAccent: sectionPalette[key] ?? sectionPalette.burgundy };
  }, [section?.colorKey]);

  if (facility.isPending || sections.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!facility.data) {
    return (
      <Screen>
        <EmptyState
          icon="store-remove-outline"
          title={t('dashboard.notFound')}
          action={{ label: t('dashboard.shell.myFacilities'), onPress: () => router.navigate('/dashboard' as Href) }}
        />
      </Screen>
    );
  }

  const base = `/dashboard/${facilityId}`;
  const items = menuFor(section?.presetType ?? 'gym').map((item) => ({
    key: item.key,
    icon: item.icon,
    label: t(item.label),
    href: (item.path ? `${base}/${item.path}` : base) as Href,
  }));
  const segment = pathname.slice(base.length).split('/').filter(Boolean)[0] ?? '';
  const activeKey = items.find((i) => (segment === '' ? i.key === 'overview' : String(i.href).endsWith(`/${segment}`)))?.key ?? 'overview';
  const canSwitch = isAdmin || (facilities.data?.length ?? 0) > 1;

  return (
    <ThemeProvider theme={theme}>
      <FacilityContext.Provider value={{ facility: facility.data, section }}>
        <DashboardShell
          title={facility.data.name}
          subtitle={section ? localized(section.nameAr, section.nameEn, isRTL) : undefined}
          items={items}
          activeKey={activeKey}
          switchHref={canSwitch ? ('/dashboard' as Href) : undefined}
        >
          <Slot />
        </DashboardShell>
      </FacilityContext.Provider>
    </ThemeProvider>
  );
}
