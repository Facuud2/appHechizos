"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useInvalidateGrimorio } from "@/hooks/useGrimorioData";
import { IosBottomSheet } from "./IosBottomSheet";
import type { CategoryItem, SpellItem } from "@/types/app";

interface TierDraft {
  label: string;
  priceArs: string;
  priceUsd: string;
}

const DEFAULT_ENERGIES = [
  "Amor",
  "Atracción",
  "Armonización",
  "Limpieza",
  "Protección",
  "Abrecaminos",
  "Prosperidad",
  "Dominio",
  "Corte",
  "Amor propio",
];

const WIZARD_STEPS = [
  { id: 0, title: "Nombre y Categoría" },
  { id: 1, title: "Energías" },
  { id: 2, title: "Precios" },
  { id: 3, title: "Catálogo Web" },
  { id: 4, title: "Notas Privadas" },
] as const;

export function SpellFormModal({
  open,
  categories,
  editingSpell,
  onClose,
  onSaved,
}: {
  open: boolean;
  categories: CategoryItem[];
  editingSpell?: SpellItem | null;
  onClose: () => void;
  onSaved?: (spellId: string) => void;
}) {
  const invalidate = useInvalidateGrimorio();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [shakeTick, setShakeTick] = useState(0);

  const [title, setTitle] = useState(editingSpell?.title ?? "");
  const [categoryId, setCategoryId] = useState(
    editingSpell?.categoryId ?? categories[0]?.id ?? ""
  );
  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(categories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const [selectedEnergies, setSelectedEnergies] = useState<string[]>(
    editingSpell?.energyTypes ?? []
  );
  const [newEnergyDraft, setNewEnergyDraft] = useState("");

  const [subtitleTag, setSubtitleTag] = useState(
    editingSpell?.subtitleTag ?? ""
  );
  const [publicDescription, setPublicDescription] = useState(
    editingSpell?.publicDescription ?? ""
  );
  const [privateNotes, setPrivateNotes] = useState(
    editingSpell?.privateNotes ?? ""
  );
  const [isPublished, setIsPublished] = useState(
    editingSpell?.isPublished ?? true
  );
  const [isOffer, setIsOffer] = useState(editingSpell?.isOffer ?? false);
  const [offerLabel, setOfferLabel] = useState(
    editingSpell?.offerLabel ?? "¡OFERTA!"
  );
  const [tiers, setTiers] = useState<TierDraft[]>(
    editingSpell && editingSpell.priceTiers.length > 0
      ? editingSpell.priceTiers.map((t) => ({
          label: t.label,
          priceArs: String(t.priceArs),
          priceUsd: String(t.priceUsd),
        }))
      : [{ label: "", priceArs: "30000", priceUsd: "34" }]
  );

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setTitle(editingSpell?.title ?? "");
    setCategoryId(editingSpell?.categoryId ?? categories[0]?.id ?? "");
    setAddingCategory(false);
    setNewCategoryName("");
    setSelectedEnergies(editingSpell?.energyTypes ?? []);
    setNewEnergyDraft("");
    setSubtitleTag(editingSpell?.subtitleTag ?? "");
    setPublicDescription(editingSpell?.publicDescription ?? "");
    setPrivateNotes(editingSpell?.privateNotes ?? "");
    setIsPublished(editingSpell?.isPublished ?? true);
    setIsOffer(editingSpell?.isOffer ?? false);
    setOfferLabel(editingSpell?.offerLabel ?? "¡OFERTA!");
    setTiers(
      editingSpell && editingSpell.priceTiers.length > 0
        ? editingSpell.priceTiers.map((t) => ({
            label: t.label,
            priceArs: String(t.priceArs),
            priceUsd: String(t.priceUsd),
          }))
        : [{ label: "", priceArs: "30000", priceUsd: "34" }]
    );
  }, [open, editingSpell, categories]);

  // All available energy pills = defaults + any custom ones already added
  const allEnergyOptions = Array.from(
    new Set([...DEFAULT_ENERGIES, ...selectedEnergies])
  );

  function toggleEnergy(energy: string) {
    setSelectedEnergies((prev) => {
      const exists = prev.some((e) => e.toLowerCase() === energy.toLowerCase());
      return exists
        ? prev.filter((e) => e.toLowerCase() !== energy.toLowerCase())
        : [...prev, energy];
    });
  }

  function handleAddCustomEnergy() {
    const clean = newEnergyDraft.trim();
    if (!clean) return;
    setSelectedEnergies((prev) => {
      if (prev.some((e) => e.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, clean];
    });
    setNewEnergyDraft("");
  }

  async function handleCreateCategory() {
    const clean = newCategoryName.trim();
    if (!clean) return;
    setCreatingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la categoría");
      const created: CategoryItem = data.category;
      setLocalCategories((prev) =>
        prev.some((c) => c.id === created.id) ? prev : [...prev, created]
      );
      setCategoryId(created.id);
      setNewCategoryName("");
      setAddingCategory(false);
      await invalidate();
      toast.success(`Categoría "${created.name}" lista.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setCreatingCat(false);
    }
  }

  function goPrev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    if (step === 0 && !title.trim()) {
      setShakeTick((t) => t + 1);
      toast.error("Escribí el nombre del hechizo antes de avanzar.");
      return;
    }
    setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
  }

  async function saveSpell() {
    if (!title.trim()) {
      setStep(0);
      setShakeTick((t) => t + 1);
      toast.error("El nombre del hechizo es obligatorio.");
      return;
    }
    setSaving(true);

    const priceTiers = tiers
      .filter((t) => t.priceArs !== "" || t.priceUsd !== "")
      .map((t) => ({
        label: t.label.trim(),
        priceArs: Number(t.priceArs || 0),
        priceUsd: Number(t.priceUsd || 0),
      }));

    try {
      const url = editingSpell
        ? `/api/spells/${editingSpell.id}`
        : "/api/spells";
      const method = editingSpell ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          title: title.trim(),
          subtitleTag: subtitleTag.trim() || null,
          energyTypes: selectedEnergies,
          publicDescription: publicDescription.trim() || null,
          privateNotes: privateNotes.trim() || null,
          isPublished,
          isOffer,
          offerLabel: isOffer ? offerLabel.trim() || "¡OFERTA!" : null,
          priceTiers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar hechizo");

      await invalidate();
      toast.success(
        editingSpell
          ? "Hechizo actualizado."
          : "Hechizo creado correctamente."
      );
      onSaved?.(data.id ?? editingSpell?.id ?? "");
      onClose();
    } catch (err) {
      setShakeTick((t) => t + 1);
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  const totalSteps = WIZARD_STEPS.length;

  return (
    <IosBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy="spell-form-title"
      maxWidthClass="max-w-lg"
      shakeTick={shakeTick}
    >
      {/* Top Header + Arrow Stepper */}
      <div className="border-b border-border-subtle px-4 pt-1.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="spell-form-title"
              className="section-heading text-[18px] font-semibold text-ink sm:text-xl"
            >
              {editingSpell ? "Editar hechizo" : "Nuevo hechizo"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="apple-press hit-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-elevated hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Step Navigation Bar with Left / Right Arrows (Concentric: outer 14px - 5px pad = 9px inner) */}
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[14px] border border-border-subtle bg-canvas p-1.5 sm:mt-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={goPrev}
              aria-label="Paso anterior"
              className="apple-press hit-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border-subtle bg-surface text-ink hover:border-accent disabled:opacity-30 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-text tabular-nums">
                Paso {step + 1} de {totalSteps}
              </p>
              <p className="truncate text-sm font-semibold text-ink">
                {WIZARD_STEPS[step].title}
              </p>
            </div>

            <button
              type="button"
              disabled={step === totalSteps - 1}
              onClick={goNext}
              aria-label="Siguiente paso"
              className="apple-press hit-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border-subtle bg-surface text-ink hover:border-accent disabled:opacity-30 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Progress Dots (clickable to jump directly) */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            {WIZARD_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Ir al paso ${idx + 1}: ${s.title}`}
                onClick={() => {
                  if (idx > 0 && !title.trim()) {
                    toast.error("Primero poné el nombre del hechizo.");
                    return;
                  }
                  setStep(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  step === idx
                    ? "w-7 bg-accent"
                    : idx < step
                      ? "w-2 bg-ready-solid"
                      : "w-2 bg-border-strong"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content (Strictly 2-3 fields max per step) */}
        <div className="scroll-contain flex-1 overflow-y-auto p-5">
          {/* PASO 1: Nombre y Categoría (+ Crear nueva categoría) */}
          {step === 0 && (
            <div key="step-0" className="animate-variation-enter space-y-4">
              <div>
                <label
                  htmlFor="spell-title-input"
                  className="mb-1.5 block text-xs font-semibold text-ink-muted"
                >
                  1. Nombre del hechizo *
                </label>
                <input
                  id="spell-title-input"
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      goNext();
                    }
                  }}
                  placeholder="Ej. Amarre, Endulzamiento, Abrecaminos..."
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-3 text-base text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-ink-muted">
                    2. Categoría
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddingCategory((v) => !v)}
                    className="apple-press inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-text"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Nueva categoría</span>
                  </button>
                </div>

                {addingCategory && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent/40 bg-canvas p-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                      placeholder="Nombre de la nueva categoría..."
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-dim outline-none"
                    />
                    <button
                      type="button"
                      disabled={!newCategoryName.trim() || creatingCat}
                      onClick={handleCreateCategory}
                      className="apple-press inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-40"
                    >
                      {creatingCat ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Crear</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {localCategories.map((c) => {
                    const selected = categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={`apple-press flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium ${
                          selected
                            ? "border-accent bg-accent-soft font-semibold text-accent-text"
                            : "border-border-subtle bg-canvas text-ink-muted hover:border-border-strong hover:text-ink"
                        }`}
                      >
                        <span className="line-clamp-2">{c.name}</span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Solo Energías (+ Crear nueva energía si no existe) */}
          {step === 1 && (
            <div key="step-1" className="animate-variation-enter space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-ink-muted">
                  Tocá las energías que maneja este hechizo:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allEnergyOptions.map((energy) => {
                    const active = selectedEnergies.some(
                      (e) => e.toLowerCase() === energy.toLowerCase()
                    );
                    return (
                      <button
                        key={energy}
                        type="button"
                        onClick={() => toggleEnergy(energy)}
                        className={`apple-press min-h-10 rounded-xl border px-3.5 py-2 text-xs font-medium ${
                          active
                            ? "border-accent bg-accent-soft font-semibold text-accent-text"
                            : "border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                        }`}
                      >
                        {active ? `✓ ${energy}` : `+ ${energy}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border-subtle bg-canvas p-3.5">
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                  ¿No está en la lista? Agregá una nueva:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newEnergyDraft}
                    onChange={(e) => setNewEnergyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomEnergy();
                      }
                    }}
                    placeholder="Ej. Destrabe, Endulzamiento, Justicia..."
                    className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    disabled={!newEnergyDraft.trim()}
                    onClick={handleAddCustomEnergy}
                    className="apple-press inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sumar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Solo Precios (ARS / USD) */}
          {step === 2 && (
            <div key="step-2" className="animate-variation-enter space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-accent-text">
                    Precios del hechizo (ARS / USD)
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Cargá el valor principal o sumá otro nivel si tiene versión potenciada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTiers((prev) => [
                      ...prev,
                      { label: "Potenciado", priceArs: "", priceUsd: "" },
                    ])
                  }
                  className="apple-press flex min-h-9 shrink-0 items-center gap-1 rounded-xl border border-border-subtle bg-canvas px-3 py-1.5 text-xs font-semibold text-accent-text"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Nivel
                </button>
              </div>

              <div className="space-y-3">
                {tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border-subtle bg-canvas p-3.5"
                  >
                    {(tiers.length > 1 || tier.label !== "") && (
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) =>
                            setTiers((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, label: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder={`Nombre nivel ${idx + 1} (ej. Base o Potenciado)`}
                          className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                        />
                        {tiers.length > 1 && (
                          <button
                            type="button"
                            aria-label="Quitar nivel de precio"
                            onClick={() =>
                              setTiers((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="apple-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink-muted">
                          Pesos (ARS)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={tier.priceArs}
                          onChange={(e) =>
                            setTiers((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, priceArs: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="30000"
                          className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2.5 tabular-nums text-base font-semibold text-ink outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink-muted">
                          Dólares (USD)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={tier.priceUsd}
                          onChange={(e) =>
                            setTiers((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, priceUsd: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="34"
                          className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2.5 tabular-nums text-base font-semibold text-ink outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 4: Catálogo Web (2-3 campos) */}
          {step === 3 && (
            <div key="step-3" className="animate-variation-enter space-y-3.5">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-canvas p-3.5">
                <div className="flex items-center gap-2.5">
                  {isPublished ? (
                    <Globe className="h-5 w-5 shrink-0 text-info" aria-hidden="true" />
                  ) : (
                    <Lock className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden="true" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Mostrar en tarotdeluna.netlify.app
                    </p>
                    <p className="text-xs text-ink-muted">
                      Desactivalo si es un ritual privado.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[var(--accent-solid)]"
                />
              </label>

              {isPublished && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-muted">
                      Subtítulo breve (opcional)
                    </label>
                    <input
                      type="text"
                      value={subtitleTag}
                      onChange={(e) => setSubtitleTag(e.target.value)}
                      placeholder="Ej. Limpieza energética profunda + Purgado"
                      className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink-muted">
                      Descripción comercial para clientas (opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={publicDescription}
                      onChange={(e) => setPublicDescription(e.target.value)}
                      placeholder="Texto que ven tus clientas en la web..."
                      className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* PASO 5: Oferta y Notas Privadas (2 campos) */}
          {step === 4 && (
            <div key="step-4" className="animate-variation-enter space-y-4">
              <div className="rounded-2xl border border-border-subtle bg-canvas p-3.5">
                <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-ink">
                  <span>Destacar con cartel de Oferta en la web</span>
                  <input
                    type="checkbox"
                    checked={isOffer}
                    onChange={(e) => setIsOffer(e.target.checked)}
                    className="h-5 w-5 accent-[var(--accent-solid)]"
                  />
                </label>
                {isOffer && (
                  <input
                    type="text"
                    value={offerLabel}
                    onChange={(e) => setOfferLabel(e.target.value)}
                    placeholder="¡OFERTA!"
                    className="mt-2.5 w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-accent-text outline-none focus:border-accent"
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                  Notas privadas de altar (solo vos las ves)
                </label>
                <textarea
                  rows={3}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Cuidados energéticos, fases lunares, advertencias..."
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer: Left/Right Arrows + Instant Save from ANY step */}
        <div className="pb-sheet-safe flex shrink-0 items-center justify-between gap-2 border-t border-border-subtle bg-surface px-5 pt-3.5 sm:pb-3.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={step === 0}
              onClick={goPrev}
              aria-label="Anterior"
              className="apple-press inline-flex min-h-11 items-center gap-1 rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              disabled={step === totalSteps - 1}
              onClick={goNext}
              aria-label="Siguiente"
              className="apple-press inline-flex min-h-11 items-center gap-1 rounded-xl border border-border-subtle bg-canvas px-3 py-2 text-xs font-semibold text-ink hover:border-accent disabled:opacity-35"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={saveSpell}
            className="apple-press inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-45"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{saving ? "Guardando..." : "Guardar"}</span>
          </button>
        </div>
    </IosBottomSheet>
  );
}
