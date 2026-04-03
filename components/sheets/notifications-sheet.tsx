import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPalette, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type NotificationsSheetProps = {
  visible: boolean;
  palette: AppPalette;
  onClose: () => void;
};

const notifications = [
  {
    id: 'n-1',
    title: '3 produits expirent cette semaine',
    body: 'Pense à consulter la vue "bientôt expirés".',
    icon: 'clock.badge.exclamationmark',
  },
  {
    id: 'n-2',
    title: 'Nouvelle idée recette disponible',
    body: 'Bowl poulet yaourt citron basé sur ton frigo.',
    icon: 'sparkles',
  },
  {
    id: 'n-3',
    title: 'Liste de courses active',
    body: 'Ta dernière liste contient 4 articles non cochés.',
    icon: 'checklist',
  },
] as const;

export function NotificationsSheet({ visible, palette, onClose }: NotificationsSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const offsetY = useRef(new Animated.Value(400)).current;

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
            borderColor: palette.border,
            shadowColor: palette.shadowDark,
          },
        ]}>
        <View style={styles.headerRow}>
          <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Notifications</Text>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: palette.surfaceSoft }]}>
            <IconSymbol name="xmark" size={18} color={palette.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {notifications.map((item) => (
            <View
              key={item.id}
              style={[styles.notificationCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: palette.overlay }]}>
                <IconSymbol name={item.icon} size={18} color={palette.accentPrimary} />
              </View>

              <View style={styles.cardTextWrap}>
                <Text style={[Typography.labelLg, { color: palette.textPrimary }]}>{item.title}</Text>
                <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 12,
  },
  notificationCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTextWrap: {
    flex: 1,
    gap: 2,
  },
});
