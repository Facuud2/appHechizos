import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { spells } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { getPublicCatalog } from "@/lib/public-catalog";

const publishSchema = z.object({
  /** Optional explicit list of spell IDs to publish (others become private) */
  publishSpellIds: z.array(z.string()).optional(),
  /** Optional shortcut: publish all spells */
  publishAll: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = publishSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const db = getDb();
    const { publishSpellIds, publishAll } = parsed.data;

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

    // Optionally trigger Netlify Build Hook if configured
    let netlifyTriggered = false;
    const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL?.trim();
    if (hookUrl && hookUrl.startsWith("https://")) {
      try {
        const hookRes = await fetch(hookUrl, { method: "POST" });
        netlifyTriggered = hookRes.ok;
      } catch (err) {
        console.error("[publish] Netlify build hook failed:", err);
      }
    }

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
      netlifyTriggered,
      updatedAt: catalog.updatedAt,
      siteUrl: "https://tarotdeluna.netlify.app",
    });
  } catch (err) {
    console.error("[POST /api/public/publish] error:", err);
    return NextResponse.json(
      { error: "No se pudo sincronizar el catálogo con Netlify." },
      { status: 500 }
    );
  }
}
