"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Layers,
  Package,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BulkIngredientsPanel } from "@/components/BulkIngredientsPanel";
import { BulkSpellsPanel } from "@/components/BulkSpellsPanel";
import { QuickIngredientModal } from "@/components/QuickIngredientModal";
import { SpellFormModal } from "@/components/SpellFormModal";
import { useGrimorio } from "@/hooks/useGrimorioData";

export default function CargaMasivaPage() {
  const { data } = useGrimorio();
  const [activeEntity, setActiveEntity] = useState<"ingredients" | "spells">(
    "ingredients"
  );
  const [singleIngOpen, setSingleIngOpen] = useState(false);
  const [singleSpellOpen, setSingleSpellOpen] = useState(false);

  return (
    <AppShell>
      {/* Top Header */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h1 className="display-heading text-[28px] font-bold tracking-[-0.02em] text-ink sm:text-4xl">
            Carga Masiva
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted sm:text-sm">
            Pegá listas desde WhatsApp o Notas y cargá múltiples ingredientes o
            hechizos de una sola vez
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeEntity === "ingredients" ? (
            <button
              type="button"
              onClick={() => setSingleIngOpen(true)}
              className="apple-press hit-44 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:border-border-strong sm:min-h-11 sm:px-4 sm:text-sm"
            >
              <Plus className="h-4 w-4 text-accent-text" aria-hidden="true" />
              <span>Carga individual</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSingleSpellOpen(true)}
              className="apple-press hit-44 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-border-subtle bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:border-border-strong sm:min-h-11 sm:px-4 sm:text-sm"
            >
              <Plus className="h-4 w-4 text-accent-text" aria-hidden="true" />
              <span>Carga individual</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Entity Selector Tabs: Ingredientes (Alacena) | Hechizos (Grimorio) */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[16px] border border-border-subtle bg-surface p-1.5">
        <button
          type="button"
          onClick={() => setActiveEntity("ingredients")}
          className={`apple-press flex min-h-12 items-center justify-center gap-2 rounded-[11px] px-3 py-2.5 text-xs font-semibold sm:text-sm ${
            activeEntity === "ingredients"
              ? "bg-accent text-on-accent"
              : "text-ink-muted hover:bg-surface-elevated hover:text-ink"
          }`}
        >
          <Package className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ingredientes (Alacena)</span>
          {data && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                activeEntity === "ingredients"
                  ? "bg-white/20 text-on-accent"
                  : "bg-surface-elevated text-ink-dim"
              }`}
            >
              {data.ingredients.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveEntity("spells")}
          className={`apple-press flex min-h-12 items-center justify-center gap-2 rounded-[11px] px-3 py-2.5 text-xs font-semibold sm:text-sm ${
            activeEntity === "spells"
              ? "bg-accent text-on-accent"
              : "text-ink-muted hover:bg-surface-elevated hover:text-ink"
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Hechizos + Receta</span>
          {data && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                activeEntity === "spells"
                  ? "bg-white/20 text-on-accent"
                  : "bg-surface-elevated text-ink-dim"
              }`}
            >
              {data.spells.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Panel */}
      {activeEntity === "ingredients" ? (
        <section aria-label="Carga masiva de ingredientes" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-border-subtle bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-text">
                <Layers className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Carga inteligente de Alacena
                </h2>
                <p className="text-xs text-ink-muted">
                  Si un ingrediente ya existe, suma al stock actual o actualiza su
                  costo sin duplicar registros.
                </p>
              </div>
            </div>

            <Link
              href="/stock"
              className="apple-press text-xs font-semibold text-accent-text hover:underline"
            >
              Ir a Alacena →
            </Link>
          </div>

          <BulkIngredientsPanel
            existingIngredients={data?.ingredients ?? []}
          />
        </section>
      ) : (
        <section aria-label="Carga masiva de hechizos" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-border-subtle bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-text">
                <Layers className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Carga inteligente de Hechizos con Receta Base
                </h2>
                <p className="text-xs text-ink-muted">
                  Crea cada hechizo con su categoría, precios ARS/USD, energías y
                  receta base (creando los ingredientes que falten).
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="apple-press text-xs font-semibold text-accent-text hover:underline"
            >
              Ir a Mis Hechizos →
            </Link>
          </div>

          <BulkSpellsPanel
            categories={data?.categories ?? []}
            existingIngredients={data?.ingredients ?? []}
          />
        </section>
      )}

      <QuickIngredientModal
        open={singleIngOpen}
        initialMode="single"
        onClose={() => setSingleIngOpen(false)}
      />

      <SpellFormModal
        open={singleSpellOpen}
        initialMode="single"
        categories={data?.categories ?? []}
        onClose={() => setSingleSpellOpen(false)}
      />
    </AppShell>
  );
}
