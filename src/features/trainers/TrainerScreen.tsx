import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { RatingInline } from '@/components/RatingInline';
import { ReviewCard } from '@/components/ReviewCard';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { errorMessage } from '@/utils/errorMessage';
import { useGym, useTrainer, useTrainerReviews } from '@/data';
import type { Gym, Trainer } from '@/domain/models';
import { useDraft } from '@/features/booking/draftStore';
import { ReviewPrompt } from '@/features/reviews/ReviewPrompt';
import { track } from '@/services/analytics';
import { colors, radius, space } from '@/theme';
import { qar, rating } from '@/utils/format';

// S10
export function TrainerScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const trainer = useTrainer(id);
  // The gym is resolved from trainer.gymId, so booking works from any entry point (02 S10 mobile UX).
  const gym = useGym(trainer.data?.gymId ?? '');
  const found = !!trainer.data;

  useEffect(() => {
    if (found) track({ name: 'view_trainer', trainerId: id });
  }, [found, id]);

  if (trainer.isPending || (trainer.data && gym.isPending)) return <Screen edges={[]}><LoadingState /></Screen>;
  if (trainer.isError || gym.isError) {
    const retry = () => Promise.all([trainer.isError && trainer.refetch(), gym.isError && gym.refetch()]);
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('trainer.errorTitle')}
          body={errorMessage(trainer.error ?? gym.error)}
          action={{ label: t('common.retry'), onPress: retry }}
        />
      </Screen>
    );
  }
  if (!trainer.data || !gym.data) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="account-off-outline" title={t('trainer.notFoundTitle')} body={t('trainer.notFoundBody')} />
      </Screen>
    );
  }
  return <TrainerProfile trainer={trainer.data} gym={gym.data} />;
}

function TrainerProfile({ trainer, gym }: { trainer: Trainer; gym: Gym }) {
  const { t } = useTranslation();

  const onBook = () => {
    useDraft.getState().selectTrainer(trainer, gym);
    router.push('/booking');
  };

  return (
    <Screen
      scroll
      edges={[]}
      contentStyle={styles.content}
      footer={<Button label={t('trainer.book', { price: qar(trainer.pricePerSession) })} onPress={onBook} />}
    >
      <View style={styles.header}>
        <Image source={trainer.image} style={styles.photo} contentFit="cover" transition={150} />
        <View style={styles.headerText}>
          <AppText variant="titleL">{trainer.name}</AppText>
          <AppText color={colors.textSecondary}>{trainer.title}</AppText>
          <AppText variant="bodyS">{`${gym.name} · ${gym.area}`}</AppText>
          <RatingInline rating={trainer.rating} reviewCount={trainer.reviewCount} />
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={String(trainer.reviewCount)} label={t('trainer.reviews')} />
        <View style={styles.statDivider} />
        <Stat value={t('trainer.yearsShort', { count: trainer.yearsExperience })} label={t('trainer.experience')} />
        <View style={styles.statDivider} />
        <Stat value={rating(trainer.rating)} label={t('trainer.rating')} />
      </View>

      <Section title={t('trainer.about')}>
        <AppText variant="bodyL">{trainer.bio}</AppText>
      </Section>
      <Section title={t('trainer.specialties')}>
        <View style={styles.wrap}>
          {trainer.specialties.map((s) => (
            <Chip key={s} label={t(`specialties.${s}`)} />
          ))}
        </View>
      </Section>
      <Section title={t('trainer.experienceCerts')}>
        <InfoLine label={t('trainer.experience')} value={t('trainer.yearsLong', { count: trainer.yearsExperience })} />
        {trainer.certifications.map((c) => (
          <InfoLine key={c} label={t('trainer.certification')} value={c} />
        ))}
      </Section>
      <Section title={t('trainer.languages')}>
        <View style={styles.wrap}>
          {trainer.languages.map((l) => (
            <Chip key={l} label={t(`languages.${l}`, { defaultValue: l })} />
          ))}
        </View>
      </Section>
      <Section title={t('trainer.clientReviews')}>
        <ReviewPrompt target={{ type: 'trainer', id: trainer.id }} name={trainer.name} />
        <TrainerReviews trainerId={trainer.id} />
      </Section>
    </Screen>
  );
}

function TrainerReviews({ trainerId }: { trainerId: string }) {
  const { t } = useTranslation();
  const reviews = useTrainerReviews(trainerId);
  if (reviews.isPending) return <LoadingState />;
  if (reviews.isError) {
    return <EmptyState icon="alert-circle-outline" title={t('gym.reviewsErrorTitle')} body={errorMessage(reviews.error)} action={{ label: t('common.retry'), onPress: () => reviews.refetch() }} />;
  }
  if (reviews.data.length === 0) return <AppText color={colors.textSecondary}>{t('gym.noReviews')}</AppText>;
  return reviews.data.map((r) => <ReviewCard key={r.id} review={r} />);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="headline">{title}</AppText>
      {children}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="headline">{value}</AppText>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <AppText color={colors.textSecondary}>{label}</AppText>
      <AppText variant="label" style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  header: { flexDirection: 'row', gap: space.lg },
  photo: { width: 118, height: 132, borderRadius: radius.md, backgroundColor: colors.surfaceVariant },
  headerText: { flex: 1, gap: space.xs },
  stats: {
    flexDirection: 'row',
    paddingVertical: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.outline },
  section: { gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg },
  infoValue: { flexShrink: 1, fontSize: 15 },
});
