import AsyncStorage from '@react-native-async-storage/async-storage';

import { NutritionFacts, StorageZone } from '@/data/inventory';

export type OpenFoodFactsProduct = {
  barcode: string;
  name: string;
  imageUrl?: string;
  quantityLabel?: string;
  categoryLabel?: string;
  categories: string[];
  suggestedZone: StorageZone;
  nutrition?: NutritionFacts;
};

export type LocalDBHistoryEntry = {
  id: string;
  type: 'barcode' | 'search';
  term: string;
  label: string;
  resultCount: number;
  createdAt: string;
};

type ProductResponse = {
  status: number;
  code?: string;
  product?: OffProduct;
};

type SearchResponse = {
  products?: OffProduct[];
};

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  generic_name?: string;
  image_front_url?: string;
  image_url?: string;
  categories?: string;
  categories_tags?: string[];
  quantity?: string;
  product_quantity?: number;
  product_quantity_unit?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'generic_name',
  'image_front_url',
  'image_url',
  'categories',
  'categories_tags',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'nutriments',
].join(',');

const PRODUCT_CACHE_STORAGE_KEY_PREFIX = 'deadmiammm.off-product-cache.v1.';
const PRODUCT_HISTORY_STORAGE_KEY = 'deadmiammm.off-history.v1';
const productMemoryCache = new Map<string, OpenFoodFactsProduct>();
let historyMemoryCache: LocalDBHistoryEntry[] | null = null;
const PRODUCT_CACHE_SCHEMA_VERSION = 1;
const PRODUCT_HISTORY_SCHEMA_VERSION = 1;
const MAX_NAME_LENGTH = 180;
const MAX_LABEL_LENGTH = 280;
const MAX_CATEGORIES = 80;
const MAX_CATEGORY_LENGTH = 120;
const MAX_NUTRITION_VALUE = 100_000;
const MAX_HISTORY_ENTRIES = 50;

type CachedProductPayload = {
  version: number;
  barcode: string;
  cachedAt: string;
  product: unknown;
};

type LegacyCachedProductPayload = {
  product?: unknown;
};

type CachedHistoryPayload = {
  version: number;
  entries: LocalDBHistoryEntry[];
};

export class OpenFoodFactsError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OpenFoodFactsError';
    this.status = status;
  }
}

export function isOpenFoodFactsRateLimitError(error: unknown): error is OpenFoodFactsError {
  return error instanceof OpenFoodFactsError && error.status === 429;
}

export function toOpenFoodFactsUserMessage(error: unknown) {
  if (!(error instanceof OpenFoodFactsError)) {
    return null;
  }

  if (error.status === 429) {
    return 'OpenFoodFacts est temporairement saturé. Réessaie dans quelques secondes.';
  }

  if (error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504) {
    return 'OpenFoodFacts est temporairement indisponible. Tu peux utiliser la recherche plus tard ou l’ajout manuel.';
  }

  return 'OpenFoodFacts ne répond pas pour ce produit pour le moment.';
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const normalizedBarcode = barcode.trim();
  if (!normalizedBarcode) {
    return null;
  }

  const cachedProduct = await readCachedProduct(normalizedBarcode);
  if (cachedProduct && hasSufficientProductData(cachedProduct)) {
    await appendHistoryEntry({
      type: 'barcode',
      term: normalizedBarcode,
      label: cachedProduct.name,
      resultCount: 1,
    });
    return cachedProduct;
  }

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json?fields=${PRODUCT_FIELDS}`
    );

    if (!response.ok) {
      throw new OpenFoodFactsError(`OpenFoodFacts request failed with status ${response.status}`, response.status);
    }

    const payload = (await response.json()) as ProductResponse;
    if (payload.status !== 1 || !payload.product) {
      if (cachedProduct) {
        await appendHistoryEntry({
          type: 'barcode',
          term: normalizedBarcode,
          label: cachedProduct.name,
          resultCount: 1,
        });
      }
      return cachedProduct ?? null;
    }

    const normalizedProduct = normalizeProduct(payload.product, payload.code ?? normalizedBarcode);
    await cacheProduct(normalizedProduct);
    await appendHistoryEntry({
      type: 'barcode',
      term: normalizedBarcode,
      label: normalizedProduct.name,
      resultCount: 1,
    });
    return normalizedProduct;
  } catch (error) {
    if (cachedProduct) {
      await appendHistoryEntry({
        type: 'barcode',
        term: normalizedBarcode,
        label: cachedProduct.name,
        resultCount: 1,
      });
      return cachedProduct;
    }

    throw error;
  }
}

export async function searchProductsByText(query: string): Promise<OpenFoodFactsProduct[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    search_terms: trimmedQuery,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    fields: PRODUCT_FIELDS,
  });

  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`);
  if (!response.ok) {
    throw new OpenFoodFactsError(`OpenFoodFacts search failed with status ${response.status}`, response.status);
  }

  const payload = (await response.json()) as SearchResponse;
  if (!payload.products || payload.products.length === 0) {
    await appendHistoryEntry({
      type: 'search',
      term: trimmedQuery,
      label: trimmedQuery,
      resultCount: 0,
    });
    return [];
  }

  const products = payload.products
    .map((product) => {
      if (!product.code) {
        return null;
      }
      return normalizeProduct(product, product.code);
    })
    .filter((product): product is OpenFoodFactsProduct => Boolean(product));

  await cacheProducts(products);
  await appendHistoryEntry({
    type: 'search',
    term: trimmedQuery,
    label: trimmedQuery,
    resultCount: products.length,
  });
  return products;
}

