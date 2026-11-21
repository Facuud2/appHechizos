"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FlaskConical,
  ImageIcon,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ExplorarBarSkeleton,
  ProgressiveImage,
} from "@/components/Skeletons";
import { useGrimorio } from "@/hooks/useGrimorioData";
import {
  evaluateVariationAvailability,
  type SpellMatchResult,
} from "@/lib/domain/matching";
import { normalizeText } from "@/lib/domain/normalize";
import { formatDualPrice } from "@/lib/format";
import type { SpellItem, SpellVariationItem } from "@/types/app";

const AWAY_MODE_KEY = "app-hechizos-away-ingredients-v1";

interface EvaluatedEntry {
  spell: SpellItem;
  variation: SpellVariationItem;
  match: SpellMatchResult;
}

export default function ExplorarMyBarPage() {
  const { data, isLoading } = useGrimorio();
  const [mode, setMode] = useState<"stock" | "away">("stock");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [focusIngredientId, setFocusIngredientId] = useState<string | null>(
    null
  );
  const [awaySelectedIds, setAwaySelectedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AWAY_MODE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setAwaySelectedIds(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AWAY_MODE_KEY, JSON.stringify(awaySelectedIds));
    } catch {
      // ignore
    }
  }, [awaySelectedIds]);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    for (const ing of data?.ingredients ?? []) map.set(ing.id, ing);
    return map;
  }, [data?.ingredients]);

  const filteredIngredients = useMemo(() => {
    const q = normalizeText(ingredientSearch);
    return (data?.ingredients ?? []).filter((ing) =>
      q
        ? ing.normalizedName.includes(q) ||
          normalizeText(ing.groupTag).includes(q)
        : true
    );
  }, [data?.ingredients, ingredientSearch]);

  const awaySet = useMemo(
    () => (mode === "away" ? new Set(awaySelectedIds) : null),
    [mode, awaySelectedIds]
  );

  const evaluated = useMemo<EvaluatedEntry[]>(() => {
    if (!data) return [];
    const results: EvaluatedEntry[] = [];

    for (const spell of data.spells) {
      for (const variation of spell.variations) {
        if (
          focusIngredientId &&
          !variation.ingredients.some(
            (vi) => vi.ingredientId === focusIngredientId
          )
        ) {
          continue;
        }

        const match = evaluateVariationAvailability(
          variation.ingredients.map((vi) => ({
            ingredientId: vi.ingredientId,
            ingredientName:
              inventoryMap.get(vi.ingredientId)?.name ?? "Ingrediente",
            quantity: vi.quantity,
            unit: vi.unit,
            isOptional: vi.isOptional,
          })),
          inventoryMap,
          awaySet
        );

        results.push({ spell, variation, match });
      }
    }

    return results.sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  }, [data, focusIngredientId, inventoryMap, awaySet]);

  const readyList = evaluated.filter((e) => e.match.tier === "ready");
  const almostList = evaluated.filter((e) => e.match.tier === "almost");
  const missingList = evaluated.filter((e) => e.match.tier === "missing");

  const focusIngredient = focusIngredientId
    ? inventoryMap.get(focusIngredientId)
    : null;

  function toggleAwayIngredient(id: string) {
    setAwaySelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <AppShell>
      <header className="mb-4">
        <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-4xl">
          My Bar Holístico
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-muted sm:text-sm">
          Buscá por ingrediente o tildá lo que tenés a mano para improvisar
          desde una base
        </p>
      </header>

      {/* Mode Switcher: Real Stock vs Fuera del Altar (Sliding Concentric Segmented Control: outer 14px - 4px pad = 10px inner) */}
      <div
        role="tablist"
        aria-label="Modo de evaluación de stock"
        className="relative mb-3.5 grid w-full grid-cols-2 rounded-[14px] border border-border-subtle bg-surface p-1 sm:max-w-md"
      >
        <span
          aria-hidden="true"
          style={{
            transform: mode === "away" ? "translateX(100%)" : "translateX(0%)",
          }}
          className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[10px] bg-accent transition-transform duration-[200ms] ease-[var(--ease-in-out)]"
        />

        <button
          type="button"
          role="tab"
          aria-selected={mode === "stock"}
          onClick={() => setMode("stock")}
          className={`apple-press relative z-10 min-h-9 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors duration-[160ms] ${
            mode === "stock"
              ? "text-on-accent"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Mi Stock Real
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "away"}
          onClick={() => setMode("away")}
          className={`apple-press relative z-10 min-h-9 rounded-[10px] px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors duration-[160ms] ${
            mode === "away"
              ? "text-on-accent"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Fuera del altar ({awaySelectedIds.length})
        </button>
      </div>

      {/* Ingredient Search & Picker */}
      <div className="mb-5 rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4">
        <div className="relative mb-2.5">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            aria-hidden="true"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={ingredientSearch}
            onChange={(e) => setIngredientSearch(e.target.value)}
            placeholder={
              mode === "away"
                ? "Buscar ingredientes que tenés a mano ahora (ej. romero, miel)..."
                : "Buscar ingrediente para ver qué hechizos lo usan (ej. romero)..."
            }
            className="w-full rounded-[11px] border border-border-subtle bg-canvas py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
          />
          {ingredientSearch && (
            <button
              type="button"
              onClick={() => setIngredientSearch("")}
              aria-label="Limpiar búsqueda de ingrediente"
              className="apple-press hit-44 absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-dim hover:bg-surface-elevated hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {isLoading && !data ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {[88, 104, 76, 98, 112, 84, 92, 78].map((w, idx) => (
              <div
                key={idx}
                style={{ width: `${w}px` }}
                className="skeleton-shimmer h-9 rounded-full"
              />
            ))}
          </div>
        ) : mode === "away" ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted">
                Tildá lo que tenés a mano (no modifica tu stock real):
              </span>
              {awaySelectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAwaySelectedIds([])}
                  className="apple-press inline-flex items-center gap-1 text-xs font-medium text-ink-dim hover:text-accent-text"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                  Limpiar
                </button>
              )}
            </div>
            <div className="scroll-contain flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
              {filteredIngredients.map((ing) => {
                const selected = awaySelectedIds.includes(ing.id);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAwayIngredient(ing.id)}
                    className={`apple-press inline-flex min-h-9 items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-xs font-medium ${
                      selected
                        ? "border-ready bg-ready-soft font-semibold text-ready"
                        : "border-border-subtle bg-canvas text-ink-muted hover:border-border-strong hover:text-ink"
                    }`}
                  >
                    {ing.imageUrl ? (
                      <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
                        <ProgressiveImage
                          src={ing.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface">
                        {selected ? (
                          <Check
                            className="animate-check-pop h-3 w-3"
                            aria-hidden="true"
                          />
                        ) : (
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                    )}
                    <span>{ing.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted">
                Tocá un ingrediente para filtrar los hechizos que lo usan:
              </span>
              {focusIngredient && (
                <button
                  type="button"
                  onClick={() => setFocusIngredientId(null)}
                  className="text-xs font-semibold text-accent-text hover:underline"
                >
                  Quitar filtro ({focusIngredient.name})
                </button>
              )}
            </div>
            <div className="scroll-contain flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
              {filteredIngredients.map((ing) => {
                const active = focusIngredientId === ing.id;
                return (
                  <button
                    key={ing.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setFocusIngredientId(active ? null : ing.id)
                    }
                    className={`apple-press inline-flex min-h-9 items-center gap-1.5 rounded-full border py-1 text-xs ${
                      ing.imageUrl ? "pl-1.5 pr-3" : "px-3"
                    } ${
                      active
                        ? "border-accent bg-accent-soft font-semibold text-accent-text"
                        : "border-border-subtle bg-canvas text-ink-muted hover:border-border-strong hover:text-ink"
                    }`}
                  >
                    {ing.imageUrl && (
                      <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
                        <ProgressiveImage
                          src={ing.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <span>{ing.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading && !data ? (
        <ExplorarBarSkeleton includePicker={false} />
      ) : (
        <div key={mode} className="animate-variation-enter space-y-6 sm:space-y-7">
          {/* Ready 100% */}
          <section>
            <div className="mb-2.5 flex items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 text-ready"
                aria-hidden="true"
              />
              <h2 className="section-heading text-[18px] font-semibold text-ink sm:text-2xl">
                Listos para hacer{" "}
                <span className="tabular-nums text-ink-muted">
                  ({readyList.length})
                </span>
              </h2>
            </div>

            {readyList.length === 0 ? (
              <p className="rounded-[16px] border border-border-subtle bg-surface p-3.5 text-sm text-ink-muted sm:p-4">
                {mode === "away"
                  ? "Tildá los ingredientes que tenés disponibles arriba para ver qué hechizos podés hacer completos."
                  : "Ningún hechizo está al 100% con ese filtro."}
              </p>
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {readyList.map(({ spell, variation }, idx) => (
                  <Link
                    key={variation.id}
                    href={`/hechizos/${spell.id}?var=${variation.id}`}
                    style={
                      !focusIngredientId
                        ? ({ "--stagger-idx": idx } as CSSProperties)
                        : undefined
                    }
                    className={`${
                      !focusIngredientId ? "animate-stagger-item" : ""
                    } apple-press card-interactive flex min-w-0 items-start gap-3 rounded-[16px] border border-ready/35 bg-surface p-3.5 sm:p-4`}
                  >
                    <div className="h-15 w-15 shrink-0 overflow-hidden rounded-[10px] border border-border-subtle bg-canvas sm:h-16 sm:w-16">
                      {spell.imageUrl ? (
                        <ProgressiveImage
                          src={spell.imageUrl}
                          alt={spell.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-ready-soft/60 text-ready">
                          <ImageIcon className="h-5 w-5" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="section-heading line-clamp-2 text-[16px] font-semibold text-ink sm:text-lg">
                          {spell.title}
                        </h3>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-medium text-ready">
                        {variation.name} · 100% listo
                      </p>
                      {spell.priceTiers[0] && (
                        <p className="mt-1.5 whitespace-nowrap tabular-nums text-xs font-semibold text-accent-text">
                          {formatDualPrice(
                            spell.priceTiers[0].priceArs,
                            spell.priceTiers[0].priceUsd
                          )}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Missing 1-2 */}
          <section>
            <div className="mb-2.5 flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4 text-warn"
                aria-hidden="true"
              />
              <h2 className="section-heading text-[18px] font-semibold text-ink sm:text-2xl">
                Te faltan 1 o 2 elementos{" "}
                <span className="tabular-nums text-ink-muted">
                  ({almostList.length})
                </span>
              </h2>
            </div>

            {almostList.length === 0 ? (
              <p className="rounded-[16px] border border-border-subtle bg-surface p-3.5 text-sm text-ink-muted sm:p-4">
                Sin coincidencias parciales por ahora.
              </p>
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {almostList.map(({ spell, variation, match }) => (
                  <div
                    key={variation.id}
                    className="flex min-w-0 flex-col justify-between rounded-[16px] border border-warn/35 bg-surface p-3.5 sm:p-4"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/hechizos/${spell.id}?var=${variation.id}`}
                          className="h-15 w-15 shrink-0 overflow-hidden rounded-[10px] border border-border-subtle bg-canvas sm:h-16 sm:w-16"
                        >
                          {spell.imageUrl ? (
                            <ProgressiveImage
                              src={spell.imageUrl}
                              alt={spell.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-warn-soft/70 text-warn">
                              <ImageIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/hechizos/${spell.id}?var=${variation.id}`}
                              className="section-heading line-clamp-2 text-[16px] font-semibold text-ink hover:text-accent-text sm:text-lg"
                            >
                              {spell.title}
                            </Link>
                            <span className="shrink-0 rounded-md bg-warn-soft px-2 py-0.5 tabular-nums text-xs font-semibold text-warn">
                              {match.matchPercent}%
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-ink-muted">
                            {variation.name}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-ink-dim">Falta:</span>
                        {match.missingRequired.map((m) => (
                          <span
                            key={m.ingredientId}
                            className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger"
                          >
                            {m.ingredientName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2.5">
                      <Link
                        href={`/hechizos/${spell.id}?var=${variation.id}`}
                        className="hit-44 text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        Ver receta
                      </Link>
                      <Link
                        href={`/hechizos/${spell.id}?var=${variation.id}&improvise=1`}
                        className="apple-press hit-44 inline-flex items-center gap-1 rounded-[8px] bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent hover:text-on-accent"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Improvisar variación
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Missing 3+ (only shown if searching specific ingredient) */}
          {focusIngredient && missingList.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <FlaskConical
                  className="h-4 w-4 text-ink-dim"
                  aria-hidden="true"
                />
                <h2 className="section-heading text-[17px] font-semibold text-ink-muted sm:text-xl">
                  Otros que usan {focusIngredient.name}{" "}
                  <span className="tabular-nums">({missingList.length})</span>
                </h2>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {missingList.map(({ spell, variation, match }) => (
                  <Link
                    key={variation.id}
                    href={`/hechizos/${spell.id}?var=${variation.id}`}
                    className="apple-press card-interactive flex min-w-0 items-center gap-3 rounded-[16px] border border-border-subtle bg-surface p-3.5"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border border-border-subtle bg-canvas">
                      {spell.imageUrl ? (
                        <ProgressiveImage
                          src={spell.imageUrl}
                          alt={spell.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-elevated text-ink-dim">
                          <ImageIcon className="h-4 w-4" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="section-heading truncate text-[16px] font-semibold text-ink sm:text-lg">
                        {spell.title}
                      </p>
                      <p className="mt-0.5 truncate tabular-nums text-xs text-ink-dim">
                        {variation.name} · Faltan {match.missingRequired.length}{" "}
                        elementos
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
