// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  'bell.badge': 'notifications',
  'camera.fill': 'photo-camera',
  'camera.viewfinder': 'center-focus-strong',
  'list.bullet.rectangle.portrait': 'fact-check',
  'person.crop.circle': 'account-circle',
  magnifyingglass: 'search',
  'square.grid.2x2': 'grid-view',
  'square.grid.2x2.fill': 'grid-on',
  'rectangle.grid.1x2.fill': 'view-agenda',
  plus: 'add',
  minus: 'remove',
  circle: 'radio-button-unchecked',
  'checkmark.circle.fill': 'check-circle',
  xmark: 'close',
  photo: 'photo',
  refrigerator: 'kitchen',
  snowflake: 'ac-unit',
  'shippingbox.fill': 'inventory',
  'pawprint.fill': 'pets',
  'cross.case.fill': 'medical-services',
  'bolt.fill': 'flash-on',
  'bolt.slash.fill': 'flash-off',
  'trash.fill': 'delete',
  'fork.knife': 'restaurant',
  'clock.badge.exclamationmark': 'schedule',
  sparkles: 'auto-awesome',
  checklist: 'checklist',
  'circle.lefthalf.filled': 'brightness-3',
  'slider.horizontal.3': 'tune',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
