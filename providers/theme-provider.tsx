import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AppTheme, ResolvedTheme, resolveTheme, ThemeMode } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (nextMode: ThemeMode) => void;
  resolvedTheme: ResolvedTheme;
  palette: (typeof AppTheme)[ResolvedTheme];
  navigationTheme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_MODE_STORAGE_KEY = 'deadmiammm.theme-mode.v1';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = (useColorScheme() ?? 'light') as ResolvedTheme;
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isHydrated, setIsHydrated] = useState(false);
  const resolvedTheme = resolveTheme(mode, systemTheme);
  const palette = AppTheme[resolvedTheme];

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
        if (!raw) {
          return;
        }

        if (raw === 'system' || raw === 'light' || raw === 'dark') {
          if (isMounted) {
            setMode(raw);
          }
        }
      } catch (error) {
        console.warn('Theme settings hydration failed:', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode).catch((error) => {
      console.warn('Theme settings persistence failed:', error);
    });
  }, [isHydrated, mode]);

  const navigationTheme = useMemo<Theme>(() => {
    const baseTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: palette.background,
        card: palette.surface,
        border: palette.border,
        primary: palette.accentPrimary,
        text: palette.textPrimary,
        notification: palette.danger,
      },
    };
  }, [palette, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      resolvedTheme,
      palette,
      navigationTheme,
    }),
    [mode, palette, resolvedTheme, navigationTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
