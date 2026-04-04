import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
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
      <View style={[styles.header, { borderBottomColor: palette.border }]}> 
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <View style={styles.headerTitle}>
          <IconSymbol name={zoneIconMap[zone]} size={18} color={palette.accentPrimary} />
          <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{zoneLabels[zone]}</Text>
        </View>

        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {productsInZone.length === 0 ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>Aucun produit dans cette zone.</Text>
          </View>
        ) : null}

        {productsInZone.map((product) => (
          <Pressable key={product.id} onPress={() => openProduct(product.id)} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Expire le {product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Quantité: {product.quantity} {product.unit}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function isStorageZone(value: string | undefined): value is StorageZone {
  return value === 'frigo' || value === 'congelateur' || value === 'sec' || value === 'animalerie' || value === 'dph' || value === 'autre';
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
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
});
