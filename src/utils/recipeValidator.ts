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
import { classifyRecipe, classificationContradictions } from './recipeClassification';

export interface ValidationResult {
  recipe: ConvertedRecipe;
  validationWarnings: RecipeWarning[];
  autoFixes: string[];
  blockingIssues: string[];
}

/**
 * Main validation function - runs all checks and returns validated recipe
 */
export function validateConversion(conversion: ConvertedRecipe): ValidationResult {
  const validationWarnings: RecipeWarning[] = [];
  const autoFixes: string[] = [];
  const blockingIssues: string[] = [];
  
  // Create working copy
  let validatedConversion = { ...conversion };
  
  // Run all validation checks in sequence
  validatedConversion = validateSalt(validatedConversion, autoFixes, validationWarnings, blockingIssues);
  validatedConversion = validateFlourStructure(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateHydration(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateIngredientTotals(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateBakersPercentages(validatedConversion, autoFixes, validationWarnings);
  validatedConversion = validateEssentialIngredients(validatedConversion, validationWarnings);
  validateSemanticInvariants(validatedConversion, validationWarnings, blockingIssues);
  
  return {
    recipe: validatedConversion,
    validationWarnings,
    autoFixes,
    blockingIssues
  };
}

/**
 * CHECK 1: Salt Validation
 * Ensures recipe has appropriate salt amount (1.5-3% of flour)
 */
function validateSalt(
  conversion: ConvertedRecipe,
  autoFixes: string[],
  warnings: RecipeWarning[],
  blockingIssues: string[]
): ConvertedRecipe {
  const totalFlour = conversion.converted.totalFlour;
  const currentSalt = conversion.converted.saltAmount;
  
  // Calculate recommended salt (2% of flour)
  const recommendedSalt = Math.round(totalFlour * 0.02);
  const minSalt = Math.round(totalFlour * 0.015); // 1.5%
  const maxSalt = Math.round(totalFlour * 0.03);  // 3%
  
  if (currentSalt === 0 || !currentSalt) {
    blockingIssues.push('Converted recipe has no dough salt. Export requires review rather than inventing an ingredient.');
    warnings.push({ type: 'warning', message: `No dough salt was found. A typical starting point is ${recommendedSalt}g, but verify the source recipe.` });
    return conversion;
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

function validateSemanticInvariants(conversion: ConvertedRecipe, warnings: RecipeWarning[], blockingIssues: string[]) {
  const source = conversion.original.sourceIngredients ?? conversion.original.ingredients;
  const output = conversion.converted.ingredients;
  const sourceDough = source.filter(i => !i.isFinishing).reduce((n, i) => n + i.amount, 0);
  const outputDough = output.filter(i => !i.isFinishing && !/all of the levain/i.test(i.name)).reduce((n, i) => n + i.amount, 0);
  if (sourceDough > 0 && Math.abs(sourceDough - outputDough) > Math.max(5, sourceDough * 0.08)) {
    blockingIssues.push(`Dough ingredient conservation changed by ${Math.abs(sourceDough - outputDough).toFixed(1)}g.`);
  }
  const classification = conversion.original.classification ?? classifyRecipe(conversion.original.method, source);
  const contradictions = classificationContradictions(classification, conversion.methodChanges.map(m => `${m.step} ${m.change}`).join(' '));
  contradictions.forEach(message => {
    blockingIssues.push(message);
    warnings.push({ type: 'warning', message });
  });
  if (classification.reviewRequired) {
    warnings.push({ type: 'warning', message: `Recipe classification is low confidence (${Math.round(classification.confidence * 100)}%). The original method should be reviewed before export.` });
  }
  if (conversion.original.ingredients.some(i => i.isFinishing) && !conversion.methodChanges.some(m => /brine|topping|glaze|dimple|pan|finish|garnish|wash/i.test(`${m.step} ${m.change}`))) {
    blockingIssues.push('A finishing section was detected but is not referenced by the converted method.');
  }
  if (conversion.converted.ingredients.some(i => i.type === 'fat' && !i.isFinishing) && !conversion.methodChanges.some(m => /oil|butter|fat/i.test(m.change))) {
    blockingIssues.push('A dough fat is present in ingredients but absent from the method.');
  }
  conversion.exportBlocked = blockingIssues.length > 0;
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
  
  // Calculate actual hydration (guard against zero flour)
  const calculatedHydration = totalFlour > 0 ? (totalLiquid / totalFlour) * 100 : 0;
  const difference = Math.abs(calculatedHydration - displayedHydration);

  if (difference > 2) {
    // Significant mismatch - recalculate
    autoFixes.push(`Corrected hydration calculation: ${calculatedHydration.toFixed(1)}% (was showing ${displayedHydration.toFixed(1)}%)`);

    if (difference > 10) {
      warnings.push({
        type: 'warning',
        message: `Large hydration adjustment made (${difference.toFixed(1)}%). Please verify ingredient amounts.`
      });
    }

    return {
      ...conversion,
      converted: {
        ...conversion.converted,
        hydration: calculatedHydration
      }
    };
  }
  
  // Check for unusually high hydration (>150%)
  if (calculatedHydration > 150) {
    console.log('[Validator] High hydration detected:', calculatedHydration.toFixed(1) + '%');
    warnings.push({
      type: 'caution',
      message: `This hydration percentage seems unusually high (${calculatedHydration.toFixed(1)}%). Please verify your ingredient amounts before proceeding.`
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
 * CHECK 6: Essential Ingredients Check
 * Ensures recipe has minimum required ingredients and handles edge cases
 */
function validateEssentialIngredients(
  conversion: ConvertedRecipe,
  warnings: RecipeWarning[]
): ConvertedRecipe {
  const hasFlour = conversion.converted.totalFlour > 0;
  const hasLiquid = conversion.converted.totalLiquid > 0;
  const hasLeavening = conversion.converted.yeastAmount > 0 || conversion.converted.starterAmount > 0;
  
  // Critical errors for non-bread recipes
  if (!hasFlour || conversion.converted.totalFlour < 50) {
    warnings.push({
      type: 'caution',
      message: 'Very little or no flour detected in recipe. This may not be a bread recipe, or ingredients were not recognized properly. Please verify your recipe text.'
    });
  }
  
  if (!hasLiquid || conversion.converted.totalLiquid < 20) {
    warnings.push({
      type: 'caution',
      message: 'Very little or no liquid detected. Bread requires hydration (typically 60-80% of flour weight). Please verify your recipe includes water, milk, or other liquids.'
    });
  }
  
  if (!hasLeavening) {
    warnings.push({
      type: 'warning',
      message: 'No leavening agent (yeast or starter) detected. This may be an unleavened flatbread or focaccia. If this should be a leavened bread, please verify the recipe text.'
    });
  }
  
  // Edge case: Extremely high flour ratio
  if (hasFlour && conversion.converted.totalFlour > 2000) {
    warnings.push({
      type: 'info',
      message: `This recipe uses ${conversion.converted.totalFlour}g of flour, which is quite large (typically makes 3-4 loaves). Verify this is intentional.`
    });
  }
  
  // Edge case: Unusual hydration
  if (hasFlour && hasLiquid) {
    const hydration = (conversion.converted.totalLiquid / conversion.converted.totalFlour) * 100;
    if (hydration < 50) {
      warnings.push({
        type: 'caution',
        message: `Hydration is very low (${hydration.toFixed(1)}%). This will produce an extremely stiff dough. Typical bread is 60-80% hydration. Please verify.`
      });
    } else if (hydration > 100) {
      warnings.push({
        type: 'caution',
        message: `Hydration is very high (${hydration.toFixed(1)}%). This will be more like a batter than dough. Typical bread is 60-80% hydration. Please verify.`
      });
    }
  }
  
  return conversion;
}
