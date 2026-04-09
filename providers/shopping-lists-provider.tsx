import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  AddShoppingListItemInput,
  DEFAULT_SHOPPING_ITEM_UNIT,
  DEFAULT_SHOPPING_LIST_NAME,
  ShoppingList,
  ShoppingListItem,
  ShoppingListStatus,
} from '@/data/shopping-lists';
import { createSeedShoppingLists } from '@/data/seed';

const SHOPPING_LISTS_STORAGE_KEY = 'deadmiammm.shopping-lists.v2';

type ShoppingListsContextValue = {
  lists: ShoppingList[];
  isHydrating: boolean;
  createList: (name?: string) => Promise<ShoppingList>;
  renameList: (listId: string, nextName: string) => Promise<void>;
  setListStatus: (listId: string, status: ShoppingListStatus) => Promise<void>;
  archiveListAndStartFresh: (
    listId: string,
    reportItems?: Array<Pick<ShoppingListItem, 'name' | 'quantity' | 'unit' | 'linkedProductId'>>,
    targetListId?: string
  ) => Promise<ShoppingList>;
  deleteList: (listId: string) => Promise<void>;
  addItem: (input: AddShoppingListItemInput) => Promise<ShoppingListItem | null>;
  updateItem: (
    listId: string,
    itemId: string,
    updates: Partial<Pick<ShoppingListItem, 'name' | 'quantity' | 'unit' | 'isChecked' | 'isUnavailable'>>
  ) => Promise<void>;
  removeItem: (listId: string, itemId: string) => Promise<void>;
  clearCheckedItems: (listId: string) => Promise<void>;
};

const ShoppingListsContext = createContext<ShoppingListsContextValue | undefined>(undefined);

