import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import {
  frozenHomemadeLabels,
  inferLowStock,
  isHomemadeFrozenProduct,
  StorageZone,
  zoneIconMap,
  zoneLabels,
} from '@/data/inventory';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { daysUntil, formatFullDate } from '@/utils/format';

type FilterMode = 'all' | 'expiring' | 'low-stock' | 'homemade';
type SortMode = 'expiry' | 'recent' | 'name';

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const { expiringSoonDays, lowStockThreshold } = useAppSettings();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('expiry');

  const zone = isStorageZone(params.slug) ? params.slug : 'frigo';

  const productsInZone = useMemo(() => {
    const filtered = products.filter((product) => {
      if (product.zone !== zone) {
        return false;
      }

      if (filterMode === 'expiring') {
        return Boolean(product.expiresAt) && daysUntil(product.expiresAt) <= expiringSoonDays;
      }

      if (filterMode === 'low-stock') {
        return inferLowStock(product, lowStockThreshold);
      }

      if (filterMode === 'homemade') {
        return isHomemadeFrozenProduct(product);
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === 'name') {
        return left.name.localeCompare(right.name, 'fr');
      }

      if (sortMode === 'recent') {
        return right.addedAt.localeCompare(left.addedAt);
      }

      const leftExpiry = left.expiresAt ? daysUntil(left.expiresAt) : Number.MAX_SAFE_INTEGER;
      const rightExpiry = right.expiresAt ? daysUntil(right.expiresAt) : Number.MAX_SAFE_INTEGER;
      if (leftExpiry !== rightExpiry) {
        return leftExpiry - rightExpiry;
      }

      return left.name.localeCompare(right.name, 'fr');
    });
  }, [expiringSoonDays, filterMode, lowStockThreshold, products, sortMode, zone]);

  const openProduct = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product/${id}`);
  };

  const selectFilter = (nextFilter: FilterMode) => {
    setFilterMode(nextFilter);
    Haptics.selectionAsync();
  };

  const selectSort = (nextSort: SortMode) => {
    setSortMode(nextSort);
    Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
          ]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <View style={styles.headerTitle}>
          <View style={[styles.zoneIconWrap, { backgroundColor: palette.glowSecondary }]}>
            <IconSymbol name={zoneIconMap[zone]} size={17} color={palette.accentPrimary} />
          </View>
          <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{zoneLabels[zone]}</Text>
        </View>

        <View style={styles.backButton} />
      </View>

      <View style={styles.countRow}>
        <View style={[styles.countChip, { backgroundColor: palette.glowSecondary }]}>
          <Text style={[Typography.labelSm, { color: palette.accentPrimary }]}>
            {productsInZone.length} produit{productsInZone.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlBlock}>
          <Text style={[Typography.caption, { color: palette.textSecondary }]}>Filtres</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlRow}>
            {[
              { key: 'all' as const, label: 'Tous' },
              { key: 'expiring' as const, label: 'A consommer vite' },
              { key: 'low-stock' as const, label: 'Stock faible' },
              { key: 'homemade' as const, label: 'Maison congeles' },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => selectFilter(item.key)}
                style={[
                  styles.controlChip,
                  {
                    backgroundColor:
                      filterMode === item.key ? palette.accentPrimary : palette.surfaceSoft,
                    borderColor: palette.border,
                  },
                ]}>
                <Text
                  style={[
                    Typography.labelSm,
                    { color: filterMode === item.key ? palette.textInverse : palette.textPrimary },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.controlBlock}>
          <Text style={[Typography.caption, { color: palette.textSecondary }]}>Tri</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlRow}>
            {[
              { key: 'expiry' as const, label: 'Expiration' },
              { key: 'recent' as const, label: 'Recents' },
              { key: 'name' as const, label: 'Nom' },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => selectSort(item.key)}
                style={[
                  styles.controlChip,
                  {
                    backgroundColor:
                      sortMode === item.key ? palette.info : palette.surfaceSoft,
                    borderColor: palette.border,
                  },
                ]}>
                <Text
                  style={[
                    Typography.labelSm,
                    { color: sortMode === item.key ? palette.textInverse : palette.textPrimary },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {productsInZone.length === 0 ? (
          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <IconSymbol name="tray" size={24} color={palette.textTertiary} />
            <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>
              Aucun produit ne correspond au filtre.
            </Text>
          </View>
        ) : null}

        {productsInZone.map((product) => {
          const expiringSoon = product.expiresAt && daysUntil(product.expiresAt) <= expiringSoonDays;
          return (
            <Pressable
              key={product.id}
              onPress={() => openProduct(product.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? palette.surfacePressed : palette.surface,
                  shadowColor: palette.shadowDark,
                },
              ]}>
              <View style={styles.cardTop}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary, flex: 1 }]}>{product.name}</Text>
                <IconSymbol name="chevron.right" size={14} color={palette.textTertiary} />
              </View>

              <View style={styles.cardMeta}>
                <View style={[styles.metaChip, { backgroundColor: palette.surfaceSoft }]}>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    {product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}
                  </Text>
                </View>
                <View style={[styles.metaChip, { backgroundColor: palette.surfaceSoft }]}>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    {product.quantity} {product.unit}
                  </Text>
                </View>
                {isHomemadeFrozenProduct(product) ? (
                  <View style={[styles.metaChip, { backgroundColor: palette.info + '15' }]}>
                    <Text style={[Typography.caption, { color: palette.info }]}>
                      {frozenHomemadeLabels[product.homemadeFrozenType!]}
                    </Text>
                  </View>
                ) : null}
                {expiringSoon ? (
                  <View style={[styles.metaChip, { backgroundColor: palette.warning + '18' }]}>
                    <Text style={[Typography.caption, { color: palette.warning }]}>A surveiller</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function isStorageZone(value: string | undefined): value is StorageZone {
  return value === 'frigo' || value === 'congelateur' || value === 'sec' || value === 'autre';
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  countChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.capsule,
  },
  controls: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  controlBlock: {
    gap: 6,
  },
  controlRow: {
    gap: 8,
    paddingRight: 4,
  },
  controlChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.capsule,
  },
});
