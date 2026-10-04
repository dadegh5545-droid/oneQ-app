import { router, Slot, usePathname, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/StateView';
import { useSession } from '@/features/auth/sessionStore';
import { DashboardShell } from '@/features/dashboard/DashboardShell';

const ITEMS: { key: string; path: string; icon: IconName }[] = [
  { key: 'overview', path: '', icon: 'view-dashboard-outline' },
  { key: 'sections', path: 'sections', icon: 'shape-outline' },
  { key: 'facilities', path: 'facilities', icon: 'store-outline' },
  { key: 'requests', path: 'requests', icon: 'clipboard-check-outline' },
  { key: 'bookings', path: 'bookings', icon: 'calendar-check-outline' },
  { key: 'accounts', path: 'accounts', icon: 'account-key-outline' },
  { key: 'reviews', path: 'reviews', icon: 'star-outline' },
];

// OneQ platform console (Cognito `admin` group): the same frame as the facility dashboards, over every facility.
export function ConsoleLayout() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const pathname = usePathname();
  if (!user?.isAdmin) {
    return (
      <Screen>
        <EmptyState
          icon="lock-outline"
          title={t('dashboard.guard.noAccessTitle')}
          body={t('console.noAccess')}
          action={{ label: t('dashboard.shell.customerView'), onPress: () => router.navigate('/home') }}
        />
      </Screen>
    );
  }
  const segment = pathname.replace(/^\/console\/?/, '').split('/')[0] ?? '';
  const items = ITEMS.map((i) => ({ key: i.key, icon: i.icon, label: t(`console.menu.${i.key}`), href: (i.path ? `/console/${i.path}` : '/console') as Href }));
  const activeKey = segment === 'section' ? 'sections' : (ITEMS.find((i) => i.path === segment)?.key ?? 'overview');
  return (
    <DashboardShell title={t('console.title')} subtitle={t('console.subtitle')} items={items} activeKey={activeKey} switchHref={'/dashboard' as Href}>
      <Slot />
    </DashboardShell>
  );
}
