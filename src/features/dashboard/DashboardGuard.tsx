import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/StateView';
import { useSession } from '@/features/auth/sessionStore';

// Dashboards are for FACILITY_OWNER and admin accounts. Hiding them is only convenience: every dashboard read and
// write is authorized by the backend (facility-owner / admin-ops functions and model rules).
export function DashboardGuard() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  if (!user) {
    return (
      <Screen>
        <EmptyState
          icon="lock-outline"
          title={t('dashboard.guard.signInTitle')}
          body={t('dashboard.guard.signInBody')}
          action={{ label: t('profile.signIn'), onPress: () => router.push('/auth/sign-in') }}
        />
      </Screen>
    );
  }
  if (!user.isAdmin && !user.isOwner) {
    return (
      <Screen>
        <EmptyState
          icon="lock-outline"
          title={t('dashboard.guard.noAccessTitle')}
          body={t('dashboard.guard.noAccessBody')}
          action={{ label: t('dashboard.shell.customerView'), onPress: () => router.navigate('/home') }}
        />
      </Screen>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