export function ShoppingListsProvider({ children }: { children: React.ReactNode }) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(SHOPPING_LISTS_STORAGE_KEY);
        if (!raw) {
          const seededLists = createSeedShoppingLists();
          await AsyncStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(seededLists));
          if (isMounted) {
            setLists(seededLists);
          }
          return;
        }

        const parsed = JSON.parse(raw) as unknown;
        const normalized = sanitizeStoredLists(parsed);
        const shouldSeedDemoLists =
          normalized.length === 1 &&
          normalized[0].name === DEFAULT_SHOPPING_LIST_NAME &&
          normalized[0].items.length === 0 &&
          normalized[0].status === 'active';

        if (shouldSeedDemoLists) {
          const seededLists = createSeedShoppingLists();
          await AsyncStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(seededLists));
          if (isMounted) {
            setLists(seededLists);
          }
          return;
        }

        if (isMounted) {
          setLists(normalized);
        }

        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
          await AsyncStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(normalized));
        }
      } catch (error) {
        console.warn('Shopping lists hydration failed:', error);
        if (isMounted) {
          setLists([createDefaultList()]);
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const persist = useCallback(async (nextLists: ShoppingList[]) => {
    const safeLists = ensureAtLeastOneList(nextLists);
    setLists(safeLists);

    try {
      await AsyncStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(safeLists));
    } catch (error) {
      console.warn('Shopping lists persistence failed:', error);
    }
  }, []);

  const createList = useCallback(
    async (name?: string) => {
      const nextList = createListRecord(name);
      await persist([nextList, ...lists]);
      return nextList;
    },
    [lists, persist]
  );

  const renameList = useCallback(
    async (listId: string, nextName: string) => {
      const normalizedName = normalizeListName(nextName);
      const nextLists = lists.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        return {
          ...list,
          name: normalizedName,
          updatedAt: new Date().toISOString(),
        };
      });

      await persist(nextLists);
    },
    [lists, persist]
  );

  const setListStatus = useCallback(
    async (listId: string, status: ShoppingListStatus) => {
      const nextLists = lists.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        return {
          ...list,
          status,
          updatedAt: new Date().toISOString(),
        };
      });

      await persist(nextLists);
    },
    [lists, persist]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const nextLists = lists.filter((list) => list.id !== listId);
      await persist(nextLists);
    },
    [lists, persist]
  );

  const addItem = useCallback(
    async (input: AddShoppingListItemInput) => {
      const name = normalizeItemName(input.name);
      if (!name) {
        return null;
      }

      const quantity = sanitizeQuantity(input.quantity);
      const unit = normalizeUnit(input.unit);
      const now = new Date().toISOString();
      const nextItem: ShoppingListItem = {
        id: createId(),
        name,
        quantity,
        unit,
        isChecked: false,
        isUnavailable: false,
        linkedProductId: normalizeOptionalString(input.linkedProductId),
        createdAt: now,
        updatedAt: now,
      };

      let createdOrMergedItem: ShoppingListItem | null = null;
      const nextLists = lists.map((list) => {
        if (list.id !== input.listId) {
          return list;
        }

        const matchingItem = list.items.find((item) => isSameShoppingItem(item, nextItem));
        if (matchingItem) {
          createdOrMergedItem = {
            ...matchingItem,
            quantity: sanitizeQuantity(matchingItem.quantity + quantity),
            isChecked: false,
            isUnavailable: false,
            updatedAt: now,
          };

          return {
            ...list,
            items: list.items.map((item) => (item.id === matchingItem.id ? createdOrMergedItem! : item)),
            updatedAt: now,
          };
        }

        createdOrMergedItem = nextItem;
        return {
          ...list,
          items: [nextItem, ...list.items],
          updatedAt: now,
        };
      });

      await persist(nextLists);
      return createdOrMergedItem;
    },
    [lists, persist]
  );

  const updateItem = useCallback(
    async (
      listId: string,
      itemId: string,
      updates: Partial<Pick<ShoppingListItem, 'name' | 'quantity' | 'unit' | 'isChecked' | 'isUnavailable'>>
    ) => {
      const now = new Date().toISOString();
      const nextLists = lists.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        return {
          ...list,
          updatedAt: now,
          items: list.items.map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            const nextName = updates.name === undefined ? item.name : normalizeItemName(updates.name) ?? item.name;
            const nextQuantity = updates.quantity === undefined ? item.quantity : sanitizeQuantity(updates.quantity);
            const nextUnit = updates.unit === undefined ? item.unit : normalizeUnit(updates.unit);
            let nextChecked = typeof updates.isChecked === 'boolean' ? updates.isChecked : item.isChecked;
            let nextUnavailable =
              typeof updates.isUnavailable === 'boolean' ? updates.isUnavailable : item.isUnavailable;

            if (typeof updates.isChecked === 'boolean' && updates.isChecked) {
              nextUnavailable = false;
            }

            if (typeof updates.isUnavailable === 'boolean' && updates.isUnavailable) {
              nextChecked = false;
            }

            return {
              ...item,
              name: nextName,
              quantity: nextQuantity,
              unit: nextUnit,
              isChecked: nextChecked,
              isUnavailable: nextUnavailable,
              updatedAt: now,
            };
          }),
        };
      });

      await persist(nextLists);
    },
    [lists, persist]
  );

  const removeItem = useCallback(
    async (listId: string, itemId: string) => {
      const now = new Date().toISOString();
      const nextLists = lists.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        return {
          ...list,
          updatedAt: now,
          items: list.items.filter((item) => item.id !== itemId),
        };
      });

      await persist(nextLists);
    },
    [lists, persist]
  );

  const clearCheckedItems = useCallback(
    async (listId: string) => {
      const now = new Date().toISOString();
      const nextLists = lists.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        return {
          ...list,
          updatedAt: now,
          items: list.items.filter((item) => !item.isChecked && !item.isUnavailable),
        };
      });

      await persist(nextLists);
    },
    [lists, persist]
  );

  const archiveListAndStartFresh = useCallback(
    async (
      listId: string,
      reportItems?: Array<Pick<ShoppingListItem, 'name' | 'quantity' | 'unit' | 'linkedProductId'>>,
      targetListId?: string
    ) => {
      const now = new Date().toISOString();

      const updatedLists = lists.map((list) => {
        if (list.id === listId) {
          return { ...list, status: 'done' as ShoppingListStatus, updatedAt: now };
        }

        if (targetListId && list.id === targetListId && reportItems && reportItems.length > 0) {
          const newItems: ShoppingListItem[] = reportItems.map((item) => ({
            id: createId(),
            name: normalizeItemName(item.name) ?? item.name,
            quantity: item.quantity,
            unit: item.unit ?? DEFAULT_SHOPPING_ITEM_UNIT,
            isChecked: false,
            isUnavailable: false,
            linkedProductId: item.linkedProductId ?? undefined,
            createdAt: now,
            updatedAt: now,
          }));
          return { ...list, items: [...newItems, ...list.items], updatedAt: now };
        }

        return list;
      });

      const remainingActive = updatedLists.filter((l) => l.status === 'active');
      if (remainingActive.length > 0) {
        await persist(updatedLists);
        return remainingActive[0];
      }

      const newList = createListRecord();
      await persist([newList, ...updatedLists]);
      return newList;
    },
    [lists, persist]
  );

  const value = useMemo<ShoppingListsContextValue>(
    () => ({
      lists,
      isHydrating,
      createList,
      renameList,
      setListStatus,
      archiveListAndStartFresh,
      deleteList,
      addItem,
      updateItem,
      removeItem,
      clearCheckedItems,
    }),
    [addItem, archiveListAndStartFresh, clearCheckedItems, createList, deleteList, isHydrating, lists, removeItem, renameList, setListStatus, updateItem]
  );

  return <ShoppingListsContext.Provider value={value}>{children}</ShoppingListsContext.Provider>;
}

