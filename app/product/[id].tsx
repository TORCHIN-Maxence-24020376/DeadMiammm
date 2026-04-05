import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Typography } from '@/constants/theme';
import { sourceLabels, zoneIconMap } from '@/data/inventory';
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

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { palette } = useAppTheme();
  const { products, removeProduct } = useInventory();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

  const onDeleteProduct = () => {
    if (!product) {
      return;
    }

    Alert.alert('Supprimer le produit ?', `Le produit "${product.name}" sera retiré de l'inventaire local.`, [
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
              Il a peut-être déjà été supprimé ou déplacé.
            </Text>
            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? palette.accentPrimaryStrong : palette.accentPrimary },
              ]}>
              <Text style={[Typography.labelLg, { color: palette.textInverse }]}>Retour à l'accueil</Text>
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

          {/* Hero product card */}
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
                <MetaChip
                  label="Quantité"
                  value={`${product.quantity} ${product.unit}`}
                  palette={palette}
                />
                <MetaChip
                  label="Expiration"
                  value={product.expiresAt ? formatFullDate(product.expiresAt) : 'Sans date'}
                  palette={palette}
                  highlight={!!product.expiresAt}
                />
                <MetaChip label="Format" value={product.format ?? '—'} palette={palette} />
                <MetaChip label="Catégorie" value={product.category ?? '—'} palette={palette} />
              </View>

              <View style={styles.metaList}>
                <InfoRow label="Origine" value={sourceLabels[product.source]} palette={palette} />
                <InfoRow label="Code-barres" value={product.barcode ?? 'Non disponible'} palette={palette} />
                <InfoRow label="Ajouté le" value={formatDateTime(product.addedAt)} palette={palette} />
              </View>
            </View>
          </View>

          {/* Nutrition */}
          <View style={[styles.card, { backgroundColor: palette.surface, shadowColor: palette.shadowDark }]}>
            <View style={styles.sectionTitle}>
              <View style={[styles.sectionDot, { backgroundColor: palette.info }]} />
              <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>Informations nutritionnelles</Text>
            </View>
            {nutritionRows.length === 0 ? (
              <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Aucune donnée nutritionnelle disponible.</Text>
            ) : (
              <View style={styles.metaList}>
                <Text style={[Typography.caption, { color: palette.textTertiary }]}>Valeurs pour 100 g / 100 ml</Text>
                {nutritionRows.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} palette={palette} />
                ))}
              </View>
            )}
          </View>

          {/* Delete button */}
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
    <View style={[
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
});
