"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  ImageIcon,
  Layers,
  Lock,
  Plus,
  Search,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PublishNetlifyModal } from "@/components/PublishNetlifyModal";
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

  return (
    <AppShell>
      {/* Top Header */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display-heading text-3xl font-semibold text-ink sm:text-4xl">
            Mis Hechizos
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Catálogo privado con foto, disponibilidad y publicación directa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPublishOpen(true)}
            className="apple-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-info/40 bg-info-soft px-3.5 py-2.5 text-xs font-semibold text-info hover:border-info sm:text-sm"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            <span>Subir a web</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="apple-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-on-accent hover:bg-accent-hover sm:text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Hairline-divided Status Strip */}
      {data && (
        <div className="mb-5 grid grid-cols-3 divide-x divide-border-subtle rounded-2xl border border-border-subtle bg-surface">
          <div className="px-3.5 py-3 sm:px-5">
            <p className="text-xs text-ink-muted">Listos hoy</p>
            <p className="mt-0.5 tabular-nums text-2xl font-semibold text-ready sm:text-3xl">
              {summary.ready}
              <span className="ml-1 text-sm font-normal text-ink-dim">
                / {summary.total}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPublishOpen(true)}
            className="apple-press px-3.5 py-3 text-left transition hover:bg-surface-elevated sm:px-5"
          >
            <p className="text-xs text-ink-muted">En web Netlify</p>
            <p className="mt-0.5 tabular-nums text-xl font-semibold text-info sm:text-2xl">
              {summary.published}
            </p>
          </button>
          <div className="px-3.5 py-3 sm:px-5">
            <p className="text-xs text-ink-muted">Alacena</p>
            <p className="mt-0.5 tabular-nums text-xl font-semibold text-ink sm:text-2xl">
              {data.ingredients.length}
            </p>
          </div>
        </div>
      )}

      {/* Instant Search */}
      <div className="relative mb-3">
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
          className="w-full rounded-2xl border border-border-subtle bg-surface py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-dim outline-none transition focus:border-accent"
        />
      </div>

      {/* Category Chips */}
      <div className="no-scrollbar scroll-contain mb-2.5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`apple-press min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
            selectedCategory === "all"
              ? "border-accent bg-accent-soft text-accent-text font-semibold"
              : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          Todas{" "}
          <span className="tabular-nums">({data?.spells.length ?? 0})</span>
        </button>
        {(data?.categories ?? []).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`apple-press min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
              selectedCategory === cat.id
                ? "border-accent bg-accent-soft text-accent-text font-semibold"
                : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Optional Energy Filter */}
      {allEnergies.length > 0 && (
        <div className="no-scrollbar scroll-contain mb-6 flex items-center gap-1.5 overflow-x-auto pb-1">
          <Sparkles
            className="h-3.5 w-3.5 shrink-0 text-ink-dim"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => setSelectedEnergy("all")}
            className={`apple-press min-h-8 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
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
              className={`apple-press min-h-8 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                selectedEnergy === energy
                  ? "bg-accent-soft text-accent-text font-semibold"
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-border-subtle bg-surface"
            />
          ))}
        </div>
      ) : error && !data ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          No se pudo cargar el grimorio. Verificá tu conexión o sesión.
        </div>
      ) : filteredByCategory.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center">
          <p className="section-heading text-xl font-semibold text-ink">
            No encontramos hechizos con ese filtro
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Probá limpiar la búsqueda o crear un nuevo hechizo.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredByCategory.map(({ category, spells }) => (
            <section key={category.id}>
              <div className="mb-3.5 flex items-baseline justify-between border-b border-border-subtle pb-2">
                <h2 className="section-heading text-2xl font-semibold text-ink">
                  {category.name}
                </h2>
                <span className="tabular-nums text-xs text-ink-dim">
                  {spells.length} {spells.length === 1 ? "hechizo" : "hechizos"}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {spells.map((spell) => {
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
                      className="apple-press card-interactive group flex flex-col justify-between rounded-2xl border border-border-subtle bg-surface p-4"
                    >
                      {/* Top Visual Row: Cover Thumbnail + Title & Purpose */}
                      <div className="flex items-start gap-3.5">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border-subtle bg-canvas">
                          {spell.imageUrl ? (
                            <img
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
                            <h3 className="section-heading line-clamp-2 text-lg font-semibold text-ink group-hover:text-accent-text">
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
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
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
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
                        <div className="space-y-0.5 tabular-nums">
                          {spell.priceTiers.length > 0 ? (
                            spell.priceTiers.slice(0, 2).map((tier) => (
                              <p
                                key={tier.id}
                                className="text-xs font-semibold text-accent-text"
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
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated px-2 py-1 text-[11px] font-medium text-ink-muted tabular-nums">
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
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums ${
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
