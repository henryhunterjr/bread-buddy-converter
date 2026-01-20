import { ParsedIngredient, ParsedRecipe } from '@/types/recipe';

const UNIT_CONVERSIONS: Record<string, number> = {
  'cup ap flour': 120,
  'cup all-purpose flour': 120,
  'cup unbleached all-purpose flour': 120,
  'cup bread flour': 130,
  'cup whole wheat': 113,
  'cup whole wheat flour': 113,
  'cup flour': 120, // default flour
  'cups flour': 120,
  'cup water': 240,
  'cups water': 240,
  'cup milk': 240,
  'cups milk': 240,
  'cup heavy cream': 240,
  'cups heavy cream': 240,
  'cup cream': 240,
  'cups cream': 240,
  'tablespoon heavy cream': 15,
  'tablespoons heavy cream': 15,
  'tbsp heavy cream': 15,
  'tablespoon cream': 15,
  'tablespoons cream': 15,
  'tbsp cream': 15,
  'cup oil': 224,
  'cups oil': 224,
  'cup vegetable oil': 224,
  'cups vegetable oil': 224,
  // BUTTER CONVERSIONS
  'cup butter': 227,
  'cups butter': 227,
  'tablespoon butter': 14,
  'tablespoons butter': 14,
  'tbsp butter': 14,
  'teaspoon butter': 5,
  'teaspoons butter': 5,
  'tsp butter': 5,
  // YEAST
  'tablespoon yeast': 10,
  'tablespoon active dry yeast': 10,
  'tablespoon instant yeast': 10,
  'tbsp yeast': 10,
  'tsp instant yeast': 3,
  'tsp active dry yeast': 3,
  'tsp yeast': 3,
  // SALT
  'tablespoon salt': 20,
  'tablespoon kosher salt': 20,
  'tablespoon sea salt': 20,
  'tablespoon fine salt': 20,
  'tbsp salt': 20,
  'tbsp kosher salt': 20,
  'tbsp sea salt': 20,
  'teaspoon salt': 6,
  'teaspoon kosher salt': 6,
  'teaspoon sea salt': 6,
  'teaspoon fine salt': 6,
  'tsp salt': 6,
  'tsp kosher salt': 6,
  'tsp sea salt': 6,
  // OIL
  'tablespoon oil': 15,
  'tbsp oil': 15,
  'tablespoon vegetable oil': 15,
  'tbsp vegetable oil': 15,
  // HONEY/SUGAR
  'tablespoon honey': 21,
  'tbsp honey': 21,
  'cup honey': 340,
  'cups honey': 340,
  'cup sugar': 200,
  'cups sugar': 200,
  // MILK POWDER
  'tablespoon milk powder': 8,
  'tablespoons milk powder': 8,
  'tbsp milk powder': 8,
  // EGG (count, not grams)
  'egg': 50,  // 1 large egg ≈ 50g
  'large egg': 50,
  'eggs': 50,
};

