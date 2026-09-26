import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { adminRepository, useGym, useGyms, usePlans, useTrainer, useTrainers } from '@/data';
import type { GymInput, TrainerInput } from '@/data/repository';
import type { AmenityKey, Booking, MembershipPlan, Specialty } from '@/domain/models';
import { useSession } from '@/features/auth/sessionStore';
import { ltr } from '@/i18n';
import { colors, radius, space } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { qar } from '@/utils/format';

// Management screens (catalogue + bookings) for the Cognito `admin` group. Hiding them is only convenience:
// every write is authorized by the backend (catalogue models: admin group; adminCancelBooking: admin group).

const AMENITIES: AmenityKey[] = ['weights', 'cardio', 'pool', 'sauna', 'lockers', 'parking'];
const SPECIALTIES: Specialty[] = ['Strength Training', 'Weight Loss', 'Mobility', 'Functional Training'];

const lines = (text: string) => text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const toInt = (text: string) => (/^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : null);
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function AdminOnly({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isAdmin = useSession((s) => s.user?.isAdmin === true);
  if (isAdmin) return children;
  return (
    <Screen edges={[]}>
      <EmptyState icon="lock-outline" title={t('admin.noAccessTitle')} body={t('admin.noAccessBody')} action={{ label: t('common.browseGyms'), onPress: () => router.navigate('/home') }} />
    </Screen>
  );
}

function LinkRow({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label} onPress={onPress} style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="label">{label}</AppText>
        {detail ? <AppText variant="bodyS" color={colors.textSecondary}>{detail}</AppText> : null}
      </View>
      <Icon name="chevron-right" directional color={colors.textSecondary} />
    </Pressable>
  );
}

function ChipGroup<T extends string>({ label, options, selected, onToggle, optionLabel }: { label: string; options: T[]; selected: T[]; onToggle: (v: T) => void; optionLabel: (v: T) => string }) {
  return (
    <View style={styles.group}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip key={o} label={optionLabel(o)} selected={selected.includes(o)} onPress={() => onToggle(o)} />
        ))}
      </View>
    </View>
  );
}

