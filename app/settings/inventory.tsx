import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useAppTheme } from '@/providers/theme-provider';

const MIN_EXPIRING_DAYS = 1;
const MAX_EXPIRING_DAYS = 30;
const MIN_LOW_STOCK_THRESHOLD = 1;
const MAX_LOW_STOCK_THRESHOLD = 20;

export default function InventorySettingsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { expiringSoonDays, lowStockThreshold, setExpiringSoonDays, setLowStockThreshold } = useAppSettings();

  const updateExpiringSoonDays = (step: -1 | 1) => {
    const nextValue = Math.max(MIN_EXPIRING_DAYS, Math.min(MAX_EXPIRING_DAYS, expiringSoonDays + step));
    if (nextValue === expiringSoonDays) {
      return;
    }

    setExpiringSoonDays(nextValue);
    Haptics.selectionAsync();
  };

  const updateLowStockThreshold = (step: -1 | 1) => {
    const nextValue = Math.max(MIN_LOW_STOCK_THRESHOLD, Math.min(MAX_LOW_STOCK_THRESHOLD, lowStockThreshold + step));
    if (nextValue === lowStockThreshold) {
      return;
    }

    setLowStockThreshold(nextValue);
    Haptics.selectionAsync();
  };

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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Inventaire intelligent</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.headerIcon, { backgroundColor: palette.glowSecondary }]}>
              <IconSymbol name="clock.badge.exclamationmark" size={20} color={palette.accentPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Seuil &ldquo;bientôt expiré&rdquo;</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Un produit est proche si son expiration est dans {expiringSoonDays} jour
                {expiringSoonDays > 1 ? 's' : ''} ou moins.
              </Text>
            </View>
          </View>

          <Stepper
            value={expiringSoonDays}
            onDecrease={() => updateExpiringSoonDays(-1)}
            onIncrease={() => updateExpiringSoonDays(1)}
            minReached={expiringSoonDays <= MIN_EXPIRING_DAYS}
            maxReached={expiringSoonDays >= MAX_EXPIRING_DAYS}
            palette={palette}
            unit="jours"
            accentColor={palette.accentPrimary}
          />
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.headerIcon, { backgroundColor: palette.warning + '18' }]}>
              <IconSymbol name="archivebox" size={20} color={palette.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Seuil stock faible</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Un produit passe en stock faible quand la quantité est ≤ {lowStockThreshold}.
              </Text>
            </View>
          </View>

          <Stepper
            value={lowStockThreshold}
            onDecrease={() => updateLowStockThreshold(-1)}
            onIncrease={() => updateLowStockThreshold(1)}
            minReached={lowStockThreshold <= MIN_LOW_STOCK_THRESHOLD}
            maxReached={lowStockThreshold >= MAX_LOW_STOCK_THRESHOLD}
            palette={palette}
            unit="unités"
            accentColor={palette.warning}
          />
        </View>

        <View style={[styles.infoCard, { backgroundColor: palette.glowSecondary }]}>
          <IconSymbol name="info.circle" size={16} color={palette.accentPrimary} />
          <Text style={[Typography.bodySm, { color: palette.textSecondary, flex: 1 }]}>
            Ces réglages pilotent l'accueil, les alertes, les recettes et la génération automatique de liste de courses.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stepper({
  value,
  onDecrease,
  onIncrease,
  minReached,
  maxReached,
  palette,
  unit,
  accentColor,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  minReached: boolean;
  maxReached: boolean;
  palette: ReturnType<typeof useAppTheme>['palette'];
  unit: string;
  accentColor: string;
}) {
  return (
    <View style={styles.stepperWrap}>
      <Pressable
        onPress={onDecrease}
        disabled={minReached}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
            opacity: minReached ? 0.40 : 1,
          },
        ]}>
        <IconSymbol name="minus" size={16} color={palette.textPrimary} />
      </Pressable>

      <View style={[styles.stepperValue, { backgroundColor: accentColor + '14' }]}>
        <Text style={[Typography.displayLg, { color: accentColor }]}>{value}</Text>
        <Text style={[Typography.caption, { color: accentColor + 'AA' }]}>{unit}</Text>
      </View>

      <Pressable
        onPress={onIncrease}
        disabled={maxReached}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
            opacity: maxReached ? 0.40 : 1,
          },
        ]}>
        <IconSymbol name="plus" size={16} color={palette.textPrimary} />
      </Pressable>
    </View>
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
  card: {
    borderRadius: Radii.card,
    padding: 18,
    gap: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
});
