import { isPresenceUnit, type UnitType } from "@/db/schema";

export interface CostableRecipeItem {
  ingredientName: string;
  quantity: number | null;
  unit: UnitType;
  ingredientUnitType: UnitType;
  unitCostArs: number | null;
  unitCostUsd: number | null;
}

export interface CostSummary {
  totalCostArs: number;
  totalCostUsd: number;
  missingCostIngredients: string[];
  salePriceArs: number | null;
  marginArs: number | null;
  marginPercent: number | null;
}

export function calculateVariationCost(
  items: CostableRecipeItem[],
  salePriceArs: number | null
): CostSummary {
  let totalCostArs = 0;
  let totalCostUsd = 0;
  const missingCostIngredients: string[] = [];

  for (const item of items) {
    const isPresence =
      isPresenceUnit(item.ingredientUnitType) || isPresenceUnit(item.unit);

    if (item.unitCostArs === null && item.unitCostUsd === null) {
      // Reusable presence items (crystals, stones, tarot/spanish decks, tools) are not consumed per ritual,
      // so they should not trigger a missing consumable cost warning.
      if (!isPresence) {
        missingCostIngredients.push(item.ingredientName);
      }
      continue;
    }

    const qty = isPresence ? 1 : (item.quantity ?? 1);
    if (item.unitCostArs !== null) {
      totalCostArs += qty * item.unitCostArs;
    }
    if (item.unitCostUsd !== null) {
      totalCostUsd += qty * item.unitCostUsd;
    }
  }

  totalCostArs = Math.round(totalCostArs * 100) / 100;
  totalCostUsd = Math.round(totalCostUsd * 100) / 100;

  let marginArs: number | null = null;
  let marginPercent: number | null = null;

  if (salePriceArs !== null && salePriceArs > 0) {
    marginArs = Math.round((salePriceArs - totalCostArs) * 100) / 100;
    marginPercent = Math.round(((salePriceArs - totalCostArs) / salePriceArs) * 1000) / 10;
  }

  return {
    totalCostArs,
    totalCostUsd,
    missingCostIngredients,
    salePriceArs,
    marginArs,
    marginPercent,
  };
}
