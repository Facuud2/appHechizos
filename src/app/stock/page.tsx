"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Ban,
  BookOpen,
  Camera,
  DollarSign,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuickIngredientModal } from "@/components/QuickIngredientModal";
import {
  useDeleteIngredient,
  useGrimorio,
  useInvalidateGrimorio,
  useUpdateIngredient,
} from "@/hooks/useGrimorioData";
import { normalizeText } from "@/lib/domain/normalize";
import { formatArs } from "@/lib/format";
import { uploadEntityCover } from "@/lib/upload-cover";
import { UNIT_LABELS, type IngredientItem } from "@/types/app";

/** Inline exact-number + stepper control; locked when "Sin stock" is active */
function StockQtyEditor({
  ingredient,
  disabled,
  onCommit,
  onStep,
}: {
  ingredient: IngredientItem;
  disabled: boolean;
  onCommit: (nextQty: number) => void;
  onStep: (delta: number) => void;
}) {
  const [draft, setDraft] = useState(String(ingredient.stockQty ?? 0));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(ingredient.stockQty ?? 0));
    }
  }, [ingredient.stockQty, focused]);

  function commitValue() {
    setFocused(false);
    const parsed = draft.trim() === "" ? 0 : Number(draft);
    if (Number.isNaN(parsed) || parsed < 0) {
      setDraft(String(ingredient.stockQty ?? 0));
      return;
    }
    const rounded = Math.round(parsed * 100) / 100;
    if (rounded !== (ingredient.stockQty ?? 0)) {
      onCommit(rounded);
    }
  }

  return (
    <div
      className={`flex max-w-full items-center rounded-xl border border-border-subtle bg-canvas transition ${
        disabled ? "opacity-45" : ""
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStep(-1)}
        aria-label={`Restar ${ingredient.name}`}
        className="apple-press flex h-10 w-9 shrink-0 items-center justify-center text-ink-muted hover:text-ink disabled:pointer-events-none"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-center gap-1 px-0.5">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          disabled={disabled}
          aria-label={`Cantidad exacta de ${ingredient.name}`}
          value={disabled ? "0" : draft}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(String(ingredient.stockQty ?? 0));
              setFocused(false);
              e.currentTarget.blur();
            }
          }}
          className="w-14 rounded-lg bg-surface px-1 py-1 text-center tabular-nums text-sm font-semibold text-ink outline-none ring-1 ring-transparent focus:ring-accent disabled:bg-transparent"
        />
        <span className="shrink-0 pr-1 text-xs font-medium text-ink-dim">
          {UNIT_LABELS[ingredient.unitType]}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onStep(1)}
        aria-label={`Sumar ${ingredient.name}`}
        className="apple-press flex h-10 w-9 shrink-0 items-center justify-center text-ink-muted hover:text-ink disabled:pointer-events-none"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Inline cost editor that ALWAYS closes when clicking/tapping outside or pressing Escape */
function CostInlineEditor({
  ingredient,
  onSave,
}: {
  ingredient: IngredientItem;
  onSave: (val: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    function handleOutside(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
      }
    }
    document.addEventListener("pointerdown", handleOutside, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
    };
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (Number.isNaN(next) || next < 0)) {
      setEditing(false);
      return;
    }
    onSave(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <span
        ref={containerRef}
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-canvas p-1"
      >
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setEditing(false);
          }}
          placeholder="ARS"
          className="w-20 bg-transparent px-1.5 py-0.5 tabular-nums text-xs font-medium text-ink outline-none"
        />
        <button
          type="button"
          onClick={commit}
          className="apple-press rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent"
        >
          OK
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(
          ingredient.unitCostArs !== null ? String(ingredient.unitCostArs) : ""
        );
        setEditing(true);
      }}
      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 tabular-nums text-xs font-medium text-ink-muted hover:bg-surface-elevated hover:text-accent-text"
    >
      <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
      {ingredient.unitCostArs !== null
        ? `${formatArs(ingredient.unitCostArs)}/${UNIT_LABELS[ingredient.unitType]}`
        : "Cargar costo"}
    </button>
  );
}

export default function StockAlacenaPage() {
  const { data, isLoading } = useGrimorio();
  const invalidate = useInvalidateGrimorio();
  const updateMut = useUpdateIngredient();
  const deleteMut = useDeleteIngredient();

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [onlyOut, setOnlyOut] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const ing of data?.ingredients ?? []) set.add(ing.groupTag);
    return Array.from(set).sort();
  }, [data?.ingredients]);

  const spellsByIngredient = useMemo(() => {
    const map = new Map<string, { spellId: string; title: string }[]>();
    for (const spell of data?.spells ?? []) {
      const seenForSpell = new Set<string>();
      for (const v of spell.variations) {
        for (const vi of v.ingredients) {
          if (seenForSpell.has(vi.ingredientId)) continue;
          seenForSpell.add(vi.ingredientId);
          const list = map.get(vi.ingredientId) ?? [];
          list.push({ spellId: spell.id, title: spell.title });
          map.set(vi.ingredientId, list);
        }
      }
    }
    return map;
  }, [data?.spells]);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return (data?.ingredients ?? []).filter((ing) => {
      if (groupFilter !== "all" && ing.groupTag !== groupFilter) return false;
      if (onlyOut && ing.stockLevel !== "out") return false;
      if (q && !ing.normalizedName.includes(q)) return false;
      return true;
    });
  }, [data?.ingredients, search, groupFilter, onlyOut]);

  function stepQty(ing: IngredientItem, delta: number) {
    const step = ing.unitType === "g" || ing.unitType === "ml" ? 10 : 1;
    const current = ing.stockQty ?? 0;
    const next = Math.max(0, Math.round((current + delta * step) * 100) / 100);
    updateMut.mutate({
      id: ing.id,
      patch: {
        stockQty: next,
        stockLevel: next === 0 ? "out" : "plenty",
      },
    });
  }

  function setExactQty(ing: IngredientItem, nextQty: number) {
    updateMut.mutate({
      id: ing.id,
      patch: {
        stockQty: nextQty,
        stockLevel: nextQty === 0 ? "out" : "plenty",
      },
    });
  }

  function toggleOutOfStock(ing: IngredientItem) {
    const isCurrentlyOut = ing.stockLevel === "out";
    if (isCurrentlyOut) {
      updateMut.mutate({
        id: ing.id,
        patch: {
          stockLevel: "plenty",
          ...(ing.unitType !== "qualitative" && (ing.stockQty ?? 0) === 0
            ? { stockQty: 1 }
            : {}),
        },
      });
    } else {
      updateMut.mutate({
        id: ing.id,
        patch: {
          stockLevel: "out",
          ...(ing.unitType !== "qualitative" ? { stockQty: 0 } : {}),
        },
      });
    }
  }

  async function handleUploadImage(ing: IngredientItem, file: File) {
    setUploadingId(ing.id);
    try {
      await uploadEntityCover("ingredient", ing.id, file);
      await invalidate();
      toast.success(`Foto guardada para "${ing.name}".`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo subir la foto"
      );
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="display-heading text-3xl font-semibold text-ink sm:text-4xl">
            Alacena &amp; Stock
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Tocá el número para cargar la cantidad exacta o marcá sin stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="apple-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Nuevo</span>
        </button>
      </header>

      {/* Search & Out-of-stock filter */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            aria-hidden="true"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ingrediente..."
            className="w-full rounded-2xl border border-border-subtle bg-surface py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
          />
        </div>

        <button
          type="button"
          aria-pressed={onlyOut}
          onClick={() => setOnlyOut((v) => !v)}
          className={`apple-press min-h-11 shrink-0 rounded-2xl border px-3.5 text-xs font-semibold ${
            onlyOut
              ? "border-danger bg-danger-soft text-danger"
              : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          Sin stock
        </button>
      </div>

      {/* Group chips */}
      <div className="no-scrollbar scroll-contain mb-6 flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setGroupFilter("all")}
          className={`apple-press min-h-9 shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium ${
            groupFilter === "all"
              ? "border-accent bg-accent-soft text-accent-text font-semibold"
              : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          Todos{" "}
          <span className="tabular-nums">
            ({data?.ingredients.length ?? 0})
          </span>
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupFilter(g)}
            className={`apple-press min-h-9 shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium ${
              groupFilter === g
                ? "border-accent bg-accent-soft text-accent-text font-semibold"
                : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Ingredient List */}
      {isLoading && !data ? (
        <div className="space-y-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border-subtle bg-surface"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-ink-muted">
          No hay ingredientes que coincidan con ese filtro.
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-3.5 lg:grid lg:grid-cols-2">
          {filtered.map((ing) => {
            const usedIn = spellsByIngredient.get(ing.id) ?? [];
            const isExpanded = expandedId === ing.id;
            const isOut = ing.stockLevel === "out";
            const isUploading = uploadingId === ing.id;

            return (
              <div
                key={ing.id}
                className={`flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-surface p-4 transition ${
                  isOut
                    ? "border-danger/35 bg-surface/90"
                    : "border-border-subtle hover:border-border-strong"
                }`}
              >
                {/* Top Row: Thumbnail + Info + Delete */}
                <div className="flex items-start gap-3.5">
                  {/* Cover Photo Thumbnail (1-tap upload/change) */}
                  <label
                    title={
                      ing.imageUrl
                        ? "Cambiar foto del ingrediente"
                        : "Cargar foto del ingrediente"
                    }
                    className="apple-press group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-border-subtle bg-canvas"
                  >
                    {isUploading ? (
                      <Loader2
                        className="h-5 w-5 animate-spin text-accent-text"
                        aria-hidden="true"
                      />
                    ) : ing.imageUrl ? (
                      <>
                        <img
                          src={ing.imageUrl}
                          alt={ing.name}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                          <Camera
                            className="h-4 w-4 text-white"
                            aria-hidden="true"
                          />
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-0.5 text-ink-dim">
                        <Camera className="h-4 w-4" aria-hidden="true" />
                        <span className="text-[10px] font-medium">Foto</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(ing, f);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {/* Title, Tag, Spells count & Auto-closing Cost */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2
                          className={`truncate text-base font-semibold ${
                            isOut ? "text-ink-muted line-through" : "text-ink"
                          }`}
                        >
                          {ing.name}
                        </h2>
                        <span className="mt-0.5 inline-block rounded-md bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                          {ing.groupTag}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(`¿Eliminar "${ing.name}" de tu alacena?`)
                          ) {
                            deleteMut.mutate(ing.id);
                          }
                        }}
                        aria-label={`Eliminar ${ing.name}`}
                        className="apple-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : ing.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium hover:bg-surface-elevated hover:text-accent-text"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="tabular-nums">
                          {usedIn.length}{" "}
                          {usedIn.length === 1 ? "hechizo" : "hechizos"}
                        </span>
                      </button>

                      <CostInlineEditor
                        ingredient={ing}
                        onSave={(unitCostArs) =>
                          updateMut.mutate({
                            id: ing.id,
                            patch: { unitCostArs },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar: Exact Qty + Single "Sin stock" Lock Button */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border-subtle pt-3">
                  {ing.unitType !== "qualitative" ? (
                    <StockQtyEditor
                      ingredient={ing}
                      disabled={isOut}
                      onStep={(delta) => stepQty(ing, delta)}
                      onCommit={(nextQty) => setExactQty(ing, nextQty)}
                    />
                  ) : (
                    <span className="text-xs font-medium text-ink-muted">
                      {isOut ? "Sin stock disponible" : "Disponible (a ojo)"}
                    </span>
                  )}

                  <button
                    type="button"
                    aria-pressed={isOut}
                    onClick={() => toggleOutOfStock(ing)}
                    className={`apple-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      isOut
                        ? "border-danger bg-danger-soft text-danger"
                        : "border-border-subtle bg-canvas text-ink-muted hover:border-border-strong hover:text-ink"
                    }`}
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sin stock</span>
                  </button>
                </div>

                {/* Reverse lookup: spells using this ingredient */}
                {isExpanded && (
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    {usedIn.length === 0 ? (
                      <p className="text-xs text-ink-dim">
                        Todavía no está asignado a ningún hechizo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {usedIn.map((u) => (
                          <Link
                            key={u.spellId}
                            href={`/hechizos/${u.spellId}`}
                            className="apple-press rounded-lg border border-border-subtle bg-canvas px-2.5 py-1.5 text-xs font-medium text-accent-text hover:border-accent"
                          >
                            {u.title} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <QuickIngredientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </AppShell>
  );
}
