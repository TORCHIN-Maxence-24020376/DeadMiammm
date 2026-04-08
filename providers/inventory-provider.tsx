import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  AddInventoryProductInput,
  clampConsumptionPercent,
  InventoryProduct,
  StorageZone,
  UpdateInventoryProductInput,
} from '@/data/inventory';
import { isValidDateString } from '@/utils/format';

const INVENTORY_STORAGE_KEY = 'deadmiammm.inventory.v1';
const STORAGE_ZONES: StorageZone[] = ['frigo', 'congelateur', 'sec', 'animalerie', 'dph', 'autre'];

type InventoryContextValue = {
  products: InventoryProduct[];
  isHydrating: boolean;
  addProduct: (input: AddInventoryProductInput) => Promise<InventoryProduct>;
  updateProduct: (id: string, input: UpdateInventoryProductInput) => Promise<boolean>;
  updateProductConsumption: (id: string, percent: number) => Promise<void>;
  consumeProductUnit: (id: string) => Promise<'updated' | 'removed' | 'not-found'>;
  removeProduct: (id: string) => Promise<void>;
  clearProducts: () => Promise<void>;
};

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          return;
        }

        const normalized = parsed
          .map((entry) => sanitizeStoredProduct(entry))
          .filter((entry): entry is InventoryProduct => Boolean(entry));

        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
          await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(normalized));
        }

        if (isMounted) {
          setProducts(normalized);
        }
      } catch (error) {
        console.warn('Inventory hydration failed:', error);
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistProducts = useCallback(async (nextProducts: InventoryProduct[]) => {
    setProducts(nextProducts);
    try {
      await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(nextProducts));
    } catch (error) {
      console.warn('Inventory persistence failed:', error);
    }
  }, []);

  const addProduct = useCallback(
    async (input: AddInventoryProductInput) => {
      const nextProduct: InventoryProduct = {
        ...input,
        id: createId(),
        addedAt: new Date().toISOString(),
        consumptionPercent: sanitizeConsumptionPercent(input.consumptionPercent),
        initialQuantity: input.quantity,
      };

      const nextProducts = [nextProduct, ...products];
      await persistProducts(nextProducts);
      return nextProduct;
    },
    [persistProducts, products]
  );

  const removeProduct = useCallback(
    async (id: string) => {
      const nextProducts = products.filter((product) => product.id !== id);
      await persistProducts(nextProducts);
    },
    [persistProducts, products]
  );

  const updateProductConsumption = useCallback(
    async (id: string, percent: number) => {
      const nextPercent = sanitizeConsumptionPercent(percent);
      const nextProducts = products.map((product) => {
        if (product.id !== id) {
          return product;
        }

        if (product.consumptionPercent === nextPercent) {
          return product;
        }

        return {
          ...product,
          consumptionPercent: nextPercent,
        };
      });

      await persistProducts(nextProducts);
    },
    [persistProducts, products]
  );

  const updateProduct = useCallback(
    async (id: string, input: UpdateInventoryProductInput) => {
      const normalizedName = optionalString(input.name);
      const normalizedUnit = optionalString(input.unit);
      const normalizedExpiresAt = input.expiresAt === null ? null : normalizeExpiresAt(input.expiresAt);
      if (!normalizedName || !normalizedUnit) {
        return false;
      }

      if (input.expiresAt !== null && normalizedExpiresAt === null) {
        return false;
      }

      let found = false;
      const nextProducts = products.map((product) => {
        if (product.id !== id) {
          return product;
        }

        found = true;
        return {
          ...product,
          name: normalizedName,
          zone: isStorageZone(input.zone) ? input.zone : product.zone,
          expiresAt: normalizedExpiresAt,
          quantity: sanitizeQuantity(input.quantity),
          unit: normalizedUnit,
          category: optionalString(input.category),
          format: optionalString(input.format),
        };
      });

      if (!found) {
        return false;
      }

      await persistProducts(nextProducts);
      return true;
    },
    [persistProducts, products]
  );

  const consumeProductUnit = useCallback(
    async (id: string) => {
      const current = products.find((product) => product.id === id);
      if (!current) {
        return 'not-found';
      }

      if (current.quantity <= 1) {
        const nextProducts = products.filter((product) => product.id !== id);
        await persistProducts(nextProducts);
        return 'removed';
      }

      const nextProducts = products.map((product) => {
        if (product.id !== id) {
          return product;
        }

        return {
          ...product,
          quantity: sanitizeQuantity(product.quantity - 1),
          consumptionPercent: 0,
        };
      });

      await persistProducts(nextProducts);
      return 'updated';
    },
    [persistProducts, products]
  );

  const clearProducts = useCallback(async () => {
    await persistProducts([]);
  }, [persistProducts]);

  const value = useMemo<InventoryContextValue>(
    () => ({
      products,
      isHydrating,
      addProduct,
      updateProduct,
      updateProductConsumption,
      consumeProductUnit,
      removeProduct,
      clearProducts,
    }),
    [addProduct, clearProducts, consumeProductUnit, isHydrating, products, removeProduct, updateProduct, updateProductConsumption]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);

  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }

  return context;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeStoredProduct(entry: unknown): InventoryProduct | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Partial<InventoryProduct> & Record<string, unknown>;
  const name = optionalString(candidate.name);

  if (!name) {
    return null;
  }

  const zone = isStorageZone(candidate.zone) ? candidate.zone : 'autre';
  const quantity = sanitizeQuantity(candidate.quantity);
  const initialQuantity = candidate.initialQuantity !== undefined ? sanitizeQuantity(candidate.initialQuantity) : quantity;
  const unit = optionalString(candidate.unit) ?? 'unité';
  const addedAt = normalizeDateTime(candidate.addedAt);

  return {
    id: optionalString(candidate.id) ?? createId(),
    name,
    barcode: optionalString(candidate.barcode),
    imageUrl: optionalString(candidate.imageUrl),
    zone,
    expiresAt: normalizeExpiresAt(candidate.expiresAt),
    quantity,
    initialQuantity,
    unit,
    consumptionPercent: sanitizeConsumptionPercent(candidate.consumptionPercent),
    addedAt,
    category: optionalString(candidate.category),
    format: optionalString(candidate.format),
    nutrition: sanitizeNutrition(candidate.nutrition),
    source: sanitizeSource(candidate.source),
  };
}

