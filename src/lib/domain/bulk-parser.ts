import type { StockLevel, UnitType } from "@/db/schema";
import type { CategoryItem, IngredientItem } from "@/types/app";
import { normalizeText } from "./normalize";

export interface ParsedBulkIngredientDraft {
  id: string;
  rawLine: string;
  name: string;
  normalizedName: string;
  groupTag: string;
  unitType: UnitType;
  stockQty: number | null;
  stockLevel: StockLevel;
  unitCostArs: number | null;
  /** If an existing ingredient in inventory matches normalizedName */
  existingIngredientId: string | null;
  existingStockQty: number | null;
  existingUnitCostArs: number | null;
  /** Action when duplicate is detected: 'add_stock' | 'overwrite' | 'skip' */
  duplicateAction: "add_stock" | "overwrite" | "skip";
}

export interface ParsedRecipeIngredientDraft {
  id: string;
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: UnitType;
  groupTag: string;
  existingIngredientId: string | null;
}

export interface ParsedBulkSpellDraft {
  id: string;
  rawBlock: string;
  title: string;
  categoryId: string | null;
  categoryName: string;
  priceArs: number;
  priceUsd: number;
  energyTypes: string[];
  purpose: string;
  isPublished: boolean;
  ingredients: ParsedRecipeIngredientDraft[];
}

const KNOWN_ENERGIES = [
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
  "Endulzamiento",
  "Destrabe",
  "Abundancia",
  "Dinero",
];

/**
 * Infers the best groupTag and default UnitType from an ingredient name in Spanish.
 */
export function inferGroupAndUnit(name: string): {
  groupTag: string;
  unitType: UnitType;
  defaultQty: number | null;
} {
  const n = normalizeText(name);

  if (/\b(velon|vela|velita|cirio)s?\b/.test(n)) {
    return { groupTag: "Velas", unitType: "unit", defaultQty: 5 };
  }
  if (
    /\b(aceite|esencia|agua florida|locion|perfume|extracto|tintura|miel|vinagre)\b/.test(
      n
    )
  ) {
    return { groupTag: "Aceites", unitType: "ml", defaultQty: 30 };
  }
  if (
    /\b(cuarzo|piedra|iman|pirita|turmalina|amatista|citrino|selenita|obsidiana|cristal|jade|agata)\b/.test(
      n
    )
  ) {
    return { groupTag: "Cristales", unitType: "unit", defaultQty: 3 };
  }
  if (/\b(sahumerio|incienso|carbon|mirra|copal|benjui|palo santo|resina)s?\b/.test(n)) {
    return {
      groupTag: "Inciensos",
      unitType: /\b(resina|mirra|copal|benjui)\b/.test(n) ? "g" : "unit",
      defaultQty: /\b(resina|mirra|copal|benjui)\b/.test(n) ? 30 : 10,
    };
  }
  if (
    /\b(romero|ruda|laurel|canela|lavanda|manzanilla|albahaca|anis|clavo|rosa|petalo|hierba|salvia|menta|eucalipto|pimienta|cafe|calendula|artemisa|tomillo|oregano)s?\b/.test(
      n
    )
  ) {
    if (/\b(rama)s?\b/.test(n)) {
      return { groupTag: "Hierbas", unitType: "branch", defaultQty: 5 };
    }
    if (/\b(hoja|estrella)s?\b/.test(n)) {
      return { groupTag: "Hierbas", unitType: "unit", defaultQty: 10 };
    }
    return { groupTag: "Hierbas", unitType: "g", defaultQty: 50 };
  }
  if (
    /\b(frasco|plato|papel|hilo|cinta|alfiler|moneda|vaso|bolsa|azucar|sal|arroz|lenteja|agua)s?\b/.test(
      n
    )
  ) {
    const isWeight = /\b(azucar|sal|arroz|lenteja)s?\b/.test(n);
    return {
      groupTag: "Insumos",
      unitType: isWeight ? "g" : "unit",
      defaultQty: isWeight ? 100 : 5,
    };
  }

  return { groupTag: "Hierbas", unitType: "unit", defaultQty: 5 };
}

