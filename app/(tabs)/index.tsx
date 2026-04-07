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
import { Typography } from '@/constants/theme';
import { DisplayMode, inferLowStock, InventoryProduct, zoneIconMap } from '@/data/inventory';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { daysUntil, formatFullDate, zoneLabel } from '@/utils/format';
import { buildRecipeSuggestions } from '@/utils/recipes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ZONES = [
  { slug: 'frigo', label: 'Frigo', icon: 'refrigerator' },
  { slug: 'congelateur', label: 'Congélateur', icon: 'snowflake' },
  { slug: 'sec', label: 'Aliment sec', icon: 'archivebox.fill' },
  { slug: 'autre', label: 'Autre', icon: 'ellipsis.circle.fill' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { products, isHydrating } = useInventory();
  const { expiringSoonDays, lowStockThreshold } = useAppSettings();
  const scrollRef = useRef<ScrollView>(null);

  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const [searchValue, setSearchValue] = useState('');
  const [isLowStockExpanded, setIsLowStockExpanded] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    const query = searchValue.trim().toLowerCase();
    return products.filter((p) => {
      const haystack = [p.name, p.barcode ?? '', p.category ?? '', p.format ?? '', p.unit, zoneLabel(p.zone)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [products, searchValue]);

  const urgentProducts = useMemo(
    () =>
      [...filteredProducts]
        .filter((p) => p.expiresAt && daysUntil(p.expiresAt) <= expiringSoonDays)
        .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '')),
    [expiringSoonDays, filteredProducts]
  );

  const lowStockProducts = useMemo(
    () => filteredProducts.filter((p) => inferLowStock(p, lowStockThreshold)),
    [filteredProducts, lowStockThreshold]
  );

  const recentProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 6),
    [filteredProducts]
  );

  const recipeTeaser = useMemo(
    () => buildRecipeSuggestions(filteredProducts, { expiringSoonDays }).slice(0, 3),
    [expiringSoonDays, filteredProducts]
  );

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

  const toggleLowStock = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLowStockExpanded((v) => !v);
    Haptics.selectionAsync();
  };

  const selectDisplay = (mode: DisplayMode) => {
    if (mode === displayMode) return;
    setDisplayMode(mode);
    Haptics.selectionAsync();
  };

  const onSelectMenuEntry = (
    slug: 'frigo' | 'congelateur' | 'sec' | 'autre' | 'recipes' | 'shopping-lists'
  ) => {
    setIsListMenuOpen(false);
    if (slug === 'recipes') { router.push('/recipes'); return; }
    if (slug === 'shopping-lists') { router.push('/shopping-lists'); return; }
    router.push(`/category/${slug}`);
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: palette.background }]}>

      {/* ══════════ HEADER MINIMALISTE ══════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Gauche : liste de courses */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/shopping-lists'); }}
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark }]}>
          <IconSymbol name="cart.fill" size={20} color={palette.accentPrimary} />
        </Pressable>

        {/* Centre : profil */}
        <Pressable
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.headerProfileBtn, { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark }]}>
          <IconSymbol name="person.crop.circle" size={24} color={palette.accentPrimary} />
          <Text style={[styles.headerProfileCount, { color: palette.textSecondary }]}>
            {products.length} produit{products.length > 1 ? 's' : ''}
          </Text>
        </Pressable>

        {/* Droite : notifications */}
        <Pressable
          onPress={() => setIsNotificationsOpen(true)}
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark }]}>
          <IconSymbol name="bell.badge" size={20} color={palette.accentPrimary} />
        </Pressable>
      </View>

      {/* ══════════ SCROLL CONTENT ══════════ */}
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
          <IconSymbol name="magnifyingglass" size={17} color={palette.accentPrimary} />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Rechercher dans l'inventaire…"
            placeholderTextColor={palette.textTertiary}
            style={[styles.searchInput, { color: palette.textPrimary }]}
          />
          {searchValue.length > 0 && (
            <Pressable onPress={() => setSearchValue('')}>
              <IconSymbol name="xmark.circle.fill" size={16} color={palette.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* ── Zones rapides ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Zones</Text>
            <Pressable onPress={() => setIsListMenuOpen(true)}>
              <Text style={[styles.sectionLink, { color: palette.accentPrimary }]}>Tout voir</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneScroll}>
            {ZONES.map((zone) => {
              const count = products.filter((p) => p.zone === zone.slug).length;
              return (
                <Pressable
                  key={zone.slug}
                  onPress={() => { Haptics.selectionAsync(); router.push(`/category/${zone.slug}`); }}
                  style={({ pressed }) => [
                    styles.zoneCard,
                    { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
                  ]}>
                  <View style={[styles.zoneIconCircle, { backgroundColor: palette.glowSecondary }]}>
                    <IconSymbol name={zone.icon} size={22} color={palette.accentPrimary} />
                  </View>
                  <Text style={[styles.zoneLabel, { color: palette.textPrimary }]}>{zone.label}</Text>
                  <Text style={[styles.zoneCount, { color: palette.textTertiary }]}>{count}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Produits expirant bientôt ── */}
        {urgentProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.urgentDot, { backgroundColor: palette.danger }]} />
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>À consommer vite</Text>
              </View>
              <Pressable onPress={() => router.push('/expiring')}>
                <Text style={[styles.sectionLink, { color: palette.accentPrimary }]}>Voir tout</Text>
              </Pressable>
            </View>

            <View style={styles.urgentList}>
              {urgentProducts.slice(0, 4).map((product) => {
                const days = daysUntil(product.expiresAt);
                const isExpired = days < 0;
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => openProduct(product.id)}
                    style={({ pressed }) => [
                      styles.urgentRow,
                      { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
                    ]}>
                    <View style={[
                      styles.urgentIndicator,
                      { backgroundColor: isExpired ? palette.danger : days <= 2 ? palette.warning : palette.accentPrimary },
                    ]} />
                    <View style={styles.urgentText}>
                      <Text style={[styles.urgentName, { color: palette.textPrimary }]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={[styles.urgentMeta, { color: palette.textSecondary }]}>
                        {zoneLabel(product.zone)} · {product.expiresAt ? formatFullDate(product.expiresAt) : '—'}
                      </Text>
                    </View>
                    <View style={[
                      styles.urgentBadge,
                      { backgroundColor: isExpired ? palette.danger + '22' : palette.warning + '22' },
                    ]}>
                      <Text style={[
                        styles.urgentBadgeText,
                        { color: isExpired ? palette.danger : palette.warning },
                      ]}>
                        {isExpired ? `+${Math.abs(days)}j` : `J-${days}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Stock faible ── */}
        {lowStockProducts.length > 0 && (
          <View style={styles.section}>
            <Pressable style={styles.sectionHeader} onPress={toggleLowStock}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.urgentDot, { backgroundColor: palette.warning }]} />
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Stock faible</Text>
                <View style={[styles.countPill, { backgroundColor: palette.warning + '22' }]}>
                  <Text style={[styles.countPillText, { color: palette.warning }]}>{lowStockProducts.length}</Text>
                </View>
              </View>
              <IconSymbol
                name={isLowStockExpanded ? 'chevron.up' : 'chevron.down'}
                size={15}
                color={palette.textTertiary}
              />
            </Pressable>

            {isLowStockExpanded && (
              <View style={styles.urgentList}>
                {lowStockProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() => openProduct(product.id)}
                    style={({ pressed }) => [
                      styles.urgentRow,
                      { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
                    ]}>
                    <View style={[styles.urgentIndicator, { backgroundColor: palette.warning }]} />
                    <View style={styles.urgentText}>
                      <Text style={[styles.urgentName, { color: palette.textPrimary }]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={[styles.urgentMeta, { color: palette.textSecondary }]}>
                        {product.quantity} {product.unit} · {zoneLabel(product.zone)}
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={13} color={palette.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Derniers ajouts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Derniers ajouts</Text>
            <View style={[styles.segmented, { backgroundColor: palette.surface }]}>
              <Pressable
                onPress={() => selectDisplay('cards')}
                style={[styles.seg, displayMode === 'cards' && { backgroundColor: palette.accentPrimary }]}>
                <IconSymbol
                  name="square.grid.2x2.fill"
                  size={13}
                  color={displayMode === 'cards' ? palette.textInverse : palette.textTertiary}
                />
              </Pressable>
              <Pressable
                onPress={() => selectDisplay('list')}
                style={[styles.seg, displayMode === 'list' && { backgroundColor: palette.accentPrimary }]}>
                <IconSymbol
                  name="rectangle.grid.1x2.fill"
                  size={13}
                  color={displayMode === 'list' ? palette.textInverse : palette.textTertiary}
                />
              </Pressable>
            </View>
          </View>

          {recentProducts.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
              <IconSymbol name="tray" size={26} color={palette.textTertiary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Aucun produit encore.</Text>
              <Pressable
                onPress={openScanner}
                style={[styles.emptyBtn, { backgroundColor: palette.accentPrimary }]}>
                <Text style={[styles.emptyBtnText, { color: palette.textInverse }]}>Scanner maintenant</Text>
              </Pressable>
            </View>
          ) : displayMode === 'cards' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
              {recentProducts.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => openProduct(product.id)}
                  style={({ pressed }) => [
                    styles.productCard,
                    { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
                  ]}>
                  <View style={[styles.productCardIcon, { backgroundColor: palette.glowSecondary }]}>
                    <IconSymbol name={zoneIconMap[product.zone]} size={20} color={palette.accentPrimary} />
                  </View>
                  <Text style={[styles.productCardName, { color: palette.textPrimary }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productCardMeta, { color: palette.textTertiary }]}>
                    {zoneLabel(product.zone)}
                  </Text>
                  <Text style={[styles.productCardDate, { color: palette.textSecondary }]}>
                    {product.expiresAt ? formatFullDate(product.expiresAt) : '—'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.urgentList}>
              {recentProducts.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => openProduct(product.id)}
                  style={({ pressed }) => [
                    styles.urgentRow,
                    { backgroundColor: pressed ? palette.surfacePressed : palette.surface, shadowColor: palette.shadowDark },
                  ]}>
                  <View style={[styles.urgentIndicator, { backgroundColor: palette.accentPrimary }]} />
                  <View style={styles.urgentText}>
                    <Text style={[styles.urgentName, { color: palette.textPrimary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[styles.urgentMeta, { color: palette.textSecondary }]}>
                      {zoneLabel(product.zone)} · {product.expiresAt ? formatFullDate(product.expiresAt) : '—'}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={13} color={palette.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Recettes ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Idées recettes</Text>
            <Pressable onPress={() => router.push('/recipes')}>
              <Text style={[styles.sectionLink, { color: palette.accentPrimary }]}>Toutes les recettes</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
            {recipeTeaser.map((recipe, i) => {
              const COLORS = ['#16A34A', '#D97706', '#7C3AED'];
              const c = COLORS[i % COLORS.length];
              return (
                <Pressable
                  key={`${recipe.id}-${i}`}
                  onPress={() => openRecipe(recipe.id)}
                  style={({ pressed }) => [
                    styles.recipeCard,
                    { backgroundColor: pressed ? c + 'DD' : c },
                  ]}>
                  <Text style={styles.recipeTime}>{recipe.time}</Text>
                  <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
                  <Text style={styles.recipeIngredients} numberOfLines={1}>
                    {recipe.ingredients.join(' · ')}
                  </Text>
                  <View style={styles.recipeArrow}>
                    <IconSymbol name="arrow.right" size={14} color="rgba(255,255,255,0.9)" />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>


      </ScrollView>

      {/* ══════════ BOTTOM BAR ══════════ */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>

        {/* Home (gauche) */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
          style={({ pressed }) => [styles.bottomTabBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <IconSymbol name="house.fill" size={24} color={palette.accentPrimary} />
          <Text style={[styles.bottomTabLabel, { color: palette.accentPrimary }]}>Home</Text>
        </Pressable>

        {/* Spacer gauche */}
        <View style={styles.bottomSpacer} />

        {/* Scanner (centre, plus grand) */}
        <Pressable
          onPress={openScanner}
          style={({ pressed }) => [
            styles.fabCenter,
            { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary, shadowColor: palette.accentPrimary },
          ]}>
          <IconSymbol name="camera.fill" size={32} color={palette.textInverse} />
          <Text style={[styles.fabCenterLabel, { color: palette.textInverse }]}>Scanner</Text>
        </Pressable>

        {/* Spacer droite */}
        <View style={styles.bottomSpacer} />

        {/* Zones (droite) */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsListMenuOpen(true); }}
          style={({ pressed }) => [styles.bottomTabBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <IconSymbol name="square.grid.2x2.fill" size={24} color={palette.accentPrimary} />
          <Text style={[styles.bottomTabLabel, { color: palette.accentPrimary }]}>Zones</Text>
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


const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* ── Header minimaliste ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  headerProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  headerProfileCount: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Scroll ── */
  scrollContent: {
    gap: 6,
    paddingTop: 16,
  },

  /* ── Search ── */
  searchBar: {
    marginHorizontal: 16,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  /* ── Section ── */
  section: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  urgentDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Zone cards ── */
  zoneScroll: {
    gap: 10,
    paddingRight: 4,
  },
  zoneCard: {
    width: 90,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  zoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  zoneCount: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* ── Urgent / list rows ── */
  urgentList: {
    gap: 8,
  },
  urgentRow: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  urgentIndicator: {
    width: 5,
    alignSelf: 'stretch',
  },
  urgentText: {
    flex: 1,
    paddingVertical: 14,
    gap: 3,
  },
  urgentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  urgentMeta: {
    fontSize: 12,
    fontWeight: '400',
  },
  urgentBadge: {
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Product cards (horizontal) ── */
  cardScroll: {
    gap: 12,
    paddingRight: 4,
  },
  productCard: {
    width: 148,
    borderRadius: 20,
    padding: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  productCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  productCardMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  productCardDate: {
    fontSize: 12,
    fontWeight: '400',
  },

  /* ── Segmented ── */
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  seg: {
    width: 32,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Recipe cards ── */
  recipeCard: {
    width: 180,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  recipeTime: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  recipeIngredients: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  recipeArrow: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Shopping shortcut ── */
  shoppingShortcut: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  shoppingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingText: {
    flex: 1,
    gap: 3,
  },
  shoppingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  shoppingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },

  /* ── Empty state ── */
  emptyBox: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ── Bottom bar ── */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  bottomTabBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  bottomSpacer: {
    width: 45,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  fabCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 92,
    height: 92,
    borderRadius: 46,
    marginTop: -34,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
  },
  fabCenterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
