"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeText } from "@/lib/domain/normalize";
import type { BootstrapPayload, IngredientItem } from "@/types/app";

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const GRIMORIO_QUERY_KEY = ["grimorio-bootstrap"] as const;

async function fetchBootstrap(): Promise<BootstrapPayload> {
  const res = await fetch("/api/bootstrap", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const defaultMsg =
      res.status === 401
        ? "Tu sesión expiró (401). Iniciá sesión nuevamente."
        : res.status === 403
          ? "Acceso denegado (403). Este grimorio es privado."
          : "Error al cargar los datos del grimorio.";
    throw new HttpError(err.error || defaultMsg, res.status);
  }
  return res.json();
}

export function useGrimorio() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const query = useQuery({
    queryKey: GRIMORIO_QUERY_KEY,
    queryFn: fetchBootstrap,
    retry: (failureCount, error) => {
      if (
        error instanceof HttpError &&
        (error.status === 401 || error.status === 403 || error.status === 404)
      ) {
        return false;
      }
      return failureCount < 1;
    },
  });

  if (!hydrated) {
    return {
      ...query,
      data: undefined,
      error: null,
      isLoading: true,
      isFetching: false,
      isPending: true,
    };
  }

  return query;
}

export function useInvalidateGrimorio() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      publicIntro?: string | null;
    }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudo crear la categoría");
      return data as {
        category: BootstrapPayload["categories"][number];
        alreadyExisted: boolean;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      if (data.alreadyExisted) {
        toast.info(`La categoría "${data.category.name}" ya existía.`);
      } else {
        toast.success(`Categoría "${data.category.name}" creada.`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        name: string;
        publicIntro: string | null;
        sortOrder: number;
      }>;
    }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudo actualizar la categoría");
      return data.category as BootstrapPayload["categories"][number];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      toast.success("Categoría actualizada.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudo eliminar la categoría");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      toast.success("Categoría eliminada.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      groupTag?: string;
      unitType?: IngredientItem["unitType"];
      stockQty?: number | null;
      lowThreshold?: number | null;
      stockLevel?: IngredientItem["stockLevel"];
      unitCostArs?: number | null;
      unitCostUsd?: number | null;
      notes?: string | null;
    }) => {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el ingrediente");
      return data as { ingredient: IngredientItem; alreadyExisted: boolean };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      if (data.alreadyExisted) {
        toast.info(`"${data.ingredient.name}" ya existía en tu stock.`);
      } else {
        toast.success(`"${data.ingredient.name}" agregado al stock.`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        name: string;
        groupTag: string;
        unitType: IngredientItem["unitType"];
        stockQty: number | null;
        lowThreshold: number | null;
        stockLevel: IngredientItem["stockLevel"];
        unitCostArs: number | null;
        unitCostUsd: number | null;
        notes: string | null;
      }>;
    }) => {
      const res = await fetch(`/api/ingredients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar stock");
      return data.ingredient as IngredientItem;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: GRIMORIO_QUERY_KEY });
      const prev = qc.getQueryData<BootstrapPayload>(GRIMORIO_QUERY_KEY);
      if (prev) {
        qc.setQueryData<BootstrapPayload>(GRIMORIO_QUERY_KEY, {
          ...prev,
          ingredients: prev.ingredients.map((ing) =>
            ing.id === id
              ? {
                  ...ing,
                  ...patch,
                  ...(patch.name !== undefined
                    ? { normalizedName: normalizeText(patch.name) }
                    : {}),
                }
              : ing
          ),
        });
      }
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(GRIMORIO_QUERY_KEY, ctx.prev);
      toast.error(err.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
    },
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      toast.success("Ingrediente eliminado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePerformVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variationId,
      deductStock,
      clientAlias,
      chargedArs,
      notes,
    }: {
      variationId: string;
      deductStock: boolean;
      clientAlias?: string | null;
      chargedArs?: number | null;
      notes?: string | null;
    }) => {
      const res = await fetch(`/api/variations/${variationId}/perform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductStock, clientAlias, chargedArs, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar el ritual");
      return data as { id: string; deductedCount: number; estimatedCostArs: number };
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      if (vars.deductStock && data.deductedCount > 0) {
        toast.success(
          `Ritual registrado · Se descontaron ${data.deductedCount} ingredientes del stock.`
        );
      } else {
        toast.success("Ritual registrado en tu historial.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkCreateIngredients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      items: {
        name: string;
        groupTag: string;
        unitType: IngredientItem["unitType"];
        stockQty: number | null;
        stockLevel: IngredientItem["stockLevel"];
        unitCostArs: number | null;
        duplicateAction: "add_stock" | "overwrite" | "skip";
      }[];
    }) => {
      const res = await fetch("/api/ingredients/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo realizar la carga masiva");
      }
      return data as {
        createdCount: number;
        updatedCount: number;
        skippedCount: number;
        ingredients: IngredientItem[];
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      const parts: string[] = [];
      if (data.createdCount > 0) {
        parts.push(
          `${data.createdCount} ${
            data.createdCount === 1 ? "nuevo" : "nuevos"
          }`
        );
      }
      if (data.updatedCount > 0) {
        parts.push(
          `${data.updatedCount} ${
            data.updatedCount === 1 ? "actualizado" : "actualizados"
          }`
        );
      }
      if (data.skippedCount > 0) {
        parts.push(`${data.skippedCount} omitidos`);
      }
      toast.success(
        `Alacena actualizada · ${parts.join(", ") || "Cambios guardados"}.`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkCreateSpells() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      items: {
        title: string;
        categoryId: string | null;
        categoryName?: string;
        purpose?: string | null;
        energyTypes: string[];
        isPublished: boolean;
        priceArs: number;
        priceUsd: number;
        ingredients: {
          name: string;
          quantity: number | null;
          unit: IngredientItem["unitType"];
          groupTag?: string;
          isOptional?: boolean;
        }[];
      }[];
    }) => {
      const res = await fetch("/api/spells/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "No se pudo realizar la carga masiva de hechizos"
        );
      }
      return data as {
        createdSpellsCount: number;
        autoCreatedIngredientsCount: number;
        autoCreatedCategoriesCount: number;
        spellIds: string[];
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
      const extra =
        data.autoCreatedIngredientsCount > 0
          ? ` (+${data.autoCreatedIngredientsCount} ingredientes nuevos en Alacena)`
          : "";
      toast.success(
        `${data.createdSpellsCount} ${
          data.createdSpellsCount === 1
            ? "hechizo creado"
            : "hechizos creados"
        }${extra}.`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