function parseLocalizedNumber(raw: string): number | null {
  const clean = raw.trim().replace(/\s+/g, "");
  if (!clean) return null;
  // Handle Argentine thousands dot vs decimal comma:
  // If it has dot followed by 3 digits at end (e.g. 30.000), remove dot.
  let normalized = clean;
  if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  } else if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function mapUnitToken(token: string): UnitType | null {
  const t = normalizeText(token).replace(/\./g, "");
  if (["g", "gr", "grs", "gramo", "gramos"].includes(t)) return "g";
  if (["kg", "kilo", "kilos"].includes(t)) return "g";
  if (["ml", "cc", "mililitro", "mililitros"].includes(t)) return "ml";
  if (["l", "lt", "litro", "litros"].includes(t)) return "ml";
  if (
    [
      "u",
      "un",
      "und",
      "unid",
      "unidad",
      "unidades",
      "vela",
      "velas",
      "velon",
      "velones",
    ].includes(t)
  ) {
    return "unit";
  }
  if (["cda", "cdas", "cucharada", "cucharadas", "cucharadita"].includes(t)) {
    return "tbsp";
  }
  if (["rama", "ramas", "ramita", "ramitas", "atado", "atados"].includes(t)) {
    return "branch";
  }
  if (["pizca", "pizcas", "pizquita"].includes(t)) return "pinch";
  if (["ojo", "aojo", "cualitativo"].includes(t)) return "qualitative";
  return null;
}

/**
 * Parses a single line or segment of free text into a structured ingredient draft.
 * Examples:
 * - "Romero 50g $500"
 * - "Vela roja 10u $800 [Velas]"
 * - "Miel pura | 250 ml | $1200 | Insumos"
 * - "3x Cuarzo rosa $1500"
 * - "Sal gruesa sin stock"
 */