export function useShoppingLists() {
  const context = useContext(ShoppingListsContext);
  if (!context) {
    throw new Error('useShoppingLists must be used within ShoppingListsProvider');
  }
  return context;
}

function sanitizeStoredLists(value: unknown) {
  if (!Array.isArray(value)) {
    return [createDefaultList()];
  }

  const sanitized = value
    .map((entry) => sanitizeList(entry))
    .filter((entry): entry is ShoppingList => Boolean(entry));

  if (sanitized.length === 0) {
    return [createDefaultList()];
  }

  return sanitized;
}

function sanitizeList(value: unknown): ShoppingList | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ShoppingList> & Record<string, unknown>;
  const now = new Date().toISOString();

  const items = Array.isArray(candidate.items)
    ? candidate.items
        .map((item) => sanitizeItem(item))
        .filter((item): item is ShoppingListItem => Boolean(item))
    : [];

  return {
    id: normalizeOptionalString(candidate.id) ?? createId(),
    name: normalizeListName(candidate.name),
    createdAt: normalizeDateTime(candidate.createdAt) ?? now,
    updatedAt: normalizeDateTime(candidate.updatedAt) ?? now,
    status: sanitizeStatus(candidate.status),
    items,
  };
}

function sanitizeItem(value: unknown): ShoppingListItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ShoppingListItem> & Record<string, unknown>;
  const name = normalizeItemName(candidate.name);
  if (!name) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: normalizeOptionalString(candidate.id) ?? createId(),
    name,
    quantity: sanitizeQuantity(candidate.quantity),
    unit: normalizeUnit(candidate.unit),
    isChecked: Boolean(candidate.isChecked),
    isUnavailable: Boolean(candidate.isUnavailable),
    linkedProductId: normalizeOptionalString(candidate.linkedProductId),
    createdAt: normalizeDateTime(candidate.createdAt) ?? now,
    updatedAt: normalizeDateTime(candidate.updatedAt) ?? now,
  };
}

function sanitizeStatus(value: unknown): ShoppingListStatus {
  return value === 'done' ? 'done' : 'active';
}

function createDefaultList(): ShoppingList {
  return createListRecord(DEFAULT_SHOPPING_LIST_NAME);
}

function createListRecord(name?: string): ShoppingList {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: normalizeListName(name),
    status: 'active',
    createdAt: now,
    updatedAt: now,
    items: [],
  };
}

function ensureAtLeastOneList(lists: ShoppingList[]) {
  return lists.length > 0 ? lists : [createDefaultList()];
}

function normalizeListName(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return DEFAULT_SHOPPING_LIST_NAME;
  }

  return normalized.slice(0, 60);
}

function normalizeItemName(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, 120);
}

function normalizeUnit(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return DEFAULT_SHOPPING_ITEM_UNIT;
  }

  return normalized.slice(0, 24);
}

function sanitizeQuantity(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  const bounded = Math.max(0.01, Math.min(9999, value));
  return Math.round(bounded * 1000) / 1000;
}

function normalizeDateTime(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isSameShoppingItem(current: ShoppingListItem, next: Pick<ShoppingListItem, 'name' | 'unit' | 'linkedProductId'>) {
  if (current.linkedProductId && next.linkedProductId) {
    return current.linkedProductId === next.linkedProductId;
  }

  return current.name.trim().toLowerCase() === next.name.trim().toLowerCase() && current.unit === next.unit;
}
