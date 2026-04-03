import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/providers/theme-provider';

function RootNavigator() {
  const { navigationTheme, resolvedTheme } = useAppTheme();

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shopping-lists" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="scanner" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="expiring" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="recipes" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="category/[slug]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/theme" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}