const FLOUR_KEYWORDS = ['flour', 'wheat', 'rye', 'spelt'];
const LIQUID_KEYWORDS = ['water', 'milk', 'buttermilk', 'sour cream', 'yogurt', 'juice'];
const STARTER_KEYWORDS = ['starter', 'sourdough starter'];
const YEAST_KEYWORDS = ['yeast', 'instant yeast', 'active dry yeast'];
const SALT_KEYWORDS = ['salt', 'kosher salt', 'sea salt', 'fine salt', 'coarse salt', 'flaky salt'];
const FAT_KEYWORDS = ['butter', 'oil', 'lard', 'shortening', 'cream', 'heavy cream'];
const ENRICHMENT_KEYWORDS = ['egg', 'eggs'];
const SWEETENER_KEYWORDS = ['sugar', 'honey', 'syrup', 'molasses'];
const CHEMICAL_LEAVENER_KEYWORDS = ['baking soda', 'baking powder', 'bicarbonate of soda', 'sodium bicarbonate'];

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
    /\(optional/i,                     // Optional ingredients
  ];

  // Must contain a measurement word + ingredient word
  const hasMeasurement = /\d+(?:\.\d+)?(?:\s*\d+\/\d+)?\s*(?:\(.*?\))?\s*(g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)/i.test(line);
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
  const gramsFirstMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:g|grams?|ml)\s+(.+)/);
  if (gramsFirstMatch) {
    const amount = parseFloat(gramsFirstMatch[1]);
    const name = gramsFirstMatch[2].trim();
    return createIngredient(name, amount, lower);
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
  if (unit === 'g' || unit === 'gram' || unit === 'grams' || unit === 'ml') {
    return amount;
  }
  
  // Build conversion key: unit + name
  const conversionKey = `${unit} ${name}`.toLowerCase();
  
  // Try exact match first
  for (const [key, grams] of Object.entries(UNIT_CONVERSIONS)) {
    if (conversionKey.includes(key)) {
      console.log(`Converting ${amount} ${unit} ${name} using key "${key}" = ${amount * grams}g`);
      return amount * grams;
    }
  }
  
  // Special handling for eggs (count as whole items)
  if (name.toLowerCase().includes('egg')) {
    console.log(`Converting ${amount} egg(s) = ${amount * 50}g`);
    return amount * 50; // 1 egg ≈ 50g
  }
  
  // If no conversion found, assume grams
  console.log(`No conversion found for "${unit} ${name}", assuming ${amount}g`);
  return amount;
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
  // Check chemical leaveners (baking soda/powder) early
  if (CHEMICAL_LEAVENER_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'other'; // Chemical leaveners stored as 'other' type, detection handled separately
  } else if (ENRICHMENT_KEYWORDS.some(k => lowerLine.includes(k))) {
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
    // Enriched doughs: 60-68%
    if (recipe.hydration > 68 && recipe.hydration <= 75) {
      warnings.push({
        type: 'warning',
        message: `Hydration is ${recipe.hydration.toFixed(0)}%. For enriched doughs (with butter, eggs, or sugar), 60-68% is typical. Higher hydration may make shaping difficult.`
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
        message: `Instant yeast is at ${yeastPercentage.toFixed(1)}% of flour weight. This is higher than typical (0.7%). Expect a faster rise but less flavor development.`
      });
    } else if (yeastPercentage < 0.4) {
      warnings.push({
        type: 'info',
        message: `Yeast is at ${yeastPercentage.toFixed(1)}% of flour weight, which is quite low. This will result in a slower rise—plan for 2-3 hours instead of 1-1.5 hours.`
      });
    }
  }
  
  // Starter percentage warnings
  if (recipe.starterAmount > 0) {
    const starterPercentage = (recipe.starterAmount / recipe.totalFlour) * 100;
    if (starterPercentage < 15) {
      warnings.push({
        type: 'warning',
        message: `Starter is only ${starterPercentage.toFixed(0)}% of total flour weight. Typical sourdough uses 15-25%. Bulk fermentation may take 8-12 hours or longer.`
      });
    } else if (starterPercentage > 30) {
      warnings.push({
        type: 'info',
        message: `Starter is ${starterPercentage.toFixed(0)}% of total flour weight, which is higher than typical (15-25%). This will speed up fermentation but may taste more acidic.`
      });
    }
  }

  return warnings;
}

/**
 * Quick Bread Recipe Parser
 * Parses quick bread recipes while preserving original units (volume or weight)
 * Used specifically for sourdough discard conversion
 */
export interface QuickBreadParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  originalText: string;
  type: 'flour' | 'liquid' | 'leavener' | 'fat' | 'sweetener' | 'enrichment' | 'other';
  amountInGrams: number; // Always calculate grams for conversion math
}

export interface QuickBreadParsedRecipe {
  ingredients: QuickBreadParsedIngredient[];
  method: string;
  totalFlourGrams: number;
  isVolumeBasedRecipe: boolean;
}

// Volume to grams conversions for quick bread parsing
const QUICK_BREAD_CONVERSIONS: Record<string, number> = {
  // Flour
  'cup_flour': 120,
  'cup_all-purpose': 120,
  'cup_bread': 130,
  'cup_whole wheat': 113,
  'cup_cake': 115,
  'tablespoon_flour': 8,
  'teaspoon_flour': 2.6,
  // Liquids
  'cup_milk': 240,
  'cup_buttermilk': 245,
  'cup_sour cream': 240,
  'cup_yogurt': 245,
  'cup_water': 240,
  'cup_juice': 240,
  'cup_oil': 224,
  'tablespoon_milk': 15,
  'tablespoon_buttermilk': 15,
  'tablespoon_sour cream': 15,
  'tablespoon_yogurt': 15,
  'tablespoon_oil': 14,
  'teaspoon_milk': 5,
  'teaspoon_vanilla': 4,
  // Sugar
  'cup_sugar': 200,
  'cup_brown sugar': 220,
  'tablespoon_sugar': 12.5,
  'teaspoon_sugar': 4,
  // Butter
  'cup_butter': 227,
  'tablespoon_butter': 14,
  'teaspoon_butter': 5,
  // Default
  'cup_default': 200,
  'tablespoon_default': 15,
  'teaspoon_default': 5,
};

