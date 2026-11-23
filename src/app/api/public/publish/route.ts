import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { categories, spellPriceTiers, spells } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { getPublicCatalog } from "@/lib/public-catalog";
import { normalizeText } from "@/lib/domain/normalize";

const categorySyncSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  publicIntro: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const spellSyncSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  subtitleTag: z.string().trim().max(200).nullable().optional(),
  publicDescription: z.string().trim().max(2000).nullable().optional(),
  isPublished: z.boolean().optional(),
  isOffer: z.boolean().optional(),
  offerLabel: z.string().trim().max(40).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  priceTiers: z
    .array(
      z.object({
        label: z.string().trim().max(60).default(""),
        priceArs: z.number().min(0),
        priceUsd: z.number().min(0),
      })
    )
    .optional(),
});

const publishSchema = z.object({
  /** Optional explicit list of spell IDs to publish (others become private) */
  publishSpellIds: z.array(z.string()).optional(),
  /** Optional shortcut: publish all spells */
  publishAll: z.boolean().optional(),
  /** Optional full category updates (order, name, publicIntro) */
  categories: z.array(categorySyncSchema).optional(),
  /** Optional full spell updates (order, category, public info, prices, offer, published) */
  spells: z.array(spellSyncSchema).optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = publishSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const {
      publishSpellIds,
      publishAll,
      categories: catUpdates,
      spells: spellUpdates,
    } = parsed.data;

    // 1. Apply category updates in parallel if provided
    if (catUpdates && catUpdates.length > 0) {
      await Promise.all(
        catUpdates.map(async (cat) => {
          const patch: Partial<typeof categories.$inferInsert> = {};
          if (cat.name !== undefined) {
            patch.name = cat.name;
            const baseSlug =
              normalizeText(cat.name)
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "categoria";
            const [conflict] = await db
              .select()
              .from(categories)
              .where(eq(categories.slug, baseSlug));
            if (!conflict || conflict.id === cat.id) {
              patch.slug = baseSlug;
            }
          }
          if (cat.publicIntro !== undefined) {
            patch.publicIntro = cat.publicIntro || null;
          }
          if (cat.sortOrder !== undefined) {
            patch.sortOrder = cat.sortOrder;
          }
          if (Object.keys(patch).length > 0) {
            await db
              .update(categories)
              .set(patch)
              .where(eq(categories.id, cat.id));
          }
        })
      );
    }

    // 2. Apply spell updates in parallel if provided
    if (spellUpdates && spellUpdates.length > 0) {
      await Promise.all(
        spellUpdates.map(async (sp) => {
          const { id, priceTiers, ...fields } = sp;
          const patch: Partial<typeof spells.$inferInsert> = {
            updatedAt: new Date(),
          };
          if (fields.categoryId !== undefined) patch.categoryId = fields.categoryId;
          if (fields.title !== undefined) patch.title = fields.title;
          if (fields.subtitleTag !== undefined)
            patch.subtitleTag = fields.subtitleTag || null;
          if (fields.publicDescription !== undefined)
            patch.publicDescription = fields.publicDescription || null;
          if (fields.isPublished !== undefined) patch.isPublished = fields.isPublished;
          if (fields.isOffer !== undefined) patch.isOffer = fields.isOffer;
          if (fields.offerLabel !== undefined)
            patch.offerLabel = fields.offerLabel || "¡OFERTA!";
          if (fields.sortOrder !== undefined) patch.sortOrder = fields.sortOrder;

          await db.update(spells).set(patch).where(eq(spells.id, id));

          if (priceTiers !== undefined) {
            await db
              .delete(spellPriceTiers)
              .where(eq(spellPriceTiers.spellId, id));
            if (priceTiers.length > 0) {
              await db.insert(spellPriceTiers).values(
                priceTiers.map((t, idx) => ({
                  id: `tier-${crypto.randomUUID().slice(0, 10)}`,
                  spellId: id,
                  label: t.label,
                  priceArs: t.priceArs,
                  priceUsd: t.priceUsd,
                  sortOrder: idx + 1,
                }))
              );
            }
          }
        })
      );
    }

    // 3. Legacy / quick checklist publish support
    if (publishAll) {
      await db
        .update(spells)
        .set({ isPublished: true, updatedAt: new Date() });
    } else if (publishSpellIds !== undefined) {
      await db
        .update(spells)
        .set({ isPublished: false, updatedAt: new Date() });
      if (publishSpellIds.length > 0) {
        await db
          .update(spells)
          .set({ isPublished: true, updatedAt: new Date() })
          .where(inArray(spells.id, publishSpellIds));
      }
    }

    // Revalidate the public JSON endpoint immediately
    revalidatePath("/api/public/catalog");

    // Note: tarotdeluna.netlify.app fetches live from /api/public/catalog at runtime,
    // so zero Netlify build tokens/credits are consumed on catalog updates.
    const catalog = await getPublicCatalog();
    const publishedCount = catalog.categories.reduce(
      (acc, c) => acc + c.spells.length,
      0
    );

    const publishedRows = await db
      .select({ id: spells.id })
      .from(spells)
      .where(eq(spells.isPublished, true));

    return NextResponse.json({
      ok: true,
      publishedCount: publishedRows.length,
      categorizedPublicCount: publishedCount,
      netlifyTriggered: false,
      updatedAt: catalog.updatedAt,
      siteUrl: "https://tarotdeluna.netlify.app",
    });
  } catch (err) {
    console.error("[POST /api/public/publish] error:", err);
    return NextResponse.json(
      { error: "No se pudo sincronizar el catálogo con la web." },
      { status: 500 }
    );
  }
}
