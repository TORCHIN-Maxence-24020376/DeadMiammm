import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryLogo } from '@/components/ui/history-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { type InventoryProduct } from '@/data/inventory';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import {
  getOpenFoodFactsLocalDBSnapshot,
  type OpenFoodFactsLocalDBSnapshot,
  type OpenFoodFactsProduct,
} from '@/services/open-food-facts';
import { formatFullDate, zoneLabel } from '@/utils/format';

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
  const [snapshot, setSnapshot] = useState<OpenFoodFactsLocalDBSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const scannedProducts = useMemo(() => {
    return [...products]
      .filter((product) => product.source === 'scan')
      .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  }, [products]);

  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      setIsLoadingSnapshot(true);
      setSnapshotError(null);

      try {
        const nextSnapshot = await getOpenFoodFactsLocalDBSnapshot();
        if (isMounted) {
          setSnapshot(nextSnapshot);
        }
      } catch (error) {
        console.warn('History snapshot load failed:', error);
        if (isMounted) {
          setSnapshotError('Impossible de charger l’historique pour le moment.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSnapshot(false);
        }
      }
    };

    void loadSnapshot();

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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Historique</Text>

        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <HistoryLogo
            size={54}
            primaryColor={palette.accentPrimary}
            secondaryColor={palette.accentSecondary}
            highlightColor={palette.highlightEdge}
          />

          <View style={styles.heroText}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Historique local</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Tu retrouves ici les produits déjà scannés et ceux gardés dans le cache local.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Produits scannés</Text>
            <View style={[styles.countPill, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>{scannedProducts.length}</Text>
            </View>
          </View>

          {scannedProducts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Aucun produit scanné n’a encore été enregistré.
              </Text>
            </View>
          ) : (
            scannedProducts.map((product) => (
              <InventoryHistoryCard key={product.id} product={product} palette={palette} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Cache OpenFoodFacts</Text>
            <View style={[styles.countPill, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                {snapshot?.products.length ?? 0}
              </Text>
            </View>
          </View>

          {snapshot?.updatedAt ? (
            <Text style={[Typography.caption, { color: palette.textSecondary }]}>
              Mis à jour le {formatDateTime(snapshot.updatedAt)}
            </Text>
          ) : null}

          {isLoadingSnapshot ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Chargement du cache local…</Text>
            </View>
          ) : null}

          {!isLoadingSnapshot && snapshotError ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{snapshotError}</Text>
            </View>
          ) : null}

          {!isLoadingSnapshot && !snapshotError && snapshot && snapshot.products.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Le cache est encore vide pour le moment.
              </Text>
            </View>
          ) : null}

          {!isLoadingSnapshot && !snapshotError
            ? snapshot?.products.map((product) => (
                <CacheHistoryCard key={product.barcode} product={product} palette={palette} />
              ))
            : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InventoryHistoryCard({
  product,
  palette,
}: {
  product: InventoryProduct;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTop}>
        <Text style={[Typography.labelLg, styles.cardTitle, { color: palette.textPrimary }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[Typography.caption, { color: palette.textSecondary }]}>{formatDateTime(product.addedAt)}</Text>
      </View>

      <View style={styles.metaRow}>
        <MetaPill label={`${product.quantity} ${product.unit}`} palette={palette} />
        <MetaPill label={zoneLabel(product.zone)} palette={palette} />
        {product.expiresAt ? <MetaPill label={`DL ${formatFullDate(product.expiresAt)}`} palette={palette} /> : null}
      </View>

      {product.barcode ? (
        <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Code-barres : {product.barcode}</Text>
      ) : null}
    </View>
  );
}

function CacheHistoryCard({
  product,
  palette,
}: {
  product: OpenFoodFactsProduct;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTop}>
        <Text style={[Typography.labelLg, styles.cardTitle, { color: palette.textPrimary }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[Typography.caption, { color: palette.textSecondary }]}>{product.barcode}</Text>
      </View>

      <View style={styles.metaRow}>
        {product.quantityLabel ? <MetaPill label={product.quantityLabel} palette={palette} /> : null}
        <MetaPill label={zoneLabel(product.suggestedZone)} palette={palette} />
      </View>

      <Text style={[Typography.bodySm, { color: palette.textSecondary }]} numberOfLines={2}>
        {product.categoryLabel || 'Produit gardé dans localDB.'}
      </Text>
    </View>
  );
}

function MetaPill({
  label,
  palette,
}: {
  label: string;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={[styles.metaPill, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
      <Text style={[Typography.caption, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date inconnue';
  }

  return DATE_TIME_FORMATTER.format(date);
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
    gap: 16,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
