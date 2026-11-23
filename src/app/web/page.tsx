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
  Plus,
  RotateCcw,
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
  currentX: number;
  currentY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  width: number;
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

export default function WebBuilderPage() {
  const { data, isLoading } = useGrimorio();
  const invalidate = useInvalidateGrimorio();
  const createCatMut = useCreateCategory();
  const deleteCatMut = useDeleteCategory();

  const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);
  const [draftSpells, setDraftSpells] = useState<DraftSpell[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // 'edit' = Elementor handles active; 'preview' = clean client view
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  // Desktop right-panel tab: 'structure' (quick jump + reorder) | 'hidden' (ocultos)
  const [dockTab, setDockTab] = useState<"structure" | "hidden">("structure");

  // Bottom Sheets (used on mobile for everything, and on desktop for editing/creating)
  const [selected, setSelected] = useState<SelectedElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIntro, setNewCatIntro] = useState("");

  // 1:1 Pointer Drag State (Elementor reorder)
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const phoneScreenRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  const spellRefs = useRef<Map<string, HTMLElement>>(new Map());

  // 1:1 Mouse Grab-to-Scroll with momentum inside the Desktop iPhone Mockup
  const [isScreenPanning, setIsScreenPanning] = useState(false);
  const suppressClickRef = useRef(false);
  const momentumRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (momentumRafRef.current !== null) {
        cancelAnimationFrame(momentumRafRef.current);
      }
    };
  }, []);

  function handleMockupScreenPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Let native touch physics handle real touch screens; emulate finger-swipe for mouse on PC
    if (e.pointerType !== "mouse" || e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        '[data-drag-handle="true"], input, textarea, select, [data-no-pan="true"]'
      )
    ) {
      return;
    }

    const screenEl = phoneScreenRef.current;
    const scrollContainer: "mockup" | "window" =
      screenEl && screenEl.scrollHeight > screenEl.clientHeight + 4
        ? "mockup"
        : "window";

    // Interrupt any ongoing momentum glide immediately (Apple interruptibility)
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }

    const startY = e.clientY;
    const startScrollTop =
      scrollContainer === "mockup" && screenEl
        ? screenEl.scrollTop
        : window.scrollY;
    let lastY = e.clientY;
    let lastTime = performance.now();
    let velocity = 0; // px per ms
    let didPan = false;

    function onMove(ev: PointerEvent) {
      const dy = ev.clientY - startY;
      if (!didPan && Math.abs(dy) > 5) {
        didPan = true;
        setIsScreenPanning(true);
      }
      if (!didPan) return;

      if (scrollContainer === "mockup" && screenEl) {
        screenEl.scrollTop = startScrollTop - dy;
      } else {
        window.scrollTo({ top: Math.max(0, startScrollTop - dy) });
      }

      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      const instantV = (lastY - ev.clientY) / dt; // positive = scroll down
      velocity = velocity * 0.4 + instantV * 0.6;
      lastY = ev.clientY;
      lastTime = now;
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      if (didPan) {
        setIsScreenPanning(false);
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 60);

        // Smooth Apple-style momentum glide
        let v = velocity * 16; // px per 16ms frame
        const step = () => {
          if (Math.abs(v) < 0.35) {
            momentumRafRef.current = null;
            return;
          }
          if (scrollContainer === "mockup" && screenEl) {
            screenEl.scrollTop += v;
          } else {
            window.scrollBy({ top: v });
          }
          v *= 0.93;
          momentumRafRef.current = requestAnimationFrame(step);
        };
        if (Math.abs(v) > 0.8) {
          momentumRafRef.current = requestAnimationFrame(step);
        }
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  useEffect(() => {
    if (!data || isDirty) return;
    setDraftCategories(toDraftCategories(data.categories));
    setDraftSpells(toDraftSpells(data.spells));
  }, [data, isDirty]);

  function handleDiscard() {
    if (!data) return;
    setDraftCategories(toDraftCategories(data.categories));
    setDraftSpells(toDraftSpells(data.spells));
    setIsDirty(false);
    setSelected(null);
    toast.info("Cambios descartados.");
  }

  function scrollToCategoryInMockup(catId: string) {
    const el = categoryRefs.current.get(catId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const canvasCategories = useMemo(() => {
    return draftCategories.map((cat) => {
      const allInCat = draftSpells
        .filter((s) => s.categoryId === cat.id)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
        );
      return {
        category: cat,
        publishedSpells: allInCat.filter((s) => s.isPublished),
        hiddenSpells: allInCat.filter((s) => !s.isPublished),
      };
    });
  }, [draftCategories, draftSpells]);

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
  // REORDERING & MUTATIONS
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
      if (Object.keys(patch).length === 1 && "categoryId" in patch) return;
    }

    setDraftSpells((prev) =>
      prev.map((s) => (s.id === spellId ? { ...s, ...patch } : s))
    );
    setIsDirty(true);
  }

  // =========================================================
  // 1:1 POINTER DRAG ENGINE (SMART AUTO-SCROLL FOR MOCKUP & MOBILE)
  // =========================================================
  function startPointerDrag(
    e: React.PointerEvent,
    kind: "category" | "spell",
    id: string,
    title: string,
    containerEl: HTMLElement | null,
    subtitle?: string
  ) {
    e.stopPropagation();
    e.preventDefault();

    const rect = containerEl?.getBoundingClientRect() ?? {
      left: e.clientX - 140,
      top: e.clientY - 24,
      width: 300,
    };

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }

    setDragState({
      kind,
      id,
      title,
      subtitle,
      currentX: e.clientX,
      currentY: e.clientY,
      grabOffsetX: Math.min(
        rect.width - 24,
        Math.max(16, e.clientX - rect.left)
      ),
      grabOffsetY: Math.min(48, Math.max(16, e.clientY - rect.top)),
      width: Math.min(340, Math.max(240, rect.width)),
    });
  }

  useEffect(() => {
    if (!dragState) return;

    function handlePointerMove(e: PointerEvent) {
      setDragState((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
      );

      // Auto-scroll: if inside Desktop iPhone Mockup scroll container, scroll it;
      // otherwise (Mobile natural flow), scroll window!
      const screenEl = phoneScreenRef.current;
      const isMockupScrollable =
        screenEl && screenEl.scrollHeight > screenEl.clientHeight + 8;

      if (isMockupScrollable && screenEl) {
        const sr = screenEl.getBoundingClientRect();
        if (e.clientY < sr.top + 60) {
          screenEl.scrollBy({ top: -12 });
        } else if (e.clientY > sr.bottom - 60) {
          screenEl.scrollBy({ top: 12 });
        }
      } else {
        const vh = window.innerHeight;
        if (e.clientY < 80) {
          window.scrollBy({ top: -10 });
        } else if (e.clientY > vh - 90) {
          window.scrollBy({ top: 10 });
        }
      }

      if (dragState?.kind === "category") {
        const currentIdx = draftCategories.findIndex(
          (c) => c.id === dragState.id
        );
        if (currentIdx < 0) return;

        for (let i = 0; i < draftCategories.length; i++) {
          if (i === currentIdx) continue;
          const el = categoryRefs.current.get(draftCategories[i].id);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const midY = r.top + r.height / 2;

          if (
            (currentIdx < i && e.clientY > midY && e.clientY < r.bottom + 24) ||
            (currentIdx > i && e.clientY < midY && e.clientY > r.top - 24)
          ) {
            moveCategoryByIndex(currentIdx, i);
            break;
          }
        }
      } else if (dragState?.kind === "spell") {
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
          if (e.clientY < sr.top + sr.height / 2) {
            targetIdx = i;
            break;
          }
        }

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

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState, draftCategories, draftSpells]);

  // =========================================================
  // CATEGORY CREATE / DELETE & PUBLISH
  // =========================================================
  async function handleCreateCategory() {
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
    setNewCatOpen(false);
  }

  async function handleDeleteCategory(cat: DraftCategory) {
    const count = draftSpells.filter((s) => s.categoryId === cat.id).length;
    const msg =
      count > 0
        ? `¿Eliminar "${cat.name}"? Sus ${count} hechizos pasarán a la primera categoría.`
        : `¿Eliminar "${cat.name}"?`;
    if (!confirm(msg)) return;
    await deleteCatMut.mutateAsync(cat.id);
    const remaining = draftCategories.filter((c) => c.id !== cat.id);
    const fallbackId = remaining[0]?.id ?? null;

    setDraftCategories(
      remaining.map((c, idx) => ({ ...c, sortOrder: idx + 1 }))
    );
    setDraftSpells((prev) =>
      prev.map((s) =>
        s.categoryId === cat.id ? { ...s, categoryId: fallbackId } : s
      )
    );
    setSelected(null);
  }

  async function handlePublish() {
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
        throw new Error(json.error || "No se pudo publicar en la web");
      }

      setIsDirty(false);
      await invalidate();
      toast.success(
        `¡Web actualizada! ${json.publishedCount} hechizos en vivo en tarotdeluna.netlify.app.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {/* On Desktop (md+): viewport-fitted studio with ZERO infinite page scroll!
          On Mobile (<md): clean natural single-scroll mobile view */}
      <div className="mx-auto w-full max-w-[430px] pb-20 md:flex md:h-[calc(100dvh-56px)] md:max-w-[960px] md:flex-col md:overflow-hidden md:pb-0">
        {/* 1. Compact Header */}
        <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="display-heading truncate text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
              Web Pública
            </h1>
            <p className="truncate text-xs text-ink-muted">
              tarotdeluna.netlify.app ·{" "}
              <span className="tabular-nums font-medium text-ink">
                {totalPublishedCount} en vivo
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isDirty && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDiscard}
                className="apple-press hidden h-10 items-center gap-1 rounded-[12px] border border-border-subtle bg-surface px-3 text-xs font-semibold text-ink-muted hover:border-border-strong hover:text-ink md:inline-flex"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Descartar</span>
              </button>
            )}

            <a
              href="https://tarotdeluna.netlify.app"
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir tarotdeluna.netlify.app"
              title="Abrir tarotdeluna.netlify.app"
              className="apple-press hit-44 flex h-10 w-10 items-center justify-center rounded-[12px] border border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>

            <button
              type="button"
              disabled={saving}
              onClick={handlePublish}
              className={`apple-press hit-44 inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-xs font-semibold ${
                isDirty
                  ? "bg-accent text-on-accent hover:bg-accent-hover"
                  : "border border-info/35 bg-info-soft text-info"
              }`}
            >
              {saving ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {saving
                  ? "Subiendo..."
                  : isDirty
                    ? "Publicar"
                    : "Al día"}
              </span>
            </button>
          </div>
        </header>

        {/* 2. Mobile-only Compact Control Bar (Desktop has the side dock) */}
        <div className="mb-3 flex items-center justify-between gap-1.5 md:hidden">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNewCatOpen(true)}
              className="apple-press inline-flex h-9 items-center gap-1 rounded-[10px] border border-border-subtle bg-surface px-2.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent-text"
            >
              <FolderPlus
                className="h-3.5 w-3.5 text-accent-text"
                aria-hidden="true"
              />
              <span>Categoría</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="apple-press inline-flex h-9 items-center gap-1 rounded-[10px] border border-border-subtle bg-surface px-2.5 text-xs font-semibold text-ink hover:border-info hover:text-info"
            >
              <Plus className="h-3.5 w-3.5 text-info" aria-hidden="true" />
              <span>Ocultos ({privateSpells.length})</span>
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Modo de vista"
            className="grid grid-cols-2 rounded-[10px] border border-border-subtle bg-surface p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "edit"}
              onClick={() => setMode("edit")}
              className={`rounded-[8px] px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                mode === "edit"
                  ? "bg-accent text-on-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "preview"}
              onClick={() => setMode("preview")}
              className={`inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                mode === "preview"
                  ? "bg-accent text-on-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Eye className="h-3 w-3" aria-hidden="true" />
              <span>Ver</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE:
            - Mobile: Natural flow card
            - Desktop (md+): Sleek iPhone Device Mockup (left/center) + Fixed-height Control Dock (right) */}
        {isLoading && !data ? (
          <HomeGrimorioSkeleton includeStatusAndFilters={false} />
        ) : (
          <div className="md:flex md:min-h-0 md:flex-1 md:items-stretch md:justify-center md:gap-7">
            {/* =======================================================
                IPHONE DEVICE MOCKUP FRAME (Desktop) / NATURAL CANVAS (Mobile)
               ======================================================= */}
            <div className="w-full md:flex md:w-[392px] md:shrink-0 md:flex-col md:overflow-hidden md:rounded-[44px] md:border-[8px] md:border-[#1c1f26] md:bg-[#1c1313] md:shadow-2xl dark:md:border-[#2a2f3b]">
              {/* Desktop iPhone Top Status Bar + Dynamic Island */}
              <div className="hidden shrink-0 items-center justify-between bg-[#251716] px-6 pt-2.5 pb-2 text-[11px] font-semibold text-[#fbf9f5]/90 md:flex">
                <span className="tabular-nums">9:41</span>
                <div className="h-[22px] w-[86px] rounded-full bg-black/90" />
                <span className="text-[10px] tracking-tight opacity-80">
                  5G · 100%
                </span>
              </div>

              {/* Scrollable Screen Inside Phone Mockup on Desktop / Natural Flow on Mobile */}
              <div
                ref={phoneScreenRef}
                onPointerDown={handleMockupScreenPointerDown}
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, #442725 0%, #1c1313 100%)",
                  touchAction: "pan-y",
                  WebkitOverflowScrolling: "touch",
                }}
                className={`scroll-contain w-full overflow-hidden rounded-[24px] p-2.5 shadow-md select-none sm:p-3.5 md:min-h-0 md:flex-1 md:overflow-y-auto md:rounded-none md:p-3 md:shadow-none ${
                  isScreenPanning ? "md:cursor-grabbing" : "md:cursor-grab"
                }`}
              >
                {/* Compact Carrd Hero (@eltarotde_luna) */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #3c2220 0%, #231716 100%)",
                  }}
                  className="relative mb-2 flex h-[76px] w-full items-end justify-between overflow-hidden rounded-t-[18px] rounded-b-[12px] px-4 py-3 shadow-sm"
                >
                  <span className="relative z-10 text-[16.5px] font-semibold tracking-[-0.01em] text-[#fbf9f5]">
                    @eltarotde_luna
                  </span>
                  <div
                    style={{ backgroundColor: "#e6cbc8", color: "#8c2d29" }}
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full"
                  >
                    <svg
                      width="14"
                      height="14"
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
                  className="w-full overflow-hidden rounded-[18px]"
                >
                  <div className="p-3.5">
                    {/* # Hechizos Title */}
                    <div
                      style={{
                        borderBottom: "1.5px solid rgba(140, 45, 41, 0.35)",
                      }}
                      className="mb-3.5 flex items-center justify-between pb-2"
                    >
                      <h2
                        style={{ color: "#8c2d29" }}
                        className="text-[15.5px] font-bold underline underline-offset-4"
                      >
                        # Hechizos
                      </h2>
                      <span
                        style={{ color: "#8c2d29" }}
                        className="text-[11px] font-semibold opacity-70 tabular-nums"
                      >
                        {totalPublishedCount}{" "}
                        {totalPublishedCount === 1 ? "ritual" : "rituales"}
                      </span>
                    </div>

                    {/* Categories List */}
                    <div className="space-y-4">
                      {canvasCategories.map(
                        ({ category, publishedSpells, hiddenSpells }) => {
                          if (
                            mode === "preview" &&
                            publishedSpells.length === 0
                          ) {
                            return null;
                          }

                          const isCatDragging =
                            dragState?.kind === "category" &&
                            dragState.id === category.id;

                          return (
                            <section
                              key={category.id}
                              ref={(el) => {
                                if (el)
                                  categoryRefs.current.set(category.id, el);
                                else categoryRefs.current.delete(category.id);
                              }}
                              style={{
                                opacity: isCatDragging ? 0.3 : 1,
                                border:
                                  mode === "edit"
                                    ? "1px dashed rgba(140, 45, 41, 0.28)"
                                    : "none",
                              }}
                              className={`min-w-0 scroll-mt-3 transition-opacity duration-150 ${
                                mode === "edit"
                                  ? "rounded-[14px] bg-white/35 p-2.5"
                                  : ""
                              }`}
                            >
                              {/* Category Header Row */}
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-start gap-1.5">
                                  {mode === "edit" && (
                                    <button
                                      type="button"
                                      data-drag-handle="true"
                                      onPointerDown={(e) =>
                                        startPointerDrag(
                                          e,
                                          "category",
                                          category.id,
                                          category.name,
                                          categoryRefs.current.get(
                                            category.id
                                          ) ?? null,
                                          `${publishedSpells.length} visibles`
                                        )
                                      }
                                      style={{
                                        touchAction: "none",
                                        color: "#8c2d29",
                                      }}
                                      aria-label={`Arrastrar categoría ${category.name}`}
                                      title="Arrastrar para reordenar categoría"
                                      className="hit-44 mt-0.5 flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md bg-[#8c2d29]/10 active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  <div
                                    role={mode === "edit" ? "button" : undefined}
                                    tabIndex={mode === "edit" ? 0 : undefined}
                                    onClick={() => {
                                      if (
                                        mode === "preview" ||
                                        suppressClickRef.current
                                      )
                                        return;
                                      setSelected({
                                        type: "category",
                                        id: category.id,
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (
                                        mode === "edit" &&
                                        (e.key === "Enter" || e.key === " ")
                                      ) {
                                        e.preventDefault();
                                        setSelected({
                                          type: "category",
                                          id: category.id,
                                        });
                                      }
                                    }}
                                    style={{ touchAction: "pan-y" }}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <h3
                                      style={{ color: "#8c2d29" }}
                                      className="break-words text-[14.5px] font-bold leading-snug underline underline-offset-4"
                                    >
                                      {category.name}
                                    </h3>
                                  </div>
                                </div>

                                {mode === "edit" && (
                                  <button
                                    type="button"
                                    data-no-pan="true"
                                    onClick={() => {
                                      if (suppressClickRef.current) return;
                                      setSelected({
                                        type: "category",
                                        id: category.id,
                                      });
                                    }}
                                    aria-label={`Editar ${category.name}`}
                                    style={{ color: "#8c2d29" }}
                                    className="hit-44 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-70 hover:bg-[#8c2d29]/10 hover:opacity-100"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              {category.publicIntro && (
                                <p
                                  style={{ color: "#5a2220" }}
                                  className="mb-2.5 break-words text-[12.5px] leading-[1.45]"
                                >
                                  {category.publicIntro}
                                </p>
                              )}

                              {/* Spells inside Category */}
                              {publishedSpells.length === 0 ? (
                                <div
                                  style={{
                                    color: "#8c2d29",
                                    borderColor: "rgba(140, 45, 41, 0.22)",
                                  }}
                                  className="rounded-xl border border-dashed bg-white/45 px-2.5 py-2 text-center text-[11px]"
                                >
                                  <p className="font-medium opacity-80">
                                    Sin hechizos visibles · Arrastrá uno aquí
                                  </p>
                                  {hiddenSpells.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                                      {hiddenSpells.slice(0, 3).map((hs) => (
                                        <button
                                          key={hs.id}
                                          type="button"
                                          onClick={() =>
                                            updateSpellDraft(hs.id, {
                                              isPublished: true,
                                            })
                                          }
                                          style={{
                                            backgroundColor: "#e6cbc8",
                                            color: "#8c2d29",
                                          }}
                                          className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                                        >
                                          <Plus className="h-2.5 w-2.5 shrink-0" />
                                          <span className="truncate">
                                            {hs.title}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="divide-y divide-[#8c2d29]/15">
                                  {publishedSpells.map((spell) => {
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
                                            spellRefs.current.set(spell.id, el);
                                          else
                                            spellRefs.current.delete(spell.id);
                                        }}
                                        style={{
                                          opacity: isSpellDragging ? 0.25 : 1,
                                        }}
                                        className="flex min-w-0 items-start gap-1.5 py-2.5 first:pt-1 last:pb-0"
                                      >
                                        {mode === "edit" && (
                                          <button
                                            type="button"
                                            data-drag-handle="true"
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
                                                      spell.priceTiers[0].label,
                                                      spell.priceTiers[0]
                                                        .priceArs,
                                                      spell.priceTiers[0]
                                                        .priceUsd
                                                    )
                                                  : undefined
                                              )
                                            }
                                            style={{
                                              touchAction: "none",
                                              color: "#8c2d29",
                                            }}
                                            aria-label={`Arrastrar ${spell.title}`}
                                            title="Arrastrar para mover posición o categoría"
                                            className="hit-44 mt-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md hover:bg-[#8c2d29]/10 active:cursor-grabbing"
                                          >
                                            <GripVertical className="h-4 w-4 opacity-70" />
                                          </button>
                                        )}

                                        <div
                                          role={
                                            mode === "edit"
                                              ? "button"
                                              : undefined
                                          }
                                          tabIndex={
                                            mode === "edit" ? 0 : undefined
                                          }
                                          onClick={() => {
                                            if (
                                              mode === "preview" ||
                                              suppressClickRef.current
                                            )
                                              return;
                                            setSelected({
                                              type: "spell",
                                              id: spell.id,
                                            });
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              mode === "edit" &&
                                              (e.key === "Enter" ||
                                                e.key === " ")
                                            ) {
                                              e.preventDefault();
                                              setSelected({
                                                type: "spell",
                                                id: spell.id,
                                              });
                                            }
                                          }}
                                          style={{ touchAction: "pan-y" }}
                                          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                                        >
                                          <h4
                                            style={{ color: "#8c2d29" }}
                                            className="break-words text-[14px] font-bold leading-snug"
                                          >
                                            {spell.title}
                                          </h4>

                                          {spell.subtitleTag && (
                                            <span
                                              style={{ color: "#385766" }}
                                              className="break-words text-[11.5px] font-semibold italic leading-snug"
                                            >
                                              {spell.subtitleTag}
                                            </span>
                                          )}

                                          {desc && (
                                            <p
                                              style={{ color: "#5a2220" }}
                                              className="break-words text-[12.5px] leading-[1.42]"
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
                                                    className="inline-flex flex-wrap items-center gap-1.5 text-[12.5px] font-bold italic"
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
                                                          className="rounded-full px-2 py-0.5 text-[9.5px] font-bold not-italic tracking-wider"
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
                                        </div>

                                        {mode === "edit" && (
                                          <button
                                            type="button"
                                            data-no-pan="true"
                                            onClick={() => {
                                              if (suppressClickRef.current)
                                                return;
                                              updateSpellDraft(spell.id, {
                                                isPublished: false,
                                              });
                                            }}
                                            aria-label={`Ocultar ${spell.title} de la web`}
                                            title="Ocultar de la web"
                                            style={{ color: "#8c2d29" }}
                                            className="hit-44 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-55 hover:bg-[#8c2d29]/10 hover:opacity-100"
                                          >
                                            <EyeOff className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </article>
                                    );
                                  })}
                                </div>
                              )}
                            </section>
                          );
                        }
                      )}

                      {mode === "preview" && totalPublishedCount === 0 && (
                        <div className="py-6 text-center">
                          <Sparkles
                            style={{ color: "#8c2d29" }}
                            className="mx-auto mb-2 h-5 w-5 opacity-70"
                          />
                          <p
                            style={{ color: "#5a2220" }}
                            className="text-xs font-medium"
                          >
                            No hay hechizos públicos todavía.
                          </p>
                        </div>
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
                    className="flex items-center justify-between px-4 py-2.5 text-[12.5px] font-semibold"
                  >
                    <span>@eltarotde_luna</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        style={{ backgroundColor: "#f7f3eb" }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                      >
                        𝕏
                      </span>
                      <span
                        style={{ backgroundColor: "#f7f3eb" }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                      >
                        IG
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop iPhone Bottom Home Indicator */}
              <div className="hidden shrink-0 items-center justify-center bg-[#1c1313] py-2 md:flex">
                <div className="h-1 w-28 rounded-full bg-white/30" />
              </div>
            </div>

            {/* =======================================================
                DESKTOP SIDE CONTROL DOCK (Compact, viewport-fitted, zero page scroll)
               ======================================================= */}
            <aside className="hidden md:flex md:min-h-0 md:w-[340px] md:flex-col md:gap-3 lg:w-[380px]">
              {/* Mode Switch + New Category Card */}
              <div className="shrink-0 space-y-2.5 rounded-[18px] border border-border-subtle bg-surface p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    role="tablist"
                    aria-label="Modo de vista en mockup"
                    className="grid flex-1 grid-cols-2 rounded-[10px] border border-border-subtle bg-canvas p-0.5"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === "edit"}
                      onClick={() => setMode("edit")}
                      className={`rounded-[8px] py-1.5 text-xs font-semibold transition-colors ${
                        mode === "edit"
                          ? "bg-accent text-on-accent"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      Modo Editar
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === "preview"}
                      onClick={() => setMode("preview")}
                      className={`inline-flex items-center justify-center gap-1 rounded-[8px] py-1.5 text-xs font-semibold transition-colors ${
                        mode === "preview"
                          ? "bg-accent text-on-accent"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Vista Cliente</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewCatOpen(true)}
                    className="apple-press inline-flex h-9 shrink-0 items-center gap-1 rounded-[10px] bg-accent-soft px-3 text-xs font-semibold text-accent-text hover:bg-accent hover:text-on-accent"
                  >
                    <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>+ Categoría</span>
                  </button>
                </div>

                <p className="text-[11.5px] leading-snug text-ink-muted">
                  Arrastrá desde{" "}
                  <GripVertical className="inline h-3.5 w-3.5 text-ink" />{" "}
                  dentro del celular para reordenar categorías o mover hechizos.
                  Tocá cualquier elemento para editarlo.
                </p>
              </div>

              {/* Dock Panel: Structure Navigator vs Hidden Spells */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-border-subtle bg-surface">
                <div className="grid shrink-0 grid-cols-2 border-b border-border-subtle bg-canvas/60 p-1">
                  <button
                    type="button"
                    onClick={() => setDockTab("structure")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-semibold transition-colors ${
                      dockTab === "structure"
                        ? "bg-surface text-ink shadow-2xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-accent-text" />
                    <span>Categorías ({draftCategories.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockTab("hidden")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-semibold transition-colors ${
                      dockTab === "hidden"
                        ? "bg-surface text-ink shadow-2xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5 text-info" />
                    <span>Ocultos ({privateSpells.length})</span>
                  </button>
                </div>

                <div className="scroll-contain min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
                  {dockTab === "structure" ? (
                    canvasCategories.map(({ category, publishedSpells }, idx) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-canvas px-2.5 py-2 transition hover:border-border-strong"
                      >
                        <button
                          type="button"
                          onClick={() => scrollToCategoryInMockup(category.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-semibold text-ink">
                            {idx + 1}. {category.name}
                          </p>
                          <p className="text-[11px] text-ink-muted tabular-nums">
                            {publishedSpells.length}{" "}
                            {publishedSpells.length === 1
                              ? "hechizo visible"
                              : "hechizos visibles"}
                          </p>
                        </button>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveCategoryByIndex(idx, idx - 1)}
                            aria-label={`Subir ${category.name}`}
                            className="apple-press flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx >= draftCategories.length - 1}
                            onClick={() => moveCategoryByIndex(idx, idx + 1)}
                            aria-label={`Bajar ${category.name}`}
                            className="apple-press flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({ type: "category", id: category.id })
                            }
                            aria-label={`Editar ${category.name}`}
                            className="apple-press flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-accent-text"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : privateSpells.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink-muted">
                      ¡Todos tus hechizos están publicados en la web!
                    </p>
                  ) : (
                    privateSpells.map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-canvas p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink">
                            {sp.title}
                          </p>
                          <select
                            aria-label={`Categoría para ${sp.title}`}
                            value={
                              sp.categoryId ?? draftCategories[0]?.id ?? ""
                            }
                            onChange={(e) =>
                              updateSpellDraft(sp.id, {
                                categoryId: e.target.value || null,
                                isPublished: false,
                              })
                            }
                            className="mt-1 h-7 w-full rounded-lg border border-border-subtle bg-surface px-1.5 text-[11px] text-ink-muted outline-none"
                          >
                            {draftCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const targetCat =
                              sp.categoryId ?? draftCategories[0]?.id ?? "";
                            if (targetCat) {
                              const count = draftSpells.filter(
                                (s) =>
                                  s.categoryId === targetCat && s.isPublished
                              ).length;
                              moveSpellToPosition(sp.id, targetCat, count);
                              scrollToCategoryInMockup(targetCat);
                            } else {
                              updateSpellDraft(sp.id, { isPublished: true });
                            }
                            toast.success(`"${sp.title}" sumado al mockup.`);
                          }}
                          className="apple-press inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-on-accent"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Sumar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* =========================================================
          MOBILE STICKY FLOATING PUBLISH PILL (ONLY WHEN DIRTY)
         ========================================================= */}
      {isDirty && (
        <div className="fixed bottom-[74px] left-1/2 z-30 w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 md:hidden">
          <div className="apple-chrome animate-pill-enter flex items-center justify-between gap-2 rounded-2xl border border-border-strong px-3 py-2 shadow-lg">
            <button
              type="button"
              disabled={saving}
              onClick={handleDiscard}
              className="apple-press inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-muted hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handlePublish}
              className="apple-press inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {saving ? "Publicando..." : "Guardar y Publicar en web"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          FLOATING 1:1 DRAG GHOST (FOLLOWS FINGER/MOUSE)
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
            }px, 0) scale(1.02)`,
            zIndex: 9999,
            pointerEvents: "none",
            backgroundColor:
              dragState.kind === "category" ? "#8c2d29" : "#f7f3eb",
            color: dragState.kind === "category" ? "#fbf9f5" : "#8c2d29",
            border:
              dragState.kind === "category"
                ? "2px solid #fbf9f5"
                : "2px solid #8c2d29",
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
            {dragState.kind === "category" ? "Categoría" : "Hechizo"}
          </span>
        </div>
      )}

      {/* =========================================================
          BOTTOM SHEET 1: ELEMENTOR INSPECTOR (TAP ANY CATEGORY OR SPELL)
         ========================================================= */}
      <IosBottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        ariaLabelledBy="web-inspector-title"
        maxWidthClass="max-w-md"
      >
        <div className="pb-sheet-safe scroll-contain max-h-[82dvh] overflow-y-auto px-4 pt-1.5 pb-5 sm:p-5">
          {selectedCategory && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-text">
                    Editar Categoría
                  </p>
                  <h2
                    id="web-inspector-title"
                    className="section-heading truncate text-lg font-semibold text-ink"
                  >
                    {selectedCategory.name}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = draftCategories.findIndex(
                        (c) => c.id === selectedCategory.id
                      );
                      moveCategoryByIndex(idx, idx - 1);
                    }}
                    aria-label="Subir categoría"
                    className="apple-press flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = draftCategories.findIndex(
                        (c) => c.id === selectedCategory.id
                      );
                      moveCategoryByIndex(idx, idx + 1);
                    }}
                    aria-label="Bajar categoría"
                    className="apple-press flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Cerrar"
                    className="apple-press flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-muted">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  value={selectedCategory.name}
                  onChange={(e) =>
                    updateCategoryField(selectedCategory.id, {
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-muted">
                  Texto introductorio en la web (opcional)
                </label>
                <textarea
                  rows={3}
                  value={selectedCategory.publicIntro ?? ""}
                  onChange={(e) =>
                    updateCategoryField(selectedCategory.id, {
                      publicIntro: e.target.value || null,
                    })
                  }
                  placeholder="Aparece debajo del título subrayado..."
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(selectedCategory)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar categoría</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="apple-press rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-on-accent"
                >
                  Listo
                </button>
              </div>
            </div>
          )}

          {selectedSpell && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-info">
                    Editar Hechizo en Web
                  </p>
                  <h2
                    id="web-inspector-title"
                    className="section-heading truncate text-lg font-semibold text-ink"
                  >
                    {selectedSpell.title}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepSpellInCategory(selectedSpell.id, -1)}
                    aria-label="Subir posición"
                    className="apple-press flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepSpellInCategory(selectedSpell.id, 1)}
                    aria-label="Bajar posición"
                    className="apple-press flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Cerrar"
                    className="apple-press flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSpellDraft(selectedSpell.id, {
                      isPublished: !selectedSpell.isPublished,
                    })
                  }
                  className={`apple-press flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold ${
                    selectedSpell.isPublished
                      ? "border-info/45 bg-info-soft text-info"
                      : "border-border-subtle bg-canvas text-ink-muted"
                  }`}
                >
                  {selectedSpell.isPublished ? (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      <span>Público</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Oculto</span>
                    </>
                  )}
                </button>

                <select
                  aria-label="Categoría"
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
                  placeholder="Ej. Limpieza energética profunda"
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-muted">
                  Descripción para clientas
                </label>
                <textarea
                  rows={3}
                  value={
                    selectedSpell.publicDescription ??
                    selectedSpell.purpose ??
                    ""
                  }
                  onChange={(e) =>
                    updateSpellDraft(selectedSpell.id, {
                      publicDescription: e.target.value || null,
                    })
                  }
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              </div>

              {/* Price Tiers */}
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
                    <Plus className="h-3 w-3" />
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
                      onChange={(e) =>
                        updateSpellDraft(selectedSpell.id, {
                          priceTiers: selectedSpell.priceTiers.map((it, i) =>
                            i === tIdx ? { ...it, label: e.target.value } : it
                          ),
                        })
                      }
                      placeholder="Etiqueta"
                      className="col-span-4 rounded-xl border border-border-subtle bg-canvas px-2.5 py-2 text-xs text-ink outline-none focus:border-accent"
                    />
                    <div className="col-span-4 flex items-center rounded-xl border border-border-subtle bg-canvas px-2 py-2">
                      <span className="mr-0.5 text-xs text-ink-dim">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={tier.priceArs}
                        onChange={(e) =>
                          updateSpellDraft(selectedSpell.id, {
                            priceTiers: selectedSpell.priceTiers.map((it, i) =>
                              i === tIdx
                                ? {
                                    ...it,
                                    priceArs: Number(e.target.value || 0),
                                  }
                                : it
                            ),
                          })
                        }
                        className="w-full bg-transparent tabular-nums text-xs font-semibold text-ink outline-none"
                      />
                    </div>
                    <div className="col-span-3 flex items-center rounded-xl border border-border-subtle bg-canvas px-2 py-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={tier.priceUsd}
                        onChange={(e) =>
                          updateSpellDraft(selectedSpell.id, {
                            priceTiers: selectedSpell.priceTiers.map((it, i) =>
                              i === tIdx
                                ? {
                                    ...it,
                                    priceUsd: Number(e.target.value || 0),
                                  }
                                : it
                            ),
                          })
                        }
                        className="w-full bg-transparent tabular-nums text-xs font-semibold text-ink outline-none"
                      />
                      <span className="text-[10px] text-ink-dim">USD</span>
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
                          aria-label="Quitar precio"
                          className="text-ink-dim hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Offer Badge */}
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
                  <Tag className="h-3.5 w-3.5 text-accent-text" />
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
                    className="w-28 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs font-bold text-accent-text outline-none focus:border-accent"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="apple-press w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-on-accent"
              >
                Aplicar al borrador
              </button>
            </div>
          )}
        </div>
      </IosBottomSheet>

      {/* =========================================================
          BOTTOM SHEET 2: MOBILE HIDDEN SPELLS DRAWER
         ========================================================= */}
      <IosBottomSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ariaLabelledBy="hidden-spells-title"
        maxWidthClass="max-w-md"
      >
        <div className="pb-sheet-safe flex max-h-[80dvh] flex-col px-4 pt-1.5 pb-5 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2
                id="hidden-spells-title"
                className="section-heading text-lg font-semibold text-ink"
              >
                Hechizos Ocultos ({privateSpells.length})
              </h2>
              <p className="text-xs text-ink-muted">
                Sumalos a la web eligiendo su categoría
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar"
              className="apple-press flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {privateSpells.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              ¡Todos tus hechizos ya están publicados en la web!
            </p>
          ) : (
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
                    aria-label={`Categoría para ${sp.title}`}
                    value={sp.categoryId ?? draftCategories[0]?.id ?? ""}
                    onChange={(e) =>
                      updateSpellDraft(sp.id, {
                        categoryId: e.target.value || null,
                        isPublished: false,
                      })
                    }
                    className="h-8 max-w-[125px] truncate rounded-lg border border-border-subtle bg-surface px-2 text-xs text-ink"
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
                        const count = draftSpells.filter(
                          (s) => s.categoryId === targetCat && s.isPublished
                        ).length;
                        moveSpellToPosition(sp.id, targetCat, count);
                      } else {
                        updateSpellDraft(sp.id, { isPublished: true });
                      }
                      toast.success(`"${sp.title}" sumado al borrador web.`);
                    }}
                    className="apple-press inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-on-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Sumar</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </IosBottomSheet>

      {/* =========================================================
          BOTTOM SHEET 3: CREATE NEW CATEGORY
         ========================================================= */}
      <IosBottomSheet
        open={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        ariaLabelledBy="new-cat-title"
        maxWidthClass="max-w-md"
      >
        <div className="pb-sheet-safe px-4 pt-1.5 pb-5 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="new-cat-title"
              className="section-heading text-lg font-semibold text-ink"
            >
              Nueva Categoría
            </h2>
            <button
              type="button"
              onClick={() => setNewCatOpen(false)}
              aria-label="Cerrar"
              className="apple-press flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Nombre *
              </label>
              <input
                type="text"
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCatName.trim()) {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                placeholder="Ej. Hechizos de Protección..."
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Texto introductorio en la web (opcional)
              </label>
              <textarea
                rows={2}
                value={newCatIntro}
                onChange={(e) => setNewCatIntro(e.target.value)}
                placeholder="Subtítulo o aclaración debajo del nombre..."
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <button
              type="button"
              disabled={!newCatName.trim() || createCatMut.isPending}
              onClick={handleCreateCategory}
              className="apple-press flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-semibold text-on-accent disabled:opacity-45"
            >
              {createCatMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Crear categoría</span>
            </button>
          </div>
        </div>
      </IosBottomSheet>
    </AppShell>
  );
}
