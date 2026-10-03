import { Image } from 'expo-image';
import { addDays, format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { BookingAction, BookingRow, TrainerRow, WeeklyHours } from '@/domain/dashboard';
import { ltr } from '@/i18n';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';
import { localizeTime } from '@/utils/format';

import { useCurrentFacility } from '../FacilityDashboard';
import { useFacilityTrainers, useSetAvailability, useTrainerSchedule } from '../hooks';
import { BookingStatusBadge, bookingWhen, QueryState, shareText } from '../shared';
import { ChipRow, EmptyRow, Grid, ListRow, PageHeader, Panel, ToggleRow } from '../ui';
import { PractitionerEditor, toTrainerInput } from './PractitionersScreen';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// Saturday first (Qatar week); 0 = Sunday.
const WEEK = [6, 0, 1, 2, 3, 4, 5];
const DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PractitionerDetailScreen({ trainerId }: { trainerId: string }) {
  const { t } = useTranslation();
  const { facility } = useCurrentFacility();
  const trainers = useFacilityTrainers(facility.id);
  const trainer = trainers.data?.find((x) => x.id === trainerId);
  const [editing, setEditing] = useState(false);

  if (!trainer) return trainers.data ? <EmptyRow text={t('dashboard.notFound')} /> : <QueryState query={trainers} />;
  return (
    <>
      <PageHeader title={trainer.name} subtitle={trainer.title} right={<Button variant="outlined" label={t('dashboard.practitioners.editProfile')} onPress={() => setEditing((e) => !e)} />} />
      {editing ? <PractitionerEditor facilityId={facility.id} initial={toTrainerInput(trainer)} onDone={() => setEditing(false)} /> : null}
      <Grid min={340}>
        <AvailabilityPanel key={`${trainer.id}-${trainer.unavailable}-${trainer.unavailableFrom}-${trainer.unavailableUntil}`} trainer={trainer} others={(trainers.data ?? []).filter((x) => x.id !== trainer.id)} />
        <SchedulePanel trainer={trainer} />
      </Grid>
    </>
  );
}

function AvailabilityPanel({ trainer, others }: { trainer: TrainerRow; others: TrainerRow[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const save = useSetAvailability();
  const today = ymd(new Date());
  const upcoming = useTrainerSchedule(trainer.id, today);
  const [unavailable, setUnavailable] = useState(trainer.unavailable);
  const [mode, setMode] = useState<'open' | 'period'>(trainer.unavailableUntil ? 'period' : 'open');
  const [from, setFrom] = useState(trainer.unavailableFrom ?? today);
  const [until, setUntil] = useState(trainer.unavailableUntil ?? ymd(addDays(new Date(), 7)));
  const [days, setDays] = useState<number[]>([...new Set(trainer.weeklyHours.map((h) => h.weekday))]);
  const [open, setOpen] = useState(trainer.weeklyHours[0]?.open ?? '06:00');
  const [close, setClose] = useState(trainer.weeklyHours[0]?.close ?? '22:00');
  const [affected, setAffected] = useState<BookingRow[] | null>(null);
  const [actions, setActions] = useState<Record<string, BookingAction>>({});

  const period = mode === 'period';
  const datesOk = !unavailable || (DAY.test(from) && (!period || (DAY.test(until) && until >= from)));
  const hoursOk = days.length === 0 || (TIME.test(open) && TIME.test(close) && open < close);
  const weeklyHours: WeeklyHours[] = days.map((weekday) => ({ weekday, open, close }));

  const inRange = (b: BookingRow) => {
    const day = (b.date ?? '').slice(0, 10);
    return b.status === 'confirmed' && day >= from && (!period || day <= until);
  };

  const submit = (list: Record<string, BookingAction>) =>
    save.mutate(
      {
        trainerId: trainer.id,
        unavailable,
        unavailableFrom: unavailable ? from : null,
        unavailableUntil: unavailable && period ? until : null,
        weeklyHours,
        actions: Object.values(list),
      },
      {
        onSuccess: (count) => {
          toast(count ? t('dashboard.availability.savedWithBookings', { count }) : t('dashboard.saved'));
          setAffected(null);
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );

  const onSave = () => {
    if (!datesOk || !hoursOk) return;
    const hit = unavailable ? (upcoming.data ?? []).filter(inRange) : [];
    if (hit.length === 0) return submit({});
    setActions(Object.fromEntries(hit.map((b) => [b.id, { bookingId: b.id, action: 'keep' as const }])));
    setAffected(hit);
  };

  return (
    <Panel title={t('dashboard.availability.title')}>
      <ToggleRow label={t('dashboard.availability.unavailable')} hint={t('dashboard.availability.unavailableHint')} value={unavailable} onChange={setUnavailable} />
      {unavailable ? (
        <>
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'open', label: t('dashboard.availability.openEnded') },
              { value: 'period', label: t('dashboard.availability.period') },
            ]}
          />
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label={t('dashboard.availability.from')} value={from} onChangeText={setFrom} placeholder="2026-10-01" autoCapitalize="none" error={!DAY.test(from) ? t('dashboard.availability.dateFormat') : undefined} />
            </View>
            {period ? (
              <View style={styles.flex}>
                <TextField label={t('dashboard.availability.until')} value={until} onChangeText={setUntil} placeholder="2026-10-15" autoCapitalize="none" error={!datesOk ? t('dashboard.availability.dateFormat') : undefined} />
              </View>
            ) : null}
          </View>
        </>
      ) : null}
      <AppText variant="label">{t('dashboard.availability.weeklyHours')}</AppText>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t('dashboard.availability.weeklyHint')}
      </AppText>
      <ChipRow>
        {WEEK.map((d) => (
          <Chip key={d} label={t(`days.${DAY_KEYS[d]}`)} selected={days.includes(d)} onPress={() => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]))} />
        ))}
      </ChipRow>
      {days.length > 0 ? (
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label={t('dashboard.availability.opens')} value={open} onChangeText={setOpen} placeholder="06:00" error={!hoursOk ? t('dashboard.availability.timeFormat') : undefined} />
          </View>
          <View style={styles.flex}>
            <TextField label={t('dashboard.availability.closes')} value={close} onChangeText={setClose} placeholder="22:00" />
          </View>
        </View>
      ) : null}

      {affected ? (
        <View style={styles.affected}>
          <AppText variant="label">{t('dashboard.availability.affectedTitle', { count: affected.length })}</AppText>
          <AppText variant="bodyS" color={colors.textSecondary}>
            {t('dashboard.availability.affectedHint')}
          </AppText>
          {affected.map((b) => {
            const a = actions[b.id];
            return (
              <View key={b.id} style={styles.affectedRow}>
                <AppText variant="label">{`${b.customerName} · ${bookingWhen(b)}`}</AppText>
                <ChipRow>
                  <Chip label={t('dashboard.availability.keep')} selected={a?.action === 'keep'} onPress={() => setActions((s) => ({ ...s, [b.id]: { bookingId: b.id, action: 'keep' } }))} />
                  {others.map((o) => (
                    <Chip
                      key={o.id}
                      label={t('dashboard.availability.moveTo', { name: o.name })}
                      selected={a?.action === 'reassign' && a.trainerId === o.id}
                      onPress={() => setActions((s) => ({ ...s, [b.id]: { bookingId: b.id, action: 'reassign', trainerId: o.id } }))}
                    />
                  ))}
                </ChipRow>
              </View>
            );
          })}
          <View style={styles.pair}>
            <Button label={t('dashboard.availability.confirm')} onPress={() => submit(actions)} loading={save.isPending} style={styles.flex} />
            <Button variant="outlined" label={t('dashboard.cancel')} onPress={() => setAffected(null)} style={styles.flex} />
          </View>
        </View>
      ) : (
        <Button label={t('dashboard.save')} onPress={onSave} loading={save.isPending} disabled={!datesOk || !hoursOk} />
      )}
    </Panel>
  );
}

