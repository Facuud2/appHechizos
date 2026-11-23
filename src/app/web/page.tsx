"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Eye,
  FolderPlus,
  Globe,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { HomeGrimorioSkeleton } from "@/components/Skeletons";
import {
  useCreateCategory,
  useDeleteCategory,
  useGrimorio,
  useInvalidateGrimorio,
} from "@/hooks/useGrimorioData";
import type { CategoryItem, SpellItem } from "@/types/app";

interface DraftTier {
  label: string;
  priceArs: number;
  priceUsd: number;
}

interface DraftSpell {
  id: string;
  categoryId: string | null;
  title: string;
  subtitleTag: string | null;
  purpose: string | null;
  publicDescription: string | null;
  isPublished: boolean;
  isOffer: boolean;
  offerLabel: string | null;
  sortOrder: number;
  priceTiers: DraftTier[];
}

interface DraftCategory {
  id: string;
  name: string;
  slug: string;
  publicIntro: string | null;
  sortOrder: number;
}

function formatPublicPriceLine(
  label: string,
  priceArs: number,
  priceUsd: number
): string {
  const ars = `$${Math.round(priceArs).toLocaleString("es-AR")}`;
  const usd = `${Math.round(priceUsd * 100) / 100} USD`;
  return label ? `${label}: ${ars} / ${usd}` : `${ars} / ${usd}`;
}

function toDraftCategories(cats: CategoryItem[]): DraftCategory[] {
  return [...cats]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((c, idx) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      publicIntro: c.publicIntro,
      sortOrder: idx + 1,
    }));
}

function toDraftSpells(spells: SpellItem[]): DraftSpell[] {
  return [...spells]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      title: s.title,
      subtitleTag: s.subtitleTag,
      purpose: s.purpose,
      publicDescription: s.publicDescription,
      isPublished: s.isPublished,
      isOffer: s.isOffer,
      offerLabel: s.offerLabel ?? "¡OFERTA!",
      sortOrder: s.sortOrder,
      priceTiers:
        s.priceTiers.length > 0
          ? s.priceTiers.map((t) => ({
              label: t.label,
              priceArs: t.priceArs,
              priceUsd: t.priceUsd,
            }))
          : [{ label: "", priceArs: 30000, priceUsd: 34 }],
    }));
}

