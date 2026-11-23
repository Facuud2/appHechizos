"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useGrimorioData";
import { IosBottomSheet } from "./IosBottomSheet";
import type { CategoryItem, SpellItem } from "@/types/app";

export function CategoriesModal({
  open,
  categories,
  spells,
  onClose,
}: {
  open: boolean;
  categories: CategoryItem[];
  spells: SpellItem[];
  onClose: () => void;
}) {
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [newIntro, setNewIntro] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntro, setEditIntro] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    await createMut.mutateAsync({
      name: newName.trim(),
      publicIntro: newIntro.trim() || null,
    });
    setNewName("");
    setNewIntro("");
  }

  function startEdit(cat: CategoryItem) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIntro(cat.publicIntro ?? "");
  }

  async function saveEdit(cat: CategoryItem) {
    if (!editName.trim()) return;
    await updateMut.mutateAsync({
      id: cat.id,
      patch: {
        name: editName.trim(),
        publicIntro: editIntro.trim() || null,
      },
    });
    setEditingId(null);
  }

  async function moveOrder(idx: number, delta: -1 | 1) {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const current = categories[idx];
    const swapWith = categories[targetIdx];

    await Promise.all([
      updateMut.mutateAsync({
        id: current.id,
        patch: { sortOrder: targetIdx + 1 },
      }),
      updateMut.mutateAsync({
        id: swapWith.id,
        patch: { sortOrder: idx + 1 },
      }),
    ]);
  }

  async function handleDelete(cat: CategoryItem, count: number) {
    const msg =
      count > 0
        ? `¿Eliminar la categoría "${cat.name}"? Los ${count} hechizos adentro no se borrarán, pasarán a "Sin categoría".`
        : `¿Eliminar la categoría "${cat.name}"?`;
    if (!confirm(msg)) return;
    await deleteMut.mutateAsync(cat.id);
  }

  return (
    <IosBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy="categories-modal-title"
      maxWidthClass="max-w-lg"
    >
      <div className="pb-sheet-safe scroll-contain flex max-h-[84dvh] flex-col px-4 pt-1.5 pb-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent-text sm:h-10 sm:w-10">
              <FolderKanban className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="categories-modal-title"
                className="section-heading text-[18px] font-semibold text-ink sm:text-xl"
              >
                Categorías de Hechizos
              </h2>
              <p className="text-xs text-ink-muted">
                Creá, editá o reordená las categorías. Se sincronizan directo con
                tarotdeluna.netlify.app.
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

        {/* Create new category form */}
        <div className="mb-3.5 rounded-2xl border border-border-subtle bg-canvas p-3.5">
          <p className="mb-2 text-xs font-semibold text-ink">
            Nueva categoría
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Ej. Hechizos de Amor y Dinámicas Vinculares..."
              className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newIntro}
                onChange={(e) => setNewIntro(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Subtítulo o intro pública para la web (opcional)..."
                className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-dim outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={!newName.trim() || createMut.isPending}
                onClick={handleCreate}
                className="apple-press inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-40"
              >
                {createMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Crear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Existing categories list */}
        <div className="scroll-contain flex-1 space-y-2 overflow-y-auto pr-0.5">
          {categories.map((cat, idx) => {
            const catSpells = spells.filter((s) => s.categoryId === cat.id);
            const publishedCount = catSpells.filter((s) => s.isPublished).length;
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-border-subtle bg-surface p-3"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nombre de la categoría"
                      className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
                    />
                    <textarea
                      rows={2}
                      value={editIntro}
                      onChange={(e) => setEditIntro(e.target.value)}
                      placeholder="Intro pública que se ve debajo del título en tarotdeluna.netlify.app (opcional)"
                      className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="apple-press rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!editName.trim() || updateMut.isPending}
                        onClick={() => saveEdit(cat)}
                        className="apple-press inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-45"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Guardar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">
                          {cat.name}
                        </p>
                        <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted tabular-nums">
                          {catSpells.length}{" "}
                          {catSpells.length === 1 ? "hechizo" : "hechizos"}
                          {publishedCount > 0 ? ` · ${publishedCount} en web` : ""}
                        </span>
                      </div>
                      {cat.publicIntro && (
                        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                          {cat.publicIntro}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0 || updateMut.isPending}
                        onClick={() => moveOrder(idx, -1)}
                        aria-label="Subir categoría"
                        className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          idx === categories.length - 1 || updateMut.isPending
                        }
                        onClick={() => moveOrder(idx, 1)}
                        aria-label="Bajar categoría"
                        className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        aria-label={`Editar ${cat.name}`}
                        className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:border-accent hover:text-accent-text"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat, catSpells.length)}
                        aria-label={`Eliminar ${cat.name}`}
                        className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-dim hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </IosBottomSheet>
  );
}
