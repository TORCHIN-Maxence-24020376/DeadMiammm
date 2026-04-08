import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

const actions = [
  {
    key: 'inventory',
    title: 'Inventaire intelligent',
    subtitle: 'Seuils expiration et stock faible',
    route: '/settings/inventory',
    icon: 'slider.horizontal.3',
  },
  { key: 'theme', title: 'Réglage thème', subtitle: 'Auto, clair ou sombre', route: '/settings/theme', icon: 'circle.lefthalf.filled' },
  { key: 'notif', title: 'Préférences notifications', subtitle: 'Rappels et alertes produits', route: '/settings/notifications', icon: 'bell.badge' },
  { key: 'history', title: 'History', subtitle: 'Recherches et scans mis en cache', route: '/settings/history', icon: 'clock.badge.exclamationmark' },
  { key: 'account', title: 'Compte et profil', subtitle: 'Informations personnelles', route: '/settings/account', icon: 'person.crop.circle' },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderBottomColor: palette.border }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Profil & paramètres</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => {
              router.push(action.route);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? palette.surfacePressed : palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <View style={[styles.leadingIcon, { backgroundColor: palette.surfaceSoft }]}> 
              <IconSymbol name={action.icon} size={18} color={palette.accentPrimary} />
            </View>

            <View style={styles.rowText}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{action.title}</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{action.subtitle}</Text>
            </View>

            <IconSymbol name="chevron.right" size={14} color={palette.textSecondary} />
          </Pressable>
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
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leadingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
