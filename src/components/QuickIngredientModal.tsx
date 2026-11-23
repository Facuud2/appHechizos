"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Minus,
  Plus,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateIngredient,
  useGrimorio,
  useUpdateIngredient,
} from "@/hooks/useGrimorioData";
import { BulkIngredientsPanel } from "./BulkIngredientsPanel";
import { IosBottomSheet } from "./IosBottomSheet";
import type { IngredientItem } from "@/types/app";
import {
  isNonCountableUnit,
  isPresenceUnit,
  type StockLevel,
  type UnitType,
} from "@/db/schema";
import { inferGroupAndUnit } from "@/lib/domain/bulk-parser";

const DEFAULT_GROUP_TAGS = [
  "Hierbas",
  "Velas",
  "Insumos",
  "Aceites",
  "Cristales",
  "Cartas",
  "Inciensos",
  "Otros",
];

const DEFAULT_UNIT_BY_GROUP: Record<string, UnitType> = {
  Hierbas: "g",
  Velas: "unit",
  Insumos: "unit",
  Aceites: "ml",
  Cristales: "presence",
  Cartas: "presence",
  Inciensos: "unit",
  Otros: "presence",
};

const DEFAULT_QTY_BY_UNIT: Record<UnitType, string> = {
  unit: "5",
  g: "50",
  ml: "30",
  branch: "5",
  tbsp: "10",
  pinch: "10",
  qualitative: "",
  presence: "",
};

