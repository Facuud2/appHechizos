"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  ImageIcon,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PublishNetlifyModal } from "@/components/PublishNetlifyModal";
import {
  HomeGrimorioSkeleton,
  ProgressiveImage,
} from "@/components/Skeletons";
import { SpellFormModal } from "@/components/SpellFormModal";
import { useGrimorio } from "@/hooks/useGrimorioData";
import { evaluateVariationAvailability } from "@/lib/domain/matching";
import { normalizeText } from "@/lib/domain/normalize";
import { formatDualPrice } from "@/lib/format";

export default function HomePage() {
  const { data, isLoading, error } = useGrimorio();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedEnergy, setSelectedEnergy] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    for (const ing of data?.ingredients ?? []) {
      map.set(ing.id, ing);
    }
    return map;
  }, [data?.ingredients]);

  const allEnergies = useMemo(() => {
    const set = new Set<string>();
    for (const s of data?.spells ?? []) {
      for (const e of s.energyTypes) set.add(e);
    }
    return Array.from(set).sort();
  }, [data?.spells]);

  const summary = useMemo(() => {
    const spells = data?.spells ?? [];
    let readyCount = 0;
    let publishedCount = 0;
    for (const spell of spells) {
      if (spell.isPublished) publishedCount++;
      const baseVar =
        spell.variations.find((v) => v.isBase) ?? spell.variations[0];
      if (baseVar && baseVar.ingredients.length > 0) {
        const res = evaluateVariationAvailability(
          baseVar.ingredients.map((vi) => ({
            ingredientId: vi.ingredientId,
            ingredientName: inventoryMap.get(vi.ingredientId)?.name ?? "",
            quantity: vi.quantity,
            unit: vi.unit,
            isOptional: vi.isOptional,
          })),
          inventoryMap
        );
        if (res.tier === "ready") readyCount++;
      }
    }
    return {
      total: spells.length,
      ready: readyCount,
      published: publishedCount,
    };
  }, [data?.spells, inventoryMap]);

  const filteredByCategory = useMemo(() => {
    if (!data) return [];
    const q = normalizeText(search);

    const matchingSpells = data.spells.filter((spell) => {
      if (selectedCategory !== "all" && spell.categoryId !== selectedCategory) {
        return false;
      }
      if (
        selectedEnergy !== "all" &&
        !spell.energyTypes.includes(selectedEnergy)
      ) {
        return false;
      }
      if (!q) return true;

      const haystack = normalizeText(
        [
          spell.title,
          spell.purpose ?? "",
          spell.subtitleTag ?? "",
          spell.energyTypes.join(" "),
          ...spell.variations.flatMap((v) => [
            v.name,
            ...v.ingredients.map(
              (vi) => inventoryMap.get(vi.ingredientId)?.name ?? ""
            ),
          ]),
        ].join(" ")
      );
      return haystack.includes(q);
    });

    const groups = data.categories
      .map((cat) => ({
        category: cat,
        spells: matchingSpells.filter((s) => s.categoryId === cat.id),
      }))
      .filter((g) => g.spells.length > 0);

    const uncategorized = matchingSpells.filter((s) => !s.categoryId);
    if (uncategorized.length > 0) {
      groups.push({
        category: {
          id: "uncategorized",
          name: "Sin categoría",
          slug: "sin-categoria",
          publicIntro: null,
          sortOrder: 999,
        },
        spells: uncategorized,
      });
    }

    return groups;
  }, [data, search, selectedCategory, selectedEnergy, inventoryMap]);

  const isFiltering =
    search.trim().length > 0 ||
    selectedCategory !== "all" ||
    selectedEnergy !== "all";

  return (
    <AppShell>
      {/* Top Header */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-4xl">
            Mis Hechizos
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted sm:text-sm">
            Catálogo privado con foto, disponibilidad y publicación directa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPublishOpen(true)}
            className="apple-press hit-44 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-info/40 bg-info-soft px-3 py-2 text-xs font-semibold text-info hover:border-info sm:min-h-11 sm:px-3.5 sm:text-sm"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            <span>Subir a web</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="apple-press hit-44 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent hover:bg-accent-hover sm:min-h-11 sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Hairline-divided Status Strip (or Zero-CLS Skeleton while loading) */}
      {isLoading && !data ? (
        <div className="mb-4 grid grid-cols-3 divide-x divide-border-subtle rounded-[16px] border border-border-subtle bg-surface">
          {[0, 1, 2].map((col) => (
            <div key={col} className="px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="skeleton-shimmer h-3 w-14 rounded-md" />
              <div className="skeleton-shimmer mt-2 h-6 w-12 rounded-lg sm:h-7" />
            </div>
          ))}
        </div>
      ) : (
        data && (
          <div className="mb-4 grid grid-cols-3 divide-x divide-border-subtle rounded-[16px] border border-border-subtle bg-surface">
            <div className="px-3 py-2.5 sm:px-5 sm:py-3">
              <p className="text-xs text-ink-muted">Listos hoy</p>
              <p className="mt-0.5 whitespace-nowrap tabular-nums text-[24px] font-bold leading-none tracking-[-0.03em] text-ready sm:text-[28px]">
                {summary.ready}
                <span className="ml-1 text-xs font-normal tracking-normal text-ink-dim sm:text-sm">
                  / {summary.total}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="apple-press px-3 py-2.5 text-left transition hover:bg-surface-elevated sm:px-5 sm:py-3"
            >
              <p className="text-xs text-ink-muted">En web Netlify</p>
              <p className="mt-0.5 whitespace-nowrap tabular-nums text-[24px] font-bold leading-none tracking-[-0.03em] text-info sm:text-[28px]">
                {summary.published}
              </p>
            </button>
            <Link
              href="/stock"
              className="apple-press block px-3 py-2.5 text-left transition hover:bg-surface-elevated sm:px-5 sm:py-3"
            >
              <p className="text-xs text-ink-muted">Alacena</p>
              <p className="mt-0.5 whitespace-nowrap tabular-nums text-[24px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[28px]">
                {data.ingredients.length}
              </p>
            </Link>
          </div>
        )
      )}

      {/* Instant Search */}
      <div className="relative mb-2.5">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
          aria-hidden="true"
        />
        <input
          type="search"
          enterKeyHint="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por hechizo, finalidad, energía o ingrediente..."
          className="w-full rounded-[14px] border border-border-subtle bg-surface py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-ink-dim outline-none transition focus:border-accent"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Limpiar búsqueda"
            className="apple-press hit-44 absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-dim hover:bg-surface-elevated hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category Chips (Horizontal Carousel with Edge Fade) */}
      <div className="ios-carousel scroll-contain mb-2 pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`apple-press hit-44 min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
            selectedCategory === "all"
              ? "border-accent bg-accent-soft font-semibold text-accent-text"
              : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          Todas{" "}
          <span className="tabular-nums">({data?.spells.length ?? 0})</span>
        </button>
        {isLoading && !data
          ? [92, 108, 86, 98].map((w, idx) => (
              <div
                key={idx}
                style={{ width: `${w}px` }}
                className="skeleton-shimmer h-9 shrink-0 rounded-full border border-border-subtle"
              />
            ))
          : (data?.categories ?? []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`apple-press hit-44 min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                  selectedCategory === cat.id
                    ? "border-accent bg-accent-soft font-semibold text-accent-text"
                    : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
                }`}
              >
                {cat.name}
              </button>
            ))}
      </div>

      {/* Optional Energy Filter */}
      {allEnergies.length > 0 && (
        <div className="ios-carousel scroll-contain mb-5 items-center pb-1">
          <Sparkles
            className="h-3.5 w-3.5 shrink-0 text-ink-dim"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => setSelectedEnergy("all")}
            className={`apple-press hit-44 min-h-8 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
              selectedEnergy === "all"
                ? "bg-surface-elevated text-ink"
                : "text-ink-dim hover:text-ink-muted"
            }`}
          >
            Todas las energías
          </button>
          {allEnergies.map((energy) => (
            <button
              key={energy}
              type="button"
              onClick={() =>
                setSelectedEnergy(selectedEnergy === energy ? "all" : energy)
              }
              className={`apple-press hit-44 min-h-8 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                selectedEnergy === energy
                  ? "bg-accent-soft font-semibold text-accent-text"
                  : "text-ink-muted hover:bg-surface-elevated hover:text-ink"
              }`}
            >
              {energy}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading && !data ? (
        <HomeGrimorioSkeleton includeStatusAndFilters={false} />
      ) : error && !data ? (
        <div
          role="alert"
          className="animate-error-shake rounded-[16px] border border-danger/35 bg-danger-soft p-4 text-sm text-danger"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {error instanceof Error
                  ? error.message
                  : "No se pudo cargar el grimorio."}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Link
                  href="/auth/sign-in"
                  className="apple-press hit-44 inline-flex min-h-9 items-center rounded-[10px] border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Ir a Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : filteredByCategory.length === 0 ? (
        <div className="animate-variation-enter rounded-[16px] border border-border-subtle bg-surface p-5 text-center sm:p-8">
          <p className="section-heading text-[18px] font-semibold text-ink sm:text-xl">
            No encontramos hechizos con ese filtro
          </p>
          <p className="mt-1 text-[13px] text-ink-muted sm:text-sm">
            Probá limpiar la búsqueda o crear un nuevo hechizo en segundos.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedEnergy("all");
                }}
                className="apple-press inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-canvas px-3.5 py-2 text-xs font-semibold text-ink hover:border-border-strong"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Limpiar filtros</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="apple-press inline-flex min-h-10 items-center gap-1.5 rounded-[12px] bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Crear hechizo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {filteredByCategory.map(({ category, spells }) => (
            <section key={category.id}>
              <div className="mb-3 flex items-baseline justify-between border-b border-border-subtle pb-1.5">
                <h2 className="section-heading text-[18px] font-semibold text-ink sm:text-2xl">
                  {category.name}
                </h2>
                <span className="tabular-nums text-xs text-ink-dim">
                  {spells.length} {spells.length === 1 ? "hechizo" : "hechizos"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {spells.map((spell, idx) => {
                  const baseVar =
                    spell.variations.find((v) => v.isBase) ??
                    spell.variations[0];
                  const match = baseVar
                    ? evaluateVariationAvailability(
                        baseVar.ingredients.map((vi) => ({
                          ingredientId: vi.ingredientId,
                          ingredientName:
                            inventoryMap.get(vi.ingredientId)?.name ?? "",
                          quantity: vi.quantity,
                          unit: vi.unit,
                          isOptional: vi.isOptional,
                        })),
                        inventoryMap
                      )
                    : null;

                  const extraVariations = Math.max(
                    0,
                    spell.variations.length - 1
                  );

                  return (
                    <Link
                      key={spell.id}
                      href={`/hechizos/${spell.id}`}
                      style={
                        !isFiltering
                          ? ({ "--stagger-idx": idx } as CSSProperties)
                          : undefined
                      }
                      className={`${
                        !isFiltering ? "animate-stagger-item" : ""
                      } apple-press card-interactive group flex flex-col justify-between rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4`}
                    >
                      {/* Top Visual Row: Cover Thumbnail (Concentric r=10px inside r=16px) + Title & Purpose */}
                      <div className="flex items-start gap-3">
                        <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-[10px] border border-border-subtle bg-canvas sm:h-20 sm:w-20">
                          {spell.imageUrl ? (
                            <ProgressiveImage
                              src={spell.imageUrl}
                              alt={spell.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-accent-soft/55 text-accent-text/75">
                              <ImageIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="section-heading line-clamp-2 text-[16px] font-semibold leading-snug text-ink group-hover:text-accent-text sm:text-lg">
                              {spell.title}
                            </h3>
                            <span
                              title={
                                spell.isPublished
                                  ? "Publicado en tarotdeluna.netlify.app"
                                  : "Solo privado"
                              }
                              aria-label={
                                spell.isPublished
                                  ? "Publicado en web"
                                  : "Solo privado"
                              }
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7 ${
                                spell.isPublished
                                  ? "bg-info-soft text-info"
                                  : "bg-surface-elevated text-ink-dim"
                              }`}
                            >
                              {spell.isPublished ? (
                                <Globe
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Lock
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                          </div>

                          {spell.purpose && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                              {spell.purpose}
                            </p>
                          )}

                          {spell.isOffer && (
                            <span className="mt-1.5 inline-block rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-on-accent">
                              {spell.offerLabel || "OFERTA"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Metadata & Availability Footer */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                        <div className="space-y-0.5 tabular-nums">
                          {spell.priceTiers.length > 0 ? (
                            spell.priceTiers.slice(0, 2).map((tier) => (
                              <p
                                key={tier.id}
                                className="whitespace-nowrap text-xs font-semibold text-accent-text"
                              >
                                {tier.label ? `${tier.label}: ` : ""}
                                {formatDualPrice(tier.priceArs, tier.priceUsd)}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-ink-dim">Sin precio</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {extraVariations > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-[8px] bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-ink-muted tabular-nums">
                              <Layers
                                className="h-3 w-3 text-accent-text"
                                aria-hidden="true"
                              />
                              +{extraVariations}
                            </span>
                          )}

                          {match &&
                            baseVar &&
                            baseVar.ingredients.length > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                                  match.tier === "ready"
                                    ? "bg-ready-soft text-ready"
                                    : match.tier === "almost"
                                      ? "bg-warn-soft text-warn"
                                      : "bg-danger-soft text-danger"
                                }`}
                              >
                                {match.tier === "ready" ? (
                                  <>
                                    <CheckCircle2
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />{" "}
                                    Listo
                                  </>
                                ) : match.tier === "almost" ? (
                                  <>
                                    <AlertCircle
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />{" "}
                                    Falta {match.missingRequired.length}
                                  </>
                                ) : (
                                  <>
                                    <XCircle
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />{" "}
                                    Faltan {match.missingRequired.length}
                                  </>
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <SpellFormModal
        open={createOpen}
        categories={data?.categories ?? []}
        onClose={() => setCreateOpen(false)}
      />

      <PublishNetlifyModal
        open={publishOpen}
        spells={data?.spells ?? []}
        onClose={() => setPublishOpen(false)}
      />
    </AppShell>
  );
}
