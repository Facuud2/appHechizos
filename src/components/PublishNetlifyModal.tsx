"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  FolderKanban,
  Globe,
  Loader2,
  Plus,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCategory,
  useInvalidateGrimorio,
} from "@/hooks/useGrimorioData";
import { formatDualPrice } from "@/lib/format";
import { IosBottomSheet } from "./IosBottomSheet";
import type { CategoryItem, SpellItem } from "@/types/app";

export function PublishNetlifyModal({
  open,
  spells,
  categories,
  onClose,
  onOpenCategories,
}: {
  open: boolean;
  spells: SpellItem[];
  categories: CategoryItem[];
  onClose: () => void;
  onOpenCategories?: () => void;
}) {
  const invalidate = useInvalidateGrimorio();
  const createCatMut = useCreateCategory();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, string | null>
  >({});
  const [publishing, setPublishing] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedIds(spells.filter((s) => s.isPublished).map((s) => s.id));
      setCategoryOverrides({});
      setAddingCat(false);
      setNewCatName("");
    }
  }, [open, spells]);

  const allSelected = spells.length > 0 && selectedIds.length === spells.length;

  function toggleSpell(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(spells.map((s) => s.id));
    }
  }

  function getEffectiveCategoryId(spell: SpellItem): string | null {
    if (spell.id in categoryOverrides) {
      return categoryOverrides[spell.id];
    }
    return spell.categoryId;
  }

  const groupedByCat = useMemo(() => {
    const groups: {
      category: CategoryItem;
      spells: SpellItem[];
    }[] = categories.map((cat) => ({
      category: cat,
      spells: spells.filter((s) => getEffectiveCategoryId(s) === cat.id),
    }));

    const knownIds = new Set(categories.map((c) => c.id));
    const uncategorized = spells.filter((s) => {
      const cid = getEffectiveCategoryId(s);
      return !cid || !knownIds.has(cid);
    });

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

    return groups.filter((g) => g.spells.length > 0);
  }, [categories, spells, categoryOverrides]);

  async function handleQuickCreateCat() {
    if (!newCatName.trim()) return;
    await createCatMut.mutateAsync({ name: newCatName.trim() });
    setNewCatName("");
    setAddingCat(false);
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      // First apply any category changes the user made inside the modal
      const changedCategoryEntries = Object.entries(categoryOverrides);
      if (changedCategoryEntries.length > 0) {
        await Promise.all(
          changedCategoryEntries.map(([spellId, nextCatId]) =>
            fetch(`/api/spells/${spellId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ categoryId: nextCatId }),
            })
          )
        );
      }

      const res = await fetch("/api/public/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishSpellIds: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo subir a la página");
      }

      await invalidate();
      toast.success(
        json.netlifyTriggered
          ? `¡Subido! ${json.publishedCount} hechizos publicados y rebuild de Netlify disparado.`
          : `¡Catálogo actualizado! ${json.publishedCount} hechizos visibles en tarotdeluna.netlify.app.`
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <IosBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy="publish-netlify-title"
      maxWidthClass="max-w-lg"
    >
      <div className="pb-sheet-safe scroll-contain flex max-h-[84dvh] flex-col px-4 pt-1.5 pb-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-info-soft text-info sm:h-10 sm:w-10">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="publish-netlify-title"
                className="section-heading text-[18px] font-semibold text-ink sm:text-xl"
              >
                Subir a tarotdeluna.netlify.app
              </h2>
              <p className="text-xs text-ink-muted">
                Elegí qué hechizos y bajo qué categoría se ven en tu web pública
                (nunca muestra ingredientes ni costos).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="apple-press hit-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-elevated hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Select all & Category quick bar */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border-subtle bg-canvas px-3.5 py-2 text-xs">
          <span className="font-medium text-ink-muted tabular-nums">
            <strong className="text-ink">{selectedIds.length}</strong> de{" "}
            {spells.length} visibles en web
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (onOpenCategories) {
                  onClose();
                  onOpenCategories();
                } else {
                  setAddingCat((v) => !v);
                }
              }}
              className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-accent-text"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Categorías</span>
            </button>

            <span className="text-border-strong">·</span>

            <button
              type="button"
              onClick={() => setAddingCat((v) => !v)}
              className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nueva categoría</span>
            </button>

            <span className="text-border-strong">·</span>

            <button
              type="button"
              onClick={toggleAll}
              className="font-semibold text-accent-text hover:underline"
            >
              {allSelected ? "Desmarcar todos" : "Todos"}
            </button>
          </div>
        </div>

        {addingCat && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent/40 bg-canvas p-2">
            <input
              type="text"
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCatName.trim()) {
                  e.preventDefault();
                  handleQuickCreateCat();
                }
              }}
              placeholder="Nombre de la nueva categoría..."
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-ink placeholder:text-ink-dim outline-none"
            />
            <button
              type="button"
              disabled={!newCatName.trim() || createCatMut.isPending}
              onClick={handleQuickCreateCat}
              className="apple-press inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent disabled:opacity-40"
            >
              {createCatMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3 w-3" aria-hidden="true" />
              )}
              <span>Crear</span>
            </button>
          </div>
        )}

        {/* Grouped Spell checklist */}
        <div className="scroll-contain flex-1 space-y-4 overflow-y-auto pr-0.5">
          {spells.length === 0 ? (
            <p className="py-5 text-center text-sm text-ink-muted sm:py-8">
              Todavía no creaste ningún hechizo.
            </p>
          ) : (
            groupedByCat.map(({ category, spells: groupSpells }) => {
              const groupSelectedCount = groupSpells.filter((s) =>
                selectedIds.includes(s.id)
              ).length;
              const allGroupSelected =
                groupSpells.length > 0 &&
                groupSelectedCount === groupSpells.length;

              return (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {category.name}{" "}
                      <span className="font-normal tabular-nums text-ink-dim">
                        ({groupSelectedCount}/{groupSpells.length})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const groupIds = groupSpells.map((s) => s.id);
                        if (allGroupSelected) {
                          setSelectedIds((prev) =>
                            prev.filter((id) => !groupIds.includes(id))
                          );
                        } else {
                          setSelectedIds((prev) =>
                            Array.from(new Set([...prev, ...groupIds]))
                          );
                        }
                      }}
                      className="text-[11px] font-semibold text-accent-text hover:underline"
                    >
                      {allGroupSelected
                        ? "Ocultar categoría"
                        : "Publicar categoría"}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {groupSpells.map((spell) => {
                      const checked = selectedIds.includes(spell.id);
                      const effectiveCatId = getEffectiveCategoryId(spell);

                      return (
                        <div
                          key={spell.id}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 transition ${
                            checked
                              ? "border-info/50 bg-info-soft/45"
                              : "border-border-subtle bg-canvas hover:border-border-strong"
                          }`}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleSpell(spell.id)}
                            className="apple-press flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                                checked
                                  ? "border-info bg-info text-white"
                                  : "border-border-strong bg-surface"
                              }`}
                            >
                              {checked && (
                                <Check
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">
                                {spell.title}
                              </p>
                              <p className="truncate tabular-nums text-xs text-ink-muted">
                                {spell.priceTiers[0]
                                  ? formatDualPrice(
                                      spell.priceTiers[0].priceArs,
                                      spell.priceTiers[0].priceUsd
                                    )
                                  : "Sin precio cargado"}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <select
                              aria-label={`Categoría de ${spell.title}`}
                              value={effectiveCatId ?? ""}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                setCategoryOverrides((prev) => ({
                                  ...prev,
                                  [spell.id]: val,
                                }));
                              }}
                              className="max-w-[130px] truncate rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-medium text-ink outline-none focus:border-accent"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => toggleSpell(spell.id)}
                              className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
                                checked
                                  ? "bg-info-soft text-info"
                                  : "bg-surface-elevated text-ink-dim"
                              }`}
                            >
                              {checked ? "Público" : "Privado"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://tarotdeluna.netlify.app"
            target="_blank"
            rel="noreferrer"
            className="apple-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border-subtle px-3.5 py-2 text-xs font-medium text-ink-muted hover:border-border-strong hover:text-ink"
          >
            <span>Abrir web</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>

          <button
            type="button"
            disabled={publishing}
            onClick={handlePublish}
            className="apple-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {publishing ? "Subiendo..." : "Subir a la página ahora"}
            </span>
          </button>
        </div>
      </div>
    </IosBottomSheet>
  );
}
