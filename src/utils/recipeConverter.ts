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
  
  // STEP 2: Separate ingredients by category
  const waterIngredients = recipe.ingredients.filter(i => 
    i.type === 'liquid' && !i.name.toLowerCase().includes('milk')
  );
  const milkIngredients = recipe.ingredients.filter(i => 
    i.type === 'liquid' && i.name.toLowerCase().includes('milk')
  );
  const saltIngredients = recipe.ingredients.filter(i => i.type === 'salt');
  
  // CRITICAL: Capture ALL enrichments explicitly
  const butterIngredients = recipe.ingredients.filter(i => 
    i.type === 'fat' || i.name.toLowerCase().includes('butter') || i.name.toLowerCase().includes('oil')
  );
  const eggIngredients = recipe.ingredients.filter(i => 
    i.type === 'enrichment' || i.name.toLowerCase().includes('egg')
  );
  const sugarIngredients = recipe.ingredients.filter(i => 
    i.type === 'sweetener' || i.name.toLowerCase().includes('sugar') || i.name.toLowerCase().includes('honey')
  );
  
  // Catch any remaining ingredients not categorized above
  const otherIngredients = recipe.ingredients.filter(i => 
    i.type !== 'flour' && 
    i.type !== 'liquid' && 
    i.type !== 'yeast' && 
    i.type !== 'salt' &&
    i.type !== 'fat' &&
    i.type !== 'enrichment' &&
    i.type !== 'sweetener'
  );
  
  const originalWater = waterIngredients.reduce((sum, i) => sum + i.amount, 0);
  const milkAmount = milkIngredients.reduce((sum, i) => sum + i.amount, 0);
  const butterAmount = butterIngredients.reduce((sum, i) => sum + i.amount, 0);
  const eggAmount = eggIngredients.reduce((sum, i) => sum + i.amount, 0);
  const sugarAmount = sugarIngredients.reduce((sum, i) => sum + i.amount, 0);
  
  console.log('Original water:', originalWater, 'g');
  console.log('Milk:', milkAmount, 'g');
  console.log('Butter:', butterAmount, 'g');
  console.log('Eggs:', eggAmount, 'g');
  console.log('Sugar:', sugarAmount, 'g');
  console.log('Other ingredients:', otherIngredients);
  
  // Determine if enriched
  const isEnrichedDough = butterAmount > 0 || eggAmount > 0 || sugarAmount > 0 || milkAmount > 0;
  
  // Calculate percentages for warnings
  const sugarPercentage = (sugarAmount / totalFlour) * 100;
  const fatPercentage = (butterAmount / totalFlour) * 100;
  
  console.log('Is enriched:', isEnrichedDough);
  console.log('Sugar %:', sugarPercentage.toFixed(1));
  console.log('Fat %:', fatPercentage.toFixed(1));
  
  // STEP 3: Calculate starter amount (20% of flour)
  const starterPercentage = 0.20;
  const targetLevainFlour = Math.round(totalFlour * starterPercentage);
  
  console.log('Target levain flour:', targetLevainFlour, `(${starterPercentage * 100}% of ${totalFlour}g)`);
  
  // CORRECT BUILD FORMULA:
  // 1. targetLevainFlour = 20% of total flour (e.g., 500 * 0.20 = 100g)
  // 2. For 100% hydration: total levain weight = targetLevainFlour * 2 = 200g
  // 3. Use 20% inoculation: active starter = levainTotal * 0.20 = 40g
  // 4. Remaining build = 200 - 40 = 160g, split 50/50 = 80g flour + 80g water
  const levainTotal = targetLevainFlour * 2; // For 100% hydration levain
  const activeStarterWeight = Math.round(levainTotal * 0.20); // 20% inoculation
  const remainingBuild = levainTotal - activeStarterWeight;
  const levainFlour = Math.round(remainingBuild / 2);
  const levainWater = Math.round(remainingBuild / 2);
  
  // Starter breakdown (100% hydration)
  const starterFlourContent = activeStarterWeight / 2;
  const starterWaterContent = activeStarterWeight / 2;
  
  // Total flour and water in levain
  const totalLevainFlour = levainFlour + starterFlourContent;
  const totalLevainWater = levainWater + starterWaterContent;
  
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
  
  // CRITICAL: Use original water amount, minus what goes into levain
  // Don't recalculate based on target hydration - trust the original recipe's balance
  const doughWater = Math.round(Math.max(0, originalWater - totalLevainWater));
  
  console.log('Dough flour:', doughFlour);
  console.log('Dough water:', doughWater);
  
  // Calculate water-only hydration (for enriched doughs, water % is separate from total liquid)
  const totalWater = totalLevainWater + doughWater;
  const waterHydration = (totalWater / totalFlour) * 100;
  
  console.log('Water-only hydration:', waterHydration.toFixed(1) + '%');
  
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
  
  // Add ALL enrichments explicitly
  console.log('Adding enrichments to dough:');
  
  if (milkIngredients.length > 0) {
    console.log('  - Milk ingredients:', milkIngredients.length);
    doughIngredients.push(...milkIngredients);
  }
  
  if (butterIngredients.length > 0) {
    console.log('  - Butter ingredients:', butterIngredients.length);
    doughIngredients.push(...butterIngredients);
  }
  
  if (eggIngredients.length > 0) {
    console.log('  - Egg ingredients:', eggIngredients.length);
    doughIngredients.push(...eggIngredients);
  }
  
  if (sugarIngredients.length > 0) {
    console.log('  - Sugar ingredients:', sugarIngredients.length);
    doughIngredients.push(...sugarIngredients);
  }
  
  if (saltIngredients.length > 0) {
    console.log('  - Salt ingredients:', saltIngredients.length);
    doughIngredients.push(...saltIngredients);
  }
  
  if (otherIngredients.length > 0) {
    console.log('  - Other ingredients:', otherIngredients.length);
    doughIngredients.push(...otherIngredients);
  }
  
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
  console.log('Starter percentage (flour from starter/total flour):', ((starterFlourContent / totalFlour) * 100).toFixed(1) + '%');
  console.log('Levain percentage (total flour in levain/total flour):', ((totalLevainFlour / totalFlour) * 100).toFixed(1) + '%');

  const methodChanges: MethodChange[] = [
    {
      step: '1. BUILD LEVAIN (Night Before)',
      change: `Mix ${activeStarterWeight}g active starter, ${levainWater}g water (80–85°F), and ${levainFlour}g flour. Cover loosely and rest overnight (8-12 hours) until doubled and bubbly. This provides ${Math.round(starterPercentage * 100)}% inoculation for ${isEnrichedDough ? 'this enriched dough' : 'optimal fermentation'}.`,
      timing: '8-12 hours overnight'
    },
    {
      step: '2. MIX DOUGH (Morning)',
      change: isEnrichedDough 
        ? `In a large bowl, dissolve levain into ${doughWater > 0 ? doughWater + 'g' : 'the'} warm water${milkAmount > 0 ? ' and ' + milkAmount + 'g milk' : ''}. Add ${doughFlour}g flour and mix until shaggy. Rest 30-45 minutes (autolyse). ${butterAmount > 0 ? 'Add softened butter gradually during first fold, not in initial mix.' : ''} ${eggAmount > 0 ? 'Add eggs at room temperature after autolyse.' : ''}`
        : `In a large bowl, dissolve levain into ${doughWater}g warm water. Add ${doughFlour}g flour and mix until shaggy. Rest 45–60 minutes (autolyse) to allow flour to fully hydrate.`,
      timing: isEnrichedDough ? '30-45 min autolyse' : '45-60 min autolyse'
    },
    {
      step: '3. ADD SALT & DEVELOP STRENGTH',
      change: `Sprinkle in ${recipe.saltAmount}g salt, mix or pinch to incorporate throughout the dough. Rest 20–30 minutes to allow salt to dissolve and gluten to relax.`,
      timing: '20-30 min rest'
    },
    {
      step: '4. BULK FERMENTATION',
      change: isEnrichedDough
        ? `Perform 3-4 sets of stretch and folds every 30-45 minutes during the first 2-3 hours. Enriched doughs ferment more slowly due to ${sugarAmount > 0 ? 'sugar' : ''}${sugarAmount > 0 && butterAmount > 0 ? ' and ' : ''}${butterAmount > 0 ? 'fat' : ''}. Bulk fermentation may take 5-7 hours at 75-78°F. Stop when dough has risen 50-75% and looks airy.`
        : 'Perform 3–4 sets of stretch and folds every 30–45 minutes during the first 2–3 hours. Then let rest undisturbed for 4–6 hours total at 75–78°F. Stop when dough has risen ~50%, looks airy, and holds its shape. Fermentation is guided by dough strength and temperature, not the clock.',
      timing: isEnrichedDough ? '5-7 hours at 75-78°F' : '4-6 hours at 75-78°F'
    },
    {
      step: '5. SHAPE',
      change: isEnrichedDough
        ? 'Turn dough onto lightly floured surface. Shape into desired form (rolls, loaf, etc.). Enriched doughs are softer and more forgiving to shape.'
        : 'Turn dough onto lightly floured surface. Pre-shape into a round, rest 20 minutes, then perform final shape (boule or batard). Build surface tension by pulling dough toward you while rotating.',
      timing: '20 min bench rest + shaping'
    },
    {
      step: '6. FINAL PROOF',
      change: isEnrichedDough
        ? 'Place shaped dough in greased pan or banneton. Proof 2-3 hours at room temperature until puffy and nearly doubled. When pressed, dough should spring back slowly.'
        : 'Place shaped dough seam-side up in a floured banneton. Proof 2–4 hours at room temperature OR refrigerate overnight (8–12 hours).',
      timing: isEnrichedDough ? '2-3 hours room temp' : '2-4 hours room temp or 8-12 hours cold'
    },
    {
      step: '7. BAKE',
      change: isEnrichedDough
        ? 'Preheat oven to 375°F (190°C). Brush with egg wash if desired. Bake 25-35 minutes until deep golden and internal temperature reaches 190-195°F.'
        : 'Preheat Dutch oven to 450°F (232°C). Score the top. Bake covered 20 minutes, then uncovered 25–30 minutes until internal temp 205–210°F.',
      timing: isEnrichedDough ? '25-35 min at 375°F' : '45-50 min at 450°F'
    },
    {
      step: '8. COOL',
      change: isEnrichedDough
        ? 'Cool on wire rack for at least 1 hour before slicing.'
        : 'Cool on wire rack minimum 2 hours before slicing.',
      timing: isEnrichedDough ? '1 hour minimum' : '2 hours minimum'
    }
  ];

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
