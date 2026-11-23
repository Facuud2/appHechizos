import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { ingredients, isNonCountableUnit, isPresenceUnit } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { normalizeText } from "@/lib/domain/normalize";
import { computeStockLevelFromQty } from "@/lib/domain/matching";

const updateIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  groupTag: z.string().trim().max(60).optional(),
  unitType: z
    .enum(["g", "ml", "unit", "tbsp", "branch", "pinch", "qualitative", "presence"])
    .optional(),
  stockQty: z.number().min(0).nullable().optional(),
  lowThreshold: z.number().min(0).nullable().optional(),
  stockLevel: z.enum(["plenty", "low", "out"]).optional(),
  unitCostArs: z.number().min(0).nullable().optional(),
  unitCostUsd: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = updateIngredientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Ingrediente no encontrado." },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const nextNormalizedName =
      data.name !== undefined ? normalizeText(data.name) : undefined;

    if (nextNormalizedName !== undefined) {
      const [conflict] = await db
        .select({ id: ingredients.id, name: ingredients.name })
        .from(ingredients)
        .where(
          and(
            eq(ingredients.normalizedName, nextNormalizedName),
            ne(ingredients.id, id)
          )
        );
      if (conflict) {
        return NextResponse.json(
          {
            error: `Ya existe otro ingrediente llamado "${conflict.name}" en tu alacena.`,
          },
          { status: 409 }
        );
      }
    }

    const nextUnitType = data.unitType ?? existing.unitType;
    const nextQty = isNonCountableUnit(nextUnitType)
      ? null
      : data.stockQty !== undefined
        ? data.stockQty
        : existing.stockQty;
    const nextLow = isNonCountableUnit(nextUnitType)
      ? null
      : data.lowThreshold !== undefined
        ? data.lowThreshold
        : existing.lowThreshold;

    const rawLevel =
      data.stockLevel !== undefined
        ? data.stockLevel
        : computeStockLevelFromQty(nextQty, nextLow, existing.stockLevel);

    const nextLevel = isPresenceUnit(nextUnitType)
      ? rawLevel === "out"
        ? "out"
        : "plenty"
      : rawLevel;

    const [updated] = await db
      .update(ingredients)
      .set({
        ...(data.name !== undefined && nextNormalizedName !== undefined
          ? { name: data.name, normalizedName: nextNormalizedName }
          : {}),
        ...(data.groupTag !== undefined ? { groupTag: data.groupTag } : {}),
        ...(data.unitType !== undefined ? { unitType: data.unitType } : {}),
        stockQty: nextQty,
        lowThreshold: nextLow,
        stockLevel: nextLevel,
        ...(data.unitCostArs !== undefined
          ? { unitCostArs: data.unitCostArs }
          : {}),
        ...(data.unitCostUsd !== undefined
          ? { unitCostUsd: data.unitCostUsd }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, id))
      .returning();

    return NextResponse.json({ ingredient: updated });
  } catch (err) {
    console.error("[PATCH /api/ingredients/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el ingrediente." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  try {
    const db = getDb();
    await db.delete(ingredients).where(eq(ingredients.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[DELETE /api/ingredients/:id] error:", err);
    return NextResponse.json(
      {
        error:
          "No se puede eliminar este ingrediente porque está siendo usado en uno o más hechizos.",
      },
      { status: 409 }
    );
  }
}
