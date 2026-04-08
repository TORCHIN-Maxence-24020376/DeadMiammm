import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';
import { getOpenFoodFactsLocalDBHistory, LocalDBHistoryEntry } from '@/services/open-food-facts';

export default function LocalDBHistoryScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [history, setHistory] = useState<LocalDBHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateHistory = async () => {
      try {
        const entries = await getOpenFoodFactsLocalDBHistory();
        if (isMounted) {
          setHistory(entries);
        }
      } catch (error) {
        console.warn('OpenFoodFacts localDB history load failed:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrateHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const searches = history.filter((entry) => entry.type === 'search').length;
    const barcodes = history.filter((entry) => entry.type === 'barcode').length;

    return { searches, barcodes };
  }, [history]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>History</Text>

        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Résumé</Text>

          <View style={styles.statsWrap}>
            <StatPill label="Entrées" value={String(history.length)} palette={palette} />
            <StatPill label="Recherches" value={String(stats.searches)} palette={palette} />
            <StatPill label="Scans" value={String(stats.barcodes)} palette={palette} />
          </View>
        </View>

        {isLoading ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Chargement de l’historique…</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Aucun historique</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Les recherches OpenFoodFacts et les scans mis en cache apparaîtront ici.
            </Text>
          </View>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.leadingIcon, { backgroundColor: palette.surfaceSoft }]}>
                <IconSymbol
                  name={entry.type === 'search' ? 'magnifyingglass' : 'camera.viewfinder'}
                  size={18}
                  color={palette.accentPrimary}
                />
              </View>

              <View style={styles.rowText}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>
                  {entry.type === 'search' ? `Recherche: ${entry.label}` : entry.label}
                </Text>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                  {entry.type === 'search' ? `${entry.resultCount} résultat(s)` : `Code-barres ${entry.term}`}
                </Text>
                <Text style={[Typography.caption, { color: palette.textTertiary }]}>{formatHistoryDate(entry.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
    <View style={[styles.statPill, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
      <Text style={[Typography.caption, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
    gap: 10,
  },
  statsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leadingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
