import { ParsedIngredient, ParsedRecipe } from '@/types/recipe';

const UNIT_CONVERSIONS: Record<string, number> = {
  'cup ap flour': 120,
  'cup all-purpose flour': 120,
  'cup bread flour': 130,
  'cup whole wheat': 113,
  'cup whole wheat flour': 113,
  'cup water': 240,
  'cup milk': 240,
  'tsp instant yeast': 3,
  'tsp yeast': 3,
  'tsp salt': 6,
  'tbsp': 15,
  'tablespoon': 15,
};

const FLOUR_KEYWORDS = ['flour', 'wheat', 'rye', 'spelt'];
const LIQUID_KEYWORDS = ['water', 'milk', 'buttermilk', 'oil'];
const STARTER_KEYWORDS = ['starter', 'levain', 'sourdough'];
const YEAST_KEYWORDS = ['yeast', 'instant yeast', 'active dry yeast'];
const SALT_KEYWORDS = ['salt'];

export function parseRecipe(recipeText: string): ParsedRecipe {
  const lines = recipeText.split('\n');
  const ingredients: ParsedIngredient[] = [];
  let method = '';
  let inMethod = false;

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    if (trimmed.includes('method:') || trimmed.includes('instructions:') || trimmed.includes('directions:')) {
      inMethod = true;
      continue;
    }

    if (inMethod) {
      method += line + '\n';
      continue;
    }

    // Parse ingredient line
    const ingredient = parseIngredientLine(line);
    if (ingredient) {
      ingredients.push(ingredient);
    }
  }

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

  // Adjust for starter (100% hydration assumed)
  const adjustedFlour = totalFlour + (starterAmount / 2);
  const adjustedLiquid = totalLiquid + (starterAmount / 2);
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

  const lower = trimmed.toLowerCase();
  
  // Match patterns like "500g flour" or "2 cups water" or "3 tsp salt"
  const match = lower.match(/(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(.+)/);
  if (!match) return null;

  let amount = parseFloat(match[1]);
  const unit = match[2] || 'g';
  const name = match[3].trim();

  // Convert to grams if needed
  if (unit !== 'g' && unit !== 'gram' && unit !== 'grams') {
    const conversionKey = `${unit} ${name}`;
    for (const [key, grams] of Object.entries(UNIT_CONVERSIONS)) {
      if (conversionKey.includes(key)) {
        amount = amount * grams;
        break;
      }
    }
  }

  // Determine type
  let type: ParsedIngredient['type'] = 'other';
  
  if (STARTER_KEYWORDS.some(k => lower.includes(k))) {
    type = 'starter';
  } else if (YEAST_KEYWORDS.some(k => lower.includes(k))) {
    type = 'yeast';
  } else if (SALT_KEYWORDS.some(k => lower.includes(k))) {
    type = 'salt';
  } else if (FLOUR_KEYWORDS.some(k => lower.includes(k))) {
    type = 'flour';
  } else if (LIQUID_KEYWORDS.some(k => lower.includes(k))) {
    type = 'liquid';
  }

  return {
    name,
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

  if (recipe.hydration > 100) {
    errors.push(`Your hydration calculates to ${recipe.hydration.toFixed(0)}%. That's more batter than bread dough. Double-check your flour and water amounts.`);
  } else if (recipe.hydration < 45) {
    errors.push(`Your hydration is ${recipe.hydration.toFixed(0)}%. That's quite low. Double-check your amounts.`);
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
