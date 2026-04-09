import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppSettingsProvider } from '@/providers/app-settings-provider';
import { InventoryProvider } from '@/providers/inventory-provider';
import { ShoppingListsProvider } from '@/providers/shopping-lists-provider';
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
        <Stack.Screen name="recipe/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="category/[slug]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/account" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/theme" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/inventory" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/history" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.keyboardAvoidingRoot}>
      <AppThemeProvider>
        <AppSettingsProvider>
          <InventoryProvider>
            <ShoppingListsProvider>
              <KeyboardAvoidingView
                style={styles.keyboardAvoidingRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}>
                <RootNavigator />
              </KeyboardAvoidingView>
            </ShoppingListsProvider>
          </InventoryProvider>
        </AppSettingsProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingRoot: {
    flex: 1,
  },
});
