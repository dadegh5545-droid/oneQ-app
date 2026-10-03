import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Period, SeriesPoint } from '@/domain/dashboard';
import { formatDate, qar } from '@/utils/format';

import { BarChart, DistributionList } from '../charts';
import { useCurrentFacility } from '../FacilityDashboard';
import { useInsights } from '../hooks';
import { PeriodFilter, QueryState } from '../shared';
import { Grid, PageHeader, Panel, StatCard } from '../ui';

const count = (n: number) => new Intl.NumberFormat('en').format(n);
const compactQar = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

// Monthly buckets read as month names; shorter buckets as day + month.
const labelled = (points: SeriesPoint[], period: Period) =>
  points.map((p) => ({ label: formatDate(`${p.start}T00:00:00`, period === '12m' ? 'MMM' : 'd/M'), value: p.value }));

export function AnalyticsScreen() {
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
          <Grid min={200}>
            <StatCard icon="account-check-outline" label={t('dashboard.overview.activeMembers')} value={count(d.activeMembers)} />
            <StatCard icon="account-plus-outline" label={t('dashboard.overview.newMembers')} value={count(d.newMembers)} hint={t(`dashboard.period.${period}`)} />
            <StatCard icon="cash-multiple" label={t('dashboard.overview.revenue')} value={qar(d.revenue)} hint={t(`dashboard.period.${period}`)} />
            <StatCard icon="trophy-outline" label={t('dashboard.analytics.popularPlan')} value={d.popularPlan ?? '—'} />
          </Grid>
          <Grid min={320}>
            <Panel title={t('dashboard.analytics.membersGrowth')}>
              <BarChart points={labelled(d.membersSeries, period)} formatValue={count} />
            </Panel>
            <Panel title={t('dashboard.analytics.revenueTrend')}>
              <BarChart points={labelled(d.revenueSeries, period)} formatValue={compactQar} />
            </Panel>
          </Grid>
          <Grid min={320}>
            <Panel title={t('dashboard.analytics.newMembers')}>
              <BarChart points={labelled(d.newMembersSeries, period)} formatValue={count} />
            </Panel>
            <Panel title={t('dashboard.overview.planDistribution')}>
              <DistributionList items={d.planDistribution} emptyText={t('dashboard.empty.members')} />
            </Panel>
          </Grid>
        </>
      )}
    </>
  );
}
