import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { LoadingState } from '@/components/StateView';
import { SummaryCard } from '@/components/SummaryCard';
import { useBooking } from '@/data';
import type { Booking } from '@/domain/models';
import { useBookingRows } from '@/features/bookings/BookingDetailsScreen';
import { useAddToCalendar } from '@/features/bookings/useAddToCalendar';
import { makeStyles, space, useTheme } from '@/theme';
import { qar } from '@/utils/format';

const goHome = () => router.navigate('/home');

// S15
export function SuccessScreen({ id }: { id: string }) {
  const booking = useBooking(id);

  // Hardware back goes Home, never back to Checkout (03 §6).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (booking.isPending) return <Screen><LoadingState /></Screen>;
  // Unknown booking id → Bookings (02 S15).
  if (!booking.data) return <Redirect href="/bookings" />;
  return <Success booking={booking.data} />;
}

function Success({ booking }: { booking: Booking }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const calendar = useAddToCalendar();
  const rows = useBookingRows(booking).slice(0, 6);
  const firstName = booking.trainerName?.split(' ')[0];
  const subtitle =
    booking.type === 'session' && firstName ? t('success.session', { name: firstName }) : t('success.membership', { gym: booking.gymName });

  return (
    <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.badge}>
        <Icon name="check" size={36} color={colors.success} />
      </View>
      <View style={styles.headings}>
        <AppText variant="titleL" style={styles.center}>
          {t('success.title')}
        </AppText>
        <AppText color={colors.textSecondary} style={styles.center}>
          {subtitle}
        </AppText>
      </View>
      <SummaryCard rows={rows} total={{ label: t('checkout.total'), value: qar(booking.priceQar) }} />
      <View style={styles.actions}>
        <Button label={t('success.viewBooking')} onPress={() => router.replace({ pathname: '/bookings/[id]', params: { id: booking.id } })} />
        <Button variant="outlined" label={t('success.addToCalendar')} onPress={() => calendar.add(booking)} loading={calendar.busy} />
        <Button variant="text" label={t('success.backToHome')} onPress={goHome} style={styles.home} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { gap: space.xxl, alignItems: 'stretch' },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successTint,
    marginTop: space.xxl,
  },
  headings: { gap: space.sm },
  center: { textAlign: 'center' },
  actions: { gap: space.md },
  home: { alignSelf: 'center' },
}));
