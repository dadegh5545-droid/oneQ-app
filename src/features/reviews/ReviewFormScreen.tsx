import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateView';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { repository, useReviewStatus } from '@/data';
import type { ReviewTarget } from '@/domain/models';
import { track } from '@/services/analytics';
import { colors, space } from '@/theme';
import { confirmAction } from '@/utils/confirm';
import { errorMessage } from '@/utils/errorMessage';

const MAX_TEXT = 1000;

// Rate a gym or trainer (1–5 stars, optional text), or edit / remove your existing review.
export function ReviewFormScreen({ target, name }: { target: ReviewTarget; name: string }) {
  const { t } = useTranslation();
  const status = useReviewStatus(target, true);

  if (status.isPending) return <Screen edges={[]}><LoadingState /></Screen>;
  if (status.isError || !status.data || (!status.data.eligible && !status.data.review)) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="star-off-outline"
          title={status.isError ? errorMessage(status.error) : t(`reviews.notEligible.${target.type}`)}
          action={status.isError ? { label: t('common.retry'), onPress: () => status.refetch() } : { label: t('common.back'), onPress: () => router.back() }}
        />
      </Screen>
    );
  }
  return <ReviewForm target={target} name={name} existing={status.data.review} />;
}

function ReviewForm({ target, name, existing }: { target: ReviewTarget; name: string; existing: { id: string; rating: number; text: string } | null }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [text, setText] = useState(existing?.text ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Editing clears the previous error.
  const changeRating = (v: number) => {
    setFormError(null);
    setRating(v);
  };
  const changeText = (v: string) => {
    setFormError(null);
    setText(v);
  };

  // Averages, counts and review lists all change server-side.
  const refresh = () =>
    Promise.all(
      [['reviews'], ['reviewStatus'], ['gyms'], ['gym', target.id], ['trainer', target.id], ['trainers']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );

  const run = async (kind: 'save' | 'remove', action: () => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(kind);
    try {
      await action();
      await refresh();
      toast(t(done));
      router.back();
    } catch (e) {
      setFormError(errorMessage(e));
      setBusy(null);
    }
  };

  const onSave = () => {
    setSubmitted(true);
    if (rating < 1) return;
    run(
      'save',
      async () => {
        await repository.submitReview({ target, rating, text: text.trim(), reviewId: existing?.id });
        track({ name: target.type === 'gym' ? 'gym_review_submitted' : 'trainer_review_submitted', targetId: target.id, rating });
      },
      existing ? 'reviews.updated' : 'reviews.submitted',
    );
  };

  return (
    <Screen
      scroll
      edges={['bottom']}
      contentStyle={styles.content}
      footer={<Button label={t(existing ? 'reviews.saveEdit' : 'reviews.submit')} onPress={onSave} loading={busy === 'save'} />}
    >
      <Stack.Screen options={{ title: '' }} />
      <AppText variant="titleL">{t(existing ? 'reviews.editTitle' : `reviews.rate.${target.type}`)}</AppText>
      <AppText color={colors.textSecondary}>{name}</AppText>
      <View style={styles.group}>
        <AppText variant="label">{t('reviews.yourRating')}</AppText>
        <StarInput value={rating} onChange={changeRating} />
        {submitted && rating < 1 ? (
          <AppText variant="bodyS" color={colors.error}>
            {t('reviews.ratingRequired')}
          </AppText>
        ) : null}
      </View>
      <TextField
        label={t('reviews.comment')}
        value={text}
        onChangeText={changeText}
        multiline
        maxLength={MAX_TEXT}
        placeholder={t('reviews.commentHint')}
      />
      {formError ? (
        <AppText color={colors.error} accessibilityLiveRegion="polite">
          {formError}
        </AppText>
      ) : null}
      {existing ? (
        <Button
          variant="text"
          label={t('reviews.remove')}
          loading={busy === 'remove'}
          onPress={() => confirmAction(t('reviews.confirmRemove'), t('reviews.remove'), () => run('remove', () => repository.removeReview(existing.id), 'reviews.removed'))}
          style={styles.remove}
        />
      ) : null}
    </Screen>
  );
}

// 1–5 stars; each star is a radio button for screen readers.
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={t('reviews.yourRating')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={t('reviews.stars', { count: n })}
          hitSlop={4}
          onPress={() => onChange(n)}
          style={styles.star}
        >
          <Icon name={n <= value ? 'star' : 'star-outline'} size={32} color={colors.accent} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  group: { gap: space.sm },
  stars: { flexDirection: 'row', gap: space.xs },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  remove: { alignSelf: 'center' },
});