export function parseSingleIngredientLine(
  rawLine: string,
  existingMap: Map<string, IngredientItem>,
  idx = 0
): ParsedBulkIngredientDraft | null {
  let working = rawLine
    .trim()
    .replace(/^[-*•+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();

  if (!working) return null;

  let explicitGroup: string | null = null;
  let explicitCostArs: number | null = null;
  let explicitQty: number | null = null;
  let explicitUnit: UnitType | null = null;
  let isOut = false;

  // Check if "sin stock" or "agotado" is mentioned
  if (/\b(sin\s+stock|agotad[oa])\b/i.test(working)) {
    isOut = true;
    working = working.replace(/\b(sin\s+stock|agotad[oa])\b/gi, " ").trim();
  }

  // Extract bracketed group tag e.g. [Hierbas] or (Velas) at end
  const bracketGroupMatch = working.match(/\[([^\]]+)\]\s*$/);
  if (bracketGroupMatch) {
    explicitGroup = bracketGroupMatch[1].trim();
    working = working.slice(0, bracketGroupMatch.index).trim();
  }

  // Extract cost: $500, $ 1.200, ARS 500, 500 ars, 500$
  const costMatch =
    working.match(/(?:\$|ars)\s*(\d+(?:[.,]\d+)?)/i) ??
    working.match(/\b(\d+(?:[.,]\d+)?)\s*(?:\$|ars|pesos)\b/i);
  if (costMatch) {
    explicitCostArs = parseLocalizedNumber(costMatch[1]);
    working = working.replace(costMatch[0], " ").trim();
  }

  // Check if pipe or semicolon separated: Name | 50g | Hierbas
  if (working.includes("|")) {
    const parts = working
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 1) {
      working = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const qtyUnit = part.match(
          /^(\d+(?:[.,]\d+)?)\s*(g|gr|grs|gramos?|kg|ml|cc|l|lt|u\.?|unid(?:ades)?|cdas?|cucharadas?|ramas?|pizcas?)?$/i
        );
        if (qtyUnit && explicitQty === null) {
          let val = parseLocalizedNumber(qtyUnit[1]);
          const uRaw = qtyUnit[2] || "u";
          if (val !== null && /^kg$/i.test(uRaw)) val *= 1000;
          if (val !== null && /^l|lt$/i.test(uRaw)) val *= 1000;
          explicitQty = val;
          explicitUnit = mapUnitToken(uRaw) ?? "unit";
        } else if (!explicitGroup && /^[a-záéíóúñ\s]+$/i.test(part)) {
          explicitGroup = part;
        }
      }
    }
  }

  // Check leading multiplier: "10x Vela roja" or "50g de Romero" or "2 ramas de Romero"
  const leadingQtyUnit = working.match(
    /^(\d+(?:[.,]\d+)?)\s*(x|g|gr|grs|gramos?|kg|ml|cc|u\.?|un|und|unid(?:ades)?|cdas?|cucharadas?|ramas?|pizcas?)\s+(?:de\s+)?(.+)$/i
  );
  if (leadingQtyUnit && explicitQty === null) {
    let val = parseLocalizedNumber(leadingQtyUnit[1]);
    const uRaw = leadingQtyUnit[2].toLowerCase();
    if (val !== null && uRaw === "kg") val *= 1000;
    explicitQty = val;
    explicitUnit = uRaw === "x" ? "unit" : mapUnitToken(uRaw);
    working = leadingQtyUnit[3].trim();
  }

  // Check trailing quantity + unit: "Romero 50g", "Vela roja 10 u.", "Miel 100 ml", "Ruda 3 ramas"
  const trailingQtyUnit = working.match(
    /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(x|g|gr|grs|gramos?|kg|ml|cc|l|lt|u\.?|un|und|unid(?:ades)?|cdas?|cucharadas?|ramas?|pizcas?)\b(.*)$/i
  );
  if (trailingQtyUnit && explicitQty === null) {
    let val = parseLocalizedNumber(trailingQtyUnit[2]);
    const uRaw = trailingQtyUnit[3].toLowerCase();
    if (val !== null && uRaw === "kg") val *= 1000;
    if (val !== null && (uRaw === "l" || uRaw === "lt")) val *= 1000;
    explicitQty = val;
    explicitUnit = uRaw === "x" ? "unit" : mapUnitToken(uRaw);
    working = `${trailingQtyUnit[1]} ${trailingQtyUnit[4] ?? ""}`.trim();
  }

  // Check leading plain number: "10 Vela roja"
  const leadingPlainQty = working.match(/^(\d+(?:[.,]\d+)?)\s+(?:de\s+)?(.+)$/);
  if (leadingPlainQty && explicitQty === null) {
    explicitQty = parseLocalizedNumber(leadingPlainQty[1]);
    working = leadingPlainQty[2].trim();
  }

  // Check trailing plain number: "Vela roja 10" (only if not part of "3 o 7 días")
  const trailingPlainQty = working.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)$/);
  if (trailingPlainQty && explicitQty === null) {
    explicitQty = parseLocalizedNumber(trailingPlainQty[2]);
    working = trailingPlainQty[1].trim();
  }

  // Clean up separators at edges
  const cleanName = working
    .replace(/^[-,:;|/]+|[-,:;|/]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanName) return null;

  // Capitalize first letter nicely
  const formattedName =
    cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const normalized = normalizeText(formattedName);
  const existing = existingMap.get(normalized) ?? null;
  const inferred = inferGroupAndUnit(formattedName);

  const unitType: UnitType =
    explicitUnit ?? existing?.unitType ?? inferred.unitType;
  const groupTag = explicitGroup ?? existing?.groupTag ?? inferred.groupTag;

  let stockQty: number | null = null;
  if (unitType !== "qualitative") {
    if (isOut) {
      stockQty = 0;
    } else if (explicitQty !== null) {
      stockQty = explicitQty;
    } else {
      stockQty = inferred.defaultQty ?? 5;
    }
  }

  const stockLevel: StockLevel =
    isOut || (unitType !== "qualitative" && stockQty === 0) ? "out" : "plenty";

  return {
    id: `draft-ing-${idx}-${normalized.replace(/[^a-z0-9]/g, "")}`,
    rawLine,
    name: existing ? existing.name : formattedName,
    normalizedName: normalized,
    groupTag,
    unitType,
    stockQty,
    stockLevel,
    unitCostArs: explicitCostArs,
    existingIngredientId: existing?.id ?? null,
    existingStockQty: existing?.stockQty ?? null,
    existingUnitCostArs: existing?.unitCostArs ?? null,
    duplicateAction: "add_stock",
  };
}

