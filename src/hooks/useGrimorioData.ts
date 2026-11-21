"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BootstrapPayload, IngredientItem } from "@/types/app";

export const GRIMORIO_QUERY_KEY = ["grimorio-bootstrap"] as const;

async function fetchBootstrap(): Promise<BootstrapPayload> {
  const res = await fetch("/api/bootstrap", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al cargar los datos");
  }
  return res.json();
}

export function useGrimorio() {
  return useQuery({
    queryKey: GRIMORIO_QUERY_KEY,
    queryFn: fetchBootstrap,
  });
}

export function useInvalidateGrimorio() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: GRIMORIO_QUERY_KEY });
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
            ing.id === id ? { ...ing, ...patch } : ing
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
