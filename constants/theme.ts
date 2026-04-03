import { Platform } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type AppPalette = {
  background: string;
  elevatedBackground: string;
  surface: string;
  surfaceSoft: string;
  surfacePressed: string;
  overlay: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderStrong: string;
  accentPrimary: string;
  accentPrimaryStrong: string;
  accentSecondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  glowPrimary: string;
  glowSecondary: string;
  highlightEdge: string;
  shadowDark: string;
  shadowLight: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

export const AppTheme: Record<ResolvedTheme, AppPalette> = {
  light: {
    background: '#EEF1F7',
    elevatedBackground: '#F6F8FC',
    surface: '#FFFFFF',
    surfaceSoft: 'rgba(255, 255, 255, 0.74)',
    surfacePressed: '#E4E9F2',
    overlay: 'rgba(255, 255, 255, 0.65)',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textTertiary: '#8B93A6',
    textInverse: '#F8FAFC',
    border: 'rgba(51, 65, 85, 0.15)',
    borderStrong: 'rgba(51, 65, 85, 0.24)',
    accentPrimary: '#0A84FF',
    accentPrimaryStrong: '#0061D6',
    accentSecondary: '#5AC8FA',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF453A',
    info: '#64D2FF',
    glowPrimary: 'rgba(255, 255, 255, 0.7)',
    glowSecondary: 'rgba(10, 132, 255, 0.22)',
    highlightEdge: 'rgba(255, 255, 255, 0.9)',
    shadowDark: 'rgba(17, 24, 39, 0.16)',
    shadowLight: 'rgba(255, 255, 255, 0.92)',
    tabIconDefault: '#637083',
    tabIconSelected: '#0A84FF',
  },
  dark: {
    background: '#070D18',
    elevatedBackground: '#101827',
    surface: '#1A2333',
    surfaceSoft: 'rgba(30, 41, 59, 0.82)',
    surfacePressed: '#0F1726',
    overlay: 'rgba(15, 23, 38, 0.74)',
    textPrimary: '#F4F8FF',
    textSecondary: '#B7C2D6',
    textTertiary: '#8893A9',
    textInverse: '#111827',
    border: 'rgba(148, 163, 184, 0.2)',
    borderStrong: 'rgba(148, 163, 184, 0.32)',
    accentPrimary: '#0A84FF',
    accentPrimaryStrong: '#5AC8FA',
    accentSecondary: '#64D2FF',
    success: '#30D158',
    warning: '#FFB340',
    danger: '#FF6961',
    info: '#64D2FF',
    glowPrimary: 'rgba(255, 255, 255, 0.16)',
    glowSecondary: 'rgba(10, 132, 255, 0.32)',
    highlightEdge: 'rgba(255, 255, 255, 0.18)',
    shadowDark: 'rgba(0, 0, 0, 0.52)',
    shadowLight: 'rgba(125, 145, 180, 0.12)',
    tabIconDefault: '#95A4BD',
    tabIconSelected: '#64D2FF',
  },
};

export const Colors = {
  light: {
    text: AppTheme.light.textPrimary,
    background: AppTheme.light.background,
    tint: AppTheme.light.accentPrimary,
    icon: AppTheme.light.textSecondary,
    tabIconDefault: AppTheme.light.tabIconDefault,
    tabIconSelected: AppTheme.light.tabIconSelected,
  },
  dark: {
    text: AppTheme.dark.textPrimary,
    background: AppTheme.dark.background,
    tint: AppTheme.dark.accentPrimary,
    icon: AppTheme.dark.textSecondary,
    tabIconDefault: AppTheme.dark.tabIconDefault,
    tabIconSelected: AppTheme.dark.tabIconSelected,
  },
};

export const Fonts = Platform.select({
  ios: {
    base: 'SF Pro Text',
    display: 'SF Pro Display',
    rounded: 'SF Pro Rounded',
    mono: 'SF Mono',
  },
  default: {
    base: 'System',
    display: 'System',
    rounded: 'System',
    mono: 'monospace',
  },
  web: {
    base: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    rounded: "'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', ui-monospace, Menlo, Monaco, monospace",
  },
});

export const Typography = {
  displayXl: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, fontFamily: Fonts.display },
  displayLg: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, fontFamily: Fonts.display },
  titleXl: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, fontFamily: Fonts.display },
  titleLg: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const, fontFamily: Fonts.display },
  titleMd: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, fontFamily: Fonts.base },
  bodyLg: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const, fontFamily: Fonts.base },
  bodyMd: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const, fontFamily: Fonts.base },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, fontFamily: Fonts.base },
  labelLg: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const, fontFamily: Fonts.base },
  labelMd: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const, fontFamily: Fonts.base },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    fontFamily: Fonts.base,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    fontFamily: Fonts.base,
    letterSpacing: 0.2,
  },
};

export const Radii = {
  card: 24,
  surface: 20,
  button: 16,
  capsule: 999,
};

export function resolveTheme(mode: ThemeMode, systemMode: ResolvedTheme): ResolvedTheme {
  if (mode === 'system') {
    return systemMode;
  }
  return mode;
}