function normalizeUnitName(unit: string): string {
  const u = unit.toLowerCase().trim();
  if (u.startsWith('cup')) return 'cup';
  if (u === 'tablespoons' || u === 'tablespoon' || u === 'tbsp') return 'tablespoon';
  if (u === 'teaspoons' || u === 'teaspoon' || u === 'tsp') return 'teaspoon';
  if (u === 'g' || u === 'gram' || u === 'grams') return 'g';
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return 'ml';
  return u;
}

function convertQuickBreadToGrams(amount: number, unit: string, ingredientName: string): number {
  const normalizedUnit = normalizeUnitName(unit);
  const name = ingredientName.toLowerCase();

  // If already in grams or ml, return as-is
  if (normalizedUnit === 'g' || normalizedUnit === 'ml') {
    return amount;
  }

  // Check for ingredient type matches
  if (name.includes('flour')) {
    if (name.includes('whole wheat')) {
      return amount * (QUICK_BREAD_CONVERSIONS['cup_whole wheat'] || 113);
    }
    if (name.includes('bread')) {
      return amount * (QUICK_BREAD_CONVERSIONS['cup_bread'] || 130);
    }
    if (name.includes('cake')) {
      return amount * (QUICK_BREAD_CONVERSIONS['cup_cake'] || 115);
    }
    return amount * (QUICK_BREAD_CONVERSIONS[`${normalizedUnit}_flour`] || (normalizedUnit === 'cup' ? 120 : normalizedUnit === 'tablespoon' ? 8 : 2.6));
  }

  if (name.includes('sugar') || name.includes('honey')) {
    if (name.includes('brown')) {
      return amount * (QUICK_BREAD_CONVERSIONS['cup_brown sugar'] || 220);
    }
    return amount * (QUICK_BREAD_CONVERSIONS[`${normalizedUnit}_sugar`] || (normalizedUnit === 'cup' ? 200 : normalizedUnit === 'tablespoon' ? 12.5 : 4));
  }

  if (name.includes('butter')) {
    return amount * (QUICK_BREAD_CONVERSIONS[`${normalizedUnit}_butter`] || (normalizedUnit === 'cup' ? 227 : normalizedUnit === 'tablespoon' ? 14 : 5));
  }

  if (name.includes('oil')) {
    return amount * (QUICK_BREAD_CONVERSIONS[`${normalizedUnit}_oil`] || (normalizedUnit === 'cup' ? 224 : 14));
  }

  if (name.includes('milk') || name.includes('buttermilk') || name.includes('yogurt') || name.includes('sour cream') || name.includes('water') || name.includes('juice')) {
    return amount * (QUICK_BREAD_CONVERSIONS[`${normalizedUnit}_milk`] || (normalizedUnit === 'cup' ? 240 : normalizedUnit === 'tablespoon' ? 15 : 5));
  }

  // Default conversion
  return amount * (QUICK_BREAD_CONVERSIONS[`${normalizedUnit}_default`] || amount);
}

function classifyQuickBreadIngredient(name: string): QuickBreadParsedIngredient['type'] {
  const lower = name.toLowerCase();

  // Chemical leaveners
  if (lower.includes('baking soda') || lower.includes('baking powder') || lower.includes('bicarbonate')) {
    return 'leavener';
  }

  // Flour
  if (lower.includes('flour')) {
    return 'flour';
  }

  // Liquids (including dairy that acts as liquid)
  if (lower.includes('milk') || lower.includes('buttermilk') || lower.includes('water') ||
      lower.includes('sour cream') || lower.includes('yogurt') || lower.includes('juice')) {
    return 'liquid';
  }

  // Fats
  if (lower.includes('butter') || lower.includes('oil') || lower.includes('shortening') ||
      lower.includes('lard') || lower.includes('cream cheese')) {
    return 'fat';
  }

  // Sweeteners
  if (lower.includes('sugar') || lower.includes('honey') || lower.includes('syrup') ||
      lower.includes('molasses') || lower.includes('maple')) {
    return 'sweetener';
  }

  // Enrichments
  if (lower.includes('egg')) {
    return 'enrichment';
  }

  return 'other';
}

