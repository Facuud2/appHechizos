import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import {
  spellVariations,
  variationIngredients,
  variationSteps,
} from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";

const unitEnum = z.enum([
  "g",
  "ml",
  "unit",
  "tbsp",
  "branch",
  "pinch",
  "qualitative",
  "presence",
]);

const updateVariationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  clientContext: z.string().trim().max(400).nullable().optional(),
  priceOverrideArs: z.number().min(0).nullable().optional(),
  priceOverrideUsd: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().nullable().optional(),
        unit: unitEnum.default("unit"),
        isOptional: z.boolean().default(false),
        substitutionNote: z.string().trim().max(300).nullable().optional(),
      })
    )
    .optional(),
  steps: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().max(160).nullable().optional(),
        instruction: z.string().trim().min(1),
        durationMinutes: z.number().int().min(0).nullable().optional(),
      })
    )
    .optional(),
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
    const parsed = updateVariationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ingredients: nextIngredients, steps: nextSteps, ...fields } =
      parsed.data;
    const db = getDb();

    if (Object.keys(fields).length > 0) {
      await db
        .update(spellVariations)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(spellVariations.id, id));
    }

    if (nextIngredients !== undefined) {
      await db
        .delete(variationIngredients)
        .where(eq(variationIngredients.variationId, id));
      if (nextIngredients.length > 0) {
        await db.insert(variationIngredients).values(
          nextIngredients.map((ing, idx) => ({
            id: `vi-${crypto.randomUUID().slice(0, 10)}`,
            variationId: id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity ?? null,
            unit: ing.unit,
            isOptional: ing.isOptional,
            substitutionNote: ing.substitutionNote ?? null,
            sortOrder: idx + 1,
          }))
        );
      }
    }

    if (nextSteps !== undefined) {
      const existingSteps = await db
        .select({ id: variationSteps.id })
        .from(variationSteps)
        .where(eq(variationSteps.variationId, id));
      const existingIds = new Set(existingSteps.map((s) => s.id));
      const keepIds = new Set<string>();

      for (let i = 0; i < nextSteps.length; i++) {
        const st = nextSteps[i];
        if (st.id && existingIds.has(st.id)) {
          keepIds.add(st.id);
          await db
            .update(variationSteps)
            .set({
              stepNumber: i + 1,
              title: st.title ?? null,
              instruction: st.instruction,
              durationMinutes: st.durationMinutes ?? null,
            })
            .where(eq(variationSteps.id, st.id));
        } else {
          const newStepId = `vs-${crypto.randomUUID().slice(0, 10)}`;
          keepIds.add(newStepId);
          await db.insert(variationSteps).values({
            id: newStepId,
            variationId: id,
            stepNumber: i + 1,
            title: st.title ?? null,
            instruction: st.instruction,
            durationMinutes: st.durationMinutes ?? null,
          });
        }
      }

      const toDelete = [...existingIds].filter((eid) => !keepIds.has(eid));
      if (toDelete.length > 0) {
        await db
          .delete(variationSteps)
          .where(inArray(variationSteps.id, toDelete));
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[PATCH /api/variations/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar la variación." },
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
    const [existing] = await db
      .select()
      .from(spellVariations)
      .where(eq(spellVariations.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Variación no encontrada." }, { status: 404 });
    }
    if (existing.isBase) {
      return NextResponse.json(
        { error: "No se puede eliminar la versión Base del hechizo." },
        { status: 400 }
      );
    }

    await db.delete(spellVariations).where(eq(spellVariations.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[DELETE /api/variations/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar la variación." },
      { status: 500 }
    );
  }
}