function useSaver() {
  const toast = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const save = async (action: () => Promise<unknown>) => {
    if (saving) return false;
    setSaving(true);
    try {
      await action();
      await queryClient.invalidateQueries();
      toast(t('admin.saved'));
      return true;
    } catch (e) {
      toast(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { saving, save };
}

// ── Home: gyms + bookings ──

export function AdminHomeScreen() {
  const { t } = useTranslation();
  const gyms = useGyms();
  return (
    <AdminOnly>
      <Screen scroll edges={[]} contentStyle={styles.content}>
        <Stack.Screen options={{ title: t('admin.title') }} />
        <LinkRow label={t('admin.bookings')} onPress={() => router.push('/admin/bookings')} />
        <AppText variant="overline" color={colors.textTertiary}>{t('admin.gyms')}</AppText>
        {gyms.isPending ? <LoadingState /> : null}
        {gyms.isError ? <EmptyState icon="alert-circle-outline" title={t('errors.generic')} action={{ label: t('common.retry'), onPress: () => gyms.refetch() }} /> : null}
        {gyms.data?.map((g) => (
          <LinkRow key={g.id} label={g.name} detail={`${g.area} · ${qar(g.monthlyPrice)}`} onPress={() => router.push({ pathname: '/admin/gym/[id]', params: { id: g.id } })} />
        ))}
        <Button variant="outlined" label={t('admin.newGym')} onPress={() => router.push({ pathname: '/admin/gym/[id]', params: { id: 'new' } })} />
      </Screen>
    </AdminOnly>
  );
}

// ── Gym (edit or create) with its plans and trainers ──

export function AdminGymScreen({ id }: { id: string }) {
  const isNew = id === 'new';
  const gym = useGym(id); // "new" resolves to null
  return (
    <AdminOnly>
      {!isNew && gym.isPending ? (
        <Screen edges={[]}><LoadingState /></Screen>
      ) : !isNew && !gym.data ? (
        <MissingRecord />
      ) : (
        <GymForm id={isNew ? null : id} initial={gym.data ?? null} />
      )}
    </AdminOnly>
  );
}

function MissingRecord() {
  const { t } = useTranslation();
  return (
    <Screen edges={[]}>
      <EmptyState icon="alert-circle-outline" title={t('admin.notFound')} action={{ label: t('admin.title'), onPress: () => router.navigate('/admin') }} />
    </Screen>
  );
}

function GymForm({ id, initial }: { id: string | null; initial: GymInput | null }) {
  const { t } = useTranslation();
  const { saving, save } = useSaver();
  const [f, setF] = useState({
    name: initial?.name ?? '',
    area: initial?.area ?? '',
    address: initial?.address ?? '',
    description: initial?.description ?? '',
    monthlyPrice: String(initial?.monthlyPrice ?? ''),
    trainerFromMonthly: String(initial?.trainerFromMonthly ?? ''),
    images: (initial?.images ?? []).join('\n'),
  });
  const [amenities, setAmenities] = useState<AmenityKey[]>(initial?.amenities ?? []);
  const [flags, setFlags] = useState({ isFeatured: initial?.isFeatured ?? false, isNearby: initial?.isNearby ?? false });
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [key]: v }));

  const monthly = toInt(f.monthlyPrice);
  const trainerFrom = toInt(f.trainerFromMonthly);
  const images = lines(f.images);
  const invalid = { name: !f.name.trim(), area: !f.area.trim(), monthlyPrice: monthly === null, trainerFromMonthly: trainerFrom === null, images: images.length === 0 };
  const err = (key: keyof typeof invalid) => (submitted && invalid[key] ? t('admin.required') : undefined);

  const onSave = async () => {
    setSubmitted(true);
    if (Object.values(invalid).some(Boolean) || monthly === null || trainerFrom === null) return;
    const input: GymInput = {
      name: f.name.trim(),
      area: f.area.trim(),
      address: f.address.trim(),
      description: f.description.trim(),
      monthlyPrice: monthly,
      trainerFromMonthly: trainerFrom,
      images,
      amenities,
      ...flags,
    };
    let savedId = id;
    const ok = await save(async () => {
      savedId = await adminRepository.saveGym(id, input);
    });
    if (ok && !id && savedId) router.replace({ pathname: '/admin/gym/[id]', params: { id: savedId } });
  };

  return (
    <Screen scroll edges={[]} contentStyle={styles.content} footer={<Button label={t('admin.save')} onPress={onSave} loading={saving} />}>
      <Stack.Screen options={{ title: id ? f.name || t('admin.gym') : t('admin.newGym') }} />
      <TextField label={t('admin.fields.name')} value={f.name} onChangeText={set('name')} error={err('name')} />
      <TextField label={t('admin.fields.area')} value={f.area} onChangeText={set('area')} error={err('area')} />
      <TextField label={t('admin.fields.address')} value={f.address} onChangeText={set('address')} />
      <TextField label={t('admin.fields.description')} value={f.description} onChangeText={set('description')} multiline />
      <TextField label={t('admin.fields.monthlyPrice')} value={f.monthlyPrice} onChangeText={set('monthlyPrice')} keyboardType="number-pad" error={err('monthlyPrice')} />
      <TextField label={t('admin.fields.trainerFromMonthly')} value={f.trainerFromMonthly} onChangeText={set('trainerFromMonthly')} keyboardType="number-pad" error={err('trainerFromMonthly')} />
      <TextField label={t('admin.fields.images')} value={f.images} onChangeText={set('images')} multiline autoCapitalize="none" error={err('images')} />
      <ChipGroup label={t('admin.fields.amenities')} options={AMENITIES} selected={amenities} onToggle={(a) => setAmenities((s) => toggle(s, a))} optionLabel={(a) => t(`amenities.${a}`)} />
      <View style={styles.chips}>
        <Chip label={t('admin.fields.featured')} selected={flags.isFeatured} onPress={() => setFlags((s) => ({ ...s, isFeatured: !s.isFeatured }))} />
        <Chip label={t('admin.fields.nearby')} selected={flags.isNearby} onPress={() => setFlags((s) => ({ ...s, isNearby: !s.isNearby }))} />
      </View>
      {id ? <GymPlans gymId={id} /> : null}
      {id ? <GymTrainers gymId={id} /> : null}
    </Screen>
  );
}

