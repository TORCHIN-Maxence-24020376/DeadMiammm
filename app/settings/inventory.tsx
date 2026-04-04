import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
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
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Inventaire intelligent</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Seuil “bientôt expiré”</Text>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            Un produit est considéré proche de la date si son expiration est dans {expiringSoonDays} jour
            {expiringSoonDays > 1 ? 's' : ''} ou moins.
          </Text>

          <Stepper
            value={expiringSoonDays}
            onDecrease={() => updateExpiringSoonDays(-1)}
            onIncrease={() => updateExpiringSoonDays(1)}
            minReached={expiringSoonDays <= MIN_EXPIRING_DAYS}
            maxReached={expiringSoonDays >= MAX_EXPIRING_DAYS}
            palette={palette}
            unit="jours"
          />
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Seuil stock faible</Text>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            Un produit passe en stock faible quand la quantité est inférieure ou égale à {lowStockThreshold}.
          </Text>

          <Stepper
            value={lowStockThreshold}
            onDecrease={() => updateLowStockThreshold(-1)}
            onIncrease={() => updateLowStockThreshold(1)}
            minReached={lowStockThreshold <= MIN_LOW_STOCK_THRESHOLD}
            maxReached={lowStockThreshold >= MAX_LOW_STOCK_THRESHOLD}
            palette={palette}
            unit="unités"
          />
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            Ces réglages pilotent l’accueil, les alertes, les recettes et la génération automatique de liste de courses.
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
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  minReached: boolean;
  maxReached: boolean;
  palette: ReturnType<typeof useAppTheme>['palette'];
  unit: string;
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
            borderColor: palette.border,
            opacity: minReached ? 0.45 : 1,
          },
        ]}>
        <IconSymbol name="minus" size={16} color={palette.textPrimary} />
      </Pressable>

      <View style={[styles.stepperValue, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{value}</Text>
        <Text style={[Typography.caption, { color: palette.textSecondary }]}>{unit}</Text>
      </View>

      <Pressable
        onPress={onIncrease}
        disabled={maxReached}
        style={({ pressed }) => [
          styles.stepperButton,
          {
            backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
            borderColor: palette.border,
            opacity: maxReached ? 0.45 : 1,
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
});
