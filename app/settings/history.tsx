import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-provider';
import { getOpenFoodFactsLocalDBHistory, LocalDBHistoryEntry } from '@/services/open-food-facts';

export default function HistoryScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [history, setHistory] = useState<LocalDBHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHistory = async () => {
        setIsLoading(true);

        try {
          const entries = await getOpenFoodFactsLocalDBHistory();
          if (isActive) {
            setHistory(entries);
          }
        } catch (error) {
          console.warn('OpenFoodFacts history load failed:', error);
          if (isActive) {
            setHistory([]);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadHistory();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const stats = useMemo(() => {
    const searches = history.filter((entry) => entry.type === 'search').length;
    const scans = history.filter((entry) => entry.type === 'barcode').length;

    return {
      entries: history.length,
      searches,
      scans,
    };
  }, [history]);

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

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Historique</Text>

        <View style={styles.iconButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: palette.glowSecondary }]}>
              <IconSymbol name="clock.arrow.circlepath" size={20} color={palette.accentPrimary} />
            </View>
            <View style={styles.summaryText}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Activite recente</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Les derniers scans et recherches OpenFoodFacts enregistres localement.
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Entrees" value={String(stats.entries)} palette={palette} />
            <StatCard label="Scans" value={String(stats.scans)} palette={palette} />
            <StatCard label="Recherches" value={String(stats.searches)} palette={palette} />
          </View>
        </View>

        {isLoading ? (
          <View style={[styles.stateCard, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Chargement de l&apos;historique...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Aucune activite enregistree</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Les prochains scans et recherches apparaitront ici automatiquement.
            </Text>
          </View>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={[styles.entryCard, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
              <View
                style={[
                  styles.entryIcon,
                  { backgroundColor: entry.type === 'search' ? palette.glowSecondary : palette.surfaceSoft },
                ]}>
                <IconSymbol
                  name={entry.type === 'search' ? 'magnifyingglass' : 'camera.viewfinder'}
                  size={18}
                  color={entry.type === 'search' ? palette.accentPrimary : palette.textPrimary}
                />
              </View>

              <View style={styles.entryText}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{entry.label}</Text>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                  {entry.type === 'search'
                    ? `${entry.resultCount} resultat${entry.resultCount > 1 ? 's' : ''} pour "${entry.term}"`
                    : `Scan du code-barres ${entry.term}`}
                </Text>
                <Text style={[Typography.caption, { color: palette.textTertiary }]}>
                  {formatHistoryDate(entry.createdAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: palette.surfaceSoft }]}>
      <Text style={[Typography.caption, { color: palette.textTertiary }]}>{label}</Text>
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
    gap: 12,
  },
  summaryCard: {
    borderRadius: Radii.card,
    padding: 18,
    gap: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    gap: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stateCard: {
    borderRadius: Radii.card,
    padding: 18,
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  entryCard: {
    borderRadius: Radii.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  entryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryText: {
    flex: 1,
    gap: 3,
  },
});
