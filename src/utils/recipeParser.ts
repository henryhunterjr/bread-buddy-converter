import { ParsedIngredient, ParsedRecipe } from '@/types/recipe';

/**
 * Volume→weight conversion via canonical units + per-ingredient density.
 * Units are normalized first (cups→cup, tablespoons→tbsp, etc.) so plural
 * and long-form units always convert. Density is stored as grams per US cup;
 * tbsp = cup/16, tsp = cup/48 (standard US measure relationships).
 * First matching pattern wins — keep most-specific patterns first.
 */
const GRAMS_PER_CUP: Array<[RegExp, number]> = [
  [/milk\s*powder|dry\s*milk/, 128],
  [/bread\s*flour/, 127],          // King Arthur: 120g; USDA: ~127-130g
  [/whole\s*wheat|wholemeal|graham/, 113],
  [/rye/, 102],
  [/spelt/, 113],
  [/semolina/, 163],
  [/flour/, 120],                  // AP flour default
  [/buttermilk/, 245],
  [/cream/, 238],                  // heavy cream
  [/milk/, 245],
  [/water/, 237],
  [/oil/, 218],
  [/butter/, 227],                 // 2 sticks
  [/kosher\s*salt/, 230],          // Morton kosher (~14g/tbsp). Diamond Crystal is ~half — see warning
  [/salt/, 288],                   // fine/table salt (6g/tsp, 18g/tbsp)
  [/yeast/, 144],                  // instant/active dry (~3g/tsp)
  [/honey|molasses/, 340],
  [/syrup/, 312],                  // maple syrup
  [/sugar/, 200],                  // granulated
  [/starter|levain/, 240],         // 100%-hydration starter, stirred down
];

/** Grams per ml for liquids measured by volume (default 1.0 = water) */
const GRAMS_PER_ML: Array<[RegExp, number]> = [
  [/honey|molasses/, 1.42],
  [/syrup/, 1.33],
  [/oil/, 0.92],
  [/cream/, 0.99],
  [/milk/, 1.03],
];

type CanonicalUnit = 'cup' | 'tbsp' | 'tsp' | 'ml' | 'g' | 'oz' | 'lb' | 'kg' | 'l' | null;

/** Normalize any written unit (plural, long-form, abbreviated) to a canonical token */
function canonicalUnit(unit: string): CanonicalUnit {
  const u = unit.toLowerCase().replace(/\.$/, '').replace(/s$/, '');
  switch (u) {
    case 'cup': case 'c': return 'cup';
    case 'tablespoon': case 'tbsp': case 'tb': case 'tbl': return 'tbsp';
    case 'teaspoon': case 'tsp': return 'tsp';
    case 'ml': case 'milliliter': case 'millilitre': return 'ml';
    case 'g': case 'gram': case 'gm': return 'g';
    case 'oz': case 'ounce': return 'oz';
    case 'lb': case 'pound': return 'lb';
    case 'kg': case 'kilogram': return 'kg';
    case 'l': case 'liter': case 'litre': return 'l';
    default: return null;
  }
}

const FLOUR_KEYWORDS = ['flour', 'wheat', 'rye', 'spelt'];
const LIQUID_KEYWORDS = ['water', 'milk', 'buttermilk'];
const STARTER_KEYWORDS = ['starter', 'sourdough starter'];
const YEAST_KEYWORDS = ['yeast', 'instant yeast', 'active dry yeast'];
const SALT_KEYWORDS = ['salt', 'kosher salt', 'sea salt', 'fine salt', 'coarse salt', 'flaky salt'];
const FAT_KEYWORDS = ['butter', 'oil', 'lard', 'shortening', 'cream', 'heavy cream'];
const ENRICHMENT_KEYWORDS = ['egg', 'eggs'];
const SWEETENER_KEYWORDS = ['sugar', 'honey', 'syrup', 'molasses'];

// Core ingredient keywords for compound detection
const CORE_INGREDIENTS = ['water', 'milk', 'butter', 'oil', 'egg', 'flour', 'yeast', 'sugar', 'salt', 'starter', 'honey'];

