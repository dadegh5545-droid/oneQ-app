import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { sectionPalette, type SectionAccent } from './sectionPalette';
import { arabicFonts, colors, fonts, radius, spacing, typography, type FontKey } from './tokens';

export type Theme = {
  colors: Record<keyof typeof colors, string>;
  fonts: Record<FontKey, string>;
  arabicFonts: Record<FontKey, string>;
  spacing: Record<keyof typeof spacing, number>;
  radius: Record<keyof typeof radius, number>;
  typography: typeof typography;
  // The colour of the section being shown; OneQ burgundy outside any section.
  sectionAccent: SectionAccent;
  // Arabic UI (Arabic fonts, right-to-left reading). ThemeProvider sets it from the UI language.
  isRTL: boolean;
  statusBarStyle: 'dark' | 'light';
};

// The current OneQ identity. It is also the context default, so components rendered outside the provider
// (e.g. the root error boundary) look exactly the same.
export const defaultTheme: Theme = {
  colors,
  fonts,
  arabicFonts,
  spacing,
  radius,
  typography,
  sectionAccent: sectionPalette.burgundy,
  isRTL: false,
  statusBarStyle: 'dark',
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ theme = defaultTheme, children }: { theme?: Theme; children: ReactNode }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const value = useMemo(() => ({ ...theme, isRTL }), [theme, isRTL]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