export function parseQuickBreadRecipe(recipeText: string): QuickBreadParsedRecipe {
  const ingredients: QuickBreadParsedIngredient[] = [];
  let method = '';

  // Split by method/instructions section
  const methodKeywords = ['method:', 'instructions:', 'directions:', 'steps:', 'procedure:'];
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

  // Detect if recipe uses volume or weight
  const gramsCount = (ingredientsSection.match(/\d+\s*g(?:rams?)?\b/gi) || []).length;
  const volumeCount = (ingredientsSection.match(/\d+(?:\s*\d*\/\d+)?\s*(?:cups?|tablespoons?|tbsp|teaspoons?|tsp)\b/gi) || []).length;
  const isVolumeBasedRecipe = volumeCount > gramsCount;

  // Normalize text
  let normalized = ingredientsSection
    .replace(/\s*\*\s*/g, '\n')
    .replace(/\s+(\d+(?:\.\d+)?)\s*(g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)(?=\s)/gi, '\n$1$2 ')
    .replace(/\s+(\d+)\s+(\d+)\/(\d+)\s+/g, '\n$1 $2/$3 ')
    .replace(/\)\s+(\d+[\d\/]*\s*(?:cup|tablespoon|teaspoon|tbsp|tsp|g|ml|grams?))/gi, ')\n$1');

  const lines = normalized.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (!/\d/.test(trimmed)) continue;

    // Skip metadata lines
    if (/^(prep|bake|fermentation|total|yield|servings?|category|cuisine|difficulty|calories)[\s:]/i.test(trimmed)) continue;

    // Parse the ingredient line
    const parsed = parseQuickBreadIngredientLine(trimmed);
    if (parsed) {
      ingredients.push(parsed);
    }
  }

  method = methodSection.trim();

  // Calculate total flour in grams
  const totalFlourGrams = ingredients
    .filter(i => i.type === 'flour')
    .reduce((sum, i) => sum + i.amountInGrams, 0);

  return {
    ingredients,
    method,
    totalFlourGrams,
    isVolumeBasedRecipe,
  };
}

function parseQuickBreadIngredientLine(line: string): QuickBreadParsedIngredient | null {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  // Pattern 1: Grams "100g flour" or "100 g flour"
  const gramsMatch = lower.match(/^(\d+(?:\.\d+)?)\s*(?:g|grams?)\s+(.+)/);
  if (gramsMatch) {
    const amount = parseFloat(gramsMatch[1]);
    const name = gramsMatch[2].trim();
    return {
      name,
      amount,
      unit: 'g',
      originalText: trimmed,
      type: classifyQuickBreadIngredient(name),
      amountInGrams: amount,
    };
  }

  // Pattern 2: Fractions "1 1/2 cups flour" or "1/2 cup flour"
  const fractionMatch = lower.match(/^(\d+)?\s*(\d+)\/(\d+)\s+(cups?|tablespoons?|tbsp|teaspoons?|tsp)\s+(.+)/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    const amount = whole + (numerator / denominator);
    const unit = normalizeUnitName(fractionMatch[4]);
    const name = fractionMatch[5].trim();
    return {
      name,
      amount,
      unit,
      originalText: trimmed,
      type: classifyQuickBreadIngredient(name),
      amountInGrams: convertQuickBreadToGrams(amount, unit, name),
    };
  }

  // Pattern 3: Volume "2 cups flour"
  const volumeMatch = lower.match(/^(\d+(?:\.\d+)?)\s+(cups?|tablespoons?|tbsp|teaspoons?|tsp)\s+(.+)/);
  if (volumeMatch) {
    const amount = parseFloat(volumeMatch[1]);
    const unit = normalizeUnitName(volumeMatch[2]);
    const name = volumeMatch[3].trim();
    return {
      name,
      amount,
      unit,
      originalText: trimmed,
      type: classifyQuickBreadIngredient(name),
      amountInGrams: convertQuickBreadToGrams(amount, unit, name),
    };
  }

  // Pattern 4: Simple number with ml "240ml milk"
  const mlMatch = lower.match(/^(\d+(?:\.\d+)?)\s*ml\s+(.+)/);
  if (mlMatch) {
    const amount = parseFloat(mlMatch[1]);
    const name = mlMatch[2].trim();
    return {
      name,
      amount,
      unit: 'ml',
      originalText: trimmed,
      type: classifyQuickBreadIngredient(name),
      amountInGrams: amount, // ml roughly equals grams for most liquids
    };
  }

  // Pattern 5: Count "2 eggs"
  const eggMatch = lower.match(/^(\d+)\s+(large\s+)?(eggs?)/);
  if (eggMatch) {
    const count = parseInt(eggMatch[1]);
    return {
      name: eggMatch[0],
      amount: count,
      unit: 'count',
      originalText: trimmed,
      type: 'enrichment',
      amountInGrams: count * 50, // ~50g per large egg
    };
  }

  return null;
}
