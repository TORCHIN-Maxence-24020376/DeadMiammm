import { InventoryProduct } from '@/data/inventory';
import { daysUntil } from '@/utils/format';

export type RecipeSuggestion = {
  id: string;
  title: string;
  time: string;
  ingredients: string[];
  steps: string[];
};

type RecipeSuggestionOptions = {
  expiringSoonDays?: number;
};

type ProductTag = 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'starch' | 'sauce' | 'freezer';

type ClassifiedProduct = {
  name: string;
  tags: ProductTag[];
};

const defaultRecipes: RecipeSuggestion[] = [
  {
    id: 'recipe-default-soup',
    title: 'Soupe de legumes anti-gaspi',
    time: '25 min',
    ingredients: ['Legumes a cuisiner', 'Bouillon', 'Herbes'],
    steps: [
      'Coupe les legumes en morceaux reguliers.',
      'Fais cuire avec un bouillon pendant 20 minutes.',
      'Mixe, ajuste l assaisonnement puis sers chaud.',
    ],
  },
  {
    id: 'recipe-default-bowl',
    title: 'Bol frais du frigo',
    time: '10 min',
    ingredients: ['Produit laitier', 'Fruit', 'Graines'],
    steps: [
      'Prepare une base lactee bien froide.',
      'Ajoute les fruits ou compotes disponibles.',
      'Termine avec des graines, cereales ou fruits secs.',
    ],
  },
  {
    id: 'recipe-default-skillet',
    title: 'Poelee rapide du placard',
    time: '18 min',
    ingredients: ['Legume', 'Feculent', 'Assaisonnement'],
    steps: [
      'Fais revenir le legume principal avec un filet d huile.',
      'Ajoute le feculent deja cuit ou rapidement preparable.',
      'Assaisonne et laisse dorer quelques minutes avant de servir.',
    ],
  },
];

export function buildRecipeSuggestions(products: InventoryProduct[], options?: RecipeSuggestionOptions): RecipeSuggestion[] {
  const expiringSoonDays = normalizeExpiringDays(options?.expiringSoonDays);
  const urgentProducts = products
    .filter((product) => product.expiresAt && daysUntil(product.expiresAt) <= expiringSoonDays)
    .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));

  const prioritySource = classifyProducts(urgentProducts.length > 0 ? urgentProducts : products);
  const fullSource = classifyProducts(products);

  const suggestions = dedupeRecipes([
    buildSkilletRecipe(prioritySource, fullSource),
    buildFreshBowlRecipe(prioritySource, fullSource),
    buildTomatoRecipe(prioritySource, fullSource),
    buildSoupRecipe(prioritySource, fullSource),
    buildFreezerRecipe(prioritySource, fullSource),
  ]).slice(0, 3);

  if (suggestions.length > 0) {
    return suggestions;
  }

  return defaultRecipes;
}

function buildSkilletRecipe(priority: ClassifiedProduct[], fallback: ClassifiedProduct[]) {
  const protein = pickFirst(priority, fallback, ['protein']);
  const vegetable = pickFirst(priority, fallback, ['vegetable']);
  const starch = pickFirst(priority, fallback, ['starch']);

  if (!protein || !vegetable) {
    return null;
  }

  const thirdIngredient = starch?.name ?? 'riz';
  return createRecipe({
    title: `Poelee de ${shortName(protein.name)} et ${shortName(vegetable.name)}`,
    time: '18 min',
    ingredients: [protein.name, vegetable.name, thirdIngredient],
    steps: [
      `Coupe ${protein.name.toLowerCase()} et ${vegetable.name.toLowerCase()} en morceaux.`,
      `Fais revenir ${protein.name.toLowerCase()} puis ajoute ${vegetable.name.toLowerCase()}.`,
      `Sers avec ${thirdIngredient.toLowerCase()} pour un repas complet.`,
    ],
  });
}

function buildFreshBowlRecipe(priority: ClassifiedProduct[], fallback: ClassifiedProduct[]) {
  const dairy = pickFirst(priority, fallback, ['dairy']);
  const fruit = pickFirst(priority, fallback, ['fruit']);

  if (!dairy || !fruit) {
    return null;
  }

  return createRecipe({
    title: `${shortName(dairy.name)} aux ${shortName(pluralizeFruit(fruit.name))}`,
    time: '8 min',
    ingredients: [dairy.name, fruit.name, 'Cereales ou graines'],
    steps: [
      `Verse ${dairy.name.toLowerCase()} dans un bol ou une verrine.`,
      `Ajoute ${fruit.name.toLowerCase()} coupes ou compotes.`,
      'Termine avec des cereales, des graines ou quelques fruits secs.',
    ],
  });
}

function buildTomatoRecipe(priority: ClassifiedProduct[], fallback: ClassifiedProduct[]) {
  const starch = pickFirst(priority, fallback, ['starch']);
  const sauce = pickFirst(priority, fallback, ['sauce']);
  const proteinOrVegetable = pickFirst(priority, fallback, ['protein', 'vegetable']);

  if (!starch || !sauce || !proteinOrVegetable) {
    return null;
  }

  return createRecipe({
    title: `${shortName(starch.name)} a la ${shortName(sauce.name)}`,
    time: '20 min',
    ingredients: [starch.name, sauce.name, proteinOrVegetable.name],
    steps: [
      `Prepare ${starch.name.toLowerCase()} selon l emballage.`,
      `Rechauffe ${sauce.name.toLowerCase()} avec ${proteinOrVegetable.name.toLowerCase()}.`,
      `Melange le tout et laisse mijoter 2 a 3 minutes avant de servir.`,
    ],
  });
}

