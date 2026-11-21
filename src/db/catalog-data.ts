import type { StockLevel, UnitType } from "./schema";

export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  publicIntro: string | null;
  sortOrder: number;
}

export interface SeedIngredient {
  id: string;
  name: string;
  groupTag: string;
  unitType: UnitType;
  stockQty: number | null;
  lowThreshold: number | null;
  stockLevel: StockLevel;
  unitCostArs: number | null;
  notes?: string;
}

export interface SeedVariationIngredient {
  ingredientId: string;
  quantity: number | null;
  unit: UnitType;
  isOptional?: boolean;
  substitutionNote?: string | null;
}

export interface SeedVariationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  durationMinutes?: number | null;
}

export interface SeedVariation {
  id: string;
  name: string;
  isBase: boolean;
  clientContext?: string | null;
  notes?: string | null;
  sortOrder: number;
  ingredients: SeedVariationIngredient[];
  steps: SeedVariationStep[];
}

export interface SeedNewSpell {
  id: string;
  categoryId: string;
  title: string;
  subtitleTag: string | null;
  purpose: string;
  energyTypes: string[];
  publicDescription: string | null;
  privateNotes?: string | null;
  isPublished: boolean;
  isOffer: boolean;
  offerLabel: string | null;
  sortOrder: number;
  variations: SeedVariation[];
}

export interface ExistingSpellEnrichment {
  spellId: string;
  /** Additional ingredients to ensure exist on the Base variation (if not already present). */
  ensureBaseIngredients?: SeedVariationIngredient[];
  /** Steps to populate on the Base variation when it has no steps (or only initial seed stubs). */
  baseSteps?: SeedVariationStep[];
  /** If true and Base only has the initial seed stub step(s), replace those stubs with baseSteps. */
  replaceInitialStubSteps?: string[];
  /** Additional non-base variations to insert if not already present. */
  extraVariations?: SeedVariation[];
}

export const EXTRA_CATEGORIES: SeedCategory[] = [
  {
    id: "cat-amor-vinculares",
    name: "Hechizos de Amor y Dinámicas Vinculares",
    slug: "hechizos-de-amor-y-dinamicas-vinculares",
    publicIntro: null,
    sortOrder: 4,
  },
  {
    id: "cat-prosperidad-dinero",
    name: "Hechizos de Prosperidad y Dinero",
    slug: "hechizos-de-prosperidad-y-dinero",
    publicIntro: null,
    sortOrder: 5,
  },
  {
    id: "cat-hechizos-neutros",
    name: "Hechizos Neutros",
    slug: "hechizos-neutros",
    publicIntro: null,
    sortOrder: 6,
  },
];

