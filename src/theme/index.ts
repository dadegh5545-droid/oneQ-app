import type { TextStyle } from 'react-native';

// Tokens from docs/oneq-mobile-spec/07-UI-DESIGN-SYSTEM.md §1–3, §9
export const colors = {
  primary: '#5A0020',
  primaryPressed: '#45001A',
  onPrimary: '#FFFFFF',
  primaryTint: '#F3E6E6',
  background: '#F7F0EA',
  surface: '#FFFCF7',
  surfaceVariant: '#F1E7DD',
  outline: '#E7DBD1',
  textPrimary: '#231A18',
  textSecondary: '#7A6D68',
  textTertiary: '#A89C96',
  accent: '#B5561E',
  success: '#3F7A4F',
  successTint: '#E3EFE5',
  error: '#A3302F',
  snackbar: '#241C1B',
  overlayDark: 'rgba(0,0,0,0.35)',
} as const;

export const radius = { sm: 12, md: 16, lg: 20, pill: 999, tile: 14 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const screenPadding = space.xl;

// Latin fonts; Arabic equivalents are swapped in by AppText.
export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displaySemi: 'PlayfairDisplay_600SemiBold',
  body: 'Outfit_400Regular',
  bodyMedium: 'Outfit_500Medium',
  bodySemi: 'Outfit_600SemiBold',
  bodyBold: 'Outfit_700Bold',
} as const;

export type FontKey = keyof typeof fonts;

export const arabicFonts: Record<FontKey, string> = {
  display: 'IBMPlexSansArabic_700Bold',
  displaySemi: 'IBMPlexSansArabic_600SemiBold',
  body: 'IBMPlexSansArabic_400Regular',
  bodyMedium: 'IBMPlexSansArabic_500Medium',
  bodySemi: 'IBMPlexSansArabic_600SemiBold',
  bodyBold: 'IBMPlexSansArabic_700Bold',
};

type TypeStyle = { font: FontKey } & Pick<TextStyle, 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'>;

export const typography = {
  displayXL: { font: 'display', fontSize: 64, lineHeight: 72 },
  displayL: { font: 'display', fontSize: 30, lineHeight: 36 },
  titleL: { font: 'display', fontSize: 28, lineHeight: 34 },
  titleM: { font: 'display', fontSize: 24, lineHeight: 28 },
  headline: { font: 'bodySemi', fontSize: 18, lineHeight: 24 },
  bodyL: { font: 'body', fontSize: 16, lineHeight: 24 },
  bodyM: { font: 'body', fontSize: 15, lineHeight: 21 },
  bodyS: { font: 'body', fontSize: 13, lineHeight: 17 },
  label: { font: 'bodySemi', fontSize: 16, lineHeight: 20 },
  overline: { font: 'bodySemi', fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  price: { font: 'bodySemi', fontSize: 16, lineHeight: 22 },
} as const satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;