// Detect and split compound ingredient lines (multiple ingredients on one line)
// DISABLED: Normalization now handles splitting via regex patterns
function splitCompoundIngredients(line: string): string[] {
  // The compound splitting algorithm was causing bugs where:
  // - Wrong measurements were assigned to ingredients
  // - Ingredient names got contaminated with other ingredients' text
  //
  // Now we rely on normalization (line 208) to split compound lines
  // by adding newlines after closing parens when followed by measurements
  //
  // Example: "120ml water (temp) 57g butter" becomes two lines:
  //   "120ml water (temp)"
  //   "57g butter"

  return [line];  // Just return the line as-is
}

// Enhanced egg detection pattern
function extractEggFromLine(line: string): { count: number; fullText: string } | null {
  const lower = line.toLowerCase();

  // CRITICAL: Skip egg wash, topping, and finishing eggs (not part of dough)
  // CHECK THESE FIRST before matching egg patterns
  const skipPatterns = [
    /egg\s+wash/i,
    /for\s+(?:egg\s+)?wash/i,
    /beaten/i,  // Broader: skip ANY line with "beaten" (usually egg wash)
    /for\s+brushing/i,
    /for\s+topping/i,
    /for\s+finishing/i,
    /for\s+glazing/i,
    /to\s+brush/i,
    /egg,\s*beaten/i,  // "1 egg, beaten with water"
  ];

  if (skipPatterns.some(pattern => pattern.test(line))) {
    console.log(`Skipping egg (not a dough ingredient): "${line}"`);
    return null;
  }

  // Pattern: "1 large egg", "2 eggs", "1 egg, room temperature"
  // But NOT if followed by "beaten" or other wash indicators
  const eggPattern = /(\d+)\s*(large|medium|extra[\s-]?large|xl)?\s*eggs?(?:\s*,\s*(?!beaten)[^,\n]+)?/i;
  const match = lower.match(eggPattern);

  if (match) {
    const count = parseInt(match[1]);
    // Find the full context in the original line (preserve capitalization)
    const fullMatch = line.match(new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const fullText = fullMatch ? fullMatch[0] : match[0];

    console.log(`✓ Detected egg: "${fullText}" (count: ${count})`);
    return { count, fullText };
  }

  return null;
}

function isValidIngredientLine(line: string): boolean {
  // Skip obvious non-ingredients
  const skipPatterns = [
    /https?:\/\//i,                    // URLs
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,      // Dates (11/8/25)
    /\d+\s*min\s*read/i,               // "6 min read"
    /back\s*to\s*blog/i,               // Navigation
    /baking\s*great\s*bread/i,         // Site name
    /henry\s*hunter/i,                 // Author name
    /^\s*\d+\/\d+\s*$/,                // Page numbers (1/17)
    /ultimate\s*dinner\s*rolls/i,      // Recipe title
    /november\s*\d+,?\s*\d{4}/i,       // "November 8, 2025"
    /prep\s*time|cook\s*time|total\s*time/i, // Metadata headers
    /for\s+(?:brushing|finishing|topping|glazing|egg\s+wash|wash)/i,  // Finishing ingredients
    /(?:after|before)\s+baking/i,      // Pre/post-bake finishes
    /egg\s+wash/i,                     // Egg wash
    // NOTE: "(optional)" ingredients are intentionally KEPT — dropping them
    // silently changed dough totals. createIngredient strips the annotation.
  ];

  // Must contain a measurement word + ingredient word
  const hasMeasurement = /\d+(?:\.\d+)?(?:\s*\d+\/\d+)?\s*(?:\(.*?\))?\s*(g|grams?|kg|kilograms?|ml|l|liters?|litres?|oz|ounces?|lbs?|pounds?|cups?|tablespoons?|tbsp|teaspoons?|tsp)\b/i.test(line);
  const hasIngredient = /(flour|water|milk|butter|oil|egg|sugar|salt|yeast|starter|cream|honey|syrup|molasses|agave)/i.test(line);

  // Skip if matches any skip pattern
  if (skipPatterns.some(pattern => pattern.test(line))) {
    return false;
  }

  // Must have both measurement AND ingredient
  return hasMeasurement && hasIngredient;
}

// Export for use in converter
export { detectSpecialTechniques };

export function parseRecipe(recipeText: string, starterHydration: number = 100): ParsedRecipe {
  const ingredients: ParsedIngredient[] = [];
  let method = '';
  
  // First, split by common method indicators to separate ingredients from method
  const methodKeywords = ['method:', 'instructions:', 'directions:', 'steps:'];
  let ingredientsSection = recipeText;
  let methodSection = '';
  
  const lowerText = recipeText.toLowerCase();
  let methodStartIndex = -1;
  
  for (const keyword of methodKeywords) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1 && (methodStartIndex === -1 || index < methodStartIndex)) {
      methodStartIndex = index;
    }
  }
  
  if (methodStartIndex !== -1) {
    ingredientsSection = recipeText.substring(0, methodStartIndex);
    methodSection = recipeText.substring(methodStartIndex);
  }
  
  // Normalize the ingredients section:
  // 1. Replace asterisks with newlines
  // 2. Add newlines before common measurement patterns to split continuous text
  // 3. Split compound lines (multiple ingredients on one line)
  let normalized = ingredientsSection
    .replace(/\s*\*\s*/g, '\n')  // Replace asterisks with newlines
    .replace(/\s+(\d+(?:\.\d+)?)\s*(g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)(?=\s)/gi, '\n$1$2 ')  // Add newline before measurements (with optional space between number and unit)
    .replace(/\s+(\d+)\s+(\d+)\/(\d+)\s+/g, '\n$1 $2/$3 ')  // Add newline before fractions
    .replace(/\)\s+(\d+[\d\/]*\s*(?:cup|tablespoon|teaspoon|tbsp|tsp|g|ml|grams?))/gi, ')\n$1');  // Split after closing paren if followed by measurement
    
  const lines = normalized.split('\n');
  
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or very short lines
    if (!trimmed || trimmed.length < 5) continue;
    
    // Skip lines that don't contain numbers (likely titles or section headers)
    if (!/\d/.test(trimmed)) continue;
    
    // Skip lines that are just metadata (like "Prep Time:", "Yield:", etc.)
    if (/^(prep|bake|fermentation|total|yield|servings?|category|cuisine|difficulty|calories)[\s:]/i.test(trimmed)) continue;

    // CRITICAL FIX: Remove "plus extra for kneading" notes from ingredient lines
    // This handles cases like "500g flour, plus 25-50g more for kneading"
    // Remove the extra portion but keep the main ingredient
    let cleanedLine = trimmed.replace(/,?\s*(plus|extra|additional)\s+\d+(?:-\d+)?\s*(?:g|grams?)\s+.*?\s+(for|as)\s+(kneading|dusting|rolling|sprinkling|surface).*$/i, '');
    
    // If the line was ONLY about extra (nothing left after cleaning), skip it
    if (cleanedLine.trim().length < 5 || !/\d/.test(cleanedLine)) {
      console.log('Skipping extra-only line:', trimmed);
      continue;
    }
    
    // Use the cleaned line for further processing
    const processLine = cleanedLine.trim();

    // PRIORITY: Check for egg first (before splitting)
    const eggData = extractEggFromLine(processLine);
    if (eggData) {
      // Create egg ingredient directly
      const eggIngredient: ParsedIngredient = {
        name: eggData.fullText,
        amount: eggData.count * 50, // 50g per large egg
        unit: 'g',
        type: 'enrichment'
      };
      ingredients.push(eggIngredient);
      console.log(`Added egg ingredient: ${eggData.count}x eggs = ${eggIngredient.amount}g`);
      
      // Remove the egg text from the line before processing other ingredients
      const lineWithoutEgg = processLine.replace(new RegExp(eggData.fullText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
      
      // If there's still content, process it
      if (lineWithoutEgg && lineWithoutEgg.length > 5 && /\d/.test(lineWithoutEgg)) {
        const segments = splitCompoundIngredients(lineWithoutEgg);
        for (const segment of segments) {
          const ingredient = parseIngredientLine(segment);
          if (ingredient) {
            ingredients.push(ingredient);
          }
        }
      }
      continue; // Move to next line
    }

    // Check for compound ingredients (multiple ingredients on one line)
    const segments = splitCompoundIngredients(processLine);
    for (const segment of segments) {
      const ingredient = parseIngredientLine(segment);
      if (ingredient) {
        ingredients.push(ingredient);
      }
    }
  }
  
  method = methodSection.trim();

  // Calculate totals
  const totalFlour = ingredients
    .filter(i => i.type === 'flour')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalLiquid = ingredients
    .filter(i => i.type === 'liquid')
    .reduce((sum, i) => sum + i.amount, 0);

  const starterAmount = ingredients
    .filter(i => i.type === 'starter')
    .reduce((sum, i) => sum + i.amount, 0);

  const yeastAmount = ingredients
    .filter(i => i.type === 'yeast')
    .reduce((sum, i) => sum + i.amount, 0);

  const saltAmount = ingredients
    .filter(i => i.type === 'salt')
    .reduce((sum, i) => sum + i.amount, 0);

  // Adjust for starter using specified hydration
  // Formula: if starter is X% hydration, then flour = starter / (1 + X/100), water = starter * (X/100) / (1 + X/100)
  const starterFlourRatio = 100 / (100 + starterHydration);
  const starterWaterRatio = starterHydration / (100 + starterHydration);
  const adjustedFlour = totalFlour + (starterAmount * starterFlourRatio);
  const adjustedLiquid = totalLiquid + (starterAmount * starterWaterRatio);
  const hydration = adjustedFlour > 0 ? (adjustedLiquid / adjustedFlour) * 100 : 0;

  return {
    ingredients,
    method: method.trim(),
    totalFlour: adjustedFlour,
    totalLiquid: adjustedLiquid,
    starterAmount,
    yeastAmount,
    saltAmount,
    hydration
  };
}

