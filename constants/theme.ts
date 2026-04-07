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
    background: '#EEF2FF',
    elevatedBackground: '#F5F8FF',
    surface: '#FFFFFF',
    surfaceSoft: 'rgba(255, 255, 255, 0.92)',
    surfacePressed: '#E2E8F8',
    overlay: 'rgba(238, 242, 255, 0.90)',
    textPrimary: '#0B1730',
    textSecondary: '#3A5280',
    textTertiary: '#7A92BF',
    textInverse: '#EEF2FF',
    border: 'rgba(58, 82, 128, 0.10)',
    borderStrong: 'rgba(58, 82, 128, 0.20)',
    accentPrimary: '#16A34A',
    accentPrimaryStrong: '#15803D',
    accentSecondary: '#4ADE80',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#0284C7',
    glowPrimary: 'rgba(255, 255, 255, 0.95)',
    glowSecondary: 'rgba(22, 163, 74, 0.12)',
    highlightEdge: 'rgba(255, 255, 255, 0.98)',
    shadowDark: 'rgba(11, 23, 48, 0.12)',
    shadowLight: 'rgba(238, 242, 255, 0.95)',
    tabIconDefault: '#7A92BF',
    tabIconSelected: '#16A34A',
  },
  dark: {
    background: '#070C18',
    elevatedBackground: '#0D1424',
    surface: '#14203A',
    surfaceSoft: 'rgba(18, 28, 50, 0.96)',
    surfacePressed: '#0F1930',
    overlay: 'rgba(7, 12, 24, 0.92)',
    textPrimary: '#E8EEFF',
    textSecondary: '#7C91BC',
    textTertiary: '#3F5070',
    textInverse: '#070C18',
    border: 'rgba(100, 128, 200, 0.14)',
    borderStrong: 'rgba(100, 128, 200, 0.26)',
    accentPrimary: '#22C55E',
    accentPrimaryStrong: '#16A34A',
    accentSecondary: '#4ADE80',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    glowPrimary: 'rgba(255, 255, 255, 0.04)',
    glowSecondary: 'rgba(34, 197, 94, 0.12)',
    highlightEdge: 'rgba(100, 130, 210, 0.10)',
    shadowDark: 'rgba(0, 0, 0, 0.85)',
    shadowLight: 'rgba(20, 40, 80, 0.20)',
    tabIconDefault: '#3F5070',
    tabIconSelected: '#22C55E',
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
  displayXl: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, fontFamily: Fonts.display },
  displayLg: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, fontFamily: Fonts.display },
  titleXl: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, fontFamily: Fonts.display },
  titleLg: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, fontFamily: Fonts.display },
  titleMd: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, fontFamily: Fonts.base },
  bodyLg: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const, fontFamily: Fonts.base },
  bodyMd: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const, fontFamily: Fonts.base },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, fontFamily: Fonts.base },
  labelLg: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const, fontFamily: Fonts.base },
  labelMd: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const, fontFamily: Fonts.base },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    fontFamily: Fonts.base,
    letterSpacing: 0.4,
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
  card: 26,
  surface: 22,
  button: 20,
  capsule: 999,
};

export function resolveTheme(mode: ThemeMode, systemMode: ResolvedTheme): ResolvedTheme {
  if (mode === 'system') {
    return systemMode;
  }
  return mode;
}
