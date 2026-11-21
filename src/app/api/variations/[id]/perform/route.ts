import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import {
  ingredients,
  ritualLogs,
  spellPriceTiers,
  spellVariations,
  variationIngredients,
} from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { calculateVariationCost } from "@/lib/domain/costing";
import { computeStockDeductions } from "@/lib/domain/stock-deduction";

const performSchema = z.object({
  deductStock: z.boolean().default(true),
  clientAlias: z.string().trim().max(120).nullable().optional(),
  chargedArs: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const { id: variationId } = await context.params;

  try {
    const body = await req.json();
    const parsed = performSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const [variation] = await db
      .select()
      .from(spellVariations)
      .where(eq(spellVariations.id, variationId));

    if (!variation) {
      return NextResponse.json(
        { error: "Variación no encontrada." },
        { status: 404 }
      );
    }

    const viRows = await db
      .select()
      .from(variationIngredients)
      .where(eq(variationIngredients.variationId, variationId));

    const ingIds = viRows.map((v) => v.ingredientId);
    const ingRows =
      ingIds.length > 0
        ? await db
            .select()
            .from(ingredients)
            .where(inArray(ingredients.id, ingIds))
        : [];
    const ingMap = new Map(ingRows.map((i) => [i.id, i]));

    const tiers = await db
      .select()
      .from(spellPriceTiers)
      .where(eq(spellPriceTiers.spellId, variation.spellId));

    const defaultSalePrice =
      variation.priceOverrideArs ?? tiers[0]?.priceArs ?? null;

    const costSummary = calculateVariationCost(
      viRows.map((vi) => {
        const ing = ingMap.get(vi.ingredientId);
        return {
          ingredientName: ing?.name ?? "Desconocido",
          quantity: vi.quantity,
          unit: vi.unit,
          ingredientUnitType: ing?.unitType ?? vi.unit,
          unitCostArs: ing?.unitCostArs ?? null,
          unitCostUsd: ing?.unitCostUsd ?? null,
        };
      }),
      parsed.data.chargedArs ?? defaultSalePrice
    );

    let deductedCount = 0;
    if (parsed.data.deductStock && viRows.length > 0) {
      const updates = computeStockDeductions(
        viRows
          .map((vi) => {
            const ing = ingMap.get(vi.ingredientId);
            if (!ing) return null;
            return {
              ingredientId: ing.id,
              currentQty: ing.stockQty,
              lowThreshold: ing.lowThreshold,
              currentLevel: ing.stockLevel,
              ingredientUnitType: ing.unitType,
              requiredQty: vi.quantity,
              requiredUnit: vi.unit,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      );

      for (const u of updates) {
        if (!u.deducted) continue;
        deductedCount++;
        await db
          .update(ingredients)
          .set({
            stockQty: u.nextQty,
            stockLevel: u.nextLevel,
            updatedAt: new Date(),
          })
          .where(eq(ingredients.id, u.ingredientId));
      }
    }

    const logId = `log-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(ritualLogs).values({
      id: logId,
      spellId: variation.spellId,
      variationId: variation.id,
      clientAlias: parsed.data.clientAlias ?? null,
      stockDeducted: parsed.data.deductStock && deductedCount > 0,
      estimatedCostArs: costSummary.totalCostArs,
      chargedArs: parsed.data.chargedArs ?? defaultSalePrice,
      notes: parsed.data.notes ?? null,
    });

    return NextResponse.json(
      {
        id: logId,
        deductedCount,
        estimatedCostArs: costSummary.totalCostArs,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/variations/:id/perform] error:", err);
    return NextResponse.json(
      { error: "No se pudo registrar el ritual." },
      { status: 500 }
    );
  }
}