/**
 * Parses multi-line or comma-separated bulk ingredient text into a deduplicated array of drafts.
 * If the same ingredient appears twice in the pasted text, their quantities are summed automatically.
 */
export function parseBulkIngredientsText(
  text: string,
  existingIngredients: IngredientItem[]
): ParsedBulkIngredientDraft[] {
  const existingMap = new Map<string, IngredientItem>();
  for (const ing of existingIngredients) {
    existingMap.set(ing.normalizedName, ing);
  }

  // Split by newlines; if a line has commas separating distinct items (and not decimal commas like 1,5), split by comma
  const rawLines = text
    .split(/\r?\n/)
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];
      // Split by comma or semicolon when not between digits (e.g. "Romero 50g $500, Vela roja 10u")
      if (trimmed.includes(";")) {
        return trimmed.split(";");
      }
      if (trimmed.includes(",") && !trimmed.includes("|")) {
        return trimmed.split(/,(?!\d)/);
      }
      return [trimmed];
    })
    .map((s) => s.trim())
    .filter(Boolean);

  const byNormalized = new Map<string, ParsedBulkIngredientDraft>();

  rawLines.forEach((line, idx) => {
    const parsed = parseSingleIngredientLine(line, existingMap, idx);
    if (!parsed) return;

    const prev = byNormalized.get(parsed.normalizedName);
    if (prev) {
      // Combine quantities if repeated in same paste
      if (
        prev.unitType !== "qualitative" &&
        prev.stockQty !== null &&
        parsed.stockQty !== null
      ) {
        prev.stockQty = Math.round((prev.stockQty + parsed.stockQty) * 100) / 100;
      }
      if (parsed.unitCostArs !== null) {
        prev.unitCostArs = parsed.unitCostArs;
      }
    } else {
      byNormalized.set(parsed.normalizedName, parsed);
    }
  });

  return Array.from(byNormalized.values());
}

/**
 * Parses a recipe ingredient token inside a spell definition, e.g. "Vela rosa 1u", "Romero 10g", "Miel 30ml"
 */
export function parseRecipeIngredientToken(
  token: string,
  existingMap: Map<string, IngredientItem>,
  idx = 0
): ParsedRecipeIngredientDraft | null {
  const single = parseSingleIngredientLine(token, existingMap, idx);
  if (!single) return null;

  // Determine whether an explicit number was present in the token
  const hasExplicitNum = /\d/.test(token);
  const inferred = inferGroupAndUnit(single.name);
  const unit: UnitType = single.unitType;
  const defaultRecipeQty: Record<UnitType, number | null> = {
    unit: 1,
    g: 10,
    ml: 10,
    branch: 1,
    tbsp: 1,
    pinch: 1,
    qualitative: null,
  };

  return {
    id: `rec-ing-${idx}-${single.normalizedName.replace(/[^a-z0-9]/g, "")}`,
    name: single.name,
    normalizedName: single.normalizedName,
    quantity:
      unit === "qualitative"
        ? null
        : hasExplicitNum
          ? single.stockQty
          : defaultRecipeQty[unit],
    unit,
    groupTag: single.groupTag || inferred.groupTag,
    existingIngredientId: single.existingIngredientId,
  };
}

function matchCategory(
  rawCat: string,
  categories: CategoryItem[]
): { id: string | null; name: string } {
  const norm = normalizeText(rawCat);
  if (!norm) {
    return {
      id: categories[0]?.id ?? null,
      name: categories[0]?.name ?? "General",
    };
  }
  const exact = categories.find(
    (c) =>
      normalizeText(c.name) === norm ||
      normalizeText(c.name).includes(norm) ||
      norm.includes(normalizeText(c.name))
  );
  if (exact) return { id: exact.id, name: exact.name };
  return { id: null, name: rawCat.trim() };
}

