import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { activeShoppingList, pastShoppingLists } from '@/data/mock-data';
import { useAppTheme } from '@/providers/theme-provider';
import { formatShortDate } from '@/utils/format';

export default function ShoppingListsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [showPast, setShowPast] = useState(false);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderBottomColor: palette.border }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Listes de courses</Text>

        <Pressable style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="plus" size={18} color={palette.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <View style={styles.rowBetween}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Dernière liste en cours</Text>
            <Text style={[Typography.caption, { color: palette.textSecondary }]}>
              {formatShortDate(activeShoppingList.createdAt)}
            </Text>
          </View>

          <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{activeShoppingList.name}</Text>

          <View style={styles.itemsWrap}>
            {activeShoppingList.items.map((item) => (
              <View key={item} style={styles.rowCenter}>
                <IconSymbol name="circle" size={8} color={palette.textSecondary} />
                <Text style={[Typography.bodyMd, { color: palette.textPrimary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => setShowPast((prev) => !prev)}
          style={[styles.secondaryButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
          <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Anciennes listes</Text>
          <IconSymbol name={showPast ? 'chevron.down' : 'chevron.right'} size={14} color={palette.textSecondary} />
        </Pressable>

        {showPast ? (
          <View style={styles.pastListWrap}>
            {pastShoppingLists.map((list) => (
              <View
                key={list.id}
                style={[styles.pastCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
                <View style={styles.rowBetween}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{list.name}</Text>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>{formatShortDate(list.createdAt)}</Text>
                </View>

                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                  {list.items.slice(0, 3).join(' • ')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
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
    gap: 12,
  },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemsWrap: {
    gap: 6,
  },
  secondaryButton: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastListWrap: {
    gap: 10,
  },
  pastCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
});
