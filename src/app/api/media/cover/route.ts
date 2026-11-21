import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { ingredients, spells } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  createPresignedReadUrl,
  createPresignedUpload,
  deleteStoredMedia,
} from "@/lib/storage";

const presignCoverSchema = z.object({
  entityType: z.enum(["spell", "ingredient"]),
  entityId: z.string().min(1),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = presignCoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { entityType, entityId, fileName, mimeType, sizeBytes } = parsed.data;

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usá JPG, PNG, WebP o HEIC." },
        { status: 400 }
      );
    }
    if (sizeBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "La imagen supera el límite de 10 MB." },
        { status: 400 }
      );
    }

    const ext =
      fileName
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "webp";
    const coverId = crypto.randomUUID().slice(0, 12);
    const storageKey = `covers/${entityType}s/${entityId}/${coverId}.${ext}`;

    const db = getDb();
    let previousKey: string | null = null;

    if (entityType === "spell") {
      const [existing] = await db
        .select({ id: spells.id, imageKey: spells.imageKey })
        .from(spells)
        .where(eq(spells.id, entityId));
      if (!existing) {
        return NextResponse.json(
          { error: "Hechizo no encontrado." },
          { status: 404 }
        );
      }
      previousKey = existing.imageKey;
    } else {
      const [existing] = await db
        .select({ id: ingredients.id, imageKey: ingredients.imageKey })
        .from(ingredients)
        .where(eq(ingredients.id, entityId));
      if (!existing) {
        return NextResponse.json(
          { error: "Ingrediente no encontrado." },
          { status: 404 }
        );
      }
      previousKey = existing.imageKey;
    }

    const upload = await createPresignedUpload(storageKey, mimeType);

    if (entityType === "spell") {
      await db
        .update(spells)
        .set({ imageKey: storageKey, updatedAt: new Date() })
        .where(eq(spells.id, entityId));
    } else {
      await db
        .update(ingredients)
        .set({ imageKey: storageKey, updatedAt: new Date() })
        .where(eq(ingredients.id, entityId));
    }

    if (previousKey) {
      deleteStoredMedia(previousKey).catch(() => {});
    }

    const imageUrl = await createPresignedReadUrl(storageKey);

    return NextResponse.json(
      {
        storageKey,
        upload,
        imageUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/media/cover] error:", err);
    return NextResponse.json(
      { error: "No se pudo preparar la subida de la imagen." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");

  if (
    (entityType !== "spell" && entityType !== "ingredient") ||
    !entityId
  ) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  try {
    const db = getDb();
    let oldKey: string | null = null;

    if (entityType === "spell") {
      const [existing] = await db
        .select({ imageKey: spells.imageKey })
        .from(spells)
        .where(eq(spells.id, entityId));
      oldKey = existing?.imageKey ?? null;
      await db
        .update(spells)
        .set({ imageKey: null, updatedAt: new Date() })
        .where(eq(spells.id, entityId));
    } else {
      const [existing] = await db
        .select({ imageKey: ingredients.imageKey })
        .from(ingredients)
        .where(eq(ingredients.id, entityId));
      oldKey = existing?.imageKey ?? null;
      await db
        .update(ingredients)
        .set({ imageKey: null, updatedAt: new Date() })
        .where(eq(ingredients.id, entityId));
    }

    if (oldKey) {
      await deleteStoredMedia(oldKey);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/media/cover] error:", err);
    return NextResponse.json(
      { error: "No se pudo quitar la imagen." },
      { status: 500 }
    );
  }
}