const UNIT_OPTIONS: { value: UnitType; label: string; hint?: string }[] = [
  {
    value: "presence",
    label: "Solo existencia (Lo tengo / No lo tengo)",
    hint: "Para cristales, piedras, mazos de cartas o herramientas que no se gastan",
  },
  { value: "unit", label: "Unidades (u.)" },
  { value: "g", label: "Gramos (g)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "branch", label: "Ramas" },
  { value: "tbsp", label: "Cucharadas" },
  { value: "pinch", label: "Pizcas" },
  { value: "qualitative", label: "A ojo (Tengo / Poco / Sin)" },
];

const INGREDIENT_STEPS = [
  { id: 0, title: "Nombre y Rubro" },
  { id: 1, title: "Medición y Stock" },
  { id: 2, title: "Costo y Notas" },
] as const;

export function QuickIngredientModal({
  open,
  initialName = "",
  initialMode = "single",
  editingIngredient = null,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  initialName?: string;
  initialMode?: "single" | "bulk";
  editingIngredient?: IngredientItem | null;
  onClose: () => void;
  onCreated?: (ingredient: IngredientItem) => void;
  onUpdated?: (ingredient: IngredientItem) => void;
}) {
  const { data: grimorioData } = useGrimorio();
  const isEditing = !!editingIngredient;
  const [mode, setMode] = useState<"single" | "bulk">(
    editingIngredient ? "single" : initialMode
  );
  const [step, setStep] = useState(0);
  const [shakeTick, setShakeTick] = useState(0);
  const [name, setName] = useState(editingIngredient?.name ?? initialName);
  const [groupTag, setGroupTag] = useState(
    editingIngredient?.groupTag ?? "Hierbas"
  );
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupDraft, setNewGroupDraft] = useState("");

  const [groupTouched, setGroupTouched] = useState(!!editingIngredient);
  const [unitType, setUnitType] = useState<UnitType>(
    editingIngredient?.unitType ?? "g"
  );
  const [stockQty, setStockQty] = useState(
    editingIngredient
      ? editingIngredient.stockQty !== null
        ? String(editingIngredient.stockQty)
        : ""
      : "50"
  );
  const [stockLevel, setStockLevel] = useState<StockLevel>(
    editingIngredient?.stockLevel ?? "plenty"
  );
  const [unitCostArs, setUnitCostArs] = useState(
    editingIngredient?.unitCostArs !== null &&
      editingIngredient?.unitCostArs !== undefined
      ? String(editingIngredient.unitCostArs)
      : ""
  );
  const [notes, setNotes] = useState(editingIngredient?.notes ?? "");
  const createMut = useCreateIngredient();
  const updateMut = useUpdateIngredient();

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAddingGroup(false);
    setNewGroupDraft("");

    if (editingIngredient) {
      setMode("single");
      setName(editingIngredient.name);
      setGroupTag(editingIngredient.groupTag);
      setGroupTouched(true);
      setUnitType(editingIngredient.unitType);
      setStockQty(
        editingIngredient.stockQty !== null
          ? String(editingIngredient.stockQty)
          : ""
      );
      setStockLevel(editingIngredient.stockLevel);
      setUnitCostArs(
        editingIngredient.unitCostArs !== null
          ? String(editingIngredient.unitCostArs)
          : ""
      );
      setNotes(editingIngredient.notes ?? "");
      return;
    }

    setMode(initialMode);
    setName(initialName);
    setGroupTouched(false);
    setStockLevel("plenty");
    setUnitCostArs("");
    setNotes("");

    if (initialName.trim()) {
      const inferred = inferGroupAndUnit(initialName);
      setGroupTag(inferred.groupTag);
      setUnitType(inferred.unitType);
      setStockQty(DEFAULT_QTY_BY_UNIT[inferred.unitType]);
    } else {
      setGroupTag("Hierbas");
      setUnitType("g");
      setStockQty("50");
    }
  }, [open, initialName, initialMode, editingIngredient]);

  const existingGroups = (grimorioData?.ingredients ?? [])
    .map((ing) => ing.groupTag)
    .filter(Boolean);
  const allGroups = Array.from(
    new Set([
      ...DEFAULT_GROUP_TAGS,
      ...existingGroups,
      ...customGroups,
      ...(groupTag ? [groupTag] : []),
    ])
  );

  function handleNameChange(nextName: string) {
    setName(nextName);
    if (!groupTouched && nextName.trim().length >= 3) {
      const inferred = inferGroupAndUnit(nextName);
      setGroupTag(inferred.groupTag);
      setUnitType(inferred.unitType);
      setStockQty(DEFAULT_QTY_BY_UNIT[inferred.unitType]);
    }
  }

  function handleSelectGroup(tag: string) {
    setGroupTouched(true);
    setGroupTag(tag);
    // When creating a new ingredient, auto-suggest the default unit for that group.
    // When editing an existing ingredient, preserve the user's chosen unit & stock.
    if (!isEditing) {
      const suggestedUnit = DEFAULT_UNIT_BY_GROUP[tag] ?? "unit";
      setUnitType(suggestedUnit);
      setStockQty(DEFAULT_QTY_BY_UNIT[suggestedUnit]);
      if (isPresenceUnit(suggestedUnit) && stockLevel === "low") {
        setStockLevel("plenty");
      }
    }
  }

  function handleCreateGroup() {
    const clean = newGroupDraft.trim();
    if (!clean) return;
    setGroupTouched(true);
    setCustomGroups((prev) =>
      prev.some((g) => g.toLowerCase() === clean.toLowerCase())
        ? prev
        : [...prev, clean]
    );
    setGroupTag(clean);
    setNewGroupDraft("");
    setAddingGroup(false);
    toast.success(`Rubro "${clean}" listo.`);
  }

  function handleSelectUnit(nextUnit: UnitType) {
    setUnitType(nextUnit);
    if (!isNonCountableUnit(nextUnit) && (!stockQty || stockQty === "0")) {
      setStockQty(DEFAULT_QTY_BY_UNIT[nextUnit]);
    }
    if (isPresenceUnit(nextUnit) && stockLevel === "low") {
      setStockLevel("plenty");
    }
  }

  function stepQuantity(delta: number) {
    const stepSize = unitType === "g" || unitType === "ml" ? 10 : 1;
    const current = Number(stockQty || 0);
    const next = Math.max(
      0,
      Math.round((current + delta * stepSize) * 100) / 100
    );
    setStockQty(String(next));
    setStockLevel(next === 0 ? "out" : "plenty");
  }

  function goPrev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    if (step === 0 && !name.trim()) {
      setShakeTick((t) => t + 1);
      toast.error("Escribí el nombre del producto antes de avanzar.");
      return;
    }
    setStep((s) => Math.min(INGREDIENT_STEPS.length - 1, s + 1));
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  async function saveIngredient() {
    if (!name.trim()) {
      setStep(0);
      setShakeTick((t) => t + 1);
      toast.error("El nombre del producto es obligatorio.");
      return;
    }

    const payload = {
      name: name.trim(),
      groupTag,
      unitType,
      stockQty:
        isNonCountableUnit(unitType) || stockQty === ""
          ? null
          : Number(stockQty),
      stockLevel:
        isPresenceUnit(unitType) && stockLevel === "low"
          ? ("plenty" as const)
          : stockLevel,
      unitCostArs: unitCostArs === "" ? null : Number(unitCostArs),
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      if (editingIngredient) {
        const updated = await updateMut.mutateAsync({
          id: editingIngredient.id,
          patch: payload,
        });
        toast.success(`"${updated.name}" actualizado.`);
        onUpdated?.(updated);
        onClose();
      } else {
        const res = await createMut.mutateAsync(payload);
        onCreated?.(res.ingredient);
        onClose();
      }
    } catch {
      setShakeTick((t) => t + 1);
    }
  }

  const totalSteps = INGREDIENT_STEPS.length;

  return (
    <IosBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy="quick-ing-title"
      maxWidthClass={mode === "bulk" ? "max-w-2xl" : "max-w-md"}
      shakeTick={shakeTick}
    >
      {/* Top Header + Individual/Bulk Switch + Arrow Stepper */}
      <div className="border-b border-border-subtle px-4 pt-1.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="quick-ing-title"
            className="section-heading text-[18px] font-semibold text-ink sm:text-xl"
          >
            {isEditing
              ? "Editar producto"
              : mode === "bulk"
                ? "Carga masiva de ingredientes"
                : "Nuevo producto"}
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

        {/* Mode Segmented Toggle: Individual | Carga Masiva (only when creating) */}
        {!isEditing && (
          <div
            role="tablist"
            aria-label="Modo de carga de ingredientes"
            className="mt-2.5 grid grid-cols-2 gap-1 rounded-[12px] border border-border-subtle bg-canvas p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "single"}
              onClick={() => setMode("single")}
              className={`apple-press flex min-h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                mode === "single"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Individual</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "bulk"}
              onClick={() => setMode("bulk")}
              className={`apple-press flex min-h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                mode === "bulk"
                  ? "bg-accent-soft text-accent-text shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Carga Masiva</span>
            </button>
          </div>
        )}

        {mode === "single" && (
          <>
            {/* Step Navigation Bar with Left / Right Arrows */}
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
                  {INGREDIENT_STEPS[step].title}
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

            {/* Progress Dots */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              {INGREDIENT_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Ir al paso ${idx + 1}: ${s.title}`}
                  onClick={() => {
                    if (idx > 0 && !name.trim()) {
                      toast.error("Primero escribí el nombre del producto.");
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
          </>
        )}
      </div>

      {mode === "bulk" ? (
        <div className="scroll-contain flex-1 overflow-y-auto p-4 sm:p-5">
          <BulkIngredientsPanel
            existingIngredients={grimorioData?.ingredients ?? []}
            onCompleted={onClose}
            compact
          />
        </div>
      ) : (
        <>
          {/* Step Body (Strictly 1-2 fields per step) */}
          <div className="scroll-contain flex-1 overflow-y-auto p-5">
          {/* PASO 1: Nombre y Rubro (+ Nuevo rubro) */}
          {step === 0 && (
            <div key="ing-step-0" className="animate-variation-enter space-y-4">
              <div>
                <label
                  htmlFor="qi-name"
                  className="mb-1.5 block text-xs font-semibold text-ink-muted"
                >
                  1. Nombre del producto o ingrediente *
                </label>
                <input
                  id="qi-name"
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      goNext();
                    }
                  }}
                  placeholder="Ej. Romero, Cuarzo rosa, Mazo de Tarot, Vela roja..."
                  className="w-full rounded-xl border border-border-subtle bg-canvas px-3.5 py-3 text-base text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-ink-muted">
                    2. Rubro / Categoría
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddingGroup((v) => !v)}
                    className="apple-press inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-text"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Nuevo rubro</span>
                  </button>
                </div>

                {addingGroup && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent/40 bg-canvas p-2">
                    <input
                      type="text"
                      autoFocus
                      value={newGroupDraft}
                      onChange={(e) => setNewGroupDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateGroup();
                        }
                      }}
                      placeholder="Nombre del nuevo rubro..."
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-dim outline-none"
                    />
                    <button
                      type="button"
                      disabled={!newGroupDraft.trim()}
                      onClick={handleCreateGroup}
                      className="apple-press inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Crear</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {allGroups.map((tag) => {
                    const selected = groupTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectGroup(tag)}
                        className={`apple-press flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                          selected
                            ? "border-accent bg-accent-soft font-semibold text-accent-text"
                            : "border-border-subtle bg-canvas text-ink-muted hover:border-border-strong hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{tag}</span>
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

          {/* PASO 2: Unidad de Medición y Stock */}
          {step === 1 && (
            <div key="ing-step-1" className="animate-variation-enter space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                  1. ¿Cómo lo controlás?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {UNIT_OPTIONS.map((u) => {
                    const selected = unitType === u.value;
                    const isPresenceOpt = u.value === "presence";
                    return (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => handleSelectUnit(u.value)}
                        className={`apple-press flex min-h-10 items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-medium ${
                          isPresenceOpt ? "col-span-2" : ""
                        } ${
                          selected
                            ? "border-accent bg-accent-soft font-semibold text-accent-text"
                            : "border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block truncate">{u.label}</span>
                          {u.hint && (
                            <span className="mt-0.5 block text-[11px] font-normal text-ink-dim">
                              {u.hint}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isPresenceUnit(unitType) ? (
                <div className="rounded-2xl border border-border-subtle bg-canvas p-3.5">
                  <label className="mb-1 block text-xs font-semibold text-ink-muted">
                    2. ¿Lo tenés en tu alacena / altar?
                  </label>
                  <p className="mb-2.5 text-[11px] text-ink-dim">
                    Este elemento no es contable ni se gasta al realizar un hechizo.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: "plenty", label: "Sí, lo tengo" },
                        { value: "out", label: "No lo tengo" },
                      ] as const
                    ).map((opt) => {
                      const active =
                        opt.value === "out"
                          ? stockLevel === "out"
                          : stockLevel !== "out";
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStockLevel(opt.value)}
                          className={`apple-press flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                            active
                              ? opt.value === "out"
                                ? "border-danger bg-danger-soft text-danger"
                                : "border-ready bg-ready-soft text-ready"
                              : "border-border-subtle bg-surface text-ink-muted"
                          }`}
                        >
                          {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : unitType !== "qualitative" ? (
                <div className="rounded-2xl border border-border-subtle bg-canvas p-3.5">
                  <label
                    htmlFor="qi-qty"
                    className="mb-2 block text-xs font-semibold text-ink-muted"
                  >
                    2. Stock disponible ahora ({unitType})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stepQuantity(-1)}
                      aria-label="Restar cantidad"
                      className="apple-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-ink hover:border-accent"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <input
                      id="qi-qty"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={stockQty}
                      onChange={(e) => {
                        setStockQty(e.target.value);
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          setStockLevel(val === 0 ? "out" : "plenty");
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-border-subtle bg-surface px-3 text-center tabular-nums text-base font-semibold text-ink outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => stepQuantity(1)}
                      aria-label="Sumar cantidad"
                      className="apple-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-ink hover:border-accent"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                    2. Disponibilidad actual (a ojo)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: "plenty", label: "Tengo" },
                        { value: "low", label: "Poco" },
                        { value: "out", label: "Sin stock" },
                      ] as const
                    ).map((opt) => {
                      const active = stockLevel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStockLevel(opt.value)}
                          className={`apple-press min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold ${
                            active
                              ? "border-accent bg-accent-soft text-accent-text"
                              : "border-border-subtle bg-canvas text-ink-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Costo Unitario (1 campo opcional) */}
          {step === 2 && (
            <div key="ing-step-2" className="animate-variation-enter space-y-3">
              <div className="rounded-2xl border border-border-subtle bg-canvas p-4">
                <label
                  htmlFor="qi-cost"
                  className="mb-1.5 block text-xs font-semibold text-ink-muted"
                >
                  {isPresenceUnit(unitType)
                    ? "Costo por uso en ARS (opcional, no suele aplicar)"
                    : `Costo unitario en ARS por ${
                        unitType === "qualitative" ? "uso" : unitType
                      } (opcional)`}
                </label>
                <p className="mb-3 text-xs text-ink-dim">
                  {isPresenceUnit(unitType)
                    ? "Como es un elemento permanente (cristal, mazo o herramienta) que no se consume en el hechizo, podés dejarlo vacío y tocar Guardar directamente."
                    : "Sirve para calcular automáticamente el costo de materiales de cada hechizo. Si no lo tenés ahora, tocá Guardar directamente."}
                </p>
                <input
                  id="qi-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  autoFocus
                  value={unitCostArs}
                  onChange={(e) => setUnitCostArs(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveIngredient();
                    }
                  }}
                  placeholder="Ej. 500"
                  className="w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-3 tabular-nums text-base font-semibold text-ink placeholder:text-ink-dim outline-none focus:border-accent"
                />
              </div>

              <div className="rounded-2xl border border-border-subtle bg-canvas p-4">
                <label
                  htmlFor="qi-notes"
                  className="mb-1.5 block text-xs font-semibold text-ink-muted"
                >
                  Notas / Detalles (opcional)
                </label>
                <textarea
                  id="qi-notes"
                  rows={2}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Proveedor, tipo de mazo, dónde lo guardás..."
                  className="w-full resize-none rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-accent"
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
            disabled={isSaving || !name.trim()}
            onClick={saveIngredient}
            className="apple-press inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-45"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSaving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Guardar"}
            </span>
          </button>
        </div>
        </>
      )}
    </IosBottomSheet>
  );
}
