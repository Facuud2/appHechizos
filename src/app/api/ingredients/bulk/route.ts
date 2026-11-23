import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { ingredients, isNonCountableUnit, isPresenceUnit } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { normalizeText } from "@/lib/domain/normalize";
import { computeStockLevelFromQty } from "@/lib/domain/matching";

const bulkIngredientItemSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  groupTag: z.string().trim().max(60).default("General"),
  unitType: z
    .enum(["g", "ml", "unit", "tbsp", "branch", "pinch", "qualitative", "presence"])
    .default("unit"),
  stockQty: z.number().min(0).nullable().optional(),
  lowThreshold: z.number().min(0).nullable().optional(),
  stockLevel: z.enum(["plenty", "low", "out"]).default("plenty"),
  unitCostArs: z.number().min(0).nullable().optional(),
  unitCostUsd: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  duplicateAction: z
    .enum(["add_stock", "overwrite", "skip"])
    .default("add_stock"),
});

const bulkIngredientsSchema = z.object({
  items: z
    .array(bulkIngredientItemSchema)
    .min(1, "Debés enviar al menos un ingrediente")
    .max(200, "Máximo 200 ingredientes por tanda"),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = bulkIngredientsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const allExisting = await db.select().from(ingredients);
    const existingByNorm = new Map(
      allExisting.map((ing) => [ing.normalizedName, ing])
    );

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const processed = [];

    for (const item of parsed.data.items) {
      const normalized = normalizeText(item.name);
      if (!normalized) continue;

      const existing = existingByNorm.get(normalized);
      if (existing) {
        if (item.duplicateAction === "skip") {
          skippedCount++;
          processed.push(existing);
          continue;
        }

        const isNonCountable = isNonCountableUnit(item.unitType);
        let nextQty: number | null = existing.stockQty;

        if (!isNonCountable) {
          if (item.duplicateAction === "add_stock") {
            const base = existing.stockQty ?? 0;
            const add = item.stockQty ?? 0;
            nextQty = Math.round((base + add) * 100) / 100;
          } else {
            nextQty = item.stockQty ?? existing.stockQty;
          }
        } else {
          nextQty = null;
        }

        const nextCostArs =
          item.unitCostArs !== null && item.unitCostArs !== undefined
            ? item.unitCostArs
            : existing.unitCostArs;

        const rawLevel = isPresenceUnit(item.unitType)
          ? item.stockLevel === "out"
            ? "out"
            : "plenty"
          : item.stockLevel;

        const nextLevel = computeStockLevelFromQty(
          nextQty,
          existing.lowThreshold,
          rawLevel
        );

        const [updated] = await db
          .update(ingredients)
          .set({
            groupTag: item.groupTag || existing.groupTag,
            unitType: item.unitType,
            stockQty: nextQty,
            stockLevel: nextLevel,
            unitCostArs: nextCostArs,
            updatedAt: new Date(),
          })
          .where(eq(ingredients.id, existing.id))
          .returning();

        existingByNorm.set(normalized, updated);
        updatedCount++;
        processed.push(updated);
      } else {
        const id = `ing-${crypto.randomUUID().slice(0, 12)}`;
        const qty = isNonCountableUnit(item.unitType)
          ? null
          : (item.stockQty ?? null);
        const rawLevel = isPresenceUnit(item.unitType)
          ? item.stockLevel === "out"
            ? "out"
            : "plenty"
          : item.stockLevel;
        const level = computeStockLevelFromQty(
          qty,
          item.lowThreshold ?? null,
          rawLevel
        );

        const [created] = await db
          .insert(ingredients)
          .values({
            id,
            name: item.name,
            normalizedName: normalized,
            groupTag: item.groupTag,
            unitType: item.unitType,
            stockQty: qty,
            lowThreshold: item.lowThreshold ?? null,
            stockLevel: level,
            unitCostArs: item.unitCostArs ?? null,
            unitCostUsd: item.unitCostUsd ?? null,
            notes: item.notes ?? null,
          })
          .returning();

        existingByNorm.set(normalized, created);
        createdCount++;
        processed.push(created);
      }
    }

    return NextResponse.json(
      {
        createdCount,
        updatedCount,
        skippedCount,
        ingredients: processed,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/ingredients/bulk] error:", err);
    return NextResponse.json(
      { error: "No se pudo realizar la carga masiva de ingredientes." },
      { status: 500 }
    );
  }
}
