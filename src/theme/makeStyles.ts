import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme, type Theme } from './ThemeProvider';

// Theme-aware styles: `const useStyles = makeStyles((theme) => ({ ... }))` at module level, then
// `const styles = useStyles()` in the component. The sheet is rebuilt only when the theme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
