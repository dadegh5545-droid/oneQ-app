import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import type { MemberRow, MemberStatus } from '@/domain/dashboard';
import { ltr } from '@/i18n';
import { makeStyles, space, useTheme } from '@/theme';
import { qar } from '@/utils/format';

import { DataTable, type Column } from '../DataTable';
import { useCurrentFacility } from '../FacilityDashboard';
import { useMembers } from '../hooks';
import { csv, MemberStatusBadge, QueryState, shareText, shortDay } from '../shared';
import { ChipRow, PageHeader, Panel } from '../ui';

const STATUSES: (MemberStatus | 'all')[] = ['all', 'active', 'frozen', 'expired', 'cancelled'];

// Members (memberships): table with status and plan filters, search by name or phone, CSV export.
export function MembersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { facility } = useCurrentFacility();
  const members = useMembers(facility.id);
  const [status, setStatus] = useState<MemberStatus | 'all'>('all');
  const [plan, setPlan] = useState<string>('all');
  const [query, setQuery] = useState('');

  const plans = useMemo(() => [...new Set((members.data ?? []).map((m) => m.planName))].sort(), [members.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members.data ?? []).filter(
      (m) => (status === 'all' || m.status === status) && (plan === 'all' || m.planName === plan) && (!q || m.name.toLowerCase().includes(q) || m.phone.includes(q)),
    );
  }, [members.data, status, plan, query]);

  const columns: Column<MemberRow>[] = [
    { key: 'name', title: t('dashboard.members.name'), width: 170, render: (m) => m.name },
    { key: 'phone', title: t('dashboard.members.phone'), width: 140, render: (m) => ltr(m.phone) },
    { key: 'plan', title: t('dashboard.members.plan'), width: 120, render: (m) => m.planName },
    { key: 'start', title: t('dashboard.members.start'), width: 110, render: (m) => shortDay(m.start) },
    { key: 'end', title: t('dashboard.members.end'), width: 110, render: (m) => shortDay(m.end) },
    { key: 'status', title: t('dashboard.members.status'), width: 100, render: (m) => <MemberStatusBadge status={m.status} /> },
    { key: 'amount', title: t('dashboard.members.amount'), width: 110, render: (m) => qar(m.amount) },
  ];

  const exportRows = () =>
    shareText(
      csv([
        columns.map((c) => c.title),
        ...rows.map((m) => [m.name, m.phone, m.planName, m.start, m.end, t(`dashboard.memberStatus.${m.status}`), m.amount]),
      ]),
      `${facility.id}-members.csv`,
    );

  return (
    <>
      <PageHeader title={t('dashboard.members.title')} subtitle={t('dashboard.members.count', { count: rows.length })} right={<Button variant="outlined" label={t('dashboard.members.export')} onPress={exportRows} disabled={rows.length === 0} />} />
      <Panel>
        <TextField label={t('dashboard.members.search')} value={query} onChangeText={setQuery} autoCorrect={false} />
        <View style={styles.filters}>
          <AppText variant="bodyS" color={colors.textSecondary}>
            {t('dashboard.members.status')}
          </AppText>
          <ChipRow>
            {STATUSES.map((s) => (
              <Chip key={s} label={s === 'all' ? t('dashboard.all') : t(`dashboard.memberStatus.${s}`)} selected={status === s} onPress={() => setStatus(s)} />
            ))}
          </ChipRow>
          <AppText variant="bodyS" color={colors.textSecondary}>
            {t('dashboard.members.plan')}
          </AppText>
          <ChipRow>
            {['all', ...plans].map((p) => (
              <Chip key={p} label={p === 'all' ? t('dashboard.all') : p} selected={plan === p} onPress={() => setPlan(p)} />
            ))}
          </ChipRow>
        </View>
      </Panel>
      <Panel>{members.data ? <DataTable columns={columns} rows={rows} keyOf={(m) => m.bookingId} emptyText={t('dashboard.empty.members')} /> : <QueryState query={members} />}</Panel>
    </>
  );
}

const useStyles = makeStyles(() => ({
  filters: { gap: space.xs },
}));
