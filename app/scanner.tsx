import * as Haptics from 'expo-haptics';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardEvent, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { NutritionFacts, StorageZone, zoneLabels } from '@/data/inventory';
import { useInventory } from '@/providers/inventory-provider';
import { useAppTheme } from '@/providers/theme-provider';
import {
  fetchProductByBarcode,
  OpenFoodFactsProduct,
  searchProductsByText,
  toOpenFoodFactsUserMessage,
} from '@/services/open-food-facts';
import { buildNutritionRows } from '@/utils/nutrition';

type ScanState = 'scanning' | 'fallback' | 'recognized';
type DraftSource = 'scan' | 'search' | 'manual';

const storageChoices: StorageZone[] = ['frigo', 'congelateur', 'sec', 'autre'];
const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { addProduct } = useInventory();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [source, setSource] = useState<DraftSource>('scan');
  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [barcode, setBarcode] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState('1');
  const [unit, setUnit] = useState('unité');
  const [storage, setStorage] = useState<StorageZone>('sec');
  const [expirationDate, setExpirationDate] = useState(defaultExpirationDate('sec'));
  const [formatValue, setFormatValue] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [nutrition, setNutrition] = useState<NutritionFacts | undefined>(undefined);
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) {
      return;
    }

    requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (scanState !== 'scanning') {
      return;
    }

    const timer = setTimeout(() => {
      setScanState('fallback');
    }, 5000);

    return () => clearTimeout(timer);
  }, [scanState]);

  useEffect(() => {
    const onKeyboardShow = (event: KeyboardEvent) => {
      const keyboardHeight = event.endCoordinates.height;
      setKeyboardInset(Math.max(0, keyboardHeight - insets.bottom));
    };

    const onKeyboardHide = () => {
      setKeyboardInset(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const nutritionRows = useMemo(() => {
    return buildNutritionRows(nutrition);
  }, [nutrition]);

  const expirationRequired = true;

  const closeScanner = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const updateQuantity = (nextValue: number) => {
    const bounded = Math.max(1, nextValue);
    setQuantity(bounded);
    setQuantityInput(String(bounded));
    Haptics.selectionAsync();
  };

  const onChangeQuantityInput = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setQuantityInput(cleaned);

    if (!cleaned) {
      return;
    }

    const numericValue = Number(cleaned);
    if (!Number.isNaN(numericValue)) {
      setQuantity(Math.max(1, numericValue));
    }
  };

  const onBarcodeScanned = async (event: BarcodeScanningResult) => {
    if (scanState !== 'scanning' || isFetchingBarcode) {
      return;
    }

    const scannedBarcode = event.data.trim();
    if (!scannedBarcode || scannedBarcode === lastScannedBarcode) {
      return;
    }

    setLastScannedBarcode(scannedBarcode);
    setIsFetchingBarcode(true);
    setSearchError(null);

    try {
      const product = await fetchProductByBarcode(scannedBarcode);
      if (!product) {
        setScanState('fallback');
        return;
      }

      applyRecognizedProduct(product, 'scan');
      setScanState('recognized');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setSearchError(toOpenFoodFactsUserMessage(error) ?? 'Impossible de récupérer le produit pour le moment.');
      setScanState('fallback');
    } finally {
      setIsFetchingBarcode(false);
    }
  };

  const onSearchFallback = async () => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchProductsByText(query);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('Aucun résultat trouvé.');
      }
    } catch (error) {
      setSearchError(toOpenFoodFactsUserMessage(error) ?? 'La recherche OpenFoodFacts est indisponible.');
    } finally {
      setIsSearching(false);
    }
  };

  const onPickSearchResult = async (product: OpenFoodFactsProduct) => {
    applyRecognizedProduct(product, 'search');
    setScanState('recognized');
    await Haptics.selectionAsync();
  };

  const onOpenManualAdd = () => {
    setSource('manual');
    setBarcode(undefined);
    setName('');
    setImageUrl(undefined);
    setIsImageModalOpen(false);
    setQuantity(1);
    setQuantityInput('1');
    setUnit('unité');
    setStorage('sec');
    setExpirationDate(defaultExpirationDate('sec'));
    setFormatValue('');
    setCategoryLabel('');
    setNutrition(undefined);
    setFormError(null);
    setScanState('recognized');
  };

  const onAddProduct = async () => {
    const trimmedName = name.trim();
    const normalizedExpiration = normalizeExpirationDate(expirationDate);

    if (!trimmedName) {
      setFormError('Le nom du produit est obligatoire.');
      return;
    }

    if (expirationRequired && !normalizedExpiration) {
      setFormError('La date d’expiration doit être valide (YYYY-MM-DD).');
      return;
    }

    if (!expirationRequired && expirationDate.trim() && !normalizedExpiration) {
      setFormError('La date d’expiration est invalide. Utilise le format YYYY-MM-DD.');
      return;
    }

    setFormError(null);

    await addProduct({
      name: trimmedName,
      barcode,
      imageUrl,
      zone: storage,
      expiresAt: normalizedExpiration,
      quantity,
      unit,
      category: categoryLabel || undefined,
      format: formatValue || undefined,
      nutrition,
      source,
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeScanner();
  };

  const resetScan = () => {
    setScanState('scanning');
    setLastScannedBarcode(null);
    setSearchError(null);
    setSearchResults([]);
    setIsImageModalOpen(false);
  };

  const toggleTorch = () => {
    setIsTorchEnabled((previous) => !previous);
    Haptics.selectionAsync();
  };

  const openImageModal = () => {
    if (!imageUrl) {
      return;
    }

    setIsImageModalOpen(true);
    Haptics.selectionAsync();
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderColor: palette.border }]}> 
        <Pressable onPress={closeScanner} style={[styles.backButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Scanner</Text>

        <Pressable onPress={resetScan} style={[styles.backButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="camera.viewfinder" size={18} color={palette.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.cameraFrame, { borderColor: palette.border }]}> 
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={isTorchEnabled}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
            onBarcodeScanned={scanState === 'scanning' ? onBarcodeScanned : undefined}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.cameraPermissionFallback, { backgroundColor: palette.surface }]}> 
            <IconSymbol name="camera.viewfinder" size={40} color={palette.textSecondary} />
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Autorise la caméra pour scanner.</Text>
            <Pressable onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: palette.accentPrimary }]}> 
              <Text style={[Typography.labelMd, { color: palette.textInverse }]}>Autoriser la caméra</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.cameraOverlay, { paddingBottom: 14 + keyboardInset }]}>
          {permission?.granted ? (
            <Pressable
              onPress={toggleTorch}
              style={[
                styles.flashToggleButton,
                {
                  backgroundColor: isTorchEnabled ? palette.accentPrimary : palette.overlay,
                  borderColor: palette.border,
                },
              ]}>
              <IconSymbol
                name={isTorchEnabled ? 'bolt.fill' : 'bolt.slash.fill'}
                size={16}
                color={isTorchEnabled ? palette.textInverse : palette.textPrimary}
              />
              <Text
                style={[
                  Typography.labelSm,
                  {
                    color: isTorchEnabled ? palette.textInverse : palette.textPrimary,
                  },
                ]}>
                Flash
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.cameraCornersWrap}>
            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: palette.accentPrimary }]} />
            <View style={[styles.corner, styles.cornerTopRight, { borderColor: palette.accentPrimary }]} />
            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: palette.accentPrimary }]} />
            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: palette.accentPrimary }]} />
          </View>

          <View style={[styles.scanStatusBadge, { backgroundColor: palette.overlay, borderColor: palette.border }]}> 
            <Text style={[Typography.labelMd, { color: palette.textPrimary }]}> 
              {isFetchingBarcode ? 'Produit détecté, récupération…' : scanState === 'scanning' ? 'Analyse en cours…' : 'Mode fallback'}
            </Text>
          </View>

          {scanState === 'fallback' ? (
            <View style={[styles.fallbackPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Produit non reconnu</Text>

              <View style={[styles.searchInputWrap, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Recherche OpenFoodFacts"
                  placeholderTextColor={palette.textTertiary}
                  style={[styles.searchInput, Typography.bodySm, { color: palette.textPrimary }]}
                  autoCapitalize="none"
                />
                <Pressable onPress={onSearchFallback}>
                  <IconSymbol name="magnifyingglass" size={18} color={palette.accentPrimary} />
                </Pressable>
              </View>

              {isSearching ? <Text style={[Typography.caption, { color: palette.textSecondary }]}>Recherche…</Text> : null}
              {searchError ? <Text style={[Typography.caption, { color: palette.warning }]}>{searchError}</Text> : null}

              {searchResults.length > 0 ? (
                <ScrollView
                  style={styles.searchResultsList}
                  contentContainerStyle={styles.searchResultsContent}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled">
                  {searchResults.map((result) => (
                    <Pressable
                      key={result.barcode}
                      onPress={() => onPickSearchResult(result)}
                      style={[styles.searchResultRow, { borderColor: palette.border }]}> 
                      <Text style={[Typography.bodySm, { color: palette.textPrimary }]} numberOfLines={1}>{result.name}</Text>
                      <Text style={[Typography.caption, { color: palette.textSecondary }]}>{result.barcode}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <Pressable onPress={onOpenManualAdd} style={[styles.secondaryAction, { borderColor: palette.border }]}> 
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Ajout manuel</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {scanState === 'recognized' ? (
        <View
          style={[
            styles.quickSheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingBottom: insets.bottom + 16,
              bottom: keyboardInset,
            },
          ]}>
          <View style={[styles.sheetHandle, { backgroundColor: palette.textTertiary }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.quickSheetContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled">
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Fiche rapide produit</Text>

            <View style={styles.fieldBlock}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Nom</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nom du produit"
                placeholderTextColor={palette.textTertiary}
                style={[
                  styles.textField,
                  Typography.bodyMd,
                  {
                    color: palette.textPrimary,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSoft,
                  },
                ]}
              />
            </View>

            {imageUrl ? (
              <Pressable onPress={openImageModal} style={styles.productImagePressable}>
                <Image source={{ uri: imageUrl }} style={[styles.productImage, { borderColor: palette.border }]} contentFit="cover" />
                <View style={[styles.imageHintPill, { backgroundColor: palette.overlay, borderColor: palette.border }]}>
                  <IconSymbol name="magnifyingglass" size={12} color={palette.textPrimary} />
                  <Text style={[Typography.caption, { color: palette.textPrimary }]}>Agrandir</Text>
                </View>
              </Pressable>
            ) : (
              <View style={[styles.imageMock, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                <IconSymbol name="photo" size={36} color={palette.textTertiary} />
              </View>
            )}

            <View style={styles.fieldBlock}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Quantité</Text>
              <View style={styles.quantityRow}>
                <Pressable onPress={() => updateQuantity(quantity - 1)} style={[styles.stepperButton, { backgroundColor: palette.surfaceSoft }]}> 
                  <IconSymbol name="minus" size={14} color={palette.textPrimary} />
                </Pressable>

                <TextInput
                  value={quantityInput}
                  onChangeText={onChangeQuantityInput}
                  keyboardType="number-pad"
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

                <Pressable onPress={() => updateQuantity(quantity + 1)} style={[styles.stepperButton, { backgroundColor: palette.surfaceSoft }]}> 
                  <IconSymbol name="plus" size={14} color={palette.textPrimary} />
                </Pressable>
              </View>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>Unité détectée: {unit}</Text>
              <Text style={[Typography.caption, { color: palette.textSecondary }]}>
                Le poids/volume (ex: 150 g) reste dans le champ Format / volume.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Lieu de stockage</Text>
              <View style={styles.storageWrap}>
                {storageChoices.map((choice) => (
                  <Pressable
                    key={choice}
                    onPress={() => {
                      setStorage(choice);
                      if (!normalizeExpirationDate(expirationDate)) {
                        setExpirationDate(defaultExpirationDate(choice));
                      }
                    }}
                    style={[
                      styles.storageChoice,
                      {
                        backgroundColor: storage === choice ? palette.accentPrimary : palette.surfaceSoft,
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        Typography.labelSm,
                        {
                          color: storage === choice ? palette.textInverse : palette.textPrimary,
                        },
                      ]}>
                      {zoneLabels[choice]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Date d’expiration {expirationRequired ? '(obligatoire)' : '(optionnelle)'}</Text>
              <TextInput
                value={expirationDate}
                onChangeText={setExpirationDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.textTertiary}
                style={[
                  styles.textField,
                  Typography.bodyMd,
                  {
                    color: palette.textPrimary,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSoft,
                  },
                ]}
              />
            </View>

            <View style={styles.infoRow}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Format / volume</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{formatValue || 'Non renseigné'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Catégorie</Text>
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{categoryLabel || 'Non renseignée'}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Pressable style={styles.nutritionToggle} onPress={() => setIsNutritionExpanded((prev) => !prev)}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Informations nutritionnelles</Text>
                <IconSymbol
                  name={isNutritionExpanded ? 'chevron.down' : 'chevron.right'}
                  size={14}
                  color={palette.textSecondary}
                />
              </Pressable>

              {isNutritionExpanded ? (
                <View style={[styles.nutritionPanel, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
                  {nutritionRows.length === 0 ? (
                    <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucune donnée nutritionnelle disponible.</Text>
                  ) : (
                    <>
                      <Text style={[Typography.caption, { color: palette.textSecondary }]}>Valeurs pour 100 g / 100 ml</Text>
                      {nutritionRows.map((item) => (
                        <View key={item.label} style={styles.nutritionRow}>
                          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{item.label}</Text>
                          <Text style={[Typography.bodySm, { color: palette.textPrimary }]}>{item.value}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              ) : null}
            </View>

            {formError ? <Text style={[Typography.caption, { color: palette.danger }]}>{formError}</Text> : null}

            <Pressable
              onPress={onAddProduct}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
                },
              ]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Ajouter à l’inventaire</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      <Modal visible={isImageModalOpen} transparent animationType="fade" onRequestClose={closeImageModal}>
        <View style={[styles.imageModalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeImageModal} />

          <View style={[styles.imageModalHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={closeImageModal}
              style={[styles.imageModalCloseButton, { backgroundColor: 'rgba(255, 255, 255, 0.22)' }]}>
              <IconSymbol name="xmark" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {imageUrl ? (
            <View style={styles.imageModalBody}>
              <Image source={{ uri: imageUrl }} style={styles.imageModalImage} contentFit="contain" />
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );

  function applyRecognizedProduct(product: OpenFoodFactsProduct, nextSource: DraftSource) {
    setSource(nextSource);
    setBarcode(product.barcode);
    setName(product.name);
    setImageUrl(product.imageUrl);

    const nextZone = product.suggestedZone;
    setStorage(nextZone);
    setExpirationDate(defaultExpirationDate(nextZone));

    const purchaseDetails = inferPurchaseDetails(product);
    setQuantity(purchaseDetails.quantity);
    setQuantityInput(String(purchaseDetails.quantity));
    setUnit(purchaseDetails.unit);

    setFormatValue(product.quantityLabel ?? '');
    setCategoryLabel(product.categoryLabel ?? '');
    setNutrition(product.nutrition);
    setFormError(null);
  }
}

function defaultExpirationDate(zone: StorageZone) {

  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toLocalDateKey(date);
}

function normalizeExpirationDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toLocalDateKey(parsed);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inferPurchaseDetails(product: Pick<OpenFoodFactsProduct, 'name' | 'quantityLabel' | 'categories' | 'categoryLabel'>) {
  const context = `${product.name} ${product.categoryLabel ?? ''} ${product.categories.join(' ')}`.toLowerCase();
  const packCount = extractPackCount(product.quantityLabel);

  if (isChocolateTablet(context)) {
    return {
      quantity: packCount ?? 1,
      unit: 'tablette',
    };
  }

  return {
    quantity: packCount ?? 1,
    unit: 'unité',
  };
}

function isChocolateTablet(context: string) {
  return matchesAny(context, ['chocolat', 'chocolate', 'tablette', 'tablettes']);
}

function extractPackCount(quantityLabel?: string) {
  if (!quantityLabel) {
    return null;
  }

  const normalized = quantityLabel.toLowerCase();
  const patterns = [
    /(\d{1,2})\s*[x×]\s*\d/,
    /\b(?:lot|pack|bo[iî]te|sachet)\s*(?:de)?\s*(\d{1,2})\b/,
    /(\d{1,2})\s*(?:pi[eè]ces?|pcs?|unit[eé]s?|tablettes?)\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const parsed = Number(match[1]);
    if (Number.isNaN(parsed) || parsed <= 0) {
      continue;
    }

    return Math.min(parsed, 99);
  }

  return null;
}

function matchesAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
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
  cameraFrame: {
    flex: 1,
    margin: 16,
    borderRadius: 30,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  cameraPermissionFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  permissionButton: {
    height: 44,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 14,
  },
  flashToggleButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    minHeight: 36,
    borderRadius: Radii.capsule,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cameraCornersWrap: {
    marginTop: 44,
    alignSelf: 'center',
    width: '86%',
    height: '55%',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
    borderRadius: 12,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanStatusBadge: {
    borderRadius: Radii.capsule,
    minHeight: 38,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  fallbackPanel: {
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
  },
  searchInputWrap: {
    borderRadius: Radii.capsule,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
  },
  searchResultsList: {
    maxHeight: 150,
  },
  searchResultsContent: {
    gap: 6,
  },
  searchResultRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  secondaryAction: {
    height: 42,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    top: '20%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: Radii.capsule,
    alignSelf: 'center',
    marginBottom: 12,
  },
  quickSheetContent: {
    gap: 12,
    paddingBottom: 8,
  },
  fieldBlock: {
    gap: 8,
  },
  textField: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  productImage: {
    width: '100%',
    height: 140,
    borderRadius: 20,
  },
  productImagePressable: {
    borderRadius: 20,
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
  imageMock: {
    height: 110,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: 'center',
  },
  storageWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storageChoice: {
    height: 36,
    borderRadius: Radii.capsule,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  infoRow: {
    minHeight: 36,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nutritionToggle: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionPanel: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    height: 52,
    borderRadius: Radii.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
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
});
