/**
 * Quick Bread Sourdough Discard Conversion Utility
 *
 * Converts quick bread recipes to include sourdough discard.
 * Sourdough discard is roughly 50% flour and 50% water by weight.
 */

import { ParsedIngredient, RecipeWarning } from '@/types/recipe';
import { hasOnlyBakingPowder, hasGlutenFreeFlour } from './quickBreadDetector';

// Unit conversion constants (grams)
export const UNIT_TO_GRAMS: Record<string, number> = {
  // Flour
  'cup flour': 120,
  'cup all-purpose flour': 120,
  'cup ap flour': 120,
  'cup bread flour': 130,
  'cup whole wheat flour': 113,
  'cup cake flour': 115,
  'cup self-rising flour': 120,
  // Liquids
  'cup water': 240,
  'cup milk': 240,
  'cup buttermilk': 245,
  'cup sour cream': 240,
  'cup yogurt': 245,
  'cup heavy cream': 240,
  'cup cream': 240,
  'cup juice': 240,
  'cup orange juice': 240,
  'cup apple juice': 240,
  'cup oil': 224,
  'cup vegetable oil': 224,
  // Tablespoons
  'tablespoon flour': 8,
  'tbsp flour': 8,
  'tablespoon milk': 15,
  'tbsp milk': 15,
  'tablespoon water': 15,
  'tbsp water': 15,
  'tablespoon sour cream': 15,
  'tbsp sour cream': 15,
  'tablespoon yogurt': 15,
  'tbsp yogurt': 15,
  'tablespoon buttermilk': 15,
  'tbsp buttermilk': 15,
  'tablespoon oil': 14,
  'tbsp oil': 14,
  'tablespoon heavy cream': 15,
  'tbsp heavy cream': 15,
  // Teaspoons
  'teaspoon flour': 2.6,
  'tsp flour': 2.6,
  'teaspoon milk': 5,
  'tsp milk': 5,
  'teaspoon water': 5,
  'tsp water': 5,
};

// Grams to volume conversion for output
export const GRAMS_TO_VOLUME: Record<string, { amount: number; unit: string }> = {
  // Discard: 100g ≈ 1/2 cup (scant)
  'discard_100': { amount: 0.5, unit: 'cup' },
  'discard_50': { amount: 0.25, unit: 'cup' },
  'discard_25': { amount: 2, unit: 'tablespoon' },
  // Flour: 50g ≈ 1/4 cup + 2 tbsp all-purpose flour
  'flour_120': { amount: 1, unit: 'cup' },
  'flour_60': { amount: 0.5, unit: 'cup' },
  'flour_30': { amount: 0.25, unit: 'cup' },
  'flour_15': { amount: 2, unit: 'tablespoon' },
  'flour_8': { amount: 1, unit: 'tablespoon' },
  // Liquid: 50g ≈ 3 tablespoons + 1 teaspoon
  'liquid_240': { amount: 1, unit: 'cup' },
  'liquid_120': { amount: 0.5, unit: 'cup' },
  'liquid_60': { amount: 0.25, unit: 'cup' },
  'liquid_45': { amount: 3, unit: 'tablespoon' },
  'liquid_30': { amount: 2, unit: 'tablespoon' },
  'liquid_15': { amount: 1, unit: 'tablespoon' },
};

// Liquid priority order for reduction
export const LIQUID_PRIORITY = [
  'sour cream',
  'yogurt',
  'buttermilk',
  'milk',
  'water',
  'juice',
  'orange juice',
  'apple juice',
  'oil',  // Last resort
];

export interface QuickBreadIngredient {
  name: string;
  amount: number;
  originalAmount: number;
  unit: string;
  originalUnit: string;
  type: 'flour' | 'liquid' | 'leavener' | 'fat' | 'sweetener' | 'other';
  isAdjusted: boolean;
  adjustmentNote?: string;
}

export interface QuickBreadConversionResult {
  recipeName: string;
  originalIngredients: QuickBreadIngredient[];
  convertedIngredients: QuickBreadIngredient[];
  discardAmount: number;
  discardUnit: string;
  flourReduction: number;
  flourReductionUnit: string;
  liquidReductions: Array<{ name: string; amount: number; unit: string }>;
  originalMethod: string;
  convertedMethod: string;
  warnings: RecipeWarning[];
  notes: string[];
  summary: {
    discardAdded: string;
    flourReduced: string;
    liquidReduced: string;
  };
  isVolumeBasedRecipe: boolean;
  hasBakingSoda: boolean;
}

