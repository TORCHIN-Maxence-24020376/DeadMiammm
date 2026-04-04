import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { daysUntil, formatFullDate, zoneLabel } from '@/utils/format';

type SortMode = 'chrono' | 'category';

export default function ExpiringScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const { expiringSoonDays } = useAppSettings();
  const [sortMode, setSortMode] = useState<SortMode>('chrono');

  const expiringProducts = useMemo(() => {
    const list = products
      .filter((product) => product.expiresAt && daysUntil(product.expiresAt) <= expiringSoonDays)
      .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));

    if (sortMode === 'chrono') {
      return list;
    }

    return [...list].sort((a, b) => {
      if (a.zone === b.zone) {
        return (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '');
      }
      return a.zone.localeCompare(b.zone);
    });
  }, [expiringSoonDays, products, sortMode]);

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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Bientôt expirés</Text>

        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Pressable
          onPress={() => router.push('/settings/inventory')}
          style={[styles.thresholdCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.rowTop}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Seuil actuel</Text>
            <IconSymbol name="slider.horizontal.3" size={14} color={palette.textSecondary} />
          </View>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
            Produits affichés si expiration dans {expiringSoonDays} jour{expiringSoonDays > 1 ? 's' : ''} ou moins.
          </Text>
        </Pressable>

        <View style={[styles.sortWrap, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
          <Pressable
            onPress={() => setSortMode('chrono')}
            style={[styles.sortButton, { backgroundColor: sortMode === 'chrono' ? palette.overlay : 'transparent' }]}> 
            <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Chronologique</Text>
          </Pressable>

          <Pressable
            onPress={() => setSortMode('category')}
            style={[styles.sortButton, { backgroundColor: sortMode === 'category' ? palette.overlay : 'transparent' }]}> 
            <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Par catégorie</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {expiringProducts.length === 0 ? (
            <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>Aucun produit proche de la date limite.</Text>
            </View>
          ) : null}

          {expiringProducts.map((product) => (
            <Pressable key={product.id} onPress={() => openProduct(product.id)} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              {product.expiresAt && daysUntil(product.expiresAt) < 0 ? (
                <View style={[styles.expiredPill, { backgroundColor: palette.danger }]}>
                  <Text style={[Typography.caption, { color: palette.textInverse }]}>Expiré</Text>
                </View>
              ) : null}
              <View style={styles.rowTop}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
                <Text style={[Typography.labelMd, { color: palette.accentPrimary }]}>
                  {formatDaysBeforeExpiry(product.expiresAt)}
                </Text>
              </View>

              <View style={styles.rowMeta}>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                  {product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}
                </Text>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
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
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  sortWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  sortButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
    paddingBottom: 16,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  thresholdCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  expiredPill: {
    alignSelf: 'flex-start',
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

function formatDaysBeforeExpiry(expiresAt: string | null) {
  const remaining = daysUntil(expiresAt);
  if (!Number.isFinite(remaining)) {
    return '—';
  }

  if (remaining < 0) {
    return `${Math.abs(remaining)} j de retard`;
  }

  return `J-${remaining}`;
}
