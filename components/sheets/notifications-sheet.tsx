import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPalette, Radii, Typography } from '@/constants/theme';
import { inferLowStock } from '@/data/inventory';
import { useAppSettings } from '@/providers/app-settings-provider';
import { useInventory } from '@/providers/inventory-provider';
import { daysUntil } from '@/utils/format';
import { buildRecipeSuggestions } from '@/utils/recipes';
import { IconSymbol } from '@/components/ui/icon-symbol';

type NotificationsSheetProps = {
  visible: boolean;
  palette: AppPalette;
  onClose: () => void;
};

const ICON_COLORS = {
  'clock.badge.exclamationmark': '#D97706',
  'checklist': '#DC2626',
  'sparkles': '#16A34A',
  'checkmark.circle.fill': '#16A34A',
} as const;

export function NotificationsSheet({ visible, palette, onClose }: NotificationsSheetProps) {
  const { products } = useInventory();
  const { notifications: notificationSettings, expiringSoonDays, lowStockThreshold } = useAppSettings();
  const [mounted, setMounted] = useState(visible);
  const offsetY = useRef(new Animated.Value(400)).current;

  const notifications = useMemo(() => {
    const items: { id: string; title: string; body: string; icon: 'clock.badge.exclamationmark' | 'checklist' | 'sparkles' | 'checkmark.circle.fill' }[] = [];

    if (notificationSettings.expiring) {
      const expiringCount = products.filter((product) => product.expiresAt && daysUntil(product.expiresAt) <= expiringSoonDays).length;
      if (expiringCount > 0) {
        items.push({
          id: 'expiring',
          title: `${expiringCount} produit${expiringCount > 1 ? 's' : ''} proche${expiringCount > 1 ? 's' : ''} de la date`,
          body: `Seuil actif: ${expiringSoonDays} jour${expiringSoonDays > 1 ? 's' : ''}.`,
          icon: 'clock.badge.exclamationmark',
        });
      }
    }

    if (notificationSettings.lowStock) {
      const lowStockCount = products.filter((product) => inferLowStock(product, lowStockThreshold)).length;
      if (lowStockCount > 0) {
        items.push({
          id: 'low-stock',
          title: `${lowStockCount} produit${lowStockCount > 1 ? 's' : ''} en stock faible`,
          body: `Seuil actif: quantité <= ${lowStockThreshold}.`,
          icon: 'checklist',
        });
      }
    }

    if (notificationSettings.recipes) {
      const recipes = buildRecipeSuggestions(products, { expiringSoonDays });
      if (recipes.length > 0) {
        items.push({
          id: 'recipes',
          title: 'Nouvelle idée recette',
          body: recipes[0].title,
          icon: 'sparkles',
        });
      }
    }

    if (items.length > 0) {
      return items;
    }

    return [
      {
        id: 'empty',
        title: 'Aucune alerte active',
        body: 'Aucune action urgente pour le moment.',
        icon: 'checkmark.circle.fill' as const,
      },
    ];
  }, [expiringSoonDays, lowStockThreshold, notificationSettings.expiring, notificationSettings.lowStock, notificationSettings.recipes, products]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(offsetY, {
        toValue: 0,
        damping: 22,
        stiffness: 210,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(offsetY, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [offsetY, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: offsetY }],
            backgroundColor: palette.surface,
            shadowColor: palette.shadowDark,
          },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Notifications</Text>
            <Text style={[Typography.caption, { color: palette.textSecondary }]}>
              {notifications.length} alerte{notifications.length > 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft },
            ]}>
            <IconSymbol name="xmark" size={16} color={palette.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {notifications.map((item) => {
            const iconColor = ICON_COLORS[item.icon];
            return (
              <View
                key={item.id}
                style={[styles.notificationCard, { backgroundColor: iconColor + '10' }]}>
                <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
                  <IconSymbol name={item.icon} size={20} color={iconColor} />
                </View>

                <View style={styles.cardTextWrap}>
                  <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{item.title}</Text>
                  <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{item.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 12, 24, 0.60)',
  },
  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
  },
  notificationCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cardTextWrap: {
    flex: 1,
    gap: 3,
  },
});
