import { colors as tokenColors, spacing } from './tokens';

// Theme entry point. New code reads the active theme with useTheme() (or makeStyles); the static exports
// below keep the files that are not migrated yet working with identical values (Phase 1 batches).

/** @deprecated — use useTheme() */
export const colors = tokenColors;

export const space = spacing;

export { arabicFonts, fonts, radius, screenPadding, spacing, typography, type FontKey, type TypographyVariant } from './tokens';
export { makeStyles } from './makeStyles';
export { sectionPalette, type SectionAccent, type SectionColorKey } from './sectionPalette';
export { defaultTheme, ThemeProvider, useTheme, type Theme } from './ThemeProvider';
