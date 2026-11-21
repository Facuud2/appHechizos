import { describe, expect, it } from "vitest";
import {
  evaluateVariationAvailability,
  type StockIngredientSnapshot,
} from "@/lib/domain/matching";
import { calculateVariationCost } from "@/lib/domain/costing";
import { computeStockDeductions } from "@/lib/domain/stock-deduction";
import { normalizeText } from "@/lib/domain/normalize";

describe("My Bar matching engine", () => {
  const inventory = new Map<string, StockIngredientSnapshot>([
    [
      "ing-romero",
      {
        id: "ing-romero",
        name: "Romero",
        normalizedName: "romero",
        unitType: "g",
        stockQty: 50,
        lowThreshold: 10,
        stockLevel: "plenty",
      },
    ],
    [
      "ing-miel",
      {
        id: "ing-miel",
        name: "Miel",
        normalizedName: "miel",
        unitType: "ml",
        stockQty: 20,
        lowThreshold: 50,
        stockLevel: "low",
      },
    ],
    [
      "ing-vela",
      {
        id: "ing-vela",
        name: "Vela rosa",
        normalizedName: "vela rosa",
        unitType: "unit",
        stockQty: 0,
        lowThreshold: 2,
        stockLevel: "out",
      },
    ],
  ]);

  it("marks variation as ready when all required ingredients are available", () => {
    const res = evaluateVariationAvailability(
      [
        {
          ingredientId: "ing-romero",
          ingredientName: "Romero",
          quantity: 10,
          unit: "g",
          isOptional: false,
        },
        {
          ingredientId: "ing-vela",
          ingredientName: "Vela rosa",
          quantity: 1,
          unit: "unit",
          isOptional: true, // optional missing should not block readiness
        },
      ],
      inventory
    );

    expect(res.tier).toBe("ready");
    expect(res.matchPercent).toBe(100);
    expect(res.missingRequired).toHaveLength(0);
  });

  it("marks variation as almost when 1-2 required ingredients are missing or insufficient", () => {
    const res = evaluateVariationAvailability(
      [
        {
          ingredientId: "ing-romero",
          ingredientName: "Romero",
          quantity: 10,
          unit: "g",
          isOptional: false,
        },
        {
          ingredientId: "ing-miel",
          ingredientName: "Miel",
          quantity: 30, // only 20 ml in stock
          unit: "ml",
          isOptional: false,
        },
        {
          ingredientId: "ing-vela",
          ingredientName: "Vela rosa",
          quantity: 1,
          unit: "unit",
          isOptional: false,
        },
      ],
      inventory
    );

    expect(res.tier).toBe("almost");
    expect(res.missingRequired.map((m) => m.ingredientId)).toEqual([
      "ing-miel",
      "ing-vela",
    ]);
  });

  it("supports Fuera del altar override without mutating real stock", () => {
    const onHand = new Set(["ing-romero", "ing-vela"]);
    const res = evaluateVariationAvailability(
      [
        {
          ingredientId: "ing-romero",
          ingredientName: "Romero",
          quantity: 10,
          unit: "g",
          isOptional: false,
        },
        {
          ingredientId: "ing-vela",
          ingredientName: "Vela rosa",
          quantity: 1,
          unit: "unit",
          isOptional: false,
        },
      ],
      inventory,
      onHand
    );

    expect(res.tier).toBe("ready");
    expect(inventory.get("ing-vela")?.stockLevel).toBe("out");
  });
});

describe("Costing & Margin engine", () => {
  it("calculates total cost and net/percentage margin accurately", () => {
    const summary = calculateVariationCost(
      [
        {
          ingredientName: "Vela rosa",
          quantity: 2,
          unit: "unit",
          ingredientUnitType: "unit",
          unitCostArs: 900,
          unitCostUsd: 1,
        },
        {
          ingredientName: "Miel",
          quantity: 30,
          unit: "ml",
          ingredientUnitType: "ml",
          unitCostArs: 15,
          unitCostUsd: null,
        },
        {
          ingredientName: "Agua lunar",
          quantity: 1,
          unit: "qualitative",
          ingredientUnitType: "qualitative",
          unitCostArs: null,
          unitCostUsd: null,
        },
      ],
      35000
    );

    expect(summary.totalCostArs).toBe(2250);
    expect(summary.marginArs).toBe(32750);
    expect(summary.marginPercent).toBe(93.6);
    expect(summary.missingCostIngredients).toEqual(["Agua lunar"]);
  });
});

describe("Stock deduction engine", () => {
  it("deducts matching units, clamps at 0, and updates stockLevel", () => {
    const updates = computeStockDeductions([
      {
        ingredientId: "ing-vela",
        currentQty: 2,
        lowThreshold: 2,
        currentLevel: "low",
        ingredientUnitType: "unit",
        requiredQty: 3,
        requiredUnit: "unit",
      },
      {
        ingredientId: "ing-romero",
        currentQty: 20,
        lowThreshold: 15,
        currentLevel: "plenty",
        ingredientUnitType: "g",
        requiredQty: 10,
        requiredUnit: "g",
      },
      {
        ingredientId: "ing-mismatch",
        currentQty: 5,
        lowThreshold: 1,
        currentLevel: "plenty",
        ingredientUnitType: "branch",
        requiredQty: 10,
        requiredUnit: "g",
      },
    ]);

    expect(updates[0]).toEqual({
      ingredientId: "ing-vela",
      nextQty: 0,
      nextLevel: "out",
      deducted: true,
    });
    expect(updates[1]).toEqual({
      ingredientId: "ing-romero",
      nextQty: 10,
      nextLevel: "low",
      deducted: true,
    });
    expect(updates[2].deducted).toBe(false);
  });
});

describe("Text normalization", () => {
  it("normalizes accents and whitespace for deduplication", () => {
    expect(normalizeText("  Pétalos   de Rosa ")).toBe("petalos de rosa");
  });
});