export const EXTRA_INGREDIENTS: SeedIngredient[] = [
  // Velas
  {
    id: "ing-velon-tricolor",
    name: "Velón tricolor (Rojo-Blanco-Negro)",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-velon-rojo",
    name: "Velón rojo (3 o 7 días)",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-velon-blanco",
    name: "Velón blanco (3 o 7 días)",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-velon-amarillo",
    name: "Velón amarillo o naranja (3 días)",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-velon-negro",
    name: "Velón negro",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vela-violeta",
    name: "Vela violeta/morada",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vela-verde",
    name: "Vela verde",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vela-amarilla",
    name: "Vela amarilla/dorada",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vela-naranja",
    name: "Vela naranja",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vela-celeste",
    name: "Vela celeste",
    groupTag: "Velas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },

  // Cristales y piedras
  {
    id: "ing-piedra-iman",
    name: "Piedra Imán",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-cuarzo-rosa",
    name: "Cuarzo rosa",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-cuarzo-cristal",
    name: "Cuarzo cristal",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-turmalina-negra",
    name: "Turmalina negra",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-pirita",
    name: "Pirita",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-citrino",
    name: "Citrino",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-amatista",
    name: "Amatista",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-selenita",
    name: "Selenita",
    groupTag: "Cristales",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },

  // Aceites y aguas
  {
    id: "ing-aceite-canela",
    name: "Aceite esencial de canela",
    groupTag: "Aceites",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-aceite-lavanda",
    name: "Aceite esencial de lavanda",
    groupTag: "Aceites",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-aceite-rosas",
    name: "Aceite esencial de rosas",
    groupTag: "Aceites",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-aceite-sandalo",
    name: "Aceite esencial de sándalo",
    groupTag: "Aceites",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-aceite-limon",
    name: "Aceite esencial de limón o naranja",
    groupTag: "Aceites",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-agua-florida",
    name: "Agua Florida",
    groupTag: "Aceites",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },

  // Hierbas y especias
  {
    id: "ing-canela-polvo",
    name: "Canela en polvo",
    groupTag: "Hierbas",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-pimienta-negra",
    name: "Pimienta negra o cayena",
    groupTag: "Hierbas",
    unitType: "pinch",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-cafe-molido",
    name: "Café molido",
    groupTag: "Hierbas",
    unitType: "tbsp",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-clavo-olor",
    name: "Clavo de olor",
    groupTag: "Hierbas",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-anis-estrellado",
    name: "Anís estrellado",
    groupTag: "Hierbas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-ruda-seca",
    name: "Ruda seca",
    groupTag: "Hierbas",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-laurel",
    name: "Hojas de laurel",
    groupTag: "Hierbas",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-albahaca",
    name: "Albahaca seca",
    groupTag: "Hierbas",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-manzanilla",
    name: "Manzanilla seca",
    groupTag: "Hierbas",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },

  // Inciensos y resinas
  {
    id: "ing-carbon-vegetal",
    name: "Carbón vegetal",
    groupTag: "Inciensos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-resinas",
    name: "Resinas (incienso, mirra, copal)",
    groupTag: "Inciensos",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },

  // Insumos y recipientes
  {
    id: "ing-azucar",
    name: "Azúcar",
    groupTag: "Insumos",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-sal-fina",
    name: "Sal fina",
    groupTag: "Insumos",
    unitType: "pinch",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vinagre-blanco",
    name: "Vinagre blanco o jugo de limón",
    groupTag: "Insumos",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-arroz-crudo",
    name: "Arroz crudo",
    groupTag: "Insumos",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-lentejas",
    name: "Lentejas",
    groupTag: "Insumos",
    unitType: "g",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-agua",
    name: "Agua limpia",
    groupTag: "Insumos",
    unitType: "ml",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-alfileres",
    name: "Alfileres metálicos",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-papel-madera",
    name: "Papel madera liso",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-papel-blanco",
    name: "Papel blanco liso",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-plato-blanco",
    name: "Plato blanco",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-plato-negro",
    name: "Plato negro o descartable",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-frasco-vidrio",
    name: "Frasco de vidrio con tapa hermética",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-vaso-transparente",
    name: "Vaso transparente",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-hilo-rojo",
    name: "Cinta o hilo rojo de algodón",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-hilo-negro",
    name: "Hilo negro de algodón",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-cinta-violeta",
    name: "Cinta violeta",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-cinta-blanca",
    name: "Cinta blanca de algodón",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-monedas",
    name: "Monedas de curso legal",
    groupTag: "Insumos",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },

  // Otros elementos rituales
  {
    id: "ing-fosforos-madera",
    name: "Fósforos de madera",
    groupTag: "Otros",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-tijera",
    name: "Tijera",
    groupTag: "Otros",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-sahumador",
    name: "Sahumador",
    groupTag: "Otros",
    unitType: "unit",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-cartas-tarot",
    name: "Cartas de Tarot (As de Oros, As de Bastos, 3 de Copas)",
    groupTag: "Otros",
    unitType: "qualitative",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
  {
    id: "ing-prenda-intima",
    name: "Prenda íntima o camisón de la consultante",
    groupTag: "Otros",
    unitType: "qualitative",
    stockQty: null,
    lowThreshold: null,
    stockLevel: "plenty",
    unitCostArs: null,
  },
];

/**
 * Enrichments for the 8 spells that already exist in the initial seed.
 * Adds missing ingredients, steps, and specialized variations without breaking
 * existing prices, categories, or public catalog descriptions.
 */
export const EXISTING_SPELL_ENRICHMENTS: ExistingSpellEnrichment[] = [
  {
    spellId: "spell-endulzamiento",
    ensureBaseIngredients: [
      {
        ingredientId: "ing-cuarzo-rosa",
        quantity: 1,
        unit: "unit",
      },
      {
        ingredientId: "ing-aceite-lavanda",
        quantity: 5,
        unit: "ml",
        substitutionNote: "Aceite de lavanda o rosas",
      },
      {
        ingredientId: "ing-azucar",
        quantity: 20,
        unit: "g",
        substitutionNote: "Azúcar blanca o rubia",
      },
      {
        ingredientId: "ing-canela-polvo",
        quantity: 5,
        unit: "g",
      },
      {
        ingredientId: "ing-frasco-vidrio",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Pequeño con tapa hermética (o plato blanco si se hace solo con vela)",
      },
      {
        ingredientId: "ing-papel-blanco",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Papel liso sin renglones",
      },
    ],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Preparación del testigo",
        instruction:
          "Escribir el nombre de la persona y encima (o entrelazado) el del consultante en papel liso sin renglones.",
      },
      {
        stepNumber: 2,
        title: "Armado del frasco de endulzamiento",
        instruction:
          "Doblar el papel hacia uno mismo y colocarlo dentro del frasco cubriéndolo con miel, azúcar, pétalos y una pizca de canela.",
      },
      {
        stepNumber: 3,
        title: "Sellado con vela y cuarzo",
        instruction:
          "Cerrar el frasco, colocar el cuarzo rosa al lado y encender la vela rosa encima de la tapa (o sobre plato aparte junto al frasco) dejando que la cera selle la intención.",
      },
    ],
  },
  {
    spellId: "spell-autoendulzamiento",
    extraVariations: [
      {
        id: "var-spell-autoendulzamiento-camila",
        name: "Variante de Brillo y Ruta de Camila",
        isBase: false,
        clientContext: "Autoendulzamiento potenciado con brillo personal y atracción dirigida",
        notes: "Incluye acción física de la consultante (exfoliación y sellado con miel bajo el perfume).",
        sortOrder: 1,
        ingredients: [
          {
            ingredientId: "ing-vela-blanca",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Vela cilíndrica blanca o rosa (o velón de 3 días)",
          },
          { ingredientId: "ing-agua-florida", quantity: 10, unit: "ml" },
          {
            ingredientId: "ing-alfileres",
            quantity: 1,
            unit: "unit",
            isOptional: true,
            substitutionNote: "Para la variante de atracción dirigida",
          },
          {
            ingredientId: "ing-piedra-iman",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Con limadura",
          },
          {
            ingredientId: "ing-cuarzo-cristal",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Cuarzo Cristal o Cuarzo Rosa",
          },
          { ingredientId: "ing-anis-estrellado", quantity: 5, unit: "unit" },
          { ingredientId: "ing-miel", quantity: 30, unit: "ml" },
          { ingredientId: "ing-azucar", quantity: 20, unit: "g" },
          { ingredientId: "ing-canela-polvo", quantity: 5, unit: "g" },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
          { ingredientId: "ing-papel-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Limpieza y grabado de la vela",
            instruction:
              "Limpiar la vela con Agua Florida y grabar el nombre de la consultante de mecha a base (en la variante de atracción dirigida, grabar encima el nombre del objetivo y clavar el alfiler a la altura del pabilo).",
          },
          {
            stepNumber: 2,
            title: "Vestido de la vela",
            instruction:
              "Vestir la vela con miel, azúcar y canela de arriba hacia abajo.",
          },
          {
            stepNumber: 3,
            title: "Armado del testigo y fijación",
            instruction:
              "Escribir el nombre de la consultante en el centro del papel (y si aplica distancia física, rodearlo con el nombre del objetivo y flechas hacia adentro); pegar la vela encima.",
          },
          {
            stepNumber: 4,
            title: "Estrella de anís y cristales",
            instruction:
              "Rodear la base con las 5 piezas de anís formando una estrella bañada en miel; ubicar la Piedra Imán a la izquierda y el Cuarzo Cristal a la derecha apuntando a la llama.",
          },
          {
            stepNumber: 5,
            title: "Acción de la consultante",
            instruction:
              "Exfoliación suave en la ducha con azúcar, miel y una pizca de canela, y sellado con una microgota de miel bajo el perfume en muñecas y cuello antes del encuentro.",
          },
        ],
      },
    ],
  },
  {
    spellId: "spell-corte-lazos",
    ensureBaseIngredients: [
      {
        ingredientId: "ing-vela-negra",
        quantity: 2,
        unit: "unit",
        substitutionNote: "2 velas negras comunes (o 1 negra para el vínculo/otro y 1 blanca para el consultante)",
      },
      { ingredientId: "ing-hilo-negro", quantity: 1, unit: "unit" },
      { ingredientId: "ing-tijera", quantity: 1, unit: "unit" },
      { ingredientId: "ing-turmalina-negra", quantity: 1, unit: "unit" },
      {
        ingredientId: "ing-carbon-vegetal",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Para sahumar al final",
      },
      { ingredientId: "ing-ruda-seca", quantity: 10, unit: "g" },
      {
        ingredientId: "ing-vinagre-blanco",
        quantity: 10,
        unit: "ml",
        substitutionNote: "Unas gotas de vinagre o limón",
      },
      { ingredientId: "ing-plato-negro", quantity: 1, unit: "unit" },
    ],
    replaceInitialStubSteps: ["vs-var-spell-corte-lazos-base-1"],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Grabado y atadura del vínculo",
        instruction:
          "Grabar cada nombre en su vela, colocarlas separadas unos centímetros y atarlas entre sí por el centro con el hilo negro tenso.",
      },
      {
        stepNumber: 2,
        title: "Círculo de protección",
        instruction:
          "Trazar un círculo de sal gruesa y ruda alrededor (y colocar la Turmalina por fuera del plato).",
      },
      {
        stepNumber: 3,
        title: "Encendido y corte",
        instruction:
          "Encender ambas velas; cuando la llama baje hacia el hilo, dejar que el fuego lo queme o cortarlo físicamente con la tijera en el medio decretando la liberación total.",
      },
      {
        stepNumber: 4,
        title: "Despacho y limpieza",
        instruction:
          "Al finalizar, desechar los restos fuera de la casa y limpiar el espacio con humo de ruda o romero.",
      },
    ],
  },
  {
    spellId: "spell-retorno",
    ensureBaseIngredients: [
      {
        ingredientId: "ing-velon-rojo",
        quantity: 1,
        unit: "unit",
        isOptional: true,
        substitutionNote: "1 velón rojo o blanco de 3 días (o dupla de vela blanca + roja)",
      },
      { ingredientId: "ing-piedra-iman", quantity: 1, unit: "unit" },
      {
        ingredientId: "ing-aceite-sandalo",
        quantity: 5,
        unit: "ml",
        substitutionNote: "Aceite de sándalo o canela",
      },
      { ingredientId: "ing-alfileres", quantity: 1, unit: "unit" },
      { ingredientId: "ing-anis-estrellado", quantity: 3, unit: "unit" },
      { ingredientId: "ing-azucar", quantity: 20, unit: "g" },
      { ingredientId: "ing-papel-madera", quantity: 1, unit: "unit" },
      { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
    ],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Testigo en espiral",
        instruction:
          "Escribir el nombre de la persona 3 veces en el papel y rodearlo con flechas o un espiral que gire hacia el centro.",
      },
      {
        stepNumber: 2,
        title: "Grabado y vestido de la vela",
        instruction:
          "Grabar el nombre en la vela de mecha a base y vestirla con aceite, miel y canela hacia abajo.",
      },
      {
        stepNumber: 3,
        title: "Apertura de regreso y atracción",
        instruction:
          "Rodear la base con anís estrellado para abrir el camino de vuelta y ubicar la Piedra Imán atrayendo hacia la vela.",
      },
    ],
  },
  {
    spellId: "spell-desespero-asfixia",
    ensureBaseIngredients: [
      { ingredientId: "ing-alfileres", quantity: 7, unit: "unit" },
      {
        ingredientId: "ing-aceite-canela",
        quantity: 5,
        unit: "ml",
        substitutionNote: "Aceite de canela o clavo de olor",
      },
      {
        ingredientId: "ing-turmalina-negra",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Para proteger al operador",
      },
      { ingredientId: "ing-pimienta-negra", quantity: 1, unit: "pinch" },
      { ingredientId: "ing-cafe-molido", quantity: 1, unit: "tbsp" },
      { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
      { ingredientId: "ing-papel-madera", quantity: 1, unit: "unit" },
      {
        ingredientId: "ing-plato-negro",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Plato negro o blanco",
      },
    ],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Espiral mental cerrado",
        instruction:
          "Escribir el nombre del objetivo 7 veces en el papel formando un espiral cerrado hacia adentro para simbolizar pensamiento repetitivo.",
      },
      {
        stepNumber: 2,
        title: "Preparación de velas y bloqueo",
        instruction:
          "Clavar los alfileres en la corona de la vela roja y vestirla con aceite, café y pimienta; encender la vela negra al lado para bloquear distracciones o terceras influencias.",
      },
      {
        stepNumber: 3,
        title: "Visualización de saturación mental",
        instruction:
          "Sostener una visualización breve y contundente de saturación mental enfocada en una sola persona y dejar consumir.",
      },
    ],
  },
  {
    spellId: "spell-sumision-dominancia",
    ensureBaseIngredients: [
      {
        ingredientId: "ing-vela-violeta",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Mando y dominio (+ 1 vela blanca o roja para el objetivo)",
      },
      {
        ingredientId: "ing-cinta-violeta",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Cinta violeta o roja",
      },
      {
        ingredientId: "ing-aceite-sandalo",
        quantity: 5,
        unit: "ml",
        substitutionNote: "Aceite de sándalo o laurel",
      },
      { ingredientId: "ing-cuarzo-cristal", quantity: 1, unit: "unit" },
      { ingredientId: "ing-laurel", quantity: 3, unit: "unit" },
      { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
      { ingredientId: "ing-azucar", quantity: 10, unit: "g" },
      { ingredientId: "ing-papel-madera", quantity: 1, unit: "unit" },
      { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
    ],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Escritura de dominio en el testigo",
        instruction:
          "Escribir el nombre del objetivo en el centro del papel y, justo encima en tamaño más grande (o cruzándolo), el nombre de quien domina.",
      },
      {
        stepNumber: 2,
        title: "Vestido diferenciado de velas",
        instruction:
          "Vestir la vela violeta con aceite y laurel triturado (victoria y autoridad), y la otra vela con una pizca de azúcar (docilidad).",
      },
      {
        stepNumber: 3,
        title: "Posicionamiento y encendido",
        instruction:
          "Colocar la vela violeta directamente pisando los nombres en el papel (con la otra ligeramente detrás o atadas con cinta violeta) y encender visualizando obediencia y pérdida de orgullo.",
      },
    ],
  },
  {
    spellId: "spell-destrabe-purgado",
    ensureBaseIngredients: [
      {
        ingredientId: "ing-velon-negro",
        quantity: 1,
        unit: "unit",
        isOptional: true,
        substitutionNote: "1 velón negro o blanco/negro (o vela negra + vela blanca en secuencia)",
      },
      { ingredientId: "ing-carbon-vegetal", quantity: 1, unit: "unit" },
      { ingredientId: "ing-sahumador", quantity: 1, unit: "unit" },
      {
        ingredientId: "ing-resinas",
        quantity: 10,
        unit: "g",
        substitutionNote: "Incienso/olíbano, mirra y copal",
      },
      { ingredientId: "ing-agua-florida", quantity: 15, unit: "ml" },
      { ingredientId: "ing-turmalina-negra", quantity: 1, unit: "unit" },
      { ingredientId: "ing-amatista", quantity: 1, unit: "unit" },
      { ingredientId: "ing-selenita", quantity: 1, unit: "unit" },
      { ingredientId: "ing-ruda-seca", quantity: 10, unit: "g" },
      { ingredientId: "ing-plato-negro", quantity: 1, unit: "unit" },
    ],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Sahumado de apertura",
        instruction:
          "Encender un carbón en el sahumador con resinas, ruda y romero; sahumar el altar, el ambiente y al consultante (o su testigo).",
      },
      {
        stepNumber: 2,
        title: "Purgado en cama de sal y ruda",
        instruction:
          "En el plato negro, formar una cama de sal gruesa y ruda, colocar la vela negra en el centro y la Turmalina a un costado para purgar larvas energéticas, cargas ajenas y bloqueos pesados.",
      },
      {
        stepNumber: 3,
        title: "Despacho, limpieza y sellado",
        instruction:
          "Una vez consumida, desechar los restos lejos de la casa, pasar Agua Florida y cerrar colocando Amatista y Selenita en el espacio para armonizar y sellar.",
      },
    ],
  },
  {
    spellId: "spell-ansi-holic",
    ensureBaseIngredients: [
      {
        ingredientId: "ing-vela-celeste",
        quantity: 1,
        unit: "unit",
        isOptional: true,
        substitutionNote: "Vela celeste, blanca o lila/violeta suave",
      },
      {
        ingredientId: "ing-amatista",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Transmutación mental",
      },
      {
        ingredientId: "ing-cuarzo-cristal",
        quantity: 1,
        unit: "unit",
        substitutionNote: "Cuarzo Cristal o Cuarzo Rosa",
      },
      { ingredientId: "ing-aceite-lavanda", quantity: 5, unit: "ml" },
      { ingredientId: "ing-agua-florida", quantity: 10, unit: "ml" },
      {
        ingredientId: "ing-manzanilla",
        quantity: 5,
        unit: "g",
        isOptional: true,
      },
      { ingredientId: "ing-vaso-transparente", quantity: 1, unit: "unit" },
      { ingredientId: "ing-agua", quantity: 200, unit: "ml" },
      { ingredientId: "ing-sal-fina", quantity: 1, unit: "pinch" },
      { ingredientId: "ing-papel-blanco", quantity: 1, unit: "unit" },
      { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
    ],
    replaceInitialStubSteps: ["vs-var-spell-ansi-holic-base-1"],
    baseSteps: [
      {
        stepNumber: 1,
        title: "Descarga escrita de pensamientos",
        instruction:
          "Escribir en el papel todos los pensamientos intrusivos o miedos que disparan la ansiedad y doblarlo hacia afuera 3 veces (para alejarlos).",
      },
      {
        stepNumber: 2,
        title: "Vestido ascendente y corona de lavanda",
        instruction:
          "Vestir la vela celeste/blanca con aceite de lavanda de la base hacia la mecha (movimiento ascendente para liberar y disipar la tensión) y rodearla con lavanda seca.",
      },
      {
        stepNumber: 3,
        title: "Esponja de agua y anclaje con Amatista",
        instruction:
          "Colocar el vaso con agua y sal al lado izquierdo (actúa como esponja de ruido mental) y la Amatista al frente.",
      },
      {
        stepNumber: 4,
        title: "Cierre y limpieza final",
        instruction:
          "Al consumirse la vela, tirar el agua por el desagüe sin tocarla, romper o quemar el papel en un cuenco seguro y limpiar las manos con Agua Florida.",
      },
    ],
  },
];

