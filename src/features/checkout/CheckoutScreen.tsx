import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SelectableCard } from '@/components/SelectableCard';
import { EmptyState } from '@/components/StateView';
import { SummaryCard } from '@/components/SummaryCard';
import type { PaymentMethod } from '@/domain/models';
import { draftTotal, slotLabel } from '@/domain/rules';
import { useDraft } from '@/features/booking/draftStore';
import { colors, space } from '@/theme';
import { localizeTime, qar, shortDate } from '@/utils/format';

// Apple Pay only on iOS, Google Pay only on Android, Card everywhere (04 §6).
const METHODS: { method: PaymentMethod; icon: IconName }[] = [
  { method: 'card', icon: 'credit-card-outline' },
  ...(Platform.OS === 'ios' ? [{ method: 'applePay' as const, icon: 'apple' as const }] : []),
  ...(Platform.OS === 'android' ? [{ method: 'googlePay' as const, icon: 'google' as const }] : []),
];

// S14 — payment and booking creation are wired in Phase 3.
export function CheckoutScreen() {
  const { t } = useTranslation();
  const draft = useDraft();

  if (!draft.gym || !draft.guest) {
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
  const total = qar(draftTotal(draft));
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

  return (
    <Screen
      scroll
      edges={[]}
      contentStyle={styles.content}
      footer={<Button label={t('checkout.pay', { price: total })} onPress={() => {}} disabled />}
    >
      <SummaryCard title={t('booking.summary')} rows={rows} total={{ label: t('checkout.total'), value: total }} />
      <View style={styles.section} accessibilityRole="radiogroup">
        <AppText variant="headline">{t('checkout.paymentMethod')}</AppText>
        {METHODS.map(({ method, icon }) => {
          const selected = draft.paymentMethod === method;
          return (
            <SelectableCard key={method} selected={selected} onPress={() => draft.setPaymentMethod(method)} style={styles.method}>
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
