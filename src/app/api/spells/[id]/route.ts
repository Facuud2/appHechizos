import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/db";
import { spells, spellPriceTiers } from "@/db/schema";
import { requireOwnerSession } from "@/lib/auth/guard";

const updateSpellSchema = z.object({
  categoryId: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  subtitleTag: z.string().trim().max(200).nullable().optional(),
  purpose: z.string().trim().max(500).nullable().optional(),
  energyTypes: z.array(z.string().trim().min(1)).optional(),
  publicDescription: z.string().trim().max(2000).nullable().optional(),
  privateNotes: z.string().trim().max(5000).nullable().optional(),
  isPublished: z.boolean().optional(),
  isOffer: z.boolean().optional(),
  offerLabel: z.string().trim().max(40).nullable().optional(),
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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwnerSession();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = updateSpellSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { priceTiers, ...spellFields } = parsed.data;
    const db = getDb();

    await db
      .update(spells)
      .set({
        ...spellFields,
        updatedAt: new Date(),
      })
      .where(eq(spells.id, id));

    if (priceTiers !== undefined) {
      await db.delete(spellPriceTiers).where(eq(spellPriceTiers.spellId, id));
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

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[PATCH /api/spells/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el hechizo." },
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
    await db.delete(spells).where(eq(spells.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[DELETE /api/spells/:id] error:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el hechizo." },
      { status: 500 }
    );
  }
}
