import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import {
  spellVariations,
  variationIngredients,
  variationSteps,
} from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";

const createVariationSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la variación es obligatorio").max(120),
  clientContext: z.string().trim().max(400).nullable().optional(),
  priceOverrideArs: z.number().min(0).nullable().optional(),
  priceOverrideUsd: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
  cloneFromVariationId: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const { id: spellId } = await context.params;

  try {
    const body = await req.json();
    const parsed = createVariationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getDb();
    const existingVars = await db
      .select()
      .from(spellVariations)
      .where(eq(spellVariations.spellId, spellId));

    const newVarId = `var-${crypto.randomUUID().slice(0, 12)}`;
    const nextSortOrder = existingVars.length;

    await db.insert(spellVariations).values({
      id: newVarId,
      spellId,
      name: data.name,
      isBase: false,
      clientContext: data.clientContext ?? null,
      priceOverrideArs: data.priceOverrideArs ?? null,
      priceOverrideUsd: data.priceOverrideUsd ?? null,
      notes: data.notes ?? null,
      sortOrder: nextSortOrder,
    });

    const sourceVarId =
      data.cloneFromVariationId ||
      existingVars.find((v) => v.isBase)?.id ||
      existingVars[0]?.id;

    if (sourceVarId) {
      const [srcIngredients, srcSteps] = await Promise.all([
        db
          .select()
          .from(variationIngredients)
          .where(eq(variationIngredients.variationId, sourceVarId)),
        db
          .select()
          .from(variationSteps)
          .where(eq(variationSteps.variationId, sourceVarId)),
      ]);

      if (srcIngredients.length > 0) {
        await db.insert(variationIngredients).values(
          srcIngredients.map((ing) => ({
            id: `vi-${crypto.randomUUID().slice(0, 10)}`,
            variationId: newVarId,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
            isOptional: ing.isOptional,
            substitutionNote: ing.substitutionNote,
            sortOrder: ing.sortOrder,
          }))
        );
      }

      if (srcSteps.length > 0) {
        await db.insert(variationSteps).values(
          srcSteps.map((st) => ({
            id: `vs-${crypto.randomUUID().slice(0, 10)}`,
            variationId: newVarId,
            stepNumber: st.stepNumber,
            title: st.title,
            instruction: st.instruction,
            durationMinutes: st.durationMinutes,
          }))
        );
      }
    }

    return NextResponse.json({ id: newVarId, spellId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/spells/:id/variations] error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la variación." },
      { status: 500 }
    );
  }
}
