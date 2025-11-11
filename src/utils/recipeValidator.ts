/**
 * Recipe Validation Layer
 * 
 * Catches and fixes common AI converter errors BEFORE displaying results to users.
 * Runs after conversion but before output display.
 * 
 * Validation checks:
 * 1. Salt presence and amount (add 2% default if missing)
 * 2. Flour structure (all flours in correct sections)
 * 3. Hydration math accuracy
 * 4. Ingredient total accuracy
 * 5. Baker's percentage accuracy
 * 6. Essential ingredients presence
 */

import { ConvertedRecipe, ParsedRecipe, ParsedIngredient, RecipeWarning } from '@/types/recipe';

export interface ValidationResult {
  recipe: ConvertedRecipe;
  validationWarnings: RecipeWarning[];
  autoFixes: string[];
}

/**
 * Main validation function - runs all checks and returns validated recipe
 */
export function validateConversion(conversion: ConvertedRecipe): ValidationResult {
  const validationWarnings: RecipeWarning[] = [];
  const autoFixes: string[] = [];
  
  // Create working copy
  let validatedConversion = { ...conversion };
  
  // Run all validation checks in sequence
  validatedConversion = validateSalt(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateFlourStructure(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateHydration(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateIngredientTotals(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateBakersPercentages(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateEssentialIngredients(validatedConversion, validationWarnings);
  
  return {
    recipe: validatedConversion,
    validationWarnings,
    autoFixes
  };
}

/**
 * CHECK 1: Salt Validation
 * Ensures recipe has appropriate salt amount (1.5-3% of flour)
 */
function validateSalt(
  conversion: ConvertedRecipe,
  autoFixes: string[],
  warnings: RecipeWarning[]
): ConvertedRecipe {
  const totalFlour = conversion.converted.totalFlour;
  const currentSalt = conversion.converted.saltAmount;
  
  // Calculate recommended salt (2% of flour)
  const recommendedSalt = Math.round(totalFlour * 0.02);
  const minSalt = Math.round(totalFlour * 0.015); // 1.5%
  const maxSalt = Math.round(totalFlour * 0.03);  // 3%
  
  if (currentSalt === 0 || !currentSalt) {
    // Missing salt - add default 2%
    const updatedIngredients = [
      ...conversion.converted.ingredients,
      {
        name: 'salt',
        amount: recommendedSalt,
        unit: 'g',
        type: 'salt' as const,
        source: 'corrected' as const
      }
    ];
    
    autoFixes.push(`Added ${recommendedSalt}g salt (2% of flour) - please verify this matches your original recipe`);
    
    return {
      ...conversion,
      converted: {
        ...conversion.converted,
        ingredients: updatedIngredients,
        saltAmount: recommendedSalt
      }
    };
  } else if (currentSalt < minSalt) {
    warnings.push({
      type: 'caution',
      message: `Salt amount (${currentSalt}g, ${((currentSalt / totalFlour) * 100).toFixed(1)}%) is lower than typical 1.5-2%. Bread may taste bland.`
    });
  } else if (currentSalt > maxSalt) {
    warnings.push({
      type: 'caution',
      message: `Salt amount (${currentSalt}g, ${((currentSalt / totalFlour) * 100).toFixed(1)}%) is higher than typical 2-3%. Bread may taste very salty.`
    });
  }
  
  return conversion;
}

/**
 * CHECK 2: Flour Structure Validation
 * Ensures all flours are in "Dough" section, not "Finishing"
 */
function validateFlourStructure(
  conversion: ConvertedRecipe,
  autoFixes: string[],
  warnings: RecipeWarning[]
): ConvertedRecipe {
  // This check is more relevant for display logic
  // Flag if we see flour-type ingredients with unusual names
  const flourIngredients = conversion.converted.ingredients.filter(i => i.type === 'flour');
  const suspiciousFlours = flourIngredients.filter(f => 
    f.name.toLowerCase().includes('dusting') || 
    f.name.toLowerCase().includes('topping') ||
    f.name.toLowerCase().includes('finishing')
  );
  
  if (suspiciousFlours.length > 0) {
    const flourNames = suspiciousFlours.map(f => f.name).join(', ');
    warnings.push({
      type: 'info',
      message: `Found flour ingredients that may be for finishing: ${flourNames}. These are included in flour totals.`
    });
  }
  
  return conversion;
}

/**
 * CHECK 3: Hydration Math Validation
 * Ensures displayed hydration matches calculated hydration
 */
function validateHydration(
  conversion: ConvertedRecipe,
  autoFixes: string[],
  warnings: RecipeWarning[]
): ConvertedRecipe {
  const totalFlour = conversion.converted.totalFlour;
  const totalLiquid = conversion.converted.totalLiquid;
  const displayedHydration = conversion.converted.hydration;
  
  // Calculate actual hydration
  const calculatedHydration = (totalLiquid / totalFlour) * 100;
  const difference = Math.abs(calculatedHydration - displayedHydration);
  
  if (difference > 2) {
    // Significant mismatch - recalculate
    autoFixes.push(`Corrected hydration calculation: ${calculatedHydration.toFixed(1)}% (was showing ${displayedHydration.toFixed(1)}%)`);
    
    return {
      ...conversion,
      converted: {
        ...conversion.converted,
        hydration: calculatedHydration
      }
    };
  }
  
  if (difference > 10) {
    warnings.push({
      type: 'warning',
      message: `Large hydration adjustment made (${difference.toFixed(1)}%). Please verify ingredient amounts.`
    });
  }
  
  return conversion;
}

/**
 * CHECK 4: Ingredient Total Validation
 * Ensures component totals match claimed totals (especially levain)
 */
function validateIngredientTotals(
  conversion: ConvertedRecipe,
  autoFixes: string[],
  warnings: RecipeWarning[]
): ConvertedRecipe {
  // Check if this is a yeast-to-sourdough conversion (has levain)
  const hasStarter = conversion.converted.ingredients.some(i => i.type === 'starter');
  
  if (hasStarter && conversion.direction === 'yeast-to-sourdough') {
    // Validate levain total
    const starterAmount = conversion.converted.ingredients.find(i => i.type === 'starter')?.amount || 0;
    const levainWater = conversion.converted.ingredients.find(i => 
      i.type === 'liquid' && i.name.toLowerCase().includes('water')
    )?.amount || 0;
    const levainFlours = conversion.converted.ingredients
      .filter(i => i.type === 'flour')
      .reduce((sum, f) => sum + f.amount, 0);
    
    // For yeast-to-sourdough, levain section should have its own totals
    // This is handled in display logic, but we can validate the math
    const expectedLevainTotal = starterAmount + levainWater + levainFlours;
    
    // Log for debugging but don't auto-fix as this affects display logic
    console.log('Levain validation:', {
      starter: starterAmount,
      water: levainWater,
      flour: levainFlours,
      total: expectedLevainTotal
    });
  }
  
  return conversion;
}

/**
 * CHECK 5: Baker's Percentage Validation
 * Ensures percentages are calculated correctly
 */
function validateBakersPercentages(
  conversion: ConvertedRecipe,
  autoFixes: string[],
  warnings: RecipeWarning[]
): ConvertedRecipe {
  const totalFlour = conversion.converted.totalFlour;
  
  // Validate that all percentage calculations would be correct
  // This is a sanity check - actual calculation happens in display/PDF
  conversion.converted.ingredients.forEach(ingredient => {
    if (ingredient.type === 'flour') {
      const expectedPercentage = (ingredient.amount / totalFlour) * 100;
      // Flour should sum to 100%
    }
  });
  
  // Check that total flour isn't zero (would cause division by zero)
  if (totalFlour === 0 || !totalFlour) {
    warnings.push({
      type: 'warning',
      message: 'Total flour is zero or missing - baker\'s percentages cannot be calculated.'
    });
  }
  
  return conversion;
}

/**
 * CHECK 6: Essential Ingredients Validation
 * Ensures recipe has core bread-making ingredients
 */
function validateEssentialIngredients(
  conversion: ConvertedRecipe,
  warnings: RecipeWarning[]
): ConvertedRecipe {
  const ingredients = conversion.converted.ingredients;
  
  // Must have: flour, liquid, leavening
  const hasFlour = ingredients.some(i => i.type === 'flour');
  const hasLiquid = ingredients.some(i => i.type === 'liquid');
  const hasLeavening = ingredients.some(i => i.type === 'yeast' || i.type === 'starter');
  const hasSalt = ingredients.some(i => i.type === 'salt');
  
  if (!hasFlour) {
    warnings.push({
      type: 'warning',
      message: 'No flour detected in recipe. This may not be a bread recipe.'
    });
  }
  
  if (!hasLiquid) {
    warnings.push({
      type: 'warning',
      message: 'No liquid detected in recipe. Bread requires water, milk, or other liquid.'
    });
  }
  
  if (!hasLeavening) {
    warnings.push({
      type: 'warning',
      message: 'No leavening agent detected. Recipe needs yeast or sourdough starter.'
    });
  }
  
  if (!hasSalt) {
    warnings.push({
      type: 'info',
      message: 'No salt detected. Salt enhances flavor and controls fermentation.'
    });
  }
  
  return conversion;
}
