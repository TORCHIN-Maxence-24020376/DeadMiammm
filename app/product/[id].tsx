import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { sourceLabels, StorageZone, zoneIconMap, zoneLabels } from '@/data/inventory';
import { useInventory } from '@/providers/inventory-provider';
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

const EDITABLE_ZONES: StorageZone[] = ['frigo', 'congelateur', 'sec', 'animalerie', 'dph', 'autre'];

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { palette } = useAppTheme();
  const { products, removeProduct, updateProduct, updateProductConsumption, consumeProductUnit } = useInventory();
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

  useEffect(() => {
    setSliderPercent(product?.consumptionPercent ?? 0);
  }, [product?.id, product?.consumptionPercent]);

  useEffect(() => {
    sliderPercentRef.current = sliderPercent;
  }, [sliderPercent]);

  const onDeleteProduct = () => {
    if (!product) {
      return;
    }

    Alert.alert('Supprimer le produit ?', `Le produit "${product.name}" sera retiré de l’inventaire local.`, [
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
    setEditError(null);
    setIsEditModalOpen(true);
    Haptics.selectionAsync();
  };

  const onCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditError(null);
  };

  const onConsumptionTrackLayout = (event: LayoutChangeEvent) => {
    setSliderWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const onSlideToLocation = useCallback(
    (locationX: number) => {
      const ratio = locationX / sliderWidth;
      setSliderPercent(toBoundedPercent(ratio * 100));
    },
    [sliderWidth]
  );

  const commitSliderPercent = useCallback(async () => {
    if (!product) {
      return;
    }

    const nextValue = toBoundedPercent(sliderPercentRef.current);
    if (nextValue === product.consumptionPercent) {
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

    setSliderPercent(0);
  };

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
      setEditError('La quantite doit etre un entier positif.');
      return;
    }

    const trimmedUnit = editUnit.trim();
    if (!trimmedUnit) {
      setEditError('L unite est obligatoire.');
      return;
    }

    const normalizedExpiresAt = normalizeEditableDate(editExpiresAt);
    if (normalizedExpiresAt === 'invalid') {
      setEditError('La date doit etre au format YYYY-MM-DD.');
      return;
    }

    const updated = await updateProduct(product.id, {
      name: trimmedName,
      quantity: parsedQuantity,
      unit: trimmedUnit,
      zone: editZone,
      expiresAt: normalizedExpiresAt,
      category: editCategory,
      format: editFormat,
    });

    if (!updated) {
      setEditError('Impossible de modifier cette entree.');
      return;
    }

    setEditError(null);
    setIsEditModalOpen(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={onBack} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Fiche produit</Text>

        <View style={styles.iconButton} />
      </View>

      {!product ? (
        <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Produit introuvable</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>
              Il a peut-être déjà été supprimé ou déplacé.
            </Text>
            <Pressable onPress={() => router.replace('/')} style={[styles.primaryButton, { backgroundColor: palette.accentPrimary }]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Retour à l’accueil</Text>
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
            gap: 12,
          }}>
          <View style={[styles.productCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.productTopRow}>
              <View style={[styles.zoneIconWrap, { backgroundColor: palette.overlay }]}>
                <IconSymbol name={zoneIconMap[product.zone]} size={18} color={palette.accentPrimary} />
              </View>

              <View style={styles.productTitleWrap}>
                <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>{product.name}</Text>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{zoneLabel(product.zone)}</Text>
              </View>
            </View>

            {product.imageUrl ? (
              <Pressable onPress={onOpenImageModal} style={styles.productImagePressable}>
                <Image source={{ uri: product.imageUrl }} style={[styles.productImage, { borderColor: palette.border }]} contentFit="cover" />
                <View style={[styles.imageHintPill, { backgroundColor: palette.overlay, borderColor: palette.border }]}>
                  <IconSymbol name="magnifyingglass" size={12} color={palette.textPrimary} />
                  <Text style={[Typography.caption, { color: palette.textPrimary }]}>Agrandir</Text>
                </View>
              </Pressable>
            ) : null}

            <View style={styles.metaList}>
              <InfoRow label="Quantité" value={`${product.quantity} ${product.unit}`} palette={palette} />
              <InfoRow label="Expiration" value={product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'} palette={palette} />
              <InfoRow label="Format / volume" value={product.format ?? 'Non renseigné'} palette={palette} />
              <InfoRow label="Catégorie" value={product.category ?? 'Non renseignée'} palette={palette} />
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Consommation en cours</Text>
                  <Text style={[Typography.bodySm, { color: palette.textPrimary }]}>{sliderPercent}%</Text>
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
                        left: `${sliderPercent}%`,
                        backgroundColor: palette.accentPrimary,
                        borderColor: palette.surface,
                      },
                    ]}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    void onConsumeOneUnit();
                  }}
                  style={[styles.consumeButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                  <Text style={[Typography.labelSm, { color: palette.textPrimary }]}>Consommer</Text>
                </Pressable>
              </View>
              <InfoRow label="Origine" value={sourceLabels[product.source]} palette={palette} />
              <InfoRow label="Code-barres" value={product.barcode ?? 'Non disponible'} palette={palette} />
              <InfoRow label="Ajouté le" value={formatDateTime(product.addedAt)} palette={palette} />
            </View>
          </View>

          <View style={[styles.productCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Informations nutritionnelles</Text>
            {nutritionRows.length === 0 ? (
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucune donnée nutritionnelle disponible.</Text>
            ) : (
              <View style={styles.metaList}>
                <Text style={[Typography.caption, { color: palette.textSecondary }]}>Valeurs pour 100 g / 100 ml</Text>
                {nutritionRows.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} palette={palette} />
                ))}
              </View>
            )}
          </View>

          <Pressable onPress={onOpenEditModal} style={[styles.editButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
            <IconSymbol name="pencil" size={15} color={palette.textPrimary} />
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Modifier entree</Text>
          </Pressable>

          <Pressable onPress={onDeleteProduct} style={[styles.deleteButton, { backgroundColor: palette.danger }]}>
            <IconSymbol name="trash.fill" size={15} color={palette.textInverse} />
            <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Supprimer ce produit</Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={isImageModalOpen} transparent animationType="fade" onRequestClose={onCloseImageModal}>
        <View style={[styles.imageModalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseImageModal} />

          <View style={[styles.imageModalHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onCloseImageModal} style={[styles.imageModalCloseButton, { backgroundColor: 'rgba(255, 255, 255, 0.22)' }]}>
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
              <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Modifier entree</Text>
              <Pressable onPress={onCloseEditModal} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
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
                  style={[styles.fieldInput, Typography.bodyMd, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldCol}>
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Quantite</Text>
                  <TextInput
                    value={editQuantityInput}
                    onChangeText={setEditQuantityInput}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={palette.textTertiary}
                    style={[styles.fieldInput, Typography.bodyMd, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}
                  />
                </View>

                <View style={styles.fieldCol}>
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Unite</Text>
                  <TextInput
                    value={editUnit}
                    onChangeText={setEditUnit}
                    placeholder="unite"
                    placeholderTextColor={palette.textTertiary}
                    style={[styles.fieldInput, Typography.bodyMd, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Date expiration (YYYY-MM-DD)</Text>
                <TextInput
                  value={editExpiresAt}
                  onChangeText={setEditExpiresAt}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.textTertiary}
                  style={[styles.fieldInput, Typography.bodyMd, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Zone</Text>
                <View style={styles.zoneChoices}>
                  {EDITABLE_ZONES.map((zone) => (
                    <Pressable
                      key={zone}
                      onPress={() => setEditZone(zone)}
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
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Categorie</Text>
                <TextInput
                  value={editCategory}
                  onChangeText={setEditCategory}
                  placeholder="Categorie"
                  placeholderTextColor={palette.textTertiary}
                  style={[styles.fieldInput, Typography.bodyMd, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Format / volume</Text>
                <TextInput
                  value={editFormat}
                  onChangeText={setEditFormat}
                  placeholder="Format"
                  placeholderTextColor={palette.textTertiary}
                  style={[styles.fieldInput, Typography.bodyMd, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}
                />
              </View>

              {editError ? <Text style={[Typography.caption, { color: palette.danger }]}>{editError}</Text> : null}

              <Pressable
                onPress={() => {
                  void onSaveEdit();
                }}
                style={({ pressed }) => [
                  styles.saveEditButton,
                  {
                    backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
                  },
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
    height: 60,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoneIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitleWrap: {
    flex: 1,
    gap: 2,
  },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
  },
  productImagePressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageHintPill: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaList: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  progressTouchArea: {
    height: 28,
    justifyContent: 'center',
  },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    transform: [{ translateX: -9 }, { translateY: -9 }],
  },
  consumeButton: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteButton: {
    height: 48,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  primaryButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalBackdrop: {
    flex: 1,
  },
  imageModalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  imageModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
