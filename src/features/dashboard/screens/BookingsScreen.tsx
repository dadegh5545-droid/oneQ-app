import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { BookingRow } from '@/domain/dashboard';
import { ltr } from '@/i18n';
import { makeStyles, space, useTheme } from '@/theme';
import { qar } from '@/utils/format';

import { DataTable, type Column } from '../DataTable';
import { useCurrentFacility } from '../FacilityDashboard';
import { useFacilityBookings } from '../hooks';
import { bookingWhen, QueryState } from '../shared';
import { Badge, ChipRow, PageHeader, Panel } from '../ui';
import { ConfirmButton } from './AppointmentScreens';

type Range = 'day' | 'week' | 'month';
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function rangeOf(range: Range) {
  const now = new Date();
  if (range === 'day') return { from: ymd(now), to: ymd(now) };
  if (range === 'week') return { from: ymd(now), to: ymd(addDays(now, 6)) };
  return { from: ymd(startOfMonth(now)), to: ymd(endOfMonth(now)) };
}

// Bookings: today / this week / this month, by type (trainer session, membership, appointment) and status.
export function BookingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { facility, section } = useCurrentFacility();
  const [range, setRange] = useState<Range>('week');
  const [type, setType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const { from, to } = rangeOf(range);
  const bookings = useFacilityBookings(facility.id, from, to);
  const appointments = section?.bookingMode === 'appointment';
  const types = appointments ? ['all'] : ['all', 'session', 'membership'];

  const rows = useMemo(
    () => (bookings.data ?? []).filter((b) => (type === 'all' || b.type === type) && (status === 'all' || b.status === status)),
    [bookings.data, type, status],
  );

  const columns: Column<BookingRow>[] = [
    { key: 'when', title: t('dashboard.bookings.when'), width: 190, render: bookingWhen },
    { key: 'customer', title: t('dashboard.bookings.customer'), width: 170, render: (b) => b.customerName },
    {
      key: 'phone',
      title: t('dashboard.members.phone'),
      width: 140,
      render: (b) => (b.customerPhone ? ltr(b.customerPhone) : <AppText variant="bodyS" color={colors.textTertiary}>{t('dashboard.bookings.phoneAfterConfirm')}</AppText>),
    },
    {
      key: 'what',
      title: t('dashboard.bookings.what'),
      width: 190,
      render: (b) => (
        <View style={styles.what}>
          <AppText numberOfLines={1}>{b.serviceName ?? (b.type === 'session' ? b.trainerName : b.planName) ?? '—'}</AppText>
          {b.homeService ? <Badge label={t('dashboard.bookings.home')} tone="accent" /> : null}
        </View>
      ),
    },
    { key: 'status', title: t('dashboard.members.status'), width: 130, render: (b) => <ConfirmButton booking={b} /> },
    { key: 'amount', title: t('dashboard.members.amount'), width: 100, render: (b) => qar(b.priceQar) },
  ];

  return (
    <>
      <PageHeader title={t(appointments ? 'dashboard.menu.appointments' : 'dashboard.bookings.title')} subtitle={t('dashboard.bookings.count', { count: rows.length })} />
      <Panel>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={(['day', 'week', 'month'] as const).map((r) => ({ value: r, label: t(`dashboard.bookings.range.${r}`) }))}
        />
        {types.length > 1 ? (
          <ChipRow>
            {types.map((ty) => (
              <Chip key={ty} label={ty === 'all' ? t('dashboard.all') : t(`dashboard.bookings.type.${ty}`)} selected={type === ty} onPress={() => setType(ty)} />
            ))}
          </ChipRow>
        ) : null}
        <ChipRow>
          {[...(appointments ? ['all', 'pending'] : ['all']), 'confirmed', 'completed', 'cancelled'].map((s) => (
            <Chip key={s} label={s === 'all' ? t('dashboard.all') : t(`console.bookingStatus.${s}`)} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </ChipRow>
      </Panel>
      <Panel>{bookings.data ? <DataTable columns={columns} rows={rows} keyOf={(b) => b.id} emptyText={t('dashboard.empty.bookings')} /> : <QueryState query={bookings} />}</Panel>
    </>
  );
}

const useStyles = makeStyles(() => ({
  what: { gap: space.xs },
}));
