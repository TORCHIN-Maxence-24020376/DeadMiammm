export type StorageZone = 'frigo' | 'congelateur' | 'sec' | 'autre';
export type DisplayMode = 'cards' | 'list';
export type ProductSource = 'scan' | 'search' | 'manual';
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
  source: ProductSource;
};

export type AddInventoryProductInput = Omit<InventoryProduct, 'id' | 'addedAt'>;
export type UpdateInventoryProductInput = Pick<
  InventoryProduct,
  'name' | 'zone' | 'expiresAt' | 'quantity' | 'unit' | 'category' | 'format'
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

function normalizeQuantity(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.max(1, Math.round(value));
}
