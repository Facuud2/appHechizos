import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { normalizeText } from "@/lib/domain/normalize";

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120).optional(),
  publicIntro: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
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
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = getDb();
    const patch: Partial<typeof categories.$inferInsert> = {};

    if (parsed.data.name !== undefined) {
      patch.name = parsed.data.name;
      const baseSlug =
        normalizeText(parsed.data.name)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "categoria";
      const [conflict] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, baseSlug));
      if (!conflict || conflict.id === id) {
        patch.slug = baseSlug;
      }
    }

    if (parsed.data.publicIntro !== undefined) {
      patch.publicIntro = parsed.data.publicIntro || null;
    }

    if (parsed.data.sortOrder !== undefined) {
      patch.sortOrder = parsed.data.sortOrder;
    }

    const [updated] = await db
      .update(categories)
      .set(patch)
      .where(eq(categories.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Categoría no encontrada." },
        { status: 404 }
      );
    }

    revalidatePath("/api/public/catalog");

    return NextResponse.json({ category: updated });
  } catch (err) {
    console.error("[PATCH /api/categories/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar la categoría." },
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
    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath("/api/public/catalog");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[DELETE /api/categories/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar la categoría." },
      { status: 500 }
    );
  }
}