/**
 * Parses bulk spells text into structured spell drafts with base recipe ingredients.
 * Supports two natural formats:
 * 1) Single-line pipe/dash format:
 *    "Endulzamiento con Miel | Amor | $35000 / USD 40 | Energías: Amor, Atracción | Ingredientes: Vela rosa 1u, Miel 30ml, Canela 5g"
 *    or shorthand:
 *    "Endulzamiento Clásico | Amor | $35000 | Vela rosa 1u, Miel 30ml, Cuarzo rosa 1u"
 * 2) Multi-line block format (separated by blank lines or '---'):
 *    Hechizo: Abrecaminos Dorado
 *    Categoría: Prosperidad
 *    Precio: $42000 / USD 45
 *    Energías: Abrecaminos, Prosperidad
 *    Ingredientes: Vela amarilla 1u, Laurel 3u, Pirita 1u
 */
export function parseBulkSpellsText(
  text: string,
  categories: CategoryItem[],
  existingIngredients: IngredientItem[],
  defaultArsRate = 1000
): ParsedBulkSpellDraft[] {
  const existingMap = new Map<string, IngredientItem>();
  for (const ing of existingIngredients) {
    existingMap.set(ing.normalizedName, ing);
  }

  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Detect if user wrote multi-line labeled blocks ("Ingredientes:", "Categoría:", "Precio:")
  const hasBlockLabels = lines.some((l) =>
    /^(hechizo|nombre|categoria|categoría|precio|energias|energías|ingredientes|receta|finalidad)\s*:/i.test(
      l
    )
  );

  if (hasBlockLabels) {
    const blocks = trimmed
      .split(/\n\s*\n|^---+$/m)
      .map((b) => b.trim())
      .filter(Boolean);

    return blocks
      .map((block, bIdx) =>
        parseSpellLabeledBlock(
          block,
          bIdx,
          categories,
          existingMap,
          defaultArsRate
        )
      )
      .filter((s): s is ParsedBulkSpellDraft => s !== null);
  }

  // Otherwise parse each line as a complete spell
  return lines
    .map((line, lIdx) =>
      parseSingleLineSpell(
        line,
        lIdx,
        categories,
        existingMap,
        defaultArsRate
      )
    )
    .filter((s): s is ParsedBulkSpellDraft => s !== null);
}

function extractPricesFromText(
  text: string,
  defaultArsRate = 1000
): { priceArs: number; priceUsd: number; cleaned: string } {
  let working = text;
  let priceArs: number | null = null;
  let priceUsd: number | null = null;

  // Match USD price: "USD 35", "35 USD", "U$S 35", "US$ 35"
  const usdMatch =
    working.match(/\b(?:usd|u\$s|us\$)\s*(\d+(?:[.,]\d+)?)\b/i) ??
    working.match(/\b(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|us\$)\b/i);
  if (usdMatch) {
    priceUsd = parseLocalizedNumber(usdMatch[1]);
    working = working.replace(usdMatch[0], " ");
  }

  // Match ARS price: "$35000", "$ 35.000", "ARS 35000", "35000 ars"
  const arsMatch =
    working.match(/(?:\$|ars)\s*(\d+(?:[.,]\d+)?)/i) ??
    working.match(/\b(\d{4,}(?:[.,]\d+)?)\s*(?:\$|ars|pesos)?\b/i);
  if (arsMatch) {
    priceArs = parseLocalizedNumber(arsMatch[1]);
    working = working.replace(arsMatch[0], " ");
  }

  const finalArs = priceArs ?? 30000;
  const finalUsd =
    priceUsd ?? Math.max(1, Math.round(finalArs / defaultArsRate));

  return {
    priceArs: finalArs,
    priceUsd: finalUsd,
    cleaned: working.replace(/^[\s/|,-]+|[\s/|,-]+$/g, "").trim(),
  };
}

