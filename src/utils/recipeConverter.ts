/**
 * BGB Master Baker Context
 * 
 * This module embodies expert artisan baker knowledge for recipe conversions.
 * All conversions follow real fermentation science, ingredient ratios, and dough behavior.
 * 
 * Core Baking Logic:
 * - Hydration: Lean sourdough 70-78%, Enriched 60-68%, >80% = caution warning
 * - Formula: yeast_hydration = sourdough_hydration × 0.92
 * - Salt: 2% of flour weight
 * - Sugar: ≤5% for browning/activation
 * - Fat: reduces hydration by 2-3% per 5% fat
 * 
 * Yeast ↔ Starter Equivalents:
 * - 100g active starter ≈ 4g instant yeast (0.7% of flour)
 * - Instant → Active dry = ×1.25
 * - Active dry → Instant = ×0.75
 * 
 * Fermentation Logic:
 * - Yeast: First rise 1-1.5h; Final proof 45-60min
 * - Sourdough: Bulk 4-6h (room) or 12-18h (cold); Proof 2-4h (room) or 8-12h (cold)
 * 
 * Temperature Targets:
 * - Dough development: 75-78°F (24-26°C)
 * - Yeast activation: 105-110°F (if pre-dissolving)
 * 
 * Voice: Clear, confident, sensory, encouraging - like a mentor baker.
 */

import { ParsedRecipe, ConvertedRecipe, MethodChange, ParsedIngredient } from '@/types/recipe';
import { generateBakerWarnings } from './recipeParser';
import { generateSubstitutions } from './substitutions';
import { classifyDough, getMethodTemplate, getYeastMethodTemplate } from '@/lib/methodTemplates';

/**
 * FIX #2: Preserve flour types and ratios during conversion
 * Extracts flour ingredients and their ratios from the original recipe
 */
function preserveFlourTypes(
  flours: ParsedIngredient[],
  targetTotalFlour: number
): ParsedIngredient[] {
  if (flours.length === 0) {
    // Fallback to bread flour if no flour ingredients found
    return [{
      name: 'bread flour',
      amount: targetTotalFlour,
      unit: 'g',
      type: 'flour'
    }];
  }

  // Calculate total flour weight from original ingredients
  const originalFlourTotal = flours.reduce((sum, f) => sum + f.amount, 0);

  // Preserve ratios
  return flours.map(flour => {
    const ratio = flour.amount / originalFlourTotal;
    return {
      ...flour,
      amount: Math.round(targetTotalFlour * ratio)
    };
  });
}

