import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  categories,
  ingredients,
  spells,
  spellPriceTiers,
  spellVariations,
  variationIngredients,
  variationSteps,
} from "./schema";
import {
  EXTRA_CATEGORIES,
  EXTRA_INGREDIENTS,
  EXISTING_SPELL_ENRICHMENTS,
  NEW_SPELLS,
} from "./catalog-data";
import { normalizeText } from "../lib/domain/normalize";

async function seed() {
  const db = getDb();

  console.log("Seeding categories...");
  const categoryData = [
    {
      id: "cat-individuales",
      name: "Individuales",
      slug: "individuales",
      publicIntro: null,
      sortOrder: 1,
    },
    {
      id: "cat-vinculares",
      name: "Vinculares",
      slug: "vinculares",
      publicIntro: null,
      sortOrder: 2,
    },
    {
      id: "cat-alta-magia",
      name: "Personalizados & Alta Magia",
      slug: "personalizados-alta-magia",
      publicIntro:
        "Según tu caso y lo que quieras lograr, podés solicitar un ritual a medida combinando dos o más trabajos energéticos. Consultame por DM para armar el tuyo.",
      sortOrder: 3,
    },
  ];

  for (const cat of categoryData) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoNothing({ target: categories.id });
  }

  console.log("Seeding starter ingredients...");
  const starterIngredients = [
    {
      id: "ing-romero",
      name: "Romero",
      groupTag: "Hierbas",
      unitType: "g" as const,
      stockQty: 50,
      lowThreshold: 10,
      stockLevel: "plenty" as const,
      unitCostArs: 40,
    },
    {
      id: "ing-miel",
      name: "Miel pura",
      groupTag: "Insumos",
      unitType: "ml" as const,
      stockQty: 250,
      lowThreshold: 50,
      stockLevel: "plenty" as const,
      unitCostArs: 15,
    },
    {
      id: "ing-canela",
      name: "Canela en rama",
      groupTag: "Hierbas",
      unitType: "branch" as const,
      stockQty: 12,
      lowThreshold: 3,
      stockLevel: "plenty" as const,
      unitCostArs: 350,
    },
    {
      id: "ing-vela-rosa",
      name: "Vela rosa",
      groupTag: "Velas",
      unitType: "unit" as const,
      stockQty: 10,
      lowThreshold: 2,
      stockLevel: "plenty" as const,
      unitCostArs: 900,
    },
    {
      id: "ing-vela-blanca",
      name: "Vela blanca",
      groupTag: "Velas",
      unitType: "unit" as const,
      stockQty: 15,
      lowThreshold: 3,
      stockLevel: "plenty" as const,
      unitCostArs: 800,
    },
    {
      id: "ing-vela-roja",
      name: "Vela roja",
      groupTag: "Velas",
      unitType: "unit" as const,
      stockQty: 8,
      lowThreshold: 2,
      stockLevel: "plenty" as const,
      unitCostArs: 950,
    },
    {
      id: "ing-vela-negra",
      name: "Vela negra",
      groupTag: "Velas",
      unitType: "unit" as const,
      stockQty: 6,
      lowThreshold: 2,
      stockLevel: "plenty" as const,
      unitCostArs: 1000,
    },
    {
      id: "ing-sal-gruesa",
      name: "Sal gruesa",
      groupTag: "Insumos",
      unitType: "g" as const,
      stockQty: 500,
      lowThreshold: 100,
      stockLevel: "plenty" as const,
      unitCostArs: 3,
    },
    {
      id: "ing-lavanda",
      name: "Lavanda seca",
      groupTag: "Hierbas",
      unitType: "g" as const,
      stockQty: 40,
      lowThreshold: 10,
      stockLevel: "plenty" as const,
      unitCostArs: 55,
    },
    {
      id: "ing-petalos-rosa",
      name: "Pétalos de rosa",
      groupTag: "Hierbas",
      unitType: "g" as const,
      stockQty: 30,
      lowThreshold: 8,
      stockLevel: "plenty" as const,
      unitCostArs: 70,
    },
  ];

  for (const ing of starterIngredients) {
    await db
      .insert(ingredients)
      .values({
        ...ing,
        normalizedName: normalizeText(ing.name),
      })
      .onConflictDoNothing({ target: ingredients.id });
  }

  console.log("Seeding 8 real spells from tarotdeluna.netlify.app...");
  const realSpells = [
    {
      id: "spell-autoendulzamiento",
      categoryId: "cat-individuales",
      title: "Autoendulzamiento",
      subtitleTag: null,
      purpose: "Elevar autoestima, amor propio y magnetismo personal",
      energyTypes: ["Amor propio", "Magia blanca", "Magnetismo"],
      publicDescription:
        "Ritual de amor propio diseñado para elevar tu autoestima, reconectar con tu valor personal y magnetizar energías positivas en tu día a día.",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 1,
      tiers: [
        { id: "tier-auto-1", label: "Simple", priceArs: 35000, priceUsd: 38, sortOrder: 1 },
        { id: "tier-auto-2", label: "Potenciado", priceArs: 55000, priceUsd: 60, sortOrder: 2 },
      ],
      baseIngredients: [
        { ingredientId: "ing-vela-rosa", quantity: 1, unit: "unit" as const },
        { ingredientId: "ing-miel", quantity: 30, unit: "ml" as const },
        { ingredientId: "ing-petalos-rosa", quantity: 5, unit: "g" as const },
        { ingredientId: "ing-canela", quantity: 1, unit: "branch" as const },
      ],
      baseSteps: [
        {
          stepNumber: 1,
          title: "Preparación del altar",
          instruction: "Limpiar el espacio con sahumo suave, preparar la vela rosa y escribir el nombre completo de la consultante.",
          durationMinutes: 5,
        },
        {
          stepNumber: 2,
          title: "Consagración y endulzamiento",
          instruction: "Untar la vela con miel de abajo hacia arriba, rodear con pétalos de rosa y canela en rama, e intencionar amor propio.",
          durationMinutes: 10,
        },
      ],
    },
    {
      id: "spell-corte-lazos",
      categoryId: "cat-individuales",
      title: "Corte de lazos",
      subtitleTag: null,
      purpose: "Soltar apegos emocionales y vínculos tóxicos que drenan energía",
      energyTypes: ["Liberación", "Protección", "Limpieza"],
      publicDescription:
        "Ritual de liberación energética para soltar apegos emocionales, vínculos tóxicos del pasado y energías externas que te drenan.",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 2,
      tiers: [{ id: "tier-corte-1", label: "", priceArs: 30000, priceUsd: 34, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-blanca", quantity: 2, unit: "unit" as const },
        { ingredientId: "ing-sal-gruesa", quantity: 30, unit: "g" as const },
        { ingredientId: "ing-romero", quantity: 5, unit: "g" as const },
      ],
      baseSteps: [
        {
          stepNumber: 1,
          title: "Círculo de protección",
          instruction: "Trazar un círculo con sal gruesa y romero alrededor de ambas velas blancas.",
          durationMinutes: 5,
        },
      ],
    },
    {
      id: "spell-ansi-holic",
      categoryId: "cat-individuales",
      title: "Ansi-holic",
      subtitleTag: null,
      purpose: "Bajar la ansiedad, calmar la mente y devolver centro emocional",
      energyTypes: ["Armonización", "Magia blanca", "Calma"],
      publicDescription:
        "Trabajo de armonización para bajar la ansiedad, calmar la mente y regular el sistema nervioso, devolviéndote tu centro, paz interior y estabilidad emocional.",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 3,
      tiers: [{ id: "tier-ansi-1", label: "", priceArs: 28000, priceUsd: 31, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-blanca", quantity: 1, unit: "unit" as const },
        { ingredientId: "ing-lavanda", quantity: 10, unit: "g" as const },
        { ingredientId: "ing-romero", quantity: 5, unit: "g" as const },
      ],
      baseSteps: [
        {
          stepNumber: 1,
          title: "Armonización con lavanda",
          instruction: "Disponer lavanda seca y romero en forma de corona alrededor de la vela blanca, intencionando paz mental.",
          durationMinutes: 10,
        },
      ],
    },
    {
      id: "spell-endulzamiento",
      categoryId: "cat-vinculares",
      title: "Endulzamiento",
      subtitleTag: null,
      purpose: "Suavizar roces y potenciar amor, ternura y comunicación fluida en pareja",
      energyTypes: ["Amor", "Armonización vincular", "Magia blanca"],
      publicDescription:
        "Potencia el amor, la ternura y el deseo dentro de tu vínculo sentimental, suavizando roces para recuperar la armonía y la comunicación fluida.",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 1,
      tiers: [{ id: "tier-endul-1", label: "", priceArs: 45000, priceUsd: 47, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-rosa", quantity: 2, unit: "unit" as const },
        { ingredientId: "ing-miel", quantity: 40, unit: "ml" as const },
        { ingredientId: "ing-canela", quantity: 2, unit: "branch" as const },
        { ingredientId: "ing-petalos-rosa", quantity: 5, unit: "g" as const },
      ],
      baseSteps: [],
    },
    {
      id: "spell-retorno",
      categoryId: "cat-vinculares",
      title: "Retorno",
      subtitleTag: null,
      purpose: "Propiciar acercamiento y regreso de un ex vínculo",
      energyTypes: ["Vincular", "Retorno", "Intensidad media"],
      publicDescription:
        "Trabajo energético enfocado en propiciar el acercamiento y regreso de un ex vínculo (magia blanca… o quizás no).",
      isPublished: true,
      isOffer: true,
      offerLabel: "¡OFERTA!",
      sortOrder: 2,
      tiers: [{ id: "tier-ret-1", label: "", priceArs: 25000, priceUsd: 29, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-roja", quantity: 2, unit: "unit" as const },
        { ingredientId: "ing-canela", quantity: 1, unit: "branch" as const },
        { ingredientId: "ing-miel", quantity: 30, unit: "ml" as const },
      ],
      baseSteps: [],
    },
    {
      id: "spell-destrabe-purgado",
      categoryId: "cat-alta-magia",
      title: "Destrabe y purgado",
      subtitleTag: "Limpieza energética profunda + Purgado espiritual",
      purpose: "Eliminar bloqueos pesados, restos de trabajos mal cerrados y cargas densas",
      energyTypes: ["Limpieza profunda", "Destrabe", "Alta magia"],
      publicDescription:
        "Ideal para eliminar bloqueos pesados, restos de trabajos mal cerrados o cargas densas adheridas a tu energía, purificando y restaurando tu campo áurico por completo.",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 1,
      tiers: [{ id: "tier-dest-1", label: "", priceArs: 30000, priceUsd: 34, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-negra", quantity: 1, unit: "unit" as const },
        { ingredientId: "ing-vela-blanca", quantity: 1, unit: "unit" as const },
        { ingredientId: "ing-sal-gruesa", quantity: 50, unit: "g" as const },
        { ingredientId: "ing-romero", quantity: 10, unit: "g" as const },
      ],
      baseSteps: [],
    },
    {
      id: "spell-desespero-asfixia",
      categoryId: "cat-alta-magia",
      title: "Desespero y Asfixia Mental",
      subtitleTag: null,
      purpose: "Intranquilidad y fijación mental intensiva hacia la consultante",
      energyTypes: ["Alta magia", "Fijación mental", "Sin magia blanca"],
      publicDescription:
        "Trabajo intensivo de intranquilidad y fijación mental para que no pueda dejar de pensarte ni resistirse a buscarte. —SIN USO DE MAGIA BLANCA—",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 2,
      tiers: [{ id: "tier-desesp-1", label: "", priceArs: 50000, priceUsd: 55, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-roja", quantity: 2, unit: "unit" as const },
        { ingredientId: "ing-vela-negra", quantity: 1, unit: "unit" as const },
      ],
      baseSteps: [],
    },
    {
      id: "spell-sumision-dominancia",
      categoryId: "cat-alta-magia",
      title: "Sumisión y dominancia",
      subtitleTag: null,
      purpose: "Doblegar orgullo y tomar control energético del vínculo con alquimia + tarot",
      energyTypes: ["Dominio", "Alta magia", "Alquimia + Tarot"],
      publicDescription:
        "Ritual enfocado en doblegar el orgullo de la persona objetivo y tomar el control energético del vínculo. A diferencia de un dominio tradicional, fusiona alquimia ritual con arcanos de tarot consagrados a la hechicería.",
      isPublished: true,
      isOffer: false,
      offerLabel: null,
      sortOrder: 3,
      tiers: [{ id: "tier-sum-1", label: "", priceArs: 35000, priceUsd: 38, sortOrder: 1 }],
      baseIngredients: [
        { ingredientId: "ing-vela-roja", quantity: 1, unit: "unit" as const },
        { ingredientId: "ing-vela-negra", quantity: 1, unit: "unit" as const },
        { ingredientId: "ing-canela", quantity: 1, unit: "branch" as const },
      ],
      baseSteps: [],
    },
  ];

  for (const s of realSpells) {
    await db
      .insert(spells)
      .values({
        id: s.id,
        categoryId: s.categoryId,
        title: s.title,
        subtitleTag: s.subtitleTag,
        purpose: s.purpose,
        energyTypes: s.energyTypes,
        publicDescription: s.publicDescription,
        isPublished: s.isPublished,
        isOffer: s.isOffer,
        offerLabel: s.offerLabel,
        sortOrder: s.sortOrder,
      })
      .onConflictDoNothing({ target: spells.id });

    for (const tier of s.tiers) {
      await db
        .insert(spellPriceTiers)
        .values({
          ...tier,
          spellId: s.id,
        })
        .onConflictDoNothing({ target: spellPriceTiers.id });
    }

    const baseVarId = `var-${s.id}-base`;
    await db
      .insert(spellVariations)
      .values({
        id: baseVarId,
        spellId: s.id,
        name: "Base",
        isBase: true,
        clientContext: "Receta estándar del altar",
        sortOrder: 0,
      })
      .onConflictDoNothing({ target: spellVariations.id });

    for (let i = 0; i < s.baseIngredients.length; i++) {
      const bi = s.baseIngredients[i];
      await db
        .insert(variationIngredients)
        .values({
          id: `vi-${baseVarId}-${i + 1}`,
          variationId: baseVarId,
          ingredientId: bi.ingredientId,
          quantity: bi.quantity,
          unit: bi.unit,
          isOptional: false,
          sortOrder: i + 1,
        })
        .onConflictDoNothing({ target: variationIngredients.id });
    }

    for (let i = 0; i < s.baseSteps.length; i++) {
      const st = s.baseSteps[i];
      await db
        .insert(variationSteps)
        .values({
          id: `vs-${baseVarId}-${i + 1}`,
          variationId: baseVarId,
          stepNumber: st.stepNumber,
          title: st.title,
          instruction: st.instruction,
          durationMinutes: st.durationMinutes,
        })
        .onConflictDoNothing({ target: variationSteps.id });
    }
  }

  console.log("Seeding extended categories...");
  for (const cat of EXTRA_CATEGORIES) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoNothing();
  }

  console.log("Seeding extended ingredients...");
  for (const ing of EXTRA_INGREDIENTS) {
    await db
      .insert(ingredients)
      .values({
        ...ing,
        normalizedName: normalizeText(ing.name),
      })
      .onConflictDoNothing();
  }

  // Resolve ingredient IDs by normalizedName in case any already existed under another ID
  const allDbIngredients = await db.select().from(ingredients);
  const ingIdById = new Set(allDbIngredients.map((i) => i.id));
  const ingIdByNormalized = new Map(
    allDbIngredients.map((i) => [i.normalizedName, i.id])
  );
  const extraIngNameById = new Map(
    EXTRA_INGREDIENTS.map((i) => [i.id, normalizeText(i.name)])
  );

  function resolveIngredientId(id: string): string {
    if (ingIdById.has(id)) return id;
    const norm = extraIngNameById.get(id);
    if (norm && ingIdByNormalized.has(norm)) {
      return ingIdByNormalized.get(norm)!;
    }
    return id;
  }

  console.log("Enriching existing spells with missing ingredients, steps, and variations...");
  for (const enrich of EXISTING_SPELL_ENRICHMENTS) {
    const vars = await db
      .select()
      .from(spellVariations)
      .where(eq(spellVariations.spellId, enrich.spellId));
    const baseVar = vars.find((v) => v.isBase) ?? vars[0];

    if (baseVar && enrich.ensureBaseIngredients?.length) {
      const existingIngs = await db
        .select()
        .from(variationIngredients)
        .where(eq(variationIngredients.variationId, baseVar.id));
      const existingIngIds = new Set(existingIngs.map((vi) => vi.ingredientId));
      let nextSort = existingIngs.reduce((max, vi) => Math.max(max, vi.sortOrder), 0) + 1;

      for (const bi of enrich.ensureBaseIngredients) {
        const resolvedId = resolveIngredientId(bi.ingredientId);
        if (existingIngIds.has(resolvedId)) continue;
        await db
          .insert(variationIngredients)
          .values({
            id: `vi-${baseVar.id}-${resolvedId}`,
            variationId: baseVar.id,
            ingredientId: resolvedId,
            quantity: bi.quantity,
            unit: bi.unit,
            isOptional: bi.isOptional ?? false,
            substitutionNote: bi.substitutionNote ?? null,
            sortOrder: nextSort++,
          })
          .onConflictDoNothing();
        existingIngIds.add(resolvedId);
      }
    }

    if (baseVar && enrich.baseSteps?.length) {
      const existingSteps = await db
        .select()
        .from(variationSteps)
        .where(eq(variationSteps.variationId, baseVar.id));

      const onlyStubSteps =
        enrich.replaceInitialStubSteps &&
        existingSteps.length > 0 &&
        existingSteps.every((st) => enrich.replaceInitialStubSteps!.includes(st.id));

      if (onlyStubSteps) {
        for (const stub of existingSteps) {
          await db.delete(variationSteps).where(eq(variationSteps.id, stub.id));
        }
      }

      if (existingSteps.length === 0 || onlyStubSteps) {
        for (let i = 0; i < enrich.baseSteps.length; i++) {
          const st = enrich.baseSteps[i];
          await db
            .insert(variationSteps)
            .values({
              id: `vs-${baseVar.id}-cat-${i + 1}`,
              variationId: baseVar.id,
              stepNumber: st.stepNumber,
              title: st.title,
              instruction: st.instruction,
              durationMinutes: st.durationMinutes ?? null,
            })
            .onConflictDoNothing();
        }
      }
    }

    if (enrich.extraVariations?.length) {
      const existingVarIds = new Set(vars.map((v) => v.id));
      const existingVarNames = new Set(vars.map((v) => normalizeText(v.name)));

      for (const extraVar of enrich.extraVariations) {
        if (
          existingVarIds.has(extraVar.id) ||
          existingVarNames.has(normalizeText(extraVar.name))
        ) {
          continue;
        }
        await db
          .insert(spellVariations)
          .values({
            id: extraVar.id,
            spellId: enrich.spellId,
            name: extraVar.name,
            isBase: extraVar.isBase,
            clientContext: extraVar.clientContext ?? null,
            notes: extraVar.notes ?? null,
            sortOrder: extraVar.sortOrder,
          })
          .onConflictDoNothing();

        for (let i = 0; i < extraVar.ingredients.length; i++) {
          const bi = extraVar.ingredients[i];
          const resolvedId = resolveIngredientId(bi.ingredientId);
          await db
            .insert(variationIngredients)
            .values({
              id: `vi-${extraVar.id}-${i + 1}`,
              variationId: extraVar.id,
              ingredientId: resolvedId,
              quantity: bi.quantity,
              unit: bi.unit,
              isOptional: bi.isOptional ?? false,
              substitutionNote: bi.substitutionNote ?? null,
              sortOrder: i + 1,
            })
            .onConflictDoNothing();
        }

        for (let i = 0; i < extraVar.steps.length; i++) {
          const st = extraVar.steps[i];
          await db
            .insert(variationSteps)
            .values({
              id: `vs-${extraVar.id}-${i + 1}`,
              variationId: extraVar.id,
              stepNumber: st.stepNumber,
              title: st.title,
              instruction: st.instruction,
              durationMinutes: st.durationMinutes ?? null,
            })
            .onConflictDoNothing();
        }
      }
    }
  }

  console.log("Seeding new catalog spells...");
  const existingSpells = await db.select().from(spells);
  const existingSpellIds = new Set(existingSpells.map((s) => s.id));
  const existingSpellTitles = new Set(existingSpells.map((s) => normalizeText(s.title)));

  for (const ns of NEW_SPELLS) {
    if (existingSpellIds.has(ns.id) || existingSpellTitles.has(normalizeText(ns.title))) {
      continue;
    }

    await db
      .insert(spells)
      .values({
        id: ns.id,
        categoryId: ns.categoryId,
        title: ns.title,
        subtitleTag: ns.subtitleTag,
        purpose: ns.purpose,
        energyTypes: ns.energyTypes,
        publicDescription: ns.publicDescription,
        privateNotes: ns.privateNotes ?? null,
        isPublished: ns.isPublished,
        isOffer: ns.isOffer,
        offerLabel: ns.offerLabel,
        sortOrder: ns.sortOrder,
      })
      .onConflictDoNothing();

    for (const v of ns.variations) {
      await db
        .insert(spellVariations)
        .values({
          id: v.id,
          spellId: ns.id,
          name: v.name,
          isBase: v.isBase,
          clientContext: v.clientContext ?? null,
          notes: v.notes ?? null,
          sortOrder: v.sortOrder,
        })
        .onConflictDoNothing();

      for (let i = 0; i < v.ingredients.length; i++) {
        const bi = v.ingredients[i];
        const resolvedId = resolveIngredientId(bi.ingredientId);
        await db
          .insert(variationIngredients)
          .values({
            id: `vi-${v.id}-${i + 1}`,
            variationId: v.id,
            ingredientId: resolvedId,
            quantity: bi.quantity,
            unit: bi.unit,
            isOptional: bi.isOptional ?? false,
            substitutionNote: bi.substitutionNote ?? null,
            sortOrder: i + 1,
          })
          .onConflictDoNothing();
      }

      for (let i = 0; i < v.steps.length; i++) {
        const st = v.steps[i];
        await db
          .insert(variationSteps)
          .values({
            id: `vs-${v.id}-${i + 1}`,
            variationId: v.id,
            stepNumber: st.stepNumber,
            title: st.title,
            instruction: st.instruction,
            durationMinutes: st.durationMinutes ?? null,
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log("Seed completed successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
