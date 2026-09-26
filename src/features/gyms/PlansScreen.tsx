import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { SelectableCard } from '@/components/SelectableCard';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useGym, usePlans } from '@/data';
import { PLAN_MONTHS } from '@/domain/rules';
import { continueToCheckout } from '@/features/booking/continueToCheckout';
import { useDraft } from '@/features/booking/draftStore';
import { colors, space } from '@/theme';
import { qar } from '@/utils/format';

// S08
export function PlansScreen({ gymId, planId }: { gymId: string; planId?: string }) {
  const { t } = useTranslation();
  const gym = useGym(gymId);
  const plans = usePlans(gymId);
  const draftPlanId = useDraft((s) => (s.gym?.id === gymId ? s.plan?.id : undefined));
  const [selectedId, setSelectedId] = useState<string | undefined>(planId ?? draftPlanId);

  const selected = plans.data?.find((p) => p.id === selectedId);

  const onContinue = () => {
    if (!selected || !gym.data) return;
    useDraft.getState().selectPlan(selected, gym.data);
    continueToCheckout();
  };

  const renderBody = () => {
    if (gym.isPending || plans.isPending) return <LoadingState />;
    if (plans.isError || gym.isError) return <EmptyState icon="alert-circle-outline" title={t('plans.error')} />;
    if (!gym.data || plans.data.length === 0) return <EmptyState icon="card-remove-outline" title={t('plans.unavailable')} />;
    return (
      <>
        <View style={styles.headings}>
          <AppText variant="titleL">{t('plans.title')}</AppText>
          <AppText color={colors.textSecondary}>{t('plans.subtitle', { gym: gym.data.name })}</AppText>
        </View>
        {plans.data.map((p) => {
          const name = t(`plans.${p.kind}.name`);
          const months = PLAN_MONTHS[p.kind];
          return (
            <SelectableCard
              key={p.id}
              selected={p.id === selectedId}
              onPress={() => setSelectedId(p.id)}
              accessibilityLabel={`${name}, ${qar(p.price)}`}
              style={styles.card}
            >
              <View style={styles.flex}>
                <AppText variant="headline">{name}</AppText>
                <AppText variant="bodyS" color={colors.textSecondary}>
                  {t(`plans.${p.kind}.description`)}
                </AppText>
                {p.badge ? (
                  <AppText variant="label" color={colors.accent} style={styles.badge}>
                    {t(`plans.badges.${p.badge}`)}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.price}>
                <AppText variant="price" color={colors.primary}>
                  {qar(p.price)}
                </AppText>
                {months > 1 ? (
                  <AppText variant="bodyS" color={colors.textSecondary}>
                    {t('plans.perMonthEquivalent', { price: qar(Math.round(p.price / months)) })}
                  </AppText>
                ) : null}
              </View>
            </SelectableCard>
          );
        })}
      </>
    );
  };

  return (
    <Screen
      scroll
      edges={[]}
      contentStyle={styles.content}
      footer={<Button label={t('common.continue')} disabled={!selected} onPress={onContinue} />}
    >
      <Stack.Screen options={{ title: gym.data?.name ?? '' }} />
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  headings: { gap: space.xs, marginBottom: space.sm },
  card: { alignItems: 'flex-start' },
  flex: { flex: 1, gap: space.xs },
  badge: { fontSize: 13 },
  price: { alignItems: 'flex-end', gap: 2 },
});