function parseIngredientLine(line: string): ParsedIngredient | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;
  
  // CRITICAL: Validate ingredient line first
  if (!isValidIngredientLine(trimmed)) {
    console.log(`Skipping non-ingredient line: "${trimmed}"`);
    return null;
  }

  const lower = trimmed.toLowerCase();
  
  // Enhanced cleaning - handle en-dash, em-dash, colon separators, and OR alternatives
  let cleaned = lower
    .replace(/^[-•*]\s*/, '')                    // Leading bullets
    .replace(/\s*[–—:]\s*/g, ' ')                // Replace en-dash, em-dash, colon with space
    .replace(/\s+or\s+\d+[gml]/i, '')            // Remove "OR 10g yeast" alternatives (keep first amount)
    .trim();
  
  // CRITICAL FIX: Extract grams from parentheses BEFORE removing them
  // Pattern: "(57g / 4 tablespoons)" or "(3/4 cup)" or "(50g)"
  const gramsInParens = cleaned.match(/\((\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:\/|\||or)?\s*[^)]*\)/);
  
  // Remove parenthetical alternative measurements AFTER extracting grams
  cleaned = cleaned.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  
  // If we found grams in parentheses, use that as the primary measurement
  if (gramsInParens) {
    const amount = parseFloat(gramsInParens[1]);
    // Extract ingredient name after the parenthetical
    const nameMatch = trimmed.match(/\([^)]*\)\s*(.+)/);
    const name = nameMatch ? nameMatch[1].trim() : cleaned.replace(/^\d+(?:\.\d+)?/, '').trim();
    console.log(`Found grams in parens: ${amount}g ${name}`);
    return createIngredient(name, amount, lower);
  }
  
  // Pattern 1: "100g bread flour" or "240ml water" (grams/ml directly stated)
  const gramsFirstMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(g|grams?|ml)\s+(.+)/);
  if (gramsFirstMatch) {
    const amount = parseFloat(gramsFirstMatch[1]);
    const unit = gramsFirstMatch[2];
    const name = gramsFirstMatch[3].trim();
    // Route ml through density conversion (honey/oil/etc. are not 1g/ml)
    return createIngredient(name, convertToGrams(amount, unit, name), lower);
  }
  
  // Pattern 2: "or 590g water" or "or 10g yeast" (prefer the gram measurement after "or")
  const orGramsMatch = cleaned.match(/or\s+(\d+(?:\.\d+)?)\s*(?:g|grams?|ml)\s+(.+)/);
  if (orGramsMatch) {
    const amount = parseFloat(orGramsMatch[1]);
    const name = orGramsMatch[2].trim();
    return createIngredient(name, amount, lower);
  }
  
  // Pattern 3: Fractions "2 1/2 cups flour" or "1/2 cup water"
  const fractionMatch = cleaned.match(/^(\d+)?\s*(\d+)\/(\d+)\s+([a-z]+)\s+(.+)/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    const fractionalAmount = whole + (numerator / denominator);
    const unit = fractionMatch[4];
    const name = fractionMatch[5].trim();
    
    const grams = convertToGrams(fractionalAmount, unit, name);
    return createIngredient(name, grams, lower);
  }
  
  // Pattern 4: "2 cups flour", "3 tablespoons yeast", etc. (number + unit + name)
  const standardMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s+([a-z]+)\s+(.+)/);
  if (standardMatch) {
    let amount = parseFloat(standardMatch[1]);
    const unit = standardMatch[2];
    const name = standardMatch[3].trim();
    
    // Convert to grams if needed
    amount = convertToGrams(amount, unit, name);
    return createIngredient(name, amount, lower);
  }
  
  // Pattern 5: Just "500g flour" or "240 water" (number + optional unit + name)
  const simpleMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(.+)/);
  if (simpleMatch) {
    let amount = parseFloat(simpleMatch[1]);
    const unit = simpleMatch[2] || 'g';
    const name = simpleMatch[3].trim();
    
    // Convert to grams if needed
    amount = convertToGrams(amount, unit, name);
    return createIngredient(name, amount, lower);
  }

  return null;
}