function inferEnergiesFromText(text: string): string[] {
  const norm = normalizeText(text);
  const found: string[] = [];
  for (const e of KNOWN_ENERGIES) {
    if (norm.includes(normalizeText(e))) {
      found.push(e);
    }
  }
  return found;
}

function parseSingleLineSpell(
  line: string,
  idx: number,
  categories: CategoryItem[],
  existingMap: Map<string, IngredientItem>,
  defaultArsRate: number
): ParsedBulkSpellDraft | null {
  const cleanLine = line
    .replace(/^[-*•+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
  if (!cleanLine) return null;

  // Split by pipe "|" if present, otherwise by " - "
  const segments = cleanLine.includes("|")
    ? cleanLine.split("|").map((s) => s.trim()).filter(Boolean)
    : cleanLine.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);

  if (segments.length === 0) return null;

  const title = segments[0].replace(/^hechizo\s*:\s*/i, "").trim();
  if (!title) return null;

  let catMatch: { id: string | null; name: string } = {
    id: categories[0]?.id ?? null,
    name: categories[0]?.name ?? "General",
  };
  let priceArs = 30000;
  let priceUsd = 34;
  let energies: string[] = [];
  let purpose = "";
  let recipeIngredients: ParsedRecipeIngredientDraft[] = [];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];

    // Explicit labeled segment: "Ingredientes: ..."
    if (/^(ingredientes?|receta|insumos?)\s*:/i.test(seg)) {
      const listStr = seg.replace(/^(ingredientes?|receta|insumos?)\s*:/i, "");
      recipeIngredients = listStr
        .split(/,|;/)
        .map((tok, tIdx) => parseRecipeIngredientToken(tok, existingMap, tIdx))
        .filter((x): x is ParsedRecipeIngredientDraft => x !== null);
      continue;
    }

    // Explicit labeled segment: "Energías: ..."
    if (/^energ[ií]as?\s*:/i.test(seg)) {
      const listStr = seg.replace(/^energ[ií]as?\s*:/i, "");
      energies = listStr
        .split(/,|;/)
        .map((e) => e.trim())
        .filter(Boolean);
      continue;
    }

    // Explicit labeled segment: "Categoría: ..."
    if (/^categor[ií]a\s*:/i.test(seg)) {
      const catStr = seg.replace(/^categor[ií]a\s*:/i, "").trim();
      catMatch = matchCategory(catStr, categories);
      continue;
    }

    // Explicit labeled segment: "Finalidad: ..."
    if (/^(finalidad|prop[oó]sito|descripci[oó]n)\s*:/i.test(seg)) {
      purpose = seg
        .replace(/^(finalidad|prop[oó]sito|descripci[oó]n)\s*:/i, "")
        .trim();
      continue;
    }

    // Price segment detection ($ or USD or pure 4+ digit number)
    if (/(?:\$|ars|usd|u\$s|\b\d{4,}\b)/i.test(seg) && !seg.includes(",")) {
      const extracted = extractPricesFromText(seg, defaultArsRate);
      priceArs = extracted.priceArs;
      priceUsd = extracted.priceUsd;
      continue;
    }

    // Comma-separated list -> either ingredients or energies
    if (seg.includes(",")) {
      const tokens = seg.split(",").map((t) => t.trim()).filter(Boolean);
      const allKnownEnergies = tokens.every((t) =>
        KNOWN_ENERGIES.some((ke) => normalizeText(ke) === normalizeText(t))
      );
      if (allKnownEnergies && energies.length === 0) {
        energies = tokens;
      } else {
        recipeIngredients = tokens
          .map((tok, tIdx) =>
            parseRecipeIngredientToken(tok, existingMap, tIdx)
          )
          .filter((x): x is ParsedRecipeIngredientDraft => x !== null);
      }
      continue;
    }

    // Single token: check if it matches a known category or energy, otherwise treat as ingredient if last segment
    const matchedCat = categories.find(
      (c) =>
        normalizeText(c.name).includes(normalizeText(seg)) ||
        normalizeText(seg).includes(normalizeText(c.name))
    );
    if (matchedCat && i === 1) {
      catMatch = { id: matchedCat.id, name: matchedCat.name };
      continue;
    }

    if (i === 1 && seg.length < 45 && !/\d/.test(seg)) {
      catMatch = matchCategory(seg, categories);
      continue;
    }

    // Treat as single ingredient
    const ing = parseRecipeIngredientToken(seg, existingMap, i);
    if (ing) recipeIngredients.push(ing);
  }

  if (energies.length === 0) {
    energies = inferEnergiesFromText(`${title} ${catMatch.name} ${purpose}`);
    if (energies.length === 0) energies = ["Armonización"];
  }

  return {
    id: `draft-spell-${idx}-${normalizeText(title).replace(/[^a-z0-9]/g, "")}`,
    rawBlock: line,
    title,
    categoryId: catMatch.id,
    categoryName: catMatch.name,
    priceArs,
    priceUsd,
    energyTypes: energies,
    purpose,
    isPublished: true,
    ingredients: recipeIngredients,
  };
}

