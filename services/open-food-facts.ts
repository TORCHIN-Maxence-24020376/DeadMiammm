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

type LocalDBRecord = {
  version: number;
  updatedAt: string;
  products: Record<string, OpenFoodFactsProduct>;
  searches: Record<string, string[]>;
  history: LocalDBHistoryEntry[];
};

type LocalDBPayload = {
  version?: unknown;
  updatedAt?: unknown;
  products?: unknown;
  searches?: unknown;
  history?: unknown;
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

const LOCAL_DB_STORAGE_KEY = 'localDB';
const LOCAL_DB_SCHEMA_VERSION = 2;
const LEGACY_PRODUCT_CACHE_STORAGE_KEY_PREFIX = 'deadmiammm.off-product-cache.v1.';
const productMemoryCache = new Map<string, OpenFoodFactsProduct>();
const searchMemoryCache = new Map<string, OpenFoodFactsProduct[]>();
let localDBMemoryCache: LocalDBRecord | null = null;

const MAX_NAME_LENGTH = 180;
const MAX_LABEL_LENGTH = 280;
const MAX_CATEGORIES = 80;
const MAX_CATEGORY_LENGTH = 120;
const MAX_NUTRITION_VALUE = 100_000;
const MAX_SEARCH_RESULTS = 10;
const MAX_HISTORY_ENTRIES = 50;

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
  if (cachedProduct) {
    return cachedProduct;
  }

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json?fields=${PRODUCT_FIELDS}`
  );

  if (!response.ok) {
    throw new OpenFoodFactsError(`OpenFoodFacts request failed with status ${response.status}`, response.status);
  }

  const payload = (await response.json()) as ProductResponse;
  if (payload.status !== 1 || !payload.product) {
    return null;
  }

  const normalizedProduct = normalizeProduct(payload.product, payload.code ?? normalizedBarcode);
  await cacheProduct(normalizedProduct, normalizedBarcode);
  return normalizedProduct;
}

export async function searchProductsByText(query: string): Promise<OpenFoodFactsProduct[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const cachedResults = await readCachedProductsByQuery(trimmedQuery);
  if (cachedResults.length > 0) {
    return cachedResults;
  }

  const params = new URLSearchParams({
    search_terms: trimmedQuery,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(MAX_SEARCH_RESULTS),
    fields: PRODUCT_FIELDS,
  });

  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`);
  if (!response.ok) {
    throw new OpenFoodFactsError(`OpenFoodFacts search failed with status ${response.status}`, response.status);
  }

  const payload = (await response.json()) as SearchResponse;
  if (!payload.products || payload.products.length === 0) {
    await cacheProducts([], { query: trimmedQuery });
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

  await cacheProducts(products, { query: trimmedQuery });
  return products;
}

export async function clearOpenFoodFactsProductCache() {
  productMemoryCache.clear();
  searchMemoryCache.clear();
  localDBMemoryCache = null;

  await AsyncStorage.removeItem(LOCAL_DB_STORAGE_KEY);

  const keys = await AsyncStorage.getAllKeys();
  const legacyKeys = keys.filter((key) => key.startsWith(LEGACY_PRODUCT_CACHE_STORAGE_KEY_PREFIX));
  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys);
  }
}

export async function getOpenFoodFactsProductCacheCount() {
  const localDB = await readLocalDB();
  return Object.keys(localDB.products).length;
}

export async function getOpenFoodFactsLocalDBHistory() {
  const localDB = await readLocalDB();
  return localDB.history;
}

async function cacheProducts(products: OpenFoodFactsProduct[], options?: { query?: string; barcode?: string }) {
  const dedupedProducts = dedupeProductsByBarcode(products)
    .map((product) => sanitizeCachedProduct(product, product.barcode))
    .filter((product): product is OpenFoodFactsProduct => Boolean(product));

  const localDB = await readLocalDB();

  for (const product of dedupedProducts) {
    localDB.products[product.barcode] = product;
    productMemoryCache.set(product.barcode, product);
  }

  const normalizedQuery = options?.query ? toSearchKey(options.query) : '';
  if (normalizedQuery) {
    const barcodes = dedupedProducts.map((product) => product.barcode);
    localDB.searches[normalizedQuery] = barcodes;
    searchMemoryCache.set(normalizedQuery, dedupedProducts);
  }

  const historyEntry = buildHistoryEntry(dedupedProducts, options);
  if (historyEntry) {
    localDB.history = appendHistoryEntry(localDB.history, historyEntry);
  }

  localDB.updatedAt = new Date().toISOString();
  await persistLocalDB(localDB);
}

