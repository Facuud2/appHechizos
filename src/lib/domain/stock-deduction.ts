import { isNonCountableUnit, type StockLevel, type UnitType } from "@/db/schema";
import { computeStockLevelFromQty } from "./matching";

export interface StockDeductionTarget {
  ingredientId: string;
  currentQty: number | null;
  lowThreshold: number | null;
  currentLevel: StockLevel;
  ingredientUnitType: UnitType;
  requiredQty: number | null;
  requiredUnit: UnitType;
}

export interface StockDeductionResult {
  ingredientId: string;
  nextQty: number | null;
  nextLevel: StockLevel;
  deducted: boolean;
}

export function computeStockDeductions(
  targets: StockDeductionTarget[]
): StockDeductionResult[] {
  return targets.map((t) => {
    if (
      isNonCountableUnit(t.ingredientUnitType) ||
      isNonCountableUnit(t.requiredUnit) ||
      t.currentQty === null ||
      t.requiredQty === null ||
      t.requiredQty <= 0 ||
      t.ingredientUnitType !== t.requiredUnit
    ) {
      return {
        ingredientId: t.ingredientId,
        nextQty: t.currentQty,
        nextLevel: t.currentLevel,
        deducted: false,
      };
    }

    const rawNext = Math.max(0, t.currentQty - t.requiredQty);
    const nextQty = Math.round(rawNext * 100) / 100;
    const nextLevel = computeStockLevelFromQty(
      nextQty,
      t.lowThreshold,
      t.currentLevel
    );

    return {
      ingredientId: t.ingredientId,
      nextQty,
      nextLevel,
      deducted: true,
    };
  });
}