export function convertSourdoughToYeast(recipe: ParsedRecipe): ConvertedRecipe {
  // STEP 1: Calculate TRUE total ingredients from sourdough recipe
  // Starter is 100% hydration: 50% flour, 50% water
  const starterFlour = recipe.starterAmount / 2;
  const starterWater = recipe.starterAmount / 2;
  
  // Debug logging
  console.log('=== SOURDOUGH TO YEAST CONVERSION ===');
  console.log('Input recipe.totalFlour:', recipe.totalFlour);
  console.log('Input recipe.totalLiquid:', recipe.totalLiquid);
  console.log('Input recipe.starterAmount:', recipe.starterAmount);
  console.log('Parsed ingredients:', recipe.ingredients.map(i => `${i.amount}g ${i.name} (type: ${i.type})`));
  
  // TRUE totals including what's IN the starter
  const trueFlour = recipe.totalFlour; // Already includes starter flour from parser
  const trueWater = recipe.totalLiquid; // Already includes starter water from parser
  const trueHydration = (trueWater / trueFlour) * 100;
  
  console.log('Calculated trueFlour:', trueFlour);
  console.log('Calculated trueWater:', trueWater);
  console.log('Calculated trueHydration:', trueHydration);
  
  // STEP 2: Build clean ingredient list for yeast version
  // FIX #4: Preserve ALL enrichments, fats, and sweeteners
  const mustPreserveTypes: ParsedIngredient['type'][] = ['fat', 'enrichment', 'sweetener', 'salt', 'other'];
  const enrichments = recipe.ingredients.filter(i => mustPreserveTypes.includes(i.type));

  // Also preserve milk (it's a liquid but needs to be preserved)
  const milkIngredients = recipe.ingredients.filter(i =>
    i.type === 'liquid' && i.name.toLowerCase().includes('milk')
  );

  console.log('Preserving enrichments:', enrichments.map(e => `${e.amount}g ${e.name}`).join(', '));
  console.log('Preserving milk:', milkIngredients.map(m => `${m.amount}g ${m.name}`).join(', '));
  
  // Calculate yeast amount: 0.7-1.1% of flour weight
  const instantYeastAmount = Math.round(trueFlour * 0.011); // 1.1%
  const activeDryYeastAmount = Math.round(instantYeastAmount * 1.25);

  // FIX #2: Extract and preserve flour types from original recipe
  const originalFlours = recipe.ingredients.filter(i => i.type === 'flour');
  const preservedFlours = preserveFlourTypes(originalFlours, trueFlour);

  console.log('Preserved flour types:', preservedFlours.map(f => `${f.amount}g ${f.name}`).join(', '));

  // Build final ingredient list - FIX #4: Include all enrichments and milk
  const convertedIngredients: ParsedIngredient[] = [
    ...preservedFlours,
    {
      name: 'water (80-85°F)',
      amount: trueWater,
      unit: 'g',
      type: 'liquid'
    },
    ...milkIngredients,
    ...enrichments,
    {
      name: `instant yeast (${instantYeastAmount}g) OR active dry yeast (${activeDryYeastAmount}g)`,
      amount: instantYeastAmount,
      unit: 'g',
      type: 'yeast'
    }
  ];
  
  // FIX #9: Create conversion metadata for round-trip fidelity
  const flourRatios = originalFlours.map(f => ({
    type: f.name,
    ratio: f.amount / trueFlour
  }));

  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: convertedIngredients,
    starterAmount: 0,
    yeastAmount: instantYeastAmount,
    totalFlour: trueFlour,
    totalLiquid: trueWater,
    hydration: trueHydration,
    metadata: {
      originalFlours: flourRatios,
      originalHydration: trueHydration,
      techniques: recipe.techniques,
      enrichmentProfile: {
        butter: butterAmount,
        eggs: hasEggs ? enrichments.filter(i => i.type === 'enrichment').reduce((sum, i) => sum + i.amount, 0) : 0,
        sugar: sugarAmount,
        milk: milkAmount
      }
    }
  };

  // FIX #5: Classify dough type and use context-aware method template
  const butterAmount = enrichments
    .filter(i => i.type === 'fat' || i.name.toLowerCase().includes('butter') || i.name.toLowerCase().includes('oil'))
    .reduce((sum, i) => sum + i.amount, 0);
  const sugarAmount = enrichments
    .filter(i => i.type === 'sweetener' || i.name.toLowerCase().includes('sugar') || i.name.toLowerCase().includes('honey'))
    .reduce((sum, i) => sum + i.amount, 0);
  const milkAmount = milkIngredients.reduce((sum, i) => sum + i.amount, 0);
  const hasEggs = enrichments.some(i => i.type === 'enrichment' || i.name.toLowerCase().includes('egg'));

  const classification = classifyDough(
    sugarAmount,
    butterAmount,
    milkAmount,
    trueFlour,
    hasEggs
  );

  console.log('Dough classification for yeast conversion:', classification);

  // Get appropriate method template based on classification
  const methodChanges = getYeastMethodTemplate(classification);

  const troubleshootingTips = [
    {
      issue: 'Dense Crumb',
      solution: 'Dough was likely under-proofed or yeast too old. Ensure yeast is fresh and active, and proof until dough springs back slowly when pressed.'
    },
    {
      issue: 'Crust Too Hard',
      solution: 'Loaf may be overbaked or hydration too low. Check internal temperature (target 190-195°F) and consider increasing water by 2-3%.'
    },
    {
      issue: 'Flat Loaf',
      solution: 'Over-proofed dough. Watch for the "slow spring back" test during final proof—if dough doesn\'t spring back at all, it\'s gone too far.'
    }
  ];

  const warnings = generateBakerWarnings(converted);

  // FIX #3: Add warnings for special techniques
  if (recipe.techniques && recipe.techniques.length > 0) {
    warnings.unshift({
      type: 'warning',
      message: `⚠️ This recipe uses ${recipe.techniques.join(', ')}. When converting, preserve the original ${recipe.techniques[0]} instructions and timing. The technique may need adjustment for yeast-based fermentation.`
    });
  }

  const substitutions = generateSubstitutions(converted);

  return {
    original: recipe,
    converted,
    direction: 'sourdough-to-yeast',
    methodChanges,
    troubleshootingTips,
    warnings,
    substitutions
  };
}