/**
 * Detect the unit format used in a recipe (grams vs volume)
 */
export function detectUnitFormat(recipeText: string): 'grams' | 'volume' | 'mixed' {
  const gramsCount = (recipeText.match(/\d+\s*g(?:rams?)?\b/gi) || []).length;
  const volumeCount = (recipeText.match(/\d+(?:\s*\d*\/\d+)?\s*(?:cups?|tablespoons?|tbsp|teaspoons?|tsp)\b/gi) || []).length;

  if (gramsCount > 0 && volumeCount === 0) return 'grams';
  if (volumeCount > 0 && gramsCount === 0) return 'volume';
  if (gramsCount > volumeCount * 2) return 'grams';
  if (volumeCount > gramsCount * 2) return 'volume';
  return 'mixed';
}

/**
 * Parse an ingredient line to extract amount, unit, and name
 */
export function parseIngredientLine(line: string): { amount: number; unit: string; name: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Pattern for grams: "100g flour" or "100 g flour" or "100 grams flour"
  const gramsMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:g|grams?)\s+(.+)/i);
  if (gramsMatch) {
    return {
      amount: parseFloat(gramsMatch[1]),
      unit: 'g',
      name: gramsMatch[2].trim(),
    };
  }

  // Pattern for fractions: "1 1/2 cups flour" or "1/2 cup flour"
  const fractionMatch = trimmed.match(/^(\d+)?\s*(\d+)\/(\d+)\s+(cups?|tablespoons?|tbsp|teaspoons?|tsp)\s+(.+)/i);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    const amount = whole + (numerator / denominator);
    return {
      amount,
      unit: normalizeUnit(fractionMatch[4]),
      name: fractionMatch[5].trim(),
    };
  }

  // Pattern for whole numbers with volume: "2 cups flour"
  const volumeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+(cups?|tablespoons?|tbsp|teaspoons?|tsp)\s+(.+)/i);
  if (volumeMatch) {
    return {
      amount: parseFloat(volumeMatch[1]),
      unit: normalizeUnit(volumeMatch[2]),
      name: volumeMatch[3].trim(),
    };
  }

  return null;
}

/**
 * Normalize unit names to standard format
 */
function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase();
  if (lower.startsWith('cup')) return 'cup';
  if (lower === 'tablespoons' || lower === 'tablespoon' || lower === 'tbsp') return 'tablespoon';
  if (lower === 'teaspoons' || lower === 'teaspoon' || lower === 'tsp') return 'teaspoon';
  return lower;
}

/**
 * Convert volume measurement to grams
 */
export function volumeToGrams(amount: number, unit: string, ingredientName: string): number {
  const name = ingredientName.toLowerCase();

  // Build conversion key
  const key = `${unit} ${name}`.toLowerCase();

  // Try exact match
  for (const [convKey, grams] of Object.entries(UNIT_TO_GRAMS)) {
    if (key.includes(convKey.split(' ')[1]) && convKey.startsWith(unit)) {
      return amount * grams;
    }
  }

  // Default conversions
  if (unit === 'cup') {
    if (name.includes('flour')) return amount * 120;
    if (name.includes('liquid') || name.includes('water') || name.includes('milk')) return amount * 240;
    return amount * 200; // Default cup weight
  }
  if (unit === 'tablespoon') {
    if (name.includes('flour')) return amount * 8;
    return amount * 15; // Default tablespoon is ~15g for most liquids
  }
  if (unit === 'teaspoon') {
    return amount * 5;
  }

  return amount; // Assume grams if unknown
}

/**
 * Convert grams to volume measurement
 */
