import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { normalizeText } from "@/lib/domain/normalize";

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  publicIntro: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const db = getDb();
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return NextResponse.json({ categories: rows });
}

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const name = parsed.data.name;
    const baseSlug =
      normalizeText(name)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "categoria";

    const db = getDb();

    // Check if a category with this slug already exists
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, baseSlug));

    if (existing) {
      return NextResponse.json(
        { category: existing, alreadyExisted: true },
        { status: 200 }
      );
    }

    const allCats = await db.select().from(categories);
    const maxSort = allCats.reduce((max, c) => Math.max(max, c.sortOrder), 0);

    const id = `cat-${baseSlug.slice(0, 24)}-${crypto.randomUUID().slice(0, 6)}`;
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 4)}`;

    const [created] = await db
      .insert(categories)
      .values({
        id,
        name,
        slug: existing ? slug : baseSlug,
        publicIntro: parsed.data.publicIntro ?? null,
        sortOrder: maxSort + 1,
      })
      .returning();

    revalidatePath("/api/public/catalog");

    return NextResponse.json(
      { category: created, alreadyExisted: false },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/categories] error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la categoría." },
      { status: 500 }
    );
  }
}
