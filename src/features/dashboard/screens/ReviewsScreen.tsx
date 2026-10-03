import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { ReviewRow } from '@/domain/dashboard';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { StarDistribution } from '../charts';
import { useCurrentFacility } from '../FacilityDashboard';
import { useFacilityReviews, useReplyReview } from '../hooks';
import { QueryState, shortDay, Stars } from '../shared';
import { Badge, EmptyRow, Grid, PageHeader, Panel } from '../ui';

// Reviews: average and distribution, and a public reply from the facility. A review itself is never edited.
export function ReviewsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { facility } = useCurrentFacility();
  const reviews = useFacilityReviews(facility.id);
  const list = reviews.data ?? [];
  const counts = [1, 2, 3, 4, 5].map((s) => list.filter((r) => r.rating === s).length);
  const average = list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : 0;

  return (
    <>
      <PageHeader title={t('dashboard.reviews.title')} subtitle={t('dashboard.reviews.readOnly')} />
      {!reviews.data ? (
        <QueryState query={reviews} />
      ) : (
        <>
          <Grid min={280}>
            <Panel title={t('dashboard.reviews.average')}>
              <View style={styles.average}>
                <AppText variant="displayXL" lang="en">
                  {average.toFixed(1)}
                </AppText>
                <View>
                  <Stars rating={Math.round(average)} />
                  <AppText color={colors.textSecondary}>{t('dashboard.reviews.count', { count: list.length })}</AppText>
                </View>
              </View>
            </Panel>
            <Panel title={t('dashboard.reviews.distribution')}>
              <StarDistribution counts={counts} />
            </Panel>
          </Grid>
          <Panel>
            {list.length === 0 ? <EmptyRow text={t('dashboard.empty.reviews')} /> : null}
            {list.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </Panel>
        </>
      )}
    </>
  );
}

function ReviewItem({ review }: { review: ReviewRow }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const reply = useReplyReview();
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const send = () => {
    if (!draft.trim()) return;
    reply.mutate(
      { reviewId: review.id, reply: draft.trim() },
      {
        onSuccess: () => {
          toast(t('dashboard.reviews.replied'));
          setOpen(false);
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };

  return (
    <View style={styles.item}>
      <View style={styles.head}>
        <Stars rating={review.rating} />
        <AppText variant="bodyS" color={colors.textTertiary}>
          {shortDay(review.date)}
        </AppText>
      </View>
      <View style={styles.meta}>
        <AppText variant="label">{review.authorName}</AppText>
        {review.trainerName ? <Badge label={review.trainerName} tone="accent" /> : null}
        {review.satisfied === false ? <Badge label={t('dashboard.reviews.notSatisfied')} tone="warning" /> : null}
      </View>
      {review.text ? <AppText>{review.text}</AppText> : null}
      {review.ownerReply ? (
        <View style={styles.reply}>
          <AppText variant="bodyS" color={colors.textSecondary}>
            {t('dashboard.reviews.yourReply')}
          </AppText>
          <AppText>{review.ownerReply}</AppText>
        </View>
      ) : open ? (
        <View style={styles.replyForm}>
          <TextField label={t('dashboard.reviews.replyLabel')} value={draft} onChangeText={setDraft} multiline />
          <View style={styles.buttons}>
            <Button label={t('dashboard.reviews.send')} onPress={send} loading={reply.isPending} disabled={!draft.trim()} style={styles.flex} />
            <Button variant="outlined" label={t('dashboard.cancel')} onPress={() => setOpen(false)} style={styles.flex} />
          </View>
        </View>
      ) : (
        <Button variant="text" label={t('dashboard.reviews.reply')} onPress={() => setOpen(true)} />
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  average: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  item: { gap: space.xs, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  reply: { gap: 2, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.surfaceVariant },
  replyForm: { gap: space.sm },
  buttons: { flexDirection: 'row', gap: space.sm },
}));