function GymPlans({ gymId }: { gymId: string }) {
  const { t } = useTranslation();
  const plans = usePlans(gymId);
  return (
    <View style={styles.group}>
      <AppText variant="overline" color={colors.textTertiary}>{t('admin.plans')}</AppText>
      {plans.data?.map((p) => <PlanEditor key={p.id} gymId={gymId} plan={p} />)}
    </View>
  );
}

function PlanEditor({ gymId, plan }: { gymId: string; plan: MembershipPlan }) {
  const { t } = useTranslation();
  const { saving, save } = useSaver();
  const [price, setPrice] = useState(String(plan.price));
  const [badge, setBadge] = useState(plan.badge ?? '');
  const value = toInt(price);
  return (
    <View style={styles.card}>
      <AppText variant="label">{t(`plans.${plan.kind}.name`)}</AppText>
      <TextField label={t('admin.fields.price')} value={price} onChangeText={setPrice} keyboardType="number-pad" error={value === null ? t('admin.required') : undefined} />
      <TextField label={t('admin.fields.badge')} value={badge} onChangeText={setBadge} />
      <Button
        variant="outlined"
        label={t('admin.save')}
        loading={saving}
        onPress={() => value !== null && save(() => adminRepository.savePlan({ ...plan, gymId, price: value, badge: badge.trim() || null }))}
      />
    </View>
  );
}

function GymTrainers({ gymId }: { gymId: string }) {
  const { t } = useTranslation();
  const trainers = useTrainers(gymId, null);
  return (
    <View style={styles.group}>
      <AppText variant="overline" color={colors.textTertiary}>{t('admin.trainers')}</AppText>
      {trainers.data?.map((tr) => (
        <LinkRow key={tr.id} label={tr.name} detail={qar(tr.pricePerSession)} onPress={() => router.push({ pathname: '/admin/trainer/[id]', params: { id: tr.id } })} />
      ))}
      <Button variant="outlined" label={t('admin.newTrainer')} onPress={() => router.push({ pathname: '/admin/trainer/[id]', params: { id: 'new', gymId } })} />
    </View>
  );
}

// ── Trainer (edit or create) ──

export function AdminTrainerScreen({ id, gymId }: { id: string; gymId?: string }) {
  const isNew = id === 'new';
  const trainer = useTrainer(id); // "new" resolves to null
  return (
    <AdminOnly>
      {!isNew && trainer.isPending ? (
        <Screen edges={[]}><LoadingState /></Screen>
      ) : !isNew && !trainer.data ? (
        <MissingRecord />
      ) : (
        <TrainerForm id={isNew ? null : id} initial={trainer.data ?? null} gymId={trainer.data?.gymId ?? gymId ?? ''} />
      )}
    </AdminOnly>
  );
}

