import type { StockLevel, UnitType } from "@/db/schema";

export interface StockIngredientSnapshot {
  id: string;
  name: string;
  normalizedName: string;
  unitType: UnitType;
  stockQty: number | null;
  lowThreshold: number | null;
  stockLevel: StockLevel;
}

export interface RecipeIngredientItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number | null;
  unit: UnitType;
  isOptional: boolean;
  substitutionNote?: string | null;
}

export type IngredientAvailabilityStatus = "available" | "low" | "missing";

export interface IngredientCheckResult {
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  status: IngredientAvailabilityStatus;
  requiredQty: number | null;
  requiredUnit: UnitType;
  availableQty: number | null;
  substitutionNote?: string | null;
}

export type MatchTier = "ready" | "almost" | "missing";

export interface SpellMatchResult {
  tier: MatchTier;
  matchPercent: number;
  requiredCount: number;
  availableRequiredCount: number;
  missingRequired: IngredientCheckResult[];
  lowRequired: IngredientCheckResult[];
  checks: IngredientCheckResult[];
}

export function computeStockLevelFromQty(
  qty: number | null,
  lowThreshold: number | null,
  fallbackLevel: StockLevel
): StockLevel {
  if (qty === null || Number.isNaN(qty)) return fallbackLevel;
  if (qty <= 0) return "out";
  const threshold = lowThreshold ?? 1;
  if (qty <= threshold) return "low";
  return "plenty";
}

/**
 * Evaluates whether a variation can be performed given either:
 * - Real Stock (inventoryMap), or
 * - "Fuera del altar" mode (overrideAvailableIds: Set of ingredient IDs on hand right now).
 */
export function evaluateVariationAvailability(
  recipe: RecipeIngredientItem[],
  inventoryMap: Map<string, StockIngredientSnapshot>,
  overrideAvailableIds?: Set<string> | null
): SpellMatchResult {
  const checks: IngredientCheckResult[] = recipe.map((item) => {
    const stock = inventoryMap.get(item.ingredientId);

    if (overrideAvailableIds) {
      const hasIt = overrideAvailableIds.has(item.ingredientId);
      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        isOptional: item.isOptional,
        status: hasIt ? "available" : "missing",
        requiredQty: item.quantity,
        requiredUnit: item.unit,
        availableQty: hasIt ? (stock?.stockQty ?? null) : 0,
        substitutionNote: item.substitutionNote,
      };
    }

    if (!stock || stock.stockLevel === "out") {
      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        isOptional: item.isOptional,
        status: "missing",
        requiredQty: item.quantity,
        requiredUnit: item.unit,
        availableQty: stock?.stockQty ?? 0,
        substitutionNote: item.substitutionNote,
      };
    }

    // If both recipe and stock have numeric quantities in the same unit, check sufficiency
    if (
      item.quantity !== null &&
      stock.stockQty !== null &&
      item.unit === stock.unitType
    ) {
      if (stock.stockQty < item.quantity) {
        return {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          isOptional: item.isOptional,
          status: "missing",
          requiredQty: item.quantity,
          requiredUnit: item.unit,
          availableQty: stock.stockQty,
          substitutionNote: item.substitutionNote,
        };
      }
    }

    const status: IngredientAvailabilityStatus =
      stock.stockLevel === "low" ? "low" : "available";

    return {
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      isOptional: item.isOptional,
      status,
      requiredQty: item.quantity,
      requiredUnit: item.unit,
      availableQty: stock.stockQty,
      substitutionNote: item.substitutionNote,
    };
  });

  const requiredChecks = checks.filter((c) => !c.isOptional);
  const missingRequired = requiredChecks.filter((c) => c.status === "missing");
  const lowRequired = requiredChecks.filter((c) => c.status === "low");
  const requiredCount = requiredChecks.length;
  const availableRequiredCount = requiredCount - missingRequired.length;

  const matchPercent =
    requiredCount === 0
      ? 100
      : Math.round((availableRequiredCount / requiredCount) * 100);

  let tier: MatchTier = "ready";
  if (missingRequired.length === 0) {
    tier = "ready";
  } else if (missingRequired.length <= 2) {
    tier = "almost";
  } else {
    tier = "missing";
  }

  return {
    tier,
    matchPercent,
    requiredCount,
    availableRequiredCount,
    missingRequired,
    lowRequired,
    checks,
  };
}
