import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationsSheet } from '@/components/sheets/notifications-sheet';
import { ListMenuSheet } from '@/components/sheets/list-menu-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { DisplayMode, products, recipes } from '@/data/mock-data';
import { useAppTheme } from '@/providers/theme-provider';
import { daysUntil, formatFullDate, zoneLabel } from '@/utils/format';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const zoneIconMap = {
  frigo: 'refrigerator',
  congelateur: 'snowflake',
  sec: 'shippingbox.fill',
  animalerie: 'pawprint.fill',
  dph: 'cross.case.fill',
} as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();

  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const [searchValue, setSearchValue] = useState('');
  const [isLowStockExpanded, setIsLowStockExpanded] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) {
      return products;
    }

    const query = searchValue.trim().toLowerCase();
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [searchValue]);

  const urgentProducts = useMemo(() => {
    return [...filteredProducts]
      .filter((product) => daysUntil(product.expiresAt) <= 7)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  }, [filteredProducts]);

  const lowStockProducts = useMemo(() => {
    return filteredProducts.filter((product) => product.lowStock);
  }, [filteredProducts]);

  const recentProducts = useMemo(() => {
    return [...filteredProducts]
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .slice(0, 4);
  }, [filteredProducts]);

  const recipeTeaser = useMemo(() => recipes.slice(0, 3), []);

  const triggerSelection = () => {
    Haptics.selectionAsync();
  };

  const toggleLowStock = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLowStockExpanded((prev) => !prev);
    triggerSelection();
  };

  const selectDisplay = (nextMode: DisplayMode) => {
    if (nextMode === displayMode) {
      return;
    }
    setDisplayMode(nextMode);
    triggerSelection();
  };

  const openScanner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scanner');
  };

  const openListMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsListMenuOpen(true);
  };

  const onSelectMenuEntry = (slug: 'frigo' | 'congelateur' | 'sec' | 'animalerie' | 'dph' | 'recipes') => {
    setIsListMenuOpen(false);

    if (slug === 'recipes') {
      router.push('/recipes');
      return;
    }

    router.push(`/category/${slug}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 150,
          paddingTop: 4,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.topShell,
            {
              backgroundColor: palette.surfaceSoft,
              borderColor: palette.border,
              shadowColor: palette.shadowDark,
            },
          ]}>
          <Pressable
            style={({ pressed }) => [
              styles.topIconButton,
              {
                backgroundColor: pressed ? palette.surfacePressed : palette.overlay,
                borderColor: palette.border,
              },
            ]}
            onPress={() => router.push('/shopping-lists')}>
            <IconSymbol name="list.bullet.rectangle.portrait" size={20} color={palette.textPrimary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.topCenterButton,
              {
                backgroundColor: pressed ? palette.surfacePressed : palette.overlay,
                borderColor: palette.border,
              },
            ]}
            onPress={() => router.push('/profile')}>
            <IconSymbol name="person.crop.circle" size={22} color={palette.textPrimary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.topIconButton,
              {
                backgroundColor: pressed ? palette.surfacePressed : palette.overlay,
                borderColor: palette.border,
              },
            ]}
            onPress={() => setIsNotificationsOpen(true)}>
            <IconSymbol name="bell.badge" size={20} color={palette.textPrimary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchShell,
            {
              backgroundColor: palette.surfaceSoft,
              borderColor: palette.border,
            },
          ]}>
          <IconSymbol name="magnifyingglass" size={18} color={palette.textSecondary} />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Rechercher un produit dans la maison"
            placeholderTextColor={palette.textTertiary}
            style={[styles.searchInput, Typography.bodyMd, { color: palette.textPrimary }]}
          />
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              shadowColor: palette.shadowDark,
            },
          ]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={[Typography.titleLg, { color: palette.textPrimary }]}>Produits bientôt expirés</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Priorité: à consommer</Text>
            </View>

            <View style={[styles.countPill, { backgroundColor: palette.overlay, borderColor: palette.border }]}> 
              <Text style={[Typography.labelLg, { color: palette.accentPrimary }]}>{urgentProducts.length}</Text>
            </View>
          </View>

          <View style={styles.heroList}>
            {urgentProducts.slice(0, 3).map((product) => (
              <View key={product.id} style={[styles.heroItem, { backgroundColor: palette.surfaceSoft }]}> 
                <View style={[styles.heroIconWrap, { backgroundColor: palette.overlay }]}> 
                  <IconSymbol name={zoneIconMap[product.zone]} size={16} color={palette.accentPrimary} />
                </View>

                <View style={styles.heroTextWrap}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    {formatFullDate(product.expiresAt)} • {zoneLabel(product.zone)}
                  </Text>
                </View>
              </View>
            ))}

            {urgentProducts.length === 0 ? (
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucun produit urgent trouvé.</Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
                shadowColor: palette.accentPrimary,
              },
            ]}
            onPress={() => router.push('/expiring')}>
            <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Voir tout</Text>
            <IconSymbol name="chevron.right" size={16} color={palette.textInverse} />
          </Pressable>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <Pressable style={styles.rowBetween} onPress={toggleLowStock}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Stock faible</Text>
            <View style={styles.rowCenter}>
              <Text style={[Typography.labelMd, { color: palette.textSecondary }]}>{lowStockProducts.length}</Text>
              <IconSymbol
                name={isLowStockExpanded ? 'chevron.down' : 'chevron.right'}
                size={16}
                color={palette.textSecondary}
              />
            </View>
          </Pressable>

          {isLowStockExpanded ? (
            <View style={styles.sectionList}>
              {renderProducts({
                mode: displayMode,
                list: lowStockProducts,
                palette,
              })}
            </View>
          ) : (
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Touchez pour afficher les produits à réassortir.</Text>
          )}
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={[styles.rowBetween, styles.alignStart]}>
            <View>
              <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Derniers ajouts</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Affichage global: cards ou liste</Text>
            </View>

            <View style={[styles.segmentedWrap, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
              <Pressable
                onPress={() => selectDisplay('cards')}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: displayMode === 'cards' ? palette.overlay : 'transparent',
                  },
                ]}>
                <IconSymbol name="square.grid.2x2.fill" size={14} color={palette.textPrimary} />
              </Pressable>

              <Pressable
                onPress={() => selectDisplay('list')}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: displayMode === 'list' ? palette.overlay : 'transparent',
                  },
                ]}>
                <IconSymbol name="rectangle.grid.1x2.fill" size={14} color={palette.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionList}>
            {renderProducts({
              mode: displayMode,
              list: recentProducts,
              palette,
            })}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={styles.rowBetween}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Idées recettes</Text>
            <Pressable onPress={() => router.push('/recipes')}>
              <Text style={[Typography.labelMd, { color: palette.accentPrimary }]}>Voir recettes</Text>
            </Pressable>
          </View>

          <View style={styles.recipeList}>
            {recipeTeaser.map((recipe) => (
              <View
                key={recipe.id}
                style={[styles.recipeCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                <View style={styles.rowBetween}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{recipe.title}</Text>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>{recipe.time}</Text>
                </View>

                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{recipe.ingredients.join(' • ')}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomDockContainer, { paddingBottom: insets.bottom + 6 }]}> 
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: palette.surfaceSoft,
              borderColor: palette.border,
              shadowColor: palette.shadowDark,
            },
          ]}>
          <Pressable style={[styles.navButton, styles.navButtonActive, { backgroundColor: palette.overlay }]}> 
            <IconSymbol name="house.fill" size={20} color={palette.accentPrimary} />
            <Text style={[Typography.labelSm, { color: palette.accentPrimary }]}>Home</Text>
          </Pressable>

          <View style={styles.centerGap} />

          <Pressable
            onPress={openListMenu}
            style={({ pressed }) => [
              styles.navButton,
              {
                backgroundColor: pressed ? palette.surfacePressed : 'transparent',
              },
            ]}>
            <IconSymbol name="square.grid.2x2" size={20} color={palette.textPrimary} />
            <Text style={[Typography.labelSm, { color: palette.textPrimary }]}>Liste</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={openScanner}
          style={({ pressed }) => [
            styles.scannerButton,
            {
              backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
              shadowColor: palette.accentPrimary,
            },
          ]}>
          <IconSymbol name="camera.fill" size={24} color={palette.textInverse} />
          <Text style={[Typography.labelSm, { color: palette.textInverse }]}>Scanner</Text>
        </Pressable>
      </View>

      <ListMenuSheet
        visible={isListMenuOpen}
        palette={palette}
        onClose={() => setIsListMenuOpen(false)}
        onSelect={onSelectMenuEntry}
      />

      <NotificationsSheet
        visible={isNotificationsOpen}
        palette={palette}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </SafeAreaView>
  );
}

function renderProducts({
  mode,
  list,
  palette,
}: {
  mode: DisplayMode;
  list: typeof products;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  if (list.length === 0) {
    return <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucun produit à afficher.</Text>;
  }

  if (mode === 'cards') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsWrap}>
        {list.map((product) => (
          <View key={product.id} style={[styles.productCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
            <View style={styles.rowBetween}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]} numberOfLines={1}>
                {product.name}
              </Text>
              <IconSymbol name={zoneIconMap[product.zone]} size={16} color={palette.accentPrimary} />
            </View>

            <Text style={[Typography.caption, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Expire le {formatFullDate(product.expiresAt)}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.verticalListWrap}>
      {list.map((product) => (
        <View key={product.id} style={[styles.productListItem, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
          <View style={styles.rowCenter}>
            <View style={[styles.smallIcon, { backgroundColor: palette.overlay }]}>
              <IconSymbol name={zoneIconMap[product.zone]} size={14} color={palette.accentPrimary} />
            </View>

            <View>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>Expire le {formatFullDate(product.expiresAt)}</Text>
            </View>
          </View>

          <Text style={[Typography.caption, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topShell: {
    minHeight: 76,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
  },
  topIconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenterButton: {
    width: 68,
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  heroCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 7,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countPill: {
    minWidth: 46,
    height: 34,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  heroList: {
    gap: 8,
  },
  heroItem: {
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    gap: 1,
  },
  primaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionList: {
    gap: 8,
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  segmentedWrap: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    width: 34,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalCardsWrap: {
    gap: 10,
    paddingRight: 4,
  },
  productCard: {
    width: 180,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  verticalListWrap: {
    gap: 8,
  },
  productListItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  smallIcon: {
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeList: {
    gap: 8,
  },
  recipeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  bottomDockContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    alignItems: 'center',
  },
  bottomDock: {
    width: '100%',
    height: 76,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  navButton: {
    width: 78,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  navButtonActive: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  centerGap: {
    width: 92,
  },
  scannerButton: {
    position: 'absolute',
    top: -22,
    width: 96,
    height: 96,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
  },
});
