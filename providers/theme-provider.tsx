import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import React, { createContext, useContext, useMemo, useState } from 'react';

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

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = (useColorScheme() ?? 'light') as ResolvedTheme;
  const [mode, setMode] = useState<ThemeMode>('system');
  const resolvedTheme = resolveTheme(mode, systemTheme);
  const palette = AppTheme[resolvedTheme];

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
