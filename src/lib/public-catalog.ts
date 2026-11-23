import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, spells, spellPriceTiers } from "@/db/schema";

export interface PublicPriceTierDTO {
  label: string;
  priceArs: number;
  priceUsd: number;
  regularPriceArs: number | null;
  regularPriceUsd: number | null;
  discountPercent: number | null;
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
        purpose: spells.purpose,
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
        regularPriceArs: spellPriceTiers.regularPriceArs,
        regularPriceUsd: spellPriceTiers.regularPriceUsd,
        discountPercent: spellPriceTiers.discountPercent,
        sortOrder: spellPriceTiers.sortOrder,
      })
      .from(spellPriceTiers)
      .orderBy(asc(spellPriceTiers.sortOrder)),
  ]);

  const tiersBySpell = new Map<string, PublicPriceTierDTO[]>();
  for (const t of tiers) {
    const arr = tiersBySpell.get(t.spellId) ?? [];
    const computedDiscount =
      t.discountPercent !== null && t.discountPercent !== undefined
        ? t.discountPercent
        : t.regularPriceArs && t.regularPriceArs > t.priceArs
          ? Math.round(((t.regularPriceArs - t.priceArs) / t.regularPriceArs) * 100)
          : t.regularPriceUsd && t.regularPriceUsd > t.priceUsd
            ? Math.round(((t.regularPriceUsd - t.priceUsd) / t.regularPriceUsd) * 100)
            : null;

    arr.push({
      label: t.label,
      priceArs: t.priceArs,
      priceUsd: t.priceUsd,
      regularPriceArs:
        t.regularPriceArs && t.regularPriceArs > t.priceArs
          ? t.regularPriceArs
          : null,
      regularPriceUsd:
        t.regularPriceUsd && t.regularPriceUsd > t.priceUsd
          ? t.regularPriceUsd
          : null,
      discountPercent: computedDiscount,
    });
    tiersBySpell.set(t.spellId, arr);
  }

  const mapSpellToDTO = (s: (typeof publishedSpells)[number]): PublicSpellDTO => ({
    id: s.id,
    title: s.title,
    subtitleTag: s.subtitleTag,
    description: s.publicDescription || s.purpose || null,
    isOffer: s.isOffer,
    offerLabel: s.isOffer ? s.offerLabel || "¡OFERTA!" : null,
    prices: tiersBySpell.get(s.id) ?? [],
  });

  const knownCatIds = new Set(cats.map((c) => c.id));

  const publicCategories: PublicCategoryDTO[] = cats
    .map((cat) => {
      const catSpells = publishedSpells
        .filter((s) => s.categoryId === cat.id)
        .map<PublicSpellDTO>(mapSpellToDTO);

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        intro: cat.publicIntro,
        spells: catSpells,
      };
    })
    .filter((cat) => cat.spells.length > 0);

  const uncategorizedSpells = publishedSpells
    .filter((s) => !s.categoryId || !knownCatIds.has(s.categoryId))
    .map<PublicSpellDTO>(mapSpellToDTO);

  if (uncategorizedSpells.length > 0) {
    publicCategories.push({
      id: "cat-otros",
      name: "Otros Hechizos",
      slug: "otros-hechizos",
      intro: null,
      spells: uncategorizedSpells,
    });
  }

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

  const isNetlifyPreview =
    !!origin && /^https:\/\/[a-z0-9-]+--tarotdeluna\.netlify\.app$/i.test(origin);
  const isLocalhost =
    !!origin && /^http:\/\/localhost(:\d+)?$/i.test(origin);

  const matchedOrigin =
    origin && (allowed.includes(origin) || isNetlifyPreview || isLocalhost)
      ? origin
      : "*";

  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cache-Control, Pragma",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Vary: "Origin",
  };
}
