import { createContext, useContext, type ReactNode } from 'react';

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
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ theme = defaultTheme, children }: { theme?: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
