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
    background: '#F4EFE6',
    elevatedBackground: '#FAF6EF',
    surface: '#FFFFFF',
    surfaceSoft: 'rgba(252, 248, 241, 0.96)',
    surfacePressed: '#EBE5D8',
    overlay: 'rgba(255, 253, 246, 0.82)',
    textPrimary: '#1A1208',
    textSecondary: '#5C4830',
    textTertiary: '#9C8870',
    textInverse: '#FEFCF7',
    border: 'rgba(110, 76, 36, 0.10)',
    borderStrong: 'rgba(110, 76, 36, 0.22)',
    accentPrimary: '#16A34A',
    accentPrimaryStrong: '#15803D',
    accentSecondary: '#86EFAC',
    success: '#22C55E',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#0284C7',
    glowPrimary: 'rgba(255, 255, 255, 0.82)',
    glowSecondary: 'rgba(22, 163, 74, 0.18)',
    highlightEdge: 'rgba(255, 255, 255, 0.96)',
    shadowDark: 'rgba(30, 18, 6, 0.16)',
    shadowLight: 'rgba(255, 252, 240, 0.96)',
    tabIconDefault: '#9A8870',
    tabIconSelected: '#16A34A',
  },
  dark: {
    background: '#080604',
    elevatedBackground: '#0F0A06',
    surface: '#1A1209',
    surfaceSoft: 'rgba(22, 15, 8, 0.97)',
    surfacePressed: '#120D07',
    overlay: 'rgba(8, 6, 3, 0.90)',
    textPrimary: '#EDE4CF',
    textSecondary: '#A8906E',
    textTertiary: '#6A5540',
    textInverse: '#0A0703',
    border: 'rgba(185, 145, 85, 0.13)',
    borderStrong: 'rgba(185, 145, 85, 0.26)',
    accentPrimary: '#2DBD52',
    accentPrimaryStrong: '#239E44',
    accentSecondary: '#68DC8A',
    success: '#2DBD52',
    warning: '#E09418',
    danger: '#D94040',
    info: '#2AA8D8',
    glowPrimary: 'rgba(255, 255, 255, 0.04)',
    glowSecondary: 'rgba(45, 189, 82, 0.14)',
    highlightEdge: 'rgba(255, 240, 200, 0.06)',
    shadowDark: 'rgba(0, 0, 0, 0.88)',
    shadowLight: 'rgba(50, 32, 8, 0.04)',
    tabIconDefault: '#6A5540',
    tabIconSelected: '#2DBD52',
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
