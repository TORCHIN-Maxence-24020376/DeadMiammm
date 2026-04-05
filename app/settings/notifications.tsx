import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useAppTheme } from '@/providers/theme-provider';

type NotificationSetting = {
  key: 'expiring' | 'lowStock' | 'recipes';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { notifications, expiringSoonDays, lowStockThreshold, setNotificationEnabled } = useAppSettings();

  const settingsRows: NotificationSetting[] = [
    {
      key: 'expiring',
      title: 'Produits proches de la date',
      subtitle: `Alerte pour les produits à ${expiringSoonDays} jour${expiringSoonDays > 1 ? 's' : ''} ou moins`,
      icon: 'clock.badge.exclamationmark',
      color: '#D97706',
    },
    {
      key: 'lowStock',
      title: 'Stock faible',
      subtitle: `Notification quand quantité <= ${lowStockThreshold}`,
      icon: 'archivebox',
      color: '#DC2626',
    },
    {
      key: 'recipes',
      title: 'Idées recettes',
      subtitle: 'Suggestion de recettes anti-gaspi',
      icon: 'sparkles',
      color: '#16A34A',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
          ]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Notifications</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: palette.glowSecondary }]}>
          <IconSymbol name="bell.badge" size={16} color={palette.accentPrimary} />
          <Text style={[Typography.bodySm, { color: palette.textSecondary, flex: 1 }]}>
            Ajuste les alertes qui t'aident au quotidien sans surcharge.
          </Text>
        </View>

        {settingsRows.map((row) => (
          <View
            key={row.key}
            style={[styles.row, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={[styles.rowIcon, { backgroundColor: row.color + '18' }]}>
              <IconSymbol name={row.icon} size={20} color={row.color} />
            </View>

            <View style={styles.rowText}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{row.title}</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{row.subtitle}</Text>
            </View>

            <Switch
              value={notifications[row.key]}
              onValueChange={(value) => setNotificationEnabled(row.key, value)}
              trackColor={{ false: palette.surfacePressed, true: palette.accentPrimary }}
              thumbColor={notifications[row.key] ? palette.textInverse : palette.surface}
            />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  infoCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  row: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
});
