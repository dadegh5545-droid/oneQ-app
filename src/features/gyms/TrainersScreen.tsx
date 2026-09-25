import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { RatingInline } from '@/components/RatingInline';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { useGym, useTrainers } from '@/data';
import type { Trainer } from '@/domain/models';
import { chipToSpecialty, SPECIALTY_CHIPS, type SpecialtyChip } from '@/domain/rules';
import { colors, radius, screenPadding, space } from '@/theme';
import { qar } from '@/utils/format';

// S09
export function TrainersScreen({ gymId }: { gymId: string }) {
  const { t } = useTranslation();
  const [chip, setChip] = useState<SpecialtyChip>('All');
  const gym = useGym(gymId);
  const trainers = useTrainers(gymId, chipToSpecialty(chip));

  const renderList = () => {
    if (trainers.isPending) return <LoadingState />;
    if (trainers.isError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('trainers.errorTitle')}
          body={t('trainers.errorBody')}
          action={{ label: t('common.retry'), onPress: () => trainers.refetch() }}
        />
      );
    }
    if (trainers.data.length === 0) {
      return <EmptyState icon="account-off-outline" title={t('trainers.emptyTitle')} body={t('trainers.emptyBody')} />;
    }
    return trainers.data.map((tr) => <TrainerCard key={tr.id} trainer={tr} />);
  };

  if (gym.isPending) return <Screen edges={[]}><LoadingState /></Screen>;
  if (!gym.data) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="store-remove-outline" title={t('trainers.notFoundTitle')} body={t('trainers.notFoundBody')} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={[]} contentStyle={styles.content}>
      <Stack.Screen options={{ title: gym.data.name }} />
      <View style={styles.headings}>
        <AppText variant="titleL">{t('trainers.title')}</AppText>
        <AppText color={colors.textSecondary}>{t('trainers.subtitle', { gym: gym.data.name })}</AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        {SPECIALTY_CHIPS.map((c) => (
          <Chip key={c} label={t(`specialtyChips.${c}`)} selected={chip === c} onPress={() => setChip(c)} />
        ))}
      </ScrollView>
      {renderList()}
    </Screen>
  );
}

function TrainerCard({ trainer }: { trainer: Trainer }) {
  const { t } = useTranslation();
  const specialty = trainer.specialties[0];
  const meta = t('trainers.yearsPrice', { years: trainer.yearsExperience, price: qar(trainer.pricePerSession) });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trainer.name}, ${trainer.rating}, ${meta}`}
      onPress={() => router.push({ pathname: '/trainer/[id]', params: { id: trainer.id } })}
      style={styles.card}
    >
      <View style={styles.cardBody}>
        <AppText variant="headline">{trainer.name}</AppText>
        {specialty ? <AppText color={colors.textSecondary}>{t(`specialties.${specialty}`)}</AppText> : null}
        <RatingInline rating={trainer.rating} reviewCount={trainer.reviewCount} />
        <AppText variant="bodyS" color={colors.textSecondary}>
          {meta}
        </AppText>
      </View>
      <Image source={trainer.image} style={styles.photo} contentFit="cover" transition={150} />
      <Icon name="chevron-right" directional color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  headings: { gap: space.xs },
  bleed: { marginHorizontal: -screenPadding },
  chips: { gap: space.sm, paddingHorizontal: screenPadding },
  card: {
    minHeight: 135,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  cardBody: { flex: 1, gap: space.xs },
  photo: { width: 82, height: 82, borderRadius: radius.sm, backgroundColor: colors.surfaceVariant },
});
