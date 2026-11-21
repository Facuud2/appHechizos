import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { stepMedia } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import { deleteStoredMedia } from "@/lib/storage";

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
      .from(stepMedia)
      .where(eq(stepMedia.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

    await db.delete(stepMedia).where(eq(stepMedia.id, id));
    await deleteStoredMedia(existing.storageKey);

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[DELETE /api/media/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el archivo." },
      { status: 500 }
    );
  }
}
