import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { getOpenFoodFactsLocalDBSnapshot, OpenFoodFactsProduct } from '@/services/open-food-facts';
import { formatFullDate } from '@/utils/format';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function HistorySettingsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const [cachedProducts, setCachedProducts] = useState<OpenFoodFactsProduct[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scannedProducts = useMemo(() => {
    return [...products].filter((product) => product.source === 'scan').sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  }, [products]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const snapshot = await getOpenFoodFactsLocalDBSnapshot();
        if (!isMounted) {
          return;
        }

        setCachedProducts(snapshot.products);
        setUpdatedAt(snapshot.updatedAt);
      } catch {
        if (!isMounted) {
          return;
        }

        setError('Impossible de charger l historique local.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Historique local</Text>

        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Cache localDB OpenFoodFacts</Text>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            {updatedAt ? `Derniere mise a jour: ${DATE_TIME_FORMATTER.format(new Date(updatedAt))}` : 'Aucune mise a jour enregistree'}
          </Text>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{cachedProducts.length} produit(s) en cache</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Produits scannes dans l inventaire</Text>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{scannedProducts.length} produit(s)</Text>
          {scannedProducts.length === 0 ? (
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucun produit scanne enregistre.</Text>
          ) : (
            <View style={styles.list}>
              {scannedProducts.map((product) => (
                <View key={product.id} style={[styles.row, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                  <View style={styles.rowMain}>
                    <Text style={[Typography.labelMd, { color: palette.textPrimary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                      Quantite: {product.quantity} {product.unit}
                    </Text>
                  </View>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    {product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Produits en cache OpenFoodFacts</Text>
          {isLoading ? <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Chargement...</Text> : null}
          {error ? <Text style={[Typography.bodySm, { color: palette.danger }]}>{error}</Text> : null}
          {!isLoading && !error && cachedProducts.length === 0 ? (
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucun produit en cache localDB.</Text>
          ) : null}
          {!isLoading && !error && cachedProducts.length > 0 ? (
            <View style={styles.list}>
              {cachedProducts.map((product) => (
                <View key={product.barcode} style={[styles.row, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                  <View style={styles.rowMain}>
                    <Text style={[Typography.labelMd, { color: palette.textPrimary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[Typography.caption, { color: palette.textSecondary }]} numberOfLines={1}>
                      {product.categoryLabel ?? 'Categorie non renseignee'}
                    </Text>
                  </View>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>{product.barcode}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
});
