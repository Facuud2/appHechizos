import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, spells, spellPriceTiers } from "@/db/schema";

export interface PublicPriceTierDTO {
  label: string;
  priceArs: number;
  priceUsd: number;
}

export interface PublicSpellDTO {
  id: string;
  title: string;
  subtitleTag: string | null;
  description: string | null;
  isOffer: boolean;
  offerLabel: string | null;
  prices: PublicPriceTierDTO[];
}

export interface PublicCategoryDTO {
  id: string;
  name: string;
  slug: string;
  intro: string | null;
  spells: PublicSpellDTO[];
}

export interface PublicCatalogResponse {
  updatedAt: string;
  categories: PublicCategoryDTO[];
}

/**
 * Strictly whitelisted public projection for tarotdeluna.netlify.app.
 * NEVER selects or returns ingredients, unit costs, privateNotes, steps, or media.
 */
export async function getPublicCatalog(): Promise<PublicCatalogResponse> {
  const db = getDb();

  const [cats, publishedSpells, tiers] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        publicIntro: categories.publicIntro,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({
        id: spells.id,
        categoryId: spells.categoryId,
        title: spells.title,
        subtitleTag: spells.subtitleTag,
        publicDescription: spells.publicDescription,
        isOffer: spells.isOffer,
        offerLabel: spells.offerLabel,
        sortOrder: spells.sortOrder,
      })
      .from(spells)
      .where(eq(spells.isPublished, true))
      .orderBy(asc(spells.sortOrder), asc(spells.title)),
    db
      .select({
        spellId: spellPriceTiers.spellId,
        label: spellPriceTiers.label,
        priceArs: spellPriceTiers.priceArs,
        priceUsd: spellPriceTiers.priceUsd,
        sortOrder: spellPriceTiers.sortOrder,
      })
      .from(spellPriceTiers)
      .orderBy(asc(spellPriceTiers.sortOrder)),
  ]);

  const tiersBySpell = new Map<string, PublicPriceTierDTO[]>();
  for (const t of tiers) {
    const arr = tiersBySpell.get(t.spellId) ?? [];
    arr.push({
      label: t.label,
      priceArs: t.priceArs,
      priceUsd: t.priceUsd,
    });
    tiersBySpell.set(t.spellId, arr);
  }

  const publicCategories: PublicCategoryDTO[] = cats
    .map((cat) => {
      const catSpells = publishedSpells
        .filter((s) => s.categoryId === cat.id)
        .map<PublicSpellDTO>((s) => ({
          id: s.id,
          title: s.title,
          subtitleTag: s.subtitleTag,
          description: s.publicDescription,
          isOffer: s.isOffer,
          offerLabel: s.isOffer ? s.offerLabel || "¡OFERTA!" : null,
          prices: tiersBySpell.get(s.id) ?? [],
        }));

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        intro: cat.publicIntro,
        spells: catSpells,
      };
    })
    .filter((cat) => cat.spells.length > 0);

  return {
    updatedAt: new Date().toISOString(),
    categories: publicCategories,
  };
}

export function buildPublicCatalogCorsHeaders(origin: string | null): HeadersInit {
  const allowed = (
    process.env.PUBLIC_CATALOG_ORIGINS ||
    "https://tarotdeluna.netlify.app,http://localhost:5173"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedOrigin =
    origin && allowed.includes(origin) ? origin : allowed[0] || "*";

  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    Vary: "Origin",
  };
}
