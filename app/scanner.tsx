import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { zoneLabels } from '@/data/mock-data';
import { useAppTheme } from '@/providers/theme-provider';

type ScanState = 'scanning' | 'fallback' | 'recognized';
type StorageKey = keyof typeof zoneLabels | 'autre';

const storageChoices: StorageKey[] = ['frigo', 'congelateur', 'sec', 'dph', 'autre'];

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();

  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState('1');
  const [storage, setStorage] = useState<StorageKey>('frigo');
  const [expirationDate, setExpirationDate] = useState('2026-04-09');
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);

  useEffect(() => {
    if (scanState !== 'scanning') {
      return;
    }

    const timer = setTimeout(() => {
      setScanState('fallback');
    }, 5000);

    return () => clearTimeout(timer);
  }, [scanState]);

  const nutritionFacts = useMemo(
    () => [
      { label: 'Énergie', value: '182 kcal' },
      { label: 'Protéines', value: '12 g' },
      { label: 'Glucides', value: '8 g' },
      { label: 'Lipides', value: '10 g' },
    ],
    []
  );

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

  const onRecognized = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScanState('recognized');
  };

  const onAddProduct = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderColor: palette.border }]}> 
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.surfaceSoft }]}> 
          <IconSymbol name="chevron.left" size={18} color={palette.textPrimary} />
        </Pressable>

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Scanner</Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.cameraFrame, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
        <View style={styles.cameraCornersWrap}>
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: palette.accentPrimary }]} />
          <View style={[styles.corner, styles.cornerTopRight, { borderColor: palette.accentPrimary }]} />
          <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: palette.accentPrimary }]} />
          <View style={[styles.corner, styles.cornerBottomRight, { borderColor: palette.accentPrimary }]} />
        </View>

        <IconSymbol name="camera.viewfinder" size={62} color={palette.textSecondary} />
        <Text style={[Typography.bodyMd, { color: palette.textSecondary }]}>Caméra active (prototype visuel)</Text>

        {scanState === 'scanning' ? (
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Analyse du produit en cours...</Text>
        ) : null}

        {scanState !== 'recognized' ? (
          <Pressable
            onPress={onRecognized}
            style={({ pressed }) => [
              styles.recognizeButton,
              {
                backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary,
              },
            ]}>
            <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Simuler produit reconnu</Text>
          </Pressable>
        ) : null}

        {scanState === 'fallback' ? (
          <View style={[styles.fallbackPanel, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
            <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Produit non reconnu</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Choisissez une option de fallback.</Text>

            <View style={styles.fallbackActions}>
              <Pressable style={[styles.secondaryAction, { borderColor: palette.border }]}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Recherche produit</Text>
              </Pressable>

              <Pressable style={[styles.secondaryAction, { borderColor: palette.border }]}>
                <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Ajout manuel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {scanState === 'recognized' ? (
        <View
          style={[
            styles.quickSheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingBottom: insets.bottom + 16,
            },
          ]}>
          <View style={[styles.sheetHandle, { backgroundColor: palette.textTertiary }]} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.quickSheetContent}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Yaourt grec nature</Text>
            <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Ajout rapide depuis scan</Text>

            <View style={[styles.imageMock, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}> 
              <IconSymbol name="photo" size={42} color={palette.textTertiary} />
            </View>

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
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Lieu de stockage</Text>
              <View style={styles.storageWrap}>
                {storageChoices.map((choice) => (
                  <Pressable
                    key={choice}
                    onPress={() => setStorage(choice)}
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
                      {choice === 'autre' ? 'Autre' : zoneLabels[choice]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>Date d’expiration</Text>
              <TextInput
                value={expirationDate}
                onChangeText={setExpirationDate}
                style={[
                  styles.expirationInput,
                  Typography.bodyMd,
                  {
                    color: palette.textPrimary,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSoft,
                  },
                ]}
              />
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
                  {nutritionFacts.map((item) => (
                    <View key={item.label} style={styles.nutritionRow}>
                      <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{item.label}</Text>
                      <Text style={[Typography.bodySm, { color: palette.textPrimary }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 34,
  },
  cameraFrame: {
    flex: 1,
    margin: 16,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  cameraCornersWrap: {
    position: 'absolute',
    width: '84%',
    height: '62%',
  },
  corner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderWidth: 4,
    borderRadius: 10,
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
  recognizeButton: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackPanel: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  fallbackActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    top: '33%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: Radii.capsule,
    alignSelf: 'center',
    marginBottom: 10,
  },
  quickSheetContent: {
    gap: 12,
    paddingBottom: 8,
  },
  imageMock: {
    height: 110,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBlock: {
    gap: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
  },
  storageWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storageChoice: {
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  expirationInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  nutritionToggle: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
