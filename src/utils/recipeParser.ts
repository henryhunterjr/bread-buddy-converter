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
  'cup oil': 224,
  'cups oil': 224,
  'cup vegetable oil': 224,
  'cups vegetable oil': 224,
  // BUTTER CONVERSIONS
  'cup butter': 227,
  'cups butter': 227,
  'tablespoon butter': 14,
  'tbsp butter': 14,
  'teaspoon butter': 5,
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
  'tbsp salt': 20,
  'tsp salt': 6,
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
  // EGG (count, not grams)
  'egg': 50,  // 1 large egg ≈ 50g
  'large egg': 50,
  'eggs': 50,
};

const FLOUR_KEYWORDS = ['flour', 'wheat', 'rye', 'spelt'];
const LIQUID_KEYWORDS = ['water', 'milk', 'buttermilk'];
const STARTER_KEYWORDS = ['starter', 'sourdough starter'];
const YEAST_KEYWORDS = ['yeast', 'instant yeast', 'active dry yeast'];
const SALT_KEYWORDS = ['salt'];
const FAT_KEYWORDS = ['butter', 'oil', 'lard', 'shortening'];
const ENRICHMENT_KEYWORDS = ['egg', 'eggs'];
const SWEETENER_KEYWORDS = ['sugar', 'honey', 'syrup', 'molasses'];

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
  ];
  
  // Must contain a measurement word + ingredient word
  const hasMeasurement = /\d+(?:\.\d+)?\s*(g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)/i.test(line);
  const hasIngredient = /(flour|water|milk|butter|oil|egg|sugar|salt|yeast|starter)/i.test(line);
  
  // Skip if matches any skip pattern
  if (skipPatterns.some(pattern => pattern.test(line))) {
    return false;
  }
  
  // Must have both measurement AND ingredient
  return hasMeasurement && hasIngredient;
}

export function parseRecipe(recipeText: string): ParsedRecipe {
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
  let normalized = ingredientsSection
    .replace(/\s*\*\s*/g, '\n')  // Replace asterisks with newlines
    .replace(/\s+(\d+(?:\.\d+)?)\s*(?:g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)\s+/gi, '\n$1 ')  // Add newline before measurements
    .replace(/\s+(\d+)\s+(\d+)\/(\d+)\s+/g, '\n$1 $2/$3 ');  // Add newline before fractions
    
  const lines = normalized.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or very short lines
    if (!trimmed || trimmed.length < 5) continue;
    
    // Skip lines that don't contain numbers (likely titles or section headers)
    if (!/\d/.test(trimmed)) continue;
    
    // Skip lines that are just metadata (like "Prep Time:", "Yield:", etc.)
    if (/^(prep|bake|fermentation|total|yield|servings?|category|cuisine|difficulty|calories)[\s:]/i.test(trimmed)) continue;

    // CRITICAL FIX: Skip lines that are ONLY "extra for kneading" (not main ingredient lines)
    // Match lines that start with small amounts (under 100g) that are clearly just extra
    if (/^(plus|extra|additional)?\s*\d+(?:-\d+)?\s*(?:g|grams?)\s+.*\s+(for|as)\s+(kneading|dusting|rolling|sprinkling|surface)/i.test(trimmed) &&
        !/\d{3,}/.test(trimmed)) {  // Don't skip if it has 3+ digit numbers (main ingredient amounts)
      console.log('Skipping extra/kneading line:', trimmed);
      continue;
    }

    // Parse ingredient line
    const ingredient = parseIngredientLine(trimmed);
    if (ingredient) {
      ingredients.push(ingredient);
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

  // Debug logging
  console.log('=== PARSER CALCULATIONS ===');
  console.log('Raw totalFlour:', totalFlour);
  console.log('Raw totalLiquid:', totalLiquid);
  console.log('Raw starterAmount:', starterAmount);
  console.log('Flour ingredients:', ingredients.filter(i => i.type === 'flour').map(i => `${i.amount}g ${i.name}`));
  console.log('Liquid ingredients:', ingredients.filter(i => i.type === 'liquid').map(i => `${i.amount}g ${i.name}`));
  console.log('Starter ingredients:', ingredients.filter(i => i.type === 'starter').map(i => `${i.amount}g ${i.name}`));

  // Adjust for starter (100% hydration assumed)
  const adjustedFlour = totalFlour + (starterAmount / 2);
  const adjustedLiquid = totalLiquid + (starterAmount / 2);
  const hydration = adjustedFlour > 0 ? (adjustedLiquid / adjustedFlour) * 100 : 0;
  
  console.log('Adjusted totalFlour:', adjustedFlour);
  console.log('Adjusted totalLiquid:', adjustedLiquid);
  console.log('Calculated hydration:', hydration);

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
  
  // Handle bullet points and dashes
  let cleaned = lower.replace(/^[-•*]\s*/, '');
  
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
    .replace(/(beaten|whisk|mix|combine|add|stir|blend|sift|divide|turn|place|shape|cover|rise|proof|knead|instructions|step|at room temperature|room temperature|neutral).*/gi, '')
    .replace(/,?\s*(for|as|with|in|on|at|to)\s+(greasing|dusting|kneading|rolling|topping|sprinkling|bowl).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Determine type - CHECK MOST SPECIFIC FIRST
  let type: ParsedIngredient['type'] = 'other';
  
  // Check enrichments BEFORE flour (egg might have "flour" in contaminated text)
  if (ENRICHMENT_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'enrichment';
  } else if (SWEETENER_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'sweetener';
  } else if (FAT_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'fat';
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

  if (recipe.hydration > 100) {
    errors.push(`Your hydration calculates to ${recipe.hydration.toFixed(0)}%. That's more batter than bread dough. Double-check your flour and water amounts.`);
  } else if (recipe.hydration < 35 && !isEnrichedDough) {
    // Only enforce minimum hydration for lean doughs
    errors.push(`Your hydration is ${recipe.hydration.toFixed(0)}%. That's quite low for a lean dough. Double-check your amounts.`);
  } else if (recipe.hydration < 25 && isEnrichedDough) {
    // Enriched doughs can have lower hydration, but not too low
    errors.push(`Your hydration is ${recipe.hydration.toFixed(0)}%. Even for enriched dough, this seems low. Double-check your amounts.`);
  }

  if (recipe.starterAmount > 0 && recipe.yeastAmount > 0) {
    errors.push("I found both yeast and starter. Pick one, then try again.");
  }

  const saltPercentage = (recipe.saltAmount / recipe.totalFlour) * 100;
  if (saltPercentage > 3.5) {
    errors.push(`Your salt is at ${saltPercentage.toFixed(1)}% of flour weight—that would taste like the ocean. Check your salt amount.`);
  }

  return errors;
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