export function convertYeastToSourdough(recipe: ParsedRecipe): ConvertedRecipe {
  // STEP 1: Identify total flour
  const totalFlour = recipe.totalFlour;
  
  console.log('=== YEAST TO SOURDOUGH CONVERSION (FIXED) ===');
  console.log('Total flour:', totalFlour);
  console.log('Input ingredients:', recipe.ingredients.map(i => `${i.amount}g ${i.name} (type: ${i.type})`));
  
  console.log('=== CONVERSION DEBUG ===');
  console.log('All confirmed ingredients:', recipe.ingredients.map(i => 
    `${i.amount}g ${i.name} [type: ${i.type}]`
  ));
  
  // STEP 2: Separate ingredients by category
  // Use WORKING PATTERN from convertSourdoughToYeast: filter OUT what we don't want
  const nonFlourLiquidYeastIngredients = recipe.ingredients.filter(
    i => i.type !== 'flour' && i.type !== 'liquid' && i.type !== 'yeast'
  );
  
  console.log('After filter (should include salt + egg):', nonFlourLiquidYeastIngredients.map(i => 
    `${i.amount}g ${i.name} [type: ${i.type}]`
  ));
  
  const waterIngredients = recipe.ingredients.filter(i => 
    i.type === 'liquid' && !i.name.toLowerCase().includes('milk')
  );
  const milkIngredients = recipe.ingredients.filter(i => 
    i.type === 'liquid' && i.name.toLowerCase().includes('milk')
  );
  
  const originalWater = waterIngredients.reduce((sum, i) => sum + i.amount, 0);
  const milkAmount = milkIngredients.reduce((sum, i) => sum + i.amount, 0);
  const butterAmount = nonFlourLiquidYeastIngredients
    .filter(i => i.type === 'fat' || i.name.toLowerCase().includes('butter') || i.name.toLowerCase().includes('oil'))
    .reduce((sum, i) => sum + i.amount, 0);
  const eggAmount = nonFlourLiquidYeastIngredients
    .filter(i => i.type === 'enrichment' || i.name.toLowerCase().includes('egg'))
    .reduce((sum, i) => sum + i.amount, 0);
  const sugarAmount = nonFlourLiquidYeastIngredients
    .filter(i => i.type === 'sweetener' || i.name.toLowerCase().includes('sugar') || i.name.toLowerCase().includes('honey'))
    .reduce((sum, i) => sum + i.amount, 0);
  
  console.log('Original water:', originalWater, 'g');
  console.log('Milk:', milkAmount, 'g');
  console.log('Butter:', butterAmount, 'g');
  console.log('Eggs:', eggAmount, 'g');
  console.log('Sugar:', sugarAmount, 'g');
  console.log('Non-flour/liquid/yeast ingredients:', nonFlourLiquidYeastIngredients.map(i => `${i.amount}g ${i.name} [${i.type}]`));
  
  // Determine if enriched
  const isEnrichedDough = butterAmount > 0 || eggAmount > 0 || sugarAmount > 0 || milkAmount > 0;
  
  // Calculate percentages for warnings
  const sugarPercentage = (sugarAmount / totalFlour) * 100;
  const fatPercentage = (butterAmount / totalFlour) * 100;
  
  console.log('Is enriched:', isEnrichedDough);
  console.log('Sugar %:', sugarPercentage.toFixed(1));
  console.log('Fat %:', fatPercentage.toFixed(1));
  
  // STEP 3: Calculate starter amount (20% of flour)
  // For 20% inoculation, we need starter flour to be ~18-20% of total flour
  const starterPercentage = 0.20;
  const starterFlourNeeded = Math.round(totalFlour * starterPercentage); // 100g for 500g flour
  
  console.log('Target starter flour contribution:', starterFlourNeeded, `(${starterPercentage * 100}% of ${totalFlour}g)`);
  
  // FIXED BUILD FORMULA - 1:1:1 ratio
  // For 100g starter flour needed from 100% hydration starter:
  // We need total 200g of starter (100g flour + 100g water)
  // Build with 40% active starter + 40% water + 40% flour
  const activeStarterWeight = Math.round(starterFlourNeeded * 0.4); // 40g
  const levainWater = Math.round(starterFlourNeeded * 0.4); // 40g
  const levainFlour = Math.round(starterFlourNeeded * 0.4); // 40g
  const levainTotal = activeStarterWeight + levainWater + levainFlour; // 120g total
  
  // Starter breakdown (100% hydration starter means 50% flour, 50% water)
  const starterFlourContent = activeStarterWeight / 2; // 20g flour from 40g starter
  const starterWaterContent = activeStarterWeight / 2; // 20g water from 40g starter
  
  // Total flour and water in levain
  const totalLevainFlour = levainFlour + starterFlourContent; // 40g + 20g = 60g
  const totalLevainWater = levainWater + starterWaterContent; // 40g + 20g = 60g
  
  console.log('Levain build:', {
    activeStarter: activeStarterWeight,
    water: levainWater,
    flour: levainFlour,
    total: levainTotal,
    totalFlour: totalLevainFlour,
    totalWater: totalLevainWater
  });
  
  // STEP 4: Calculate remaining dough ingredients
  const doughFlour = Math.round(totalFlour - totalLevainFlour);
  
  // Calculate target water hydration based on dough type
  // For enriched doughs: 60-68% WATER hydration (not counting milk, eggs)
  // For lean doughs: 70-78% water hydration
  const targetWaterHydration = isEnrichedDough ? 0.65 : 0.75;
  
  // Account for liquid from eggs (approximate 75% of egg weight is liquid)
  const liquidFromEggs = eggAmount * 0.75;
  
  // Calculate adjusted water needed
  // Total water needed = (total flour × target hydration) - water from levain - liquid from eggs
  const totalWaterNeeded = Math.round(totalFlour * targetWaterHydration);
  const doughWater = Math.round(Math.max(0, totalWaterNeeded - totalLevainWater - liquidFromEggs));
  
  console.log('Dough flour:', doughFlour);
  console.log('Dough water:', doughWater);
  console.log('Target water hydration:', (targetWaterHydration * 100).toFixed(0) + '%');
  
  // Calculate actual water-only hydration (for enriched doughs, water % is separate from total liquid)
  const totalWater = totalLevainWater + doughWater + liquidFromEggs;
  const waterHydration = (totalWater / totalFlour) * 100;
  
  console.log('Actual water hydration:', waterHydration.toFixed(1) + '%');
  console.log('Note: Milk (' + milkAmount + 'g) not counted in water hydration for enriched doughs');
  
  // Build LEVAIN section
  const levainIngredients: ParsedIngredient[] = [
    {
      name: 'active sourdough starter (100% hydration)',
      amount: activeStarterWeight,
      unit: 'g',
      type: 'starter'
    },
    {
      name: 'water (80-85°F)',
      amount: levainWater,
      unit: 'g',
      type: 'liquid'
    },
    {
      name: 'bread flour',
      amount: levainFlour,
      unit: 'g',
      type: 'flour'
    }
  ];
  
  // FIX #2: Preserve flour types from original recipe
  const originalFlours = recipe.ingredients.filter(i => i.type === 'flour');
  const preservedDoughFlours = preserveFlourTypes(originalFlours, doughFlour);

  console.log('Preserved flour types in dough:', preservedDoughFlours.map(f => `${f.amount}g ${f.name}`).join(', '));

  // Build DOUGH section - include ALL original ingredients
  const doughIngredients: ParsedIngredient[] = [
    {
      name: 'all of the levain',
      amount: levainTotal,
      unit: 'g',
      type: 'starter'
    },
    ...preservedDoughFlours
  ];
  
  // Add water ONLY if there's any left after levain
  if (doughWater > 0) {
    doughIngredients.push({
      name: 'water (80-85°F)',
      amount: doughWater,
      unit: 'g',
      type: 'liquid'
    });
  }
  
  // Add milk if present
  if (milkIngredients.length > 0) {
    doughIngredients.push(...milkIngredients);
  }
  
  // WORKING PATTERN: Add ALL non-flour/liquid/yeast ingredients (salt, fat, enrichment, sweetener, other)
  doughIngredients.push(...nonFlourLiquidYeastIngredients);
  
  console.log('Final dough ingredients:', doughIngredients.map(i => `${i.amount}g ${i.name} [${i.type}]`));
  
  // Validation: Check that enrichments are present
  const hasButterInDough = doughIngredients.some(i => 
    i.type === 'fat' || i.name.toLowerCase().includes('butter')
  );
  const hasEggsInDough = doughIngredients.some(i => 
    i.type === 'enrichment' || i.name.toLowerCase().includes('egg')
  );
  const hasSugarInDough = doughIngredients.some(i => 
    i.type === 'sweetener' || i.name.toLowerCase().includes('sugar')
  );
  
  console.log('=== ENRICHMENT VALIDATION ===');
  console.log('Butter in original:', butterAmount > 0, '| Butter in dough:', hasButterInDough);
  console.log('Eggs in original:', eggAmount > 0, '| Eggs in dough:', hasEggsInDough);
  console.log('Sugar in original:', sugarAmount > 0, '| Sugar in dough:', hasSugarInDough);
  
  if (butterAmount > 0 && !hasButterInDough) {
    console.error('❌ BUTTER WAS LOST IN CONVERSION!');
  }
  if (eggAmount > 0 && !hasEggsInDough) {
    console.error('❌ EGGS WERE LOST IN CONVERSION!');
  }
  if (sugarAmount > 0 && !hasSugarInDough) {
    console.error('❌ SUGAR WAS LOST IN CONVERSION!');
  }
  
  // FIX #9: Create conversion metadata for round-trip fidelity
  const flourRatios = originalFlours.map(f => ({
    type: f.name,
    ratio: f.amount / totalFlour
  }));

  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: [...levainIngredients, ...doughIngredients],
    yeastAmount: 0,
    starterAmount: levainTotal,
    totalFlour: totalFlour,
    totalLiquid: totalWater, // Water only, not including milk
    hydration: waterHydration, // Water-only hydration for enriched doughs
    metadata: {
      originalFlours: flourRatios,
      originalHydration: waterHydration,
      techniques: recipe.techniques,
      enrichmentProfile: {
        butter: butterAmount,
        eggs: eggAmount,
        sugar: sugarAmount,
        milk: milkAmount
      }
    }
  };
  
  console.log('Converted recipe hydration:', waterHydration.toFixed(1) + '%');
  console.log('Starter flour contribution:', totalLevainFlour + 'g (' + ((totalLevainFlour / totalFlour) * 100).toFixed(1) + '% of total flour)');
  console.log('Active starter used:', activeStarterWeight + 'g (provides ' + starterFlourContent + 'g flour)');
  console.log('Levain build ratio: ' + activeStarterWeight + 'g starter : ' + levainWater + 'g water : ' + levainFlour + 'g flour = ' + levainTotal + 'g total');
  
  // Calculate actual starter percentage for validation
  const actualStarterPercentage = (totalLevainFlour / totalFlour) * 100;

  // FIX #5: Classify dough type with egg detection
  const hasEggs = eggAmount > 0;
  const classification = classifyDough(
    sugarAmount,
    butterAmount,
    milkAmount,
    totalFlour,
    hasEggs
  );

  console.log('Dough classification:', classification);

  // Get appropriate method template
  const methodChanges = getMethodTemplate(
    classification,
    {
      starter: activeStarterWeight,
      water: levainWater,
      flour: levainFlour,
      total: levainTotal
    },
    {
      flour: doughFlour,
      water: doughWater,
      salt: recipe.saltAmount
    }
  );

  const troubleshootingTips = [
    {
      issue: 'Tight Crumb',
      solution: isEnrichedDough
        ? 'Dough was under-fermented. Enriched doughs take longer—extend bulk fermentation by 1-2 hours.'
        : 'Dough was under-fermented or starter too weak. Build strong levain and extend bulk fermentation.'
    },
    {
      issue: 'Gummy Crumb',
      solution: 'Sliced too soon. Cool completely before slicing.'
    },
    {
      issue: 'Weak Rise',
      solution: 'Inactive starter or cold temperature. Ensure starter doubles in 6-8 hours and maintain 75–78°F.'
    }
  ];
  
  // VALIDATION: Check starter percentage (optimal range: 15-25%)
  if (actualStarterPercentage < 15) {
    const targetFlour = Math.round(totalFlour * 0.18); // 18% target
    const neededStarter = Math.round(targetFlour * 0.4);
    const neededWater = Math.round(targetFlour * 0.4);
    const neededFlour = Math.round(targetFlour * 0.4);
    
    troubleshootingTips.unshift({
      issue: `⚠️ Low Starter Inoculation (${actualStarterPercentage.toFixed(0)}%)`,
      solution: `Your levain provides only ${actualStarterPercentage.toFixed(0)}% starter flour. For reliable fermentation, aim for 15-25%. To fix: increase levain build to ${neededStarter}g starter + ${neededWater}g water + ${neededFlour}g flour (${neededStarter + neededWater + neededFlour}g total). This will give ~18% inoculation.`
    });
  } else if (actualStarterPercentage > 25) {
    const targetFlour = Math.round(totalFlour * 0.20); // 20% target
    const neededStarter = Math.round(targetFlour * 0.4);
    const neededWater = Math.round(targetFlour * 0.4);
    const neededFlour = Math.round(targetFlour * 0.4);
    
    troubleshootingTips.unshift({
      issue: `⚠️ High Starter Inoculation (${actualStarterPercentage.toFixed(0)}%)`,
      solution: `Your levain provides ${actualStarterPercentage.toFixed(0)}% starter flour. Above 25%, you risk sour flavor and rapid over-fermentation. To fix: reduce levain build to ${neededStarter}g starter + ${neededWater}g water + ${neededFlour}g flour (${neededStarter + neededWater + neededFlour}g total). This will give ~20% inoculation.`
    });
  }
  
  if (sugarPercentage > 10) {
    troubleshootingTips.push({
      issue: 'High Sugar Content',
      solution: `Sugar is ${Math.round(sugarPercentage)}% of flour. This slows fermentation. Consider increasing starter to 25% or extending bulk fermentation 2-3 hours.`
    });
  }
  
  if (fatPercentage > 15) {
    troubleshootingTips.push({
      issue: 'High Fat Content',
      solution: `Fat is ${Math.round(fatPercentage)}% of flour. Add butter AFTER initial mixing to prevent coating flour particles.`
    });
  }

  const warnings = generateBakerWarnings(converted);

  // FIX #3: Add warnings for special techniques
  if (recipe.techniques && recipe.techniques.length > 0) {
    warnings.unshift({
      type: 'warning',
      message: `⚠️ This recipe uses ${recipe.techniques.join(', ')}. When converting to sourdough, preserve the original ${recipe.techniques[0]} instructions. Sourdough fermentation will require significantly more time.`
    });
  }

  const substitutions = generateSubstitutions(converted);

  return {
    original: recipe,
    converted,
    direction: 'yeast-to-sourdough',
    methodChanges,
    troubleshootingTips,
    warnings,
    substitutions
  };
}

export function calculateBakersPercentages(recipe: ParsedRecipe) {
  // Baker's percentage formula: (ingredient weight / total flour weight) × 100
  // Flour is ALWAYS 100% (the baseline)
  const baseFlour = recipe.totalFlour;
  
  // Group ingredients by type for better display
  const percentages = recipe.ingredients.map(ing => {
    let percentage: number;
    
    // For flour in sourdough conversions (levain section), calculate against base
    if (ing.type === 'flour') {
      percentage = (ing.amount / baseFlour) * 100;
    } else if (ing.type === 'starter') {
      // Levain/starter as percentage of flour
      percentage = (ing.amount / baseFlour) * 100;
    } else {
      // All other ingredients
      percentage = (ing.amount / baseFlour) * 100;
    }
    
    return {
      ingredient: ing.name,
      amount: ing.amount,
      percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal
    };
  });

  return percentages;
}