export function gramsToVolume(grams: number, ingredientType: 'discard' | 'flour' | 'liquid'): { amount: number; unit: string; display: string } {
  let amount: number;
  let unit: string;

  if (ingredientType === 'discard') {
    // 100g discard ≈ 1/2 cup (scant)
    if (grams >= 100) {
      amount = grams / 200; // 200g = 1 cup
      unit = 'cup';
    } else if (grams >= 30) {
      amount = grams / 50; // Approximate
      unit = 'cup';
    } else {
      amount = grams / 12.5; // ~2 tbsp per 25g
      unit = 'tablespoon';
    }
  } else if (ingredientType === 'flour') {
    // 120g flour ≈ 1 cup
    if (grams >= 60) {
      amount = grams / 120;
      unit = 'cup';
    } else if (grams >= 15) {
      amount = grams / 8;
      unit = 'tablespoon';
    } else {
      amount = grams / 2.6;
      unit = 'teaspoon';
    }
  } else {
    // Liquid: 240g ≈ 1 cup
    if (grams >= 60) {
      amount = grams / 240;
      unit = 'cup';
    } else if (grams >= 15) {
      amount = grams / 15;
      unit = 'tablespoon';
    } else {
      amount = grams / 5;
      unit = 'teaspoon';
    }
  }

  // Format the display string
  const display = formatVolumeAmount(amount, unit);
  return { amount, unit, display };
}

/**
 * Format a volume amount to practical measurements
 */
export function formatVolumeAmount(amount: number, unit: string): string {
  // Round to practical measurements
  if (unit === 'cup') {
    if (amount >= 0.9 && amount <= 1.1) return '1 cup';
    if (amount >= 0.45 && amount < 0.55) return '1/2 cup';
    if (amount >= 0.7 && amount < 0.8) return '3/4 cup';
    if (amount >= 0.3 && amount < 0.4) return '1/3 cup';
    if (amount >= 0.2 && amount < 0.3) return '1/4 cup';

    // Handle complex fractions
    const whole = Math.floor(amount);
    const fraction = amount - whole;

    if (fraction < 0.1) {
      return whole === 1 ? '1 cup' : `${whole} cups`;
    }

    let fractionStr = '';
    if (fraction >= 0.45 && fraction < 0.55) fractionStr = '1/2';
    else if (fraction >= 0.7 && fraction < 0.8) fractionStr = '3/4';
    else if (fraction >= 0.3 && fraction < 0.4) fractionStr = '1/3';
    else if (fraction >= 0.2 && fraction < 0.3) fractionStr = '1/4';
    else if (fraction >= 0.1 && fraction < 0.2) fractionStr = '2 tbsp';

    if (fractionStr.includes('tbsp')) {
      if (whole > 0) {
        return `${whole} cup${whole > 1 ? 's' : ''} + ${fractionStr}`;
      }
      return fractionStr;
    }

    if (whole > 0 && fractionStr) {
      return `${whole} ${fractionStr} cups`;
    } else if (whole > 0) {
      return `${whole} cup${whole > 1 ? 's' : ''}`;
    } else if (fractionStr) {
      return `${fractionStr} cup`;
    }

    return `${amount.toFixed(2)} cups`;
  }

  if (unit === 'tablespoon') {
    const rounded = Math.round(amount);
    if (rounded === 1) return '1 tablespoon';
    if (rounded >= 1) return `${rounded} tablespoons`;
    return `${Math.round(amount * 3)} teaspoons`;
  }

  if (unit === 'teaspoon') {
    const rounded = Math.round(amount);
    if (rounded === 1) return '1 teaspoon';
    return `${rounded} teaspoons`;
  }

  return `${amount.toFixed(1)} ${unit}`;
}

/**
 * Round to nearest 10g for clean numbers
 */
