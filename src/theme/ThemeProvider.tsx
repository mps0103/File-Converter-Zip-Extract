import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';

import {KEYS, store} from '@/services/storage';
import {
  darkInkGradient,
  darkPalette,
  inkGradient as lightInkGradient,
  lightPalette,
  type InkName,
  type Palette,
} from './colors';

/**
 * What the user picked, which is not the same as what is on screen. "System" is a
 * choice too — it means "follow the phone", and the phone can change its mind at
 * sunset without the user touching anything.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

/** What is actually being drawn, once "system" has been resolved. */
export type ThemeName = 'light' | 'dark';

type ThemeValue = {
  name: ThemeName;
  choice: ThemeChoice;
  palette: Palette;
  inkGradient: Record<InkName, [string, string]>;
  dark: boolean;
  setChoice: (next: ThemeChoice) => void;
};

const Ctx = createContext<ThemeValue | null>(null);

export const ThemeProvider = ({children}: {children: React.ReactNode}) => {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>('system');

  useEffect(() => {
    store.read<ThemeChoice>(KEYS.theme, 'system').then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setChoiceState(saved);
    });
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    store.write(KEYS.theme, next);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // useColorScheme reports null before Android has answered. Treating that as
    // light rather than guessing dark keeps the app from flashing the wrong theme
    // on the first frame of a cold start.
    const name: ThemeName = choice === 'system' ? (system === 'dark' ? 'dark' : 'light') : choice;
    const dark = name === 'dark';
    return {
      name,
      choice,
      dark,
      palette: dark ? darkPalette : lightPalette,
      inkGradient: dark ? darkInkGradient : lightInkGradient,
      setChoice,
    };
  }, [choice, system, setChoice]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTheme = (): ThemeValue => {
  const value = useContext(Ctx);
  if (!value) throw new Error('useTheme was called outside the ThemeProvider.');
  return value;
};