function SchedulePanel({ trainer }: { trainer: TrainerRow }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const [range, setRange] = useState<'day' | 'week'>('day');
  const from = ymd(new Date());
  const to = ymd(addDays(new Date(), range === 'day' ? 0 : 6));
  const schedule = useTrainerSchedule(trainer.id, from, to);
  const rows = useMemo(() => (schedule.data ?? []).filter((b) => b.status !== 'cancelled'), [schedule.data]);

  const share = () => {
    const title = t(range === 'day' ? 'dashboard.schedule.shareTitleDay' : 'dashboard.schedule.shareTitleWeek', { name: trainer.name });
    const lines = rows.map((b) => `• ${bookingWhen(b)} — ${b.customerName}${b.customerPhone ? ` (${b.customerPhone})` : ''}`);
    void shareText([title, '', ...(lines.length ? lines : [t('dashboard.schedule.empty')])].join('\n'), `${trainer.id}-${from}.txt`);
  };

  return (
    <Panel title={t('dashboard.schedule.title')} action={<Button variant="text" label={t('dashboard.schedule.share')} onPress={share} />}>
      <View style={styles.photoRow}>
        <Image source={trainer.image} style={styles.photo} contentFit="cover" />
        <AppText variant="bodyS" color={colors.textSecondary} style={styles.flex}>
          {t('dashboard.schedule.hint')}
        </AppText>
      </View>
      <SegmentedControl
        value={range}
        onChange={setRange}
        options={[
          { value: 'day', label: t('dashboard.schedule.today') },
          { value: 'week', label: t('dashboard.schedule.week') },
        ]}
      />
      {!schedule.data ? <QueryState query={schedule} /> : null}
      {schedule.data && rows.length === 0 ? <EmptyRow text={t('dashboard.schedule.empty')} /> : null}
      {rows.map((b) => (
        <ListRow
          key={b.id}
          title={b.customerName}
          subtitle={`${b.timeLabel ? localizeTime(b.timeLabel) : ''} · ${bookingWhen(b)}${b.customerPhone ? ` · ${ltr(b.customerPhone)}` : ''}`}
          end={<BookingStatusBadge booking={b} />}
        />
      ))}
      <AppText variant="bodyS" color={colors.textTertiary}>
        {t('dashboard.schedule.pdfSoon')}
      </AppText>
    </Panel>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: space.md },
  affected: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceVariant },
  affectedRow: { gap: space.xs, paddingVertical: space.xs },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  photo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceVariant },
}));
