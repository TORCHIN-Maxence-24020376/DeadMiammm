import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
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
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
          ]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Bientôt expirés</Text>

        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Pressable
          onPress={() => router.push('/settings/inventory')}
          style={({ pressed }) => [
            styles.thresholdCard,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
          ]}>
          <View style={[styles.thresholdAccent, { backgroundColor: palette.warning }]} />
          <View style={styles.thresholdInner}>
            <View style={styles.rowTop}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Seuil actuel</Text>
              <IconSymbol name="slider.horizontal.3" size={14} color={palette.accentPrimary} />
            </View>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Produits affichés si expiration dans {expiringSoonDays} jour{expiringSoonDays > 1 ? 's' : ''} ou moins.
            </Text>
          </View>
        </Pressable>

        <View style={[styles.sortWrap, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <Pressable
            onPress={() => setSortMode('chrono')}
            style={[
              styles.sortButton,
              { backgroundColor: sortMode === 'chrono' ? palette.accentPrimary : 'transparent' },
            ]}>
            <Text style={[Typography.labelMd, { color: sortMode === 'chrono' ? palette.textInverse : palette.textSecondary }]}>
              Chronologique
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortMode('category')}
            style={[
              styles.sortButton,
              { backgroundColor: sortMode === 'category' ? palette.accentPrimary : 'transparent' },
            ]}>
            <Text style={[Typography.labelMd, { color: sortMode === 'category' ? palette.textInverse : palette.textSecondary }]}>
              Par catégorie
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {expiringProducts.length === 0 ? (
            <View style={[styles.row, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
              <IconSymbol name="checkmark.circle.fill" size={18} color={palette.success} />
              <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>
                Aucun produit proche de la date limite.
              </Text>
            </View>
          ) : null}

          {expiringProducts.map((product) => {
            const isExpired = product.expiresAt && daysUntil(product.expiresAt) < 0;
            return (
              <Pressable
                key={product.id}
                onPress={() => openProduct(product.id)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
                ]}>
                {isExpired ? (
                  <View style={[styles.expiredPill, { backgroundColor: palette.danger }]}>
                    <Text style={[Typography.caption, { color: palette.textInverse }]}>Expiré</Text>
                  </View>
                ) : null}

                <View style={styles.rowTop}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={[
                    styles.daysChip,
                    { backgroundColor: isExpired ? palette.danger + '22' : palette.glowSecondary },
                  ]}>
                    <Text style={[Typography.labelSm, { color: isExpired ? palette.danger : palette.accentPrimary }]}>
                      {formatDaysBeforeExpiry(product.expiresAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowMeta}>
                  <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                    {product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}
                  </Text>
                  <Text style={[Typography.caption, { color: palette.textTertiary }]}>{zoneLabel(product.zone)}</Text>
                </View>

                <IconSymbol name="chevron.right" size={12} color={palette.textTertiary} style={styles.rowChevron} />
              </Pressable>
            );
          })}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  thresholdCard: {
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  thresholdAccent: {
    width: 5,
  },
  thresholdInner: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  sortWrap: {
    borderRadius: Radii.capsule,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  sortButton: {
    flex: 1,
    height: 38,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    borderRadius: 20,
    padding: 14,
    gap: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
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
    marginBottom: 2,
  },
  daysChip: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowChevron: {
    position: 'absolute',
    right: 14,
    top: '50%',
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
