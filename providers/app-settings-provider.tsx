import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type NotificationSettings = {
  expiring: boolean;
  lowStock: boolean;
  recipes: boolean;
};

type AppSettingsState = {
  expiringSoonDays: number;
  lowStockThreshold: number;
  notifications: NotificationSettings;
};

type AppSettingsContextValue = AppSettingsState & {
  isHydrating: boolean;
  setExpiringSoonDays: (nextValue: number) => void;
  setLowStockThreshold: (nextValue: number) => void;
  setNotificationEnabled: (key: keyof NotificationSettings, enabled: boolean) => void;
};

const APP_SETTINGS_STORAGE_KEY = 'deadmiammm.app-settings.v1';
const MIN_EXPIRING_DAYS = 1;
const MAX_EXPIRING_DAYS = 30;
const MIN_LOW_STOCK_THRESHOLD = 1;
const MAX_LOW_STOCK_THRESHOLD = 20;

const defaultSettings: AppSettingsState = {
  expiringSoonDays: 7,
  lowStockThreshold: 1,
  notifications: {
    expiring: true,
    lowStock: true,
    recipes: false,
  },
};

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettingsState>(defaultSettings);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<AppSettingsState>;
        const nextSettings: AppSettingsState = {
          expiringSoonDays: clampExpiringDays(parsed.expiringSoonDays),
          lowStockThreshold: clampLowStockThreshold(parsed.lowStockThreshold),
          notifications: {
            expiring:
              typeof parsed.notifications?.expiring === 'boolean'
                ? parsed.notifications.expiring
                : defaultSettings.notifications.expiring,
            lowStock:
              typeof parsed.notifications?.lowStock === 'boolean'
                ? parsed.notifications.lowStock
                : defaultSettings.notifications.lowStock,
            recipes:
              typeof parsed.notifications?.recipes === 'boolean'
                ? parsed.notifications.recipes
                : defaultSettings.notifications.recipes,
          },
        };

        if (isMounted) {
          setSettings(nextSettings);
        }
      } catch (error) {
        console.warn('App settings hydration failed:', error);
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch((error) => {
      console.warn('App settings persistence failed:', error);
    });
  }, [isHydrating, settings]);

  const setExpiringSoonDays = useCallback((nextValue: number) => {
    setSettings((previous) => ({
      ...previous,
      expiringSoonDays: clampExpiringDays(nextValue),
    }));
  }, []);

  const setLowStockThreshold = useCallback((nextValue: number) => {
    setSettings((previous) => ({
      ...previous,
      lowStockThreshold: clampLowStockThreshold(nextValue),
    }));
  }, []);

  const setNotificationEnabled = useCallback((key: keyof NotificationSettings, enabled: boolean) => {
    setSettings((previous) => ({
      ...previous,
      notifications: {
        ...previous.notifications,
        [key]: enabled,
      },
    }));
  }, []);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      ...settings,
      isHydrating,
      setExpiringSoonDays,
      setLowStockThreshold,
      setNotificationEnabled,
    }),
    [isHydrating, setExpiringSoonDays, setLowStockThreshold, setNotificationEnabled, settings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}

function clampExpiringDays(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultSettings.expiringSoonDays;
  }

  return Math.max(MIN_EXPIRING_DAYS, Math.min(MAX_EXPIRING_DAYS, Math.round(value)));
}

function clampLowStockThreshold(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultSettings.lowStockThreshold;
  }

  return Math.max(MIN_LOW_STOCK_THRESHOLD, Math.min(MAX_LOW_STOCK_THRESHOLD, Math.round(value)));
}
