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
  onSelect: (slug: 'frigo' | 'congelateur' | 'sec' | 'animalerie' | 'dph' | 'autre' | 'recipes' | 'shopping-lists') => void;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.68);

const entries = [
  { slug: 'frigo', title: 'Frigo', icon: 'refrigerator' },
  { slug: 'congelateur', title: 'Congélateur', icon: 'snowflake' },
  { slug: 'sec', title: 'Sec', icon: 'shippingbox.fill' },
  { slug: 'animalerie', title: 'Animalerie', icon: 'pawprint.fill' },
  { slug: 'dph', title: 'DPH', icon: 'cross.case.fill' },
  { slug: 'autre', title: 'Autre', icon: 'shippingbox.fill' },
  { slug: 'recipes', title: 'Recettes', icon: 'fork.knife' },
  { slug: 'shopping-lists', title: 'Liste de courses', icon: 'cart.fill' },
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
            borderColor: palette.border,
            shadowColor: palette.shadowDark,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}>
        <View style={[styles.handle, { backgroundColor: palette.textTertiary }]} />

        <Text style={[Typography.titleMd, { color: palette.textPrimary }]}>Accès rapides</Text>

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
                        backgroundColor: pressed ? palette.surfacePressed : palette.surfaceSoft,
                        borderColor: palette.border,
                        shadowColor: palette.shadowDark,
                      },
                    ]}>
                    <IconSymbol name={entry.icon} size={26} color={palette.accentPrimary} />
                  </View>
                  <Text style={[Typography.labelMd, { color: palette.textPrimary }]}>{entry.title}</Text>
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
    backgroundColor: '#020617',
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    height: SHEET_HEIGHT,
    borderRadius: 34,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 20,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 35,
    elevation: 18,
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: Radii.capsule,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
  },
  gridItem: {
    width: '30.5%',
    alignItems: 'center',
    gap: 10,
  },
  gridItemPressed: {
    transform: [{ scale: 0.97 }],
  },
  iconTile: {
    width: 86,
    height: 86,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
});
