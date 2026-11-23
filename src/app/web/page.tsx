"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  Globe,
  GripVertical,
  Layers,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { IosBottomSheet } from "@/components/IosBottomSheet";
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

type SelectedElement =
  | { type: "category"; id: string }
  | { type: "spell"; id: string }
  | null;

interface ActiveDragState {
  kind: "category" | "spell";
  id: string;
  title: string;
  subtitle?: string;
  sourceCatId?: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  width: number;
  height: number;
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

export default function ElementorWebBuilderPage() {
  const { data, isLoading } = useGrimorio();
  const invalidate = useInvalidateGrimorio();
  const createCatMut = useCreateCategory();
  const deleteCatMut = useDeleteCategory();

  const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);
  const [draftSpells, setDraftSpells] = useState<DraftSpell[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Elementor Mode: 'builder' shows selection frames, drag handles, and drop zones;
  // 'clean' shows the pure client view without handles
  const [viewMode, setViewMode] = useState<"builder" | "clean">("builder");
  const [showEmptyCategories, setShowEmptyCategories] = useState(true);

  // Currently selected widget/section in the canvas
  const [selected, setSelected] = useState<SelectedElement>(null);
  // Bottom sheet open for mobile when tapping an element or "+ Agregar"
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // New category modal/inline
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIntro, setNewCatIntro] = useState("");

