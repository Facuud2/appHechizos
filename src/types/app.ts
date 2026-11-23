import type { MediaType, StockLevel, UnitType } from "@/db/schema";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  publicIntro: string | null;
  sortOrder: number;
}

export interface IngredientItem {
  id: string;
  name: string;
  normalizedName: string;
  groupTag: string;
  unitType: UnitType;
  stockQty: number | null;
  lowThreshold: number | null;
  stockLevel: StockLevel;
  unitCostArs: number | null;
  unitCostUsd: number | null;
  imageKey: string | null;
  imageUrl: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface PriceTierItem {
  id: string;
  spellId: string;
  label: string;
  priceArs: number;
  priceUsd: number;
  regularPriceArs: number | null;
  regularPriceUsd: number | null;
  discountPercent: number | null;
  sortOrder: number;
}

export interface VariationIngredientItem {
  id: string;
  variationId: string;
  ingredientId: string;
  quantity: number | null;
  unit: UnitType;
  isOptional: boolean;
  substitutionNote: string | null;
  sortOrder: number;
}

export interface StepMediaItem {
  id: string;
  stepId: string;
  storageKey: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  sortOrder: number;
  signedUrl: string | null;
}

export interface VariationStepItem {
  id: string;
  variationId: string;
  stepNumber: number;
  title: string | null;
  instruction: string;
  durationMinutes: number | null;
  media: StepMediaItem[];
}

export interface SpellVariationItem {
  id: string;
  spellId: string;
  name: string;
  isBase: boolean;
  clientContext: string | null;
  priceOverrideArs: number | null;
  priceOverrideUsd: number | null;
  notes: string | null;
  sortOrder: number;
  ingredients: VariationIngredientItem[];
  steps: VariationStepItem[];
}

export interface SpellItem {
  id: string;
  categoryId: string | null;
  title: string;
  subtitleTag: string | null;
  purpose: string | null;
  energyTypes: string[];
  publicDescription: string | null;
  privateNotes: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  isOffer: boolean;
  offerLabel: string | null;
  sortOrder: number;
  updatedAt: string;
  priceTiers: PriceTierItem[];
  variations: SpellVariationItem[];
}

export interface RitualLogItem {
  id: string;
  spellId: string;
  variationId: string | null;
  performedAt: string;
  clientAlias: string | null;
  stockDeducted: boolean;
  estimatedCostArs: number | null;
  chargedArs: number | null;
  notes: string | null;
}

export interface BootstrapPayload {
  categories: CategoryItem[];
  ingredients: IngredientItem[];
  spells: SpellItem[];
  ritualLogs: RitualLogItem[];
  syncedAt: string;
}

export const UNIT_LABELS: Record<UnitType, string> = {
  g: "g",
  ml: "ml",
  unit: "u.",
  tbsp: "cdas",
  branch: "ramas",
  pinch: "pizca",
  qualitative: "a ojo",
  presence: "existencia",
};
