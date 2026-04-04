import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { DEFAULT_SHOPPING_ITEM_UNIT, ShoppingList, ShoppingListItem } from '@/data/shopping-lists';
import { useInventory } from '@/providers/inventory-provider';
import { useShoppingLists } from '@/providers/shopping-lists-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { formatShortDate } from '@/utils/format';

import { Typography } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ShoppingListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { products } = useInventory();
  const {
    lists,
    isHydrating,
    createList,
    renameList,
    setListStatus,
    deleteList,
    addItem,
    updateItem,
    removeItem,
    clearCheckedItems,
  } = useShoppingLists();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftQuantityInput, setDraftQuantityInput] = useState('1');
  const [draftUnit, setDraftUnit] = useState(DEFAULT_SHOPPING_ITEM_UNIT);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);

  const activeLists = useMemo(() => {
    return [...lists]
      .filter((list) => list.status === 'active')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [lists]);

  const archivedLists = useMemo(() => {
    return [...lists]
      .filter((list) => list.status === 'done')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [lists]);

  const selectedList = useMemo(() => {
    if (!selectedListId) {
      return undefined;
    }

    return lists.find((list) => list.id === selectedListId);
  }, [lists, selectedListId]);

  const sortedSelectedItems = useMemo(() => {
    if (!selectedList) {
      return [];
    }

    return [...selectedList.items].sort((a, b) => {
      const rankA = itemStateRank(a);
      const rankB = itemStateRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [selectedList]);

  const selectedListStats = useMemo(() => {
    if (!selectedList) {
      return {
        total: 0,
        bought: 0,
        unavailable: 0,
        completed: 0,
        remaining: 0,
        progressRatio: 0,
      };
    }

    const total = selectedList.items.length;
    const bought = selectedList.items.filter((item) => item.isChecked).length;
    const unavailable = selectedList.items.filter((item) => item.isUnavailable).length;
    const completed = bought + unavailable;
    const remaining = Math.max(0, total - completed);
    const progressRatio = total === 0 ? 0 : completed / total;

    return {
      total,
      bought,
      unavailable,
      completed,
      remaining,
      progressRatio,
    };
  }, [selectedList]);

  const visibleChecklistItems = useMemo(() => {
    if (!showOnlyRemaining) {
      return sortedSelectedItems;
    }

    return sortedSelectedItems.filter((item) => !isItemCompleted(item));
  }, [showOnlyRemaining, sortedSelectedItems]);

  const inventorySuggestions = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();
    const source = query
      ? products.filter((product) => {
          const haystack = [product.name, product.category ?? '', product.barcode ?? ''].join(' ').toLowerCase();
          return haystack.includes(query);
        })
      : products;

    return source.slice(0, 10);
  }, [inventoryQuery, products]);

  useEffect(() => {
    if (lists.length === 0) {
      setSelectedListId(null);
      return;
    }

    if (selectedListId && lists.some((list) => list.id === selectedListId)) {
      return;
    }

    const fallback = activeLists[0] ?? archivedLists[0];
    setSelectedListId(fallback?.id ?? null);
  }, [activeLists, archivedLists, lists, selectedListId]);

  useEffect(() => {
    setRenameInput(selectedList?.name ?? '');
  }, [selectedList?.id, selectedList?.name]);

  const togglePurchased = async (item: ShoppingListItem) => {
    if (!selectedList || selectedList.status !== 'active') {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await updateItem(selectedList.id, item.id, {
      isChecked: !item.isChecked,
      isUnavailable: item.isChecked ? item.isUnavailable : false,
    });

    if (!item.isChecked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    Haptics.selectionAsync();
  };

  const toggleUnavailable = async (item: ShoppingListItem) => {
    if (!selectedList || selectedList.status !== 'active') {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await updateItem(selectedList.id, item.id, {
      isUnavailable: !item.isUnavailable,
      isChecked: item.isUnavailable ? item.isChecked : false,
    });

    if (item.isUnavailable) {
      Haptics.selectionAsync();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEditMenu = () => {
    setIsEditMenuOpen(true);
    Haptics.selectionAsync();
  };

  const closeEditMenu = () => {
    setIsEditMenuOpen(false);
  };

  const createNewList = async () => {
    const created = await createList(newListName);
    setNewListName('');
    setSelectedListId(created.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveListName = async () => {
    if (!selectedList) {
      return;
    }

    await renameList(selectedList.id, renameInput);
    await Haptics.selectionAsync();
  };

  const toggleSelectedListStatus = async () => {
    if (!selectedList) {
      return;
    }

    const nextStatus = selectedList.status === 'active' ? 'done' : 'active';
    await setListStatus(selectedList.id, nextStatus);
    await Haptics.selectionAsync();
  };

  const addDraftItem = async () => {
    if (!selectedList) {
      Alert.alert('Aucune liste', 'Sélectionne une liste avant d’ajouter un article.');
      return;
    }

    if (selectedList.status !== 'active') {
      Alert.alert('Liste clôturée', 'Rouvre la liste pour ajouter des articles.');
      return;
    }

    const name = draftName.trim();
    if (!name) {
      Alert.alert('Nom manquant', 'Ajoute un nom de produit.');
      return;
    }

    const quantity = parseQuantityInput(draftQuantityInput);
    if (!quantity) {
      Alert.alert('Quantité invalide', 'Utilise une quantité positive (ex: 1, 2, 0.5).');
      return;
    }

    const created = await addItem({
      listId: selectedList.id,
      name,
      quantity,
      unit: draftUnit,
    });

    if (!created) {
      Alert.alert('Ajout impossible', 'Impossible d’ajouter cet article.');
      return;
    }

    setDraftName('');
    setDraftQuantityInput('1');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addFromInventory = async (product: { id: string; name: string; unit: string }) => {
    if (!selectedList) {
      return;
    }

    if (selectedList.status !== 'active') {
      Alert.alert('Liste clôturée', 'Rouvre la liste pour ajouter des articles.');
      return;
    }

    await addItem({
      listId: selectedList.id,
      name: product.name,
      quantity: 1,
      unit: product.unit,
      linkedProductId: product.id,
    });
    Haptics.selectionAsync();
  };

  const shiftItemQuantityInEdit = async (item: ShoppingListItem, delta: number) => {
    if (!selectedList || selectedList.status !== 'active') {
      return;
    }

    const nextQuantity = Math.max(0.01, Math.round((item.quantity + delta) * 1000) / 1000);
    await updateItem(selectedList.id, item.id, { quantity: nextQuantity });
    Haptics.selectionAsync();
  };

  const removeItemInEdit = async (item: ShoppingListItem) => {
    if (!selectedList) {
      return;
    }

    await removeItem(selectedList.id, item.id);
    Haptics.selectionAsync();
  };

  const onClearCheckedInEdit = () => {
    if (!selectedList) {
      return;
    }

    const checkedCount = selectedList.items.filter((item) => item.isChecked || item.isUnavailable).length;
    if (checkedCount === 0) {
      Alert.alert('Rien à nettoyer', 'Aucun article complété dans la liste.');
      return;
    }

    Alert.alert('Nettoyer les complétés ?', `${checkedCount} article(s) cochés ou barrés seront supprimés.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Nettoyer',
        style: 'destructive',
        onPress: () => {
          void handleClearCheckedInEdit();
        },
      },
    ]);
  };

  const onDeleteSelectedList = () => {
    if (!selectedList) {
      return;
    }

    Alert.alert(
      'Supprimer la liste ?',
      `La liste "${selectedList.name}" et ses ${selectedList.items.length} article(s) seront supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void handleDeleteSelectedList();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Listes de courses</Text>

        <Pressable onPress={openEditMenu} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="slider.horizontal.3" size={18} color={palette.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}>
        {isHydrating ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Chargement des listes…</Text>
          </View>
        ) : null}

        <ListsSection
          title="Nouvelles listes"
          lists={activeLists}
          selectedListId={selectedListId}
          onSelectList={setSelectedListId}
          palette={palette}
        />

        <ListsSection
          title="Anciennes listes"
          lists={archivedLists}
          selectedListId={selectedListId}
          onSelectList={setSelectedListId}
          palette={palette}
        />

        {selectedList ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.rowBetween}>
              <View style={styles.listHeaderText}>
                <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{selectedList.name}</Text>
                <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                  {selectedListStats.completed}/{selectedListStats.total} complétés ({selectedListStats.bought} achetés,
                  {' '}
                  {selectedListStats.unavailable} indisponibles) • {selectedListStats.remaining} restant
                  {selectedListStats.remaining > 1 ? 's' : ''} • Mis à jour le {formatShortDate(selectedList.updatedAt)}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: selectedList.status === 'active' ? palette.success : palette.overlay,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[Typography.caption, { color: selectedList.status === 'active' ? palette.textInverse : palette.textPrimary }]}>
                  {selectedList.status === 'active' ? 'Active' : 'Archivée'}
                </Text>
              </View>
            </View>

            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: selectedListStats.progressRatio >= 1 ? palette.success : palette.accentPrimary,
                      width: `${Math.max(0, Math.min(100, Math.round(selectedListStats.progressRatio * 100)))}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                {Math.round(selectedListStats.progressRatio * 100)}%
              </Text>
            </View>

            <View style={styles.rowActions}>
              <Pressable
                onPress={() => setShowOnlyRemaining((previous) => !previous)}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  {
                    backgroundColor: showOnlyRemaining
                      ? palette.accentPrimary
                      : pressed
                        ? palette.surfacePressed
                        : palette.surfaceSoft,
                    borderColor: palette.border,
                  },
                ]}>
                <Text
                  style={[
                    Typography.labelSm,
                    {
                      color: showOnlyRemaining ? palette.textInverse : palette.textPrimary,
                    },
                  ]}>
                  {showOnlyRemaining ? 'Afficher tout' : 'Afficher restant'}
                </Text>
              </Pressable>

              <View style={[styles.remainingBadge, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                <Text style={[Typography.labelSm, { color: palette.textPrimary }]}>
                  {selectedListStats.remaining} restant{selectedListStats.remaining > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {visibleChecklistItems.length === 0 ? (
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                {showOnlyRemaining
                  ? 'Tout est coché. Tu peux afficher tout pour revoir la liste complète.'
                  : 'Cette liste est vide.'}
              </Text>
            ) : (
              <View style={styles.itemsWrap}>
                {visibleChecklistItems.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.surfaceSoft,
                        opacity: selectedList.status === 'active' ? 1 : 0.84,
                      },
                    ]}>
                    <View style={styles.itemStateActions}>
                      <Pressable
                        onPress={() => togglePurchased(item)}
                        disabled={selectedList.status !== 'active'}
                        style={({ pressed }) => [
                          styles.itemStateButton,
                          {
                            backgroundColor:
                              item.isChecked
                                ? palette.success
                                : pressed
                                  ? palette.surfacePressed
                                  : palette.surface,
                            borderColor: item.isChecked ? palette.success : palette.border,
                            opacity: selectedList.status === 'active' ? 1 : 0.45,
                          },
                        ]}>
                        <IconSymbol name={item.isChecked ? 'checkmark.circle.fill' : 'circle'} size={18} color={item.isChecked ? palette.textInverse : palette.textTertiary} />
                      </Pressable>

                      <Pressable
                        onPress={() => toggleUnavailable(item)}
                        disabled={selectedList.status !== 'active'}
                        style={({ pressed }) => [
                          styles.itemStateButton,
                          {
                            backgroundColor:
                              item.isUnavailable
                                ? palette.danger
                                : pressed
                                  ? palette.surfacePressed
                                  : palette.surface,
                            borderColor: item.isUnavailable ? palette.danger : palette.border,
                            opacity: selectedList.status === 'active' ? 1 : 0.45,
                          },
                        ]}>
                        <IconSymbol name="xmark" size={14} color={item.isUnavailable ? palette.textInverse : palette.danger} />
                      </Pressable>
                    </View>

                    <IconSymbol
                      name={item.isUnavailable ? 'xmark' : item.isChecked ? 'checkmark.circle.fill' : 'circle'}
                      size={16}
                      color={item.isUnavailable ? palette.danger : item.isChecked ? palette.success : palette.textTertiary}
                    />

                    <View style={styles.itemTextWrap}>
                      <Text
                        style={[
                          Typography.bodyMd,
                          {
                            color: item.isUnavailable
                              ? palette.danger
                              : item.isChecked
                                ? palette.textSecondary
                                : palette.textPrimary,
                            textDecorationLine: item.isChecked || item.isUnavailable ? 'line-through' : 'none',
                          },
                        ]}>
                        {item.name}
                      </Text>
                      <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                        {item.isUnavailable
                          ? `Indisponible en rayon • ${formatQuantity(item.quantity)} ${item.unit}`
                          : `${formatQuantity(item.quantity)} ${item.unit}`}
                      </Text>
                    </View>

                    <View style={[styles.quantityPill, { backgroundColor: palette.overlay, borderColor: palette.border }]}>
                      <Text style={[Typography.caption, { color: palette.textPrimary }]}>
                        {formatQuantity(item.quantity)} {item.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={[Typography.caption, { color: palette.textSecondary }]}>
              {selectedList.status === 'active'
                ? 'Vert: acheté • Rouge: indisponible. Les deux comptent dans la progression.'
                : 'Liste en lecture seule. Utilise le menu d’édition pour la rouvrir.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Aucune liste sélectionnée. Crée une liste dans le menu d’édition.
            </Text>
            <Pressable
              onPress={openEditMenu}
              style={({ pressed }) => [
                styles.emptyCta,
                {
                  backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
                },
              ]}>
              <Text style={[Typography.labelMd, { color: palette.textInverse }]}>Ouvrir le menu d’édition</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={isEditMenuOpen} transparent animationType="slide" onRequestClose={closeEditMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2, 6, 23, 0.44)' }]} onPress={closeEditMenu} />

          <View style={[styles.modalSheet, { backgroundColor: palette.background, borderColor: palette.border, paddingBottom: insets.bottom + 12 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Menu d’édition</Text>

              <Pressable onPress={closeEditMenu} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
                <IconSymbol name="xmark" size={16} color={palette.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}>
              <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Créer une liste</Text>
                <View style={styles.createRow}>
                  <TextInput
                    value={newListName}
                    onChangeText={setNewListName}
                    placeholder="Nom de la liste"
                    placeholderTextColor={palette.textTertiary}
                    style={[
                      styles.input,
                      Typography.bodyMd,
                      {
                        color: palette.textPrimary,
                        borderColor: palette.border,
                        backgroundColor: palette.surfaceSoft,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={createNewList}
                    style={({ pressed }) => [
                      styles.createButton,
                      {
                        backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
                      },
                    ]}>
                    <IconSymbol name="plus" size={16} color={palette.textInverse} />
                  </Pressable>
                </View>
              </View>

              {selectedList ? (
                <>
                  <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Paramètres de la liste</Text>

                    <View style={styles.createRow}>
                      <TextInput
                        value={renameInput}
                        onChangeText={setRenameInput}
                        placeholder="Nom de la liste"
                        placeholderTextColor={palette.textTertiary}
                        style={[
                          styles.input,
                          Typography.bodyMd,
                          {
                            color: palette.textPrimary,
                            borderColor: palette.border,
                            backgroundColor: palette.surfaceSoft,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={saveListName}
                        style={({ pressed }) => [
                          styles.primaryPill,
                          {
                            backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                            borderColor: palette.border,
                          },
                        ]}>
                        <Text style={[Typography.labelSm, { color: palette.textPrimary }]}>Renommer</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={toggleSelectedListStatus}
                      style={({ pressed }) => [
                        styles.secondaryAction,
                        {
                          backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                          borderColor: palette.border,
                        },
                      ]}>
                      <Text style={[Typography.labelSm, { color: palette.textPrimary }]}>
                        {selectedList.status === 'active' ? 'Archiver la liste' : 'Rouvrir la liste'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Ajouter un article</Text>

                    <TextInput
                      value={draftName}
                      onChangeText={setDraftName}
                      placeholder="Nom du produit"
                      placeholderTextColor={palette.textTertiary}
                      style={[
                        styles.input,
                        Typography.bodyMd,
                        {
                          color: palette.textPrimary,
                          borderColor: palette.border,
                          backgroundColor: palette.surfaceSoft,
                        },
                      ]}
                    />

                    <View style={styles.addRow}>
                      <View style={styles.quantityWrap}>
                        <Pressable
                          onPress={() => setDraftQuantityInput(shiftQuantityInput(draftQuantityInput, -1))}
                          style={[styles.stepperButton, { backgroundColor: palette.surfaceSoft }]}>
                          <IconSymbol name="minus" size={14} color={palette.textPrimary} />
                        </Pressable>

                        <TextInput
                          value={draftQuantityInput}
                          onChangeText={setDraftQuantityInput}
                          keyboardType="decimal-pad"
                          style={[
                            styles.quantityInput,
                            Typography.labelLg,
                            {
                              color: palette.textPrimary,
                              borderColor: palette.border,
                              backgroundColor: palette.surfaceSoft,
                            },
                          ]}
                        />

                        <Pressable
                          onPress={() => setDraftQuantityInput(shiftQuantityInput(draftQuantityInput, 1))}
                          style={[styles.stepperButton, { backgroundColor: palette.surfaceSoft }]}>
                          <IconSymbol name="plus" size={14} color={palette.textPrimary} />
                        </Pressable>
                      </View>

                      <TextInput
                        value={draftUnit}
                        onChangeText={setDraftUnit}
                        placeholder="unité"
                        placeholderTextColor={palette.textTertiary}
                        style={[
                          styles.unitInput,
                          Typography.bodySm,
                          {
                            color: palette.textPrimary,
                            borderColor: palette.border,
                            backgroundColor: palette.surfaceSoft,
                          },
                        ]}
                      />

                      <Pressable
                        onPress={addDraftItem}
                        style={({ pressed }) => [
                          styles.primaryAction,
                          {
                            backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
                          },
                        ]}>
                        <Text style={[Typography.labelSm, { color: palette.textInverse }]}>Ajouter</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Ajouter depuis l’inventaire</Text>
                    <TextInput
                      value={inventoryQuery}
                      onChangeText={setInventoryQuery}
                      placeholder="Recherche inventaire"
                      placeholderTextColor={palette.textTertiary}
                      style={[
                        styles.input,
                        Typography.bodySm,
                        {
                          color: palette.textPrimary,
                          borderColor: palette.border,
                          backgroundColor: palette.surfaceSoft,
                        },
                      ]}
                    />

                    <View style={styles.inventoryList}>
                      {inventorySuggestions.map((product) => (
                        <Pressable
                          key={product.id}
                          onPress={() => addFromInventory(product)}
                          style={({ pressed }) => [
                            styles.inventoryRow,
                            {
                              backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                              borderColor: palette.border,
                            },
                          ]}>
                          <View style={styles.inventoryText}>
                            <Text style={[Typography.labelMd, { color: palette.textPrimary }]} numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                              {product.quantity} {product.unit}
                            </Text>
                          </View>
                          <IconSymbol name="plus" size={14} color={palette.accentPrimary} />
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Gérer les articles</Text>
                    {sortedSelectedItems.length === 0 ? (
                      <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucun article.</Text>
                    ) : (
                      <View style={styles.itemsWrap}>
                        {sortedSelectedItems.map((item) => (
                          <View key={item.id} style={[styles.editItemRow, { borderColor: palette.border }]}>
                            <View style={styles.itemTextWrap}>
                              <Text style={[Typography.bodySm, { color: palette.textPrimary }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                                {formatQuantity(item.quantity)} {item.unit}
                              </Text>
                            </View>

                            <View style={styles.itemActions}>
                              <Pressable
                                onPress={() => shiftItemQuantityInEdit(item, -1)}
                                disabled={selectedList.status !== 'active'}
                                style={[
                                  styles.itemActionButton,
                                  {
                                    backgroundColor: palette.surfaceSoft,
                                    opacity: selectedList.status === 'active' ? 1 : 0.45,
                                  },
                                ]}>
                                <IconSymbol name="minus" size={12} color={palette.textPrimary} />
                              </Pressable>
                              <Pressable
                                onPress={() => shiftItemQuantityInEdit(item, 1)}
                                disabled={selectedList.status !== 'active'}
                                style={[
                                  styles.itemActionButton,
                                  {
                                    backgroundColor: palette.surfaceSoft,
                                    opacity: selectedList.status === 'active' ? 1 : 0.45,
                                  },
                                ]}>
                                <IconSymbol name="plus" size={12} color={palette.textPrimary} />
                              </Pressable>
                              <Pressable onPress={() => removeItemInEdit(item)} style={[styles.itemActionButton, { backgroundColor: palette.surfaceSoft }]}>
                                <IconSymbol name="trash.fill" size={12} color={palette.danger} />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Maintenance</Text>
                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={onClearCheckedInEdit}
                        style={({ pressed }) => [
                          styles.secondaryAction,
                          {
                            backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                            borderColor: palette.border,
                          },
                        ]}>
                        <Text style={[Typography.labelSm, { color: palette.textPrimary }]}>Nettoyer cochés</Text>
                      </Pressable>

                      <Pressable
                        onPress={onDeleteSelectedList}
                        style={({ pressed }) => [
                          styles.secondaryAction,
                          {
                            backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                            borderColor: palette.border,
                          },
                        ]}>
                        <Text style={[Typography.labelSm, { color: palette.danger }]}>Supprimer liste</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                    Crée ou sélectionne une liste pour afficher les options d’édition.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  async function handleDeleteSelectedList() {
    if (!selectedList) {
      return;
    }

    await deleteList(selectedList.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleClearCheckedInEdit() {
    if (!selectedList) {
      return;
    }

    await clearCheckedItems(selectedList.id);
    await Haptics.selectionAsync();
  }
}

function ListsSection({
  title,
  lists,
  selectedListId,
  onSelectList,
  palette,
}: {
  title: string;
  lists: ShoppingList[];
  selectedListId: string | null;
  onSelectList: (listId: string) => void;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{title}</Text>
        <View style={[styles.sectionCountPill, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
          <Text style={[Typography.caption, { color: palette.textPrimary }]}>{lists.length}</Text>
        </View>
      </View>

      {lists.length === 0 ? (
        <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucune liste pour le moment.</Text>
      ) : (
        <View style={styles.sectionListsWrap}>
          {lists.map((list) => {
            const progress = buildProgressLabel(list);
            const isSelected = selectedListId === list.id;

            return (
              <Pressable
                key={list.id}
                onPress={() => onSelectList(list.id)}
                style={[
                  styles.listRow,
                  {
                    backgroundColor: isSelected ? palette.overlay : palette.surfaceSoft,
                    borderColor: palette.border,
                  },
                ]}>
                <View style={styles.listHeaderText}>
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]} numberOfLines={1}>
                    {list.name}
                  </Text>
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    {progress} • {formatShortDate(list.updatedAt)}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={14} color={palette.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function buildProgressLabel(list: ShoppingList) {
  const total = list.items.length;
  const checked = list.items.filter((item) => isItemCompleted(item)).length;
  if (total === 0) {
    return 'Vide';
  }

  return `${checked}/${total} complétés`;
}

function parseQuantityInput(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 1000) / 1000;
}

function shiftQuantityInput(value: string, step: number) {
  const current = parseQuantityInput(value) ?? 1;
  const next = Math.max(0.01, current + step);
  return String(Math.round(next * 1000) / 1000);
}

function formatQuantity(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toString().replace('.', ',');
}

function isItemCompleted(item: ShoppingListItem) {
  return item.isChecked || item.isUnavailable;
}

function itemStateRank(item: ShoppingListItem) {
  if (!item.isChecked && !item.isUnavailable) {
    return 0;
  }

  if (item.isChecked) {
    return 1;
  }

  return 2;
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  sectionListsWrap: {
    gap: 8,
  },
  sectionCountPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  listRow: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  listHeaderText: {
    flex: 1,
    gap: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusPill: {
    minWidth: 64,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    minWidth: 2,
  },
  remainingBadge: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  itemsWrap: {
    gap: 8,
  },
  itemRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 52,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemStateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemStateButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityPill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emptyCta: {
    marginTop: 4,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    minHeight: 58,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalContent: {
    padding: 16,
    gap: 12,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  primaryPill: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 72,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  unitInput: {
    width: 90,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  primaryAction: {
    minWidth: 74,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  inventoryList: {
    gap: 6,
  },
  inventoryRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inventoryText: {
    flex: 1,
    gap: 2,
  },
  editItemRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  itemActionButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
