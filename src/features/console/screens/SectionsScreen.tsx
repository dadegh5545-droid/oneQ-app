import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { consoleRepository } from '@/data';
import type { SectionInfo } from '@/data/amplify/dashboardRepository';
import { localized } from '@/features/dashboard/FacilityDashboard';
import { QueryState } from '@/features/dashboard/shared';
import { Badge, EmptyRow, Grid, PageHeader, Panel } from '@/features/dashboard/ui';
import { makeStyles, radius, sectionPalette, space, useTheme, type SectionColorKey } from '@/theme';
import { confirmAction } from '@/utils/confirm';
import { errorMessage } from '@/utils/errorMessage';

import { useConsoleFacilities, useConsoleSections, useDeleteSection, useSaveSection } from '../hooks';
import { toSectionInput } from '../sections';

// Sections: create (wizard), edit, show/hide, delete (only while no facility belongs to the section).
export function SectionsScreen() {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const sections = useConsoleSections();
  const facilities = useConsoleFacilities();
  const save = useSaveSection();
  const remove = useDeleteSection();
  const countOf = (slug: string) => (facilities.data ?? []).filter((f) => f.sectionId === slug).length;

  const toggle = async (s: SectionInfo) => {
    try {
      const categories = await consoleRepository.sectionCategories(s.slug);
      await save.mutateAsync({ slug: s.slug, input: { ...toSectionInput(s, categories), status: s.status === 'visible' ? 'hidden' : 'visible' } });
      toast(t('dashboard.saved'));
    } catch (e) {
      toast(errorMessage(e));
    }
  };
  const onDelete = (s: SectionInfo) =>
    confirmAction(t('console.sections.confirmDelete', { name: localized(s.nameAr, s.nameEn, isRTL) }), t('console.sections.delete'), () =>
      remove.mutate(s.slug, { onSuccess: () => toast(t('console.sections.deleted')), onError: (e) => toast(errorMessage(e)) }),
    );

  return (
    <>
      <PageHeader title={t('console.menu.sections')} subtitle={t('console.sections.subtitle')} right={<Button label={t('console.sections.add')} onPress={() => router.push('/console/section' as Href)} />} />
      {!sections.data ? (
        <QueryState query={sections} />
      ) : sections.data.length === 0 ? (
        <Panel>
          <EmptyRow text={t('console.sections.empty')} />
        </Panel>
      ) : (
        <Grid min={280}>
          {sections.data.map((s) => {
            const accent = sectionPalette[s.colorKey as SectionColorKey] ?? sectionPalette.slate;
            const n = countOf(s.slug);
            return (
              <Panel key={s.slug}>
                <View style={styles.head}>
                  <View style={[styles.icon, { backgroundColor: accent.accentSoft }]}>
                    <Icon name={s.icon as IconName} size={24} color={accent.accentInk} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="headline">{localized(s.nameAr, s.nameEn, isRTL)}</AppText>
                    <AppText variant="bodyS" color={colors.textSecondary}>
                      {t('console.sections.facilities', { count: n })} · {t('console.sections.order', { order: s.order })}
                    </AppText>
                  </View>
                </View>
                <View style={styles.badges}>
                  <Badge label={t(`console.sectionStatus.${s.status}`)} tone={s.status === 'visible' ? 'success' : 'neutral'} />
                  <Badge label={t(`console.bookingMode.${s.bookingMode}`)} tone="neutral" />
                </View>
                <View style={styles.actions}>
                  <Button variant="text" label={t('dashboard.edit')} onPress={() => router.push(`/console/section?slug=${s.slug}` as Href)} />
                  <Button variant="text" label={s.status === 'visible' ? t('console.sections.hide') : t('console.sections.show')} onPress={() => toggle(s)} />
                  <Button variant="text" label={t('console.sections.delete')} disabled={n > 0} onPress={() => onDelete(s)} />
                </View>
                {n > 0 ? (
                  <AppText variant="bodyS" color={colors.textTertiary}>
                    {t('console.sections.cannotDelete')}
                  </AppText>
                ) : null}
              </Panel>
            );
          })}
        </Grid>
      )}
    </>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));
