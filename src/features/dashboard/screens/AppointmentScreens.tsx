import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import type { BookingRow, Period, SeriesPoint } from '@/domain/dashboard';
import { makeStyles, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { formatDate, qar } from '@/utils/format';

import { BarChart, DistributionList } from '../charts';
import { useCurrentFacility } from '../FacilityDashboard';
import { useConfirmBooking, useInsights } from '../hooks';
import { BookingStatusBadge, bookingWhen, PeriodFilter, QueryState, shortDay, Stars } from '../shared';
import { EmptyRow, Grid, ListRow, PageHeader, Panel, StatCard } from '../ui';

const count = (n: number) => new Intl.NumberFormat('en').format(n);
const labelled = (points: SeriesPoint[], period: Period) => points.map((p) => ({ label: formatDate(`${p.start}T00:00:00`, period === '12m' ? 'MMM' : 'd/M'), value: p.value }));

// Confirms a requested (home-service) appointment; the customer's phone shows only after this.
export function ConfirmButton({ booking }: { booking: BookingRow }) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirmBooking();
  if (booking.status !== 'pending') return <BookingStatusBadge booking={booking} />;
  return (
    <Button
      variant="text"
      label={t('dashboard.bookings.confirm')}
      loading={confirm.isPending}
      onPress={() => confirm.mutate(booking.id, { onSuccess: () => toast(t('dashboard.bookings.confirmed')), onError: (e) => toast(errorMessage(e)) })}
    />
  );
}

// Salon / clinic home: today's and upcoming appointments, requests to confirm, revenue, customers, top services.
export function AppointmentOverviewScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { facility, section } = useCurrentFacility();
  const [period, setPeriod] = useState<Period>('month');
  const insights = useInsights(facility.id, period);
  const d = insights.data;
  const base = `/dashboard/${facility.id}`;
  const go = (path: string) => router.push(`${base}/${path}` as Href);
  const customersLabel = t(section?.presetType === 'salon' ? 'dashboard.menu.clients' : 'dashboard.menu.patients');

  return (
    <>
      <PageHeader title={t('dashboard.overview.title')} subtitle={facility.name} right={<PeriodFilter value={period} onChange={setPeriod} />} />
      {!d ? (
        <QueryState query={insights} />
      ) : (
        <>
          <Grid min={180}>
            <StatCard icon="calendar-today" label={t('dashboard.appointments.today')} value={count(d.appointmentsToday)} />
            <StatCard icon="calendar-clock" label={t('dashboard.appointments.upcoming')} value={count(d.upcomingAppointments)} />
            <StatCard icon="bell-ring-outline" label={t('dashboard.appointments.requests')} value={count(d.pendingRequests)} />
            <StatCard icon="cash-multiple" label={t('dashboard.overview.revenue')} value={qar(d.revenue)} hint={t(`dashboard.period.${period}`)} />
            <StatCard icon="account-plus-outline" label={t('dashboard.appointments.newCustomers')} value={count(d.newCustomers)} hint={t(`dashboard.period.${period}`)} />
          </Grid>
          <Grid min={300}>
            <Panel title={t('dashboard.appointments.topServices')}>
              <DistributionList items={d.topServices} emptyText={t('dashboard.empty.bookings')} />
            </Panel>
            <Panel title={t('dashboard.overview.latestReviews')} action={<Button variant="text" label={t('dashboard.viewAll')} onPress={() => go('reviews')} />}>
              {d.latestReviews.length === 0 ? <EmptyRow text={t('dashboard.empty.reviews')} /> : null}
              {d.latestReviews.map((r) => (
                <ListRow key={r.id} title={r.authorName} subtitle={`${shortDay(r.date)} · ${r.text || '—'}`} end={<Stars rating={r.rating} />} />
              ))}
            </Panel>
          </Grid>
          <Panel title={t('dashboard.overview.latestBookings')} action={<Button variant="text" label={t('dashboard.viewAll')} onPress={() => go('bookings')} />}>
            {d.latestBookings.length === 0 ? <EmptyRow text={t('dashboard.empty.bookings')} /> : null}
            {d.latestBookings.map((b) => (
              <ListRow key={b.id} title={b.customerName} subtitle={`${b.serviceName ?? b.trainerName ?? ''} · ${bookingWhen(b)}${b.homeService ? ` · ${t('dashboard.bookings.home')}` : ''}`} end={<ConfirmButton booking={b} />} />
            ))}
          </Panel>
          <Panel title={t('dashboard.overview.quickActions')}>
            <View style={styles.actions}>
              <Button label={t('dashboard.services.add')} onPress={() => go('services')} style={styles.action} />
              <Button variant="outlined" label={t(section?.presetType === 'salon' ? 'dashboard.menu.specialists' : 'dashboard.menu.doctors')} onPress={() => go('practitioners')} style={styles.action} />
              <Button variant="outlined" label={customersLabel} onPress={() => go('customers')} style={styles.action} />
            </View>
          </Panel>
        </>
      )}
    </>
  );
}

export function AppointmentAnalyticsScreen() {
  const { t } = useTranslation();
  const { facility } = useCurrentFacility();
  const [period, setPeriod] = useState<Period>('12m');
  const insights = useInsights(facility.id, period);
  const d = insights.data;
  return (
    <>
      <PageHeader title={t('dashboard.analytics.title')} right={<PeriodFilter value={period} onChange={setPeriod} />} />
      {!d ? (
        <QueryState query={insights} />
      ) : (
        <>
          <Grid min={320}>
            <Panel title={t('dashboard.appointments.series')}>
              <BarChart points={labelled(d.appointmentsSeries, period)} formatValue={count} />
            </Panel>
            <Panel title={t('dashboard.analytics.revenueTrend')}>
              <BarChart points={labelled(d.revenueSeries, period)} formatValue={(n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))} />
            </Panel>
          </Grid>
          <Grid min={320}>
            <Panel title={t('dashboard.appointments.newCustomers')}>
              <BarChart points={labelled(d.newCustomersSeries, period)} formatValue={count} />
            </Panel>
            <Panel title={t('dashboard.appointments.topServices')}>
              <DistributionList items={d.topServices} emptyText={t('dashboard.empty.bookings')} />
            </Panel>
          </Grid>
        </>
      )}
    </>
  );
}

const useStyles = makeStyles(() => ({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  action: { flexGrow: 1, minWidth: 180 },
}));
