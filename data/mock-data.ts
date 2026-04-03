export type StorageZone = 'frigo' | 'congelateur' | 'sec' | 'animalerie' | 'dph';
export type DisplayMode = 'cards' | 'list';

export type Product = {
  id: string;
  name: string;
  zone: StorageZone;
  expiresAt: string;
  quantity: number;
  unit: string;
  addedAt: string;
  lowStock: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  time: string;
  ingredients: string[];
};

export type ShoppingList = {
  id: string;
  name: string;
  createdAt: string;
  status: 'in_progress' | 'done';
  items: string[];
};

export const products: Product[] = [
  {
    id: 'p-1',
    name: 'Yaourt grec nature',
    zone: 'frigo',
    expiresAt: '2026-04-05',
    quantity: 2,
    unit: 'pots',
    addedAt: '2026-04-01',
    lowStock: false,
  },
  {
    id: 'p-2',
    name: 'Blanc de poulet',
    zone: 'frigo',
    expiresAt: '2026-04-04',
    quantity: 1,
    unit: 'barquette',
    addedAt: '2026-04-02',
    lowStock: false,
  },
  {
    id: 'p-3',
    name: 'Épinards surgelés',
    zone: 'congelateur',
    expiresAt: '2026-04-12',
    quantity: 1,
    unit: 'sachet',
    addedAt: '2026-03-30',
    lowStock: true,
  },
  {
    id: 'p-4',
    name: 'Pâtes complètes',
    zone: 'sec',
    expiresAt: '2026-08-15',
    quantity: 1,
    unit: 'paquet',
    addedAt: '2026-04-03',
    lowStock: true,
  },
  {
    id: 'p-5',
    name: 'Croquettes chat adulte',
    zone: 'animalerie',
    expiresAt: '2026-10-08',
    quantity: 1,
    unit: 'sac',
    addedAt: '2026-03-28',
    lowStock: true,
  },
  {
    id: 'p-6',
    name: 'Shampoing doux',
    zone: 'dph',
    expiresAt: '2026-11-24',
    quantity: 1,
    unit: 'flacon',
    addedAt: '2026-03-20',
    lowStock: false,
  },
  {
    id: 'p-7',
    name: 'Tomates cerises',
    zone: 'frigo',
    expiresAt: '2026-04-06',
    quantity: 1,
    unit: 'barquette',
    addedAt: '2026-04-03',
    lowStock: false,
  },
  {
    id: 'p-8',
    name: 'Lait demi-écrémé',
    zone: 'frigo',
    expiresAt: '2026-04-09',
    quantity: 1,
    unit: 'bouteille',
    addedAt: '2026-04-02',
    lowStock: true,
  },
];

export const recipes: Recipe[] = [
  {
    id: 'r-1',
    title: 'Bowl poulet yaourt citron',
    time: '20 min',
    ingredients: ['Blanc de poulet', 'Yaourt grec', 'Tomates cerises'],
  },
  {
    id: 'r-2',
    title: 'Pâtes crémeuses épinards',
    time: '18 min',
    ingredients: ['Pâtes complètes', 'Épinards surgelés', 'Yaourt grec'],
  },
  {
    id: 'r-3',
    title: 'Salade fraîche minute',
    time: '10 min',
    ingredients: ['Tomates cerises', 'Poulet', 'Yaourt grec'],
  },
];

export const activeShoppingList: ShoppingList = {
  id: 'l-1',
  name: 'Courses semaine',
  createdAt: '2026-04-03',
  status: 'in_progress',
  items: ['Lait', 'Œufs', 'Pain complet', 'Pommes'],
};

export const pastShoppingLists: ShoppingList[] = [
  {
    id: 'l-2',
    name: 'Courses week-end',
    createdAt: '2026-03-29',
    status: 'done',
    items: ['Fromage', 'Concombre', 'Riz', 'Poulet'],
  },
  {
    id: 'l-3',
    name: 'Réassort maison',
    createdAt: '2026-03-20',
    status: 'done',
    items: ['Shampoing', 'Gel douche', 'Essuie-tout'],
  },
];

export const zoneLabels: Record<StorageZone, string> = {
  frigo: 'Frigo',
  congelateur: 'Congélateur',
  sec: 'Sec',
  animalerie: 'Animalerie',
  dph: 'DPH',
};
