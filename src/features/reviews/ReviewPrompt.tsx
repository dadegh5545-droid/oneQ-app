import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useReviewStatus } from '@/data';
import type { ReviewTarget } from '@/domain/models';
import { useSession } from '@/features/auth/sessionStore';
import { space, useTheme } from '@/theme';

// Entry to rating a gym or trainer. Only signed-in users with a completed booking may rate (checked by the
// backend); others see why they cannot yet.
export function ReviewPrompt({ target, name }: { target: ReviewTarget; name: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const signedIn = useSession((s) => s.user !== null);
  const status = useReviewStatus(target, signedIn);
  const open = () => router.push({ pathname: '/review/[type]/[id]', params: { type: target.type, id: target.id, name } });

  if (!signedIn) {
    return (
      <Button variant="text" label={t(`reviews.signInTo.${target.type}`)} onPress={() => router.push('/auth/sign-in')} style={styles.start} />
    );
  }
  if (!status.data) return null;
  if (status.data.review) return <Button variant="outlined" label={t('reviews.editYours')} onPress={open} />;
  if (status.data.eligible) return <Button variant="outlined" label={t(`reviews.rate.${target.type}`)} onPress={open} />;
  return (
    <View style={styles.hint}>
      <AppText variant="bodyS" color={colors.textSecondary}>
        {t(`reviews.notEligible.${target.type}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  start: { alignSelf: 'flex-start' },
  hint: { paddingVertical: space.xs },
});
