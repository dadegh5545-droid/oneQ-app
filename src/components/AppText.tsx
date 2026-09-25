import { useTranslation } from 'react-i18next';
import { Text, type TextProps } from 'react-native';

import { arabicFonts, colors, fonts, typography, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

export function AppText({ variant = 'bodyM', color = colors.textPrimary, style, ...rest }: Props) {
  const { i18n } = useTranslation();
  const { font, ...metrics } = typography[variant];
  const fontFamily = i18n.language === 'ar' ? arabicFonts[font] : fonts[font];

  return <Text style={[{ fontFamily, color, textAlign: 'auto' }, metrics, style]} {...rest} />;
}
