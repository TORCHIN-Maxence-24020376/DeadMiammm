import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemeMode, Typography } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';

const modes: { key: ThemeMode; title: string; subtitle: string }[] = [
  { key: 'system', title: 'Automatique', subtitle: 'Suit le thème du téléphone' },
  { key: 'light', title: 'Clair', subtitle: 'Version claire de l’app' },
  { key: 'dark', title: 'Sombre', subtitle: 'Version sombre de l’app' },
];

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { palette, mode, setMode, resolvedTheme } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Apparence</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.currentBadge, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
          <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>
            Thème actif : {resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}
          </Text>
        </View>

        <View style={styles.rows}>
          {modes.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setMode(item.key)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor:
                    mode === item.key
                      ? palette.accentPrimary
                      : pressed
                        ? palette.surfacePressed
                        : palette.surface,
                  borderColor: palette.border,
                },
              ]}>
              <View style={styles.rowText}>
                <Text
                  style={[
                    Typography.labelLg,
                    {
                      color: mode === item.key ? palette.textInverse : palette.textPrimary,
                    },
                  ]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    Typography.bodySm,
                    {
                      color: mode === item.key ? palette.textInverse : palette.textSecondary,
                    },
                  ]}>
                  {item.subtitle}
                </Text>
              </View>

              {mode === item.key ? (
                <IconSymbol name="checkmark.circle.fill" size={20} color={palette.textInverse} />
              ) : (
                <IconSymbol name="circle" size={20} color={palette.textTertiary} />
              )}
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
    gap: 12,
  },
  currentBadge: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  rows: {
    gap: 10,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