async function cacheProduct(product: OpenFoodFactsProduct, barcode?: string) {
  await cacheProducts([product], { barcode });
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

  const localDB = await readLocalDB();
  const fromStorage = localDB.products[barcode];
  if (!fromStorage) {
    return null;
  }

  const sanitized = sanitizeCachedProduct(fromStorage, barcode);
  if (!sanitized) {
    delete localDB.products[barcode];
    removeBarcodeFromSearchIndexes(localDB.searches, barcode);
    localDB.updatedAt = new Date().toISOString();
    await persistLocalDB(localDB);
    return null;
  }

  productMemoryCache.set(barcode, sanitized);
  return sanitized;
}

async function readCachedProductsByQuery(query: string) {
  const searchKey = toSearchKey(query);
  const fromMemory = searchMemoryCache.get(searchKey);
  if (fromMemory) {
    return fromMemory;
  }

  const localDB = await readLocalDB();

  if (Object.prototype.hasOwnProperty.call(localDB.searches, searchKey)) {
    const barcodes = localDB.searches[searchKey] ?? [];
    const indexedProducts = barcodes
      .map((barcode) => localDB.products[barcode])
      .map((product) => sanitizeCachedProduct(product))
      .filter((product): product is OpenFoodFactsProduct => Boolean(product));

    const validBarcodes = indexedProducts.map((product) => product.barcode);
    if (!areStringArraysEqual(barcodes, validBarcodes)) {
      localDB.searches[searchKey] = validBarcodes;
      localDB.updatedAt = new Date().toISOString();
      await persistLocalDB(localDB);
    }

    searchMemoryCache.set(searchKey, indexedProducts);
    return indexedProducts;
  }

  const localResults = Object.values(localDB.products)
    .map((product) => sanitizeCachedProduct(product))
    .filter((product): product is OpenFoodFactsProduct => Boolean(product))
    .filter((product) => buildSearchHaystack(product).includes(searchKey))
    .slice(0, MAX_SEARCH_RESULTS);

  if (localResults.length > 0) {
    localDB.searches[searchKey] = localResults.map((product) => product.barcode);
    localDB.updatedAt = new Date().toISOString();
    await persistLocalDB(localDB);
  }

  searchMemoryCache.set(searchKey, localResults);
  return localResults;
}