function convertToGrams(amount: number, unit: string, name: string): number {
  const canon = canonicalUnit(unit);
  const lowerName = name.toLowerCase();

  // Eggs are counted as whole items regardless of the written unit
  if (/\begg/.test(lowerName) && canon !== 'g') {
    return amount * 50; // 1 large egg ≈ 50g
  }

  if (canon === 'g') return amount;
  if (canon === 'oz') return round1(amount * 28.35);
  if (canon === 'lb') return round1(amount * 453.6);
  if (canon === 'kg') return amount * 1000;

  if (canon === 'ml' || canon === 'l') {
    const mlAmount = canon === 'l' ? amount * 1000 : amount;
    const density = GRAMS_PER_ML.find(([re]) => re.test(lowerName))?.[1] ?? 1.0;
    return round1(mlAmount * density);
  }

  if (canon === 'cup' || canon === 'tbsp' || canon === 'tsp') {
    const perCup = GRAMS_PER_CUP.find(([re]) => re.test(lowerName))?.[1] ?? 237; // water-density fallback
    const divisor = canon === 'cup' ? 1 : canon === 'tbsp' ? 16 : 48;
    return round1((amount * perCup) / divisor);
  }

  // Unknown unit — assume the number was already grams
  return amount;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function createIngredient(name: string, amount: number, lowerLine: string): ParsedIngredient {
  // CRITICAL FIX: Clean ingredient name - remove instruction contamination
  let cleanName = name
    .replace(/,?\s*plus\s+[\d-]+g?\s+(more\s+)?for.*/gi, '') // Remove ", plus 25-50g more for kneading"
    .replace(/(beaten|whisk|mix|combine|add|stir|blend|sift|divide|turn|place|shape|cover|rise|proof|knead|instructions|step|at room temperature|room temperature|neutral).*/gi, '')
    .replace(/,?\s*(for|as|with|in|on|at|to)\s+(greasing|dusting|kneading|rolling|topping|sprinkling|bowl).*/gi, '')
    .replace(/,\s*plus\s+extra.*/gi, '')  // Remove "plus extra for dusting"
    .replace(/,\s*softened.*/gi, '')      // Remove "softened to room temperature"
    .replace(/,\s*warmed.*/gi, '')        // Remove "warmed to 105-110°F"
    .replace(/,\s*room\s+temperature.*/gi, '')  // Remove "room temperature"
    .replace(/,\s*divided.*/gi, '')       // Remove "divided"
    .replace(/,\s*melted.*/gi, '')        // Remove "melted"
    .replace(/,\s*optional.*/gi, '')      // Remove "optional, for extra richness"
    .replace(/\s+/g, ' ')
    .trim();
  
  // Determine type - CHECK MOST SPECIFIC FIRST
  let type: ParsedIngredient['type'] = 'other';
  
  // Check enrichments BEFORE flour (egg might have "flour" in contaminated text)
  // Check cream specifically as fat BEFORE checking generic liquids
  if (ENRICHMENT_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'enrichment';
  } else if (SWEETENER_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'sweetener';
  } else if (lowerLine.includes('cream') || FAT_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'fat'; // CREAM IS FAT, not liquid
  } else if (FLOUR_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'flour';
  } else if (YEAST_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'yeast';
  } else if (SALT_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'salt';
  } else if (LIQUID_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'liquid';
  } else if (STARTER_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'starter';
  }

  console.log(`Created ingredient: ${amount}g ${cleanName} [type: ${type}]`);

  return {
    name: cleanName,
    amount,
    unit: 'g',
    type
  };
}

export function validateRecipe(recipe: ParsedRecipe): string[] {
  const errors: string[] = [];

  if (recipe.totalFlour < 100) {
    errors.push("I couldn't find any flour. Please list at least one flour with an amount.");
  }

  if (recipe.totalLiquid < 50) {
    errors.push("I couldn't find enough liquid. Please include water or other liquids.");
  }

  // Check if recipe has enrichments (milk, butter, eggs, sugar)
  const hasMilk = recipe.ingredients.some(i => 
    i.type === 'liquid' && i.name.toLowerCase().includes('milk')
  );
  const hasEnrichments = recipe.ingredients.some(i => 
    i.type === 'fat' || i.type === 'enrichment' || i.type === 'sweetener'
  );
  const isEnrichedDough = hasMilk || hasEnrichments;

  // Only block on extremely unrealistic hydration (>100% = more water than flour)
  if (recipe.hydration > 100) {
    errors.push(`Your hydration calculates to ${recipe.hydration.toFixed(0)}%. That's more batter than bread dough. Double-check your flour and water amounts.`);
  }
  
  // Low hydration is unusual but not invalid - let users proceed with a warning
  // The warning will be shown in generateBakerWarnings() instead

  if (recipe.starterAmount > 0 && recipe.yeastAmount > 0) {
    errors.push("I found both yeast and starter. Pick one, then try again.");
  }

  const saltPercentage = (recipe.saltAmount / recipe.totalFlour) * 100;
  if (saltPercentage > 3.5) {
    errors.push(`Your salt is at ${saltPercentage.toFixed(1)}% of flour weight—that would taste like the ocean. Check your salt amount.`);
  }

  return errors;
}

// Special technique detection
function detectSpecialTechniques(recipeText: string): Array<{ type: 'info' | 'warning' | 'caution'; message: string }> {
  const warnings: Array<{ type: 'info' | 'warning' | 'caution'; message: string }> = [];
  const lowerText = recipeText.toLowerCase();
  
  if (lowerText.includes('tangzhong')) {
    warnings.push({
      type: 'warning',
      message: '🌾 Tangzhong Detected: This recipe uses a cooked flour-water roux. Maintain this step in your converted recipe for the signature soft texture. Cook 1 part flour with 5 parts liquid until thick, cool completely before adding to dough.'
    });
  }
  
  if (lowerText.includes('poolish') || lowerText.includes('biga')) {
    warnings.push({
      type: 'warning',
      message: '🕐 Pre-ferment Detected: This recipe uses a poolish or biga. When converting, replace this pre-ferment with the levain (for sourdough) or skip it (for yeast). Adjust water/flour in main dough accordingly.'
    });
  }
  
  if (lowerText.includes('autolyse') || lowerText.includes('autolyze')) {
    warnings.push({
      type: 'info',
      message: '💧 Autolyse Detected: This recipe includes an autolyse rest. Keep this step in your converted recipe—it improves gluten development and dough extensibility regardless of leavening method.'
    });
  }
  
  if (lowerText.includes('cold ferment') || lowerText.includes('refrigerat') && (lowerText.includes('overnight') || lowerText.includes('8') || lowerText.includes('12'))) {
    warnings.push({
      type: 'info',
      message: '❄️ Cold Fermentation Detected: This recipe includes cold fermentation. This technique works for both yeast and sourdough—it develops flavor and makes timing more flexible.'
    });
  }
  
  if (lowerText.includes('soaker')) {
    warnings.push({
      type: 'warning',
      message: '🌰 Soaker Detected: This recipe pre-soaks grains, seeds, or dried fruit. Maintain this step in your converted recipe—it prevents dry pockets and improves texture. Soak overnight in equal weight water.'
    });
  }
  
  return warnings;
}

export function generateBakerWarnings(recipe: ParsedRecipe): Array<{ type: 'info' | 'warning' | 'caution'; message: string }> {
  const warnings: Array<{ type: 'info' | 'warning' | 'caution'; message: string }> = [];
  
  // Check if recipe has enrichments
  const hasOil = recipe.ingredients.some(i => 
    i.name.toLowerCase().includes('oil') || i.name.toLowerCase().includes('butter') || i.type === 'fat'
  );
  const hasEggs = recipe.ingredients.some(i => 
    i.name.toLowerCase().includes('egg') || i.type === 'enrichment'
  );
  const hasHoney = recipe.ingredients.some(i => 
    i.name.toLowerCase().includes('honey') || i.name.toLowerCase().includes('sugar') || i.type === 'sweetener'
  );
  const isEnriched = hasOil || hasEggs || hasHoney;
  
  // Hydration warnings based on dough type
  if (isEnriched) {
    // Enriched doughs: 60-70%
    if (recipe.hydration > 70 && recipe.hydration <= 75) {
      warnings.push({
        type: 'warning',
        message: `Hydration is ${recipe.hydration.toFixed(0)}%. For enriched doughs (with butter, eggs, or sugar), 60-70% is typical. Higher hydration may make shaping difficult.`
      });
    } else if (recipe.hydration > 75) {
      warnings.push({
        type: 'caution',
        message: `Hydration is ${recipe.hydration.toFixed(0)}%, which is very high for an enriched dough. This may be too wet to handle. Consider reducing water by 5-10%.`
      });
    } else if (recipe.hydration < 55) {
      warnings.push({
        type: 'warning',
        message: `Hydration is ${recipe.hydration.toFixed(0)}%, which is quite low. The dough may be stiff and dense. Consider adding 2-5% more water.`
      });
    }
  } else {
    // Lean doughs: 70-78%
    if (recipe.hydration < 65) {
      warnings.push({
        type: 'warning',
        message: `Hydration is ${recipe.hydration.toFixed(0)}%, which is low for a lean dough. Typical artisan breads are 70-78%. This will produce a tighter crumb.`
      });
    } else if (recipe.hydration > 82) {
      warnings.push({
        type: 'caution',
        message: `Hydration is ${recipe.hydration.toFixed(0)}%, which is very high. This is ciabatta territory and requires advanced handling skills. Expect a very slack, sticky dough.`
      });
    }
  }
  
  // Salt percentage warnings
  const saltPercentage = (recipe.saltAmount / recipe.totalFlour) * 100;
  if (saltPercentage < 1.5 && saltPercentage > 0) {
    warnings.push({
      type: 'info',
      message: `Salt is at ${saltPercentage.toFixed(1)}% of flour weight. Professional bakers typically use 2%. The bread may taste bland.`
    });
  } else if (saltPercentage > 2.5 && saltPercentage <= 3.5) {
    warnings.push({
      type: 'warning',
      message: `Salt is at ${saltPercentage.toFixed(1)}% of flour weight, which is higher than the typical 2%. The bread will taste quite salty.`
    });
  }
  
  // Yeast percentage warnings
  if (recipe.yeastAmount > 0) {
    const yeastPercentage = (recipe.yeastAmount / recipe.totalFlour) * 100;
    if (yeastPercentage > 1.5) {
      warnings.push({
        type: 'info',
        message: `Instant yeast is at ${yeastPercentage.toFixed(1)}% of flour weight. This is higher than typical (0.7-1.1%). Expect a faster rise but less flavor development.`
      });
    } else if (yeastPercentage < 0.4) {
      warnings.push({
        type: 'info',
        message: `Yeast is at ${yeastPercentage.toFixed(1)}% of flour weight, which is quite low. This will result in a slower rise—plan for 2-3 hours instead of 1-1.5 hours.`
      });
    }
  }
  
  // Starter inoculation warnings — measured as starter FLOUR / total flour,
  // the same basis the converter uses (a 100%-hydration starter is half flour).
  // This keeps warnings consistent with the converter's 20% inoculation target.
  if (recipe.starterAmount > 0) {
    const starterFlour = recipe.starterAmount / 2;
    const inoculation = (starterFlour / recipe.totalFlour) * 100;
    if (inoculation < 10) {
      warnings.push({
        type: 'warning',
        message: `Starter provides only ${inoculation.toFixed(0)}% of the total flour (inoculation). Typical sourdough runs 15-25%. Bulk fermentation may take 8-12 hours or longer.`
      });
    } else if (inoculation > 30) {
      warnings.push({
        type: 'info',
        message: `Starter provides ${inoculation.toFixed(0)}% of the total flour (inoculation), higher than the typical 15-25%. Fermentation will run faster and flavor may be more acidic.`
      });
    }
  }
  
  return warnings;
}
