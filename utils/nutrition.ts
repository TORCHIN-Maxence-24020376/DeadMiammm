import { NutritionFacts } from '@/data/inventory';

type NutritionRow = {
  label: string;
  value: string;
};

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 1,
});

export function buildNutritionRows(nutrition?: NutritionFacts): NutritionRow[] {
  if (!nutrition) {
    return [];
  }

  const rows: NutritionRow[] = [];
  const energy = formatEnergyValue(nutrition.energyKj, nutrition.energyKcal);

  if (energy) {
    rows.push({ label: 'Énergie', value: energy });
  }

  addWeightRow(rows, 'Lipides', nutrition.fat);
  addWeightRow(rows, 'dont acides gras saturés', nutrition.saturatedFat);
  addWeightRow(rows, 'Glucides', nutrition.carbs);
  addWeightRow(rows, 'dont sucres', nutrition.sugars);
  addWeightRow(rows, 'Fibres', nutrition.fiber);
  addWeightRow(rows, 'Protéines', nutrition.proteins);
  addWeightRow(rows, 'Sel', nutrition.salt);
  addWeightRow(rows, 'Sodium', nutrition.sodium);

  return rows;
}

function addWeightRow(rows: NutritionRow[], label: string, value: number | undefined) {
  if (!isValidNumber(value)) {
    return;
  }

  rows.push({
    label,
    value: `${formatNumber(value)} g`,
  });
}

function formatEnergyValue(kj: number | undefined, kcal: number | undefined) {
  const kjValue = isValidNumber(kj) ? kj : undefined;
  const kcalValue = isValidNumber(kcal) ? kcal : undefined;

  if (kjValue === undefined && kcalValue === undefined) {
    return null;
  }

  if (kjValue !== undefined && kcalValue !== undefined) {
    return `${formatNumber(kjValue)} kJ / ${formatNumber(kcalValue)} kcal`;
  }

  if (kjValue !== undefined) {
    return `${formatNumber(kjValue)} kJ`;
  }

  if (kcalValue !== undefined) {
    return `${formatNumber(kcalValue)} kcal`;
  }

  return null;
}

function formatNumber(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return NUMBER_FORMATTER.format(rounded);
}

function isValidNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