export async function clearOpenFoodFactsProductCache() {
  productMemoryCache.clear();
  historyMemoryCache = null;

  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => key.startsWith(PRODUCT_CACHE_STORAGE_KEY_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }

  await AsyncStorage.removeItem(PRODUCT_HISTORY_STORAGE_KEY);
}

export async function getOpenFoodFactsProductCacheCount() {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(PRODUCT_CACHE_STORAGE_KEY_PREFIX)).length;
}

export async function getOpenFoodFactsLocalDBHistory() {
  return readHistoryEntries();
}

async function cacheProducts(products: OpenFoodFactsProduct[]) {
  const dedupedProducts = dedupeProductsByBarcode(products);
  await Promise.all(dedupedProducts.map((product) => cacheProduct(product)));
}

async function cacheProduct(product: OpenFoodFactsProduct) {
  const normalizedBarcode = product.barcode.trim();
  if (!normalizedBarcode) {
    return;
  }

  const sanitized = sanitizeCachedProduct(product, normalizedBarcode);
  if (!sanitized || !hasSufficientProductData(sanitized)) {
    return;
  }

  productMemoryCache.set(normalizedBarcode, sanitized);

  try {
    const payload: CachedProductPayload = {
      version: PRODUCT_CACHE_SCHEMA_VERSION,
      barcode: normalizedBarcode,
      cachedAt: new Date().toISOString(),
      product: sanitized,
    };

    const serialized = JSON.stringify(payload);
    if (!serialized) {
      return;
    }

    if (!isCachePayloadShapeValid(payload, normalizedBarcode)) {
      return;
    }

    const parsedPayload = JSON.parse(serialized) as unknown;
    if (!isCachePayloadShapeValid(parsedPayload, normalizedBarcode)) {
      return;
    }

    const productFromPayload = extractProductCandidate(parsedPayload);
    const revalidatedProduct = sanitizeCachedProduct(productFromPayload, normalizedBarcode);
    if (!revalidatedProduct || !hasSufficientProductData(revalidatedProduct)) {
      return;
    }

    const finalPayload = JSON.stringify({
      ...payload,
      product: revalidatedProduct,
    } satisfies CachedProductPayload);

    if (!finalPayload) {
      return;
    }

    await AsyncStorage.setItem(toProductCacheStorageKey(normalizedBarcode), finalPayload);
  } catch (error) {
    console.warn('OpenFoodFacts product cache write failed:', error);
  }
}

