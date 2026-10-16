import {useMemo} from 'react';

import {useTheme, type ThemeName} from './ThemeProvider';
import type {Palette} from './colors';

/**
 * Turns a stylesheet into one stylesheet per theme.
 *
 * Styles used to be built once, at module load, against a single palette — which
 * is why there was no dark mode: by the time anyone could ask what theme it was,
 * every colour in the app had already been decided. A style sheet is now a
 * function of the palette, built the first time each theme is used and kept, so
 * switching to dark and back is two cached objects rather than a rebuild.
 *
 * The point of taking the palette as an argument named `palette` is that the body
 * of the sheet does not change at all: `palette.canvas` inside the function means
 * what it always did.
 *
 *     const useStyles = makeStyles(palette => StyleSheet.create({...}));
 *     // and in the component:
 *     const styles = useStyles();
 */
export const makeStyles = <T extends Record<string, unknown>>(build: (palette: Palette) => T) => {
  const cache = new Map<ThemeName, T>();
  return (): T => {
    const {name, palette} = useTheme();
    // useMemo is not the cache — the Map is, so two screens on the same theme
    // share one sheet. This only keeps the lookup out of the render path.
    return useMemo(() => {
      const made = cache.get(name);
      if (made) return made;
      const fresh = build(palette);
      cache.set(name, fresh);
      return fresh;
    }, [name, palette]);
  };
};
