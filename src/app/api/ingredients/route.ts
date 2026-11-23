import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { ingredients, isNonCountableUnit, isPresenceUnit } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { normalizeText } from "@/lib/domain/normalize";
import { computeStockLevelFromQty } from "@/lib/domain/matching";

const createIngredientSchema = z.object({
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
});

export async function GET() {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const db = getDb();
  const rows = await db.select().from(ingredients).orderBy(asc(ingredients.name));
  return NextResponse.json({ ingredients: rows });
}

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = createIngredientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalized = normalizeText(data.name);
    const db = getDb();

    const [existing] = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.normalizedName, normalized));

    if (existing) {
      return NextResponse.json(
        { ingredient: existing, alreadyExisted: true },
        { status: 200 }
      );
    }

    const id = `ing-${crypto.randomUUID().slice(0, 12)}`;
    const qty = isNonCountableUnit(data.unitType) ? null : (data.stockQty ?? null);
    const rawLevel = isPresenceUnit(data.unitType)
      ? data.stockLevel === "out"
        ? "out"
        : "plenty"
      : data.stockLevel;
    const level = computeStockLevelFromQty(
      qty,
      data.lowThreshold ?? null,
      rawLevel
    );

    const [created] = await db
      .insert(ingredients)
      .values({
        id,
        name: data.name,
        normalizedName: normalized,
        groupTag: data.groupTag,
        unitType: data.unitType,
        stockQty: qty,
        lowThreshold: data.lowThreshold ?? null,
        stockLevel: level,
        unitCostArs: data.unitCostArs ?? null,
        unitCostUsd: data.unitCostUsd ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    return NextResponse.json(
      { ingredient: created, alreadyExisted: false },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/ingredients] error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el ingrediente." },
      { status: 500 }
    );
  }
}
