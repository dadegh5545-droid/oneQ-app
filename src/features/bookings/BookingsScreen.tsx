import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useBookings } from '@/data';
import { isUpcoming } from '@/domain/rules';
import { syncBookingReminders } from '@/services/notifications';
import { space } from '@/theme';

import { BookingCard } from './BookingCard';

type Tab = 'upcoming' | 'past';

// S16
export function BookingsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('upcoming');
  const bookings = useBookings();

  // Reminders for bookings that are no longer confirmed (e.g. cancelled by OneQ) are removed.
  useEffect(() => {
    if (bookings.data) void syncBookingReminders(bookings.data);
  }, [bookings.data]);

  const renderList = () => {
    if (bookings.isPending) return <LoadingState />;
    if (bookings.isError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('bookings.errorTitle')}
          body={t('bookings.errorBody')}
          action={{ label: t('common.retry'), onPress: () => bookings.refetch() }}
        />
      );
    }
    const now = new Date();
    const list = bookings.data.filter((b) => isUpcoming(b, now) === (tab === 'upcoming'));
    if (list.length === 0) {
      return tab === 'upcoming' ? (
        <EmptyState
          icon="calendar-blank-outline"
          title={t('bookings.upcomingEmptyTitle')}
          body={t('bookings.upcomingEmptyBody')}
          action={{ label: t('common.exploreGyms'), onPress: () => router.navigate('/home') }}
        />
      ) : (
        <EmptyState icon="calendar-check-outline" title={t('bookings.pastEmptyTitle')} body={t('bookings.pastEmptyBody')} />
      );
    }
    return list.map((b) => <BookingCard key={b.id} booking={b} />);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <AppText variant="titleL">{t('bookings.title')}</AppText>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: t('bookings.upcoming') },
          { value: 'past', label: t('bookings.past') },
        ]}
      />
      {renderList()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
});
