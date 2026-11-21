"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  Globe,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useInvalidateGrimorio } from "@/hooks/useGrimorioData";
import { formatDualPrice } from "@/lib/format";
import type { SpellItem } from "@/types/app";

export function PublishNetlifyModal({
  open,
  spells,
  onClose,
}: {
  open: boolean;
  spells: SpellItem[];
  onClose: () => void;
}) {
  const invalidate = useInvalidateGrimorio();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(spells.filter((s) => s.isPublished).map((s) => s.id));
    }
  }, [open, spells]);

  if (!open) return null;

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

  async function handlePublish() {
    setPublishing(true);
    try {
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-netlify-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--bg-scrim)] p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-sheet-enter pb-sheet-safe scroll-contain flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border-subtle bg-surface p-5 sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="publish-netlify-title"
                className="section-heading text-xl font-semibold text-ink"
              >
                Subir a tarotdeluna.netlify.app
              </h2>
              <p className="text-xs text-ink-muted">
                Elegí qué hechizos se ven en tu catálogo público (nunca muestra
                ingredientes ni costos).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="apple-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-elevated hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Select all bar */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5 text-xs">
          <span className="font-medium text-ink-muted tabular-nums">
            <strong className="text-ink">{selectedIds.length}</strong> de{" "}
            {spells.length} seleccionados para publicar
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="font-semibold text-accent-text hover:underline"
          >
            {allSelected ? "Desmarcar todos" : "Seleccionar todos"}
          </button>
        </div>

        {/* Spell checklist */}
        <div className="scroll-contain flex-1 space-y-2 overflow-y-auto pr-0.5">
          {spells.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              Todavía no creaste ningún hechizo.
            </p>
          ) : (
            spells.map((spell) => {
              const checked = selectedIds.includes(spell.id);
              return (
                <button
                  key={spell.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleSpell(spell.id)}
                  className={`apple-press flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left ${
                    checked
                      ? "border-info/50 bg-info-soft/45"
                      : "border-border-subtle bg-canvas hover:border-border-strong"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                        checked
                          ? "border-info bg-info text-white"
                          : "border-border-strong bg-surface"
                      }`}
                    >
                      {checked && (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
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
                  </div>

                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      checked
                        ? "bg-info-soft text-info"
                        : "bg-surface-elevated text-ink-dim"
                    }`}
                  >
                    {checked ? "Público" : "Privado"}
                  </span>
                </button>
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
    </div>
  );
}
