import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { RatingInline } from '@/components/RatingInline';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { TrainerInput, TrainerRow } from '@/domain/dashboard';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { qar } from '@/utils/format';

import { localized, useCurrentFacility } from '../FacilityDashboard';
import { useFacilityTrainers, useSaveTrainer } from '../hooks';
import { QueryState } from '../shared';
import { Badge, ChipRow, EmptyRow, Grid, PageHeader, Panel } from '../ui';

// Ready-made lists (no free-form tags): specialties use the catalogue values customers already see translated;
// skills and languages are fixed keys.
export const SPECIALTIES = ['Strength Training', 'Weight Loss', 'Mobility', 'Functional Training'];
export const SKILLS = ['hiit', 'powerlifting', 'yoga', 'pilates', 'boxing', 'nutrition', 'rehab', 'swimming', 'crossfit', 'stretching'];
export const LANGUAGES = ['Arabic', 'English', 'French', 'Hindi', 'Urdu', 'Tagalog'];

const blank: TrainerInput = {
  id: null,
  name: '',
  title: '',
  bio: '',
  image: '',
  specialties: [],
  skills: [],
  yearsExperience: 0,
  pricePerSession: 0,
  languages: ['Arabic', 'English'],
  certifications: [],
  departmentId: null,
};

export const toTrainerInput = (t: TrainerRow): TrainerInput => ({
  id: t.id,
  name: t.name,
  title: t.title,
  bio: t.bio,
  image: t.image,
  specialties: t.specialties,
  skills: t.skills,
  yearsExperience: t.yearsExperience,
  pricePerSession: t.pricePerSession,
  languages: t.languages,
  certifications: t.certifications,
  departmentId: t.departmentId,
});

// Trainers / specialists / doctors (the section's practitioner label): profiles, availability badge, add/edit.
export function PractitionersScreen() {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const { facility, section } = useCurrentFacility();
  const params = useLocalSearchParams<{ new?: string }>();
  const trainers = useFacilityTrainers(facility.id);
  const [editing, setEditing] = useState<TrainerInput | null>(params.new ? { ...blank } : null);
  const label = section?.practitionerLabelAr ? localized(section.practitionerLabelAr, section.practitionerLabelEn, isRTL) : t('dashboard.practitioners.trainer');

  return (
    <>
      <PageHeader
        title={t(section?.presetType === 'salon' ? 'dashboard.menu.specialists' : section?.presetType === 'clinic' || section?.presetType === 'hospital' ? 'dashboard.menu.doctors' : 'dashboard.menu.trainers')}
        right={<Button label={t('dashboard.practitioners.add', { label })} onPress={() => setEditing({ ...blank })} />}
      />
      {editing ? <PractitionerEditor facilityId={facility.id} initial={editing} onDone={() => setEditing(null)} /> : null}
      {!trainers.data ? (
        <QueryState query={trainers} />
      ) : trainers.data.length === 0 ? (
        <Panel>
          <EmptyRow text={t('dashboard.empty.practitioners')} />
        </Panel>
      ) : (
        <Grid min={280}>
          {trainers.data.map((tr) => (
            <Pressable key={tr.id} accessibilityRole="button" accessibilityLabel={tr.name} onPress={() => router.push(`/dashboard/${facility.id}/practitioners/${tr.id}` as Href)}>
              <Panel>
                <View style={styles.head}>
                  <Image source={tr.image} style={styles.photo} contentFit="cover" />
                  <View style={styles.flex}>
                    <AppText variant="headline" numberOfLines={1}>
                      {tr.name}
                    </AppText>
                    <AppText color={colors.textSecondary} numberOfLines={1}>
                      {tr.title}
                    </AppText>
                    <RatingInline rating={tr.rating} reviewCount={tr.reviewCount} />
                  </View>
                </View>
                <View style={styles.badges}>
                  <Badge label={tr.unavailable ? t('dashboard.practitioners.unavailable') : t('dashboard.practitioners.available')} tone={tr.unavailable ? 'danger' : 'success'} />
                  <Badge label={qar(tr.pricePerSession)} tone="neutral" />
                  {tr.specialties.slice(0, 2).map((s) => (
                    <Badge key={s} label={t(`specialties.${s}`, { defaultValue: s })} tone="accent" />
                  ))}
                </View>
              </Panel>
            </Pressable>
          ))}
        </Grid>
      )}
    </>
  );
}

