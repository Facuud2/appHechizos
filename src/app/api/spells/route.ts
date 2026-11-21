import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import {
  spells,
  spellPriceTiers,
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
]);

const createSpellSchema = z.object({
  categoryId: z.string().nullable().optional(),
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  subtitleTag: z.string().trim().max(200).nullable().optional(),
  purpose: z.string().trim().max(500).nullable().optional(),
  energyTypes: z.array(z.string().trim().min(1)).default([]),
  publicDescription: z.string().trim().max(2000).nullable().optional(),
  privateNotes: z.string().trim().max(5000).nullable().optional(),
  isPublished: z.boolean().default(false),
  isOffer: z.boolean().default(false),
  offerLabel: z.string().trim().max(40).nullable().optional(),
  priceTiers: z
    .array(
      z.object({
        label: z.string().trim().max(60).default(""),
        priceArs: z.number().min(0),
        priceUsd: z.number().min(0),
      })
    )
    .default([]),
  baseIngredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().nullable().optional(),
        unit: unitEnum.default("unit"),
        isOptional: z.boolean().default(false),
        substitutionNote: z.string().trim().max(300).nullable().optional(),
      })
    )
    .default([]),
  baseSteps: z
    .array(
      z.object({
        title: z.string().trim().max(160).nullable().optional(),
        instruction: z.string().trim().min(1),
        durationMinutes: z.number().int().min(0).nullable().optional(),
      })
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = createSpellSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getDb();
    const spellId = `spell-${crypto.randomUUID().slice(0, 12)}`;
    const baseVarId = `var-${crypto.randomUUID().slice(0, 12)}`;

    await db.insert(spells).values({
      id: spellId,
      categoryId: data.categoryId ?? null,
      title: data.title,
      subtitleTag: data.subtitleTag ?? null,
      purpose: data.purpose ?? null,
      energyTypes: data.energyTypes,
      publicDescription: data.publicDescription ?? null,
      privateNotes: data.privateNotes ?? null,
      isPublished: data.isPublished,
      isOffer: data.isOffer,
      offerLabel: data.isOffer ? data.offerLabel || "¡OFERTA!" : null,
      sortOrder: 99,
    });

    if (data.priceTiers.length > 0) {
      await db.insert(spellPriceTiers).values(
        data.priceTiers.map((t, idx) => ({
          id: `tier-${crypto.randomUUID().slice(0, 10)}`,
          spellId,
          label: t.label,
          priceArs: t.priceArs,
          priceUsd: t.priceUsd,
          sortOrder: idx + 1,
        }))
      );
    }

    await db.insert(spellVariations).values({
      id: baseVarId,
      spellId,
      name: "Base",
      isBase: true,
      clientContext: "Receta base",
      sortOrder: 0,
    });

    if (data.baseIngredients.length > 0) {
      await db.insert(variationIngredients).values(
        data.baseIngredients.map((bi, idx) => ({
          id: `vi-${crypto.randomUUID().slice(0, 10)}`,
          variationId: baseVarId,
          ingredientId: bi.ingredientId,
          quantity: bi.quantity ?? null,
          unit: bi.unit,
          isOptional: bi.isOptional,
          substitutionNote: bi.substitutionNote ?? null,
          sortOrder: idx + 1,
        }))
      );
    }

    if (data.baseSteps.length > 0) {
      await db.insert(variationSteps).values(
        data.baseSteps.map((st, idx) => ({
          id: `vs-${crypto.randomUUID().slice(0, 10)}`,
          variationId: baseVarId,
          stepNumber: idx + 1,
          title: st.title ?? null,
          instruction: st.instruction,
          durationMinutes: st.durationMinutes ?? null,
        }))
      );
    }

    return NextResponse.json(
      { id: spellId, baseVariationId: baseVarId },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/spells] error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el hechizo." },
      { status: 500 }
    );
  }
}