async function readCachedProduct(barcode: string) {
  const fromMemory = productMemoryCache.get(barcode);
  if (fromMemory) {
    const sanitizedMemory = sanitizeCachedProduct(fromMemory, barcode);
    if (sanitizedMemory) {
      productMemoryCache.set(barcode, sanitizedMemory);
      return sanitizedMemory;
    }

    productMemoryCache.delete(barcode);
  }

  try {
    const raw = await AsyncStorage.getItem(toProductCacheStorageKey(barcode));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    const shouldPurge = isCachePayloadCorrupted(parsed, barcode);
    if (shouldPurge) {
      await AsyncStorage.removeItem(toProductCacheStorageKey(barcode));
      return null;
    }

    const candidate = extractProductCandidate(parsed);
    const sanitized = sanitizeCachedProduct(candidate, barcode);
    if (!sanitized) {
      await AsyncStorage.removeItem(toProductCacheStorageKey(barcode));
      return null;
    }

    productMemoryCache.set(barcode, sanitized);

    if (!isCachePayloadShapeValid(parsed, barcode)) {
      await cacheProduct(sanitized);
    }

    return sanitized;
  } catch (error) {
    console.warn('OpenFoodFacts product cache read failed:', error);
    return null;
  }
}

function sanitizeCachedProduct(value: unknown, expectedBarcode?: string): OpenFoodFactsProduct | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<OpenFoodFactsProduct>;
  const barcode = normalizeString(candidate.barcode);
  const name = normalizeString(candidate.name);
  if (!barcode || !name || name.length > MAX_NAME_LENGTH) {
    return null;
  }

  if (expectedBarcode && barcode !== expectedBarcode) {
    return null;
  }

  const categories = Array.isArray(candidate.categories)
    ? candidate.categories
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, MAX_CATEGORIES)
        .map((item) => item.slice(0, MAX_CATEGORY_LENGTH))
    : [];
  const suggestedZone = isStorageZone(candidate.suggestedZone) ? candidate.suggestedZone : inferStorageZone(categories);

  return {
    barcode,
    name,
    imageUrl: sanitizeImageUrl(candidate.imageUrl),
    quantityLabel: sanitizeLabel(candidate.quantityLabel),
    categoryLabel: sanitizeLabel(candidate.categoryLabel),
    categories,
    suggestedZone,
    nutrition: sanitizeNutrition(candidate.nutrition),
  };
}

function sanitizeNutrition(value: unknown): NutritionFacts | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as NutritionFacts;
  const nutrition: NutritionFacts = {
    energyKj: sanitizeNutritionNumber(candidate.energyKj),
    energyKcal: sanitizeNutritionNumber(candidate.energyKcal),
    fat: sanitizeNutritionNumber(candidate.fat),
    saturatedFat: sanitizeNutritionNumber(candidate.saturatedFat),
    carbs: sanitizeNutritionNumber(candidate.carbs),
    sugars: sanitizeNutritionNumber(candidate.sugars),
    fiber: sanitizeNutritionNumber(candidate.fiber),
    proteins: sanitizeNutritionNumber(candidate.proteins),
    salt: sanitizeNutritionNumber(candidate.salt),
    sodium: sanitizeNutritionNumber(candidate.sodium),
  };

  if (Object.values(nutrition).every((item) => item === undefined)) {
    return undefined;
  }

  return nutrition;
}

async function readHistoryEntries() {
  if (historyMemoryCache) {
    return historyMemoryCache;
  }

  try {
    const raw = await AsyncStorage.getItem(PRODUCT_HISTORY_STORAGE_KEY);
    if (!raw) {
      historyMemoryCache = [];
      return historyMemoryCache;
    }

    const parsed = JSON.parse(raw) as unknown;
    const entries = sanitizeHistoryPayload(parsed);
    historyMemoryCache = entries;

    if (!isHistoryPayloadShapeValid(parsed)) {
      await persistHistoryEntries(entries);
    }

    return entries;
  } catch (error) {
    console.warn('OpenFoodFacts history read failed:', error);
    historyMemoryCache = [];
    return historyMemoryCache;
  }
}

