import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { stepMedia } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";
import {
  createPresignedReadUrl,
  createPresignedUpload,
  validateMediaUpload,
} from "@/lib/storage";

const presignSchema = z.object({
  stepId: z.string().min(1),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  caption: z.string().trim().max(240).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { stepId, fileName, mimeType, sizeBytes, caption } = parsed.data;
    const validation = validateMediaUpload(mimeType, sizeBytes);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const mediaId = `med-${crypto.randomUUID().slice(0, 12)}`;
    const storageKey = `steps/${stepId}/${mediaId}.${ext}`;

    const upload = await createPresignedUpload(storageKey, mimeType);
    const db = getDb();

    await db.insert(stepMedia).values({
      id: mediaId,
      stepId,
      storageKey,
      mediaType: validation.mediaType,
      mimeType,
      sizeBytes,
      caption: caption ?? null,
      sortOrder: 0,
    });

    const signedUrl = await createPresignedReadUrl(storageKey);

    return NextResponse.json(
      {
        mediaId,
        storageKey,
        mediaType: validation.mediaType,
        upload,
        signedUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/media/presign-upload] error:", err);
    return NextResponse.json(
      { error: "No se pudo preparar la subida del archivo." },
      { status: 500 }
    );
  }
}
