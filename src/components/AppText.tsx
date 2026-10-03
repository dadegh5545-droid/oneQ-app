import { Text, type TextProps } from 'react-native';

import { alignStart, type Language } from '@/i18n';
import { typography, useTheme, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  // Script of the text when it differs from the UI language (e.g. "العربية" in the English UI).
  lang?: Language;
};

export function AppText({ variant = 'bodyM', color, lang, style, ...rest }: Props) {
  const { arabicFonts, colors, fonts, isRTL } = useTheme();
  const { font, ...metrics } = typography[variant];
  const fontFamily = (lang ? lang === 'ar' : isRTL) ? arabicFonts[font] : fonts[font];

  return <Text style={[{ fontFamily, color: color ?? colors.textPrimary, textAlign: alignStart() }, metrics, style]} {...rest} />;
}