async function readLocalDB(): Promise<LocalDBRecord> {
  if (localDBMemoryCache) {
    return localDBMemoryCache;
  }

  try {
    const raw = await AsyncStorage.getItem(LOCAL_DB_STORAGE_KEY);
    if (!raw) {
      const empty = createEmptyLocalDB();
      localDBMemoryCache = empty;
      return empty;
    }

    const parsed = JSON.parse(raw) as unknown;
    const sanitized = sanitizeLocalDBRecord(parsed);
    localDBMemoryCache = sanitized;
    hydrateMemoryCachesFromLocalDB(sanitized);

    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      await AsyncStorage.setItem(LOCAL_DB_STORAGE_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch (error) {
    console.warn('OpenFoodFacts localDB read failed:', error);
    const empty = createEmptyLocalDB();
    localDBMemoryCache = empty;
    return empty;
  }
}

async function persistLocalDB(localDB: LocalDBRecord) {
  localDBMemoryCache = localDB;
  hydrateMemoryCachesFromLocalDB(localDB);

  try {
    await AsyncStorage.setItem(LOCAL_DB_STORAGE_KEY, JSON.stringify(localDB));
  } catch (error) {
    console.warn('OpenFoodFacts localDB write failed:', error);
  }
}

function createEmptyLocalDB(): LocalDBRecord {
  return {
    version: LOCAL_DB_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    products: {},
    searches: {},
    history: [],
  };
}

function sanitizeLocalDBRecord(value: unknown): LocalDBRecord {
  const candidate = value && typeof value === 'object' ? (value as LocalDBPayload) : {};
  const rawProducts =
    candidate.products && typeof candidate.products === 'object' ? (candidate.products as Record<string, unknown>) : {};
  const rawSearches =
    candidate.searches && typeof candidate.searches === 'object' ? (candidate.searches as Record<string, unknown>) : {};
  const rawHistory = Array.isArray(candidate.history) ? candidate.history : [];

  const products: Record<string, OpenFoodFactsProduct> = {};

  for (const [rawBarcode, rawProduct] of Object.entries(rawProducts)) {
    const normalizedBarcode = normalizeString(rawBarcode);
    if (!normalizedBarcode) {
      continue;
    }

    const sanitizedProduct = sanitizeCachedProduct(rawProduct, normalizedBarcode);
    if (!sanitizedProduct) {
      continue;
    }

    products[normalizedBarcode] = sanitizedProduct;
  }

  const searches: Record<string, string[]> = {};

  for (const [rawQuery, rawBarcodes] of Object.entries(rawSearches)) {
    const normalizedQuery = toSearchKey(rawQuery);
    if (!normalizedQuery) {
      continue;
    }

    if (!Array.isArray(rawBarcodes)) {
      searches[normalizedQuery] = [];
      continue;
    }

    const normalizedBarcodes = dedupeStrings(
      rawBarcodes
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((barcode) => Boolean(products[barcode]))
    );

    searches[normalizedQuery] = normalizedBarcodes;
  }

  const history = rawHistory
    .map((entry) => sanitizeHistoryEntry(entry))
    .filter((entry): entry is LocalDBHistoryEntry => Boolean(entry))
    .slice(0, MAX_HISTORY_ENTRIES);

  return {
    version: LOCAL_DB_SCHEMA_VERSION,
    updatedAt: isValidDateTimeString(candidate.updatedAt) ? candidate.updatedAt : new Date().toISOString(),
    products,
    searches,
    history,
  };
}

function hydrateMemoryCachesFromLocalDB(localDB: LocalDBRecord) {
  productMemoryCache.clear();
  searchMemoryCache.clear();

  for (const product of Object.values(localDB.products)) {
    productMemoryCache.set(product.barcode, product);
  }

  for (const [query, barcodes] of Object.entries(localDB.searches)) {
    const products = barcodes
      .map((barcode) => localDB.products[barcode])
      .filter((product): product is OpenFoodFactsProduct => Boolean(product));
    searchMemoryCache.set(query, products);
  }
}

function removeBarcodeFromSearchIndexes(searches: Record<string, string[]>, barcode: string) {
  for (const [query, barcodes] of Object.entries(searches)) {
    const filtered = barcodes.filter((item) => item !== barcode);
    searches[query] = filtered;
  }
}

function buildHistoryEntry(products: OpenFoodFactsProduct[], options?: { query?: string; barcode?: string }): LocalDBHistoryEntry | null {
  const normalizedQuery = normalizeString(options?.query);
  if (normalizedQuery) {
    return {
      id: `search:${toSearchKey(normalizedQuery)}:${Date.now()}`,
      type: 'search',
      term: normalizedQuery,
      label: normalizedQuery,
      resultCount: products.length,
      createdAt: new Date().toISOString(),
    };
  }

  const normalizedBarcode = normalizeString(options?.barcode);
  const firstProduct = products[0];
  if (normalizedBarcode && firstProduct) {
    return {
      id: `barcode:${normalizedBarcode}:${Date.now()}`,
      type: 'barcode',
      term: normalizedBarcode,
      label: firstProduct.name,
      resultCount: 1,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

function appendHistoryEntry(history: LocalDBHistoryEntry[], nextEntry: LocalDBHistoryEntry) {
  return [nextEntry, ...history.filter((entry) => !(entry.type === nextEntry.type && entry.term === nextEntry.term))].slice(
    0,
    MAX_HISTORY_ENTRIES
  );
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

  const normalizedId = normalizeString(candidate.id) ?? `${type}:${term}:${createdAt}`;

  return {
    id: normalizedId,
    type,
    term,
    label,
    resultCount,
    createdAt,
  };
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values));
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function toSearchKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildSearchHaystack(product: OpenFoodFactsProduct) {
  return [
    product.barcode,
    product.name,
    product.categoryLabel ?? '',
    product.quantityLabel ?? '',
    product.categories.join(' '),
  ]
    .join(' ')
    .toLowerCase();
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

function isValidDateTimeString(value: unknown): value is string {
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
    value === 'animalerie' ||
    value === 'dph' ||
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

  if (matchesAny(text, ['petfood', 'pet-food', 'chien', 'chat', 'animal'])) {
    return 'animalerie';
  }

  if (matchesAny(text, ['hygiene', 'cosmetics', 'beauty', 'shampoo', 'soap', 'household', 'dph'])) {
    return 'dph';
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
