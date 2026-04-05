import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, ThemeMode, Typography } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

const modes: { key: ThemeMode; title: string; subtitle: string; icon: string }[] = [
  { key: 'system', title: 'Automatique', subtitle: 'Suit le thème de l\u2019appareil', icon: 'circle.lefthalf.filled' },
  { key: 'light', title: 'Clair', subtitle: 'Interface lumineuse chaleureuse', icon: 'sun.max.fill' },
  { key: 'dark', title: 'Sombre', subtitle: 'Interface sombre premium', icon: 'moon.fill' },
];

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { palette, mode, setMode, resolvedTheme } = useAppTheme();

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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Réglage thème</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.currentBadge, { backgroundColor: palette.glowSecondary }]}>
          <View style={[styles.activeDot, { backgroundColor: palette.accentPrimary }]} />
          <Text style={[Typography.labelMd, { color: palette.accentPrimary }]}>
            Thème actif: {resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}
          </Text>
        </View>

        <View style={styles.rows}>
          {modes.map((item) => {
            const isActive = mode === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMode(item.key)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: isActive
                      ? palette.accentPrimary
                      : pressed
                        ? palette.surfacePressed
                        : palette.surface,
                    shadowColor: palette.shadowDark,
                  },
                ]}>
                <View style={[
                  styles.modeIcon,
                  { backgroundColor: isActive ? palette.textInverse + '22' : palette.glowSecondary },
                ]}>
                  <IconSymbol
                    name={item.icon}
                    size={20}
                    color={isActive ? palette.textInverse : palette.accentPrimary}
                  />
                </View>

                <View style={styles.rowText}>
                  <Text
                    style={[
                      Typography.labelLg,
                      { color: isActive ? palette.textInverse : palette.textPrimary },
                    ]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      Typography.bodySm,
                      { color: isActive ? palette.textInverse + 'CC' : palette.textSecondary },
                    ]}>
                    {item.subtitle}
                  </Text>
                </View>

                {isActive ? (
                  <IconSymbol name="checkmark.circle.fill" size={22} color={palette.textInverse} />
                ) : (
                  <IconSymbol name="circle" size={22} color={palette.textTertiary} />
                )}
              </Pressable>
            );
          })}
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
    gap: 14,
  },
  currentBadge: {
    borderRadius: Radii.capsule,
    paddingHorizontal: 14,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