function buildSoupRecipe(priority: ClassifiedProduct[], fallback: ClassifiedProduct[]) {
  const firstVegetable = pickFirst(priority, fallback, ['vegetable']);
  const secondVegetable = pickDistinct(priority, fallback, ['vegetable'], firstVegetable?.name);

  if (!firstVegetable || !secondVegetable) {
    return null;
  }

  return createRecipe({
    title: `Soupe de ${shortName(firstVegetable.name)} et ${shortName(secondVegetable.name)}`,
    time: '25 min',
    ingredients: [firstVegetable.name, secondVegetable.name, 'Bouillon'],
    steps: [
      `Epluche puis coupe ${firstVegetable.name.toLowerCase()} et ${secondVegetable.name.toLowerCase()}.`,
      'Couvre d eau ou de bouillon et laisse cuire une vingtaine de minutes.',
      'Mixe la soupe, ajuste l assaisonnement puis sers chaud.',
    ],
  });
}

function buildFreezerRecipe(priority: ClassifiedProduct[], fallback: ClassifiedProduct[]) {
  const frozenMeal = pickFirst(priority, fallback, ['freezer']);

  if (!frozenMeal) {
    return null;
  }

  return createRecipe({
    title: `Batch express avec ${shortName(frozenMeal.name)}`,
    time: '15 min',
    ingredients: [frozenMeal.name, 'Accompagnement simple', 'Herbes'],
    steps: [
      `Sors ${frozenMeal.name.toLowerCase()} du congelateur et laisse temperer quelques minutes.`,
      'Rechauffe au four, a la casserole ou a la poele selon le format.',
      'Ajoute un accompagnement simple et quelques herbes avant de servir.',
    ],
  });
}

function createRecipe(input: Omit<RecipeSuggestion, 'id'>): RecipeSuggestion {
  return {
    id: `recipe-${slugify(input.title)}`,
    ...input,
  };
}

function classifyProducts(products: InventoryProduct[]) {
  return dedupeByName(
    products.map((product) => {
      const text = [product.name, product.category ?? '', product.format ?? '', product.zone].join(' ').toLowerCase();
      const tags = new Set<ProductTag>();

      if (matchesAny(text, ['poulet', 'dinde', 'steak', 'boeuf', 'porc', 'jambon', 'thon', 'saumon', 'poisson', 'oeuf', 'tofu'])) {
        tags.add('protein');
      }

      if (matchesAny(text, ['carotte', 'courgette', 'salade', 'epinard', 'poivron', 'brocoli', 'haricot', 'legume', 'oignon', 'tomate'])) {
        tags.add('vegetable');
      }

      if (matchesAny(text, ['pomme', 'poire', 'banane', 'fraise', 'framboise', 'fruit', 'compote', 'mangue'])) {
        tags.add('fruit');
      }

      if (matchesAny(text, ['yaourt', 'lait', 'fromage', 'feta', 'mozzarella', 'creme', 'beurre'])) {
        tags.add('dairy');
      }

      if (matchesAny(text, ['riz', 'pate', 'pates', 'semoule', 'quinoa', 'pommes de terre', 'patate', 'pain', 'wrap', 'tortilla', 'gnocchi'])) {
        tags.add('starch');
      }

      if (matchesAny(text, ['sauce', 'coulis', 'pesto', 'tomate'])) {
        tags.add('sauce');
      }

      if (product.zone === 'congelateur' || matchesAny(text, ['maison', 'lasagne', 'gratin', 'soupe'])) {
        tags.add('freezer');
      }

      return {
        name: product.name.trim(),
        tags: Array.from(tags),
      } satisfies ClassifiedProduct;
    })
  );
}

function pickFirst(priority: ClassifiedProduct[], fallback: ClassifiedProduct[], tags: ProductTag[]) {
  return priority.find((product) => hasAnyTag(product, tags)) ?? fallback.find((product) => hasAnyTag(product, tags));
}

function pickDistinct(
  priority: ClassifiedProduct[],
  fallback: ClassifiedProduct[],
  tags: ProductTag[],
  excludedName?: string
) {
  return (
    priority.find((product) => hasAnyTag(product, tags) && product.name !== excludedName) ??
    fallback.find((product) => hasAnyTag(product, tags) && product.name !== excludedName)
  );
}

function hasAnyTag(product: ClassifiedProduct, tags: ProductTag[]) {
  return tags.some((tag) => product.tags.includes(tag));
}

function dedupeByName(products: ClassifiedProduct[]) {
  const byName = new Map<string, ClassifiedProduct>();

  products.forEach((product) => {
    if (!product.name) {
      return;
    }

    byName.set(product.name.toLowerCase(), product);
  });

  return Array.from(byName.values());
}

function dedupeRecipes(recipes: Array<RecipeSuggestion | null>) {
  const byId = new Map<string, RecipeSuggestion>();

  recipes.forEach((recipe) => {
    if (!recipe) {
      return;
    }

    byId.set(recipe.id, recipe);
  });

  return Array.from(byId.values());
}

function shortName(value: string) {
  return value
    .replace(/\b(nature|maison|basmati|demi-ecreme|de)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pluralizeFruit(value: string) {
  return value.endsWith('s') ? value : `${value}s`;
}

function matchesAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'recipe';
}

function normalizeExpiringDays(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 7;
  }

  return Math.max(1, Math.round(value));
}
