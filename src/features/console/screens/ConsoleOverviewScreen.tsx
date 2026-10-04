import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { QueryState } from '@/features/dashboard/shared';
import { EmptyRow, Grid, ListRow, PageHeader, Panel, StatCard } from '@/features/dashboard/ui';

import { useConsoleFacilities, useConsoleStats } from '../hooks';

const count = (n: number) => new Intl.NumberFormat('en').format(n);

// Today at a glance and what needs attention (facilities waiting for approval). No commission or revenue.
export function ConsoleOverviewScreen() {
  const { t } = useTranslation();
  const stats = useConsoleStats();
  const facilities = useConsoleFacilities();
  const pending = (facilities.data ?? []).filter((f) => f.status === 'pending');

  return (
    <>
      <PageHeader title={t('console.overview.title')} />
      {stats.data ? (
        <Grid min={200}>
          <StatCard icon="calendar-today" label={t('console.overview.bookingsToday')} value={count(stats.data.bookingsToday)} />
          <StatCard icon="clipboard-clock-outline" label={t('console.overview.pending')} value={count(stats.data.pendingFacilities)} />
          <StatCard icon="store-check-outline" label={t('console.overview.active')} value={count(stats.data.activeFacilities)} />
          <StatCard icon="account-plus-outline" label={t('console.overview.newCustomers')} value={count(stats.data.newCustomers)} hint={t('dashboard.period.30d')} />
        </Grid>
      ) : (
        <QueryState query={stats} />
      )}
      <Panel title={t('console.overview.attention')} action={<Button variant="text" label={t('dashboard.viewAll')} onPress={() => router.push('/console/requests' as Href)} />}>
        {!facilities.data ? <QueryState query={facilities} /> : null}
        {facilities.data && pending.length === 0 ? <EmptyRow text={t('console.overview.nothing')} /> : null}
        {pending.slice(0, 8).map((f) => (
          <ListRow key={f.id} title={f.name} subtitle={f.area} onPress={() => router.push('/console/requests' as Href)} />
        ))}
      </Panel>
    </>
  );
}
