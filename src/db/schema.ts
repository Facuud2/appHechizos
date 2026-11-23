import {
  pgTable,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export type UnitType =
  | "g"
  | "ml"
  | "unit"
  | "tbsp"
  | "branch"
  | "pinch"
  | "qualitative";

export type StockLevel = "plenty" | "low" | "out";
export type MediaType = "image" | "video";

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  publicIntro: text("public_intro"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const ingredients = pgTable(
  "ingredients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    groupTag: text("group_tag").notNull().default("General"),
    unitType: text("unit_type").$type<UnitType>().notNull().default("unit"),
    stockQty: doublePrecision("stock_qty"),
    lowThreshold: doublePrecision("low_threshold"),
    stockLevel: text("stock_level").$type<StockLevel>().notNull().default("plenty"),
    unitCostArs: doublePrecision("unit_cost_ars"),
    unitCostUsd: doublePrecision("unit_cost_usd"),
    imageKey: text("image_key"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ingredients_normalized_name_idx").on(t.normalizedName)]
);

export const spells = pgTable(
  "spells",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    subtitleTag: text("subtitle_tag"),
    purpose: text("purpose"),
    energyTypes: jsonb("energy_types").$type<string[]>().notNull().default([]),
    publicDescription: text("public_description"),
    privateNotes: text("private_notes"),
    imageKey: text("image_key"),
    isPublished: boolean("is_published").notNull().default(false),
    isOffer: boolean("is_offer").notNull().default(false),
    offerLabel: text("offer_label").default("¡OFERTA!"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("spells_category_idx").on(t.categoryId),
    index("spells_published_idx").on(t.isPublished),
  ]
);

export const spellPriceTiers = pgTable(
  "spell_price_tiers",
  {
    id: text("id").primaryKey(),
    spellId: text("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    priceArs: doublePrecision("price_ars").notNull(),
    priceUsd: doublePrecision("price_usd").notNull(),
    regularPriceArs: doublePrecision("regular_price_ars"),
    regularPriceUsd: doublePrecision("regular_price_usd"),
    discountPercent: integer("discount_percent"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("spell_price_tiers_spell_idx").on(t.spellId)]
);

export const spellVariations = pgTable(
  "spell_variations",
  {
    id: text("id").primaryKey(),
    spellId: text("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isBase: boolean("is_base").notNull().default(false),
    clientContext: text("client_context"),
    priceOverrideArs: doublePrecision("price_override_ars"),
    priceOverrideUsd: doublePrecision("price_override_usd"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("spell_variations_spell_idx").on(t.spellId)]
);

export const variationIngredients = pgTable(
  "variation_ingredients",
  {
    id: text("id").primaryKey(),
    variationId: text("variation_id")
      .notNull()
      .references(() => spellVariations.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: doublePrecision("quantity"),
    unit: text("unit").$type<UnitType>().notNull().default("unit"),
    isOptional: boolean("is_optional").notNull().default(false),
    substitutionNote: text("substitution_note"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("variation_ingredients_variation_idx").on(t.variationId),
    index("variation_ingredients_ingredient_idx").on(t.ingredientId),
  ]
);

export const variationSteps = pgTable(
  "variation_steps",
  {
    id: text("id").primaryKey(),
    variationId: text("variation_id")
      .notNull()
      .references(() => spellVariations.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    title: text("title"),
    instruction: text("instruction").notNull(),
    durationMinutes: integer("duration_minutes"),
  },
  (t) => [index("variation_steps_variation_idx").on(t.variationId)]
);

export const stepMedia = pgTable(
  "step_media",
  {
    id: text("id").primaryKey(),
    stepId: text("step_id")
      .notNull()
      .references(() => variationSteps.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("step_media_step_idx").on(t.stepId)]
);

export const ritualLogs = pgTable(
  "ritual_logs",
  {
    id: text("id").primaryKey(),
    spellId: text("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    variationId: text("variation_id").references(() => spellVariations.id, {
      onDelete: "set null",
    }),
    performedAt: timestamp("performed_at").notNull().defaultNow(),
    clientAlias: text("client_alias"),
    stockDeducted: boolean("stock_deducted").notNull().default(false),
    estimatedCostArs: doublePrecision("estimated_cost_ars"),
    chargedArs: doublePrecision("charged_ars"),
    notes: text("notes"),
  },
  (t) => [index("ritual_logs_spell_idx").on(t.spellId)]
);
