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
import { generateBakerWarnings, detectSpecialTechniques } from './recipeParser';
import { generateSubstitutions } from './substitutions';
import { classifyDough, getMethodTemplate } from '@/lib/methodTemplates';

export function convertSourdoughToYeast(recipe: ParsedRecipe, originalRecipeText?: string): ConvertedRecipe {
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
  // Remove starter, liquid, and flour entries - we'll add back consolidated totals
  const nonStarterIngredients = recipe.ingredients.filter(
    i => i.type !== 'starter' && i.type !== 'liquid' && i.type !== 'flour'
  );
  
  // Calculate yeast amount: 0.7-1.1% of flour weight
  const instantYeastAmount = Math.round(trueFlour * 0.011); // 1.1%
  const activeDryYeastAmount = Math.round(instantYeastAmount * 1.25);
  
  // Build final ingredient list
  const convertedIngredients: ParsedIngredient[] = [
    {
      name: 'bread flour',
      amount: trueFlour,
      unit: 'g',
      type: 'flour'
    },
    {
      name: 'water (80-85°F)',
      amount: trueWater,
      unit: 'g',
      type: 'liquid'
    },
    ...nonStarterIngredients,
    {
      name: `instant yeast (${instantYeastAmount}g) OR active dry yeast (${activeDryYeastAmount}g)`,
      amount: instantYeastAmount,
      unit: 'g',
      type: 'yeast'
    }
  ];
  
  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: convertedIngredients,
    starterAmount: 0,
    yeastAmount: instantYeastAmount,
    totalFlour: trueFlour,
    totalLiquid: trueWater,
    hydration: trueHydration
  };

  const methodChanges: MethodChange[] = [
    {
      step: '1. MIX & KNEAD',
      change: 'Combine all ingredients in a bowl. Knead by hand for 8–10 minutes or with a stand mixer (dough hook) for 5–6 minutes until smooth and elastic. Dough should pass the windowpane test.',
      timing: '8-10 min by hand, 5-6 min mixer'
    },
    {
      step: '2. FIRST RISE',
      change: 'Place in a lightly oiled bowl, cover, and let rise 1–1.5 hours at 75–78°F until doubled in size.',
      timing: '1-1.5 hours'
    },
    {
      step: '3. SHAPE',
      change: 'Punch down gently, shape as desired (loaf, braid, or boule), and place on a greased pan or parchment.',
      timing: '5-10 min'
    },
    {
      step: '4. FINAL PROOF',
      change: 'Cover and let rise 45–60 minutes, or until dough springs back slowly when gently pressed.',
      timing: '45-60 min'
    },
    {
      step: '5. BAKE',
      change: 'Preheat oven to 375°F (190°C). Optionally brush with egg wash for a golden crust. Bake 35–40 minutes until deep golden and internal temperature is 190–195°F.',
      timing: '35-40 min at 375°F (190°C)'
    },
    {
      step: '6. COOL',
      change: 'Remove from pan and cool on wire rack at least 1 hour before slicing.',
      timing: '1 hour minimum'
    }
  ];

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
  const substitutions = generateSubstitutions(converted);
  
  // Add special technique warnings if original recipe text provided
  if (originalRecipeText) {
    const techniqueWarnings = detectSpecialTechniques(originalRecipeText);
    warnings.unshift(...techniqueWarnings);
  }

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

export function convertYeastToSourdough(recipe: ParsedRecipe, originalRecipeText?: string): ConvertedRecipe {
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
  
  // ENHANCED HYDRATION CALCULATION
  // Account for water content in enrichment ingredients:
  // - Eggs: 75% water
  // - Milk: 87% water
  // - Cream: 60% water
  // - Honey: 17% water
  // - Butter: 16% water
  const liquidFromEggs = eggAmount * 0.75;
  const liquidFromMilk = milkAmount * 0.87;
  const creamAmount = nonFlourLiquidYeastIngredients
    .filter(i => i.name.toLowerCase().includes('cream'))
    .reduce((sum, i) => sum + i.amount, 0);
  const liquidFromCream = creamAmount * 0.60;
  const honeyAmount = nonFlourLiquidYeastIngredients
    .filter(i => i.name.toLowerCase().includes('honey'))
    .reduce((sum, i) => sum + i.amount, 0);
  const liquidFromHoney = honeyAmount * 0.17;
  const liquidFromButter = butterAmount * 0.16;
  
  // Total liquid contribution from enrichments
  const totalEnrichmentLiquid = liquidFromEggs + liquidFromMilk + liquidFromCream + liquidFromHoney + liquidFromButter;
  
  console.log('Enrichment liquid breakdown:', {
    eggs: liquidFromEggs.toFixed(1) + 'g',
    milk: liquidFromMilk.toFixed(1) + 'g',
    cream: liquidFromCream.toFixed(1) + 'g',
    honey: liquidFromHoney.toFixed(1) + 'g',
    butter: liquidFromButter.toFixed(1) + 'g',
    total: totalEnrichmentLiquid.toFixed(1) + 'g'
  });
  
  // Calculate adjusted water needed
  // Total water needed = (total flour × target hydration) - water from levain - liquid from enrichments
  const totalWaterNeeded = Math.round(totalFlour * targetWaterHydration);
  const doughWater = Math.round(Math.max(0, totalWaterNeeded - totalLevainWater - totalEnrichmentLiquid));
  
  console.log('Dough flour:', doughFlour);
  console.log('Dough water:', doughWater);
  console.log('Target water hydration:', (targetWaterHydration * 100).toFixed(0) + '%');
  
  // Calculate actual water-only hydration (accounting for all liquid sources)
  const totalWater = totalLevainWater + doughWater + totalEnrichmentLiquid;
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
  
  // Build DOUGH section - include ALL original ingredients
  const doughIngredients: ParsedIngredient[] = [
    {
      name: 'all of the levain',
      amount: levainTotal,
      unit: 'g',
      type: 'starter'
    },
    {
      name: 'bread flour',
      amount: doughFlour,
      unit: 'g',
      type: 'flour'
    }
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
  
  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: [...levainIngredients, ...doughIngredients],
    yeastAmount: 0,
    starterAmount: levainTotal,
    totalFlour: totalFlour,
    totalLiquid: totalWater, // Water only, not including milk
    hydration: waterHydration // Water-only hydration for enriched doughs
  };
  
  console.log('Converted recipe hydration:', waterHydration.toFixed(1) + '%');
  console.log('Starter flour contribution:', totalLevainFlour + 'g (' + ((totalLevainFlour / totalFlour) * 100).toFixed(1) + '% of total flour)');
  console.log('Active starter used:', activeStarterWeight + 'g (provides ' + starterFlourContent + 'g flour)');
  console.log('Levain build ratio: ' + activeStarterWeight + 'g starter : ' + levainWater + 'g water : ' + levainFlour + 'g flour = ' + levainTotal + 'g total');
  
  // Calculate actual starter percentage for validation
  const actualStarterPercentage = (totalLevainFlour / totalFlour) * 100;

  // Classify dough type
  const classification = classifyDough(
    sugarAmount,
    butterAmount,
    milkAmount,
    totalFlour
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
  const substitutions = generateSubstitutions(converted);
  
  // Add special technique warnings if original recipe text provided
  if (originalRecipeText) {
    const techniqueWarnings = detectSpecialTechniques(originalRecipeText);
    warnings.unshift(...techniqueWarnings);
  }

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