async function appendHistoryEntry(entry: Omit<LocalDBHistoryEntry, 'id' | 'createdAt'>) {
  const nextEntry: LocalDBHistoryEntry = {
    id: `${entry.type}:${entry.term}:${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const currentEntries = await readHistoryEntries();
  const nextEntries = [nextEntry, ...currentEntries.filter((item) => !(item.type === nextEntry.type && item.term === nextEntry.term))]
    .slice(0, MAX_HISTORY_ENTRIES);

  await persistHistoryEntries(nextEntries);
}

async function persistHistoryEntries(entries: LocalDBHistoryEntry[]) {
  historyMemoryCache = entries;

  try {
    const payload: CachedHistoryPayload = {
      version: PRODUCT_HISTORY_SCHEMA_VERSION,
      entries,
    };

    await AsyncStorage.setItem(PRODUCT_HISTORY_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('OpenFoodFacts history write failed:', error);
  }
}

function sanitizeHistoryPayload(value: unknown) {
  const rawEntries =
    value && typeof value === 'object' && Array.isArray((value as Partial<CachedHistoryPayload>).entries)
      ? (value as CachedHistoryPayload).entries
      : Array.isArray(value)
        ? value
        : [];

  return rawEntries
    .map((entry) => sanitizeHistoryEntry(entry))
    .filter((entry): entry is LocalDBHistoryEntry => Boolean(entry))
    .slice(0, MAX_HISTORY_ENTRIES);
}

function sanitizeHistoryEntry(value: unknown): LocalDBHistoryEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<LocalDBHistoryEntry>;
  const type = candidate.type === 'barcode' || candidate.type === 'search' ? candidate.type : null;
  const term = normalizeString(candidate.term);
  const label = sanitizeLabel(candidate.label);
  const createdAt = isValidDateTimeString(candidate.createdAt) ? candidate.createdAt : null;
  const resultCount =
    typeof candidate.resultCount === 'number' && Number.isFinite(candidate.resultCount) && candidate.resultCount >= 0
      ? Math.round(candidate.resultCount)
      : null;

  if (!type || !term || !label || !createdAt || resultCount === null) {
    return null;
  }

  return {
    id: normalizeString(candidate.id) ?? `${type}:${term}:${createdAt}`,
    type,
    term,
    label,
    resultCount,
    createdAt,
  };
}

function dedupeProductsByBarcode(products: OpenFoodFactsProduct[]) {
  const map = new Map<string, OpenFoodFactsProduct>();

  for (const product of products) {
    const barcode = product.barcode.trim();
    if (!barcode) {
      continue;
    }
    map.set(barcode, product);
  }

  return Array.from(map.values());
}

function hasSufficientProductData(product: OpenFoodFactsProduct) {
  const hasName = product.name.trim().length > 0;
  const hasDetails = Boolean(product.imageUrl || product.quantityLabel || product.categoryLabel || product.nutrition);

  return hasName && hasDetails;
}

function toProductCacheStorageKey(barcode: string) {
  return `${PRODUCT_CACHE_STORAGE_KEY_PREFIX}${barcode}`;
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeLabel(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, MAX_LABEL_LENGTH);
}

function sanitizeImageUrl(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }

    return normalized;
  } catch {
    return undefined;
  }
}

function sanitizeNutritionNumber(value: unknown) {
  const numeric = toNumber(value as number | string | undefined);
  if (numeric === undefined || !Number.isFinite(numeric)) {
    return undefined;
  }

  if (numeric < 0 || numeric > MAX_NUTRITION_VALUE) {
    return undefined;
  }

  return Math.round(numeric * 1000) / 1000;
}

function extractProductCandidate(value: unknown): unknown {
  if (isCachePayloadShapeValid(value)) {
    return value.product;
  }

  if (isLegacyCachedPayload(value)) {
    return value.product;
  }

  return value;
}

function isCachePayloadShapeValid(value: unknown, expectedBarcode?: string): value is CachedProductPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CachedProductPayload>;
  if (candidate.version !== PRODUCT_CACHE_SCHEMA_VERSION) {
    return false;
  }

  const barcode = normalizeString(candidate.barcode);
  if (!barcode || (expectedBarcode && barcode !== expectedBarcode)) {
    return false;
  }

  if (!isValidDateTimeString(candidate.cachedAt)) {
    return false;
  }

  return 'product' in candidate;
}

function isHistoryPayloadShapeValid(value: unknown): value is CachedHistoryPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CachedHistoryPayload>;
  return candidate.version === PRODUCT_HISTORY_SCHEMA_VERSION && Array.isArray(candidate.entries);
}

function isLegacyCachedPayload(value: unknown): value is LegacyCachedProductPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'product' in value;
}

function isCachePayloadCorrupted(value: unknown, expectedBarcode: string) {
  if (isCachePayloadShapeValid(value, expectedBarcode)) {
    return false;
  }

  if (isLegacyCachedPayload(value)) {
    return false;
  }

  return typeof value === 'object' && value !== null && 'version' in value;
}

function isValidDateTimeString(value: unknown) {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function isStorageZone(value: unknown): value is StorageZone {
  return (
    value === 'frigo' ||
    value === 'congelateur' ||
    value === 'sec' ||
    value === 'autre'
  );
}

function normalizeProduct(product: OffProduct, barcode: string): OpenFoodFactsProduct {
  const name =
    product.product_name_fr?.trim() ||
    product.product_name?.trim() ||
    product.generic_name?.trim() ||
    'Produit sans nom';

  const quantityLabel =
    product.quantity?.trim() ||
    (product.product_quantity && product.product_quantity_unit
      ? `${product.product_quantity} ${product.product_quantity_unit}`
      : undefined);

  const categories = (product.categories_tags ?? []).map((category) => category.toLowerCase());
  const nutrition = extractNutrition(product.nutriments);

  return {
    barcode,
    name,
    imageUrl: product.image_front_url ?? product.image_url,
    quantityLabel,
    categoryLabel: product.categories,
    categories,
    suggestedZone: inferStorageZone(categories),
    nutrition,
  };
}

function extractNutrition(nutriments?: Record<string, number | string | undefined>): NutritionFacts | undefined {
  if (!nutriments) {
    return undefined;
  }

  const nutrition: NutritionFacts = {
    energyKj: pickNutritionNumber(nutriments, ['energy-kj_100g', 'energy_100g', 'energy-kj']),
    energyKcal: pickNutritionNumber(nutriments, ['energy-kcal_100g', 'energy-kcal', 'energy-kcal_value']),
    fat: pickNutritionNumber(nutriments, ['fat_100g', 'fat']),
    saturatedFat: pickNutritionNumber(nutriments, ['saturated-fat_100g', 'saturated-fat']),
    carbs: pickNutritionNumber(nutriments, ['carbohydrates_100g', 'carbohydrates']),
    sugars: pickNutritionNumber(nutriments, ['sugars_100g', 'sugars']),
    fiber: pickNutritionNumber(nutriments, ['fiber_100g', 'fiber']),
    proteins: pickNutritionNumber(nutriments, ['proteins_100g', 'proteins']),
    salt: pickNutritionNumber(nutriments, ['salt_100g', 'salt']),
    sodium: pickNutritionNumber(nutriments, ['sodium_100g', 'sodium']),
  };

  if (Object.values(nutrition).every((value) => typeof value !== 'number' || Number.isNaN(value))) {
    return undefined;
  }

  return nutrition;
}

function pickNutritionNumber(nutriments: Record<string, number | string | undefined>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(nutriments[key]);
    if (typeof value === 'number') {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: number | string | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }

    const matched = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!matched) {
      return undefined;
    }

    const looseParsed = Number(matched[0]);
    if (Number.isNaN(looseParsed)) {
      return undefined;
    }

    return looseParsed;
  }

  return undefined;
}

function inferStorageZone(categories: string[]): StorageZone {
  const text = categories.join(' ');

  if (matchesAny(text, ['frozen', 'surgeles', 'surgeles', 'congele', 'ice-cream'])) {
    return 'congelateur';
  }

  if (matchesAny(text, ['petfood', 'pet-food', 'chien', 'chat', 'animal', 'hygiene', 'cosmetics', 'beauty', 'shampoo', 'soap', 'household'])) {
    return 'autre';
  }

  if (
    matchesAny(text, [
      'dairy',
      'meat',
      'fresh',
      'fruits',
      'vegetables',
      'cheese',
      'yogurt',
      'yaourts',
      'charcuterie',
      'poissons',
    ])
  ) {
    return 'frigo';
  }

  return 'sec';
}

function matchesAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}
