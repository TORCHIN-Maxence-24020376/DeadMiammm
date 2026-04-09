import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  'arrow.right': 'arrow-forward',
  'bell.badge': 'notifications',
  'clock.arrow.circlepath': 'history',
  clock: 'schedule',
  'camera.fill': 'photo-camera',
  'camera.viewfinder': 'center-focus-strong',
  'list.bullet.rectangle.portrait': 'fact-check',
  'person.crop.circle': 'account-circle',
  'person.crop.circle.fill': 'account-circle',
  magnifyingglass: 'search',
  'square.grid.2x2': 'grid-view',
  'square.grid.2x2.fill': 'grid-on',
  'rectangle.grid.1x2.fill': 'view-agenda',
  plus: 'add',
  minus: 'remove',
  circle: 'radio-button-unchecked',
  'info.circle': 'info',
  checkmark: 'check',
  'checkmark.circle.fill': 'check-circle',
  xmark: 'close',
  'xmark.circle.fill': 'cancel',
  photo: 'photo',
  'sun.max.fill': 'light-mode',
  'moon.fill': 'dark-mode',
  refrigerator: 'kitchen',
  snowflake: 'ac-unit',
  'jar.fill': 'rice-bowl',
  archivebox: 'inventory',
  'archivebox.fill': 'inventory-2',
  'ellipsis.circle.fill': 'more-horiz',
  'shippingbox.fill': 'inventory',
  'pawprint.fill': 'pets',
  'cross.case.fill': 'medical-services',
  'bolt.fill': 'flash-on',
  'bolt.slash.fill': 'flash-off',
  'trash.fill': 'delete',
  tray: 'inbox',
  pencil: 'edit',
  'flame.fill': 'local-fire-department',
  'fork.knife': 'restaurant',
  'clock.badge.exclamationmark': 'schedule',
  sparkles: 'auto-awesome',
  checklist: 'checklist',
  'circle.lefthalf.filled': 'brightness-3',
  'slider.horizontal.3': 'tune',
  cart: 'shopping-cart',
  'cart.fill': 'shopping-cart',
  'note.text': 'assignment',
  'cart.badge.plus': 'add-shopping-cart',
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>['name']>;

export type IconSymbolName = keyof typeof MAPPING;
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
