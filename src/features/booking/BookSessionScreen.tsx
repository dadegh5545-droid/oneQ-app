import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { SummaryCard } from '@/components/SummaryCard';
import { useAvailability } from '@/data';
import type { AvailabilityDay } from '@/data/repository';
import type { Gym, Trainer } from '@/domain/models';
import { slotLabel } from '@/domain/rules';
import { colors, radius, screenPadding, space } from '@/theme';
import { formatDate, localizeTime, qar, shortDate } from '@/utils/format';

import { continueToCheckout } from './continueToCheckout';
import { useDraft } from './draftStore';

// Dates are stored as "yyyy-MM-dd"; parse as a local date.
const toLocalDate = (iso: string) => new Date(`${iso}T00:00:00`);

// S11
export function BookSessionScreen() {
  const { t } = useTranslation();
  const gym = useDraft((s) => s.gym);
  const trainer = useDraft((s) => s.trainer);

  if (!gym || !trainer) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="calendar-remove-outline"
          title={t('booking.nothingTitle')}
          body={t('booking.nothingBody')}
          action={{ label: t('common.browseGyms'), onPress: () => router.navigate('/home') }}
        />
      </Screen>
    );
  }
  return <BookSession gym={gym} trainer={trainer} />;
}

function BookSession({ gym, trainer }: { gym: Gym; trainer: Trainer }) {
  const { t } = useTranslation();
  const availability = useAvailability(trainer.id);
  const date = useDraft((s) => s.date);
  const slot = useDraft((s) => s.slot);
  const { selectDate, selectSlot } = useDraft.getState();

  // Default to the first open day (06 §5); also covers a stale date from an earlier visit.
  useEffect(() => {
    const days = availability.data;
    if (!days || days.some((d) => d.date === date && !d.closed)) return;
    const firstOpen = days.find((d) => !d.closed);
    if (firstOpen) selectDate(firstOpen.date);
  }, [availability.data, date, selectDate]);

  const day = availability.data?.find((d) => d.date === date);

  // Drop a kept slot that is no longer bookable (taken, or now within the 60-minute lead time).
  useEffect(() => {
    if (slot && day && !day.slots.some((s) => s.id === slot.id && s.available)) selectSlot(undefined);
  }, [day, slot, selectSlot]);
  const firstName = trainer.name.split(' ')[0] ?? trainer.name;

  return (
    <Screen
      scroll
      edges={[]}
      contentStyle={styles.content}
      footer={<Button label={t('common.continue')} disabled={!slot} onPress={continueToCheckout} />}
    >
      <Stack.Screen options={{ title: t('booking.title', { name: firstName }) }} />
      {availability.isPending ? (
        <LoadingState />
      ) : availability.isError ? (
        <AppText color={colors.textSecondary}>{t('booking.timesError')}</AppText>
      ) : (
        <>
          <AppText variant="titleM">{date ? formatDate(toLocalDate(date), 'MMMM y') : ''}</AppText>
          <DateStrip days={availability.data} selected={date} onSelect={selectDate} />
          <View style={styles.section}>
            <AppText variant="headline">{t('booking.availableTimes')}</AppText>
            <View style={styles.times}>
              {day?.slots.map((s) => {
                const label = localizeTime(slotLabel(s.minutes));
                const selected = slot?.id === s.id;
                return (
                  <Pressable
                    key={s.id}
                    disabled={!s.available}
                    onPress={() => selectSlot(s)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: !s.available }}
                    accessibilityLabel={s.available ? label : `${label}, ${t('booking.unavailable')}`}
                    style={[styles.pill, selected && styles.pillSelected, !s.available && styles.pillDisabled]}
                  >
                    <AppText
                      variant="label"
                      color={selected ? colors.onPrimary : s.available ? colors.textPrimary : colors.textTertiary}
                      style={[styles.pillText, !s.available && styles.strike]}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}
      <SummaryCard
        title={t('booking.summary')}
        rows={[
          { label: t('booking.gym'), value: gym.name },
          { label: t('booking.trainer'), value: trainer.name },
          { label: t('booking.date'), value: date ? shortDate(toLocalDate(date)) : null },
          { label: t('booking.time'), value: slot ? localizeTime(slotLabel(slot.minutes)) : t('booking.selectTime') },
          { label: t('booking.sessions'), value: t('booking.oneSession') },
        ]}
        total={{ label: t('booking.price'), value: qar(trainer.pricePerSession) }}
      />
    </Screen>
  );
}

function DateStrip({ days, selected, onSelect }: { days: AvailabilityDay[]; selected?: string; onSelect: (d: string) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
      {days.map((d) => {
        const date = toLocalDate(d.date);
        const isSelected = d.date === selected;
        const weekday = formatDate(date, 'EEE');
        const dayNum = formatDate(date, 'd');
        return (
          <Pressable
            key={d.date}
            disabled={d.closed}
            onPress={() => onSelect(d.date)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: d.closed }}
            accessibilityLabel={`${formatDate(date, 'EEEE d MMMM')}${d.closed ? `, ${t('booking.closed')}` : ''}`}
            style={[styles.tile, isSelected && styles.tileSelected, d.closed && styles.tileDisabled]}
          >
            <AppText variant="bodyS" color={isSelected ? colors.onPrimary : d.closed ? colors.textTertiary : colors.textSecondary}>
              {weekday}
            </AppText>
            <AppText variant="headline" color={isSelected ? colors.onPrimary : d.closed ? colors.textTertiary : colors.textPrimary}>
              {dayNum}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  section: { gap: space.md },
  bleed: { marginHorizontal: -screenPadding },
  strip: { gap: space.sm, paddingHorizontal: screenPadding },
  tile: {
    width: 58,
    height: 76,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  tileSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tileDisabled: { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceVariant },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    height: 37,
    minWidth: 74,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillDisabled: { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceVariant },
  pillText: { fontSize: 14 },
  strike: { textDecorationLine: 'line-through' },
});
