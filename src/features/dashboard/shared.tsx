import { useTranslation } from 'react-i18next';
import { Platform, Share, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useToast } from '@/components/Toast';
import { PERIODS, type BookingRow, type MemberStatus, type Period } from '@/domain/dashboard';
import { useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { formatDate, localizeTime } from '@/utils/format';

import { Badge, type Tone } from './ui';

// Shared pieces of the dashboard screens.

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useTranslation();
  return <SegmentedControl value={value} onChange={onChange} options={PERIODS.map((p) => ({ value: p, label: t(`dashboard.period.${p}`) }))} />;
}

// Loading / error states for a dashboard query.
export function QueryState({ query }: { query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown } }) {
  const { t } = useTranslation();
  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return <EmptyState icon="alert-circle-outline" title={t('dashboard.loadError')} body={errorMessage(query.error)} action={{ label: t('common.retry'), onPress: () => query.refetch() }} />;
  }
  return null;
}

export const shortDay = (d: string | null | undefined) => (d ? formatDate(`${d.slice(0, 10)}T00:00:00`, 'd MMM y') : '—');

export function bookingWhen(b: BookingRow) {
  if (b.date) return `${shortDay(b.date)} · ${b.timeLabel ? localizeTime(b.timeLabel) : ''}`;
  return b.membershipStart ? `${shortDay(b.membershipStart)} → ${shortDay(b.membershipEnd)}` : shortDay(b.createdAt);
}

const BOOKING_TONES: Record<string, Tone> = { pending: 'warning', confirmed: 'success', completed: 'neutral', cancelled: 'danger' };

export function BookingStatusBadge({ booking }: { booking: BookingRow }) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 4 }}>
      <Badge label={t(`console.bookingStatus.${booking.status}`)} tone={BOOKING_TONES[booking.status] ?? 'neutral'} />
      {booking.trainerUnavailable && booking.status === 'confirmed' ? <Badge label={t('dashboard.bookings.trainerUnavailable')} tone="warning" /> : null}
    </View>
  );
}

const MEMBER_TONES: Record<MemberStatus, Tone> = { active: 'success', frozen: 'accent', expired: 'neutral', cancelled: 'danger' };

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`dashboard.memberStatus.${status}`)} tone={MEMBER_TONES[status]} />;
}

export function Stars({ rating }: { rating: number }) {
  const { colors } = useTheme();
  return (
    <AppText color={colors.accent} lang="en" accessibilityLabel={`${rating}/5`}>
      {'★'.repeat(Math.max(0, Math.min(5, rating)))}
      <AppText color={colors.outline} lang="en">
        {'★'.repeat(5 - Math.max(0, Math.min(5, rating)))}
      </AppText>
    </AppText>
  );
}

// Shares text through the system share sheet; on the web, downloads it as a file instead.
export async function shareText(text: string, fileName: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([`﻿${text}`], { type: fileName.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: text });
}

export const csv = (rows: (string | number | null)[][]) =>
  rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

// For features that need push, payments or another provider: shows "Coming soon".
export function ComingSoonButton({ label, variant = 'outlined' }: { label: string; variant?: 'outlined' | 'text' | 'primary' }) {
  const { t } = useTranslation();
  const toast = useToast();
  return <Button variant={variant} label={label} onPress={() => toast(t('common.comingSoon'))} />;
}
