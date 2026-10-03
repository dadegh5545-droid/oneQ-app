import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { discountedPrice, FREEZE_LIMIT, type PlanInput, type PlanRow } from '@/domain/dashboard';
import { makeStyles, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { qar } from '@/utils/format';

import { useCurrentFacility } from '../FacilityDashboard';
import { useFacilityPlans, useSavePlan } from '../hooks';
import { QueryState } from '../shared';
import { Badge, ChipRow, EmptyRow, Grid, PageHeader, Panel, ToggleRow } from '../ui';

const DURATIONS = [1, 2, 3, 6, 12] as const;
const BADGES = [null, 'popular', 'bestValue'] as const;
const DISCOUNTS = [null, 'percent', 'amount'] as const;

const blank: PlanInput = {
  id: null,
  name: '',
  description: '',
  price: 0,
  durationMonths: 1,
  badge: null,
  visible: true,
  discountType: null,
  discountValue: null,
  allowFreeze: false,
  autoRenew: false,
};

// Membership plans: durations (1, 2, 3, 6, 12 months) with a price, badges, visibility to customers, a direct
// discount carried by the gym (no discount codes), freezing and optional auto-renewal for the customer.
export function PlansScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { facility } = useCurrentFacility();
  const params = useLocalSearchParams<{ new?: string }>();
  const plans = useFacilityPlans(facility.id);
  const [editing, setEditing] = useState<PlanInput | null>(params.new ? { ...blank } : null);

  const edit = (p: PlanRow) => setEditing({ ...p });
  const sorted = [...(plans.data ?? [])].sort((a, b) => a.durationMonths - b.durationMonths);

  return (
    <>
      <PageHeader title={t('dashboard.plans.title')} subtitle={t('dashboard.plans.subtitle')} right={<Button label={t('dashboard.plans.add')} onPress={() => setEditing({ ...blank })} />} />
      {editing ? <PlanEditor facilityId={facility.id} initial={editing} onDone={() => setEditing(null)} /> : null}
      {!plans.data ? (
        <QueryState query={plans} />
      ) : sorted.length === 0 ? (
        <Panel>
          <EmptyRow text={t('dashboard.empty.plans')} />
        </Panel>
      ) : (
        <Grid min={260}>
          {sorted.map((p) => {
            const final = discountedPrice(p);
            return (
              <Panel key={p.id} title={p.name} action={<Button variant="text" label={t('dashboard.edit')} onPress={() => edit(p)} />}>
                <AppText color={colors.textSecondary}>{t(`dashboard.plans.durations.${p.durationMonths}`)}</AppText>
                <View style={styles.priceRow}>
                  <AppText variant="titleM" lang="en">
                    {qar(final)}
                  </AppText>
                  {final !== p.price ? (
                    <AppText color={colors.textTertiary} style={styles.strike}>
                      {qar(p.price)}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.badges}>
                  {p.badge === 'popular' || p.badge === 'bestValue' ? <Badge label={t(`dashboard.plans.badge.${p.badge}`)} tone="accent" /> : null}
                  <Badge label={p.visible ? t('dashboard.plans.visible') : t('dashboard.plans.hidden')} tone={p.visible ? 'success' : 'neutral'} />
                  {p.allowFreeze ? <Badge label={t('dashboard.plans.freezeOn')} tone="neutral" /> : null}
                  {p.autoRenew ? <Badge label={t('dashboard.plans.autoRenewOn')} tone="neutral" /> : null}
                </View>
              </Panel>
            );
          })}
        </Grid>
      )}
    </>
  );
}

function PlanEditor({ facilityId, initial, onDone }: { facilityId: string; initial: PlanInput; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const save = useSavePlan(facilityId);
  const [p, setP] = useState<PlanInput>(initial);
  const [price, setPrice] = useState(initial.price ? String(initial.price) : '');
  const [discount, setDiscount] = useState(initial.discountValue ? String(initial.discountValue) : '');
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => setP((s) => ({ ...s, [key]: value }));

  const priceValue = /^\d{1,6}$/.test(price) ? Number(price) : null;
  const discountValue = p.discountType ? (/^\d{1,6}$/.test(discount) ? Number(discount) : null) : null;
  const invalid = !p.name.trim() || priceValue === null || (p.discountType !== null && (discountValue === null || (p.discountType === 'percent' && discountValue > 90)));

  const onSave = () => {
    setSubmitted(true);
    if (invalid || priceValue === null) return;
    save.mutate(
      { ...p, name: p.name.trim(), price: priceValue, discountValue },
      {
        onSuccess: () => {
          toast(t('dashboard.saved'));
          onDone();
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };

  return (
    <Panel title={p.id ? t('dashboard.plans.editTitle') : t('dashboard.plans.newTitle')}>
      <TextField label={t('dashboard.plans.name')} value={p.name} onChangeText={(v) => set('name', v)} error={submitted && !p.name.trim() ? t('dashboard.required') : undefined} />
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.plans.duration')}
      </AppText>
      <ChipRow>
        {DURATIONS.map((m) => (
          <Chip key={m} label={t(`dashboard.plans.durations.${m}`)} selected={p.durationMonths === m} onPress={() => set('durationMonths', m)} />
        ))}
      </ChipRow>
      <TextField label={t('dashboard.plans.price')} value={price} onChangeText={setPrice} keyboardType="number-pad" error={submitted && priceValue === null ? t('dashboard.required') : undefined} />
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.plans.badgeLabel')}
      </AppText>
      <ChipRow>
        {BADGES.map((b) => (
          <Chip key={b ?? 'none'} label={b ? t(`dashboard.plans.badge.${b}`) : t('dashboard.none')} selected={p.badge === b} onPress={() => set('badge', b)} />
        ))}
      </ChipRow>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.plans.discount')}
      </AppText>
      <ChipRow>
        {DISCOUNTS.map((d) => (
          <Chip key={d ?? 'none'} label={d ? t(`dashboard.plans.discountType.${d}`) : t('dashboard.none')} selected={p.discountType === d} onPress={() => set('discountType', d)} />
        ))}
      </ChipRow>
      {p.discountType ? (
        <TextField
          label={p.discountType === 'percent' ? t('dashboard.plans.discountPercent') : t('dashboard.plans.discountAmount')}
          value={discount}
          onChangeText={setDiscount}
          keyboardType="number-pad"
          error={submitted && discountValue === null ? t('dashboard.required') : submitted && p.discountType === 'percent' && (discountValue ?? 0) > 90 ? t('dashboard.plans.discountMax') : undefined}
        />
      ) : null}
      <AppText variant="bodyS" color={colors.textTertiary}>
        {t('dashboard.plans.noCodes')}
      </AppText>
      <ToggleRow label={t('dashboard.plans.visibleToggle')} value={p.visible} onChange={(v) => set('visible', v)} />
      <ToggleRow label={t('dashboard.plans.freezeToggle')} hint={t('dashboard.plans.freezeHint', FREEZE_LIMIT)} value={p.allowFreeze} onChange={(v) => set('allowFreeze', v)} />
      <ToggleRow label={t('dashboard.plans.autoRenewToggle')} hint={t('dashboard.plans.autoRenewHint')} value={p.autoRenew} onChange={(v) => set('autoRenew', v)} />
      <View style={styles.buttons}>
        <Button label={t('dashboard.save')} onPress={onSave} loading={save.isPending} style={styles.button} />
        <Button variant="outlined" label={t('dashboard.cancel')} onPress={onDone} style={styles.button} />
      </View>
    </Panel>
  );
}

const useStyles = makeStyles(() => ({
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  strike: { textDecorationLine: 'line-through' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: { flexGrow: 1, minWidth: 160 },
}));
