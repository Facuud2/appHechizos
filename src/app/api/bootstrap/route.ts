import { NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categories,
  ingredients,
  ritualLogs,
  spellPriceTiers,
  spells,
  spellVariations,
  stepMedia,
  variationIngredients,
  variationSteps,
} from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { createPresignedReadUrl } from "@/lib/storage";
import type {
  BootstrapPayload,
  SpellItem,
  SpellVariationItem,
  StepMediaItem,
  VariationStepItem,
} from "@/types/app";

export async function GET() {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const db = getDb();

    const [
      catRows,
      ingRows,
      spellRows,
      tierRows,
      varRows,
      viRows,
      stepRows,
      mediaRows,
      logRows,
    ] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db.select().from(ingredients).orderBy(asc(ingredients.name)),
      db.select().from(spells).orderBy(asc(spells.sortOrder), asc(spells.title)),
      db.select().from(spellPriceTiers).orderBy(asc(spellPriceTiers.sortOrder)),
      db
        .select()
        .from(spellVariations)
        .orderBy(desc(spellVariations.isBase), asc(spellVariations.sortOrder)),
      db
        .select()
        .from(variationIngredients)
        .orderBy(asc(variationIngredients.sortOrder)),
      db
        .select()
        .from(variationSteps)
        .orderBy(asc(variationSteps.stepNumber)),
      db.select().from(stepMedia).orderBy(asc(stepMedia.sortOrder)),
      db.select().from(ritualLogs).orderBy(desc(ritualLogs.performedAt)).limit(50),
    ]);

    // Sign step media + spell covers + ingredient covers in parallel
    const [signedMediaList, spellCoverUrls, ingCoverUrls] = await Promise.all([
      Promise.all(
        mediaRows.map(async (m): Promise<StepMediaItem> => ({
          id: m.id,
          stepId: m.stepId,
          storageKey: m.storageKey,
          mediaType: m.mediaType,
          mimeType: m.mimeType,
          sizeBytes: m.sizeBytes,
          caption: m.caption,
          sortOrder: m.sortOrder,
          signedUrl: await createPresignedReadUrl(m.storageKey),
        }))
      ),
      Promise.all(
        spellRows.map(async (s) =>
          s.imageKey ? await createPresignedReadUrl(s.imageKey) : null
        )
      ),
      Promise.all(
        ingRows.map(async (i) =>
          i.imageKey ? await createPresignedReadUrl(i.imageKey) : null
        )
      ),
    ]);

    const mediaByStep = new Map<string, StepMediaItem[]>();
    for (const m of signedMediaList) {
      const list = mediaByStep.get(m.stepId) ?? [];
      list.push(m);
      mediaByStep.set(m.stepId, list);
    }

    const stepsByVariation = new Map<string, VariationStepItem[]>();
    for (const st of stepRows) {
      const list = stepsByVariation.get(st.variationId) ?? [];
      list.push({
        id: st.id,
        variationId: st.variationId,
        stepNumber: st.stepNumber,
        title: st.title,
        instruction: st.instruction,
        durationMinutes: st.durationMinutes,
        media: mediaByStep.get(st.id) ?? [],
      });
      stepsByVariation.set(st.variationId, list);
    }

    const viByVariation = new Map<string, typeof viRows>();
    for (const vi of viRows) {
      const list = viByVariation.get(vi.variationId) ?? [];
      list.push(vi);
      viByVariation.set(vi.variationId, list);
    }

    const variationsBySpell = new Map<string, SpellVariationItem[]>();
    for (const v of varRows) {
      const list = variationsBySpell.get(v.spellId) ?? [];
      list.push({
        id: v.id,
        spellId: v.spellId,
        name: v.name,
        isBase: v.isBase,
        clientContext: v.clientContext,
        priceOverrideArs: v.priceOverrideArs,
        priceOverrideUsd: v.priceOverrideUsd,
        notes: v.notes,
        sortOrder: v.sortOrder,
        ingredients: viByVariation.get(v.id) ?? [],
        steps: stepsByVariation.get(v.id) ?? [],
      });
      variationsBySpell.set(v.spellId, list);
    }

    const tiersBySpell = new Map<string, typeof tierRows>();
    for (const t of tierRows) {
      const list = tiersBySpell.get(t.spellId) ?? [];
      list.push(t);
      tiersBySpell.set(t.spellId, list);
    }

    const fullSpells: SpellItem[] = spellRows.map((s, idx) => ({
      id: s.id,
      categoryId: s.categoryId,
      title: s.title,
      subtitleTag: s.subtitleTag,
      purpose: s.purpose,
      energyTypes: s.energyTypes ?? [],
      publicDescription: s.publicDescription,
      privateNotes: s.privateNotes,
      imageKey: s.imageKey ?? null,
      imageUrl: spellCoverUrls[idx] ?? null,
      isPublished: s.isPublished,
      isOffer: s.isOffer,
      offerLabel: s.offerLabel,
      sortOrder: s.sortOrder,
      updatedAt: s.updatedAt.toISOString(),
      priceTiers: tiersBySpell.get(s.id) ?? [],
      variations: variationsBySpell.get(s.id) ?? [],
    }));

    const payload: BootstrapPayload = {
      categories: catRows,
      ingredients: ingRows.map((i, idx) => ({
        ...i,
        imageKey: i.imageKey ?? null,
        imageUrl: ingCoverUrls[idx] ?? null,
        updatedAt: i.updatedAt.toISOString(),
      })),
      spells: fullSpells,
      ritualLogs: logRows.map((l) => ({
        ...l,
        performedAt: l.performedAt.toISOString(),
      })),
      syncedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[api/bootstrap] error:", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los datos del grimorio." },
      { status: 500 }
    );
  }
}
