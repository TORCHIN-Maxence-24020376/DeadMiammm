import { InventoryProduct } from '@/data/inventory';
import { daysUntil } from '@/utils/format';

export type RecipeSuggestion = {
  id: string;
  title: string;
  time: string;
  ingredients: string[];
};

type RecipeSuggestionOptions = {
  expiringSoonDays?: number;
};

const defaultRecipes: RecipeSuggestion[] = [
  {
    id: 'recipe-default-1',
    title: 'Poelee anti-gaspi rapide',
    time: '18 min',
    ingredients: ['Legumes de saison', 'Proteine', 'Herbes'],
  },
  {
    id: 'recipe-default-2',
    title: 'Bowl frais maison',
    time: '15 min',
    ingredients: ['Base cereales', 'Produit frais', 'Sauce yaourt'],
  },
  {
    id: 'recipe-default-3',
    title: 'Salade complete minute',
    time: '12 min',
    ingredients: ['Crudites', 'Legumineuses', 'Assaisonnement'],
  },
];

export function buildRecipeSuggestions(products: InventoryProduct[], options?: RecipeSuggestionOptions): RecipeSuggestion[] {
  const expiringSoonDays = normalizeExpiringDays(options?.expiringSoonDays);
  const urgent = products
    .filter((product) => product.expiresAt && daysUntil(product.expiresAt) <= expiringSoonDays)
    .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));

  if (urgent.length === 0) {
    return defaultRecipes;
  }

  const uniqueIngredients = [...new Set(urgent.map((product) => product.name.trim()).filter(Boolean))];
  const ingredientA = uniqueIngredients[0] ?? 'Ingredient principal';
  const ingredientB = uniqueIngredients[1] ?? 'Legume';
  const ingredientC = uniqueIngredients[2] ?? 'Epices';

  return [
    {
      id: recipeId(1, ingredientA),
      title: `Poelee ${ingredientA} express`,
      time: '18 min',
      ingredients: [ingredientA, ingredientB, 'Huile'],
    },
    {
      id: recipeId(2, ingredientB),
      title: `Bowl anti-gaspi ${ingredientB}`,
      time: '16 min',
      ingredients: [ingredientB, ingredientC, 'Yaourt'],
    },
    {
      id: recipeId(3, ingredientC),
      title: 'Assiette complete du placard',
      time: '20 min',
      ingredients: [ingredientC, 'Feculent', 'Assaisonnement'],
    },
  ];
}

function recipeId(index: number, source: string) {
  return `recipe-${index}-${slugify(source)}`;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ingredient';
}

function normalizeExpiringDays(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 7;
  }

  return Math.max(1, Math.round(value));
}
