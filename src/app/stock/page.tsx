"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Ban,
  BookOpen,
  Camera,
  CheckCircle2,
  DollarSign,
  Edit3,
  Layers,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuickIngredientModal } from "@/components/QuickIngredientModal";
import {
  ProgressiveImage,
  StockAlacenaSkeleton,
} from "@/components/Skeletons";
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
import { isNonCountableUnit, isPresenceUnit, type UnitType } from "@/db/schema";

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
        className="animate-variation-enter inline-flex items-center gap-1.5 rounded-lg border border-accent bg-canvas p-1"
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
      className="apple-press inline-flex items-center gap-1 rounded-lg px-1.5 py-1 tabular-nums text-xs font-medium text-ink-muted hover:bg-surface-elevated hover:text-accent-text"
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
  const [modalInitialMode, setModalInitialMode] = useState<"single" | "bulk">(
    "single"
  );
  const [editingIngredient, setEditingIngredient] =
    useState<IngredientItem | null>(null);
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

  const isFiltering =
    search.trim().length > 0 || groupFilter !== "all" || onlyOut;

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
          ...(!isNonCountableUnit(ing.unitType) && (ing.stockQty ?? 0) === 0
            ? { stockQty: 1 }
            : {}),
        },
      });
    } else {
      updateMut.mutate({
        id: ing.id,
        patch: {
          stockLevel: "out",
          ...(!isNonCountableUnit(ing.unitType) ? { stockQty: 0 } : {}),
        },
      });
    }
  }

  function toggleTrackingMode(ing: IngredientItem) {
    const nextIsPresence = !isPresenceUnit(ing.unitType);
    if (nextIsPresence) {
      updateMut.mutate({
        id: ing.id,
        patch: {
          unitType: "presence",
          stockQty: null,
          stockLevel: ing.stockLevel === "out" ? "out" : "plenty",
        },
      });
    } else {
      const fallbackUnit: UnitType =
        ing.groupTag === "Hierbas"
          ? "g"
          : ing.groupTag === "Aceites"
            ? "ml"
            : "unit";
      updateMut.mutate({
        id: ing.id,
        patch: {
          unitType: fallbackUnit,
          stockQty: ing.stockLevel === "out" ? 0 : fallbackUnit === "g" ? 50 : fallbackUnit === "ml" ? 30 : 1,
          stockLevel: ing.stockLevel === "out" ? "out" : "plenty",
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
      <header className="mb-4 flex items-start justify-between gap-2.5">
        <div>
          <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-4xl">
            Alacena &amp; Stock
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted sm:text-sm">
            Tocá el número para cargar la cantidad exacta o marcá sin stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingIngredient(null);
              setModalInitialMode("bulk");
              setModalOpen(true);
            }}
            className="apple-press hit-44 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-accent hover:text-accent-text sm:min-h-11 sm:px-3.5 sm:text-sm"
          >
            <Layers className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Masiva</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingIngredient(null);
              setModalInitialMode("single");
              setModalOpen(true);
            }}
            className="apple-press hit-44 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent hover:bg-accent-hover sm:min-h-11 sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Search & Out-of-stock filter */}
      <div className="mb-2.5 flex gap-2">
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
            className="w-full rounded-[14px] border border-border-subtle bg-surface py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
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

        <button
          type="button"
          aria-pressed={onlyOut}
          onClick={() => setOnlyOut((v) => !v)}
          className={`apple-press hit-44 min-h-10 shrink-0 rounded-[14px] border px-3 text-xs font-semibold sm:min-h-11 sm:px-3.5 ${
            onlyOut
              ? "border-danger bg-danger-soft text-danger"
              : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          Sin stock
        </button>
      </div>

      {/* Group chips (Horizontal Carousel with Edge Fade) */}
      <div className="ios-carousel scroll-contain mb-5 pb-1">
        <button
          type="button"
          onClick={() => setGroupFilter("all")}
          className={`apple-press hit-44 min-h-9 shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium ${
            groupFilter === "all"
              ? "border-accent bg-accent-soft font-semibold text-accent-text"
              : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
          }`}
        >
          Todos{" "}
          <span className="tabular-nums">
            ({data?.ingredients.length ?? 0})
          </span>
        </button>
        {isLoading && !data
          ? [78, 86, 72, 90, 82].map((w, idx) => (
              <div
                key={idx}
                style={{ width: `${w}px` }}
                className="skeleton-shimmer h-9 shrink-0 rounded-full border border-border-subtle"
              />
            ))
          : groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupFilter(g)}
                className={`apple-press hit-44 min-h-9 shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium ${
                  groupFilter === g
                    ? "border-accent bg-accent-soft font-semibold text-accent-text"
                    : "border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
                }`}
              >
                {g}
              </button>
            ))}
      </div>

      {/* Ingredient List */}
      {isLoading && !data ? (
        <StockAlacenaSkeleton />
      ) : filtered.length === 0 ? (
        <div className="animate-variation-enter rounded-[16px] border border-border-subtle bg-surface p-5 text-center sm:p-8">
          <p className="section-heading text-[18px] font-semibold text-ink sm:text-xl">
            No hay ingredientes que coincidan con ese filtro
          </p>
          <p className="mt-1 text-[13px] text-ink-muted sm:text-sm">
            Probá quitar el filtro o sumar el ingrediente a tu alacena ahora.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setGroupFilter("all");
                  setOnlyOut(false);
                }}
                className="apple-press inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-canvas px-3.5 py-2 text-xs font-semibold text-ink hover:border-border-strong"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Limpiar filtros</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingIngredient(null);
                setModalInitialMode("single");
                setModalOpen(true);
              }}
              className="apple-press inline-flex min-h-10 items-center gap-1.5 rounded-[12px] bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nuevo ingrediente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3.5">
          {filtered.map((ing, idx) => {
            const usedIn = spellsByIngredient.get(ing.id) ?? [];
            const isExpanded = expandedId === ing.id;
            const isOut = ing.stockLevel === "out";
            const isUploading = uploadingId === ing.id;

            return (
              <div
                key={ing.id}
                style={
                  !isFiltering
                    ? ({ "--stagger-idx": idx } as CSSProperties)
                    : undefined
                }
                className={`${
                  !isFiltering ? "animate-stagger-item" : ""
                } flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-[16px] border bg-surface p-3.5 transition sm:p-4 ${
                  isOut
                    ? "border-danger/35 bg-surface/90"
                    : "border-border-subtle hover:border-border-strong"
                }`}
              >
                {/* Top Row: Thumbnail (Concentric r=10px inside r=16px) + Info + Delete */}
                <div className="flex items-start gap-3">
                  {/* Cover Photo Thumbnail (1-tap upload/change) */}
                  <label
                    title={
                      ing.imageUrl
                        ? "Cambiar foto del ingrediente"
                        : "Cargar foto del ingrediente"
                    }
                    className="apple-press group relative flex h-15 w-15 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-border-subtle bg-canvas sm:h-16 sm:w-16"
                  >
                    {isUploading ? (
                      <Loader2
                        className="h-5 w-5 animate-spin text-accent-text"
                        aria-hidden="true"
                      />
                    ) : ing.imageUrl ? (
                      <>
                        <ProgressiveImage
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

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIngredient(ing);
                            setModalInitialMode("single");
                            setModalOpen(true);
                          }}
                          aria-label={`Editar ${ing.name}`}
                          title={`Editar ${ing.name}`}
                          className="apple-press hit-44 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-ink-dim hover:bg-accent-soft hover:text-accent-text"
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </button>

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
                          title={`Eliminar ${ing.name}`}
                          className="apple-press hit-44 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-ink-dim hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {ing.notes && (
                      <p className="mt-1 line-clamp-1 text-xs text-ink-dim">
                        {ing.notes}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : ing.id)
                        }
                        className={`apple-press inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium ${
                          isExpanded
                            ? "bg-accent-soft text-accent-text"
                            : "hover:bg-surface-elevated hover:text-accent-text"
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="tabular-nums">
                          {usedIn.length}{" "}
                          {usedIn.length === 1 ? "hechizo" : "hechizos"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleTrackingMode(ing)}
                        title={
                          isPresenceUnit(ing.unitType)
                            ? "Cambiar a ingrediente contable con stock numérico"
                            : "Cambiar a elemento permanente (solo existencia: Lo tengo / No lo tengo)"
                        }
                        className={`apple-press inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium ${
                          isPresenceUnit(ing.unitType)
                            ? "bg-accent-soft text-accent-text"
                            : "hover:bg-surface-elevated hover:text-accent-text"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {isPresenceUnit(ing.unitType)
                            ? "Solo existencia"
                            : "Contable"}
                        </span>
                      </button>

                      {(!isPresenceUnit(ing.unitType) ||
                        ing.unitCostArs !== null) && (
                        <CostInlineEditor
                          ingredient={ing}
                          onSave={(unitCostArs) =>
                            updateMut.mutate({
                              id: ing.id,
                              patch: { unitCostArs },
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar: Exact Qty or Presence Status + Action Button */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border-subtle pt-3">
                  {isPresenceUnit(ing.unitType) ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                        isOut
                          ? "border-danger/35 bg-danger-soft/60 text-danger"
                          : "border-ready/35 bg-ready-soft/70 text-ready"
                      }`}
                    >
                      {isOut ? (
                        <>
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>No lo tengo</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>En alacena (no se gasta)</span>
                        </>
                      )}
                    </span>
                  ) : ing.unitType !== "qualitative" ? (
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
                    <span>
                      {isPresenceUnit(ing.unitType)
                        ? isOut
                          ? "No lo tengo"
                          : "Marcar que no hay"
                        : "Sin stock"}
                    </span>
                  </button>
                </div>

                {/* Reverse lookup: spells using this ingredient */}
                {isExpanded && (
                  <div className="animate-variation-enter mt-3 border-t border-border-subtle pt-3">
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
        initialMode={modalInitialMode}
        editingIngredient={editingIngredient}
        onClose={() => {
          setModalOpen(false);
          setEditingIngredient(null);
        }}
      />
    </AppShell>
  );
}