export default function WebControlStudioPage() {
  const { data, isLoading } = useGrimorio();
  const invalidate = useInvalidateGrimorio();
  const createCatMut = useCreateCategory();
  const deleteCatMut = useDeleteCategory();

  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);
  const [draftSpells, setDraftSpells] = useState<DraftSpell[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Quick category creation
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIntro, setNewCatIntro] = useState("");

  // Category inline edit
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Spell inline commercial drawer
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);

  // Selected preview filter or highlight
  const [highlightedSpellId, setHighlightedSpellId] = useState<string | null>(
    null
  );

  // Sync server data into draft state whenever not dirty
  useEffect(() => {
    if (!data || isDirty) return;
    setDraftCategories(toDraftCategories(data.categories));
    setDraftSpells(toDraftSpells(data.spells));
  }, [data, isDirty]);

  function handleDiscardChanges() {
    if (!data) return;
    setDraftCategories(toDraftCategories(data.categories));
    setDraftSpells(toDraftSpells(data.spells));
    setIsDirty(false);
    setEditingCatId(null);
    setExpandedSpellId(null);
    toast.info("Cambios descartados. Se restauró el estado actual.");
  }

  // Reorder categories
  function moveCategory(idx: number, delta: -1 | 1) {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= draftCategories.length) return;
    setDraftCategories((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((c, i) => ({ ...c, sortOrder: i + 1 }));
    });
    setIsDirty(true);
  }

  function updateCategoryField(
    catId: string,
    patch: Partial<Pick<DraftCategory, "name" | "publicIntro">>
  ) {
    setDraftCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, ...patch } : c))
    );
    setIsDirty(true);
  }

  // Reorder spell within its category
  function moveSpellInCategory(
    categoryId: string | null,
    spellId: string,
    delta: -1 | 1
  ) {
    setDraftSpells((prev) => {
      const catSpells = prev
        .filter((s) => s.categoryId === categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
      const idx = catSpells.findIndex((s) => s.id === spellId);
      const targetIdx = idx + delta;
      if (idx < 0 || targetIdx < 0 || targetIdx >= catSpells.length) return prev;

      const reordered = [...catSpells];
      const temp = reordered[idx];
      reordered[idx] = reordered[targetIdx];
      reordered[targetIdx] = temp;

      const orderMap = new Map<string, number>();
      reordered.forEach((s, i) => orderMap.set(s.id, i + 1));

      return prev.map((s) =>
        orderMap.has(s.id) ? { ...s, sortOrder: orderMap.get(s.id)! } : s
      );
    });
    setHighlightedSpellId(spellId);
    setIsDirty(true);
  }

  function updateSpellDraft(spellId: string, patch: Partial<DraftSpell>) {
    setDraftSpells((prev) => {
      // If moving to another category, assign it to the end of that category
      let nextSortOrder = patch.sortOrder;
      if (
        patch.categoryId !== undefined &&
        nextSortOrder === undefined
      ) {
        const siblings = prev.filter(
          (s) => s.categoryId === patch.categoryId && s.id !== spellId
        );
        const maxOrder = siblings.reduce(
          (max, s) => Math.max(max, s.sortOrder),
          0
        );
        nextSortOrder = maxOrder + 1;
      }

      return prev.map((s) =>
        s.id === spellId
          ? {
              ...s,
              ...patch,
              ...(nextSortOrder !== undefined
                ? { sortOrder: nextSortOrder }
                : {}),
            }
          : s
      );
    });
    setHighlightedSpellId(spellId);
    setIsDirty(true);
  }

  function toggleCategoryPublished(
    categoryId: string | null,
    publishAllInCat: boolean
  ) {
    setDraftSpells((prev) =>
      prev.map((s) =>
        s.categoryId === categoryId
          ? { ...s, isPublished: publishAllInCat }
          : s
      )
    );
    setIsDirty(true);
  }

  async function handleCreateNewCategory() {
    if (!newCatName.trim()) return;
    const res = await createCatMut.mutateAsync({
      name: newCatName.trim(),
      publicIntro: newCatIntro.trim() || null,
    });
    setDraftCategories((prev) => {
      if (prev.some((c) => c.id === res.category.id)) return prev;
      return [
        ...prev,
        {
          id: res.category.id,
          name: res.category.name,
          slug: res.category.slug,
          publicIntro: res.category.publicIntro,
          sortOrder: prev.length + 1,
        },
      ];
    });
    setNewCatName("");
    setNewCatIntro("");
    setAddingCat(false);
  }

  async function handleDeleteCategory(cat: DraftCategory, spellCount: number) {
    const msg =
      spellCount > 0
        ? `¿Eliminar la categoría "${cat.name}"? Los ${spellCount} hechizos pasarán a "Sin categoría".`
        : `¿Eliminar la categoría "${cat.name}"?`;
    if (!confirm(msg)) return;
    await deleteCatMut.mutateAsync(cat.id);
    setDraftCategories((prev) =>
      prev
        .filter((c) => c.id !== cat.id)
        .map((c, idx) => ({ ...c, sortOrder: idx + 1 }))
    );
    setDraftSpells((prev) =>
      prev.map((s) => (s.categoryId === cat.id ? { ...s, categoryId: null } : s))
    );
  }

  async function handleSaveAndPublish() {
    setSaving(true);
    try {
      const res = await fetch("/api/public/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: draftCategories.map((c, idx) => ({
            id: c.id,
            name: c.name.trim() || "Categoría",
            publicIntro: c.publicIntro?.trim() || null,
            sortOrder: idx + 1,
          })),
          spells: draftSpells.map((s) => ({
            id: s.id,
            categoryId: s.categoryId,
            title: s.title.trim() || "Hechizo",
            subtitleTag: s.subtitleTag?.trim() || null,
            publicDescription: s.publicDescription?.trim() || null,
            isPublished: s.isPublished,
            isOffer: s.isOffer,
            offerLabel: s.isOffer
              ? s.offerLabel?.trim() || "¡OFERTA!"
              : null,
            sortOrder: s.sortOrder,
            priceTiers: s.priceTiers.map((t) => ({
              label: t.label.trim(),
              priceArs: Number(t.priceArs || 0),
              priceUsd: Number(t.priceUsd || 0),
            })),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo sincronizar con la web");
      }

      setIsDirty(false);
      await invalidate();
      toast.success(
        `¡Web actualizada en vivo! ${json.publishedCount} hechizos publicados en tarotdeluna.netlify.app (0 tokens de Netlify consumidos).`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar cambios"
      );
    } finally {
      setSaving(false);
    }
  }

  // Group spells by category in exact sortOrder
  const groupedEditor = useMemo(() => {
    const knownIds = new Set(draftCategories.map((c) => c.id));
    const groups = draftCategories.map((cat) => ({
      category: cat,
      isUncategorized: false,
      spells: draftSpells
        .filter((s) => s.categoryId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    }));

    const uncategorized = draftSpells
      .filter((s) => !s.categoryId || !knownIds.has(s.categoryId))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

    if (uncategorized.length > 0) {
      groups.push({
        category: {
          id: "uncategorized",
          name: "Sin categoría (Otros Hechizos)",
          slug: "otros-hechizos",
          publicIntro: null,
          sortOrder: 999,
        },
        isUncategorized: true,
        spells: uncategorized,
      });
    }

    return groups;
  }, [draftCategories, draftSpells]);

  // Live Preview Categories (only categories that have at least 1 published spell)
  const previewCategories = useMemo(() => {
    return groupedEditor
      .map((g) => ({
        id: g.category.id,
        name:
          g.category.id === "uncategorized" ? "Otros Hechizos" : g.category.name,
        intro: g.category.publicIntro,
        spells: g.spells.filter((s) => s.isPublished),
      }))
      .filter((c) => c.spells.length > 0);
  }, [groupedEditor]);

  const totalPublishedCount = useMemo(
    () => draftSpells.filter((s) => s.isPublished).length,
    [draftSpells]
  );

  return (
    <AppShell>
      {/* Top Studio Header */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-4xl">
              Control Web &amp; Vista Previa
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-ready/35 bg-ready-soft px-2.5 py-0.5 text-xs font-semibold text-ready">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>0 tokens de Netlify</span>
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-muted sm:text-sm">
            Ordená categorías y hechizos, editá precios u ofertas y mirá en vivo
            cómo queda en{" "}
            <a
              href="https://tarotdeluna.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent-text hover:underline"
            >
              tarotdeluna.netlify.app ↗
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDiscardChanges}
              className="apple-press hit-44 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:border-border-strong hover:text-ink sm:min-h-11 sm:px-3.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Descartar</span>
            </button>
          )}

          <a
            href="https://tarotdeluna.netlify.app"
            target="_blank"
            rel="noreferrer"
            className="apple-press hit-44 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-border-strong sm:min-h-11 sm:px-3.5"
          >
            <span>Abrir web real</span>
            <ExternalLink className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          </a>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAndPublish}
            className={`apple-press hit-44 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] px-4 py-2 text-xs font-semibold sm:min-h-11 sm:px-5 sm:text-sm ${
              isDirty
                ? "bg-accent text-on-accent shadow-sm hover:bg-accent-hover"
                : "border border-info/40 bg-info-soft text-info hover:border-info"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {saving
                ? "Publicando..."
                : isDirty
                  ? "Guardar y Publicar en web"
                  : "Sincronizado con la web"}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Segmented Switcher (<1024px): Editor vs Vista Previa */}
      <div
        role="tablist"
        aria-label="Cambiar entre Editor y Vista Previa"
        className="relative mb-4 grid grid-cols-2 rounded-[14px] border border-border-subtle bg-surface p-1 lg:hidden"
      >
        <span
          aria-hidden="true"
          style={{
            transform:
              mobileTab === "preview" ? "translateX(100%)" : "translateX(0%)",
          }}
          className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[10px] bg-accent transition-transform duration-[200ms] ease-[var(--ease-in-out)]"
        />

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "editor"}
          onClick={() => setMobileTab("editor")}
          className={`apple-press relative z-10 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors duration-[160ms] ${
            mobileTab === "editor"
              ? "text-on-accent"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Editor y Orden ({draftCategories.length} cat.)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "preview"}
          onClick={() => setMobileTab("preview")}
          className={`apple-press relative z-10 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors duration-[160ms] ${
            mobileTab === "preview"
              ? "text-on-accent"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Vista Previa ({totalPublishedCount} en web)</span>
        </button>
      </div>

      {isLoading && !data ? (
        <HomeGrimorioSkeleton />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* =========================================================
              LEFT COLUMN (7 cols on Desktop): FULL CATALOG & ORDER EDITOR
             ========================================================= */}
          <div
            className={`space-y-4 lg:col-span-7 ${
              mobileTab === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            {/* Quick Toolbar: Summary + New Category + Publish All */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[16px] border border-border-subtle bg-surface p-3.5">
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Globe className="h-4 w-4 text-info" aria-hidden="true" />
                <span>
                  Mostrando{" "}
                  <strong className="tabular-nums text-ink">
                    {totalPublishedCount}
                  </strong>{" "}
                  de {draftSpells.length} hechizos en{" "}
                  <strong className="tabular-nums text-ink">
                    {previewCategories.length}
                  </strong>{" "}
                  categorías visibles
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddingCat((v) => !v)}
                  className="apple-press inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-text"
                >
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Nueva categoría</span>
                </button>
              </div>
            </div>

            {/* Inline Create Category Card */}
            {addingCat && (
              <div className="animate-variation-enter rounded-[16px] border border-accent/40 bg-surface p-3.5">
                <p className="mb-2 text-xs font-semibold text-ink">
                  Crear nueva categoría para la web y el grimorio
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCatName.trim()) {
                        e.preventDefault();
                        handleCreateNewCategory();
                      }
                    }}
                    placeholder="Nombre (ej. Hechizos de Protección y Escudos)..."
                    className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newCatIntro}
                      onChange={(e) => setNewCatIntro(e.target.value)}
                      placeholder="Texto introductorio público debajo del título (opcional)..."
                      className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setAddingCat(false)}
                      className="apple-press rounded-xl border border-border-subtle px-3 py-2 text-xs font-medium text-ink-muted"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!newCatName.trim() || createCatMut.isPending}
                      onClick={handleCreateNewCategory}
                      className="apple-press inline-flex items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent disabled:opacity-40"
                    >
                      {createCatMut.isPending ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Crear categoría</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Categories + Spells Accordion Blocks */}
            <div className="space-y-4">
              {groupedEditor.map(
                ({ category, isUncategorized, spells: catSpells }, catIdx) => {
                  const publishedInCat = catSpells.filter(
                    (s) => s.isPublished
                  ).length;
                  const allCatPublished =
                    catSpells.length > 0 &&
                    publishedInCat === catSpells.length;
                  const isEditingCat = editingCatId === category.id;

                  return (
                    <section
                      key={category.id}
                      className="overflow-hidden rounded-[18px] border border-border-subtle bg-surface transition"
                    >
                      {/* Category Header Bar */}
                      <div className="border-b border-border-subtle bg-canvas/70 px-3.5 py-3 sm:px-4">
                        {isEditingCat && !isUncategorized ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-text">
                                Editando categoría #{catIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="apple-press inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent"
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Listo</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              autoFocus
                              value={category.name}
                              onChange={(e) =>
                                updateCategoryField(category.id, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="Nombre de la categoría"
                              className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
                            />
                            <textarea
                              rows={2}
                              value={category.publicIntro ?? ""}
                              onChange={(e) =>
                                updateCategoryField(category.id, {
                                  publicIntro: e.target.value || null,
                                })
                              }
                              placeholder="Texto introductorio opcional para la web (se muestra debajo del título subrayado)..."
                              className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {!isUncategorized && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={catIdx === 0}
                                    onClick={() => moveCategory(catIdx, -1)}
                                    title="Subir categoría en la página"
                                    aria-label={`Subir categoría ${category.name}`}
                                    className="apple-press flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-surface text-ink-muted hover:border-accent hover:text-ink disabled:opacity-30"
                                  >
                                    <ArrowUp
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      catIdx >= draftCategories.length - 1
                                    }
                                    onClick={() => moveCategory(catIdx, 1)}
                                    title="Bajar categoría en la página"
                                    aria-label={`Bajar categoría ${category.name}`}
                                    className="apple-press flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-surface text-ink-muted hover:border-accent hover:text-ink disabled:opacity-30"
                                  >
                                    <ArrowDown
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="section-heading truncate text-base font-semibold text-ink sm:text-lg">
                                    {category.name}
                                  </h2>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                                      publishedInCat > 0
                                        ? "bg-info-soft text-info"
                                        : "bg-surface-elevated text-ink-dim"
                                    }`}
                                  >
                                    {publishedInCat}/{catSpells.length} en web
                                  </span>
                                </div>
                                {category.publicIntro && (
                                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">
                                    “{category.publicIntro}”
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {catSpells.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleCategoryPublished(
                                      isUncategorized ? null : category.id,
                                      !allCatPublished
                                    )
                                  }
                                  className="apple-press rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs font-semibold text-accent-text hover:border-accent"
                                >
                                  {allCatPublished
                                    ? "Ocultar todos"
                                    : "Publicar todos"}
                                </button>
                              )}

                              {!isUncategorized && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCatId(category.id)}
                                    title="Editar nombre o intro de la categoría"
                                    aria-label={`Editar ${category.name}`}
                                    className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface text-ink-muted hover:border-accent hover:text-accent-text"
                                  >
                                    <Edit3
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteCategory(
                                        category,
                                        catSpells.length
                                      )
                                    }
                                    title="Eliminar categoría"
                                    aria-label={`Eliminar ${category.name}`}
                                    className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface text-ink-dim hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
                                  >
                                    <Trash2
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Spells List inside Category */}
                      {catSpells.length === 0 ? (
                        <div className="p-4 text-center text-xs text-ink-dim">
                          Sin hechizos en esta categoría. Podés mover cualquier
                          hechizo aquí usando su selector de categoría.
                        </div>
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {catSpells.map((spell, spIdx) => {
                            const isExpanded = expandedSpellId === spell.id;
                            const effectiveDescription =
                              spell.publicDescription || spell.purpose || "";

                            return (
                              <div
                                key={spell.id}
                                className={`p-3 transition sm:p-3.5 ${
                                  spell.isPublished
                                    ? "bg-surface"
                                    : "bg-canvas/40 opacity-80"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  {/* Left: Up/Down Order + Publish Toggle + Title */}
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        type="button"
                                        disabled={spIdx === 0}
                                        onClick={() =>
                                          moveSpellInCategory(
                                            spell.categoryId,
                                            spell.id,
                                            -1
                                          )
                                        }
                                        title="Subir posición dentro de la categoría"
                                        aria-label={`Subir ${spell.title}`}
                                        className="apple-press flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-canvas text-ink-muted hover:border-accent hover:text-ink disabled:opacity-25"
                                      >
                                        <ChevronUp
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={
                                          spIdx === catSpells.length - 1
                                        }
                                        onClick={() =>
                                          moveSpellInCategory(
                                            spell.categoryId,
                                            spell.id,
                                            1
                                          )
                                        }
                                        title="Bajar posición dentro de la categoría"
                                        aria-label={`Bajar ${spell.title}`}
                                        className="apple-press flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-canvas text-ink-muted hover:border-accent hover:text-ink disabled:opacity-25"
                                      >
                                        <ChevronDown
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={spell.isPublished}
                                      onClick={() =>
                                        updateSpellDraft(spell.id, {
                                          isPublished: !spell.isPublished,
                                        })
                                      }
                                      className={`apple-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
                                        spell.isPublished
                                          ? "border-info/45 bg-info-soft text-info"
                                          : "border-border-subtle bg-canvas text-ink-dim hover:text-ink"
                                      }`}
                                    >
                                      {spell.isPublished ? (
                                        <>
                                          <Globe
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
                                          <span>Público</span>
                                        </>
                                      ) : (
                                        <>
                                          <Lock
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
                                          <span>Privado</span>
                                        </>
                                      )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="truncate text-sm font-semibold text-ink">
                                          {spell.title}
                                        </p>
                                        {spell.isOffer && (
                                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-on-accent">
                                            {spell.offerLabel || "¡OFERTA!"}
                                          </span>
                                        )}
                                      </div>
                                      <p className="truncate tabular-nums text-xs text-ink-muted">
                                        {spell.priceTiers
                                          .map((t) =>
                                            formatPublicPriceLine(
                                              t.label,
                                              t.priceArs,
                                              t.priceUsd
                                            )
                                          )
                                          .join(" · ")}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right: Category Mover + Edit Web Details Button */}
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <select
                                      aria-label={`Cambiar categoría de ${spell.title}`}
                                      value={spell.categoryId ?? ""}
                                      onChange={(e) =>
                                        updateSpellDraft(spell.id, {
                                          categoryId: e.target.value || null,
                                        })
                                      }
                                      className="h-8 max-w-[140px] truncate rounded-lg border border-border-subtle bg-canvas px-2 text-xs font-medium text-ink outline-none focus:border-accent"
                                    >
                                      {draftCategories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedSpellId(
                                          isExpanded ? null : spell.id
                                        )
                                      }
                                      className={`apple-press inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${
                                        isExpanded
                                          ? "border-accent bg-accent-soft text-accent-text"
                                          : "border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                                      }`}
                                    >
                                      <Edit3
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                      <span className="hidden sm:inline">
                                        Texto y Precio
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {/* Expandable Inline Editor for Public Title, Subtitle, Description, Offer, and Prices */}
                                {isExpanded && (
                                  <div className="animate-variation-enter mt-3 space-y-3 rounded-2xl border border-border-subtle bg-canvas p-3.5">
                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-ink-muted">
                                          Título en la web
                                        </label>
                                        <input
                                          type="text"
                                          value={spell.title}
                                          onChange={(e) =>
                                            updateSpellDraft(spell.id, {
                                              title: e.target.value,
                                            })
                                          }
                                          className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-ink-muted">
                                          Subtítulo en cursiva (opcional)
                                        </label>
                                        <input
                                          type="text"
                                          value={spell.subtitleTag ?? ""}
                                          onChange={(e) =>
                                            updateSpellDraft(spell.id, {
                                              subtitleTag:
                                                e.target.value || null,
                                            })
                                          }
                                          placeholder="Ej. Limpieza energética profunda + Purgado"
                                          className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-[11px] font-semibold text-ink-muted">
                                        Descripción pública para tus clientas
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={
                                          spell.publicDescription ??
                                          effectiveDescription
                                        }
                                        onChange={(e) =>
                                          updateSpellDraft(spell.id, {
                                            publicDescription:
                                              e.target.value || null,
                                          })
                                        }
                                        placeholder="Explicá de qué trata este ritual para quienes visitan tarotdeluna.netlify.app..."
                                        className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                                      />
                                    </div>

                                    {/* Price Tiers Editor */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-ink-muted">
                                          Precios públicos (ARS / USD)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateSpellDraft(spell.id, {
                                              priceTiers: [
                                                ...spell.priceTiers,
                                                {
                                                  label: "Potenciado",
                                                  priceArs: 45000,
                                                  priceUsd: 48,
                                                },
                                              ],
                                            })
                                          }
                                          className="apple-press inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-semibold text-accent-text"
                                        >
                                          <Plus
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                          />
                                          <span>Sumar nivel</span>
                                        </button>
                                      </div>

                                      {spell.priceTiers.map((tier, tIdx) => (
                                        <div
                                          key={tIdx}
                                          className="grid grid-cols-12 items-center gap-2"
                                        >
                                          <input
                                            type="text"
                                            value={tier.label}
                                            onChange={(e) => {
                                              const nextTiers =
                                                spell.priceTiers.map((item, i) =>
                                                  i === tIdx
                                                    ? {
                                                        ...item,
                                                        label: e.target.value,
                                                      }
                                                    : item
                                                );
                                              updateSpellDraft(spell.id, {
                                                priceTiers: nextTiers,
                                              });
                                            }}
                                            placeholder="Etiqueta (ej. Simple)"
                                            className="col-span-4 rounded-xl border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                                          />
                                          <div className="col-span-4 flex items-center rounded-xl border border-border-subtle bg-surface px-2.5 py-1.5">
                                            <span className="mr-1 text-xs text-ink-dim">
                                              $
                                            </span>
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              min="0"
                                              value={tier.priceArs}
                                              onChange={(e) => {
                                                const nextTiers =
                                                  spell.priceTiers.map(
                                                    (item, i) =>
                                                      i === tIdx
                                                        ? {
                                                            ...item,
                                                            priceArs: Number(
                                                              e.target.value ||
                                                                0
                                                            ),
                                                          }
                                                        : item
                                                  );
                                                updateSpellDraft(spell.id, {
                                                  priceTiers: nextTiers,
                                                });
                                              }}
                                              className="w-full bg-transparent tabular-nums text-xs font-semibold text-ink outline-none"
                                            />
                                          </div>
                                          <div className="col-span-3 flex items-center rounded-xl border border-border-subtle bg-surface px-2.5 py-1.5">
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              min="0"
                                              step="any"
                                              value={tier.priceUsd}
                                              onChange={(e) => {
                                                const nextTiers =
                                                  spell.priceTiers.map(
                                                    (item, i) =>
                                                      i === tIdx
                                                        ? {
                                                            ...item,
                                                            priceUsd: Number(
                                                              e.target.value ||
                                                                0
                                                            ),
                                                          }
                                                        : item
                                                  );
                                                updateSpellDraft(spell.id, {
                                                  priceTiers: nextTiers,
                                                });
                                              }}
                                              className="w-full bg-transparent tabular-nums text-xs font-semibold text-ink outline-none"
                                            />
                                            <span className="ml-1 text-[10px] text-ink-dim">
                                              USD
                                            </span>
                                          </div>
                                          <div className="col-span-1 flex justify-end">
                                            {spell.priceTiers.length > 1 && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  updateSpellDraft(spell.id, {
                                                    priceTiers:
                                                      spell.priceTiers.filter(
                                                        (_, i) => i !== tIdx
                                                      ),
                                                  })
                                                }
                                                aria-label="Quitar precio"
                                                className="apple-press flex h-7 w-7 items-center justify-center rounded-lg text-ink-dim hover:bg-danger-soft hover:text-danger"
                                              >
                                                <Trash2
                                                  className="h-3.5 w-3.5"
                                                  aria-hidden="true"
                                                />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Offer Badge Toggle */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
                                        <input
                                          type="checkbox"
                                          checked={spell.isOffer}
                                          onChange={(e) =>
                                            updateSpellDraft(spell.id, {
                                              isOffer: e.target.checked,
                                            })
                                          }
                                          className="h-4 w-4 accent-[var(--accent-solid)]"
                                        />
                                        <Tag
                                          className="h-3.5 w-3.5 text-accent-text"
                                          aria-hidden="true"
                                        />
                                        <span>Destacar con cartel de Oferta</span>
                                      </label>

                                      {spell.isOffer && (
                                        <input
                                          type="text"
                                          value={spell.offerLabel ?? "¡OFERTA!"}
                                          onChange={(e) =>
                                            updateSpellDraft(spell.id, {
                                              offerLabel: e.target.value,
                                            })
                                          }
                                          placeholder="¡OFERTA!"
                                          className="w-36 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs font-bold text-accent-text outline-none focus:border-accent"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                }
              )}
            </div>
          </div>

          {/* =========================================================
              RIGHT COLUMN (5 cols on Desktop): 1:1 LIVE CARRD SIMULATOR
             ========================================================= */}
          <div
            className={`lg:sticky lg:top-6 lg:col-span-5 ${
              mobileTab === "editor" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="overflow-hidden rounded-[24px] border border-border-subtle shadow-lg">
              {/* Simulator Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#1e1312] px-4 py-2.5 text-xs text-[#f7f3eb]/85">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-ready-solid" />
                  <span className="font-semibold">
                    Vista previa en vivo · tarotdeluna.netlify.app
                  </span>
                </div>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums">
                  {isDirty ? "Borrador en vivo" : "Publicado"}
                </span>
              </div>

              {/* 1:1 Carrd Outer Shell (#2e1d1c radial gradient) */}
              <div
                style={{
                  background:
                    "radial-gradient(circle at 50% 20%, #442725 0%, #1c1313 100%)",
                }}
                className="scroll-contain max-h-[78dvh] overflow-y-auto p-4 sm:p-5"
              >
                <div className="mx-auto flex w-full max-w-[410px] flex-col gap-2">
                  {/* Compact Hero Header (@eltarotde_luna) */}
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #3c2220 0%, #231716 100%)",
                    }}
                    className="relative flex h-[92px] w-full items-end justify-between overflow-hidden rounded-t-[20px] rounded-b-[14px] p-4 shadow-md"
                  >
                    <div
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(20,15,14,0.1) 0%, rgba(20,15,14,0.82) 100%)",
                      }}
                      className=" absolute inset-0"
                    />
                    <div className="relative z-10 flex flex-col">
                      <span className="text-[19px] font-semibold tracking-[-0.01em] text-[#fbf9f5] drop-shadow">
                        @eltarotde_luna
                      </span>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#e6cbc8",
                        color: "#8c2d29",
                      }}
                      className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full shadow"
                      title="Botón Casita en tu web"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 3.2 3 10.7h2.6V20h5v-5.3h2.8V20h5v-9.3H21L12 3.2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Carrd Cream Card Body (#f7f3eb) */}
                  <div
                    style={{
                      backgroundColor: "#f7f3eb",
                      color: "#231d1b",
                    }}
                    className="flex flex-col overflow-hidden rounded-[22px] shadow-xl"
                  >
                    <div className="p-4 sm:p-5">
                      {/* # Hechizos Header */}
                      <div
                        style={{
                          borderBottom: "1.5px solid rgba(140, 45, 41, 0.38)",
                        }}
                        className="mb-3.5 flex items-center justify-between pb-2"
                      >
                        <h2
                          style={{ color: "#8c2d29" }}
                          className="text-[16.5px] font-bold underline underline-offset-4"
                        >
                          # Hechizos
                        </h2>
                        <span
                          style={{ color: "#8c2d29" }}
                          className="text-[11px] font-semibold opacity-75 tabular-nums"
                        >
                          {totalPublishedCount}{" "}
                          {totalPublishedCount === 1 ? "ritual" : "rituales"}
                        </span>
                      </div>

                      {previewCategories.length === 0 ? (
                        <div className="py-8 text-center">
                          <Sparkles
                            style={{ color: "#8c2d29" }}
                            className="mx-auto mb-2 h-5 w-5 opacity-70"
                          />
                          <p
                            style={{ color: "#5a2220" }}
                            className="text-xs font-medium"
                          >
                            No hay ningún hechizo marcado como Público. Activá el
                            botón &ldquo;Público&rdquo; en los hechizos que
                            quieras mostrar acá.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {previewCategories.map((cat) => (
                            <div key={cat.id}>
                              <h3
                                style={{ color: "#8c2d29" }}
                                className="mb-2.5 inline-block text-[15.5px] font-bold underline underline-offset-4"
                              >
                                {cat.name}
                              </h3>

                              {cat.intro && (
                                <p
                                  style={{ color: "#5a2220" }}
                                  className="mb-3 text-[13.5px] leading-[1.48]"
                                >
                                  {cat.intro}
                                </p>
                              )}

                              <div className="flex flex-col gap-3.5">
                                {cat.spells.map((spell, idx) => {
                                  const isLast = idx === cat.spells.length - 1;
                                  const isHighlighted =
                                    highlightedSpellId === spell.id;
                                  const desc =
                                    spell.publicDescription ||
                                    spell.purpose ||
                                    null;

                                  return (
                                    <article
                                      key={spell.id}
                                      style={{
                                        borderBottom: isLast
                                          ? "none"
                                          : "1px dashed rgba(140, 45, 41, 0.18)",
                                        backgroundColor: isHighlighted
                                          ? "rgba(140, 45, 41, 0.06)"
                                          : "transparent",
                                      }}
                                      className={`flex flex-col gap-1 rounded-lg transition-colors duration-200 ${
                                        isLast ? "pb-0" : "pb-3"
                                      } ${isHighlighted ? "px-2 py-1.5" : ""}`}
                                    >
                                      <h4
                                        style={{ color: "#8c2d29" }}
                                        className="text-[15px] font-bold"
                                      >
                                        {spell.title}
                                      </h4>

                                      {spell.subtitleTag && (
                                        <span
                                          style={{ color: "#385766" }}
                                          className="text-[12.5px] font-semibold italic"
                                        >
                                          {spell.subtitleTag}
                                        </span>
                                      )}

                                      {desc && (
                                        <p
                                          style={{ color: "#5a2220" }}
                                          className="text-[13.7px] leading-[1.48]"
                                        >
                                          {desc}
                                        </p>
                                      )}

                                      {spell.priceTiers.length > 0 && (
                                        <div className="mt-0.5 flex flex-col gap-0.5">
                                          {spell.priceTiers.map((price, pIdx) => (
                                            <span
                                              key={`${spell.id}-p-${pIdx}`}
                                              style={{ color: "#4d1917" }}
                                              className="inline-flex flex-wrap items-center gap-1.5 text-[13.7px] font-bold italic"
                                            >
                                              <span>
                                                {formatPublicPriceLine(
                                                  price.label,
                                                  price.priceArs,
                                                  price.priceUsd
                                                )}
                                              </span>
                                              {spell.isOffer && pIdx === 0 && (
                                                <span
                                                  style={{
                                                    backgroundColor: "#8c2d29",
                                                    color: "#fbf9f5",
                                                  }}
                                                  className="rounded-full px-2 py-0.5 text-[10.5px] font-bold not-italic tracking-wider"
                                                >
                                                  {spell.offerLabel ||
                                                    "¡OFERTA!"}
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Carrd Footer Bar */}
                    <div
                      style={{
                        backgroundColor: "#e6cbc8",
                        color: "#8c2d29",
                        borderTop: "1px solid rgba(140, 45, 41, 0.15)",
                      }}
                      className="flex items-center justify-between px-4 py-2.5 text-[13.5px] font-semibold"
                    >
                      <span>@eltarotde_luna</span>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: "#f7f3eb" }}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-xs shadow-xs"
                        >
                          𝕏
                        </span>
                        <span
                          style={{ backgroundColor: "#f7f3eb" }}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-xs shadow-xs"
                        >
                          IG
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
