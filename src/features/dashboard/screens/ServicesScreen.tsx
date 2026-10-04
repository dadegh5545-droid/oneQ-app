import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { ServiceInput } from '@/domain/dashboard';
import { makeStyles, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { qar } from '@/utils/format';

import { localized, useCurrentFacility } from '../FacilityDashboard';
import { useCategories, useFacilityServices, useSaveService } from '../hooks';
import { QueryState } from '../shared';
import { Badge, ChipRow, EmptyRow, Grid, PageHeader, Panel, ToggleRow } from '../ui';

const blank: ServiceInput = { id: null, nameAr: '', nameEn: null, categoryId: null, priceQar: 0, durationMinutes: 60, homeAvailable: false, active: true };

// Services and prices, grouped by the section's categories (salons: hair, nails…; clinics: specialties).
export function ServicesScreen() {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const { facility, section } = useCurrentFacility();
  const services = useFacilityServices(facility.id);
  const categories = useCategories(facility.sectionId);
  const [editing, setEditing] = useState<ServiceInput | null>(null);
  const home = section?.presetType === 'salon' && facility.serviceMode !== 'inShop';
  const groups = [...(categories.data ?? []).map((c) => ({ id: c.id as string | null, name: localized(c.nameAr, c.nameEn, isRTL) })), { id: null, name: t('dashboard.services.uncategorized') }];

  return (
    <>
      <PageHeader title={t('dashboard.menu.services')} right={<Button label={t('dashboard.services.add')} onPress={() => setEditing({ ...blank })} />} />
      {editing ? <ServiceEditor facilityId={facility.id} initial={editing} home={home} categories={categories.data ?? []} onDone={() => setEditing(null)} /> : null}
      {!services.data ? (
        <QueryState query={services} />
      ) : services.data.length === 0 ? (
        <Panel>
          <EmptyRow text={t('dashboard.empty.services')} />
        </Panel>
      ) : (
        groups.map((g) => {
          const list = services.data.filter((s) => (s.categoryId ?? null) === g.id || (g.id === null && !groups.some((x) => x.id && x.id === s.categoryId)));
          if (list.length === 0) return null;
          return (
            <Panel key={g.id ?? 'none'} title={g.name}>
              <Grid min={240}>
                {list.map((s) => (
                  <View key={s.id} style={{ gap: 4 }}>
                    <AppText variant="label">{localized(s.nameAr, s.nameEn, isRTL)}</AppText>
                    <AppText color={colors.textSecondary}>{`${qar(s.priceQar)} · ${t('dashboard.services.minutes', { count: s.durationMinutes })}`}</AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {!s.active ? <Badge label={t('dashboard.services.inactive')} tone="neutral" /> : null}
                      {s.homeAvailable ? <Badge label={t('dashboard.bookings.home')} tone="accent" /> : null}
                    </View>
                    <Button variant="text" label={t('dashboard.edit')} onPress={() => setEditing({ ...s })} />
                  </View>
                ))}
              </Grid>
            </Panel>
          );
        })
      )}
    </>
  );
}

function ServiceEditor({ facilityId, initial, home, categories, onDone }: {
  facilityId: string;
  initial: ServiceInput;
  home: boolean;
  categories: { id: string; nameAr: string; nameEn: string | null }[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const save = useSaveService(facilityId);
  const [s, setS] = useState<ServiceInput>(initial);
  const [price, setPrice] = useState(initial.priceQar ? String(initial.priceQar) : '');
  const [duration, setDuration] = useState(String(initial.durationMinutes));
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) => setS((x) => ({ ...x, [key]: value }));
  const priceValue = /^\d{1,6}$/.test(price) ? Number(price) : null;
  const durationValue = /^\d{1,3}$/.test(duration) && Number(duration) > 0 ? Number(duration) : null;

  const onSave = () => {
    setSubmitted(true);
    if (!s.nameAr.trim() || priceValue === null || durationValue === null) return;
    save.mutate(
      { ...s, nameAr: s.nameAr.trim(), nameEn: s.nameEn?.trim() || null, priceQar: priceValue, durationMinutes: durationValue },
      {
        onSuccess: () => {
          toast(t('dashboard.saved'));
          onDone();
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };
  const req = (bad: boolean) => (submitted && bad ? t('dashboard.required') : undefined);

  return (
    <Panel title={s.id ? t('dashboard.services.editTitle') : t('dashboard.services.newTitle')}>
      <TextField label={t('dashboard.services.nameAr')} value={s.nameAr} onChangeText={(v) => set('nameAr', v)} error={req(!s.nameAr.trim())} />
      <TextField label={t('dashboard.services.nameEn')} value={s.nameEn ?? ''} onChangeText={(v) => set('nameEn', v)} />
      {categories.length ? (
        <>
          <AppText variant="bodyS" color={colors.textSecondary}>
            {t('dashboard.services.category')}
          </AppText>
          <ChipRow>
            {categories.map((c) => (
              <Chip key={c.id} label={localized(c.nameAr, c.nameEn, isRTL)} selected={s.categoryId === c.id} onPress={() => set('categoryId', s.categoryId === c.id ? null : c.id)} />
            ))}
          </ChipRow>
        </>
      ) : null}
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label={t('dashboard.services.price')} value={price} onChangeText={setPrice} keyboardType="number-pad" error={req(priceValue === null)} />
        </View>
        <View style={styles.flex}>
          <TextField label={t('dashboard.services.duration')} value={duration} onChangeText={setDuration} keyboardType="number-pad" error={req(durationValue === null)} />
        </View>
      </View>
      {home ? <ToggleRow label={t('dashboard.services.homeToggle')} hint={t('dashboard.services.homeHint')} value={s.homeAvailable} onChange={(v) => set('homeAvailable', v)} /> : null}
      <ToggleRow label={t('dashboard.services.activeToggle')} value={s.active} onChange={(v) => set('active', v)} />
      <View style={styles.pair}>
        <Button label={t('dashboard.save')} onPress={onSave} loading={save.isPending} style={styles.flex} />
        <Button variant="outlined" label={t('dashboard.cancel')} onPress={onDone} style={styles.flex} />
      </View>
    </Panel>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: space.md },
}));
