import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { clearOpenFoodFactsProductCache, getOpenFoodFactsProductCacheCount } from '@/services/open-food-facts';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { products, clearProducts } = useInventory();
  const [cacheEntriesCount, setCacheEntriesCount] = useState<number | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const stats = useMemo(() => {
    const total = products.length;
    const scanned = products.filter((product) => product.source === 'scan').length;
    const manual = products.filter((product) => product.source === 'manual').length;

    return { total, scanned, manual };
  }, [products]);

  useEffect(() => {
    let isMounted = true;

    const hydrateCacheCount = async () => {
      try {
        const count = await getOpenFoodFactsProductCacheCount();
        if (isMounted) {
          setCacheEntriesCount(count);
        }
      } catch (error) {
        console.warn('OpenFoodFacts cache stats load failed:', error);
      }
    };

    void hydrateCacheCount();

    return () => {
      isMounted = false;
    };
  }, []);

  const onResetInventory = () => {
    if (products.length === 0) {
      Alert.alert('Inventaire déjà vide', 'Aucun produit à supprimer.');
      return;
    }

    Alert.alert(
      'Réinitialiser l\u2019inventaire ?',
      `Cette action supprimera ${products.length} produit(s) enregistrés localement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            void handleReset();
          },
        },
      ]
    );
  };

  const onClearProductCache = () => {
    const count = cacheEntriesCount ?? 0;
    if (count === 0) {
      Alert.alert('Cache déjà vide', 'Aucune entrée de cache à supprimer.');
      return;
    }

    Alert.alert('Vider le cache produits ?', `${count} entrée(s) OpenFoodFacts seront supprimées du stockage local.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vider le cache',
        style: 'destructive',
        onPress: () => {
          void handleClearProductCache();
        },
      },
    ]);
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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Compte et profil</Text>

        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <View style={styles.cardTitle}>
            <View style={[styles.titleDot, { backgroundColor: palette.accentPrimary }]} />
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Résumé local</Text>
          </View>

          <View style={styles.statsWrap}>
            <StatPill label="Produits" value={String(stats.total)} palette={palette} />
            <StatPill label="Scannés" value={String(stats.scanned)} palette={palette} />
            <StatPill label="Manuels" value={String(stats.manual)} palette={palette} />
            <StatPill label="Cache API" value={cacheEntriesCount === null ? '…' : String(cacheEntriesCount)} palette={palette} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <View style={styles.cardTitle}>
            <View style={[styles.titleDot, { backgroundColor: palette.danger }]} />
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Maintenance</Text>
          </View>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            Nettoie l'application en repartant d'un inventaire vide.
          </Text>

          <View style={styles.maintenanceActions}>
            <Pressable
              onPress={onClearProductCache}
              disabled={isClearingCache}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                  opacity: isClearingCache ? 0.5 : 1,
                },
              ]}>
              <IconSymbol name="trash.fill" size={14} color={palette.textSecondary} />
              <Text style={[Typography.labelMd, { color: palette.textSecondary }]}>
                {isClearingCache ? 'Suppression du cache…' : 'Vider le cache produits API'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onResetInventory}
              style={({ pressed }) => [
                styles.dangerButton,
                { backgroundColor: pressed ? '#B91C1C' : palette.danger },
              ]}>
              <IconSymbol name="trash.fill" size={14} color={palette.textInverse} />
              <Text style={[Typography.labelMd, { color: palette.textInverse }]}>Vider l'inventaire local</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  async function handleReset() {
    await clearProducts();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleClearProductCache() {
    setIsClearingCache(true);

    try {
      await clearOpenFoodFactsProductCache();
      const updatedCount = await getOpenFoodFactsProductCacheCount();
      setCacheEntriesCount(updatedCount);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Cache vidé', 'Le cache local OpenFoodFacts a été supprimé.');
    } catch (error) {
      console.warn('OpenFoodFacts cache clear failed:', error);
      Alert.alert('Erreur', 'Impossible de vider le cache pour le moment.');
    } finally {
      setIsClearingCache(false);
    }
  }
}

function StatPill({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: palette.glowSecondary }]}>
      <Text style={[Typography.caption, { color: palette.textTertiary }]}>{label}</Text>
      <Text style={[Typography.titleMd, { color: palette.accentPrimary }]}>{value}</Text>
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
    gap: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statPill: {
    width: '47%',
    borderRadius: 18,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dangerButton: {
    height: 48,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 4,
  },
  maintenanceActions: {
    gap: 10,
  },
  secondaryButton: {
    height: 46,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
