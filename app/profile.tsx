import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

const actions = [
  {
    key: 'inventory',
    title: 'Inventaire intelligent',
    subtitle: 'Seuils expiration et stock faible',
    route: '/settings/inventory',
    icon: 'slider.horizontal.3',
    color: '#16A34A',
  },
  {
    key: 'theme',
    title: 'Réglage thème',
    subtitle: 'Auto, clair ou sombre',
    route: '/settings/theme',
    icon: 'circle.lefthalf.filled',
    color: '#8B5CF6',
  },
  {
    key: 'notif',
    title: 'Préférences notifications',
    subtitle: 'Rappels et alertes produits',
    route: '/settings/notifications',
    icon: 'bell.badge',
    color: '#D97706',
  },
  {
    key: 'account',
    title: 'Compte et profil',
    subtitle: 'Informations personnelles',
    route: '/settings/account',
    icon: 'person.crop.circle',
    color: '#0284C7',
  },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();

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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Profil & paramètres</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.profileBanner, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <View style={[styles.profileAvatar, { backgroundColor: palette.glowSecondary }]}>
            <IconSymbol name="person.crop.circle.fill" size={36} color={palette.accentPrimary} />
          </View>
          <View style={styles.profileText}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Mon espace</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Gérez votre inventaire intelligent</Text>
          </View>
        </View>

        <View style={styles.rows}>
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
                  shadowColor: palette.shadowDark,
                },
              ]}>
              <View style={[styles.leadingIcon, { backgroundColor: action.color + '1A' }]}>
                <IconSymbol name={action.icon} size={20} color={action.color} />
              </View>

              <View style={styles.rowText}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{action.title}</Text>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{action.subtitle}</Text>
              </View>

              <IconSymbol name="chevron.right" size={14} color={palette.textTertiary} />
            </Pressable>
          ))}
        </View>
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
  profileBanner: {
    borderRadius: Radii.card,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  rows: {
    gap: 10,
  },
  row: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  leadingIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
