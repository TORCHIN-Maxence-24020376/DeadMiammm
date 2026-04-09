import { InventoryProduct } from '@/data/inventory';
import { ShoppingList, ShoppingListItem } from '@/data/shopping-lists';

export function createSeedInventoryProducts(now = new Date()): InventoryProduct[] {
  return [
    {
      id: 'seed-yaourts-nature',
      name: 'Yaourts nature',
      zone: 'frigo',
      expiresAt: toDateKey(now, 4),
      quantity: 6,
      initialQuantity: 6,
      consumptionPercent: 0,
      unit: 'pot',
      addedAt: toIso(now, -48),
      category: 'Produits laitiers',
      format: 'Pack de 6 x 125 g',
      source: 'manual',
    },
    {
      id: 'seed-poulet',
      name: 'Blanc de poulet',
      zone: 'frigo',
      expiresAt: toDateKey(now, 1),
      quantity: 2,
      initialQuantity: 2,
      consumptionPercent: 0,
      unit: 'portion',
      addedAt: toIso(now, -30),
      category: 'Viandes',
      format: '2 filets',
      source: 'manual',
    },
    {
      id: 'seed-carottes',
      name: 'Carottes',
      zone: 'frigo',
      expiresAt: toDateKey(now, 5),
      quantity: 5,
      initialQuantity: 5,
      consumptionPercent: 0,
      unit: 'piece',
      addedAt: toIso(now, -26),
      category: 'Legumes',
      format: '1 kg',
      source: 'manual',
    },
    {
      id: 'seed-pommes',
      name: 'Pommes',
      zone: 'frigo',
      expiresAt: toDateKey(now, 6),
      quantity: 4,
      initialQuantity: 6,
      consumptionPercent: 0,
      unit: 'piece',
      addedAt: toIso(now, -22),
      category: 'Fruits',
      format: 'Sachet de 6',
      source: 'manual',
    },
    {
      id: 'seed-riz-basmati',
      name: 'Riz basmati',
      zone: 'sec',
      expiresAt: toDateKey(now, 180),
      quantity: 1,
      initialQuantity: 1,
      consumptionPercent: 0,
      unit: 'sachet',
      addedAt: toIso(now, -18),
      category: 'Feculents',
      format: '500 g',
      source: 'manual',
    },
    {
      id: 'seed-sauce-tomate',
      name: 'Sauce tomate',
      zone: 'sec',
      expiresAt: toDateKey(now, 120),
      quantity: 1,
      initialQuantity: 3,
      consumptionPercent: 35,
      unit: 'pot',
      addedAt: toIso(now, -16),
      category: 'Epicerie salee',
      format: '400 g',
      source: 'manual',
    },
    {
      id: 'seed-lasagnes-maison',
      name: 'Lasagnes maison',
      zone: 'congelateur',
      expiresAt: toDateKey(now, 365),
      quantity: 1,
      initialQuantity: 1,
      consumptionPercent: 0,
      unit: 'barquette',
      addedAt: toIso(now, -12),
      frozenAt: toIso(now, -12),
      category: 'Plat cuisine maison',
      format: '1 portion',
      homemadeFrozenType: 'plat_cuisine',
      source: 'manual',
    },
    {
      id: 'seed-steaks-haches',
      name: 'Steaks haches',
      zone: 'congelateur',
      expiresAt: toDateKey(now, 90),
      quantity: 1,
      initialQuantity: 4,
      consumptionPercent: 0,
      unit: 'piece',
      addedAt: toIso(now, -8),
      category: 'Viandes',
      format: 'Lot de 4',
      source: 'manual',
    },
  ];
}

export function createSeedShoppingLists(now = new Date()): ShoppingList[] {
  return [
    {
      id: 'seed-list-weekend',
      name: 'Courses du week-end',
      status: 'active',
      createdAt: toIso(now, -36),
      updatedAt: toIso(now, -2),
      items: [
        createItem({
          id: 'seed-list-weekend-item-yaourts',
          name: 'Yaourts nature',
          quantity: 1,
          unit: 'pack',
          linkedProductId: 'seed-yaourts-nature',
          createdAt: toIso(now, -20),
          updatedAt: toIso(now, -20),
        }),
        createItem({
          id: 'seed-list-weekend-item-oeufs',
          name: 'Oeufs',
          quantity: 1,
          unit: 'boite',
          createdAt: toIso(now, -18),
          updatedAt: toIso(now, -18),
        }),
        createItem({
          id: 'seed-list-weekend-item-coriandre',
          name: 'Coriandre',
          quantity: 1,
          unit: 'botte',
          createdAt: toIso(now, -14),
          updatedAt: toIso(now, -14),
        }),
        createItem({
          id: 'seed-list-weekend-item-pain',
          name: 'Pain de mie',
          quantity: 1,
          unit: 'paquet',
          isChecked: true,
          createdAt: toIso(now, -10),
          updatedAt: toIso(now, -6),
        }),
      ],
    },
    {
      id: 'seed-list-batch',
      name: 'Batch cooking',
      status: 'done',
      createdAt: toIso(now, -240),
      updatedAt: toIso(now, -120),
      items: [
        createItem({
          id: 'seed-list-batch-item-riz',
          name: 'Riz basmati',
          quantity: 1,
          unit: 'sachet',
          isChecked: true,
          linkedProductId: 'seed-riz-basmati',
          createdAt: toIso(now, -220),
          updatedAt: toIso(now, -220),
        }),
        createItem({
          id: 'seed-list-batch-item-pommes',
          name: 'Pommes',
          quantity: 6,
          unit: 'piece',
          isChecked: true,
          linkedProductId: 'seed-pommes',
          createdAt: toIso(now, -218),
          updatedAt: toIso(now, -218),
        }),
        createItem({
          id: 'seed-list-batch-item-bouillon',
          name: 'Bouillon',
          quantity: 1,
          unit: 'boite',
          isUnavailable: true,
          createdAt: toIso(now, -216),
          updatedAt: toIso(now, -216),
        }),
      ],
    },
  ];
}

function createItem(partial: Partial<ShoppingListItem> & Pick<ShoppingListItem, 'id' | 'name' | 'quantity' | 'unit' | 'createdAt' | 'updatedAt'>): ShoppingListItem {
  return {
    id: partial.id,
    name: partial.name,
    quantity: partial.quantity,
    unit: partial.unit,
    isChecked: partial.isChecked ?? false,
    isUnavailable: partial.isUnavailable ?? false,
    linkedProductId: partial.linkedProductId,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
  };
}

function toDateKey(now: Date, dayOffset: number) {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toIso(now: Date, hourOffset: number) {
  return new Date(now.getTime() + hourOffset * 60 * 60 * 1000).toISOString();
}
