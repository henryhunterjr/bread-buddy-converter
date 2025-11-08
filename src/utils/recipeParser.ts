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
  'tablespoon yeast': 10,
  'tablespoon active dry yeast': 10,
  'tablespoon instant yeast': 10,
  'tbsp yeast': 10,
  'tsp instant yeast': 3,
  'tsp active dry yeast': 3,
  'tsp yeast': 3,
  'tablespoon salt': 20,
  'tbsp salt': 20,
  'tsp salt': 6,
  'tablespoon oil': 15,
  'tbsp oil': 15,
  'tablespoon vegetable oil': 15,
  'tbsp vegetable oil': 15,
  'tablespoon honey': 21,
  'tbsp honey': 21,
  'cup honey': 340,
  'cups honey': 340,
};

const FLOUR_KEYWORDS = ['flour', 'wheat', 'rye', 'spelt'];
const LIQUID_KEYWORDS = ['water', 'milk', 'buttermilk', 'oil'];
const STARTER_KEYWORDS = ['starter', 'levain', 'sourdough'];
const YEAST_KEYWORDS = ['yeast', 'instant yeast', 'active dry yeast'];
const SALT_KEYWORDS = ['salt'];

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
  
  // Split ingredients by BOTH asterisks AND newlines to handle different formats
  // Replace asterisks with newlines first, then split by newlines
  const normalizedIngredients = ingredientsSection.replace(/\s*\*\s*/g, '\n');
  const lines = normalizedIngredients.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines, titles, or very short lines
    if (!trimmed || trimmed.length < 5) continue;
    
    // Skip lines that look like titles (no numbers)
    if (!/\d/.test(trimmed)) continue;

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
  
  // Handle bullet points and dashes
  const cleaned = lower.replace(/^[-•*]\s*/, '');
  
  // Try to match patterns with "or" (e.g., "2 1/2 cups or 590mL water" or "1 tablespoon or 10g yeast")
  // Prefer the gram/ml measurement if available
  const orMatch = cleaned.match(/or\s+(\d+(?:\.\d+)?)\s*([a-z]+)\s+(.+)/);
  if (orMatch) {
    const amount = parseFloat(orMatch[1]);
    const unit = orMatch[2].toLowerCase();
    const name = orMatch[3].trim();
    
    // If unit is g, grams, ml, use it directly
    if (unit === 'g' || unit === 'gram' || unit === 'grams' || unit === 'ml') {
      return createIngredient(name, amount, lower);
    }
  }
  
  // Try to match patterns WITHOUT "or" but with direct conversion (e.g., "1 tablespoon 10g yeast")
  // This captures: number + unit + number + unit + name
  const directConversionMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*([a-z]+)\s+(\d+(?:\.\d+)?)\s*([a-z]+)\s+(.+)/);
  if (directConversionMatch) {
    const amount = parseFloat(directConversionMatch[3]); // Use the second number (grams)
    const unit = directConversionMatch[4].toLowerCase();
    const name = directConversionMatch[5].trim();
    
    // If the second unit is g or ml, use it
    if (unit === 'g' || unit === 'gram' || unit === 'grams' || unit === 'ml') {
      return createIngredient(name, amount, lower);
    }
  }
  
  // Match fractions like "2 1/2" or "1/2"
  const fractionMatch = cleaned.match(/(\d+)?\s*(\d+)\/(\d+)\s+([a-z]+)\s+(.+)/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    const amount = whole + (numerator / denominator);
    const unit = fractionMatch[4];
    const name = fractionMatch[5].trim();
    
    return createIngredient(name, convertToGrams(amount, unit, name), lower);
  }
  
  // Match patterns like "500g flour" or "2 cups water" or "3 tsp salt"
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(.+)/);
  if (!match) return null;

  let amount = parseFloat(match[1]);
  const unit = match[2] || 'g';
  const name = match[3].trim();

  // Convert to grams if needed
  amount = convertToGrams(amount, unit, name);

  return createIngredient(name, amount, lower);
}

function convertToGrams(amount: number, unit: string, name: string): number {
  if (unit === 'g' || unit === 'gram' || unit === 'grams' || unit === 'ml') {
    return amount;
  }
  
  const conversionKey = `${unit} ${name}`;
  for (const [key, grams] of Object.entries(UNIT_CONVERSIONS)) {
    if (conversionKey.includes(key)) {
      return amount * grams;
    }
  }
  
  return amount;
}

function createIngredient(name: string, amount: number, lowerLine: string): ParsedIngredient {
  // Determine type
  let type: ParsedIngredient['type'] = 'other';
  
  if (STARTER_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'starter';
  } else if (YEAST_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'yeast';
  } else if (SALT_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'salt';
  } else if (FLOUR_KEYWORDS.some(k => lowerLine.includes(k))) {
    type = 'flour';
  } else if (LIQUID_KEYWORDS.some(k => lowerLine.includes(k))) {
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