function TrainerForm({ id, initial, gymId }: { id: string | null; initial: TrainerInput | null; gymId: string }) {
  const { t } = useTranslation();
  const { saving, save } = useSaver();
  const gyms = useGyms();
  const [f, setF] = useState({
    name: initial?.name ?? '',
    title: initial?.title ?? '',
    bio: initial?.bio ?? '',
    image: initial?.image ?? '',
    pricePerSession: String(initial?.pricePerSession ?? ''),
    yearsExperience: String(initial?.yearsExperience ?? ''),
    languages: (initial?.languages ?? []).join(', '),
    certifications: (initial?.certifications ?? []).join('\n'),
  });
  const [gym, setGym] = useState(gymId);
  const [specialties, setSpecialties] = useState<Specialty[]>(initial?.specialties ?? []);
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [key]: v }));

  const price = toInt(f.pricePerSession);
  const years = toInt(f.yearsExperience);
  const invalid = { name: !f.name.trim(), image: !f.image.trim(), pricePerSession: price === null, yearsExperience: years === null, gym: !gym };
  const err = (key: keyof typeof invalid) => (submitted && invalid[key] ? t('admin.required') : undefined);

  const onSave = async () => {
    setSubmitted(true);
    if (Object.values(invalid).some(Boolean) || price === null || years === null) return;
    const input: TrainerInput = {
      gymId: gym,
      name: f.name.trim(),
      title: f.title.trim(),
      bio: f.bio.trim(),
      image: f.image.trim(),
      pricePerSession: price,
      yearsExperience: years,
      languages: lines(f.languages),
      specialties,
      certifications: lines(f.certifications),
    };
    let savedId = id;
    const ok = await save(async () => {
      savedId = await adminRepository.saveTrainer(id, input);
    });
    if (ok && !id && savedId) router.replace({ pathname: '/admin/trainer/[id]', params: { id: savedId } });
  };

  return (
    <Screen scroll edges={[]} contentStyle={styles.content} footer={<Button label={t('admin.save')} onPress={onSave} loading={saving} />}>
      <Stack.Screen options={{ title: id ? f.name || t('admin.trainer') : t('admin.newTrainer') }} />
      <TextField label={t('admin.fields.name')} value={f.name} onChangeText={set('name')} error={err('name')} />
      <TextField label={t('admin.fields.title')} value={f.title} onChangeText={set('title')} />
      <TextField label={t('admin.fields.bio')} value={f.bio} onChangeText={set('bio')} multiline />
      <TextField label={t('admin.fields.image')} value={f.image} onChangeText={set('image')} autoCapitalize="none" error={err('image')} />
      <TextField label={t('admin.fields.pricePerSession')} value={f.pricePerSession} onChangeText={set('pricePerSession')} keyboardType="number-pad" error={err('pricePerSession')} />
      <TextField label={t('admin.fields.yearsExperience')} value={f.yearsExperience} onChangeText={set('yearsExperience')} keyboardType="number-pad" error={err('yearsExperience')} />
      <TextField label={t('admin.fields.languages')} value={f.languages} onChangeText={set('languages')} />
      <TextField label={t('admin.fields.certifications')} value={f.certifications} onChangeText={set('certifications')} multiline />
      <ChipGroup label={t('admin.fields.specialties')} options={SPECIALTIES} selected={specialties} onToggle={(s) => setSpecialties((list) => toggle(list, s))} optionLabel={(s) => t(`specialties.${s}`)} />
      <ChipGroup label={t('admin.fields.gym')} options={(gyms.data ?? []).map((g) => g.id)} selected={gym ? [gym] : []} onToggle={setGym} optionLabel={(gid) => gyms.data?.find((g) => g.id === gid)?.name ?? gid} />
      {err('gym') ? <AppText variant="bodyS" color={colors.error}>{err('gym')}</AppText> : null}
    </Screen>
  );
}

// ── Bookings overview ──

export function AdminBookingsScreen() {
  const { t } = useTranslation();
  const isAdmin = useSession((s) => s.user?.isAdmin === true);
  const bookings = useQuery({ queryKey: ['admin', 'bookings'], queryFn: () => adminRepository.listAllBookings(), enabled: isAdmin });
  return (
    <AdminOnly>
      <Screen scroll edges={[]} contentStyle={styles.content}>
        <Stack.Screen options={{ title: t('admin.bookings') }} />
        {bookings.isPending ? <LoadingState /> : null}
        {bookings.isError ? <EmptyState icon="alert-circle-outline" title={t('errors.generic')} action={{ label: t('common.retry'), onPress: () => bookings.refetch() }} /> : null}
        {bookings.data?.length === 0 ? <EmptyState icon="calendar-blank-outline" title={t('admin.noBookings')} /> : null}
        {bookings.data?.map((b) => <AdminBookingRow key={b.id} booking={b} />)}
      </Screen>
    </AdminOnly>
  );
}

function AdminBookingRow({ booking: b }: { booking: Booking }) {
  const { t } = useTranslation();
  const { saving, save } = useSaver();
  const when = b.date ? `${b.date.slice(0, 10)} ${b.timeLabel ?? ''}` : `${b.membershipStart ?? ''} → ${b.membershipEnd ?? ''}`;
  return (
    <View style={styles.card}>
      <AppText variant="label">{b.trainerName ?? b.planName ?? t('bookings.membership')} · {b.gymName}</AppText>
      <AppText variant="bodyS" color={colors.textSecondary}>{when}</AppText>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {b.guest.fullName} · {ltr(b.guest.phone)} · {qar(b.priceQar)} · {t(`bookings.status.${b.status}`)}
      </AppText>
      {b.status === 'confirmed' ? (
        <Button variant="outlined" label={t('admin.cancelBooking')} loading={saving} onPress={() => save(() => adminRepository.cancelBooking(b.id))} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  flex: { flex: 1, gap: 2 },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
});