const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function PractitionerEditor({ facilityId, initial, onDone }: { facilityId: string; initial: TrainerInput; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const save = useSaveTrainer(facilityId);
  const [f, setF] = useState<TrainerInput>(initial);
  const [years, setYears] = useState(initial.yearsExperience ? String(initial.yearsExperience) : '');
  const [price, setPrice] = useState(initial.pricePerSession ? String(initial.pricePerSession) : '');
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof TrainerInput>(key: K, value: TrainerInput[K]) => setF((s) => ({ ...s, [key]: value }));
  const yearsValue = /^\d{1,2}$/.test(years) ? Number(years) : null;
  const priceValue = /^\d{1,6}$/.test(price) ? Number(price) : null;
  const imageOk = /^https:\/\/\S+$/.test(f.image.trim());
  const invalid = !f.name.trim() || !imageOk || yearsValue === null || priceValue === null;

  const onSave = () => {
    setSubmitted(true);
    if (invalid || yearsValue === null || priceValue === null) return;
    save.mutate(
      { ...f, name: f.name.trim(), image: f.image.trim(), yearsExperience: yearsValue, pricePerSession: priceValue },
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
    <Panel title={f.id ? t('dashboard.practitioners.editTitle') : t('dashboard.practitioners.newTitle')}>
      <TextField label={t('dashboard.practitioners.name')} value={f.name} onChangeText={(v) => set('name', v)} error={req(!f.name.trim())} />
      <TextField label={t('dashboard.practitioners.photo')} value={f.image} onChangeText={(v) => set('image', v)} autoCapitalize="none" keyboardType="url" placeholder="https://" error={req(!imageOk)} />
      <TextField label={t('dashboard.practitioners.title')} value={f.title} onChangeText={(v) => set('title', v)} />
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.practitioners.specialties')}
      </AppText>
      <ChipRow>
        {SPECIALTIES.map((s) => (
          <Chip key={s} label={t(`specialties.${s}`)} selected={f.specialties.includes(s)} onPress={() => set('specialties', toggle(f.specialties, s))} />
        ))}
      </ChipRow>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.practitioners.skills')}
      </AppText>
      <ChipRow>
        {SKILLS.map((s) => (
          <Chip key={s} label={t(`dashboard.skills.${s}`)} selected={f.skills.includes(s)} onPress={() => set('skills', toggle(f.skills, s))} />
        ))}
      </ChipRow>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label={t('dashboard.practitioners.years')} value={years} onChangeText={setYears} keyboardType="number-pad" error={req(yearsValue === null)} />
        </View>
        <View style={styles.flex}>
          <TextField label={t('dashboard.practitioners.price')} value={price} onChangeText={setPrice} keyboardType="number-pad" error={req(priceValue === null)} />
        </View>
      </View>
      <TextField label={t('dashboard.practitioners.bio')} value={f.bio} onChangeText={(v) => set('bio', v)} multiline />
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.practitioners.languages')}
      </AppText>
      <ChipRow>
        {LANGUAGES.map((l) => (
          <Chip key={l} label={t(`languages.${l}`, { defaultValue: l })} selected={f.languages.includes(l)} onPress={() => set('languages', toggle(f.languages, l))} />
        ))}
      </ChipRow>
      <View style={styles.buttons}>
        <Button label={t('dashboard.save')} onPress={onSave} loading={save.isPending} style={styles.button} />
        <Button variant="outlined" label={t('dashboard.cancel')} onPress={onDone} style={styles.button} />
      </View>
    </Panel>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  photo: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceVariant },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pair: { flexDirection: 'row', gap: space.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: { flexGrow: 1, minWidth: 160 },
}));
