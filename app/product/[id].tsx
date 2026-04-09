import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import {
  FrozenHomemadeType,
  frozenHomemadeDurationLabels,
  frozenHomemadeLabels,
  inferConsumptionPercent,
  inferHomemadeFrozenExpiration,
  isHomemadeFrozenProduct,
  resolveInitialQuantity,
  sourceLabels,
  StorageZone,
  zoneIconMap,
  zoneLabels,
} from '@/data/inventory';
import { useInventory } from '@/providers/inventory-provider';
import { useShoppingLists } from '@/providers/shopping-lists-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { formatFullDate, zoneLabel } from '@/utils/format';
import { buildNutritionRows } from '@/utils/nutrition';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const EDITABLE_ZONES: StorageZone[] = ['frigo', 'congelateur', 'sec', 'autre'];
const FROZEN_HOMEMADE_TYPES: FrozenHomemadeType[] = ['viande', 'poisson', 'plat_cuisine', 'soupe', 'legumes', 'pain'];

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { palette } = useAppTheme();
  const { products, consumeProductUnit, removeProduct, updateProduct, updateProductConsumption } = useInventory();
  const { lists, createList, addItem } = useShoppingLists();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [sliderPercent, setSliderPercent] = useState(0);
  const sliderPercentRef = useRef(0);
  const [editName, setEditName] = useState('');
  const [editQuantityInput, setEditQuantityInput] = useState('1');
  const [editUnit, setEditUnit] = useState('');
  const [editZone, setEditZone] = useState<StorageZone>('sec');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editHomemadeFrozenType, setEditHomemadeFrozenType] = useState<FrozenHomemadeType | null>(null);
  const [editFrozenReferenceAt, setEditFrozenReferenceAt] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  const product = useMemo(() => {
    if (!productId) {
      return undefined;
    }

    return products.find((candidate) => candidate.id === productId);
  }, [productId, products]);

  const nutritionRows = useMemo(() => {
    return buildNutritionRows(product?.nutrition);
  }, [product]);

  const activeShoppingList = useMemo(() => {
    return [...lists]
      .filter((candidate) => candidate.status === 'active')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }, [lists]);

  useEffect(() => {
    setSliderPercent(product?.consumptionPercent ?? 0);
  }, [product?.id, product?.consumptionPercent]);

  useEffect(() => {
    sliderPercentRef.current = sliderPercent;
  }, [sliderPercent]);

  const initialQuantity = product ? resolveInitialQuantity(product) : 1;
  const consumptionPercent = product ? inferConsumptionPercent(product) : 0;
  const shoppingSuggestionQuantity = product ? Math.max(1, resolveInitialQuantity(product) - product.quantity) : 1;

  const onDeleteProduct = () => {
    if (!product) {
      return;
    }

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const confirmed = globalThis.confirm(`Supprimer "${product.name}" de l'inventaire ?`);
      if (confirmed) {
        void handleDelete(product.id);
      }
      return;
    }

    Alert.alert('Supprimer le produit ?', `Le produit "${product.name}" sera retire de l'inventaire local.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void handleDelete(product.id);
        },
      },
    ]);
  };

  const onConsumeOneUnit = async () => {
    if (!product) {
      return;
    }

    const result = await consumeProductUnit(product.id);
    if (result === 'not-found') {
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (result === 'removed') {
      onBack();
      return;
    }

    sliderPercentRef.current = 0;
    setSliderPercent(0);
  };

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const onOpenImageModal = () => {
    setIsImageModalOpen(true);
    Haptics.selectionAsync();
  };

  const onCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  const onOpenEditModal = () => {
    if (!product) {
      return;
    }

    setEditName(product.name);
    setEditQuantityInput(String(product.quantity));
    setEditUnit(product.unit);
    setEditZone(product.zone);
    setEditExpiresAt(product.expiresAt ?? '');
    setEditCategory(product.category ?? '');
    setEditFormat(product.format ?? '');
    setEditHomemadeFrozenType(product.homemadeFrozenType ?? null);
    setEditFrozenReferenceAt(product.frozenAt ?? null);
    setEditError(null);
    setIsEditModalOpen(true);
    Haptics.selectionAsync();
  };

  const onCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditError(null);
  };

  const toggleEditHomemadeFrozen = () => {
    if (editHomemadeFrozenType) {
      setEditHomemadeFrozenType(null);
      Haptics.selectionAsync();
      return;
    }

    const referenceDate = editFrozenReferenceAt ?? new Date().toISOString();
    const nextType: FrozenHomemadeType = 'plat_cuisine';
    setEditFrozenReferenceAt(referenceDate);
    setEditHomemadeFrozenType(nextType);
    setEditZone('congelateur');
    setEditExpiresAt(inferHomemadeFrozenExpiration(nextType, referenceDate));
    Haptics.selectionAsync();
  };

  const selectEditHomemadeFrozenType = (type: FrozenHomemadeType) => {
    const referenceDate = editFrozenReferenceAt ?? new Date().toISOString();
    setEditFrozenReferenceAt(referenceDate);
    setEditHomemadeFrozenType(type);
    setEditZone('congelateur');
    setEditExpiresAt(inferHomemadeFrozenExpiration(type, referenceDate));
    Haptics.selectionAsync();
  };

  const onAddToShoppingList = async () => {
    if (!product) {
      return;
    }

    const targetList = activeShoppingList ?? (await createList());
    await addItem({
      listId: targetList.id,
      name: product.name,
      quantity: shoppingSuggestionQuantity,
      unit: product.unit,
      linkedProductId: product.id,
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Ajoute a la liste',
      `"${product.name}" a ete ajoute a "${targetList.name}" (${shoppingSuggestionQuantity} ${product.unit}).`
    );
  };

  const onConsumptionTrackLayout = (event: LayoutChangeEvent) => {
    setSliderWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const onSlideToLocation = useCallback(
    (locationX: number) => {
      const ratio = locationX / sliderWidth;
      const nextPercent = toBoundedPercent(ratio * 100);
      sliderPercentRef.current = nextPercent;
      setSliderPercent(nextPercent);
    },
    [sliderWidth]
  );

  const commitSliderPercent = useCallback(async () => {
    if (!product) {
      return;
    }

    const nextValue = toBoundedPercent(sliderPercentRef.current);
    if (nextValue === (product.consumptionPercent ?? 0)) {
      return;
    }

    await updateProductConsumption(product.id, nextValue);
  }, [product, updateProductConsumption]);

  const sliderResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          onSlideToLocation(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          onSlideToLocation(event.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          void commitSliderPercent();
        },
        onPanResponderTerminate: () => {
          void commitSliderPercent();
        },
      }),
    [commitSliderPercent, onSlideToLocation]
  );

  const onSaveEdit = async () => {
    if (!product) {
      return;
    }

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Le nom est obligatoire.');
      return;
    }

    const parsedQuantity = parsePositiveInteger(editQuantityInput);
    if (!parsedQuantity) {
      setEditError('La quantité doit être un entier positif.');
      return;
    }

    const trimmedUnit = editUnit.trim();
    if (!trimmedUnit) {
      setEditError('L’unité est obligatoire.');
      return;
    }

    const normalizedExpiresAt = normalizeEditableDate(editExpiresAt);
    if (!editHomemadeFrozenType && normalizedExpiresAt === 'invalid') {
      setEditError('La date doit être au format YYYY-MM-DD.');
      return;
    }

    const frozenReferenceAt = editHomemadeFrozenType
      ? editFrozenReferenceAt ?? product.frozenAt ?? new Date().toISOString()
      : undefined;

    const updated = await updateProduct(product.id, {
      name: trimmedName,
      quantity: parsedQuantity,
      unit: trimmedUnit,
      zone: editZone,
      expiresAt: normalizedExpiresAt,
      category: editCategory,
      format: editFormat,
      homemadeFrozenType: editHomemadeFrozenType ?? undefined,
      frozenAt: frozenReferenceAt,
    });

    if (!updated) {
      setEditError('Impossible de modifier cette entrée.');
      return;
    }

    setEditError(null);
    setIsEditModalOpen(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
          ]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Fiche produit</Text>

        <View style={styles.iconButton} />
      </View>

      {!product ? (
        <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <IconSymbol name="tray" size={28} color={palette.textTertiary} />
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Produit introuvable</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Il a peut-etre deja ete supprime ou deplace.
            </Text>
            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
              ]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Retour a l&apos;accueil</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: insets.bottom + 20,
            gap: 14,
          }}>
          <View style={[styles.heroCard, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={[styles.heroAccent, { backgroundColor: palette.accentPrimary }]} />
            <View style={styles.heroContent}>
              <View style={styles.productTopRow}>
                <View style={[styles.zoneIconWrap, { backgroundColor: palette.glowSecondary }]}>
                  <IconSymbol name={zoneIconMap[product.zone]} size={22} color={palette.accentPrimary} />
                </View>

                <View style={styles.productTitleWrap}>
                  <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{product.name}</Text>
                  <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
                </View>
              </View>

              {product.imageUrl ? (
                <Pressable onPress={onOpenImageModal} style={styles.productImagePressable}>
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={[styles.productImage, { borderColor: palette.border }]}
                    contentFit="cover"
                  />
                  <View style={[styles.imageHintPill, { backgroundColor: palette.overlay }]}>
                    <IconSymbol name="magnifyingglass" size={12} color={palette.textPrimary} />
                    <Text style={[Typography.caption, { color: palette.textPrimary }]}>Agrandir</Text>
                  </View>
                </Pressable>
              ) : null}

              <View style={styles.metaGrid}>
                <MetaChip label="Quantite" value={`${product.quantity} ${product.unit}`} palette={palette} />
                <MetaChip
                  label="Expiration"
                  value={product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}
                  palette={palette}
                  highlight={!!product.expiresAt}
                />
                <MetaChip label="Format" value={product.format ?? '-'} palette={palette} />
                <MetaChip label="Categorie" value={product.category ?? '-'} palette={palette} />
              </View>

              {isHomemadeFrozenProduct(product) ? (
                <View style={[styles.frozenBadgeCard, { backgroundColor: palette.info + '12', borderColor: palette.info + '22' }]}>
                  <View style={[styles.frozenBadgeIcon, { backgroundColor: palette.info + '22' }]}>
                    <IconSymbol name="snowflake" size={18} color={palette.info} />
                  </View>
                  <View style={styles.frozenBadgeText}>
                    <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Produit maison congele</Text>
                    <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                      {frozenHomemadeLabels[product.homemadeFrozenType!]} · {frozenHomemadeDurationLabels[product.homemadeFrozenType!]}
                    </Text>
                    <Text style={[Typography.caption, { color: palette.textTertiary }]}>
                      Congele le {formatDateTime(product.frozenAt ?? product.addedAt)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={[styles.progressCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                <View style={styles.progressHeader}>
                  <View style={styles.progressText}>
                    <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Avancement global</Text>
                    <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                      {product.quantity} restant{product.quantity > 1 ? 's' : ''} sur {initialQuantity}
                    </Text>
                  </View>
                  <View style={[styles.progressBadge, { backgroundColor: palette.glowSecondary }]}>
                    <Text style={[Typography.labelSm, { color: palette.accentPrimary }]}>{consumptionPercent}% utilise</Text>
                  </View>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${consumptionPercent}%`,
                        backgroundColor: palette.accentPrimary,
                      },
                    ]}
                  />
                </View>

                <View style={[styles.liveProgressCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={styles.liveProgressHeader}>
                    <View style={styles.progressText}>
                      <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Consommation en cours</Text>
                      <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
                        Glisse pour suivre le produit entame en temps reel.
                      </Text>
                    </View>
                    <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>{sliderPercent}%</Text>
                  </View>

                  <View style={styles.sliderScale}>
                    <Text style={[Typography.caption, { color: palette.textTertiary }]}>0%</Text>
                    <Text style={[Typography.caption, { color: palette.textTertiary }]}>100%</Text>
                  </View>

                  <View style={styles.progressTouchArea} onLayout={onConsumptionTrackLayout} {...sliderResponder.panHandlers}>
                    <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${sliderPercent}%`,
                            backgroundColor: palette.accentPrimary,
                          },
                        ]}
                      />
                    </View>
                    <View
                      style={[
                        styles.progressThumb,
                        {
                          left: ((sliderWidth - 18) * sliderPercent) / 100,
                          backgroundColor: palette.accentPrimary,
                          borderColor: palette.surface,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    void onConsumeOneUnit();
                  }}
                  style={({ pressed }) => [
                    styles.consumeButton,
                    { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
                  ]}>
                  <IconSymbol name="minus" size={14} color={palette.textPrimary} />
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>
                    {product.quantity > 1 ? 'Retirer 1 unite du paquet' : 'Consommer le dernier produit'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.metaList}>
                <InfoRow label="Origine" value={sourceLabels[product.source]} palette={palette} />
                <InfoRow label="Code-barres" value={product.barcode ?? 'Non disponible'} palette={palette} />
                <InfoRow label="Ajoute le" value={formatDateTime(product.addedAt)} palette={palette} />
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={styles.sectionTitle}>
              <View style={[styles.sectionDot, { backgroundColor: palette.info }]} />
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Informations nutritionnelles</Text>
            </View>
            {nutritionRows.length === 0 ? (
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucune donnee nutritionnelle disponible.</Text>
            ) : (
              <View style={styles.metaList}>
                <Text style={[Typography.caption, { color: palette.textTertiary }]}>Valeurs pour 100 g / 100 ml</Text>
                {nutritionRows.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} palette={palette} />
                ))}
              </View>
            )}
          </View>

          <Pressable
            onPress={() => {
              void onAddToShoppingList();
            }}
            style={({ pressed }) => [
              styles.shoppingButton,
              { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
            ]}>
            <IconSymbol name="cart.badge.plus" size={18} color={palette.textInverse} />
            <Text style={[Typography.labelLg, { color: palette.textInverse }]}>
              Ajouter aux courses ({shoppingSuggestionQuantity} {product.unit})
            </Text>
          </Pressable>

          <Pressable
            onPress={onOpenEditModal}
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: pressed ? palette.surfacePressed : palette.surface },
            ]}>
            <IconSymbol name="pencil" size={16} color={palette.textPrimary} />
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Modifier l’entrée</Text>
          </Pressable>

          <Pressable
            onPress={onDeleteProduct}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: pressed ? '#B91C1C' : palette.danger },
            ]}>
            <IconSymbol name="trash.fill" size={16} color={palette.textInverse} />
            <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Supprimer ce produit</Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={isImageModalOpen} transparent animationType="fade" onRequestClose={onCloseImageModal}>
        <View style={[styles.imageModalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.92)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseImageModal} />

          <View style={[styles.imageModalHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={onCloseImageModal}
              style={[styles.imageModalCloseButton, { backgroundColor: 'rgba(255, 255, 255, 0.20)' }]}>
              <IconSymbol name="xmark" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {product?.imageUrl ? (
            <View style={styles.imageModalBody}>
              <Image source={{ uri: product.imageUrl }} style={styles.imageModalImage} contentFit="contain" />
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={onCloseEditModal}>
        <View style={[styles.editModalBackdrop, { backgroundColor: 'rgba(2, 6, 23, 0.55)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseEditModal} />
          <View style={[styles.editModalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.editHeader}>
              <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Modifier l’entrée</Text>
              <Pressable
                onPress={onCloseEditModal}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft },
                ]}>
                <IconSymbol name="xmark" size={16} color={palette.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.editForm}>
              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Nom</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nom du produit"
                  placeholderTextColor={palette.textTertiary}
                  style={[
                    styles.fieldInput,
                    Typography.bodyMd,
                    { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft },
                  ]}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldCol}>
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Quantité</Text>
                  <TextInput
                    value={editQuantityInput}
                    onChangeText={setEditQuantityInput}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={palette.textTertiary}
                    style={[
                      styles.fieldInput,
                      Typography.bodyMd,
                      { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft },
                    ]}
                  />
                </View>

                <View style={styles.fieldCol}>
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Unité</Text>
                  <TextInput
                    value={editUnit}
                    onChangeText={setEditUnit}
                    placeholder="unité"
                    placeholderTextColor={palette.textTertiary}
                    style={[
                      styles.fieldInput,
                      Typography.bodyMd,
                      { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.fieldBlock, styles.homemadeEditCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                <View style={styles.homemadeEditHeader}>
                  <View style={styles.progressText}>
                    <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Produit maison congele</Text>
                    <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                      Type et duree auto pour les preparations maison.
                    </Text>
                  </View>
                  <Pressable
                    onPress={toggleEditHomemadeFrozen}
                    style={[
                      styles.homemadeToggle,
                      {
                        backgroundColor: editHomemadeFrozenType ? palette.accentPrimary : palette.surface,
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        Typography.labelSm,
                        { color: editHomemadeFrozenType ? palette.textInverse : palette.textPrimary },
                      ]}>
                      {editHomemadeFrozenType ? 'Actif' : 'Inactif'}
                    </Text>
                  </Pressable>
                </View>

                {editHomemadeFrozenType ? (
                  <>
                    <View style={styles.zoneChoices}>
                      {FROZEN_HOMEMADE_TYPES.map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => selectEditHomemadeFrozenType(type)}
                          style={[
                            styles.zoneChoice,
                            {
                              backgroundColor:
                                editHomemadeFrozenType === type ? palette.accentPrimary : palette.surface,
                              borderColor: palette.border,
                            },
                          ]}>
                          <Text
                            style={[
                              Typography.labelSm,
                              {
                                color:
                                  editHomemadeFrozenType === type ? palette.textInverse : palette.textPrimary,
                              },
                            ]}>
                            {frozenHomemadeLabels[type]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                      Duree conseillee : {frozenHomemadeDurationLabels[editHomemadeFrozenType]}.
                    </Text>
                  </>
                ) : null}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>
                  Date d&apos;expiration {editHomemadeFrozenType ? '(auto)' : ''}
                </Text>
                <TextInput
                  value={editExpiresAt}
                  onChangeText={setEditExpiresAt}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.textTertiary}
                  editable={!editHomemadeFrozenType}
                  style={[
                    styles.fieldInput,
                    Typography.bodyMd,
                    {
                      color: palette.textPrimary,
                      borderColor: palette.border,
                      backgroundColor: editHomemadeFrozenType ? palette.surface : palette.surfaceSoft,
                      opacity: editHomemadeFrozenType ? 0.8 : 1,
                    },
                  ]}
                />
                {editHomemadeFrozenType ? (
                  <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                    Calcul automatique depuis le jour de congelation.
                  </Text>
                ) : null}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Zone</Text>
                <View style={styles.zoneChoices}>
                  {EDITABLE_ZONES.map((zone) => (
                    <Pressable
                      key={zone}
                      onPress={() => {
                        setEditZone(zone);
                        if (zone !== 'congelateur' && editHomemadeFrozenType) {
                          setEditHomemadeFrozenType(null);
                        }
                      }}
                      style={[
                        styles.zoneChoice,
                        {
                          backgroundColor: editZone === zone ? palette.accentPrimary : palette.surfaceSoft,
                          borderColor: palette.border,
                        },
                      ]}>
                      <Text style={[Typography.labelSm, { color: editZone === zone ? palette.textInverse : palette.textPrimary }]}>
                        {zoneLabels[zone]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Catégorie</Text>
                <TextInput
                  value={editCategory}
                  onChangeText={setEditCategory}
                  placeholder="Catégorie"
                  placeholderTextColor={palette.textTertiary}
                  style={[
                    styles.fieldInput,
                    Typography.bodyMd,
                    { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft },
                  ]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Format / volume</Text>
                <TextInput
                  value={editFormat}
                  onChangeText={setEditFormat}
                  placeholder="Format"
                  placeholderTextColor={palette.textTertiary}
                  style={[
                    styles.fieldInput,
                    Typography.bodyMd,
                    { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft },
                  ]}
                />
              </View>

              {editError ? <Text style={[Typography.caption, { color: palette.danger }]}>{editError}</Text> : null}

              <Pressable
                onPress={() => {
                  void onSaveEdit();
                }}
                style={({ pressed }) => [
                  styles.saveEditButton,
                  { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
                ]}>
                <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Enregistrer</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  async function handleDelete(id: string) {
    await removeProduct(id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onBack();
  }
}

function MetaChip({
  label,
  value,
  palette,
  highlight,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useAppTheme>['palette'];
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        metaStyles.chip,
        { backgroundColor: highlight ? palette.glowSecondary : palette.surfaceSoft },
      ]}>
      <Text style={[Typography.caption, { color: palette.textTertiary }]}>{label}</Text>
      <Text style={[Typography.labelMd, { color: highlight ? palette.accentPrimary : palette.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    padding: 10,
    gap: 2,
  },
});

function InfoRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useAppTheme>['palette'];
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[Typography.bodySm, { color: palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date invalide';
  }

  return DATE_TIME_FORMATTER.format(date);
}

function toBoundedPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function parsePositiveInteger(value: string) {
  const cleaned = value.replace(/[^0-9]/g, '');
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function normalizeEditableDate(value: string): string | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'invalid';
  }

  return toLocalDateKey(parsed);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: Radii.card,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  heroAccent: {
    width: 5,
  },
  heroContent: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: Radii.card,
    padding: 18,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitleWrap: {
    flex: 1,
    gap: 3,
  },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    borderWidth: 1,
  },
  productImagePressable: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  imageHintPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frozenBadgeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  frozenBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frozenBadgeText: {
    flex: 1,
    gap: 2,
  },
  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressText: {
    flex: 1,
    gap: 2,
  },
  progressBadge: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
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
  liveProgressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  liveProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressTouchArea: {
    height: 34,
    justifyContent: 'center',
  },
  progressThumb: {
    position: 'absolute',
    top: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  consumeButton: {
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  metaList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteButton: {
    height: 52,
    borderRadius: Radii.capsule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  editButton: {
    height: 52,
    borderRadius: Radii.capsule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  shoppingButton: {
    height: 52,
    borderRadius: Radii.capsule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: Radii.card,
    padding: 20,
    gap: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  primaryButton: {
    height: 48,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageModalBackdrop: {
    flex: 1,
  },
  imageModalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  imageModalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  imageModalImage: {
    width: '100%',
    height: '86%',
  },
  editModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  editModalSheet: {
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editForm: {
    gap: 10,
    paddingBottom: 6,
  },
  fieldBlock: {
    gap: 6,
  },
  homemadeEditCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  homemadeEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  homemadeToggle: {
    minHeight: 34,
    minWidth: 74,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldCol: {
    flex: 1,
    gap: 6,
  },
  fieldInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  zoneChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneChoice: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  saveEditButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
