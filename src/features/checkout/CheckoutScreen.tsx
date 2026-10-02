import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SelectableCard } from '@/components/SelectableCard';
import { EmptyState } from '@/components/StateView';
import { SummaryCard } from '@/components/SummaryCard';
import { useToast } from '@/components/Toast';
import { repository } from '@/data';
import { RepositoryError } from '@/data/repository';
import type { BookingDraft, PaymentMethod } from '@/domain/models';
import { draftTotal, slotLabel } from '@/domain/rules';
import { useSession } from '@/features/auth/sessionStore';
import { useDraft } from '@/features/booking/draftStore';
import { paymentProvider } from '@/features/payments/provider';
import { track } from '@/services/analytics';
import { reportError } from '@/services/monitoring';
import { notifyBookingConfirmed } from '@/services/notifications';
import { space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { localizeTime, qar, shortDate } from '@/utils/format';

// Apple Pay only on iOS, Google Pay only on Android, Card everywhere (04 §6).
const METHODS: { method: PaymentMethod; icon: IconName }[] = [
  { method: 'card', icon: 'credit-card-outline' },
  ...(Platform.OS === 'ios' ? [{ method: 'applePay' as const, icon: 'apple' as const }] : []),
  ...(Platform.OS === 'android' ? [{ method: 'googlePay' as const, icon: 'google' as const }] : []),
];

const isComplete = (d: BookingDraft) =>
  !!d.gym && !!d.guest && (d.path === 'membershipPlusTrainer' ? !!(d.trainer && d.date && d.slot) : !!d.plan);

// S14
export function CheckoutScreen() {
  const { t } = useTranslation();
  const draft = useDraft();

  if (!isComplete(draft) || !draft.gym || !draft.guest) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="cart-remove"
          title={t('checkout.unavailableTitle')}
          body={t('checkout.unavailableBody')}
          action={{ label: t('common.browseGyms'), onPress: () => router.navigate('/home') }}
        />
      </Screen>
    );
  }

  const session = draft.path === 'membershipPlusTrainer';
  const rows = session
    ? [
        { label: t('booking.gym'), value: draft.gym.name },
        { label: t('booking.trainer'), value: draft.trainer?.name },
        { label: t('booking.date'), value: draft.date ? shortDate(`${draft.date}T00:00:00`) : null },
        { label: t('booking.time'), value: draft.slot ? localizeTime(slotLabel(draft.slot.minutes)) : null },
        { label: t('checkout.guest'), value: draft.guest.fullName },
      ]
    : [
        { label: t('booking.gym'), value: draft.gym.name },
        { label: t('checkout.plan'), value: draft.plan ? t(`plans.${draft.plan.kind}.name`) : null },
        { label: t('checkout.guest'), value: draft.guest.fullName },
      ];

  return <Checkout draft={draft} rows={rows} />;
}

function Checkout({ draft, rows }: { draft: BookingDraft; rows: { label: string; value: string | null | undefined }[] }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  // One key per checkout attempt so a retried payment is never charged twice.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());
  const total = qar(draftTotal(draft));
  const bookingType = draft.path === 'membershipPlusTrainer' ? 'session' : 'membership';
  const gymId = draft.gym?.id ?? '';
  // After a successful payment its id is kept: a retry after a network failure reuses it, and the backend
  // returns the booking it may already have created instead of charging or booking twice.
  const paid = useRef<string | null>(null);

  useEffect(() => {
    track({ name: 'checkout_started', bookingType, gymId });
  }, [bookingType, gymId]);

  // Block Android back while the payment is processing (03 §6).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => paying);
    return () => sub.remove();
  }, [paying]);

  const onPay = async () => {
    if (paying) return; // double-tap guard (04 §8)
    setPaying(true);
    try {
      if (!paid.current) {
        const { priceQar } = await repository.quoteBooking(draft);
        paid.current = (await paymentProvider.pay({ amountQar: priceQar, method: draft.paymentMethod, idempotencyKey })).paymentId;
      }
      const booking = await repository.createBooking(draft, { method: draft.paymentMethod, paymentId: paid.current });
      track({ name: 'booking_completed', bookingType: booking.type, gymId: booking.gymId, priceQar: booking.priceQar });
      void notifyBookingConfirmed(booking, useSession.getState().user ? 'account' : 'guest');
      // Success reads the booking just created without another round trip.
      queryClient.setQueryData(['booking', booking.id], booking);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['availability'] });
      useDraft.getState().clearAfterBooking();
      // Success replaces the booking stack; Back goes Home (03 §3, §6).
      router.dismissAll();
      router.push({ pathname: '/checkout/success/[id]', params: { id: booking.id } });
    } catch (e) {
      setPaying(false);
      track({ name: 'booking_failed', bookingType, errorCode: e instanceof RepositoryError ? e.code : 'UNKNOWN' });
      reportError(e, { area: 'checkout' });
      // Only a network failure keeps the payment for a safe retry; any other outcome starts over.
      if (!(e instanceof RepositoryError && e.code === 'NETWORK')) paid.current = null;
      if (e instanceof RepositoryError && (e.code === 'SLOT_TAKEN' || e.code === 'SLOT_UNAVAILABLE')) {
        // Return to S11 to pick another time (04 §8).
        useDraft.getState().selectSlot(undefined);
        await queryClient.invalidateQueries({ queryKey: ['availability'] });
        toast(errorMessage(e));
        router.dismissTo('/booking');
        return;
      }
      toast(e instanceof RepositoryError ? errorMessage(e) : t('errors.payment'));
    }
  };

  return (
    <Screen
      scroll
      edges={[]}
      contentStyle={styles.content}
      footer={<Button label={t('checkout.pay', { price: total })} onPress={onPay} loading={paying} />}
    >
      <Stack.Screen options={{ gestureEnabled: !paying, headerBackVisible: !paying }} />
      <SummaryCard title={t('booking.summary')} rows={rows} total={{ label: t('checkout.total'), value: total }} />
      <View style={styles.section} accessibilityRole="radiogroup">
        <AppText variant="headline">{t('checkout.paymentMethod')}</AppText>
        {METHODS.map(({ method, icon }) => {
          const selected = draft.paymentMethod === method;
          return (
            <SelectableCard
              key={method}
              selected={selected}
              onPress={() => !paying && useDraft.getState().setPaymentMethod(method)}
              style={styles.method}
            >
              <Icon name={icon} color={colors.textPrimary} />
              <AppText variant="label" style={styles.flex}>
                {t(`checkout.${method}`)}
              </AppText>
              <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} color={selected ? colors.primary : colors.textTertiary} size={22} />
            </SelectableCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  section: { gap: space.md },
  method: { height: 50, paddingVertical: 0 },
  flex: { flex: 1 },
});
