import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { StorageZone, zoneIconMap, zoneLabels } from '@/data/inventory';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { formatFullDate } from '@/utils/format';

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { palette } = useAppTheme();
  const { products } = useInventory();

  const zone = isStorageZone(params.slug) ? params.slug : 'frigo';

  const productsInZone = useMemo(() => {
    return products.filter((product) => product.zone === zone);
  }, [products, zone]);

  const openProduct = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product/${id}`);
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {productsInZone.length === 0 ? (
          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <IconSymbol name="tray" size={24} color={palette.textTertiary} />
            <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>Aucun produit dans cette zone.</Text>
          </View>
        ) : null}

        {productsInZone.map((product) => (
          <Pressable
            key={product.id}
            onPress={() => openProduct(product.id)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
            ]}>
            <View style={styles.cardTop}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
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
            </View>
          </Pressable>
        ))}
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
  content: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
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
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.capsule,
  },
});
