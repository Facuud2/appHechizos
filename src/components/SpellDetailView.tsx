"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Globe,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Trash2,
  Upload,
  UploadCloud,
  Sun,
  Check,
  Flame,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGrimorio,
  useInvalidateGrimorio,
  usePerformVariation,
} from "@/hooks/useGrimorioData";
import { evaluateVariationAvailability } from "@/lib/domain/matching";
import { calculateVariationCost } from "@/lib/domain/costing";
import { formatArs, formatDualPrice, prepareMediaFile } from "@/lib/format";
import { removeEntityCover, uploadEntityCover } from "@/lib/upload-cover";
import { IosBottomSheet } from "./IosBottomSheet";
import { QuickIngredientModal } from "./QuickIngredientModal";
import {
  ProgressiveImage,
  SpellDetailSkeleton,
} from "./Skeletons";
import { SpellFormModal } from "./SpellFormModal";
import { UNIT_LABELS, type SpellItem, type SpellVariationItem } from "@/types/app";
import { isNonCountableUnit, isPresenceUnit, type UnitType } from "@/db/schema";

type TabId = "resumen" | "ingredientes" | "pasos";

export function SpellDetailView({
  spellId,
  initialVariationId,
  openNewVariationModal = false,
}: {
  spellId: string;
  initialVariationId?: string | null;
  openNewVariationModal?: boolean;
}) {
  const router = useRouter();
  const { data, isLoading } = useGrimorio();
  const invalidate = useInvalidateGrimorio();
  const performMut = usePerformVariation();

  const spell: SpellItem | undefined = useMemo(
    () => data?.spells.find((s) => s.id === spellId),
    [data?.spells, spellId]
  );

  const spellCategory = useMemo(
    () =>
      data?.categories.find((c) => c.id === spell?.categoryId) ?? null,
    [data?.categories, spell?.categoryId]
  );

  const inventoryMap = useMemo(() => {
    const map = new Map();
    for (const ing of data?.ingredients ?? []) map.set(ing.id, ing);
    return map;
  }, [data?.ingredients]);

  const [varIndex, setVarIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("ingredientes");
  const [editSpellOpen, setEditSpellOpen] = useState(false);
  const [newVarOpen, setNewVarOpen] = useState(openNewVariationModal);
  const [newVarName, setNewVarName] = useState("");
  const [newVarContext, setNewVarContext] = useState("");
  const [creatingVar, setCreatingVar] = useState(false);

  // Quick ingredient creation on the fly
  const [quickIngOpen, setQuickIngOpen] = useState(false);
  const [selectedAddIngId, setSelectedAddIngId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addUnit, setAddUnit] = useState<UnitType>("unit");
  const [addOptional, setAddOptional] = useState(false);
  const [addSubNote, setAddSubNote] = useState("");
  const [savingVariation, setSavingVariation] = useState(false);

  // Steps state
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepInstruction, setNewStepInstruction] = useState("");
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);

  // Cover image & quick publish state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  // Wake Lock (Ritual Mode)
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Perform ritual modal
  const [performOpen, setPerformOpen] = useState(false);
  const [performClient, setPerformClient] = useState("");
  const [performCharged, setPerformCharged] = useState("");
  const [performDeduct, setPerformDeduct] = useState(true);

  // Touch swipe for variations
  const touchStartX = useRef<number | null>(null);

  // Restore variation index from URL or sessionStorage
  useEffect(() => {
    if (!spell || spell.variations.length === 0) return;
    if (initialVariationId) {
      const idx = spell.variations.findIndex((v) => v.id === initialVariationId);
      if (idx >= 0) {
        setVarIndex(idx);
        return;
      }
    }
    const saved = sessionStorage.getItem(`spell-var-${spell.id}`);
    if (saved) {
      const idx = spell.variations.findIndex((v) => v.id === saved);
      if (idx >= 0) setVarIndex(idx);
    }
  }, [spell, initialVariationId]);

  const activeVariation: SpellVariationItem | undefined =
    spell?.variations[varIndex] ?? spell?.variations[0];

  useEffect(() => {
    if (spell && activeVariation) {
      sessionStorage.setItem(`spell-var-${spell.id}`, activeVariation.id);
    }
  }, [spell, activeVariation]);

  // Cleanup Wake Lock on unmount
  useEffect(() => {
    return () => {
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  async function toggleWakeLock() {
    try {
      if (wakeLockActive) {
        await wakeLockRef.current?.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        toast.info("Pantalla normal restaurada.");
        return;
      }
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setWakeLockActive(true);
        toast.success("Modo Ritual activo: la pantalla permanecerá encendida.");
      } else {
        toast.info("Tu navegador no soporta bloqueo de pantalla automático.");
      }
    } catch {
      toast.error("No se pudo activar el modo pantalla encendida.");
    }
  }

  if (isLoading && !spell) {
    return <SpellDetailSkeleton />;
  }

  if (!spell || !activeVariation) {
    return (
      <div className="rounded-[16px] border border-border-subtle bg-surface p-5 text-center sm:p-8">
        <p className="section-heading text-[20px] font-semibold text-ink sm:text-2xl">
          Hechizo no encontrado
        </p>
        <Link
          href="/"
          className="apple-press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Hechizos
        </Link>
      </div>
    );
  }

  const totalVariations = spell.variations.length;
  const goPrevVariation = () =>
    setVarIndex((i) => (i - 1 + totalVariations) % totalVariations);
  const goNextVariation = () =>
    setVarIndex((i) => (i + 1) % totalVariations);

  const match = evaluateVariationAvailability(
    activeVariation.ingredients.map((vi) => ({
      ingredientId: vi.ingredientId,
      ingredientName: inventoryMap.get(vi.ingredientId)?.name ?? "Ingrediente",
      quantity: vi.quantity,
      unit: vi.unit,
      isOptional: vi.isOptional,
      substitutionNote: vi.substitutionNote,
    })),
    inventoryMap
  );

  const effectiveSalePriceArs =
    activeVariation.priceOverrideArs ?? spell.priceTiers[0]?.priceArs ?? null;

  const costSummary = calculateVariationCost(
    activeVariation.ingredients.map((vi) => {
      const ing = inventoryMap.get(vi.ingredientId);
      return {
        ingredientName: ing?.name ?? "Ingrediente",
        quantity: vi.quantity,
        unit: vi.unit,
        ingredientUnitType: ing?.unitType ?? vi.unit,
        unitCostArs: ing?.unitCostArs ?? null,
        unitCostUsd: ing?.unitCostUsd ?? null,
      };
    }),
    effectiveSalePriceArs
  );

  async function handleCreateVariation() {
    if (!spell || !activeVariation || !newVarName.trim()) return;
    setCreatingVar(true);
    try {
      const res = await fetch(`/api/spells/${spell.id}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVarName.trim(),
          clientContext: newVarContext.trim() || null,
          cloneFromVariationId: activeVariation.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear variación");
      await invalidate();
      setVarIndex(spell.variations.length);
      setNewVarName("");
      setNewVarContext("");
      setNewVarOpen(false);
      toast.success("Variación creada a partir de esta versión.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setCreatingVar(false);
    }
  }

  async function handleDeleteVariation() {
    if (!activeVariation || activeVariation.isBase) return;
    if (!confirm(`¿Eliminar la variación "${activeVariation.name}"?`)) return;
    try {
      const res = await fetch(`/api/variations/${activeVariation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar");
      setVarIndex(0);
      await invalidate();
      toast.success("Variación eliminada.");
    } catch {
      toast.error("No se pudo eliminar la variación.");
    }
  }

  async function handleAddIngredientToVariation(
    overrideIngId?: string,
    overrideUnit?: UnitType
  ) {
    if (!activeVariation) return;
    const ingId = overrideIngId || selectedAddIngId;
    if (!ingId) return;
    const effectiveUnit = overrideUnit || addUnit;

    setSavingVariation(true);
    try {
      const nextList = [
        ...activeVariation.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          isOptional: i.isOptional,
          substitutionNote: i.substitutionNote,
        })),
        {
          ingredientId: ingId,
          quantity:
            isNonCountableUnit(effectiveUnit) || addQty === ""
              ? null
              : Number(addQty),
          unit: effectiveUnit,
          isOptional: addOptional,
          substitutionNote: addSubNote.trim() || null,
        },
      ];

      const res = await fetch(`/api/variations/${activeVariation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: nextList }),
      });
      if (!res.ok) throw new Error("Error guardando ingrediente");
      await invalidate();
      setSelectedAddIngId("");
      setAddQty("1");
      setAddSubNote("");
      setAddOptional(false);
      toast.success("Ingrediente agregado a esta versión.");
    } catch {
      toast.error("No se pudo agregar el ingrediente.");
    } finally {
      setSavingVariation(false);
    }
  }

  async function handleRemoveIngredient(indexToRemove: number) {
    if (!activeVariation) return;
    const nextList = activeVariation.ingredients
      .filter((_, i) => i !== indexToRemove)
      .map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
        isOptional: i.isOptional,
        substitutionNote: i.substitutionNote,
      }));

    const res = await fetch(`/api/variations/${activeVariation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: nextList }),
    });
    if (res.ok) {
      await invalidate();
      toast.success("Ingrediente quitado.");
    }
  }

  async function handleAddStep() {
    if (!activeVariation || !newStepInstruction.trim()) return;
    setSavingVariation(true);
    try {
      const nextSteps = [
        ...activeVariation.steps.map((s) => ({
          id: s.id,
          title: s.title,
          instruction: s.instruction,
          durationMinutes: s.durationMinutes,
        })),
        {
          title: newStepTitle.trim() || null,
          instruction: newStepInstruction.trim(),
          durationMinutes: null,
        },
      ];

      const res = await fetch(`/api/variations/${activeVariation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: nextSteps }),
      });
      if (!res.ok) throw new Error("No se pudo guardar el paso");
      await invalidate();
      setNewStepTitle("");
      setNewStepInstruction("");
      toast.success("Paso agregado.");
    } catch {
      toast.error("No se pudo guardar el paso.");
    } finally {
      setSavingVariation(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    if (!activeVariation) return;
    const nextSteps = activeVariation.steps
      .filter((s) => s.id !== stepId)
      .map((s) => ({
        id: s.id,
        title: s.title,
        instruction: s.instruction,
        durationMinutes: s.durationMinutes,
      }));
    const res = await fetch(`/api/variations/${activeVariation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: nextSteps }),
    });
    if (res.ok) {
      await invalidate();
      toast.success("Paso eliminado.");
    }
  }

  async function handleUploadStepMedia(stepId: string, file: File) {
    setUploadingStepId(stepId);
    try {
      const prepared = await prepareMediaFile(file);
      const presignRes = await fetch("/api/media/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId,
          fileName: prepared.name,
          mimeType: prepared.type,
          sizeBytes: prepared.size,
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error || "Error preparando subida");
      }

      const uploadUrl =
        typeof presignData.upload === "string"
          ? presignData.upload
          : presignData.upload?.url;

      if (!uploadUrl) {
        throw new Error("URL de subida no disponible");
      }

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": prepared.type },
        body: prepared,
      });

      if (!putRes.ok) {
        throw new Error("Falló la subida del archivo al storage");
      }

      await invalidate();
      toast.success(
        prepared.type.startsWith("video/")
          ? "Video adjuntado al paso."
          : "Imagen adjuntada al paso."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error subiendo archivo");
    } finally {
      setUploadingStepId(null);
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    const res = await fetch(`/api/media/${mediaId}`, { method: "DELETE" });
    if (res.ok) {
      await invalidate();
      toast.success("Archivo eliminado.");
    }
  }

  async function handleUploadSpellCover(file: File) {
    if (!spell) return;
    setUploadingCover(true);
    try {
      await uploadEntityCover("spell", spell.id, file);
      await invalidate();
      toast.success("Imagen de referencia guardada.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo subir la imagen"
      );
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleRemoveSpellCover() {
    if (!spell) return;
    setUploadingCover(true);
    try {
      await removeEntityCover("spell", spell.id);
      await invalidate();
      toast.success("Imagen quitada.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo quitar la imagen"
      );
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleQuickTogglePublish() {
    if (!spell) return;
    setTogglingPublish(true);
    try {
      const nextPublished = !spell.isPublished;
      const res = await fetch(`/api/spells/${spell.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: nextPublished }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      await fetch("/api/public/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await invalidate();
      toast.success(
        nextPublished
          ? `"${spell.title}" publicado en tarotdeluna.netlify.app.`
          : `"${spell.title}" ocultado del catálogo público.`
      );
    } catch {
      toast.error("No se pudo cambiar la publicación.");
    } finally {
      setTogglingPublish(false);
    }
  }

  async function handleDeleteSpell() {
    if (!spell) return;
    if (!confirm(`¿Eliminar definitivamente el hechizo "${spell.title}"?`)) return;
    const res = await fetch(`/api/spells/${spell.id}`, { method: "DELETE" });
    if (res.ok) {
      await invalidate();
      toast.success("Hechizo eliminado.");
      router.push("/");
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="apple-press hit-44 inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-border-strong hover:text-ink sm:min-h-10 sm:px-3.5 sm:py-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Hechizos
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={togglingPublish}
            onClick={handleQuickTogglePublish}
            className={`apple-press hit-44 inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-xs font-semibold sm:min-h-10 sm:px-3 sm:py-2 ${
              spell.isPublished
                ? "border-info/40 bg-info-soft text-info"
                : "border-border-subtle bg-surface text-ink-muted hover:border-info hover:text-info"
            }`}
          >
            {togglingPublish ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{spell.isPublished ? "En web" : "Subir a web"}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditSpellOpen(true)}
            className="apple-press hit-44 inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent sm:min-h-10 sm:px-3 sm:py-2"
          >
            <Edit3 className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" /> Editar
          </button>
          <button
            type="button"
            onClick={handleDeleteSpell}
            aria-label="Eliminar hechizo"
            className="apple-press hit-44 flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-subtle bg-surface text-ink-dim hover:border-danger/50 hover:bg-danger-soft hover:text-danger sm:h-10 sm:w-10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Spell Header */}
      <div className="rounded-[18px] border border-border-subtle bg-surface p-3.5 sm:p-6">
        {/* Cover Image Banner (if uploaded) — concentric r=12px inside r=18px */}
        {spell.imageUrl ? (
          <div className="relative mb-3.5 h-44 overflow-hidden rounded-[12px] border border-border-subtle bg-canvas sm:mb-4 sm:h-60">
            <ProgressiveImage
              src={spell.imageUrl}
              alt={spell.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
              <label className="apple-press hit-44 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur-sm">
                {uploadingCover ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                )}
                <span>Cambiar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingCover}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadSpellCover(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={uploadingCover}
                onClick={handleRemoveSpellCover}
                aria-label="Quitar foto de portada"
                className="apple-press hit-44 flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-subtle bg-surface/90 text-ink hover:text-danger backdrop-blur-sm"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3.5 sm:mb-4">
            <label className="apple-press inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-border-strong bg-canvas px-3.5 py-2 text-xs font-semibold text-ink-muted hover:border-accent hover:text-accent-text">
              {uploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4 text-accent-text" aria-hidden="true" />
              )}
              <span>
                {uploadingCover
                  ? "Subiendo imagen..."
                  : "Cargar imagen de referencia"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingCover}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadSpellCover(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-4xl">
                {spell.title}
              </h1>
              {spellCategory && (
                <span className="inline-flex items-center rounded-full border border-border-subtle bg-canvas px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                  {spellCategory.name}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  spell.isPublished
                    ? "bg-info-soft text-info"
                    : "bg-surface-elevated text-ink-dim"
                }`}
              >
                {spell.isPublished ? (
                  <>
                    <Globe className="h-3 w-3" aria-hidden="true" /> En tarotdeluna.netlify.app
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" aria-hidden="true" /> Solo privado
                  </>
                )}
              </span>
            </div>
            {spell.purpose && (
              <p className="mt-1 text-[13px] text-ink-muted sm:text-sm">{spell.purpose}</p>
            )}
          </div>

          <div className="text-right tabular-nums">
            {spell.priceTiers.map((tier) => (
              <p
                key={tier.id}
                className="flex flex-wrap items-center justify-end gap-1.5 whitespace-nowrap text-sm font-semibold text-accent-text"
              >
                {tier.label ? <span>{tier.label}:</span> : null}
                {(tier.regularPriceArs &&
                  tier.regularPriceArs > tier.priceArs) ||
                (tier.regularPriceUsd &&
                  tier.regularPriceUsd > tier.priceUsd) ? (
                  <span className="text-xs font-normal text-ink-dim line-through">
                    {formatDualPrice(
                      tier.regularPriceArs ?? tier.priceArs,
                      tier.regularPriceUsd ?? tier.priceUsd
                    )}
                  </span>
                ) : null}
                <span>{formatDualPrice(tier.priceArs, tier.priceUsd)}</span>
                {tier.discountPercent && tier.discountPercent > 0 ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-text">
                    -{tier.discountPercent}% OFF
                  </span>
                ) : null}
              </p>
            ))}
          </div>
        </div>

        {/* Variation Switcher Bar (← → + horizontal swipe with pan-y) */}
        <div
          className="mt-3.5 rounded-[12px] border border-border-subtle bg-canvas p-2.5 touch-pan-y sm:mt-4 sm:p-3"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || totalVariations <= 1) return;
            const diff =
              (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (diff > 50) goPrevVariation();
            else if (diff < -50) goNextVariation();
            touchStartX.current = null;
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrevVariation}
              disabled={totalVariations <= 1}
              aria-label="Variación anterior"
              className="apple-press hit-44 flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-border-subtle bg-surface text-ink hover:border-accent disabled:opacity-30 sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="truncate text-sm font-semibold text-ink">
                  {activeVariation.name}
                </span>
                <span className="rounded-md bg-accent-soft px-2 py-0.5 tabular-nums text-xs font-semibold text-accent-text">
                  {varIndex + 1} / {totalVariations}
                </span>
              </div>
              {activeVariation.clientContext && (
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {activeVariation.clientContext}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={goNextVariation}
              disabled={totalVariations <= 1}
              aria-label="Siguiente variación"
              className="apple-press hit-44 flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-border-subtle bg-surface text-ink hover:border-accent disabled:opacity-30 sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
            <button
              type="button"
              onClick={() => setNewVarOpen(true)}
              className="hit-44 inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Nueva variación desde esta versión
            </button>

            {!activeVariation.isBase && (
              <button
                type="button"
                onClick={handleDeleteVariation}
                className="hit-44 text-xs text-ink-dim hover:text-danger"
              >
                Eliminar variación
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inner Segmented Tabs (Sliding Concentric Pill: outer 14px - 4px pad = 10px inner) */}
      <div
        role="tablist"
        aria-label="Secciones de la variación"
        className="relative grid grid-cols-3 rounded-[14px] border border-border-subtle bg-surface p-1 sm:max-w-xl"
      >
        <span
          aria-hidden="true"
          style={{
            transform: `translateX(${
              (activeTab === "ingredientes"
                ? 0
                : activeTab === "pasos"
                  ? 1
                  : 2) * 100
            }%)`,
          }}
          className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-[10px] bg-accent transition-transform duration-[200ms] ease-[var(--ease-in-out)]"
        />

        {(
          [
            { id: "ingredientes", label: `Ingredientes (${activeVariation.ingredients.length})` },
            { id: "pasos", label: `Paso a paso (${activeVariation.steps.length})` },
            { id: "resumen", label: "Resumen & Costos" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`apple-press relative z-10 min-h-9 rounded-[10px] px-2 py-1.5 text-xs font-semibold tabular-nums transition-colors duration-[160ms] sm:min-h-10 sm:py-2 ${
              activeTab === tab.id
                ? "text-on-accent"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div
        key={`${activeVariation.id}-${activeTab}`}
        className="animate-variation-enter space-y-4"
      >
        {activeTab === "ingredientes" && (
          <div className="space-y-4">
            {/* Perform Ritual CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent-soft p-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Estado de stock:{" "}
                  <span
                    className={
                      match.tier === "ready"
                        ? "text-ready"
                        : match.tier === "almost"
                          ? "text-warn"
                          : "text-danger"
                    }
                  >
                    {match.tier === "ready"
                      ? "Listo para hacer (100%)"
                      : `Faltan ${match.missingRequired.length} elementos`}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                  Costo estimado de materiales:{" "}
                  <strong className="text-ink">
                    {formatArs(costSummary.totalCostArs)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPerformCharged(
                    effectiveSalePriceArs ? String(effectiveSalePriceArs) : ""
                  );
                  setPerformOpen(true);
                }}
                className="apple-press inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-on-accent hover:bg-accent-hover"
              >
                <Flame className="h-4 w-4" aria-hidden="true" /> Realicé este hechizo
              </button>
            </div>

            {/* Ingredient Checklist */}
            <div className="rounded-2xl border border-border-subtle bg-surface p-4">
              {activeVariation.ingredients.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-muted">
                  Todavía no cargaste ingredientes en esta versión.
                </p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {activeVariation.ingredients.map((vi, idx) => {
                    const check = match.checks[idx];
                    const ing = inventoryMap.get(vi.ingredientId);
                    return (
                      <li
                        key={vi.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          {ing?.imageUrl ? (
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border-subtle">
                              <ProgressiveImage
                                src={ing.imageUrl}
                                alt={ing.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                          <span className="shrink-0">
                            {check?.status === "available" ? (
                              <CheckCircle2 className="h-4 w-4 text-ready" aria-hidden="true" />
                            ) : check?.status === "low" ? (
                              <AlertCircle className="h-4 w-4 text-warn" aria-hidden="true" />
                            ) : (
                              <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {ing?.name ?? "Ingrediente"}{" "}
                              {vi.isOptional && (
                                <span className="text-xs font-normal text-ink-dim">
                                  (opcional)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-ink-muted tabular-nums">
                              {isPresenceUnit(ing?.unitType ?? vi.unit) ? (
                                <>
                                  Requiere:{" "}
                                  <strong className="text-ink">
                                    Presencia en altar
                                  </strong>{" "}
                                  · En alacena:{" "}
                                  {ing?.stockLevel === "out"
                                    ? "No lo tengo"
                                    : "Disponible (no se gasta)"}
                                </>
                              ) : (
                                <>
                                  Lleva:{" "}
                                  <strong className="text-ink">
                                    {vi.quantity !== null ? vi.quantity : ""}{" "}
                                    {UNIT_LABELS[vi.unit]}
                                  </strong>{" "}
                                  · En stock:{" "}
                                  {ing?.stockQty !== null &&
                                  ing?.stockQty !== undefined
                                    ? `${ing.stockQty} ${UNIT_LABELS[ing.unitType as UnitType]}`
                                    : ing?.stockLevel === "plenty"
                                      ? "Tengo"
                                      : ing?.stockLevel === "low"
                                        ? "Poco"
                                        : "Sin stock"}
                                </>
                              )}
                            </p>
                            {vi.substitutionNote && (
                              <p className="mt-0.5 text-xs font-medium text-accent-text">
                                Sustitución: {vi.substitutionNote}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          aria-label="Quitar ingrediente"
                          className="apple-press flex h-10 w-10 items-center justify-center rounded-xl text-ink-dim hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Add Ingredient to Variation */}
              <div className="mt-4 space-y-2.5 border-t border-border-subtle pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-muted">
                    Agregar elemento a &ldquo;{activeVariation.name}&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickIngOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Crear ingrediente nuevo
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <select
                    value={selectedAddIngId}
                    onChange={(e) => {
                      setSelectedAddIngId(e.target.value);
                      const ing = inventoryMap.get(e.target.value);
                      if (ing) setAddUnit(ing.unitType);
                    }}
                    className="col-span-12 rounded-xl border border-border-subtle bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent sm:col-span-5"
                  >
                    <option value="">Elegir de tu alacena...</option>
                    {(data?.ingredients ?? []).map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.groupTag})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    disabled={isNonCountableUnit(addUnit)}
                    value={isNonCountableUnit(addUnit) ? "" : addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    placeholder={
                      isPresenceUnit(addUnit)
                        ? "Sí/No"
                        : addUnit === "qualitative"
                          ? "A ojo"
                          : "Cant."
                    }
                    className="col-span-4 rounded-xl border border-border-subtle bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent disabled:opacity-45 sm:col-span-2"
                  />

                  <select
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value as UnitType)}
                    className="col-span-4 rounded-xl border border-border-subtle bg-canvas px-2.5 py-2.5 text-sm text-ink outline-none focus:border-accent sm:col-span-3"
                  >
                    {Object.entries(UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedAddIngId || savingVariation}
                    onClick={() => handleAddIngredientToVariation()}
                    className="apple-press col-span-4 rounded-xl bg-accent-soft px-3 py-2.5 text-xs font-semibold text-accent-text hover:bg-accent hover:text-on-accent disabled:opacity-40 sm:col-span-2"
                  >
                    Añadir
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={addSubNote}
                    onChange={(e) => setAddSubNote(e.target.value)}
                    placeholder="Nota o posible sustitución (opcional)"
                    className="flex-1 rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={addOptional}
                      onChange={(e) => setAddOptional(e.target.checked)}
                      className="h-4 w-4 accent-[var(--accent-solid)]"
                    />
                    Opcional
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pasos" && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Procedimiento estandarizado
                  </p>
                  <p className="text-xs text-ink-muted">
                    Tildá cada paso mientras trabajás en el altar y adjuntá fotos o videos guía.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleWakeLock}
                  className={`apple-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                    wakeLockActive
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  {wakeLockActive ? "Pantalla activa" : "Mantener encendida"}
                </button>
              </div>

              {/* GPU-Composited Step Progress Bar (scaleX transform, zero layout cost) */}
              {activeVariation.steps.length > 0 && (() => {
                const completedCount = activeVariation.steps.filter(
                  (s) => !!checkedSteps[s.id]
                ).length;
                const totalStepsCount = activeVariation.steps.length;
                const progressRatio = completedCount / totalStepsCount;
                const allComplete = completedCount === totalStepsCount;

                return (
                  <div className="space-y-2 border-t border-border-subtle pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink-muted tabular-nums">
                        Progreso en altar:{" "}
                        <strong className={allComplete ? "text-ready" : "text-ink"}>
                          {completedCount} de {totalStepsCount}
                        </strong>{" "}
                        pasos
                      </span>
                      <span className="font-semibold text-accent-text tabular-nums">
                        {Math.round(progressRatio * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                      <div
                        style={{
                          transform: `scaleX(${progressRatio})`,
                        }}
                        className={`h-full w-full origin-left rounded-full transition-transform duration-[220ms] ease-[var(--ease-out)] ${
                          allComplete ? "bg-ready-solid" : "bg-accent"
                        }`}
                      />
                    </div>
                    {allComplete && (
                      <div className="animate-variation-enter flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ready/35 bg-ready-soft/65 px-3 py-2 text-xs">
                        <span className="font-semibold text-ready">
                          ¡Todos los pasos del ritual completados!
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPerformCharged(
                              effectiveSalePriceArs
                                ? String(effectiveSalePriceArs)
                                : ""
                            );
                            setPerformOpen(true);
                          }}
                          className="apple-press inline-flex items-center gap-1 rounded-lg bg-ready-solid px-2.5 py-1 font-semibold text-on-ready"
                        >
                          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Registrar y descontar stock</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {activeVariation.steps.length === 0 ? (
              <div className="rounded-[16px] border border-border-subtle bg-surface p-4 text-center text-sm text-ink-muted sm:p-6">
                Todavía no cargaste pasos en esta versión. Sumá el primer paso abajo.
              </div>
            ) : (
              <div className="space-y-3">
                {activeVariation.steps.map((step) => {
                  const done = !!checkedSteps[step.id];
                  return (
                    <div
                      key={step.id}
                      className={`rounded-2xl border p-4 transition ${
                        done
                          ? "border-ready/40 bg-ready-soft/40"
                          : "border-border-subtle bg-surface"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !done &&
                              typeof navigator !== "undefined" &&
                              "vibrate" in navigator
                            ) {
                              navigator.vibrate?.(10);
                            }
                            setCheckedSteps((prev) => ({
                              ...prev,
                              [step.id]: !prev[step.id],
                            }));
                          }}
                          aria-label={`Marcar paso ${step.stepNumber}`}
                          aria-pressed={done}
                          className={`apple-press mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${
                            done
                              ? "animate-check-pop border-ready-solid bg-ready-solid text-on-ready"
                              : "border-accent/50 text-accent-text"
                          }`}
                        >
                          {done ? <Check className="h-4 w-4" aria-hidden="true" /> : step.stepNumber}
                        </button>

                        <div className="min-w-0 flex-1">
                          {step.title && (
                            <h3
                              className={`text-sm font-semibold ${
                                done ? "text-ink-muted line-through" : "text-ink"
                              }`}
                            >
                              {step.title}
                            </h3>
                          )}
                          <p
                            className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                              done ? "text-ink-dim" : "text-ink-muted"
                            }`}
                          >
                            {step.instruction}
                          </p>

                          {/* Attached Photos & Videos */}
                          {step.media.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {step.media.map((m) => (
                                <div
                                  key={m.id}
                                  className="relative overflow-hidden rounded-xl border border-border-subtle bg-canvas"
                                >
                                  {m.signedUrl ? (
                                    m.mediaType === "video" ? (
                                      <video
                                        src={m.signedUrl}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="h-36 w-full object-cover"
                                      />
                                    ) : (
                                      <a
                                        href={m.signedUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img
                                          src={m.signedUrl}
                                          alt={m.caption || "Referencia del paso"}
                                          className="h-36 w-full object-cover"
                                        />
                                      </a>
                                    )
                                  ) : (
                                    <div className="flex h-36 items-center justify-center text-xs text-ink-dim">
                                      Archivo privado
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMedia(m.id)}
                                    aria-label="Eliminar archivo"
                                    className="apple-press absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink hover:text-danger"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload Media & Delete Step Controls */}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <label className="apple-press inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent-text">
                              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                              {uploadingStepId === step.id
                                ? "Subiendo..."
                                : "Adjuntar foto / video"}
                              <input
                                type="file"
                                accept="image/*,video/mp4,video/webm,video/quicktime"
                                disabled={uploadingStepId === step.id}
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadStepMedia(step.id, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteStep(step.id)}
                              className="text-xs text-ink-dim hover:text-danger"
                            >
                              Quitar paso
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Step Form */}
            <div className="space-y-2.5 rounded-2xl border border-border-subtle bg-surface p-4">
              <p className="text-xs font-semibold text-ink-muted">
                Agregar nuevo paso
              </p>
              <input
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="Título breve (opcional, ej. Consagración de velas)"
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
              />
              <textarea
                rows={3}
                value={newStepInstruction}
                onChange={(e) => setNewStepInstruction(e.target.value)}
                placeholder="Describí exactamente cómo realizar este paso para repetirlo siempre igual..."
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!newStepInstruction.trim() || savingVariation}
                  onClick={handleAddStep}
                  className="apple-press inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Agregar paso
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "resumen" && (
          <div className="space-y-4">
            {/* Private Profitability Card */}
            <div className="rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2 text-accent-text">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-ink">
                  Rentabilidad privada (solo visible para vos)
                </h2>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border-subtle rounded-xl border border-border-subtle bg-canvas">
                <div className="p-3 sm:p-4">
                  <p className="text-xs text-ink-dim">Precio venta</p>
                  <p className="mt-0.5 tabular-nums text-base font-semibold text-ink sm:text-lg">
                    {formatArs(costSummary.salePriceArs)}
                  </p>
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-xs text-ink-dim">Costo insumos</p>
                  <p className="mt-0.5 tabular-nums text-base font-semibold text-warn sm:text-lg">
                    {formatArs(costSummary.totalCostArs)}
                  </p>
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-xs text-ink-dim">Margen neto</p>
                  <p className="mt-0.5 tabular-nums text-base font-semibold text-ready sm:text-lg">
                    {costSummary.marginPercent !== null
                      ? `${costSummary.marginPercent}%`
                      : "—"}
                  </p>
                  {costSummary.marginArs !== null && (
                    <p className="tabular-nums text-xs text-ink-muted">
                      {formatArs(costSummary.marginArs)}
                    </p>
                  )}
                </div>
              </div>

              {costSummary.missingCostIngredients.length > 0 && (
                <p className="mt-2.5 text-xs text-ink-dim">
                  Sin costo unitario cargado:{" "}
                  {costSummary.missingCostIngredients.join(", ")} (podés cargarlo en Alacena).
                </p>
              )}
            </div>

            {/* Energies & Public Description */}
            <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold text-ink-muted">
                  Energías trabajadas
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {spell.energyTypes.length > 0 ? (
                    spell.energyTypes.map((e) => (
                      <span
                        key={e}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
                      >
                        <Sparkles className="h-3 w-3 text-accent-text" aria-hidden="true" /> {e}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink-dim">Sin etiquetas</span>
                  )}
                </div>
              </div>

              {spell.publicDescription && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted">
                    Descripción pública (web)
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {spell.publicDescription}
                  </p>
                </div>
              )}

              {spell.privateNotes && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted">
                    Notas privadas
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                    {spell.privateNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Variation Modal (with 1:1 Drag-to-Dismiss & Symmetric Exit) */}
      <IosBottomSheet
        open={newVarOpen}
        onClose={() => setNewVarOpen(false)}
        ariaLabelledBy="new-var-title"
      >
        <div className="pb-sheet-safe px-4 pt-1.5 pb-4 sm:p-5">
          <h2
            id="new-var-title"
            className="section-heading text-[20px] font-semibold text-ink sm:text-2xl"
          >
            Nueva variación de {spell.title}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Se copiarán los ingredientes y pasos de &ldquo;{activeVariation.name}&rdquo; para que solo modifiques lo que cambia.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Nombre de la variación *
              </label>
              <input
                type="text"
                autoFocus
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="Ej. Sin foto, Reforzado con miel, Improvisado..."
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                ¿Cuándo aplicarla? (opcional)
              </label>
              <input
                type="text"
                value={newVarContext}
                onChange={(e) => setNewVarContext(e.target.value)}
                placeholder="Ej. Cuando la clienta no tiene foto o hay resistencia fuerte"
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewVarOpen(false)}
                className="apple-press min-h-11 rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-ink-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!newVarName.trim() || creatingVar}
                onClick={handleCreateVariation}
                className="apple-press min-h-11 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
              >
                {creatingVar ? "Creando..." : "Crear variación"}
              </button>
            </div>
          </div>
        </div>
      </IosBottomSheet>

      {/* Perform Ritual & Deduct Stock Modal (with 1:1 Drag-to-Dismiss & Symmetric Exit) */}
      <IosBottomSheet
        open={performOpen}
        onClose={() => setPerformOpen(false)}
        ariaLabelledBy="perform-ritual-title"
      >
        <div className="pb-sheet-safe px-4 pt-1.5 pb-4 sm:p-5">
          <h2
            id="perform-ritual-title"
            className="section-heading text-[20px] font-semibold text-ink sm:text-2xl"
          >
            Registrar ritual realizado
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {spell.title} · {activeVariation.name}
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Clienta / Referencia (opcional)
              </label>
              <input
                type="text"
                value={performClient}
                onChange={(e) => setPerformClient(e.target.value)}
                placeholder="Ej. Cami M."
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Monto cobrado (ARS)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={performCharged}
                onChange={(e) => setPerformCharged(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <label className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-canvas p-3 text-xs text-ink">
              <input
                type="checkbox"
                checked={performDeduct}
                onChange={(e) => setPerformDeduct(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent-solid)]"
              />
              <span>
                Descontar automáticamente los ingredientes de mi stock real
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPerformOpen(false)}
                className="apple-press min-h-11 rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-ink-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={performMut.isPending}
                onClick={async () => {
                  await performMut.mutateAsync({
                    variationId: activeVariation.id,
                    deductStock: performDeduct,
                    clientAlias: performClient.trim() || null,
                    chargedArs:
                      performCharged === "" ? null : Number(performCharged),
                  });
                  setPerformOpen(false);
                  setPerformClient("");
                }}
                className="apple-press min-h-11 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
              >
                {performMut.isPending ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      </IosBottomSheet>

      <QuickIngredientModal
        open={quickIngOpen}
        onClose={() => setQuickIngOpen(false)}
        onCreated={(ing) => {
          setSelectedAddIngId(ing.id);
          setAddUnit(ing.unitType);
          handleAddIngredientToVariation(ing.id, ing.unitType);
        }}
      />

      <SpellFormModal
        open={editSpellOpen}
        categories={data?.categories ?? []}
        editingSpell={spell}
        onClose={() => setEditSpellOpen(false)}
      />
    </div>
  );
}
