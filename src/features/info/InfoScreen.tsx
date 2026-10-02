import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SelectableCard } from '@/components/SelectableCard';
import { currentLanguage, setLanguage, type Language } from '@/i18n';
import { space, useTheme } from '@/theme';

const PAGES = ['help', 'terms', 'privacy'] as const;
type Page = (typeof PAGES)[number];
const isPage = (s: string): s is Page => (PAGES as readonly string[]).includes(s);

// S20 — help | language | terms | privacy | fallback
export function InfoScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();

  if (slug === 'language') return <LanguagePage />;

  const key = isPage(slug) ? slug : 'fallback';
  return (
    <Screen scroll edges={[]}>
      <Stack.Screen options={{ title: t(`info.${key}.title`) }} />
      <AppText variant="bodyL">{t(`info.${key}.body`)}</AppText>
    </Screen>
  );
}

const LANGUAGES: Language[] = ['en', 'ar'];

// Actually switches EN (LTR) / AR (RTL) — the live site was display-only.
function LanguagePage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const current = currentLanguage();
  return (
    <Screen scroll edges={[]}>
      <Stack.Screen options={{ title: t('info.language.title') }} />
      <View style={styles.options} accessibilityRole="radiogroup">
        {LANGUAGES.map((lang) => {
          const selected = lang === current;
          return (
            <SelectableCard key={lang} selected={selected} onPress={() => !selected && setLanguage(lang)}>
              <AppText variant="label" lang={lang} style={styles.flex}>
                {t(`languageNames.${lang}`)}
              </AppText>
              <Icon
                name={selected ? 'check-circle' : 'radiobox-blank'}
                color={selected ? colors.primary : colors.textTertiary}
                size={22}
              />
            </SelectableCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.md },
  flex: { flex: 1 },
});