  // Live Pointer Drag-and-Drop State (1:1 tracking for Touch + Mouse)
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  const spellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);

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
    setSelected(null);
    toast.info("Cambios descartados. Se restauró la versión publicada.");
  }

  // Group spells by category
  const canvasCategories = useMemo(() => {
    return draftCategories.map((cat) => {
      const allInCat = draftSpells
        .filter((s) => s.categoryId === cat.id)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
        );
      const publishedInCat = allInCat.filter((s) => s.isPublished);
      return {
        category: cat,
        publishedSpells: publishedInCat,
        hiddenSpells: allInCat.filter((s) => !s.isPublished),
        totalCount: allInCat.length,
      };
    });
  }, [draftCategories, draftSpells]);

  // All hidden/private spells (available in the Widget Drawer to add/drag to the page)
  const privateSpells = useMemo(
    () =>
      draftSpells
        .filter((s) => !s.isPublished)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [draftSpells]
  );

  const totalPublishedCount = useMemo(
    () => draftSpells.filter((s) => s.isPublished).length,
    [draftSpells]
  );

  // Selected objects for Inspector
  const selectedCategory = useMemo(
    () =>
      selected?.type === "category"
        ? draftCategories.find((c) => c.id === selected.id) ?? null
        : null,
    [selected, draftCategories]
  );

  const selectedSpell = useMemo(
    () =>
      selected?.type === "spell"
        ? draftSpells.find((s) => s.id === selected.id) ?? null
        : null,
    [selected, draftSpells]
  );

  // =========================================================
  // REORDERING & MUTATION HELPERS
  // =========================================================
  function moveCategoryByIndex(fromIdx: number, toIdx: number) {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= draftCategories.length ||
      toIdx >= draftCategories.length
    ) {
      return;
    }
    setDraftCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((c, i) => ({ ...c, sortOrder: i + 1 }));
    });
    setIsDirty(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
  }

  function moveSpellToPosition(
    spellId: string,
    targetCategoryId: string,
    targetIndexInPublished: number
  ) {
    setDraftSpells((prev) => {
      const moving = prev.find((s) => s.id === spellId);
      if (!moving) return prev;

      // Get current published spells in target category (excluding the moving spell)
      const targetSiblings = prev
        .filter(
          (s) =>
            s.categoryId === targetCategoryId &&
            s.isPublished &&
            s.id !== spellId
        )
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
        );

      const clampedIndex = Math.max(
        0,
        Math.min(targetSiblings.length, targetIndexInPublished)
      );

      const updatedMoving: DraftSpell = {
        ...moving,
        categoryId: targetCategoryId,
        isPublished: true,
      };

      targetSiblings.splice(clampedIndex, 0, updatedMoving);

      const orderMap = new Map<string, number>();
      targetSiblings.forEach((s, i) => orderMap.set(s.id, i + 1));

      // Also re-normalize source category if it changed
      const sourceCatId = moving.categoryId;
      if (sourceCatId && sourceCatId !== targetCategoryId) {
        const sourceSiblings = prev
          .filter(
            (s) =>
              s.categoryId === sourceCatId && s.isPublished && s.id !== spellId
          )
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
          );
        sourceSiblings.forEach((s, i) => orderMap.set(s.id, i + 1));
      }

      return prev.map((s) => {
        if (s.id === spellId) {
          return {
            ...updatedMoving,
            sortOrder: orderMap.get(s.id) ?? clampedIndex + 1,
          };
        }
        if (orderMap.has(s.id)) {
          return { ...s, sortOrder: orderMap.get(s.id)! };
        }
        return s;
      });
    });
    setIsDirty(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
  }

  function stepSpellInCategory(spellId: string, delta: -1 | 1) {
    const sp = draftSpells.find((s) => s.id === spellId);
    if (!sp || !sp.categoryId) return;
    const publishedSiblings = draftSpells
      .filter((s) => s.categoryId === sp.categoryId && s.isPublished)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
      );
    const currentIdx = publishedSiblings.findIndex((s) => s.id === spellId);
    if (currentIdx < 0) return;
    const nextIdx = currentIdx + delta;
    if (nextIdx < 0 || nextIdx >= publishedSiblings.length) return;
    moveSpellToPosition(spellId, sp.categoryId, nextIdx);
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

  function updateSpellDraft(spellId: string, patch: Partial<DraftSpell>) {
    if (
      patch.categoryId &&
      patch.isPublished !== false &&
      patch.sortOrder === undefined
    ) {
      const targetSiblings = draftSpells.filter(
        (s) =>
          s.categoryId === patch.categoryId && s.isPublished && s.id !== spellId
      );
      moveSpellToPosition(spellId, patch.categoryId, targetSiblings.length);
      if (Object.keys(patch).length === 1 && "categoryId" in patch) {
        return;
      }
    }

    setDraftSpells((prev) =>
      prev.map((s) => (s.id === spellId ? { ...s, ...patch } : s))
    );
    setIsDirty(true);
  }

  // =========================================================
  // 1:1 POINTER DRAG ENGINE (ELEMENTOR LIVE SORTING)
  // =========================================================
  function startPointerDrag(
    e: React.PointerEvent,
    kind: "category" | "spell",
    id: string,
    title: string,
    containerEl: HTMLElement | null,
    subtitle?: string,
    sourceCatId?: string | null
  ) {
    e.stopPropagation();
    e.preventDefault();

    const rect = containerEl?.getBoundingClientRect() ?? {
      left: e.clientX - 140,
      top: e.clientY - 24,
      width: 280,
      height: 56,
    };

    setSelected({ type: kind, id });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }

    setDragState({
      kind,
      id,
      title,
      subtitle,
      sourceCatId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      grabOffsetX: e.clientX - rect.left,
      grabOffsetY: e.clientY - rect.top,
      width: Math.min(360, Math.max(240, rect.width)),
      height: Math.min(110, Math.max(48, rect.height)),
    });
  }

  useEffect(() => {
    if (!dragState) return;

    function handlePointerMove(e: PointerEvent) {
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
            }
          : null
      );

      // Auto-scroll the canvas container if pointer is near top or bottom edge
      if (canvasScrollRef.current) {
        const scrollRect = canvasScrollRef.current.getBoundingClientRect();
        const edgeZone = 55;
        if (e.clientY < scrollRect.top + edgeZone) {
          canvasScrollRef.current.scrollBy({ top: -10 });
        } else if (e.clientY > scrollRect.bottom - edgeZone) {
          canvasScrollRef.current.scrollBy({ top: 10 });
        }
      }

      if (dragState?.kind === "category") {
        // Check if pointer crossed another category's vertical midpoint
        const currentIdx = draftCategories.findIndex(
          (c) => c.id === dragState.id
        );
        if (currentIdx < 0) return;

        for (let i = 0; i < draftCategories.length; i++) {
          if (i === currentIdx) continue;
          const cat = draftCategories[i];
          const el = categoryRefs.current.get(cat.id);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const midY = r.top + r.height / 2;

          if (
            (currentIdx < i && e.clientY > midY && e.clientY < r.bottom + 20) ||
            (currentIdx > i && e.clientY < midY && e.clientY > r.top - 20)
          ) {
            moveCategoryByIndex(currentIdx, i);
            break;
          }
        }
      } else if (dragState?.kind === "spell") {
        // 1. Find which category block the pointer is currently inside
        let hoveredCatId: string | null = null;
        for (const cat of draftCategories) {
          const catEl = categoryRefs.current.get(cat.id);
          if (!catEl) continue;
          const r = catEl.getBoundingClientRect();
          if (e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12) {
            hoveredCatId = cat.id;
            break;
          }
        }

        if (!hoveredCatId) return;

        // 2. Find index among published spells in hoveredCatId
        const catPublished = draftSpells
          .filter(
            (s) =>
              s.categoryId === hoveredCatId &&
              s.isPublished &&
              s.id !== dragState.id
          )
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
          );

        let targetIdx = catPublished.length;
        for (let i = 0; i < catPublished.length; i++) {
          const spEl = spellRefs.current.get(catPublished[i].id);
          if (!spEl) continue;
          const sr = spEl.getBoundingClientRect();
          const midY = sr.top + sr.height / 2;
          if (e.clientY < midY) {
            targetIdx = i;
            break;
          }
        }

        // Check if spell is already at this category + index
        const currentMoving = draftSpells.find((s) => s.id === dragState.id);
        const currentAllPublishedInCat = draftSpells
          .filter((s) => s.categoryId === hoveredCatId && s.isPublished)
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
          );
        const existingIdx = currentAllPublishedInCat.findIndex(
          (s) => s.id === dragState.id
        );

        if (
          !currentMoving?.isPublished ||
          currentMoving.categoryId !== hoveredCatId ||
          existingIdx !== targetIdx
        ) {
          moveSpellToPosition(dragState.id, hoveredCatId, targetIdx);
        }
      }
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState, draftCategories, draftSpells]);

  // =========================================================
  // CATEGORY CRUD & PUBLISH
  // =========================================================
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
    setSelected({ type: "category", id: res.category.id });
    setNewCatName("");
    setNewCatIntro("");
    setAddingCat(false);
  }

  async function handleDeleteCategory(cat: DraftCategory) {
    const count = draftSpells.filter((s) => s.categoryId === cat.id).length;
    const msg =
      count > 0
        ? `¿Eliminar la categoría "${cat.name}"? Sus ${count} hechizos pasarán a la primera categoría disponible.`
        : `¿Eliminar la categoría "${cat.name}"?`;
    if (!confirm(msg)) return;
    await deleteCatMut.mutateAsync(cat.id);
    const remaining = draftCategories.filter((c) => c.id !== cat.id);
    const fallbackCatId = remaining[0]?.id ?? null;

    setDraftCategories(
      remaining.map((c, idx) => ({ ...c, sortOrder: idx + 1 }))
    );
    setDraftSpells((prev) =>
      prev.map((s) =>
        s.categoryId === cat.id ? { ...s, categoryId: fallbackCatId } : s
      )
    );
    setSelected(null);
    setMobileInspectorOpen(false);
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
        `¡Publicado en vivo! ${json.publishedCount} hechizos activos en tarotdeluna.netlify.app (0 tokens de Netlify consumidos).`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar cambios"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // REUSABLE INSPECTOR CONTENT (DESKTOP SIDEBAR & MOBILE SHEET)
  // =========================================================
  function renderInspectorContent() {
    if (selectedCategory) {
      const catIdx = draftCategories.findIndex(
        (c) => c.id === selectedCategory.id
      );
      const spellsInCat = draftSpells.filter(
        (s) => s.categoryId === selectedCategory.id
      );
      const pubInCat = spellsInCat.filter((s) => s.isPublished).length;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-text">
                Sección / Categoría #{catIdx + 1}
              </span>
              <h3 className="section-heading text-base font-semibold text-ink">
                {selectedCategory.name}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={catIdx <= 0}
                onClick={() => moveCategoryByIndex(catIdx, catIdx - 1)}
                title="Subir sección"
                className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:text-ink disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={catIdx >= draftCategories.length - 1}
                onClick={() => moveCategoryByIndex(catIdx, catIdx + 1)}
                title="Bajar sección"
                className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:text-ink disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Título de la categoría en la web
            </label>
            <input
              type="text"
              value={selectedCategory.name}
              onChange={(e) =>
                updateCategoryField(selectedCategory.id, {
                  name: e.target.value,
                })
              }
              className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Texto introductorio debajo del título (opcional)
            </label>
            <textarea
              rows={3}
              value={selectedCategory.publicIntro ?? ""}
              onChange={(e) =>
                updateCategoryField(selectedCategory.id, {
                  publicIntro: e.target.value || null,
                })
              }
              placeholder="Ej. Según tu caso y lo que quieras lograr, podés solicitar un ritual a medida..."
              className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-canvas p-3 text-xs">
            <span className="text-ink-muted">
              Visibles en esta sección:{" "}
              <strong className="text-ink tabular-nums">
                {pubInCat} de {spellsInCat.length}
              </strong>
            </span>
            <button
              type="button"
              onClick={() =>
                handleDeleteCategory(selectedCategory)
              }
              className="inline-flex items-center gap-1 font-semibold text-danger hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Eliminar sección</span>
            </button>
          </div>
        </div>
      );
    }

    if (selectedSpell) {
      const effectiveDesc =
        selectedSpell.publicDescription || selectedSpell.purpose || "";

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-info">
                Widget de Hechizo
              </span>
              <h3 className="section-heading truncate text-base font-semibold text-ink">
                {selectedSpell.title}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepSpellInCategory(selectedSpell.id, -1)}
                title="Subir posición"
                className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:text-ink"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => stepSpellInCategory(selectedSpell.id, 1)}
                title="Bajar posición"
                className="apple-press flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas text-ink-muted hover:text-ink"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Public / Private Switch + Category Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                updateSpellDraft(selectedSpell.id, {
                  isPublished: !selectedSpell.isPublished,
                })
              }
              className={`apple-press flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                selectedSpell.isPublished
                  ? "border-info/50 bg-info-soft text-info"
                  : "border-border-subtle bg-canvas text-ink-muted"
              }`}
            >
              {selectedSpell.isPublished ? (
                <>
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>En Web (Público)</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Oculto (Privado)</span>
                </>
              )}
            </button>

            <select
              aria-label="Categoría del hechizo"
              value={selectedSpell.categoryId ?? ""}
              onChange={(e) =>
                updateSpellDraft(selectedSpell.id, {
                  categoryId: e.target.value || null,
                })
              }
              className="min-h-10 rounded-xl border border-border-subtle bg-canvas px-2.5 text-xs font-semibold text-ink outline-none focus:border-accent"
            >
              {draftCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Título público
            </label>
            <input
              type="text"
              value={selectedSpell.title}
              onChange={(e) =>
                updateSpellDraft(selectedSpell.id, {
                  title: e.target.value,
                })
              }
              className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Subtítulo en cursiva (opcional)
            </label>
            <input
              type="text"
              value={selectedSpell.subtitleTag ?? ""}
              onChange={(e) =>
                updateSpellDraft(selectedSpell.id, {
                  subtitleTag: e.target.value || null,
                })
              }
              placeholder="Ej. Limpieza energética profunda + Purgado"
              className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Descripción para clientas
            </label>
            <textarea
              rows={3}
              value={selectedSpell.publicDescription ?? effectiveDesc}
              onChange={(e) =>
                updateSpellDraft(selectedSpell.id, {
                  publicDescription: e.target.value || null,
                })
              }
              placeholder="Explicá qué logra este ritual..."
              className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            />
          </div>

          {/* Prices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-muted">
                Precios (ARS / USD)
              </span>
              <button
                type="button"
                onClick={() =>
                  updateSpellDraft(selectedSpell.id, {
                    priceTiers: [
                      ...selectedSpell.priceTiers,
                      { label: "Potenciado", priceArs: 45000, priceUsd: 48 },
                    ],
                  })
                }
                className="apple-press inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas px-2 py-1 text-[11px] font-semibold text-accent-text"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                <span>Nivel</span>
              </button>
            </div>

            {selectedSpell.priceTiers.map((tier, tIdx) => (
              <div
                key={tIdx}
                className="grid grid-cols-12 items-center gap-1.5"
              >
                <input
                  type="text"
                  value={tier.label}
                  onChange={(e) => {
                    const nextTiers = selectedSpell.priceTiers.map((item, i) =>
                      i === tIdx ? { ...item, label: e.target.value } : item
                    );
                    updateSpellDraft(selectedSpell.id, {
                      priceTiers: nextTiers,
                    });
                  }}
                  placeholder="Simple"
                  className="col-span-4 rounded-xl border border-border-subtle bg-canvas px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
                <div className="col-span-4 flex items-center rounded-xl border border-border-subtle bg-canvas px-2 py-1.5">
                  <span className="mr-1 text-xs text-ink-dim">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={tier.priceArs}
                    onChange={(e) => {
                      const nextTiers = selectedSpell.priceTiers.map(
                        (item, i) =>
                          i === tIdx
                            ? { ...item, priceArs: Number(e.target.value || 0) }
                            : item
                      );
                      updateSpellDraft(selectedSpell.id, {
                        priceTiers: nextTiers,
                      });
                    }}
                    className="w-full bg-transparent tabular-nums text-xs font-semibold text-ink outline-none"
                  />
                </div>
                <div className="col-span-3 flex items-center rounded-xl border border-border-subtle bg-canvas px-2 py-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={tier.priceUsd}
                    onChange={(e) => {
                      const nextTiers = selectedSpell.priceTiers.map(
                        (item, i) =>
                          i === tIdx
                            ? { ...item, priceUsd: Number(e.target.value || 0) }
                            : item
                      );
                      updateSpellDraft(selectedSpell.id, {
                        priceTiers: nextTiers,
                      });
                    }}
                    className="w-full bg-transparent tabular-nums text-xs font-semibold text-ink outline-none"
                  />
                  <span className="ml-0.5 text-[10px] text-ink-dim">USD</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  {selectedSpell.priceTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSpellDraft(selectedSpell.id, {
                          priceTiers: selectedSpell.priceTiers.filter(
                            (_, i) => i !== tIdx
                          ),
                        })
                      }
                      className="text-ink-dim hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Offer Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-canvas p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={selectedSpell.isOffer}
                onChange={(e) =>
                  updateSpellDraft(selectedSpell.id, {
                    isOffer: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-[var(--accent-solid)]"
              />
              <Tag className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
              <span>Cartel de Oferta</span>
            </label>

            {selectedSpell.isOffer && (
              <input
                type="text"
                value={selectedSpell.offerLabel ?? "¡OFERTA!"}
                onChange={(e) =>
                  updateSpellDraft(selectedSpell.id, {
                    offerLabel: e.target.value,
                  })
                }
                className="w-28 rounded-lg border border-border-subtle bg-surface px-2 py-1 text-xs font-bold text-accent-text outline-none focus:border-accent"
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="py-6 text-center text-xs text-ink-muted">
        Tocá cualquier <strong>categoría</strong> o <strong>hechizo</strong> en
        la vista previa móvil para editar su texto, precio u oferta, o
        arrastralo desde el ícono{" "}
        <GripVertical className="inline h-3.5 w-3.5 text-accent-text" /> para
        cambiar su posición fija en la página.
      </div>
    );
  }

  return (
    <AppShell>
      {/* Top Studio Header */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display-heading text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-3xl">
              Constructor Visual Web
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-ready/35 bg-ready-soft px-2.5 py-0.5 text-xs font-semibold text-ready">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Estilo Elementor · 0 tokens Netlify</span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
            Tocá o arrastrá desde{" "}
            <GripVertical className="inline h-3.5 w-3.5 text-ink" /> cualquier
            categoría o hechizo directamente sobre la vista móvil para
            reposicionarlo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDiscardChanges}
              className="apple-press hit-44 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:border-border-strong hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Descartar</span>
            </button>
          )}

          <a
            href="https://tarotdeluna.netlify.app"
            target="_blank"
            rel="noreferrer"
            className="apple-press hit-44 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-border-strong"
          >
            <span>Ver web real</span>
            <ExternalLink className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          </a>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAndPublish}
            className={`apple-press hit-44 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] px-4 py-2 text-xs font-semibold sm:text-sm ${
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
                  ? "Guardar y Publicar"
                  : "Sincronizado"}
            </span>
          </button>
        </div>
      </header>

      {/* Builder Action Bar (Mode Switch + Add Category + Private Drawer trigger on Mobile) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-border-subtle bg-surface p-2.5 sm:px-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setViewMode((v) => (v === "builder" ? "clean" : "builder"))
            }
            className={`apple-press inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              viewMode === "builder"
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border-subtle bg-canvas text-ink-muted"
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {viewMode === "builder"
                ? "Modo Constructor (Arrastrar activo)"
                : "Vista Limpia (Cliente)"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmptyCategories((v) => !v)}
            className={`apple-press inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
              showEmptyCategories
                ? "border-border-strong bg-canvas text-ink"
                : "border-border-subtle bg-canvas text-ink-dim"
            }`}
          >
            <span>
              {showEmptyCategories
                ? "Mostrando categorías vacías"
                : "Ocultando categorías vacías"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAddingCat((v) => !v)}
            className="apple-press inline-flex min-h-9 items-center gap-1 rounded-xl bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-text"
          >
            <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>+ Categoría</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="apple-press inline-flex min-h-9 items-center gap-1 rounded-xl border border-info/40 bg-info-soft px-3 py-1.5 text-xs font-semibold text-info lg:hidden"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hechizos ({privateSpells.length} ocultos)</span>
          </button>
        </div>
      </div>

      {/* Inline Create Category Banner */}
      {addingCat && (
        <div className="animate-variation-enter mb-4 rounded-[16px] border border-accent/40 bg-surface p-3.5">
          <p className="mb-2 text-xs font-semibold text-ink">
            Nueva sección de categoría en la página
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
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
              placeholder="Nombre (ej. Hechizos de Prosperidad y Dinero)..."
              className="flex-1 rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <input
              type="text"
              value={newCatIntro}
              onChange={(e) => setNewCatIntro(e.target.value)}
              placeholder="Intro pública opcional..."
              className="flex-1 rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            />
            <div className="flex items-center gap-1.5">
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
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Crear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && !data ? (
        <HomeGrimorioSkeleton />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* =========================================================
              CENTER / LEFT (7 cols on Desktop): INTERACTIVE ELEMENTOR MOBILE CANVAS
             ========================================================= */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-[26px] border border-border-subtle shadow-xl">
              {/* Mobile Device Top Frame */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#1c1211] px-4 py-2.5 text-xs text-[#f7f3eb]/90">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-ready-solid" />
                  <span className="font-semibold">
                    Lienzo Móvil Interactivo · tarotdeluna.netlify.app
                  </span>
                </div>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums">
                  {totalPublishedCount} activos
                </span>
              </div>

              {/* Carrd Outer Backdrop */}
              <div
                ref={canvasScrollRef}
                style={{
                  background:
                    "radial-gradient(circle at 50% 20%, #442725 0%, #1c1313 100%)",
                }}
                className="scroll-contain max-h-[82dvh] overflow-y-auto px-3 py-5 sm:px-6"
              >
                <div className="mx-auto flex w-full max-w-[420px] flex-col gap-2.5">
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
                      className="absolute inset-0"
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
                    className="flex flex-col overflow-hidden rounded-[22px] shadow-2xl"
                  >
                    <div className="p-4 sm:p-5">
                      {/* # Hechizos Title */}
                      <div
                        style={{
                          borderBottom: "1.5px solid rgba(140, 45, 41, 0.38)",
                        }}
                        className="mb-4 flex items-center justify-between pb-2"
                      >
                        <h2
                          style={{ color: "#8c2d29" }}
                          className="text-[16.5px] font-bold underline underline-offset-4"
                        >
                          # Hechizos
                        </h2>
                        {viewMode === "builder" && (
                          <span
                            style={{ color: "#8c2d29" }}
                            className="text-[10.5px] font-semibold opacity-75"
                          >
                            Arrastrá{" "}
                            <GripVertical className="inline h-3 w-3" /> para
                            mover
                          </span>
                        )}
                      </div>

                      {/* Category Sections inside the Live Mobile Canvas */}
                      <div className="space-y-5">
                        {canvasCategories.map(
                          (
                            {
                              category,
                              publishedSpells,
                              hiddenSpells,
                            },
                            catIdx
                          ) => {
                            if (
                              !showEmptyCategories &&
                              publishedSpells.length === 0
                            ) {
                              return null;
                            }
                            if (
                              viewMode === "clean" &&
                              publishedSpells.length === 0
                            ) {
                              return null;
                            }

                            const isCatSelected =
                              selected?.type === "category" &&
                              selected.id === category.id;
                            const isCatDragging =
                              dragState?.kind === "category" &&
                              dragState.id === category.id;

                            return (
                              <div
                                key={category.id}
                                ref={(el) => {
                                  if (el)
                                    categoryRefs.current.set(category.id, el);
                                  else categoryRefs.current.delete(category.id);
                                }}
                                onClick={(e) => {
                                  if (viewMode !== "builder") return;
                                  e.stopPropagation();
                                  setSelected({
                                    type: "category",
                                    id: category.id,
                                  });
                                }}
                                style={{
                                  border:
                                    viewMode === "builder"
                                      ? isCatSelected
                                        ? "2px solid #8c2d29"
                                        : "1.5px dashed rgba(140, 45, 41, 0.28)"
                                      : "none",
                                  backgroundColor:
                                    viewMode === "builder"
                                      ? isCatSelected
                                        ? "rgba(140, 45, 41, 0.04)"
                                        : "rgba(255, 255, 255, 0.35)"
                                      : "transparent",
                                  opacity: isCatDragging ? 0.35 : 1,
                                }}
                                className={`relative transition-all duration-150 ${
                                  viewMode === "builder"
                                    ? "rounded-2xl p-3 pt-4"
                                    : ""
                                }`}
                              >
                                {/* Elementor Section Top Tab Handle */}
                                {viewMode === "builder" && (
                                  <div
                                    style={{
                                      backgroundColor: isCatSelected
                                        ? "#8c2d29"
                                        : "#d8b7b3",
                                      color: isCatSelected
                                        ? "#fbf9f5"
                                        : "#5a2220",
                                    }}
                                    className="mb-2 flex items-center justify-between rounded-lg px-2 py-1 text-[10.5px] font-bold shadow-2xs"
                                  >
                                    <div
                                      onPointerDown={(e) =>
                                        startPointerDrag(
                                          e,
                                          "category",
                                          category.id,
                                          category.name,
                                          categoryRefs.current.get(
                                            category.id
                                          ) ?? null,
                                          `${publishedSpells.length} hechizos visibles`
                                        )
                                      }
                                      className="flex flex-1 cursor-grab items-center gap-1.5 active:cursor-grabbing"
                                      title="Arrastrar categoría para cambiar su orden en la página"
                                    >
                                      <GripVertical className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">
                                        SECCIÓN #{catIdx + 1}:{" "}
                                        {category.name.toUpperCase()}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={catIdx === 0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveCategoryByIndex(
                                            catIdx,
                                            catIdx - 1
                                          );
                                        }}
                                        className="rounded p-0.5 hover:bg-black/10 disabled:opacity-30"
                                        title="Subir categoría"
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={
                                          catIdx >= draftCategories.length - 1
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveCategoryByIndex(
                                            catIdx,
                                            catIdx + 1
                                          );
                                        }}
                                        className="rounded p-0.5 hover:bg-black/10 disabled:opacity-30"
                                        title="Bajar categoría"
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelected({
                                            type: "category",
                                            id: category.id,
                                          });
                                          setMobileInspectorOpen(true);
                                        }}
                                        className="rounded p-0.5 hover:bg-black/10"
                                        title="Editar categoría"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Actual Carrd Category Title */}
                                <h3
                                  style={{ color: "#8c2d29" }}
                                  className="mb-2.5 inline-block text-[15.5px] font-bold underline underline-offset-4"
                                >
                                  {category.name}
                                </h3>

                                {category.publicIntro && (
                                  <p
                                    style={{ color: "#5a2220" }}
                                    className="mb-3 text-[13.5px] leading-[1.48]"
                                  >
                                    {category.publicIntro}
                                  </p>
                                )}

                                {/* Spells Drop Zone inside Category */}
                                {publishedSpells.length === 0 ? (
                                  <div
                                    style={{
                                      borderColor: "rgba(140, 45, 41, 0.25)",
                                      color: "#8c2d29",
                                    }}
                                    className="rounded-xl border border-dashed bg-white/40 p-3 text-center text-xs"
                                  >
                                    <p className="font-semibold">
                                      Categoría sin hechizos públicos
                                    </p>
                                    <p className="mt-0.5 text-[11px] opacity-80">
                                      Arrastrá un hechizo hasta acá o activá uno
                                      de los ocultos abajo.
                                    </p>
                                    {hiddenSpells.length > 0 && (
                                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                                        {hiddenSpells.map((hs) => (
                                          <button
                                            key={hs.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateSpellDraft(hs.id, {
                                                isPublished: true,
                                              });
                                            }}
                                            style={{
                                              backgroundColor: "#e6cbc8",
                                              color: "#8c2d29",
                                            }}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs"
                                          >
                                            <Plus className="h-3 w-3" />
                                            <span>{hs.title}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3">
                                    {publishedSpells.map((spell, spIdx) => {
                                      const isLast =
                                        spIdx === publishedSpells.length - 1;
                                      const isSpellSelected =
                                        selected?.type === "spell" &&
                                        selected.id === spell.id;
                                      const isSpellDragging =
                                        dragState?.kind === "spell" &&
                                        dragState.id === spell.id;
                                      const desc =
                                        spell.publicDescription ||
                                        spell.purpose ||
                                        null;

                                      return (
                                        <article
                                          key={spell.id}
                                          ref={(el) => {
                                            if (el)
                                              spellRefs.current.set(
                                                spell.id,
                                                el
                                              );
                                            else
                                              spellRefs.current.delete(
                                                spell.id
                                              );
                                          }}
                                          onClick={(e) => {
                                            if (viewMode !== "builder") return;
                                            e.stopPropagation();
                                            setSelected({
                                              type: "spell",
                                              id: spell.id,
                                            });
                                          }}
                                          style={{
                                            borderBottom:
                                              viewMode === "clean"
                                                ? isLast
                                                  ? "none"
                                                  : "1px dashed rgba(140, 45, 41, 0.18)"
                                                : undefined,
                                            border:
                                              viewMode === "builder"
                                                ? isSpellSelected
                                                  ? "2px solid #2563eb"
                                                  : "1px solid rgba(140, 45, 41, 0.22)"
                                                : undefined,
                                            backgroundColor:
                                              viewMode === "builder"
                                                ? isSpellSelected
                                                  ? "rgba(37, 99, 235, 0.06)"
                                                  : "#fbf9f5"
                                                : "transparent",
                                            opacity: isSpellDragging ? 0.25 : 1,
                                          }}
                                          className={`relative flex flex-col gap-1 transition-all duration-150 ${
                                            viewMode === "builder"
                                              ? "rounded-xl p-2.5 shadow-2xs"
                                              : isLast
                                                ? "pb-0"
                                                : "pb-3"
                                          }`}
                                        >
                                          {/* Elementor Widget Floating Bar */}
                                          {viewMode === "builder" && (
                                            <div className="mb-1 flex items-center justify-between gap-1 border-b border-[#8c2d29]/10 pb-1">
                                              <div
                                                onPointerDown={(e) =>
                                                  startPointerDrag(
                                                    e,
                                                    "spell",
                                                    spell.id,
                                                    spell.title,
                                                    spellRefs.current.get(
                                                      spell.id
                                                    ) ?? null,
                                                    spell.priceTiers[0]
                                                      ? formatPublicPriceLine(
                                                          spell.priceTiers[0]
                                                            .label,
                                                          spell.priceTiers[0]
                                                            .priceArs,
                                                          spell.priceTiers[0]
                                                            .priceUsd
                                                        )
                                                      : undefined,
                                                    spell.categoryId
                                                  )
                                                }
                                                style={{ color: "#8c2d29" }}
                                                className="flex flex-1 cursor-grab items-center gap-1 text-[10.5px] font-bold active:cursor-grabbing"
                                                title="Arrastrar hechizo para moverlo de lugar o a otra categoría"
                                              >
                                                <GripVertical className="h-3.5 w-3.5 shrink-0" />
                                                <span>
                                                  #{spIdx + 1} · Arrastrar
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-0.5">
                                                <button
                                                  type="button"
                                                  disabled={spIdx === 0}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    stepSpellInCategory(
                                                      spell.id,
                                                      -1
                                                    );
                                                  }}
                                                  style={{ color: "#5a2220" }}
                                                  className="rounded p-1 hover:bg-black/5 disabled:opacity-25"
                                                  title="Subir hechizo"
                                                >
                                                  <ArrowUp className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={
                                                    spIdx ===
                                                    publishedSpells.length - 1
                                                  }
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    stepSpellInCategory(
                                                      spell.id,
                                                      1
                                                    );
                                                  }}
                                                  style={{ color: "#5a2220" }}
                                                  className="rounded p-1 hover:bg-black/5 disabled:opacity-25"
                                                  title="Bajar hechizo"
                                                >
                                                  <ArrowDown className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelected({
                                                      type: "spell",
                                                      id: spell.id,
                                                    });
                                                    setMobileInspectorOpen(
                                                      true
                                                    );
                                                  }}
                                                  style={{ color: "#2563eb" }}
                                                  className="rounded p-1 hover:bg-blue-500/10"
                                                  title="Editar texto y precio"
                                                >
                                                  <Edit3 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateSpellDraft(spell.id, {
                                                      isPublished: false,
                                                    });
                                                  }}
                                                  style={{ color: "#8c2d29" }}
                                                  className="rounded p-1 hover:bg-red-500/10"
                                                  title="Quitar de la web (pasar a oculto)"
                                                >
                                                  <EyeOff className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Spell Content (Exact Carrd Typography) */}
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
                                              {spell.priceTiers.map(
                                                (price, pIdx) => (
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
                                                    {spell.isOffer &&
                                                      pIdx === 0 && (
                                                        <span
                                                          style={{
                                                            backgroundColor:
                                                              "#8c2d29",
                                                            color: "#fbf9f5",
                                                          }}
                                                          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold not-italic tracking-wider"
                                                        >
                                                          {spell.offerLabel ||
                                                            "¡OFERTA!"}
                                                        </span>
                                                      )}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </article>
                                      );
                                    })}

                                    {/* Quick "+ Agregar hechizo oculto de esta categoría" pill in builder mode */}
                                    {viewMode === "builder" &&
                                      hiddenSpells.length > 0 && (
                                        <div className="mt-1 flex flex-wrap items-center gap-1 pt-1">
                                          <span
                                            style={{ color: "#8c2d29" }}
                                            className="text-[10.5px] font-semibold opacity-75"
                                          >
                                            Ocultos en esta categoría:
                                          </span>
                                          {hiddenSpells.map((hs) => (
                                            <button
                                              key={hs.id}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateSpellDraft(hs.id, {
                                                  isPublished: true,
                                                });
                                              }}
                                              style={{
                                                backgroundColor: "#e6cbc8",
                                                color: "#8c2d29",
                                              }}
                                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold hover:opacity-90"
                                            >
                                              <Plus className="h-2.5 w-2.5" />
                                              <span>{hs.title}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
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

          {/* =========================================================
              RIGHT SIDEBAR (5 cols on Desktop): ELEMENTOR INSPECTOR + WIDGET DRAWER
             ========================================================= */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-5">
            {/* 1. Elementor Property Inspector */}
            <section className="rounded-[20px] border border-border-subtle bg-surface p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3
                    className="h-4 w-4 text-accent-text"
                    aria-hidden="true"
                  />
                  <h2 className="section-heading text-sm font-semibold text-ink">
                    Inspector de Elemento
                  </h2>
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-xs text-ink-dim hover:text-ink"
                  >
                    Cerrar
                  </button>
                )}
              </div>

              {renderInspectorContent()}
            </section>

            {/* 2. Elementor Widget Drawer: Private Spells ready to drag or click into the page */}
            <section className="rounded-[20px] border border-border-subtle bg-surface p-4 shadow-xs">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-info" aria-hidden="true" />
                  <h2 className="section-heading text-sm font-semibold text-ink">
                    Bandeja de Hechizos Ocultos ({privateSpells.length})
                  </h2>
                </div>
              </div>
              <p className="mb-3 text-xs text-ink-muted">
                Arrastralos desde{" "}
                <GripVertical className="inline h-3.5 w-3.5 text-accent-text" />{" "}
                hacia cualquier categoría de la vista móvil o tocá{" "}
                <strong>+ Publicar</strong>.
              </p>

              {privateSpells.length === 0 ? (
                <div className="rounded-xl border border-border-subtle bg-canvas p-4 text-center text-xs text-ink-dim">
                  ¡Todos tus hechizos están publicados en la página!
                </div>
              ) : (
                <div className="scroll-contain max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {privateSpells.map((sp) => {
                    const catName =
                      draftCategories.find((c) => c.id === sp.categoryId)
                        ?.name ?? "Sin categoría";

                    return (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-canvas p-2.5 transition hover:border-border-strong"
                      >
                        <div
                          onPointerDown={(e) =>
                            startPointerDrag(
                              e,
                              "spell",
                              sp.id,
                              sp.title,
                              e.currentTarget.parentElement,
                              catName,
                              sp.categoryId
                            )
                          }
                          className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
                          title="Arrastrar hacia la vista móvil"
                        >
                          <GripVertical className="h-4 w-4 shrink-0 text-ink-dim" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">
                              {sp.title}
                            </p>
                            <p className="truncate text-[11px] text-ink-muted">
                              {catName}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <select
                            aria-label={`Categoría para publicar ${sp.title}`}
                            value={
                              sp.categoryId ?? draftCategories[0]?.id ?? ""
                            }
                            onChange={(e) =>
                              updateSpellDraft(sp.id, {
                                categoryId: e.target.value || null,
                                isPublished: false,
                              })
                            }
                            className="h-7 max-w-[115px] truncate rounded-lg border border-border-subtle bg-surface px-1.5 text-[11px] text-ink outline-none"
                          >
                            {draftCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const targetCat =
                                sp.categoryId ?? draftCategories[0]?.id ?? "";
                              if (targetCat) {
                                const countInTarget = draftSpells.filter(
                                  (s) =>
                                    s.categoryId === targetCat && s.isPublished
                                ).length;
                                moveSpellToPosition(
                                  sp.id,
                                  targetCat,
                                  countInTarget
                                );
                              } else {
                                updateSpellDraft(sp.id, { isPublished: true });
                              }
                            }}
                            className="apple-press inline-flex h-7 items-center gap-1 rounded-lg bg-info-soft px-2.5 text-[11px] font-semibold text-info hover:bg-info hover:text-white"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            <span>Publicar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* =========================================================
          FLOATING 1:1 DRAG GHOST CARD (FOLLOWS FINGER/MOUSE)
         ========================================================= */}
      {dragState && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: `${dragState.width}px`,
            transform: `translate3d(${
              dragState.currentX - dragState.grabOffsetX
            }px, ${
              dragState.currentY - dragState.grabOffsetY
            }px, 0) scale(1.03)`,
            zIndex: 9999,
            pointerEvents: "none",
            backgroundColor:
              dragState.kind === "category" ? "#8c2d29" : "#f7f3eb",
            color: dragState.kind === "category" ? "#fbf9f5" : "#8c2d29",
            border:
              dragState.kind === "category"
                ? "2px solid #fbf9f5"
                : "2px solid #2563eb",
          }}
          className="flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 shadow-2xl"
        >
          <div className="flex min-w-0 items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 opacity-80" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{dragState.title}</p>
              {dragState.subtitle && (
                <p className="truncate text-[10.5px] opacity-80">
                  {dragState.subtitle}
                </p>
              )}
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase">
            {dragState.kind === "category" ? "Sección" : "Hechizo"}
          </span>
        </div>
      )}

      {/* Mobile Inspector Bottom Sheet */}
      <IosBottomSheet
        open={mobileInspectorOpen && !!selected}
        onClose={() => setMobileInspectorOpen(false)}
        ariaLabelledBy="mobile-inspector-title"
      >
        <div className="pb-sheet-safe px-4 pt-2 pb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2
              id="mobile-inspector-title"
              className="section-heading text-base font-semibold text-ink"
            >
              Editar elemento
            </h2>
            <button
              type="button"
              onClick={() => setMobileInspectorOpen(false)}
              className="apple-press flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {renderInspectorContent()}
        </div>
      </IosBottomSheet>

      {/* Mobile Hidden Spells Drawer Bottom Sheet */}
      <IosBottomSheet
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        ariaLabelledBy="mobile-drawer-title"
      >
        <div className="pb-sheet-safe flex max-h-[78dvh] flex-col px-4 pt-2 pb-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2
                id="mobile-drawer-title"
                className="section-heading text-base font-semibold text-ink"
              >
                Hechizos Ocultos ({privateSpells.length})
              </h2>
              <p className="text-xs text-ink-muted">
                Elegí en qué categoría publicarlos con un toque
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="apple-press flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="scroll-contain flex-1 space-y-2 overflow-y-auto">
            {privateSpells.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-canvas p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">
                    {sp.title}
                  </p>
                </div>
                <select
                  value={sp.categoryId ?? draftCategories[0]?.id ?? ""}
                  onChange={(e) =>
                    updateSpellDraft(sp.id, {
                      categoryId: e.target.value || null,
                      isPublished: false,
                    })
                  }
                  className="h-8 max-w-[130px] truncate rounded-lg border border-border-subtle bg-surface px-2 text-xs text-ink"
                >
                  {draftCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const targetCat =
                      sp.categoryId ?? draftCategories[0]?.id ?? "";
                    if (targetCat) {
                      const countInTarget = draftSpells.filter(
                        (s) => s.categoryId === targetCat && s.isPublished
                      ).length;
                      moveSpellToPosition(sp.id, targetCat, countInTarget);
                    }
                  }}
                  className="apple-press inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-on-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Sumar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </IosBottomSheet>
    </AppShell>
  );
}
