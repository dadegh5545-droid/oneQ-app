import { Image } from 'expo-image';
import { Redirect, router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/StateView';
import { useSession } from '@/features/auth/sessionStore';
import { makeStyles, radius, sectionPalette, space, useTheme, type SectionColorKey } from '@/theme';

import { localized } from '../FacilityDashboard';
import { useDashSections, useMyFacilities } from '../hooks';
import { QueryState } from '../shared';
import { Badge } from '../ui';

// "My facilities": an owner with one facility goes straight to its dashboard; admins see every facility.
export function FacilityPickerScreen() {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const isAdmin = useSession((s) => s.user?.isAdmin === true);
  const facilities = useMyFacilities();
  const sections = useDashSections();

  if (!facilities.data) {
    return (
      <Screen>
        <QueryState query={facilities} />
      </Screen>
    );
  }
  if (facilities.data.length === 1 && !isAdmin) return <Redirect href={`/dashboard/${facilities.data[0]!.id}` as Href} />;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="titleL" style={styles.flex}>
          {t('dashboard.picker.title')}
        </AppText>
        <Button variant="text" label={t('dashboard.shell.customerView')} onPress={() => router.navigate('/home')} />
      </View>
      {facilities.data.length === 0 ? <EmptyState icon="store-outline" title={t('dashboard.picker.emptyTitle')} body={t('dashboard.picker.emptyBody')} /> : null}
      {facilities.data.map((f) => {
        const section = sections.data?.find((s) => s.slug === f.sectionId);
        const accent = sectionPalette[(section?.colorKey ?? 'burgundy') as SectionColorKey] ?? sectionPalette.burgundy;
        return (
          <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={f.name} onPress={() => router.push(`/dashboard/${f.id}` as Href)} style={styles.card}>
            {f.images[0] ? <Image source={f.images[0]} style={styles.image} contentFit="cover" /> : <View style={styles.image} />}
            <View style={styles.body}>
              <AppText variant="headline" numberOfLines={1}>
                {f.name}
              </AppText>
              <View style={styles.meta}>
                <View style={[styles.dot, { backgroundColor: accent.accent }]} />
                <AppText color={colors.textSecondary}>{section ? localized(section.nameAr, section.nameEn, isRTL) : f.sectionId}</AppText>
              </View>
              <Badge label={t(`dashboard.facilityStatus.${f.status}`)} tone={f.status === 'approved' ? 'success' : f.status === 'suspended' ? 'danger' : 'warning'} />
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  content: { gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  image: { width: 84, height: 84, borderRadius: radius.sm, backgroundColor: colors.surfaceVariant },
  body: { flex: 1, gap: space.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
