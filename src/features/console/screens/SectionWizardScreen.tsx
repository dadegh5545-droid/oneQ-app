import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon, type IconName } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { PresetType, SectionInput } from '@/domain/dashboard';
import { localized } from '@/features/dashboard/FacilityDashboard';
import { QueryState } from '@/features/dashboard/shared';
import { ChipRow, PageHeader, Panel, ToggleRow } from '@/features/dashboard/ui';
import { makeStyles, radius, sectionPalette, space, useTheme, type SectionColorKey } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { useConsoleFacilities, useConsoleSections, useSaveSection, useSectionCategories } from '../hooks';
import { PRESET_TYPES, presetAnswers, SECTION_ICONS, toSectionInput } from '../sections';

const STEPS = ['type', 'questions', 'categories', 'look', 'preview'] as const;
type Step = (typeof STEPS)[number];
const MAX_CATEGORIES = 12;
const PRESET_ICONS: Record<PresetType, IconName> = { gym: 'dumbbell', hospital: 'hospital-building', clinic: 'stethoscope', salon: 'face-woman-shimmer', other: 'shape-outline' };

// "Add section" wizard (BRIEF v2 §3): type → simple yes/no questions (building blocks) → categories → look →
// preview. Editing opens the same steps with the saved answers.
export function SectionWizardScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = params.slug ?? null;
  const sections = useConsoleSections();
  const categories = useSectionCategories(slug);
  const facilities = useConsoleFacilities();
  // Editing starts from the saved answers once the section and its categories have loaded.
  const input = useMemo(() => {
    const s = slug ? sections.data?.find((x) => x.slug === slug) : undefined;
    return s && categories.data ? toSectionInput(s, categories.data.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }))) : null;
  }, [slug, sections.data, categories.data]);

  if (!sections.data || (slug && !input)) return <QueryState query={slug ? categories : sections} />;
  const facilityCount = slug ? (facilities.data ?? []).filter((f) => f.sectionId === slug).length : 0;
  return (
    <Wizard
      key={slug ?? 'new'}
      slug={slug}
      initial={input}
      nextOrder={sections.data.length + 1}
      facilityCount={facilityCount}
      title={slug ? t('console.wizard.editTitle') : t('console.wizard.newTitle')}
    />
  );
}

