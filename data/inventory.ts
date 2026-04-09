export type StorageZone = 'frigo' | 'congelateur' | 'sec' | 'autre';
export type DisplayMode = 'cards' | 'list';
export type ProductSource = 'scan' | 'search' | 'manual';
export type FrozenHomemadeType = 'viande' | 'poisson' | 'plat_cuisine' | 'soupe' | 'legumes' | 'pain';
export type AppIconName =
  | 'refrigerator'
  | 'snowflake'
  | 'jar.fill'
  | 'archivebox.fill'
  | 'ellipsis.circle.fill'
  | 'shippingbox.fill';

export type NutritionFacts = {
  energyKj?: number;
  energyKcal?: number;
  saturatedFat?: number;
  proteins?: number;
  carbs?: number;
  sugars?: number;
  fiber?: number;
  fat?: number;
  salt?: number;
  sodium?: number;
};

export type InventoryProduct = {
  id: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  zone: StorageZone;
  expiresAt: string | null;
  quantity: number;
  initialQuantity?: number;
  consumptionPercent?: number;
  unit: string;
  addedAt: string;
  category?: string;
  format?: string;
  nutrition?: NutritionFacts;
  homemadeFrozenType?: FrozenHomemadeType;
  frozenAt?: string;
  source: ProductSource;
};

export type AddInventoryProductInput = Omit<InventoryProduct, 'id' | 'addedAt'>;
export type UpdateInventoryProductInput = Pick<
  InventoryProduct,
  'name' | 'zone' | 'expiresAt' | 'quantity' | 'unit' | 'category' | 'format' | 'homemadeFrozenType' | 'frozenAt'
>;

export const zoneLabels: Record<StorageZone, string> = {
  frigo: 'Frigo',
  congelateur: 'Congélateur',
  sec: 'Aliment sec',
  autre: 'Autre',
};

export const zoneIconMap: Record<StorageZone, AppIconName> = {
  frigo: 'refrigerator',
  congelateur: 'snowflake',
  sec: 'archivebox.fill',
  autre: 'ellipsis.circle.fill',
};

export const sourceLabels: Record<ProductSource, string> = {
  scan: 'Scan code-barres',
  search: 'Recherche OpenFoodFacts',
  manual: 'Ajout manuel',
};

export const frozenHomemadeLabels: Record<FrozenHomemadeType, string> = {
  viande: 'Viande',
  poisson: 'Poisson',
  plat_cuisine: 'Plat cuisine',
  soupe: 'Soupe / sauce',
  legumes: 'Legumes',
  pain: 'Pain / patisserie',
};

export const frozenHomemadeDurationDays: Record<FrozenHomemadeType, number> = {
  viande: 90,
  poisson: 90,
  plat_cuisine: 365,
  soupe: 180,
  legumes: 365,
  pain: 180,
};

export const frozenHomemadeDurationLabels: Record<FrozenHomemadeType, string> = {
  viande: '3 mois',
  poisson: '3 mois',
  plat_cuisine: '1 an',
  soupe: '6 mois',
  legumes: '1 an',
  pain: '6 mois',
};

export function inferLowStock(product: Pick<InventoryProduct, 'quantity'>, threshold = 1) {
  return normalizeQuantity(product.quantity) <= Math.max(1, Math.round(threshold));
}

export function resolveInitialQuantity(product: Pick<InventoryProduct, 'quantity' | 'initialQuantity'>) {
  return Math.max(normalizeQuantity(product.quantity), normalizeQuantity(product.initialQuantity));
}

export function inferConsumptionPercent(
  product: Pick<InventoryProduct, 'quantity' | 'initialQuantity' | 'consumptionPercent'>
) {
  const quantity = normalizeQuantity(product.quantity);
  const initialQuantity = resolveInitialQuantity(product);
  const currentUnitProgress = clampConsumptionPercent(product.consumptionPercent) / 100;

  if (initialQuantity <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((((initialQuantity - quantity) + currentUnitProgress) / initialQuantity) * 100))
  );
}

export function clampConsumptionPercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isFrozenHomemadeType(value: unknown): value is FrozenHomemadeType {
  return (
    value === 'viande' ||
    value === 'poisson' ||
    value === 'plat_cuisine' ||
    value === 'soupe' ||
    value === 'legumes' ||
    value === 'pain'
  );
}

export function isHomemadeFrozenProduct(
  product: Pick<InventoryProduct, 'zone' | 'homemadeFrozenType'>
) {
  return product.zone === 'congelateur' && isFrozenHomemadeType(product.homemadeFrozenType);
}

export function inferHomemadeFrozenExpiration(
  type: FrozenHomemadeType,
  referenceDate: Date | string = new Date()
) {
  const baseDate = toSafeDate(referenceDate);
  baseDate.setHours(12, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + frozenHomemadeDurationDays[type]);
  return toLocalDateKey(baseDate);
}

function normalizeQuantity(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.max(1, Math.round(value));
}

function toSafeDate(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
