export type ShoppingListStatus = 'active' | 'done';

export type ShoppingListItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  isUnavailable: boolean;
  linkedProductId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingList = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: ShoppingListStatus;
  items: ShoppingListItem[];
};

export type AddShoppingListItemInput = {
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  linkedProductId?: string;
};

export const DEFAULT_SHOPPING_LIST_NAME = 'Mes courses';
export const DEFAULT_SHOPPING_ITEM_UNIT = 'unité';
