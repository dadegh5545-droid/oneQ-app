import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import type { Period } from '@/domain/dashboard';
import { notificationText } from '@/features/notifications/notificationText';
import { makeStyles, space, useTheme } from '@/theme';
import { qar } from '@/utils/format';

import { DistributionList } from '../charts';
import { useCurrentFacility } from '../FacilityDashboard';
import { useInsights, useNotifications } from '../hooks';
import { BookingStatusBadge, bookingWhen, ComingSoonButton, PeriodFilter, QueryState, shortDay, Stars } from '../shared';
import { Badge, EmptyRow, Grid, ListRow, PageHeader, Panel, StatCard } from '../ui';

const count = (n: number) => new Intl.NumberFormat('en').format(n);

// Gym dashboard home: totals for the selected period, plan mix, latest reviews and bookings, memberships ending soon.
export function OverviewScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { facility } = useCurrentFacility();
  const [period, setPeriod] = useState<Period>('month');
  const insights = useInsights(facility.id, period);
  const notifications = useNotifications();
  const base = `/dashboard/${facility.id}`;
  const go = (path: string) => router.push(`${base}/${path}` as Href);
  const periodLabel = t(`dashboard.period.${period}`);

  return (
    <>
      <PageHeader title={t('dashboard.overview.title')} subtitle={facility.name} right={<PeriodFilter value={period} onChange={setPeriod} />} />
      {facility.status !== 'approved' ? (
        <View style={styles.status}>
          <Badge label={t(`dashboard.facilityStatus.${facility.status}`)} tone={facility.status === 'suspended' ? 'danger' : 'warning'} />
          <AppText variant="bodyS" color={colors.textSecondary} style={styles.flex}>
            {t(`dashboard.facilityStatusHint.${facility.status}`)}
          </AppText>
        </View>
      ) : null}
      {!insights.data ? (
        <QueryState query={insights} />
      ) : (
        <>
          <Grid min={180}>
            <StatCard icon="account-group-outline" label={t('dashboard.overview.totalMembers')} value={count(insights.data.members)} />
            <StatCard icon="account-check-outline" label={t('dashboard.overview.activeMembers')} value={count(insights.data.activeMembers)} />
            <StatCard icon="account-plus-outline" label={t('dashboard.overview.newMembers')} value={count(insights.data.newMembers)} hint={periodLabel} />
            <StatCard icon="cash-multiple" label={t('dashboard.overview.revenue')} value={qar(insights.data.revenue)} hint={periodLabel} />
            <StatCard icon="whistle-outline" label={t('dashboard.overview.trainerBookings')} value={count(insights.data.trainerBookings)} hint={periodLabel} />
          </Grid>

          <Grid min={300}>
            <Panel title={t('dashboard.overview.planDistribution')}>
              <DistributionList items={insights.data.planDistribution} emptyText={t('dashboard.empty.members')} />
            </Panel>
            <Panel title={t('dashboard.overview.latestReviews')} action={<Button variant="text" label={t('dashboard.viewAll')} onPress={() => go('reviews')} />}>
              {insights.data.latestReviews.length === 0 ? <EmptyRow text={t('dashboard.empty.reviews')} /> : null}
              {insights.data.latestReviews.map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.reviewHead}>
                    <Stars rating={r.rating} />
                    <AppText variant="bodyS" color={colors.textTertiary}>
                      {shortDay(r.date)}
                    </AppText>
                  </View>
                  <AppText variant="bodyS" numberOfLines={2}>
                    {r.text || '—'}
                  </AppText>
                  <AppText variant="bodyS" color={colors.textSecondary}>
                    {r.authorName}
                  </AppText>
                </View>
              ))}
            </Panel>
          </Grid>

          <Grid min={300}>
            <Panel title={t('dashboard.overview.expiringSoon')}>
              {insights.data.expiringSoon.length === 0 ? <EmptyRow text={t('dashboard.empty.expiring')} /> : null}
              {insights.data.expiringSoon.map((m) => (
                <ListRow key={m.bookingId} title={m.name} subtitle={`${m.planName} · ${t('dashboard.overview.endsOn', { date: shortDay(m.end) })}`} end={<ComingSoonButton variant="text" label={t('dashboard.overview.remind')} />} />
              ))}
            </Panel>
            <Panel title={t('dashboard.overview.latestBookings')} action={<Button variant="text" label={t('dashboard.viewAll')} onPress={() => go('bookings')} />}>
              {insights.data.latestBookings.length === 0 ? <EmptyRow text={t('dashboard.empty.bookings')} /> : null}
              {insights.data.latestBookings.map((b) => (
                <ListRow
                  key={b.id}
                  title={b.customerName}
                  subtitle={`${b.type === 'session' ? (b.trainerName ?? '') : (b.planName ?? b.serviceName ?? '')} · ${bookingWhen(b)}`}
                  end={<BookingStatusBadge booking={b} />}
                />
              ))}
            </Panel>
          </Grid>

          <Grid min={300}>
            <Panel title={t('dashboard.overview.quickActions')}>
              <View style={styles.actions}>
                <Button label={t('dashboard.plans.add')} onPress={() => go('plans?new=1')} style={styles.action} />
                <Button variant="outlined" label={t('dashboard.practitioners.addTrainer')} onPress={() => go('practitioners?new=1')} style={styles.action} />
                <Button variant="outlined" label={t('dashboard.menu.members')} onPress={() => go('members')} style={styles.action} />
                <Button variant="outlined" label={t('dashboard.menu.photos')} onPress={() => go('photos')} style={styles.action} />
              </View>
            </Panel>
            <Panel title={t('dashboard.overview.notifications')}>
              {(notifications.data ?? []).length === 0 ? <EmptyRow text={t('dashboard.empty.notifications')} /> : null}
              {(notifications.data ?? []).slice(0, 5).map((n) => (
                <ListRow key={n.id} title={notificationText(t, n)} subtitle={shortDay(n.createdAt)} />
              ))}
              <AppText variant="bodyS" color={colors.textTertiary}>
                {t('dashboard.overview.pushSoon')}
              </AppText>
            </Panel>
          </Grid>
        </>
      )}
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  review: { gap: 2, paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  action: { flexGrow: 1, minWidth: 180 },
}));
