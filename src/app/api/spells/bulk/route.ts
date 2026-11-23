import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import {
  categories,
  ingredients,
  spells,
  spellPriceTiers,
  spellVariations,
  variationIngredients,
} from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { normalizeText, slugify } from "@/lib/domain/normalize";
import { inferGroupAndUnit } from "@/lib/domain/bulk-parser";

const unitEnum = z.enum([
  "g",
  "ml",
  "unit",
  "tbsp",
  "branch",
  "pinch",
  "qualitative",
]);

const bulkSpellRecipeIngSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().min(0).nullable().optional(),
  unit: unitEnum.default("unit"),
  groupTag: z.string().trim().max(60).optional(),
  isOptional: z.boolean().default(false),
});

const bulkSpellItemSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  categoryId: z.string().nullable().optional(),
  categoryName: z.string().trim().max(120).optional(),
  subtitleTag: z.string().trim().max(200).nullable().optional(),
  purpose: z.string().trim().max(500).nullable().optional(),
  energyTypes: z.array(z.string().trim().min(1)).default([]),
  publicDescription: z.string().trim().max(2000).nullable().optional(),
  privateNotes: z.string().trim().max(5000).nullable().optional(),
  isPublished: z.boolean().default(true),
  isOffer: z.boolean().default(false),
  offerLabel: z.string().trim().max(40).nullable().optional(),
  priceArs: z.number().min(0).default(30000),
  priceUsd: z.number().min(0).default(34),
  ingredients: z.array(bulkSpellRecipeIngSchema).default([]),
});

const bulkSpellsSchema = z.object({
  items: z
    .array(bulkSpellItemSchema)
    .min(1, "Debés enviar al menos un hechizo")
    .max(100, "Máximo 100 hechizos por tanda"),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = bulkSpellsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const existingCategories = await db.select().from(categories);
    const existingIngredients = await db.select().from(ingredients);

    const catByNorm = new Map(
      existingCategories.map((c) => [normalizeText(c.name), c])
    );
    const catById = new Map(existingCategories.map((c) => [c.id, c]));
    const ingByNorm = new Map(
      existingIngredients.map((ing) => [ing.normalizedName, ing])
    );

    let createdSpellsCount = 0;
    let autoCreatedIngredientsCount = 0;
    let autoCreatedCategoriesCount = 0;
    const createdSpellIds: string[] = [];

    for (const item of parsed.data.items) {
      // 1. Resolve or auto-create category
      let resolvedCategoryId: string | null = item.categoryId ?? null;
      if (resolvedCategoryId && !catById.has(resolvedCategoryId)) {
        resolvedCategoryId = null;
      }

      if (!resolvedCategoryId && item.categoryName?.trim()) {
        const catNorm = normalizeText(item.categoryName);
        const foundCat = catByNorm.get(catNorm);
        if (foundCat) {
          resolvedCategoryId = foundCat.id;
        } else {
          const newCatId = `cat-${crypto.randomUUID().slice(0, 10)}`;
          const newSlug = `${slugify(item.categoryName)}-${crypto
            .randomUUID()
            .slice(0, 4)}`;
          const [createdCat] = await db
            .insert(categories)
            .values({
              id: newCatId,
              name: item.categoryName.trim(),
              slug: newSlug,
              publicIntro: null,
              sortOrder: existingCategories.length + autoCreatedCategoriesCount + 1,
            })
            .returning();
          catByNorm.set(catNorm, createdCat);
          catById.set(createdCat.id, createdCat);
          resolvedCategoryId = createdCat.id;
          autoCreatedCategoriesCount++;
        }
      }

      const spellId = `spell-${crypto.randomUUID().slice(0, 12)}`;
      const baseVarId = `var-${crypto.randomUUID().slice(0, 12)}`;

      await db.insert(spells).values({
        id: spellId,
        categoryId: resolvedCategoryId,
        title: item.title,
        subtitleTag: item.subtitleTag ?? (item.purpose || null),
        purpose: item.purpose || null,
        energyTypes: item.energyTypes,
        publicDescription: item.publicDescription ?? (item.purpose || null),
        privateNotes: item.privateNotes ?? null,
        isPublished: item.isPublished,
        isOffer: item.isOffer,
        offerLabel: item.isOffer ? item.offerLabel || "¡OFERTA!" : null,
        sortOrder: 99,
      });

      await db.insert(spellPriceTiers).values({
        id: `tier-${crypto.randomUUID().slice(0, 10)}`,
        spellId,
        label: "",
        priceArs: item.priceArs,
        priceUsd: item.priceUsd,
        sortOrder: 1,
      });

      await db.insert(spellVariations).values({
        id: baseVarId,
        spellId,
        name: "Base",
        isBase: true,
        clientContext: "Receta base",
        sortOrder: 0,
      });

      // 2. Resolve or auto-create each recipe ingredient in Alacena
      if (item.ingredients.length > 0) {
        const varIngRows = [];
        const seenIngIds = new Set<string>();

        for (let idx = 0; idx < item.ingredients.length; idx++) {
          const recIng = item.ingredients[idx];
          const normIng = normalizeText(recIng.name);
          if (!normIng) continue;

          let targetIng = ingByNorm.get(normIng);
          if (!targetIng) {
            const inferred = inferGroupAndUnit(recIng.name);
            const newIngId = `ing-${crypto.randomUUID().slice(0, 12)}`;
            const unitType = recIng.unit ?? inferred.unitType;
            const defaultStock =
              unitType === "qualitative"
                ? null
                : (recIng.quantity ?? inferred.defaultQty ?? 5);

            const [createdIng] = await db
              .insert(ingredients)
              .values({
                id: newIngId,
                name: recIng.name.trim(),
                normalizedName: normIng,
                groupTag: recIng.groupTag || inferred.groupTag,
                unitType,
                stockQty: defaultStock,
                lowThreshold: null,
                stockLevel: "plenty",
                unitCostArs: null,
                unitCostUsd: null,
              })
              .returning();

            ingByNorm.set(normIng, createdIng);
            targetIng = createdIng;
            autoCreatedIngredientsCount++;
          }

          if (seenIngIds.has(targetIng.id)) continue;
          seenIngIds.add(targetIng.id);

          varIngRows.push({
            id: `vi-${crypto.randomUUID().slice(0, 10)}`,
            variationId: baseVarId,
            ingredientId: targetIng.id,
            quantity:
              recIng.unit === "qualitative" ? null : (recIng.quantity ?? 1),
            unit: recIng.unit,
            isOptional: recIng.isOptional,
            substitutionNote: null,
            sortOrder: idx + 1,
          });
        }

        if (varIngRows.length > 0) {
          await db.insert(variationIngredients).values(varIngRows);
        }
      }

      createdSpellsCount++;
      createdSpellIds.push(spellId);
    }

    revalidatePath("/api/public/catalog");

    return NextResponse.json(
      {
        createdSpellsCount,
        autoCreatedIngredientsCount,
        autoCreatedCategoriesCount,
        spellIds: createdSpellIds,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/spells/bulk] error:", err);
    return NextResponse.json(
      { error: "No se pudo realizar la carga masiva de hechizos." },
      { status: 500 }
    );
  }
}
