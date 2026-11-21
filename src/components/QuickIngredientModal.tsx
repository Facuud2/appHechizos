"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateIngredient } from "@/hooks/useGrimorioData";
import type { IngredientItem } from "@/types/app";
import type { StockLevel, UnitType } from "@/db/schema";

const DEFAULT_GROUP_TAGS = [
  "Hierbas",
  "Velas",
  "Insumos",
  "Aceites",
  "Cristales",
  "Inciensos",
  "Otros",
];

const DEFAULT_UNIT_BY_GROUP: Record<string, UnitType> = {
  Hierbas: "g",
  Velas: "unit",
  Insumos: "unit",
  Aceites: "ml",
  Cristales: "unit",
  Inciensos: "unit",
  Otros: "unit",
};

const DEFAULT_QTY_BY_UNIT: Record<UnitType, string> = {
  unit: "5",
  g: "50",
  ml: "30",
  branch: "5",
  tbsp: "10",
  pinch: "10",
  qualitative: "",
};

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
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
  { id: 2, title: "Costo Unitario" },
] as const;

export function QuickIngredientModal({
  open,
  initialName = "",
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated?: (ingredient: IngredientItem) => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [groupTag, setGroupTag] = useState("Hierbas");
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupDraft, setNewGroupDraft] = useState("");

  const [unitType, setUnitType] = useState<UnitType>("g");
  const [stockQty, setStockQty] = useState("50");
  const [stockLevel, setStockLevel] = useState<StockLevel>("plenty");
  const [unitCostArs, setUnitCostArs] = useState("");
  const createMut = useCreateIngredient();

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName(initialName);
    setGroupTag("Hierbas");
    setAddingGroup(false);
    setNewGroupDraft("");
    setUnitType("g");
    setStockQty("50");
    setStockLevel("plenty");
    setUnitCostArs("");
  }, [open, initialName]);

  if (!open) return null;

  const allGroups = Array.from(new Set([...DEFAULT_GROUP_TAGS, ...customGroups]));

  function handleSelectGroup(tag: string) {
    setGroupTag(tag);
    const suggestedUnit = DEFAULT_UNIT_BY_GROUP[tag] ?? "unit";
    setUnitType(suggestedUnit);
    setStockQty(DEFAULT_QTY_BY_UNIT[suggestedUnit]);
  }

  function handleCreateGroup() {
    const clean = newGroupDraft.trim();
    if (!clean) return;
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
    if (nextUnit !== "qualitative" && (!stockQty || stockQty === "0")) {
      setStockQty(DEFAULT_QTY_BY_UNIT[nextUnit]);
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
      toast.error("Escribí el nombre del producto antes de avanzar.");
      return;
    }
    setStep((s) => Math.min(INGREDIENT_STEPS.length - 1, s + 1));
  }

  async function saveIngredient() {
    if (!name.trim()) {
      setStep(0);
      toast.error("El nombre del producto es obligatorio.");
      return;
    }

    const res = await createMut.mutateAsync({
      name: name.trim(),
      groupTag,
      unitType,
      stockQty:
        unitType === "qualitative" || stockQty === ""
          ? null
          : Number(stockQty),
      stockLevel,
      unitCostArs: unitCostArs === "" ? null : Number(unitCostArs),
    });

    onCreated?.(res.ingredient);
    onClose();
  }

  const totalSteps = INGREDIENT_STEPS.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-ing-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--bg-scrim)] p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-sheet-enter scroll-contain flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border-subtle bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header + Arrow Stepper */}
        <div className="border-b border-border-subtle px-5 pt-4 pb-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="quick-ing-title"
              className="section-heading text-xl font-semibold text-ink"
            >
              Nuevo producto
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="apple-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-elevated hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Step Navigation Bar with Left / Right Arrows (Flechitas) */}
          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-canvas p-1.5">
            <button
              type="button"
              disabled={step === 0}
              onClick={goPrev}
              aria-label="Paso anterior"
              className="apple-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-ink hover:border-accent disabled:opacity-30"
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
              className="apple-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-ink hover:border-accent disabled:opacity-30"
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
        </div>

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
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      goNext();
                    }
                  }}
                  placeholder="Ej. Romero, Vela roja, Miel pura..."
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
                  1. ¿Cómo lo medís?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {UNIT_OPTIONS.map((u) => {
                    const selected = unitType === u.value;
                    return (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => handleSelectUnit(u.value)}
                        className={`apple-press flex min-h-10 items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                          selected
                            ? "border-accent bg-accent-soft font-semibold text-accent-text"
                            : "border-border-subtle bg-canvas text-ink-muted hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{u.label}</span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {unitType !== "qualitative" ? (
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
                    2. Disponibilidad actual
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
                  Costo unitario en ARS por{" "}
                  {unitType === "qualitative" ? "uso" : unitType} (opcional)
                </label>
                <p className="mb-3 text-xs text-ink-dim">
                  Sirve para calcular automáticamente el costo de materiales de cada hechizo. Si no lo tenés ahora, tocá Guardar directamente.
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
            disabled={createMut.isPending || !name.trim()}
            onClick={saveIngredient}
            className="apple-press inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-45"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{createMut.isPending ? "Guardando..." : "Guardar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
