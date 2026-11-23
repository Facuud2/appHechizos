import { describe, expect, it } from "vitest";
import {
  evaluateVariationAvailability,
  type StockIngredientSnapshot,
} from "@/lib/domain/matching";
import { calculateVariationCost } from "@/lib/domain/costing";
import { computeStockDeductions } from "@/lib/domain/stock-deduction";
import { normalizeText } from "@/lib/domain/normalize";
import {
  parseBulkIngredientsText,
  parseBulkSpellsText,
} from "@/lib/domain/bulk-parser";
import type { CategoryItem, IngredientItem } from "@/types/app";

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
    [
      "ing-cuarzo",
      {
        id: "ing-cuarzo",
        name: "Cuarzo rosa",
        normalizedName: "cuarzo rosa",
        unitType: "presence",
        stockQty: null,
        lowThreshold: null,
        stockLevel: "plenty",
      },
    ],
    [
      "ing-tarot",
      {
        id: "ing-tarot",
        name: "Mazo de Tarot",
        normalizedName: "mazo de tarot",
        unitType: "presence",
        stockQty: null,
        lowThreshold: null,
        stockLevel: "out",
      },
    ],
  ]);

  it("evaluates presence-based reusable items (crystals, decks) strictly by existence without numeric qty", () => {
    const res = evaluateVariationAvailability(
      [
        {
          ingredientId: "ing-cuarzo",
          ingredientName: "Cuarzo rosa",
          quantity: 1,
          unit: "unit",
          isOptional: false,
        },
        {
          ingredientId: "ing-tarot",
          ingredientName: "Mazo de Tarot",
          quantity: null,
          unit: "presence",
          isOptional: false,
        },
      ],
      inventory
    );

    expect(res.checks[0].status).toBe("available");
    expect(res.checks[1].status).toBe("missing");
    expect(res.tier).toBe("almost");
    expect(res.missingRequired.map((m) => m.ingredientId)).toEqual(["ing-tarot"]);
  });

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
        {
          ingredientName: "Cuarzo rosa",
          quantity: null,
          unit: "presence",
          ingredientUnitType: "presence",
          unitCostArs: null,
          unitCostUsd: null,
        },
      ],
      35000
    );

    expect(summary.totalCostArs).toBe(2250);
    expect(summary.marginArs).toBe(32750);
    expect(summary.marginPercent).toBe(93.6);
    // Reusable presence items (Cuarzo rosa) should not be flagged as missing consumable cost
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
      {
        ingredientId: "ing-cuarzo",
        currentQty: null,
        lowThreshold: null,
        currentLevel: "plenty",
        ingredientUnitType: "presence",
        requiredQty: 1,
        requiredUnit: "presence",
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
    expect(updates[3]).toEqual({
      ingredientId: "ing-cuarzo",
      nextQty: null,
      nextLevel: "plenty",
      deducted: false,
    });
  });
});

describe("Text normalization", () => {
  it("normalizes accents and whitespace for deduplication", () => {
    expect(normalizeText("  Pétalos   de Rosa ")).toBe("petalos de rosa");
  });
});

describe("Smart Bulk Parser (Ingredients & Spells)", () => {
  const existingIngredients: IngredientItem[] = [
    {
      id: "ing-romero",
      name: "Romero",
      normalizedName: "romero",
      groupTag: "Hierbas",
      unitType: "g",
      stockQty: 50,
      lowThreshold: 10,
      stockLevel: "plenty",
      unitCostArs: 400,
      unitCostUsd: null,
      imageKey: null,
      imageUrl: null,
      notes: null,
      updatedAt: "2026-01-01",
    },
  ];

  const categories: CategoryItem[] = [
    {
      id: "cat-amor",
      name: "Hechizos de Amor",
      slug: "hechizos-de-amor",
      publicIntro: null,
      sortOrder: 1,
    },
    {
      id: "cat-prosperidad",
      name: "Prosperidad y Dinero",
      slug: "prosperidad-y-dinero",
      publicIntro: null,
      sortOrder: 2,
    },
  ];

  it("parses free-text bulk ingredients, detects existing stock, and infers units/groups", () => {
    const raw = `Romero 30g $500, Vela roja 10u $850\nCuarzo rosa\nMazo de Tarot Rider\nAgua Florida 100ml`;
    const drafts = parseBulkIngredientsText(raw, existingIngredients);

    expect(drafts).toHaveLength(5);

    // 1. Existing Romero detected
    expect(drafts[0].name).toBe("Romero");
    expect(drafts[0].existingIngredientId).toBe("ing-romero");
    expect(drafts[0].existingStockQty).toBe(50);
    expect(drafts[0].stockQty).toBe(30);
    expect(drafts[0].unitType).toBe("g");
    expect(drafts[0].unitCostArs).toBe(500);

    // 2. New Vela roja inferred as Velas + unit
    expect(drafts[1].name).toBe("Vela roja");
    expect(drafts[1].existingIngredientId).toBeNull();
    expect(drafts[1].groupTag).toBe("Velas");
    expect(drafts[1].unitType).toBe("unit");
    expect(drafts[1].stockQty).toBe(10);
    expect(drafts[1].unitCostArs).toBe(850);

    // 3. New Cuarzo rosa inferred as Cristales + presence (non-countable)
    expect(drafts[2].groupTag).toBe("Cristales");
    expect(drafts[2].unitType).toBe("presence");
    expect(drafts[2].stockQty).toBeNull();

    // 4. New Mazo de Tarot inferred as Cartas + presence (non-countable)
    expect(drafts[3].groupTag).toBe("Cartas");
    expect(drafts[3].unitType).toBe("presence");
    expect(drafts[3].stockQty).toBeNull();

    // 5. New Agua Florida inferred as Aceites + ml
    expect(drafts[4].groupTag).toBe("Aceites");
    expect(drafts[4].unitType).toBe("ml");
    expect(drafts[4].stockQty).toBe(100);
  });

  it("parses bulk spells with category, dual price, energies, and base recipe ingredients", () => {
    const raw = `Endulzamiento Real | Amor | $35000 / USD 38 | Energías: Amor, Atracción | Ingredientes: Vela rosa 1u, Romero 15g, Miel pura 30ml`;
    const spells = parseBulkSpellsText(raw, categories, existingIngredients);

    expect(spells).toHaveLength(1);
    const sp = spells[0];
    expect(sp.title).toBe("Endulzamiento Real");
    expect(sp.categoryId).toBe("cat-amor");
    expect(sp.priceArs).toBe(35000);
    expect(sp.priceUsd).toBe(38);
    expect(sp.energyTypes).toEqual(["Amor", "Atracción"]);
    expect(sp.ingredients).toHaveLength(3);

    // Romero matches existingIngredientId, while Vela rosa and Miel pura are marked as new
    expect(sp.ingredients[0].name).toBe("Vela rosa");
    expect(sp.ingredients[0].existingIngredientId).toBeNull();
    expect(sp.ingredients[1].name).toBe("Romero");
    expect(sp.ingredients[1].existingIngredientId).toBe("ing-romero");
    expect(sp.ingredients[1].quantity).toBe(15);
    expect(sp.ingredients[1].unit).toBe("g");
  });
});