function sanitizeQuantity(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.max(1, Math.round(value));
}

function optionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isStorageZone(value: unknown): value is StorageZone {
  return typeof value === 'string' && STORAGE_ZONES.includes(value as StorageZone);
}

function normalizeExpiresAt(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !isValidDateString(trimmed)) {
    return null;
  }

  return toLocalDateKey(new Date(trimmed));
}

function normalizeDateTime(value: unknown) {
  if (typeof value !== 'string' || !isValidDateString(value)) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

function sanitizeSource(value: unknown): InventoryProduct['source'] {
  if (value === 'scan' || value === 'search' || value === 'manual') {
    return value;
  }

  return 'manual';
}

function sanitizeNutrition(value: unknown): InventoryProduct['nutrition'] {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as InventoryProduct['nutrition'];
  const nutrition = {
    energyKj: sanitizeNumber(candidate?.energyKj),
    energyKcal: sanitizeNumber(candidate?.energyKcal),
    saturatedFat: sanitizeNumber(candidate?.saturatedFat),
    proteins: sanitizeNumber(candidate?.proteins),
    carbs: sanitizeNumber(candidate?.carbs),
    sugars: sanitizeNumber(candidate?.sugars),
    fiber: sanitizeNumber(candidate?.fiber),
    fat: sanitizeNumber(candidate?.fat),
    salt: sanitizeNumber(candidate?.salt),
    sodium: sanitizeNumber(candidate?.sodium),
  };

  if (Object.values(nutrition).every((item) => item === undefined)) {
    return undefined;
  }

  return nutrition;
}

function sanitizeNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function sanitizeConsumptionPercent(value: unknown) {
  return clampConsumptionPercent(value);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