function parseSpellLabeledBlock(
  block: string,
  idx: number,
  categories: CategoryItem[],
  existingMap: Map<string, IngredientItem>,
  defaultArsRate: number
): ParsedBulkSpellDraft | null {
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  let title = "";
  let catMatch: { id: string | null; name: string } = {
    id: categories[0]?.id ?? null,
    name: categories[0]?.name ?? "General",
  };
  let priceArs = 30000;
  let priceUsd = 34;
  let energies: string[] = [];
  let purpose = "";
  let recipeIngredients: ParsedRecipeIngredientDraft[] = [];

  for (const line of lines) {
    if (/^(hechizo|nombre|t[ií]tulo)\s*:/i.test(line)) {
      title = line.replace(/^(hechizo|nombre|t[ií]tulo)\s*:/i, "").trim();
    } else if (/^categor[ií]a\s*:/i.test(line)) {
      const rawCat = line.replace(/^categor[ií]a\s*:/i, "").trim();
      catMatch = matchCategory(rawCat, categories);
    } else if (/^precios?\s*:/i.test(line)) {
      const rawPrice = line.replace(/^precios?\s*:/i, "").trim();
      const extracted = extractPricesFromText(rawPrice, defaultArsRate);
      priceArs = extracted.priceArs;
      priceUsd = extracted.priceUsd;
    } else if (/^energ[ií]as?\s*:/i.test(line)) {
      energies = line
        .replace(/^energ[ií]as?\s*:/i, "")
        .split(/,|;/)
        .map((e) => e.trim())
        .filter(Boolean);
    } else if (/^(ingredientes?|receta|insumos?)\s*:/i.test(line)) {
      recipeIngredients = line
        .replace(/^(ingredientes?|receta|insumos?)\s*:/i, "")
        .split(/,|;/)
        .map((tok, tIdx) => parseRecipeIngredientToken(tok, existingMap, tIdx))
        .filter((x): x is ParsedRecipeIngredientDraft => x !== null);
    } else if (/^(finalidad|prop[oó]sito|descripci[oó]n)\s*:/i.test(line)) {
      purpose = line
        .replace(/^(finalidad|prop[oó]sito|descripci[oó]n)\s*:/i, "")
        .trim();
    } else if (!title) {
      title = line.replace(/^[-*•+#]+\s*/, "").trim();
    }
  }

  if (!title) return null;

  if (energies.length === 0) {
    energies = inferEnergiesFromText(`${title} ${catMatch.name} ${purpose}`);
    if (energies.length === 0) energies = ["Armonización"];
  }

  return {
    id: `draft-spell-${idx}-${normalizeText(title).replace(/[^a-z0-9]/g, "")}`,
    rawBlock: block,
    title,
    categoryId: catMatch.id,
    categoryName: catMatch.name,
    priceArs,
    priceUsd,
    energyTypes: energies,
    purpose,
    isPublished: true,
    ingredients: recipeIngredients,
  };
}