function Wizard({ slug, initial, nextOrder, facilityCount, title }: { slug: string | null; initial: SectionInput | null; nextOrder: number; facilityCount: number; title: string }) {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const save = useSaveSection();
  const [step, setStep] = useState<Step>(initial ? 'questions' : 'type');
  const [s, setS] = useState<SectionInput>(initial ?? presetAnswers('other', nextOrder));
  const [order, setOrder] = useState(String((initial ?? s).order));
  const set = <K extends keyof SectionInput>(key: K, value: SectionInput[K]) => setS((x) => ({ ...x, [key]: value }));
  const steps = STEPS.filter((x) => x !== 'categories' || s.hasServices);
  const index = steps.indexOf(step);
  const orderValue = /^\d{1,3}$/.test(order) ? Number(order) : null;
  const lookOk = !!s.nameAr.trim() && s.nameAr.length <= 60 && orderValue !== null && (!s.hasPractitioners || !!s.practitionerLabelAr?.trim());
  const categoriesOk = s.categories.length <= MAX_CATEGORIES && s.categories.every((c) => c.nameAr.trim());
  const canNext = step === 'look' ? lookOk : step === 'categories' ? categoriesOk : true;
  const accent = sectionPalette[s.colorKey as SectionColorKey] ?? sectionPalette.slate;

  const next = () => setStep(steps[Math.min(steps.length - 1, index + 1)]!);
  const back = () => (index === 0 ? router.back() : setStep(steps[index - 1]!));
  const choosePreset = (p: PresetType) => {
    setS(presetAnswers(p, orderValue ?? nextOrder));
    setStep('questions');
  };
  const onSave = () => {
    if (!lookOk || orderValue === null) return setStep('look');
    save.mutate(
      { slug, input: { ...s, order: orderValue, nameAr: s.nameAr.trim(), nameEn: s.nameEn?.trim() || null, categories: s.hasServices ? s.categories : [] } },
      {
        onSuccess: () => {
          toast(t('console.wizard.saved', { name: s.nameAr }));
          router.replace('/console/sections' as Href);
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };
  const blocks: { key: 'hasPractitioners' | 'hasServices' | 'hasDepartments' | 'hasPackages' | 'hasGallery'; q: string }[] = [
    { key: 'hasPractitioners', q: 'practitioners' },
    { key: 'hasServices', q: 'services' },
    { key: 'hasDepartments', q: 'departments' },
    { key: 'hasPackages', q: 'packages' },
    { key: 'hasGallery', q: 'gallery' },
  ];

  return (
    <>
      <PageHeader title={title} subtitle={t('console.wizard.step', { n: index + 1, total: steps.length, name: t(`console.wizard.steps.${step}`) })} />
      <View style={styles.progress}>
        {steps.map((x, i) => (
          <View key={x} style={[styles.progressPart, { backgroundColor: i <= index ? accent.accent : colors.surfaceVariant }]} />
        ))}
      </View>

      {step === 'type' ? (
        <Panel title={t('console.wizard.typeQuestion')}>
          <View style={styles.cards}>
            {PRESET_TYPES.map((p) => (
              <Pressable key={p} accessibilityRole="button" onPress={() => choosePreset(p)} style={({ pressed }) => [styles.typeCard, pressed && styles.pressed]}>
                <Icon name={PRESET_ICONS[p]} size={28} color={colors.primary} />
                <AppText variant="label">{t(`console.preset.${p}`)}</AppText>
                <AppText variant="bodyS" color={colors.textSecondary}>
                  {t(`console.presetHint.${p}`)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Panel>
      ) : null}

      {step === 'questions' ? (
        <Panel>
          {blocks.map((b) => (
            <View key={b.key} style={styles.question}>
              <ToggleRow label={t(`console.wizard.q.${b.q}`)} hint={t(`console.wizard.hint.${b.q}`)} value={s[b.key]} onChange={(v) => set(b.key, v)} />
              {b.key === 'hasPractitioners' && s.hasPractitioners ? (
                <View style={styles.pair}>
                  <View style={styles.flex}>
                    <TextField label={t('console.wizard.labelAr')} value={s.practitionerLabelAr ?? ''} onChangeText={(v) => set('practitionerLabelAr', v)} />
                  </View>
                  <View style={styles.flex}>
                    <TextField label={t('console.wizard.labelEn')} value={s.practitionerLabelEn ?? ''} onChangeText={(v) => set('practitionerLabelEn', v)} />
                  </View>
                </View>
              ) : null}
              {facilityCount > 0 && initial && initial[b.key] && !s[b.key] ? (
                <AppText variant="bodyS" color={colors.error}>
                  {t('console.wizard.blockOffWarning', { count: facilityCount })}
                </AppText>
              ) : null}
            </View>
          ))}
          <AppText variant="label">{t('console.wizard.q.booking')}</AppText>
          <ChipRow>
            {(['appointment', 'subscription', 'both'] as const).map((m) => (
              <Chip key={m} label={t(`console.bookingMode.${m}`)} selected={s.bookingMode === m} onPress={() => (facilityCount > 0 && initial ? undefined : set('bookingMode', m))} />
            ))}
          </ChipRow>
          {facilityCount > 0 && initial ? (
            <AppText variant="bodyS" color={colors.textTertiary}>
              {t('console.wizard.bookingLocked')}
            </AppText>
          ) : null}
        </Panel>
      ) : null}

      {step === 'categories' ? (
        <Panel title={t('console.wizard.categoriesTitle', { max: MAX_CATEGORIES })}>
          {s.categories.map((c, i) => (
            <View key={c.id ?? `new-${i}`} style={styles.categoryRow}>
              <View style={styles.flex}>
                <TextField label={t('console.wizard.categoryAr')} value={c.nameAr} onChangeText={(v) => set('categories', s.categories.map((x, j) => (j === i ? { ...x, nameAr: v } : x)))} />
              </View>
              <View style={styles.flex}>
                <TextField label={t('console.wizard.categoryEn')} value={c.nameEn ?? ''} onChangeText={(v) => set('categories', s.categories.map((x, j) => (j === i ? { ...x, nameEn: v || null } : x)))} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('console.wizard.moveUp')} disabled={i === 0} hitSlop={8} onPress={() => set('categories', swap(s.categories, i, i - 1))}>
                <Icon name="arrow-up" color={i === 0 ? colors.outline : colors.textPrimary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('console.wizard.removeCategory')} hitSlop={8} onPress={() => set('categories', s.categories.filter((_, j) => j !== i))}>
                <Icon name="close" color={colors.error} />
              </Pressable>
            </View>
          ))}
          <Button
            variant="outlined"
            label={t('console.wizard.addCategory')}
            disabled={s.categories.length >= MAX_CATEGORIES}
            onPress={() => set('categories', [...s.categories, { id: null, nameAr: '', nameEn: null }])}
          />
        </Panel>
      ) : null}

      {step === 'look' ? (
        <Panel>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label={t('console.wizard.nameAr')} value={s.nameAr} onChangeText={(v) => set('nameAr', v)} error={!s.nameAr.trim() ? t('dashboard.required') : undefined} />
            </View>
            <View style={styles.flex}>
              <TextField label={t('console.wizard.nameEn')} value={s.nameEn ?? ''} onChangeText={(v) => set('nameEn', v)} />
            </View>
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label={t('console.wizard.descAr')} value={s.descAr ?? ''} onChangeText={(v) => set('descAr', v || null)} />
            </View>
            <View style={styles.flex}>
              <TextField label={t('console.wizard.descEn')} value={s.descEn ?? ''} onChangeText={(v) => set('descEn', v || null)} />
            </View>
          </View>
          <AppText variant="label">{t('console.wizard.icon')}</AppText>
          <View style={styles.iconGrid}>
            {SECTION_ICONS.map((icon) => (
              <Pressable
                key={icon}
                accessibilityRole="button"
                accessibilityLabel={icon}
                accessibilityState={{ selected: s.icon === icon }}
                onPress={() => set('icon', icon)}
                style={[styles.iconCell, s.icon === icon && { borderColor: accent.accent, backgroundColor: accent.accentSoft }]}
              >
                <Icon name={icon} size={22} color={s.icon === icon ? accent.accentInk : colors.textSecondary} />
              </Pressable>
            ))}
          </View>
          <AppText variant="label">{t('console.wizard.color')}</AppText>
          <View style={styles.iconGrid}>
            {(Object.keys(sectionPalette) as SectionColorKey[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key}
                accessibilityState={{ selected: s.colorKey === key }}
                onPress={() => set('colorKey', key)}
                style={[styles.colorCell, { backgroundColor: sectionPalette[key].accent }, s.colorKey === key && styles.colorSelected]}
              />
            ))}
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label={t('console.wizard.order')} value={order} onChangeText={setOrder} keyboardType="number-pad" error={orderValue === null ? t('dashboard.required') : undefined} />
            </View>
            <View style={styles.flex}>
              <ToggleRow label={t('console.wizard.visible')} hint={t('console.wizard.visibleHint')} value={s.status === 'visible'} onChange={(v) => set('status', v ? 'visible' : 'hidden')} />
            </View>
          </View>
        </Panel>
      ) : null}

      {step === 'preview' ? (
        <Panel title={t('console.wizard.previewTitle')}>
          <View style={[styles.previewCard, { backgroundColor: accent.accentSoft }]}>
            <Icon name={s.icon as IconName} size={30} color={accent.accentInk} />
            <AppText variant="headline" color={accent.accentInk}>
              {localized(s.nameAr || '—', s.nameEn, isRTL)}
            </AppText>
            {s.descAr ? <AppText color={accent.accentInk}>{localized(s.descAr, s.descEn, isRTL)}</AppText> : null}
          </View>
          {[
            `${t('console.wizard.q.booking')}: ${t(`console.bookingMode.${s.bookingMode}`)}`,
            ...blocks.filter((b) => s[b.key]).map((b) => `✓ ${t(`console.wizard.block.${b.q}`)}${b.key === 'hasPractitioners' && s.practitionerLabelAr ? ` (${localized(s.practitionerLabelAr, s.practitionerLabelEn, isRTL)})` : ''}`),
            s.hasServices ? `${t('console.wizard.steps.categories')}: ${s.categories.map((c) => localized(c.nameAr, c.nameEn, isRTL)).join('، ') || '—'}` : null,
            `${t('console.wizard.visible')}: ${s.status === 'visible' ? t('console.sectionStatus.visible') : t('console.sectionStatus.hidden')}`,
          ]
            .filter(Boolean)
            .map((line) => (
              <AppText key={line!}>{`• ${line}`}</AppText>
            ))}
        </Panel>
      ) : null}

      <View style={styles.nav}>
        <Button variant="outlined" label={t('console.wizard.back')} onPress={back} style={styles.flex} />
        {step === 'preview' ? (
          <Button label={t('console.wizard.save')} onPress={onSave} loading={save.isPending} style={styles.flex} />
        ) : step !== 'type' ? (
          <Button label={t('console.wizard.next')} onPress={next} disabled={!canNext} style={styles.flex} />
        ) : null}
      </View>
    </>
  );
}

const swap = <T,>(list: T[], a: number, b: number) => {
  const next = [...list];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
};

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: space.xs },
  progressPart: { flex: 1, height: 6, borderRadius: radius.pill },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  typeCard: { flexGrow: 1, flexBasis: 160, gap: space.xs, padding: space.lg, borderRadius: 20, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.background },
  pressed: { opacity: 0.7 },
  question: { gap: space.sm, paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  iconCell: { width: 48, height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  colorCell: { width: 40, height: 40, borderRadius: 20 },
  colorSelected: { borderWidth: 3, borderColor: colors.textPrimary },
  previewCard: { gap: space.sm, padding: space.xl, borderRadius: 24 },
  nav: { flexDirection: 'row', gap: space.md },
}));
