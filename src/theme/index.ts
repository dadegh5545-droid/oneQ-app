import { colors as tokenColors, spacing } from './tokens';

// Theme entry point. Components read the active theme with useTheme() (or makeStyles); importing the static
// `colors` below is a lint error outside src/theme (Phase 1 is complete).

/** @deprecated — use useTheme() */
export const colors = tokenColors;

export const space = spacing;

export { arabicFonts, fonts, radius, screenPadding, spacing, typography, type FontKey, type TypographyVariant } from './tokens';
export { makeStyles } from './makeStyles';
export { sectionPalette, type SectionAccent, type SectionColorKey } from './sectionPalette';
export { defaultTheme, ThemeProvider, useTheme, type Theme } from './ThemeProvider';
