"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardPaste,
  Globe,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useBulkCreateSpells } from "@/hooks/useGrimorioData";
import {
  parseBulkSpellsText,
  type ParsedBulkSpellDraft,
} from "@/lib/domain/bulk-parser";
import {
  UNIT_LABELS,
  type CategoryItem,
  type IngredientItem,
} from "@/types/app";

const EXAMPLE_SPELLS_TEXT = `Endulzamiento de Miel y Rosas | Amor | $35000 / USD 38 | Energías: Amor, Endulzamiento | Ingredientes: Vela rosa 1u, Miel pura 30ml, Cuarzo rosa 1u, Canela en polvo 5g
Abrecaminos Dorado de Prosperidad | Prosperidad | $42000 / USD 45 | Energías: Abrecaminos, Prosperidad | Ingredientes: Vela amarilla 1u, Hojas de laurel 3u, Pirita 1u, Romero 15g
Corte y Limpieza Energética | Limpieza | $38000 / USD 40 | Energías: Limpieza, Corte, Protección | Ingredientes: Velón negro 1u, Ruda seca 20g, Sal gruesa 50g, Agua Florida 15ml`;

export function BulkSpellsPanel({
  categories,
  existingIngredients,
  onCompleted,
  compact = false,
}: {
  categories: CategoryItem[];
  existingIngredients: IngredientItem[];
  onCompleted?: () => void;
  compact?: boolean;
}) {
  const [rawText, setRawText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [overrides, setOverrides] = useState<
    Record<string, Partial<ParsedBulkSpellDraft>>
  >({});
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const bulkMut = useBulkCreateSpells();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = compact ? 104 : 126;
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [rawText, compact]);

  const parsedSpells = useMemo(() => {
    const base = parseBulkSpellsText(rawText, categories, existingIngredients);
    return base
      .filter((item) => !excludedIds.has(item.id))
      .map((item) => {
        const ov = overrides[item.id];
        return {
          ...item,
          ...ov,
        };
      });
  }, [rawText, categories, existingIngredients, overrides, excludedIds]);

  const stats = useMemo(() => {
    const newIngredientsSet = new Set<string>();
    let totalRecipeItems = 0;

    for (const sp of parsedSpells) {
      for (const ing of sp.ingredients) {
        totalRecipeItems++;
        if (!ing.existingIngredientId) {
          newIngredientsSet.add(ing.normalizedName);
        }
      }
    }

    return {
      spellsCount: parsedSpells.length,
      totalRecipeItems,
      newIngredientsCount: newIngredientsSet.size,
    };
  }, [parsedSpells]);

  function updateSpell(id: string, patch: Partial<ParsedBulkSpellDraft>) {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
  }

  function removeSpell(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function removeRecipeIngredient(spellId: string, ingId: string) {
    const target = parsedSpells.find((s) => s.id === spellId);
    if (!target) return;
    updateSpell(spellId, {
      ingredients: target.ingredients.filter((i) => i.id !== ingId),
    });
  }

  function handleLoadExample() {
    setRawText(EXAMPLE_SPELLS_TEXT);
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
    if (parsedSpells.length === 0) return;

    await bulkMut.mutateAsync({
      items: parsedSpells.map((sp) => ({
        title: sp.title.trim(),
        categoryId: sp.categoryId,
        categoryName: sp.categoryName,
        purpose: sp.purpose || null,
        energyTypes: sp.energyTypes,
        isPublished: sp.isPublished,
        priceArs: Number(sp.priceArs || 0),
        priceUsd: Number(sp.priceUsd || 0),
        ingredients: sp.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          groupTag: ing.groupTag,
          isOptional: false,
        })),
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
              htmlFor="bulk-spells-textarea"
              className="block text-xs font-semibold text-ink"
            >
              Pegá tus hechizos con categoría, precio e ingredientes
            </label>
            <p className="text-[11px] text-ink-muted">
              Un hechizo por renglón separado por{" "}
              <code className="rounded bg-surface px-1 py-0.5 font-semibold text-accent-text">
                |
              </code>{" "}
              o en bloques. Los ingredientes nuevos se crean solos en tu Alacena.
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
          id="bulk-spells-textarea"
          rows={compact ? 4 : 5}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setExcludedIds(new Set());
          }}
          placeholder={`Formato rápido (1 por línea):\nNombre del Hechizo | Categoría | $35000 / USD 40 | Energías: Amor, Atracción | Ingredientes: Vela rosa 1u, Miel 30ml, Cuarzo rosa 1u`}
          className="w-full resize-none overflow-hidden rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none transition-[border-color] focus:border-accent"
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-dim">
          <span>
            También acepta formato corto:{" "}
            <strong className="font-medium text-ink-muted">
              Nombre | Categoría | $35000 | Vela rosa 1u, Miel 30ml
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

      {/* Live Preview of Parsed Spells */}
      {parsedSpells.length > 0 && (
        <div className="animate-variation-enter space-y-3">
          {/* Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink tabular-nums">
                Vista previa ({stats.spellsCount}{" "}
                {stats.spellsCount === 1 ? "hechizo" : "hechizos"})
              </span>
              {stats.newIngredientsCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ready-soft px-2.5 py-0.5 font-semibold text-ready tabular-nums">
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Se crearán {stats.newIngredientsCount} ingredientes nuevos en
                  Alacena
                </span>
              )}
            </div>
          </div>

          {/* Spell Draft Cards */}
          <div className="space-y-3">
            {parsedSpells.map((spell) => (
              <div
                key={spell.id}
                className="rounded-2xl border border-border-subtle bg-surface p-3.5 sm:p-4"
              >
                {/* Header: Title + Published Toggle + Remove */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={spell.title}
                      aria-label="Nombre del hechizo"
                      onChange={(e) =>
                        updateSpell(spell.id, { title: e.target.value })
                      }
                      className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-base font-semibold text-ink outline-none hover:border-border-subtle focus:border-accent focus:bg-canvas"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateSpell(spell.id, {
                          isPublished: !spell.isPublished,
                        })
                      }
                      className={`apple-press inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${
                        spell.isPublished
                          ? "border-info/40 bg-info-soft text-info"
                          : "border-border-subtle bg-canvas text-ink-muted"
                      }`}
                    >
                      {spell.isPublished ? (
                        <>
                          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Web</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Privado</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSpell(spell.id)}
                      aria-label={`Quitar ${spell.title}`}
                      className="apple-press flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Category + Price ARS + Price USD + Energies */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                      Categoría
                    </label>
                    <select
                      value={spell.categoryId ?? "custom"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = categories.find((c) => c.id === val);
                        if (found) {
                          updateSpell(spell.id, {
                            categoryId: found.id,
                            categoryName: found.name,
                          });
                        }
                      }}
                      className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 text-xs font-medium text-ink outline-none focus:border-accent"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      {!spell.categoryId && (
                        <option value="custom">
                          + Crear: {spell.categoryName}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                      Precio ARS
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={spell.priceArs}
                      onChange={(e) =>
                        updateSpell(spell.id, {
                          priceArs: Number(e.target.value || 0),
                        })
                      }
                      className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 tabular-nums text-xs font-semibold text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                      Precio USD
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={spell.priceUsd}
                      onChange={(e) =>
                        updateSpell(spell.id, {
                          priceUsd: Number(e.target.value || 0),
                        })
                      }
                      className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 tabular-nums text-xs font-semibold text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                      Energías (sep. por coma)
                    </label>
                    <input
                      type="text"
                      value={spell.energyTypes.join(", ")}
                      onChange={(e) =>
                        updateSpell(spell.id, {
                          energyTypes: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="h-9 w-full rounded-xl border border-border-subtle bg-canvas px-2.5 text-xs font-medium text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Recipe Ingredients Pills */}
                <div className="mt-3 border-t border-border-subtle pt-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold text-ink-muted">
                    Receta base ({spell.ingredients.length}{" "}
                    {spell.ingredients.length === 1
                      ? "ingrediente"
                      : "ingredientes"}
                    )
                  </p>
                  {spell.ingredients.length === 0 ? (
                    <p className="text-xs text-ink-dim">
                      Sin ingredientes especificados (podés agregarlos después o
                      sumar <code className="text-ink-muted">| Ingredientes: ...</code> en el texto).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {spell.ingredients.map((ing) => {
                        const isExisting = !!ing.existingIngredientId;
                        return (
                          <span
                            key={ing.id}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium ${
                              isExisting
                                ? "border-border-subtle bg-canvas text-ink"
                                : "border-ready/35 bg-ready-soft text-ready"
                            }`}
                          >
                            {isExisting ? (
                              <CheckCircle2
                                className="h-3 w-3 shrink-0 text-ink-dim"
                                aria-hidden="true"
                              />
                            ) : (
                              <Plus
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {ing.name}
                              {ing.quantity !== null
                                ? ` · ${ing.quantity} ${UNIT_LABELS[ing.unit]}`
                                : ""}
                            </span>
                            {!isExisting && (
                              <span className="rounded bg-surface/80 px-1 py-0.2 text-[10px] font-semibold">
                                Nuevo
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                removeRecipeIngredient(spell.id, ing.id)
                              }
                              aria-label={`Quitar ${ing.name}`}
                              className="ml-0.5 text-ink-dim hover:text-danger"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Primary Confirm Action */}
          <div className="pt-1">
            <button
              type="button"
              disabled={bulkMut.isPending || parsedSpells.length === 0}
              onClick={handleSaveBulk}
              className="apple-press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-45"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>
                {bulkMut.isPending
                  ? "Creando hechizos y receta base..."
                  : `Confirmar y crear ${parsedSpells.length} ${
                      parsedSpells.length === 1 ? "hechizo" : "hechizos"
                    }`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
