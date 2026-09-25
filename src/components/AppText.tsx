import { useTranslation } from 'react-i18next';
import { Text, type TextProps } from 'react-native';

import type { Language } from '@/i18n';
import { arabicFonts, colors, fonts, typography, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  // Script of the text when it differs from the UI language (e.g. "العربية" in the English UI).
  lang?: Language;
};

export function AppText({ variant = 'bodyM', color = colors.textPrimary, lang, style, ...rest }: Props) {
  const { i18n } = useTranslation();
  const { font, ...metrics } = typography[variant];
  const fontFamily = (lang ?? i18n.language) === 'ar' ? arabicFonts[font] : fonts[font];

  return <Text style={[{ fontFamily, color, textAlign: 'auto' }, metrics, style]} {...rest} />;
}
