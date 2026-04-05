import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppPalette, Radii, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ListMenuSheetProps = {
  visible: boolean;
  palette: AppPalette;
  onClose: () => void;
  onSelect: (slug: 'frigo' | 'congelateur' | 'sec' | 'autre' | 'recipes' | 'shopping-lists') => void;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.47);

const entries = [
  { slug: 'frigo', title: 'Frigo', icon: 'refrigerator', color: '#0284C7' },
  { slug: 'congelateur', title: 'Congélateur', icon: 'snowflake', color: '#6366F1' },
  { slug: 'sec', title: 'Aliment sec', icon: 'shippingbox.fill', color: '#D97706' },
  { slug: 'autre', title: 'Autre', icon: 'shippingbox.fill', color: '#8B5CF6' },
  { slug: 'recipes', title: 'Recettes', icon: 'fork.knife', color: '#16A34A' },
  { slug: 'shopping-lists', title: 'Liste de courses', icon: 'note.text', color: '#F59E0B' },
] as const;

export function ListMenuSheet({ visible, palette, onClose, onSelect }: ListMenuSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 230,
        mass: 0.95,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [translateY, visible]);

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SHEET_HEIGHT],
    outputRange: [0.5, 0],
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy <= 0) {
            return;
          }
          translateY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 130 || gestureState.vy > 1.2) {
            onClose();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            damping: 22,
            stiffness: 260,
            mass: 0.9,
            useNativeDriver: true,
          }).start();
        },
      }),
    [onClose, translateY]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.surface,
            shadowColor: palette.shadowDark,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}>
        <View style={[styles.handle, { backgroundColor: palette.textTertiary + '66' }]} />

        <View style={styles.sheetHeader}>
          <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Accès rapides</Text>
          <Text style={[Typography.bodySm, { color: palette.textSecondary }]}>Naviguez par zone ou section</Text>
        </View>

        <View style={styles.grid}>
          {entries.map((entry) => (
            <Pressable
              key={entry.slug}
              onPress={() => onSelect(entry.slug)}
              style={({ pressed }) => [styles.gridItem, pressed && styles.gridItemPressed]}>
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.iconTile,
                      {
                        backgroundColor: pressed
                          ? entry.color + '30'
                          : entry.color + '18',
                      },
                    ]}>
                    <IconSymbol name={entry.icon} size={28} color={entry.color} />
                  </View>
                  <Text
                    style={[
                      Typography.labelSm,
                      { color: palette.textPrimary, textAlign: 'center' },
                    ]}>
                    {entry.title}
                  </Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0C0905',
  },
  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: SHEET_HEIGHT,
    borderRadius: 36,
    paddingHorizontal: 20,
    bottom: 8,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 18,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.30,
    shadowRadius: 40,
    elevation: 20,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: Radii.capsule,
    alignSelf: 'center',
  },
  sheetHeader: {
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  gridItem: {
    width: '30.5%',
    alignItems: 'center',
    gap: 8,
  },
  gridItemPressed: {
    transform: [{ scale: 0.95 }],
  },
  iconTile: {
    width: 82,
    height: 82,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