/**
 * The 12 new spells not present in the original seed.
 */
export const NEW_SPELLS: SeedNewSpell[] = [
  // 1. Hechizos de Amor y Dinámicas Vinculares
  {
    id: "spell-desespero",
    categoryId: "cat-amor-vinculares",
    title: "Desespero",
    subtitleTag: null,
    purpose: "Generar urgencia mental y necesidad de comunicación en el objetivo",
    energyTypes: ["Amor", "Vincular", "Urgencia"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 1,
    variations: [
      {
        id: "var-spell-desespero-base",
        name: "Base",
        isBase: true,
        clientContext: "Receta estándar del altar",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-roja",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Vela roja común (o vela de figura humana si se busca mayor foco)",
          },
          { ingredientId: "ing-alfileres", quantity: 7, unit: "unit" },
          {
            ingredientId: "ing-aceite-canela",
            quantity: 5,
            unit: "ml",
            substitutionNote: "Diluido en aceite base",
          },
          { ingredientId: "ing-piedra-iman", quantity: 1, unit: "unit" },
          { ingredientId: "ing-pimienta-negra", quantity: 1, unit: "pinch" },
          { ingredientId: "ing-cafe-molido", quantity: 1, unit: "tbsp" },
          { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
          { ingredientId: "ing-papel-madera", quantity: 1, unit: "unit" },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
          { ingredientId: "ing-fosforos-madera", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Grabado y testigo",
            instruction:
              "Grabar el nombre del objetivo en la vela de mecha a base y escribirlo 3 veces en el papel.",
          },
          {
            stepNumber: 2,
            title: "Alfileres en zona mental",
            instruction:
              "Clavar los 7 alfileres en el tercio superior de la vela (zona mental) decretando urgencia por comunicarse.",
          },
          {
            stepNumber: 3,
            title: "Vestido y rebozado",
            instruction:
              "Vestir la vela con el aceite de canela (hacia abajo) y rebozarla suavemente con pimienta y café.",
          },
          {
            stepNumber: 4,
            title: "Fijación, Piedra Imán y encendido",
            instruction:
              "Fijar la vela sobre el papel, colocar la Piedra Imán tocando el borde del plato y encender con fósforo de madera.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-magia-sexual-distancia",
    categoryId: "cat-amor-vinculares",
    title: "Magia Sexual a Distancia / Clímax de Atracción (Protocolo Camila)",
    subtitleTag: "Protocolo Camila",
    purpose: "Canalizar energía sexual en videollamada para potenciar deseo y atracción hacia el objetivo",
    energyTypes: ["Amor", "Magia sexual", "Atracción"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 2,
    variations: [
      {
        id: "var-spell-magia-sexual-distancia-base",
        name: "Base",
        isBase: true,
        clientContext: "Protocolo Camila en videollamada",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-velon-tricolor",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Para el altar del operador",
          },
          {
            ingredientId: "ing-vela-roja",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Vela roja pequeña para la consultante",
          },
          {
            ingredientId: "ing-piedra-iman",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Tracción",
          },
          {
            ingredientId: "ing-turmalina-negra",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Blindaje contra terceros (por fuera del plato)",
          },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
          { ingredientId: "ing-azucar", quantity: 30, unit: "g" },
          { ingredientId: "ing-miel", quantity: 30, unit: "ml" },
          {
            ingredientId: "ing-prenda-intima",
            quantity: null,
            unit: "qualitative",
            substitutionNote: "Del lado de la consultante",
          },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Preparación del altar principal",
            instruction:
              "En el altar principal, fijar el velón tricolor en el plato, rodearlo con un círculo de azúcar y miel, colocar la Piedra Imán tocando el plato y la Turmalina Negra por fuera.",
          },
          {
            stepNumber: 2,
            title: "Franja Negra (Despojo)",
            instruction:
              "Encender el velón en videollamada, guiar respiraciones profundas y visualizar la quema de trabas, dudas y energías de terceros.",
          },
          {
            stepNumber: 3,
            title: "Franja Blanca (Enlace)",
            instruction:
              "Sintonizar la intención con la consultante vestida con la prenda elegida, enfocando la imagen exacta del encuentro deseado.",
          },
          {
            stepNumber: 4,
            title: "Franja Roja (Clímax)",
            instruction:
              "Acompañar la acumulación de tensión sexual; en el instante del orgasmo, proyectar toda la carga hacia la llama roja decretando el deseo del objetivo.",
          },
          {
            stepNumber: 5,
            title: "Cierre",
            instruction:
              "Dejar arder unos minutos, apagar con apagavelas sin soplar (o dejar consumir) y conservar la prenda sin lavar hasta el encuentro físico.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-amarres",
    categoryId: "cat-amor-vinculares",
    title: "Amarres",
    subtitleTag: null,
    purpose: "Unir y consolidar fuertemente el vínculo afectivo y pasional entre dos personas",
    energyTypes: ["Amor", "Amarre", "Vincular"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 3,
    variations: [
      {
        id: "var-spell-amarres-base",
        name: "Base",
        isBase: true,
        clientContext: "Receta estándar del altar",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-roja",
            quantity: 2,
            unit: "unit",
            substitutionNote: "2 velas rojas comunes (o 1 velón rojo de 3 o 7 días)",
          },
          { ingredientId: "ing-hilo-rojo", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-piedra-iman",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Con limadura",
          },
          {
            ingredientId: "ing-aceite-canela",
            quantity: 5,
            unit: "ml",
            substitutionNote: "Aceite de canela o rosas",
          },
          { ingredientId: "ing-miel", quantity: 30, unit: "ml" },
          { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
          { ingredientId: "ing-azucar", quantity: 20, unit: "g" },
          {
            ingredientId: "ing-papel-madera",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Papel testigo o fotografía",
          },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Grabado enfrentado",
            instruction:
              "Grabar el nombre de cada persona en su respectiva vela, mirando de frente una hacia la otra.",
          },
          {
            stepNumber: 2,
            title: "Atadura con hilo rojo",
            instruction:
              "Unir ambas velas con el hilo rojo realizando 3 o 7 nudos firmes mientras se verbaliza el vínculo.",
          },
          {
            stepNumber: 3,
            title: "Vestido, fijación y consumo",
            instruction:
              "Vestirlas juntas con miel, aceite y clavo molido; fijarlas sobre el testigo en el plato con la Piedra Imán al frente y dejar consumir por completo.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-formalizacion",
    categoryId: "cat-amor-vinculares",
    title: "Formalización",
    subtitleTag: null,
    purpose: "Estabilizar, aclarar y consolidar un compromiso recíproco y formal en la pareja",
    energyTypes: ["Amor", "Compromiso", "Estabilidad"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 4,
    variations: [
      {
        id: "var-spell-formalizacion-base",
        name: "Base",
        isBase: true,
        clientContext: "Receta estándar del altar",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-velon-blanco",
            quantity: 1,
            unit: "unit",
            substitutionNote: "1 velón blanco o rosa de 3 o 7 días (o 2 velas blancas atadas)",
          },
          { ingredientId: "ing-cinta-blanca", quantity: 1, unit: "unit" },
          { ingredientId: "ing-cuarzo-rosa", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-pirita",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Pirita o Cuarzo Cristal (estabilidad y claridad)",
          },
          {
            ingredientId: "ing-aceite-lavanda",
            quantity: 5,
            unit: "ml",
            substitutionNote: "Aceite de lavanda o rosas",
          },
          { ingredientId: "ing-miel", quantity: 30, unit: "ml" },
          { ingredientId: "ing-lavanda", quantity: 10, unit: "g" },
          { ingredientId: "ing-laurel", quantity: 3, unit: "unit" },
          { ingredientId: "ing-papel-blanco", quantity: 1, unit: "unit" },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Decreto de compromiso",
            instruction:
              "Redactar un decreto claro de compromiso estable y recíproco con ambos nombres.",
          },
          {
            stepNumber: 2,
            title: "Atadura o vestido",
            instruction:
              "Atar las velas blancas con cinta blanca en 3 nudos (o vestir el velón de mecha a base con aceite y miel).",
          },
          {
            stepNumber: 3,
            title: "Armado con hierbas y cuarzos",
            instruction:
              "Rodear con lavanda (calma) y laurel (consolidación), ubicar los cuarzos a los costados y dejar consumir en un entorno tranquilo.",
          },
        ],
      },
    ],
  },

  // 2. Hechizos de Prosperidad y Dinero
  {
    id: "spell-abrecaminos",
    categoryId: "cat-prosperidad-dinero",
    title: "Abrecaminos (Base + Variante de Sofía)",
    subtitleTag: "Base + Variante de Sofía",
    purpose: "Destrabar oportunidades, abrir caminos y activar flujo de prosperidad",
    energyTypes: ["Prosperidad", "Abrecaminos", "Tarot"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 1,
    variations: [
      {
        id: "var-spell-abrecaminos-base",
        name: "Base + Variante de Sofía",
        isBase: true,
        clientContext: "Con herradura abierta y triángulo de Tarot",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-blanca",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Vela blanca cilíndrica (o amarilla/naranja)",
          },
          { ingredientId: "ing-agua-florida", quantity: 10, unit: "ml" },
          { ingredientId: "ing-piedra-iman", quantity: 1, unit: "unit" },
          { ingredientId: "ing-cuarzo-cristal", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-turmalina-negra",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Por fuera del plato",
          },
          {
            ingredientId: "ing-cartas-tarot",
            quantity: null,
            unit: "qualitative",
            substitutionNote: "As de Oros, As de Bastos, 3 de Copas",
          },
          {
            ingredientId: "ing-monedas",
            quantity: 3,
            unit: "unit",
            substitutionNote: "De curso legal limpias",
          },
          {
            ingredientId: "ing-laurel",
            quantity: 3,
            unit: "unit",
            substitutionNote: "Hojas de laurel o anís estrellado",
          },
          { ingredientId: "ing-miel", quantity: 20, unit: "ml" },
          { ingredientId: "ing-canela-polvo", quantity: 5, unit: "g" },
          { ingredientId: "ing-azucar", quantity: 20, unit: "g" },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
          { ingredientId: "ing-papel-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Limpieza y grabado",
            instruction:
              "Limpiar vela y monedas con Agua Florida; grabar nombre, fecha de nacimiento y 3 palabras clave de mecha a base.",
          },
          {
            stepNumber: 2,
            title: "Vestido y decreto",
            instruction:
              "Vestir la vela con miel, canela y azúcar; colocarla sobre el decreto escrito en tiempo presente.",
          },
          {
            stepNumber: 3,
            title: "Herradura abierta y cristales",
            instruction:
              "Formar una herradura abierta hacia el frente (nunca un círculo cerrado) con las monedas y el laurel; poner la Piedra Imán junto a la vela y el Cuarzo en la abertura iluminando la salida.",
          },
          {
            stepNumber: 4,
            title: "Triángulo de Tarot y circulación",
            instruction:
              "Colocar las cartas por fuera formando un triángulo y, al finalizar, poner las monedas en circulación real.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-oportunidades-laborales",
    categoryId: "cat-prosperidad-dinero",
    title: "Oportunidades Laborales",
    subtitleTag: null,
    purpose: "Atraer entrevistas, llamados y ofertas de empleo acordes a las condiciones buscadas",
    energyTypes: ["Trabajo", "Prosperidad", "Aceleración"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 2,
    variations: [
      {
        id: "var-spell-oportunidades-laborales-base",
        name: "Base",
        isBase: true,
        clientContext: "Ideal ejecutar en lunes o jueves",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-verde",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Vela verde o amarilla (o velón de 3 días)",
          },
          {
            ingredientId: "ing-pirita",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Pirita o Citrino",
          },
          { ingredientId: "ing-aceite-limon", quantity: 5, unit: "ml" },
          { ingredientId: "ing-laurel", quantity: 5, unit: "unit" },
          { ingredientId: "ing-albahaca", quantity: 5, unit: "g" },
          {
            ingredientId: "ing-cafe-molido",
            quantity: 1,
            unit: "pinch",
            substitutionNote: "Acelerador de entrevistas/llamados",
          },
          { ingredientId: "ing-papel-madera", quantity: 1, unit: "unit" },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Decreto laboral en presente",
            instruction:
              "Escribir en el papel el tipo de empleo, condiciones horarias y remuneración buscada en presente.",
          },
          {
            stepNumber: 2,
            title: "Grabado y vestido acelerador",
            instruction:
              "Grabar el nombre del consultante y la palabra Trabajo en la vela; vestir con aceite cítrico, albahaca y café.",
          },
          {
            stepNumber: 3,
            title: "Corona de laurel y acción en plano físico",
            instruction:
              "Rodear el plato con hojas de laurel enteras y la pirita/citrino. Ideal ejecutar en lunes o jueves y acompañar enviando mensajes a contactos clave.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-destrabes-economicos",
    categoryId: "cat-prosperidad-dinero",
    title: "Destrabes Económicos",
    subtitleTag: null,
    purpose: "Cortar bloqueos financieros, deudas y envidias para reactivar el ingreso de dinero",
    energyTypes: ["Dinero", "Destrabe", "Limpieza"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 3,
    variations: [
      {
        id: "var-spell-destrabes-economicos-base",
        name: "Base",
        isBase: true,
        clientContext: "Ritual en dos fases (corte + apertura)",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-negra",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Fase 1: corte de bloqueo",
          },
          {
            ingredientId: "ing-vela-blanca",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Fase 2: reactivación (blanca o amarilla)",
          },
          { ingredientId: "ing-turmalina-negra", quantity: 1, unit: "unit" },
          { ingredientId: "ing-carbon-vegetal", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-resinas",
            quantity: 10,
            unit: "g",
            substitutionNote: "Incienso/mirra",
          },
          { ingredientId: "ing-agua-florida", quantity: 10, unit: "ml" },
          { ingredientId: "ing-sal-gruesa", quantity: 40, unit: "g" },
          { ingredientId: "ing-ruda-seca", quantity: 10, unit: "g" },
          { ingredientId: "ing-romero", quantity: 10, unit: "g" },
          { ingredientId: "ing-canela-polvo", quantity: 5, unit: "g" },
          { ingredientId: "ing-vaso-transparente", quantity: 1, unit: "unit" },
          { ingredientId: "ing-agua", quantity: 150, unit: "ml" },
          { ingredientId: "ing-vinagre-blanco", quantity: 30, unit: "ml" },
          {
            ingredientId: "ing-plato-negro",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Fase 1",
          },
          {
            ingredientId: "ing-plato-blanco",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Fase 2",
          },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Fase de corte",
            instruction:
              "En el plato negro, encender la vela negra rodeada de sal gruesa y ruda, con el vaso de agua y vinagre al lado y la Turmalina protegiendo, para quemar deudas, envidias y estancamiento.",
          },
          {
            stepNumber: 2,
            title: "Fase de apertura",
            instruction:
              "Una vez consumida la negra (y tirado el agua con vinagre al desagüe), encender en plato blanco limpio la vela blanca/amarilla vestida con romero y canela para reactivar el ingreso de dinero.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-cumplimiento-metas",
    categoryId: "cat-prosperidad-dinero",
    title: "Cumplimiento de Metas",
    subtitleTag: null,
    purpose: "Enfocar voluntad, disciplina y tracción material hacia una meta específica con plazo",
    energyTypes: ["Éxito", "Concreción", "Prosperidad"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 4,
    variations: [
      {
        id: "var-spell-cumplimiento-metas-base",
        name: "Base",
        isBase: true,
        clientContext: "Receta estándar del altar",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-naranja",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Tracción y éxito rápido",
          },
          {
            ingredientId: "ing-vela-amarilla",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Concreción material",
          },
          { ingredientId: "ing-citrino", quantity: 1, unit: "unit" },
          { ingredientId: "ing-cuarzo-cristal", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-aceite-canela",
            quantity: 5,
            unit: "ml",
            substitutionNote: "Aceite de canela o naranja",
          },
          { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
          { ingredientId: "ing-laurel", quantity: 3, unit: "unit" },
          { ingredientId: "ing-azucar", quantity: 20, unit: "g" },
          {
            ingredientId: "ing-papel-madera",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Papel pergamino o madera",
          },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Escritura de la meta",
            instruction:
              "Escribir la meta exacta con fecha estimada y en afirmación presente; doblar el papel hacia uno mismo 3 veces.",
          },
          {
            stepNumber: 2,
            title: "Vestido y fijación de velas",
            instruction:
              "Vestir ambas velas de arriba hacia abajo con aceite, azúcar y clavo molido; fijarlas sobre el papel.",
          },
          {
            stepNumber: 3,
            title: "Enfoque con cristales",
            instruction:
              "Colocar el citrino y el cuarzo en punta mirando hacia las llamas para enfocar voluntad y disciplina hasta su consumo total.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-atraccion-clientes-ventas",
    categoryId: "cat-prosperidad-dinero",
    title: "Atracción de Clientes y Aumento de Ventas",
    subtitleTag: "Ampliación",
    purpose: "Atraer flujo constante de consultas, clientes y ventas para negocios o servicios",
    energyTypes: ["Ventas", "Clientes", "Prosperidad"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 5,
    variations: [
      {
        id: "var-spell-atraccion-clientes-ventas-base",
        name: "Base",
        isBase: true,
        clientContext: "Para negocios y servicios",
        sortOrder: 0,
        ingredients: [
          { ingredientId: "ing-velon-amarillo", quantity: 1, unit: "unit" },
          { ingredientId: "ing-piedra-iman", quantity: 1, unit: "unit" },
          { ingredientId: "ing-pirita", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-aceite-canela",
            quantity: 5,
            unit: "ml",
            substitutionNote: "Aceite de canela o naranja",
          },
          { ingredientId: "ing-miel", quantity: 20, unit: "ml" },
          { ingredientId: "ing-canela-polvo", quantity: 5, unit: "g" },
          { ingredientId: "ing-albahaca", quantity: 5, unit: "g" },
          { ingredientId: "ing-anis-estrellado", quantity: 3, unit: "unit" },
          { ingredientId: "ing-azucar", quantity: 20, unit: "g" },
          {
            ingredientId: "ing-monedas",
            quantity: 3,
            unit: "unit",
            substitutionNote: "1 billete de baja denominación o monedas limpias",
          },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Base del negocio y velón",
            instruction:
              "Colocar el nombre del negocio/servicio (o el billete doblado) en el centro del plato y fijar el velón encima.",
          },
          {
            stepNumber: 2,
            title: "Círculo de atracción comercial",
            instruction:
              "Trazar un círculo alrededor con albahaca, canela y azúcar, decorando con anís estrellado.",
          },
          {
            stepNumber: 3,
            title: "Anclaje magnético",
            instruction:
              "Colocar la Piedra Imán y la Pirita tocando el plato atrayendo flujo constante de consultas y ventas.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-proteccion-financiera",
    categoryId: "cat-prosperidad-dinero",
    title: 'Protección Financiera y Corte de Fugas / "Bolsillo Roto"',
    subtitleTag: "Ampliación",
    purpose: "Frenar gastos imprevistos y fugas de dinero mientras se blinda el ahorro mensual",
    energyTypes: ["Protección financiera", "Ahorro", "Estabilidad"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 6,
    variations: [
      {
        id: "var-spell-proteccion-financiera-base",
        name: "Base",
        isBase: true,
        clientContext: "Retención y freno de fugas",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-verde",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Retención y estabilidad",
          },
          {
            ingredientId: "ing-vela-negra",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Pequeña: freno a gastos imprevistos",
          },
          { ingredientId: "ing-turmalina-negra", quantity: 1, unit: "unit" },
          { ingredientId: "ing-pirita", quantity: 1, unit: "unit" },
          {
            ingredientId: "ing-aceite-sandalo",
            quantity: 5,
            unit: "ml",
            substitutionNote: "Aceite de sándalo o romero",
          },
          { ingredientId: "ing-sal-gruesa", quantity: 20, unit: "g" },
          { ingredientId: "ing-romero", quantity: 5, unit: "g" },
          { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
          { ingredientId: "ing-plato-blanco", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Corte de fugas a la izquierda",
            instruction:
              "Colocar la vela negra a la izquierda rodeada de una pequeña media luna de sal gruesa y la Turmalina para cortar fugas y cobros inesperados.",
          },
          {
            stepNumber: 2,
            title: "Blindaje del ahorro a la derecha",
            instruction:
              "A la derecha, vestir la vela verde con aceite, romero y clavo de olor, rodeada de Pirita para blindar el ahorro y estabilizar el flujo mensual.",
          },
        ],
      },
    ],
  },
  {
    id: "spell-tarro-abundancia",
    categoryId: "cat-prosperidad-dinero",
    title: "Tarro de Abundancia Continua de Altar",
    subtitleTag: "Ampliación",
    purpose: "Mantener un anclaje permanente de sustento y dinero en movimiento en el altar",
    energyTypes: ["Abundancia", "Altar", "Prosperidad continua"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 7,
    variations: [
      {
        id: "var-spell-tarro-abundancia-base",
        name: "Base",
        isBase: true,
        clientContext: "Tarro permanente de altar",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-verde",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Vela verde o amarilla común (para sellado)",
          },
          {
            ingredientId: "ing-pirita",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Pirita o Citrino pequeño (queda dentro del frasco)",
          },
          {
            ingredientId: "ing-frasco-vidrio",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Mediano con tapa hermética",
          },
          { ingredientId: "ing-arroz-crudo", quantity: 50, unit: "g" },
          { ingredientId: "ing-lentejas", quantity: 50, unit: "g" },
          {
            ingredientId: "ing-monedas",
            quantity: 7,
            unit: "unit",
            substitutionNote: "7 monedas doradas",
          },
          { ingredientId: "ing-laurel", quantity: 3, unit: "unit" },
          { ingredientId: "ing-canela", quantity: 3, unit: "branch" },
          { ingredientId: "ing-anis-estrellado", quantity: 3, unit: "unit" },
          { ingredientId: "ing-clavo-olor", quantity: 5, unit: "g" },
          {
            ingredientId: "ing-agua-florida",
            quantity: 10,
            unit: "ml",
            isOptional: true,
            substitutionNote: "Para limpiar el frasco (o humo de incienso)",
          },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Limpieza del recipiente",
            instruction:
              "Limpiar el frasco con humo de incienso o Agua Florida.",
          },
          {
            stepNumber: 2,
            title: "Armado por capas intencionadas",
            instruction:
              "Llenar por capas alternando granos (sustento), monedas (dinero), especias (aceleración) y la piedra (anclaje), nombrando la intención con cada capa.",
          },
          {
            stepNumber: 3,
            title: "Sellado con cera y activación semanal",
            instruction:
              "Cerrar bien, sellar la tapa dejando chorrear cera verde o amarilla encima y agitar el frasco suavemente una vez por semana para mantener el dinero en movimiento.",
          },
        ],
      },
    ],
  },

  // 3. Hechizos Neutros
  {
    id: "spell-congelamiento-terceros",
    categoryId: "cat-hechizos-neutros",
    title: "Congelamiento y Neutralización de Terceros (Protocolo de Hielo)",
    subtitleTag: "Protocolo de Hielo",
    purpose: "Neutralizar y enfriar la injerencia de personas conflictivas o situaciones intrusivas",
    energyTypes: ["Protección", "Neutralización", "Congelamiento"],
    publicDescription: null,
    isPublished: false,
    isOffer: false,
    offerLabel: null,
    sortOrder: 1,
    variations: [
      {
        id: "var-spell-congelamiento-terceros-base",
        name: "Base",
        isBase: true,
        clientContext: "Protocolo de Hielo",
        sortOrder: 0,
        ingredients: [
          {
            ingredientId: "ing-vela-negra",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Pequeña (o chata blanca/negra para sellar)",
          },
          {
            ingredientId: "ing-turmalina-negra",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Presente en el altar durante el armado",
          },
          {
            ingredientId: "ing-frasco-vidrio",
            quantity: 1,
            unit: "unit",
            substitutionNote: "Pequeño con tapa apto para freezer",
          },
          { ingredientId: "ing-agua", quantity: 150, unit: "ml" },
          { ingredientId: "ing-sal-gruesa", quantity: 30, unit: "g" },
          {
            ingredientId: "ing-vinagre-blanco",
            quantity: 30,
            unit: "ml",
            substitutionNote: "Vinagre blanco o jugo de limón",
          },
          { ingredientId: "ing-papel-madera", quantity: 1, unit: "unit" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Testigo doblado hacia afuera",
            instruction:
              "Escribir el nombre de la persona conflictiva o situación intrusiva en el papel y doblarlo hacia afuera 3 veces.",
          },
          {
            stepNumber: 2,
            title: "Preparación del frasco",
            instruction:
              "Introducirlo en el frasco, cubrir con agua, sal gruesa y un chorro de vinagre o limón (dejando 2 cm libres arriba para que no reviente el vidrio al congelarse).",
          },
          {
            stepNumber: 3,
            title: "Sellado con cera y freezer",
            instruction:
              "Cerrar el frasco, sellar la tapa con cera de la vela negra decretando que esa persona quede fría, neutralizada y sin injerencia, y guardarlo al fondo del freezer.",
          },
        ],
      },
    ],
  },
];
