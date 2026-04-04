import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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

import { ListMenuSheet } from '@/components/sheets/list-menu-sheet';
import { NotificationsSheet } from '@/components/sheets/notifications-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { DisplayMode, inferLowStock, InventoryProduct, zoneIconMap } from '@/data/inventory';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { daysUntil, formatFullDate, zoneLabel } from '@/utils/format';
import { buildRecipeSuggestions } from '@/utils/recipes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, resolvedTheme } = useAppTheme();
  const { products, isHydrating } = useInventory();
  const { expiringSoonDays, lowStockThreshold } = useAppSettings();
  const scrollRef = useRef<ScrollView>(null);

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
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.barcode ?? '',
        product.category ?? '',
        product.format ?? '',
        product.unit,
        zoneLabel(product.zone),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [products, searchValue]);

  const urgentProducts = useMemo(() => {
    return [...filteredProducts]
      .filter((product) => product.expiresAt && daysUntil(product.expiresAt) <= expiringSoonDays)
      .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  }, [expiringSoonDays, filteredProducts]);

  const lowStockProducts = useMemo(() => {
    return filteredProducts.filter((product) => inferLowStock(product, lowStockThreshold));
  }, [filteredProducts, lowStockThreshold]);

  const recentProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 6);
  }, [filteredProducts]);

  const recipeTeaser = useMemo(
    () => buildRecipeSuggestions(filteredProducts, { expiringSoonDays }).slice(0, 3),
    [expiringSoonDays, filteredProducts]
  );

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

  const openProduct = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product/${id}`);
  };

  const openRecipe = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipe/${id}`);
  };

  const openListMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsListMenuOpen(true);
  };

  const focusHomeTop = () => {
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onSelectMenuEntry = (
    slug: 'frigo' | 'congelateur' | 'sec' | 'animalerie' | 'dph' | 'autre' | 'recipes' | 'shopping-lists'
  ) => {
    setIsListMenuOpen(false);

    if (slug === 'recipes') {
      router.push('/recipes');
      return;
    }

    if (slug === 'shopping-lists') {
      router.push('/shopping-lists');
      return;
    }

    router.push(`/category/${slug}`);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.islandTopRow, { paddingTop: insets.top + 6 }]}> 
        <Pressable
          style={({ pressed }) => [
            styles.islandSideButton,
            {
              backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
              borderColor: palette.border,
            },
          ]}
          onPress={() => router.push('/shopping-lists')}>
          <IconSymbol name="list.bullet.rectangle.portrait" size={20} color={palette.textPrimary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.dynamicIslandButton,
            {
              backgroundColor: pressed
                ? resolvedTheme === 'dark'
                  ? '#0B1220'
                  : '#1B2536'
                : resolvedTheme === 'dark'
                  ? '#000000'
                  : '#111827',
            },
          ]}
          onPress={() => router.push('/profile')}>
          <IconSymbol name="person.crop.circle" size={18} color="#F8FAFC" />
          <Text style={[Typography.labelSm, { color: '#F8FAFC' }]}>Profil</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.islandSideButton,
            {
              backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
              borderColor: palette.border,
            },
          ]}
          onPress={() => setIsNotificationsOpen(true)}>
          <IconSymbol name="bell.badge" size={20} color={palette.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 150,
          paddingTop: 12,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}>
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

        {isHydrating ? (
          <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>Chargement de l’inventaire local…</Text>
          </View>
        ) : null}

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
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Priorité: à consommer ({expiringSoonDays} j)
              </Text>
            </View>

            <View style={[styles.countPill, { backgroundColor: palette.overlay, borderColor: palette.border }]}> 
              <Text style={[Typography.labelLg, { color: palette.accentPrimary }]}>{urgentProducts.length}</Text>
            </View>
          </View>

          <View style={styles.heroList}>
            {urgentProducts.slice(0, 3).map((product) => (
              <Pressable key={product.id} onPress={() => openProduct(product.id)} style={[styles.heroItem, { backgroundColor: palette.surfaceSoft }]}> 
                <View style={[styles.heroIconWrap, { backgroundColor: palette.overlay }]}> 
                  <IconSymbol name={zoneIconMap[product.zone]} size={16} color={palette.accentPrimary} />
                </View>

                <View style={styles.heroTextWrap}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    {product.expiresAt ? formatFullDate(product.expiresAt) : 'Pas de date'} • {zoneLabel(product.zone)}
                  </Text>
                </View>
              </Pressable>
            ))}

            {!isHydrating && urgentProducts.length === 0 ? (
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                Aucun produit à moins de {expiringSoonDays} jour{expiringSoonDays > 1 ? 's' : ''}.
              </Text>
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

        {!isHydrating && products.length === 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Inventaire vide</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Scanne ton premier produit pour alimenter automatiquement toute l’application.</Text>
            <Pressable
              onPress={openScanner}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
              ]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Scanner maintenant</Text>
            </Pressable>
          </View>
        ) : null}

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
              onOpenProduct: openProduct,
            })}
            </View>
          ) : (
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Touchez pour afficher les produits avec quantité ≤ {lowStockThreshold}.
            </Text>
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
              onOpenProduct: openProduct,
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
            {recipeTeaser.map((recipe, recipeIndex) => (
              <Pressable
                key={`${recipe.id}-${recipeIndex}`}
                onPress={() => openRecipe(recipe.id)}
                style={[styles.recipeCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                <View style={styles.rowBetween}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{recipe.title}</Text>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>{recipe.time}</Text>
                </View>

                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{recipe.ingredients.join(' • ')}</Text>
              </Pressable>
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
          <Pressable onPress={focusHomeTop} style={[styles.navButton, styles.navButtonActive, { backgroundColor: palette.overlay }]}> 
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
  onOpenProduct,
}: {
  mode: DisplayMode;
  list: InventoryProduct[];
  palette: ReturnType<typeof useAppTheme>['palette'];
  onOpenProduct: (id: string) => void;
}) {
  if (list.length === 0) {
    return <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucun produit à afficher.</Text>;
  }

  if (mode === 'cards') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsWrap}>
        {list.map((product) => (
          <Pressable key={product.id} onPress={() => onOpenProduct(product.id)} style={[styles.productCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
            <View style={styles.rowBetween}>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]} numberOfLines={1}>
                {product.name}
              </Text>
              <IconSymbol name={zoneIconMap[product.zone]} size={16} color={palette.accentPrimary} />
            </View>

            <Text style={[Typography.caption, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Expire le {product.expiresAt ? formatFullDate(product.expiresAt) : '—'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.verticalListWrap}>
      {list.map((product) => (
        <Pressable key={product.id} onPress={() => onOpenProduct(product.id)} style={[styles.productListItem, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
          <View style={styles.rowCenter}>
            <View style={[styles.smallIcon, { backgroundColor: palette.overlay }]}> 
              <IconSymbol name={zoneIconMap[product.zone]} size={14} color={palette.accentPrimary} />
            </View>

            <View>
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{product.name}</Text>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>Expire le {product.expiresAt ? formatFullDate(product.expiresAt) : '—'}</Text>
            </View>
          </View>

          <Text style={[Typography.caption, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  islandTopRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  islandSideButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicIslandButton: {
    minWidth: 128,
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
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
