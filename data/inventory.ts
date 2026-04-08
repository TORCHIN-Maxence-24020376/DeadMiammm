export type StorageZone = 'frigo' | 'congelateur' | 'sec' | 'animalerie' | 'dph' | 'autre';
export type DisplayMode = 'cards' | 'list';
export type ProductSource = 'scan' | 'search' | 'manual';
export type AppIconName =
  | 'refrigerator'
  | 'snowflake'
  | 'shippingbox.fill'
  | 'pawprint.fill'
  | 'cross.case.fill';

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
  unit: string;
  consumptionPercent: number;
  addedAt: string;
  category?: string;
  format?: string;
  nutrition?: NutritionFacts;
  source: ProductSource;
};

export type AddInventoryProductInput = Omit<InventoryProduct, 'id' | 'addedAt' | 'consumptionPercent'> & {
  consumptionPercent?: number;
};

export type UpdateInventoryProductInput = Pick<
  InventoryProduct,
  'name' | 'zone' | 'expiresAt' | 'quantity' | 'unit' | 'category' | 'format'
>;

export const zoneLabels: Record<StorageZone, string> = {
  frigo: 'Frigo',
  congelateur: 'Congélateur',
  sec: 'Sec',
  animalerie: 'Animalerie',
  dph: 'DPH',
  autre: 'Autre',
};

export const zoneIconMap: Record<StorageZone, AppIconName> = {
  frigo: 'refrigerator',
  congelateur: 'snowflake',
  sec: 'shippingbox.fill',
  animalerie: 'pawprint.fill',
  dph: 'cross.case.fill',
  autre: 'shippingbox.fill',
};

export const sourceLabels: Record<ProductSource, string> = {
  scan: 'Scan',
  search: 'Recherche',
  manual: 'Manuel',
};

export function inferLowStock(product: Pick<InventoryProduct, 'quantity'>, threshold = 1) {
  return product.quantity <= threshold;
}

export function clampConsumptionPercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
