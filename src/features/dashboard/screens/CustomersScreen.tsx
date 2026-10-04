import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import type { CustomerRow } from '@/domain/dashboard';
import { ltr } from '@/i18n';
import { useTheme } from '@/theme';
import { qar } from '@/utils/format';

import { DataTable, type Column } from '../DataTable';
import { useCurrentFacility } from '../FacilityDashboard';
import { useFacilityCustomers } from '../hooks';
import { csv, QueryState, shareText, shortDay } from '../shared';
import { PageHeader, Panel } from '../ui';

// Clients (salons) / patients (clinics): everyone who booked, with visits and spend. A home-service client's
// phone appears only after one of their bookings was confirmed.
export function CustomersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { facility, section } = useCurrentFacility();
  const customers = useFacilityCustomers(facility.id);
  const [query, setQuery] = useState('');
  const title = t(section?.presetType === 'salon' ? 'dashboard.menu.clients' : section?.presetType === 'clinic' || section?.presetType === 'hospital' ? 'dashboard.menu.patients' : 'dashboard.menu.customers');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers.data ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q));
  }, [customers.data, query]);

  const columns: Column<CustomerRow>[] = [
    { key: 'name', title: t('dashboard.members.name'), width: 180, render: (c) => c.name },
    {
      key: 'phone',
      title: t('dashboard.members.phone'),
      width: 150,
      render: (c) => (c.phone ? ltr(c.phone) : <AppText variant="bodyS" color={colors.textTertiary}>{t('dashboard.bookings.phoneAfterConfirm')}</AppText>),
    },
    { key: 'visits', title: t('dashboard.customers.visits'), width: 90, render: (c) => String(c.visits) },
    { key: 'first', title: t('dashboard.customers.firstVisit'), width: 120, render: (c) => shortDay(c.firstVisit) },
    { key: 'last', title: t('dashboard.customers.lastVisit'), width: 120, render: (c) => shortDay(c.lastVisit) },
    { key: 'spent', title: t('dashboard.customers.spent'), width: 120, render: (c) => qar(c.totalSpent) },
  ];

  const exportRows = () =>
    shareText(csv([columns.map((c) => c.title), ...rows.map((c) => [c.name, c.phone, c.visits, c.firstVisit, c.lastVisit, c.totalSpent])]), `${facility.id}-customers.csv`);

  return (
    <>
      <PageHeader title={title} subtitle={t('dashboard.members.count', { count: rows.length })} right={<Button variant="outlined" label={t('dashboard.members.export')} onPress={exportRows} disabled={rows.length === 0} />} />
      <Panel>
        <TextField label={t('dashboard.members.search')} value={query} onChangeText={setQuery} autoCorrect={false} />
      </Panel>
      <Panel>{customers.data ? <DataTable columns={columns} rows={rows} keyOf={(c) => c.id} emptyText={t('dashboard.empty.customers')} /> : <QueryState query={customers} />}</Panel>
    </>
  );
}