export function roundToNearest10(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Calculate discard amount based on total flour weight
 */
export function calculateDiscardAmount(totalFlourGrams: number): number {
  let discardAmount: number;

  if (totalFlourGrams <= 300) {
    discardAmount = totalFlourGrams * 0.40;
  } else if (totalFlourGrams <= 500) {
    discardAmount = totalFlourGrams * 0.30;
  } else {
    discardAmount = 150; // Cap at 150g for large recipes
  }

  return roundToNearest10(discardAmount);
}

/**
 * Identify liquid ingredients by type with priority
 */
export function identifyLiquidType(name: string): { type: string; priority: number } {
  const lower = name.toLowerCase();

  for (let i = 0; i < LIQUID_PRIORITY.length; i++) {
    if (lower.includes(LIQUID_PRIORITY[i])) {
      return { type: LIQUID_PRIORITY[i], priority: i };
    }
  }

  // Check for generic liquid indicators
  if (lower.includes('liquid') || lower.includes('cream')) {
    return { type: 'liquid', priority: LIQUID_PRIORITY.length };
  }

  return { type: 'other', priority: LIQUID_PRIORITY.length + 1 };
}

/**
 * Main conversion function for quick breads
 */
export function convertQuickBreadToDiscard(
  recipeName: string,
  ingredients: ParsedIngredient[],
  originalMethod: string,
  originalRecipeText: string
): QuickBreadConversionResult {
  const isVolumeBasedRecipe = detectUnitFormat(originalRecipeText) === 'volume';
  const warnings: RecipeWarning[] = [];
  const notes: string[] = [];

  // Classify ingredients
  const flourIngredients = ingredients.filter(i => i.type === 'flour');
  const liquidIngredients = ingredients.filter(i =>
    i.type === 'liquid' ||
    i.name.toLowerCase().includes('sour cream') ||
    i.name.toLowerCase().includes('yogurt') ||
    i.name.toLowerCase().includes('buttermilk') ||
    i.name.toLowerCase().includes('milk') ||
    i.name.toLowerCase().includes('water') ||
    i.name.toLowerCase().includes('juice')
  );

  // Calculate total flour
  const totalFlourGrams = flourIngredients.reduce((sum, f) => sum + f.amount, 0);

  // Step 1: Calculate discard amount
  const discardAmountGrams = calculateDiscardAmount(totalFlourGrams);

  // Step 2: Calculate flour reduction (50% of discard)
  const flourReductionGrams = discardAmountGrams * 0.50;

  // Step 3: Calculate liquid reduction (50% of discard)
  const totalLiquidReductionGrams = discardAmountGrams * 0.50;

  // Find primary flour (largest amount) for reduction
  const sortedFlours = [...flourIngredients].sort((a, b) => b.amount - a.amount);
  const primaryFlour = sortedFlours[0];

  // Sort liquids by priority
  const sortedLiquids = [...liquidIngredients].sort((a, b) => {
    const aType = identifyLiquidType(a.name);
    const bType = identifyLiquidType(b.name);
    return aType.priority - bType.priority;
  });

  // Build converted ingredients
  const convertedIngredients: QuickBreadIngredient[] = [];
  const liquidReductions: Array<{ name: string; amount: number; unit: string }> = [];

  // Process flour ingredients
  let flourReductionRemaining = flourReductionGrams;
  for (const flour of flourIngredients) {
    const converted: QuickBreadIngredient = {
      name: flour.name,
      amount: flour.amount,
      originalAmount: flour.amount,
      unit: flour.unit,
      originalUnit: flour.unit,
      type: 'flour',
      isAdjusted: false,
    };

    // Reduce primary flour
    if (flour === primaryFlour && flourReductionRemaining > 0) {
      const reduction = Math.min(flourReductionRemaining, flour.amount * 0.75); // Don't reduce more than 75%
      converted.amount = flour.amount - reduction;
      converted.isAdjusted = true;

      if (isVolumeBasedRecipe) {
        const originalVolume = gramsToVolume(flour.amount, 'flour');
        const newVolume = gramsToVolume(converted.amount, 'flour');
        converted.adjustmentNote = `reduced from ${originalVolume.display}`;
        converted.originalUnit = originalVolume.unit;
        converted.unit = newVolume.unit;
      } else {
        converted.adjustmentNote = `reduced from ${flour.amount}g`;
      }

      flourReductionRemaining -= reduction;
    }

    convertedIngredients.push(converted);
  }

  // Process liquid ingredients with priority-based reduction
  let liquidReductionRemaining = totalLiquidReductionGrams;
  let liquidReductionSplitNeeded = false;

  for (const liquid of sortedLiquids) {
    const converted: QuickBreadIngredient = {
      name: liquid.name,
      amount: liquid.amount,
      originalAmount: liquid.amount,
      unit: liquid.unit,
      originalUnit: liquid.unit,
      type: 'liquid',
      isAdjusted: false,
    };

    if (liquidReductionRemaining > 0) {
      const minAmount = liquid.amount * 0.25; // Don't go below 25% of original
      const maxReduction = liquid.amount - minAmount;
      const actualReduction = Math.min(liquidReductionRemaining, maxReduction);

      if (actualReduction > 0) {
        converted.amount = liquid.amount - actualReduction;
        converted.isAdjusted = true;

        if (isVolumeBasedRecipe) {
          const originalVolume = gramsToVolume(liquid.amount, 'liquid');
          const newVolume = gramsToVolume(converted.amount, 'liquid');
          converted.adjustmentNote = `reduced from ${originalVolume.display}`;
          converted.originalUnit = originalVolume.unit;
          converted.unit = newVolume.unit;
        } else {
          converted.adjustmentNote = `reduced from ${liquid.amount}g`;
        }

        liquidReductions.push({
          name: liquid.name,
          amount: actualReduction,
          unit: isVolumeBasedRecipe ? gramsToVolume(actualReduction, 'liquid').unit : 'g',
        });

        liquidReductionRemaining -= actualReduction;

        // Check if we had to split across multiple liquids
        if (liquidReductionRemaining > 0 && actualReduction < totalLiquidReductionGrams) {
          liquidReductionSplitNeeded = true;
        }

        // Add note if liquid went to minimum
        if (converted.amount <= minAmount) {
          notes.push(`${liquid.name} was significantly reduced. If batter seems too thick, add 1-2 tablespoons of milk.`);
        }
      }
    }

    convertedIngredients.push(converted);
  }

  // Handle case where no liquid ingredients detected
  if (liquidIngredients.length === 0) {
    notes.push("This recipe has minimal liquid. You may need to reduce mixing time slightly as discard adds moisture.");
  }

  // Add other ingredients (not flour or liquid)
  for (const ing of ingredients) {
    if (ing.type !== 'flour' &&
        !liquidIngredients.includes(ing)) {
      convertedIngredients.push({
        name: ing.name,
        amount: ing.amount,
        originalAmount: ing.amount,
        unit: ing.unit,
        originalUnit: ing.unit,
        type: ing.type as QuickBreadIngredient['type'] || 'other',
        isAdjusted: false,
      });
    }
  }

  // Step 4: Check leavener balance
  const hasBakingSoda = /baking\s*soda|bicarbonate\s*of\s*soda|sodium\s*bicarbonate/i.test(originalRecipeText);
  if (!hasBakingSoda && hasOnlyBakingPowder(originalRecipeText)) {
    notes.push("Optional: Replace 1/4 tsp baking powder with 1/8 tsp baking soda to react with the discard's natural acidity.");
  }

  // Check for gluten-free flour
  if (hasGlutenFreeFlour(originalRecipeText)) {
    warnings.push({
      type: 'info',
      message: "Results may vary with gluten-free flours. Consider starting with half the suggested discard if you're unsure.",
    });
  }

  // Build summary
  let discardDisplay: string;
  let flourReductionDisplay: string;
  let liquidReductionDisplay: string;

  if (isVolumeBasedRecipe) {
    const discardVolume = gramsToVolume(discardAmountGrams, 'discard');
    const flourVolume = gramsToVolume(flourReductionGrams, 'flour');

    discardDisplay = `${discardVolume.display} sourdough discard added`;
    flourReductionDisplay = `Flour reduced by ${flourVolume.display}`;

    if (liquidReductions.length > 0) {
      const totalLiquidDisplay = liquidReductions
        .map(lr => `${lr.name} by ${gramsToVolume(lr.amount, 'liquid').display}`)
        .join(', ');
      liquidReductionDisplay = totalLiquidDisplay;
    } else {
      liquidReductionDisplay = 'No liquid reduction needed';
    }
  } else {
    discardDisplay = `${discardAmountGrams}g sourdough discard added`;
    flourReductionDisplay = `Flour reduced by ${flourReductionGrams}g`;

    if (liquidReductions.length > 0) {
      const totalLiquidDisplay = liquidReductions
        .map(lr => `${lr.name} by ${lr.amount}g`)
        .join(', ');
      liquidReductionDisplay = totalLiquidDisplay;
    } else {
      liquidReductionDisplay = 'No liquid reduction needed';
    }
  }

  // Generate converted method
  const convertedMethod = generateConvertedMethod(originalMethod, isVolumeBasedRecipe);

  return {
    recipeName: `${recipeName} — Converted for Sourdough Discard`,
    originalIngredients: ingredients.map(i => ({
      name: i.name,
      amount: i.amount,
      originalAmount: i.amount,
      unit: i.unit,
      originalUnit: i.unit,
      type: i.type as QuickBreadIngredient['type'] || 'other',
      isAdjusted: false,
    })),
    convertedIngredients,
    discardAmount: discardAmountGrams,
    discardUnit: isVolumeBasedRecipe ? gramsToVolume(discardAmountGrams, 'discard').unit : 'g',
    flourReduction: flourReductionGrams,
    flourReductionUnit: isVolumeBasedRecipe ? gramsToVolume(flourReductionGrams, 'flour').unit : 'g',
    liquidReductions,
    originalMethod,
    convertedMethod,
    warnings,
    notes,
    summary: {
      discardAdded: discardDisplay,
      flourReduced: flourReductionDisplay,
      liquidReduced: liquidReductionDisplay,
    },
    isVolumeBasedRecipe,
    hasBakingSoda,
  };
}

/**
 * Generate converted method with discard addition step
 */
function generateConvertedMethod(originalMethod: string, isVolumeBased: boolean): string {
  if (!originalMethod || originalMethod.trim().length === 0) {
    return 'Add sourdough discard with the wet ingredients and mix until just combined.';
  }

  // Find the best place to insert the discard instruction
  // Look for wet ingredient mixing step
  const wetIngredientPatterns = [
    /(add(?:ed)?\s+(?:the\s+)?(?:eggs?|milk|butter|oil|vanilla|sour\s*cream|yogurt|buttermilk)[^.]*\.)/gi,
    /(mix(?:ed)?\s+(?:the\s+)?wet\s+ingredients[^.]*\.)/gi,
    /(combine(?:d)?\s+(?:the\s+)?(?:eggs?|milk|butter)[^.]*\.)/gi,
    /(in\s+a\s+(?:separate\s+)?bowl,?\s*(?:whisk|mix|combine)[^.]*\.)/gi,
  ];

  let modifiedMethod = originalMethod;
  let inserted = false;

  for (const pattern of wetIngredientPatterns) {
    const match = originalMethod.match(pattern);
    if (match && !inserted) {
      const insertPoint = match[0];
      const discardInstruction = ' Add sourdough discard and mix until just combined.';
      modifiedMethod = originalMethod.replace(insertPoint, insertPoint + discardInstruction);
      inserted = true;
      break;
    }
  }

  // If no good insertion point found, add at the beginning
  if (!inserted) {
    modifiedMethod = 'Add sourdough discard with the wet ingredients and mix until just combined.\n\n' + originalMethod;
  }

  return modifiedMethod;
}

/**
 * Format ingredient for display in the output
 */
export function formatIngredientDisplay(ingredient: QuickBreadIngredient, isVolumeBased: boolean): string {
  let amountStr: string;

  if (isVolumeBased && ingredient.unit !== 'g') {
    amountStr = formatVolumeAmount(ingredient.amount, ingredient.unit);
  } else if (isVolumeBased && ingredient.unit === 'g') {
    // Convert grams to volume for display
    const ingredientType = ingredient.type === 'flour' ? 'flour' : 'liquid';
    const volume = gramsToVolume(ingredient.amount, ingredientType);
    amountStr = volume.display;
  } else {
    amountStr = `${Math.round(ingredient.amount)}g`;
  }

  let display = `${amountStr} ${ingredient.name}`;

  if (ingredient.isAdjusted && ingredient.adjustmentNote) {
    display += ` (${ingredient.adjustmentNote})`;
  }

  return display;
}

/**
 * Generate the discard ingredient line for display
 */
export function formatDiscardIngredient(discardAmountGrams: number, isVolumeBased: boolean): string {
  if (isVolumeBased) {
    const volume = gramsToVolume(discardAmountGrams, 'discard');
    return `${volume.display} sourdough discard (unfed starter)`;
  }
  return `${discardAmountGrams}g sourdough discard (unfed starter)`;
}
