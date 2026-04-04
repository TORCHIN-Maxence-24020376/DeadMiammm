import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useAppTheme } from '@/providers/theme-provider';

type NotificationSetting = {
  key: 'expiring' | 'lowStock' | 'recipes';
  title: string;
  subtitle: string;
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
    },
    {
      key: 'lowStock',
      title: 'Stock faible',
      subtitle: `Notification quand quantité <= ${lowStockThreshold}`,
    },
    {
      key: 'recipes',
      title: 'Idées recettes',
      subtitle: 'Suggestion de recettes anti-gaspi',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Notifications</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            Ajuste les alertes qui t’aident au quotidien sans surcharge.
          </Text>
        </View>

        {settingsRows.map((row) => (
          <View key={row.key} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.rowText}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{row.title}</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{row.subtitle}</Text>
            </View>

            <Switch
              value={notifications[row.key]}
              onValueChange={(value) => setNotificationEnabled(row.key, value)}
              trackColor={{ false: palette.border, true: palette.accentPrimary }}
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
    height: 60,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
