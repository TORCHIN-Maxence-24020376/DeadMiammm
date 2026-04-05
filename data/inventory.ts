export type StorageZone = 'frigo' | 'congelateur' | 'sec' | 'autre';
export type DisplayMode = 'cards' | 'list';
export type ProductSource = 'scan' | 'search' | 'manual';
export type AppIconName =
  | 'refrigerator'
  | 'snowflake'
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
  unit: string;
  addedAt: string;
  category?: string;
  format?: string;
  nutrition?: NutritionFacts;
  source: ProductSource;
};

export type AddInventoryProductInput = Omit<InventoryProduct, 'id' | 'addedAt'>;

export const zoneLabels: Record<StorageZone, string> = {
  frigo: 'Frigo',
  congelateur: 'Congélateur',
  sec: 'Aliment sec',
  autre: 'Autre',
};

export const zoneIconMap: Record<StorageZone, AppIconName> = {
  frigo: 'refrigerator',
  congelateur: 'snowflake',
  sec: 'shippingbox.fill',
  autre: 'shippingbox.fill',
};

export const sourceLabels: Record<ProductSource, string> = {
  scan: 'Scan code-barres',
  search: 'Recherche OpenFoodFacts',
  manual: 'Ajout manuel',
};

export function inferLowStock(product: Pick<InventoryProduct, 'quantity'>, threshold = 1) {
  return product.quantity <= threshold;
}
