"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardPaste,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useBulkCreateIngredients } from "@/hooks/useGrimorioData";
import {
  parseBulkIngredientsText,
  type ParsedBulkIngredientDraft,
} from "@/lib/domain/bulk-parser";
import { formatArs } from "@/lib/format";
import { UNIT_LABELS, type IngredientItem } from "@/types/app";
import type { UnitType } from "@/db/schema";

const GROUP_OPTIONS = [
  "Hierbas",
  "Velas",
  "Insumos",
  "Aceites",
  "Cristales",
  "Inciensos",
  "Otros",
];

const UNIT_SELECT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "unit", label: "u." },
  { value: "branch", label: "ramas" },
  { value: "tbsp", label: "cdas" },
  { value: "pinch", label: "pizcas" },
  { value: "qualitative", label: "a ojo" },
];

const EXAMPLE_INGREDIENTS_TEXT = `Romero 50g $500
Vela roja 10u $850
Miel pura 250ml $1800
Cuarzo rosa 3u $1500
Ruda seca 40g $450
Agua Florida 100ml $2200`;

export function BulkIngredientsPanel({
  existingIngredients,
  onCompleted,
  compact = false,
}: {
  existingIngredients: IngredientItem[];
  onCompleted?: () => void;
  compact?: boolean;
}) {
  const [rawText, setRawText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [overrides, setOverrides] = useState<
    Record<string, Partial<ParsedBulkIngredientDraft>>
  >({});
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [globalDupMode, setGlobalDupMode] = useState<
    "add_stock" | "overwrite" | "skip"
  >("add_stock");

  const bulkMut = useBulkCreateIngredients();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = compact ? 104 : 126;
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [rawText, compact]);

  const parsedItems = useMemo(() => {
    const base = parseBulkIngredientsText(rawText, existingIngredients);
    return base
      .filter((item) => !excludedIds.has(item.id))
      .map((item) => {
        const ov = overrides[item.id];
        return {
          ...item,
          duplicateAction: globalDupMode,
          ...ov,
        };
      });
  }, [rawText, existingIngredients, overrides, excludedIds, globalDupMode]);

  const stats = useMemo(() => {
    let newCount = 0;
    let duplicateCount = 0;
    for (const item of parsedItems) {
      if (item.existingIngredientId) duplicateCount++;
      else newCount++;
    }
    return { total: parsedItems.length, newCount, duplicateCount };
  }, [parsedItems]);

  function updateItem(
    id: string,
    patch: Partial<ParsedBulkIngredientDraft>
  ) {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
  }

  function removeItem(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleLoadExample() {
    setRawText(EXAMPLE_INGREDIENTS_TEXT);
    setOverrides({});
    setExcludedIds(new Set());
  }

  async function handlePasteClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) {
        setRawText((prev) => (prev.trim() ? `${prev}\n${clip}` : clip));
      }
    } catch {
      // Fallback if clipboard API permission denied
    }
  }

  async function handleSaveBulk() {
    if (parsedItems.length === 0) return;

    await bulkMut.mutateAsync({
      items: parsedItems.map((item) => ({
        name: item.name.trim(),
        groupTag: item.groupTag,
        unitType: item.unitType,
        stockQty:
          item.unitType === "qualitative" ? null : (item.stockQty ?? 0),
        stockLevel: item.stockLevel,
        unitCostArs: item.unitCostArs,
        duplicateAction: item.duplicateAction,
      })),
    });

    setRawText("");
    setOverrides({});
    setExcludedIds(new Set());
    onCompleted?.();
  }

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <div className="rounded-2xl border border-border-subtle bg-canvas p-3.5 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <label
              htmlFor="bulk-ing-textarea"
              className="block text-xs font-semibold text-ink"
            >
              Pegá tu lista de ingredientes (WhatsApp, Notas o texto libre)
            </label>
            <p className="text-[11px] text-ink-muted">
              Detecta automáticamente nombre, cantidad, unidad (g, ml, u., ramas, cdas), precio ($500) y rubro.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="apple-press inline-flex min-h-8 items-center gap-1 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted hover:border-border-strong hover:text-ink"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pegar</span>
            </button>
            <button
              type="button"
              onClick={handleLoadExample}
              className="apple-press inline-flex min-h-8 items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-text"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ver ejemplo</span>
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          id="bulk-ing-textarea"
          rows={compact ? 4 : 5}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setExcludedIds(new Set());
          }}
          placeholder={`Ejemplo:\nRomero 50g $500\nVela roja 10u $850\nMiel pura 250ml $1800\nCuarzo rosa 3u, Ruda 40g`}
          className="w-full resize-none overflow-hidden rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none transition-[border-color] focus:border-accent"
        />

        {/* Format hints pill bar */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-dim">
          <span>
            Podés separar por renglón o por comas:{" "}
            <strong className="font-medium text-ink-muted">
              Romero 50g $500, Vela roja 10u
            </strong>
          </span>
          {rawText.trim() && (
            <button
              type="button"
              onClick={() => {
                setRawText("");
                setOverrides({});
                setExcludedIds(new Set());
              }}
              className="apple-press font-semibold text-ink-muted hover:text-danger"
            >
              Limpiar texto
            </button>
          )}
        </div>
      </div>

      {/* Live Preview & Duplicate Resolution Controls */}
      {parsedItems.length > 0 && (
        <div className="animate-variation-enter space-y-3">
          {/* Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-ink tabular-nums">
                Vista previa ({stats.total})
              </span>
              {stats.newCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ready-soft px-2.5 py-0.5 font-semibold text-ready tabular-nums">
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  {stats.newCount} {stats.newCount === 1 ? "nuevo" : "nuevos"}
                </span>
              )}
              {stats.duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2.5 py-0.5 font-semibold text-info tabular-nums">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  {stats.duplicateCount} ya en Alacena
                </span>
              )}
            </div>

            {/* Duplicate Behavior Selector when duplicates exist */}
            {stats.duplicateCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-ink-muted">Si ya existe:</span>
                <div className="inline-flex rounded-xl border border-border-subtle bg-canvas p-0.5">
                  {(
                    [
                      { value: "add_stock", label: "Sumar stock" },
                      { value: "overwrite", label: "Reemplazar" },
                      { value: "skip", label: "Omitir" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGlobalDupMode(opt.value)}
                      className={`apple-press rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        globalDupMode === opt.value
                          ? "bg-accent text-on-accent"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Editable Cards List */}
          <div className="space-y-2">
            {parsedItems.map((item) => {
              const isDup = !!item.existingIngredientId;
              const resultingStock =
                isDup && item.duplicateAction === "add_stock"
                  ? Math.round(
                      ((item.existingStockQty ?? 0) + (item.stockQty ?? 0)) *
                        100
                    ) / 100
                  : item.stockQty;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3 transition ${
                    isDup
                      ? "border-info/35 bg-surface"
                      : "border-border-subtle bg-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          value={item.name}
                          aria-label="Nombre del ingrediente"
                          onChange={(e) =>
                            updateItem(item.id, { name: e.target.value })
                          }
                          className="min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold text-ink outline-none hover:border-border-subtle focus:border-accent focus:bg-canvas"
                        />

                        {isDup ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-info">
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            {item.duplicateAction === "add_stock"
                              ? `Existe (${item.existingStockQty ?? 0} → ${resultingStock ?? 0} ${UNIT_LABELS[item.unitType]})`
                              : item.duplicateAction === "overwrite"
                                ? `Reemplaza (${item.existingStockQty ?? 0} → ${item.stockQty ?? 0})`
                                : "Se omitirá"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-ready-soft px-2 py-0.5 text-[11px] font-semibold text-ready">
                            <CheckCircle2
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            Nuevo
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Quitar ${item.name} de la lista`}
                      className="apple-press flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Editable Fields Row: Rubro, Cantidad, Unidad, Costo ARS */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {/* Group Tag */}
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                        Rubro
                      </label>
                      <select
                        value={item.groupTag}
                        onChange={(e) =>
                          updateItem(item.id, { groupTag: e.target.value })
                        }
                        className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 text-xs font-medium text-ink outline-none focus:border-accent"
                      >
                        {Array.from(
                          new Set([...GROUP_OPTIONS, item.groupTag])
                        ).map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                        {isDup && item.duplicateAction === "add_stock"
                          ? "Cantidad a sumar"
                          : "Stock"}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        disabled={item.unitType === "qualitative"}
                        value={
                          item.unitType === "qualitative"
                            ? ""
                            : (item.stockQty ?? "")
                        }
                        placeholder={
                          item.unitType === "qualitative" ? "A ojo" : "0"
                        }
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          updateItem(item.id, {
                            stockQty: val,
                            stockLevel: val === 0 ? "out" : "plenty",
                          });
                        }}
                        className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 tabular-nums text-xs font-semibold text-ink outline-none focus:border-accent disabled:opacity-50"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                        Unidad
                      </label>
                      <select
                        value={item.unitType}
                        onChange={(e) =>
                          updateItem(item.id, {
                            unitType: e.target.value as UnitType,
                          })
                        }
                        className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 text-xs font-medium text-ink outline-none focus:border-accent"
                      >
                        {UNIT_SELECT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cost ARS */}
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                        Costo unit. (ARS)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={item.unitCostArs ?? ""}
                        placeholder={
                          item.existingUnitCostArs !== null
                            ? `Actual: ${formatArs(item.existingUnitCostArs)}`
                            : "Opcional"
                        }
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          updateItem(item.id, { unitCostArs: val });
                        }}
                        className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 tabular-nums text-xs font-semibold text-ink outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary Confirm Button */}
          <div className="pt-1">
            <button
              type="button"
              disabled={bulkMut.isPending || parsedItems.length === 0}
              onClick={handleSaveBulk}
              className="apple-press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-45"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>
                {bulkMut.isPending
                  ? "Guardando en Alacena..."
                  : `Confirmar y cargar ${parsedItems.length} ${
                      parsedItems.length === 1 ? "ingrediente" : "ingredientes"
                    }`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
