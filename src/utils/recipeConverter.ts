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
import { generateSmartWarnings } from './smartWarnings';

export function convertSourdoughToYeast(recipe: ParsedRecipe, originalRecipeText?: string, starterHydration: number = 100): ConvertedRecipe {
  // STEP 1: Calculate TRUE total ingredients from sourdough recipe
  // Starter hydration ratio calculation
  const starterFlourRatio = 100 / (100 + starterHydration);
  const starterWaterRatio = starterHydration / (100 + starterHydration);
  const starterFlour = recipe.starterAmount * starterFlourRatio;
  const starterWater = recipe.starterAmount * starterWaterRatio;
  
  // Debug logging
  console.log('=== SOURDOUGH TO YEAST CONVERSION ===');
  console.log('Input recipe.totalFlour:', recipe.totalFlour);
  console.log('Input recipe.totalLiquid:', recipe.totalLiquid);
  console.log('Input recipe.starterAmount:', recipe.starterAmount);
  console.log('Starter hydration:', starterHydration + '%');
  console.log('Parsed ingredients:', recipe.ingredients.map(i => `${i.amount}g ${i.name} (type: ${i.type})`));
  
  // TRUE totals including what's IN the starter
  const trueFlour = recipe.totalFlour; // Already includes starter flour from parser
  const trueWater = recipe.totalLiquid; // Already includes starter water from parser
  const trueHydration = (trueWater / trueFlour) * 100;
  
  console.log('Calculated trueFlour:', trueFlour);
  console.log('Calculated trueWater:', trueWater);
  console.log('Calculated trueHydration:', trueHydration);
  
  // STEP 2: Build clean ingredient list for yeast version - PRESERVE multi-flour ratios
  // Separate flour ingredients from non-flour ingredients
  const flourIngredients = recipe.ingredients.filter(i => i.type === 'flour');
  const nonStarterIngredients = recipe.ingredients.filter(
    i => i.type !== 'starter' && i.type !== 'liquid' && i.type !== 'flour'
  );
  
  // Calculate yeast amount: 0.7-1.1% of flour weight
  const instantYeastAmount = Math.round(trueFlour * 0.011); // 1.1%
  const activeDryYeastAmount = Math.round(instantYeastAmount * 1.25);
  
  // Build final ingredient list - PRESERVE multi-flour ratios
  const convertedIngredients: ParsedIngredient[] = [
    ...flourIngredients.map(f => ({
      ...f,
      // Remove any starter-related notes from flour names
      name: f.name.replace(/for levain|in levain|levain/gi, '').trim()
    })),
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

  // Detect special techniques and dough type for method tailoring
  const specialTechniques = originalRecipeText ? detectSpecialTechniques(originalRecipeText) : [];
  const hasTangzhong = specialTechniques.some(t => t.message.includes('Tangzhong'));
  const hasAutolyse = specialTechniques.some(t => t.message.includes('Autolyse'));
  
  const hasEggs = convertedIngredients.some(i => 
    i.type === 'enrichment' || i.name.toLowerCase().includes('egg')
  );
  const butterAmount = nonStarterIngredients
    .filter(i => i.type === 'fat' || i.name.toLowerCase().includes('butter'))
    .reduce((sum, i) => sum + i.amount, 0);
  const sugarAmount = nonStarterIngredients
    .filter(i => i.type === 'sweetener' || i.name.toLowerCase().includes('sugar'))
    .reduce((sum, i) => sum + i.amount, 0);
  const isEnriched = hasEggs || butterAmount > 0 || sugarAmount > 0;

  const methodChanges: MethodChange[] = [
    // Step 0: Tangzhong (if detected)
    ...(hasTangzhong ? [{
      step: '0. TANGZHONG (WATER ROUX)',
      change: 'Combine 1 part flour with 5 parts liquid (water or milk from recipe). Cook over medium heat, stirring constantly, until thick paste forms (149-150°F). Cool completely before using.',
      timing: '5-10 min cook + 30 min cool'
    }] : []),
    {
      step: '1. MIX' + (hasAutolyse ? ' & AUTOLYSE' : ' & KNEAD'),
      change: hasAutolyse 
        ? 'Mix flour and water only. Rest 20-60 minutes (autolyse). Then add remaining ingredients and knead 8-10 minutes by hand or 5-6 minutes by mixer until smooth and elastic.'
        : 'Combine all ingredients in a bowl. Knead by hand for 8–10 minutes or with a stand mixer (dough hook) for 5–6 minutes until smooth and elastic. Dough should pass the windowpane test.',
      timing: hasAutolyse ? '20-60 min autolyse + 8-10 min knead' : '8-10 min by hand, 5-6 min mixer'
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
      change: isEnriched
        ? 'Preheat oven to 350°F (175°C). Brush with egg wash or milk for a golden crust. Bake 30–35 minutes until deep golden and internal temperature is 190–195°F.'
        : 'Preheat oven to 450°F (230°C). Score the top and optionally spray with water for steam. Bake 35–40 minutes until deep brown and internal temperature is 205–210°F.',
      timing: isEnriched ? '30-35 min at 350°F' : '35-40 min at 450°F'
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
  const smartWarnings = generateSmartWarnings(recipe);
  const allWarnings = [...smartWarnings, ...warnings];
  const substitutions = generateSubstitutions(converted);
  
  // Add special technique warnings if original recipe text provided
  if (originalRecipeText) {
    const techniqueWarnings = detectSpecialTechniques(originalRecipeText);
    allWarnings.unshift(...techniqueWarnings);
  }

  return {
    original: recipe,
    converted,
    direction: 'sourdough-to-yeast',
    methodChanges,
    troubleshootingTips,
    warnings: allWarnings,
    substitutions
  };
}

export function convertYeastToSourdough(recipe: ParsedRecipe, originalRecipeText?: string, starterHydration: number = 100): ConvertedRecipe {
  // STEP 1: Identify total flour
  const totalFlour = recipe.totalFlour;
  
  console.log('=== YEAST TO SOURDOUGH CONVERSION (FIXED) ===');
  console.log('Total flour:', totalFlour);
  console.log('Starter hydration:', starterHydration + '%');
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

  // STEP 2.5: Calculate ORIGINAL recipe hydration FIRST (before levain build)
  // This is the KEY FIX - we must maintain the original recipe's hydration!
  const liquidFromEggs = eggAmount * 0.75;
  const liquidFromMilk = milkAmount * 1.0; // Count milk at 100%
  const totalEnrichmentLiquid = liquidFromEggs + liquidFromMilk;
  const originalTotalLiquid = originalWater + totalEnrichmentLiquid;
  const originalHydration = originalTotalLiquid / totalFlour; // e.g., 0.78125 for 78.125%

  console.log('=== ORIGINAL RECIPE HYDRATION ===');
  console.log('Original water:', originalWater + 'g');
  console.log('Liquid from eggs:', liquidFromEggs.toFixed(1) + 'g (75% of ' + eggAmount + 'g)');
  console.log('Liquid from milk:', liquidFromMilk.toFixed(1) + 'g');
  console.log('Total liquid:', originalTotalLiquid.toFixed(1) + 'g');
  console.log('Original hydration:', (originalHydration * 100).toFixed(1) + '%');

  // STEP 3: Calculate starter amount (20% of flour)
  // For 20% inoculation, we need starter flour to be ~20% of total flour
  const starterPercentage = 0.20;
  const starterFlourNeeded = Math.round(totalFlour * starterPercentage); // 100g for 500g flour

  console.log('Target starter flour contribution:', starterFlourNeeded, `(${starterPercentage * 100}% of ${totalFlour}g)`);

  // LEVAIN BUILD FORMULA at ORIGINAL hydration (not always 100%!):
  // For X% inoculation (default 20%):
  // - Starter seed: 4% of total flour (e.g., 40g for 1000g flour)
  // - Levain flour: X% of total flour (e.g., 96g = 20% of 480g)
  // - Levain water: X% of total flour × ORIGINAL hydration (e.g., 96g × 0.78 = 75g for 78% recipe)
  // Result: Levain matches ORIGINAL recipe hydration, not forced to 100%
  const activeStarterWeight = Math.round(starterFlourNeeded * 0.2); // 4% of total flour
  const levainFlour = starterFlourNeeded; // 20% of total flour
  const levainWater = Math.round(starterFlourNeeded * originalHydration); // KEY FIX: Use ORIGINAL hydration!
  const levainTotal = activeStarterWeight + levainWater + levainFlour;
  
  // Starter breakdown (100% hydration starter means 50% flour, 50% water)
  const starterFlourContent = activeStarterWeight * (starterHydration / (100 + starterHydration)); // Flour from active starter
  const starterWaterContent = activeStarterWeight * (starterHydration / (100 + starterHydration)); // Water from active starter
  
  // Total flour and water in levain
  const totalLevainFlour = levainFlour + starterFlourContent; // 100g + 10g = 110g
  const totalLevainWater = levainWater + starterWaterContent; // 100g + 10g = 110g
  
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

  // Calculate adjusted water needed to MAINTAIN ORIGINAL HYDRATION
  // Total water needed = (total flour × ORIGINAL hydration) - water from levain - liquid from enrichments
  const totalWaterNeeded = Math.round(totalFlour * originalHydration);
  const doughWater = Math.round(Math.max(0, totalWaterNeeded - totalLevainWater - totalEnrichmentLiquid));
  
  console.log('Dough flour:', doughFlour);
  console.log('Dough water:', doughWater);
  console.log('Original hydration (maintained):', (originalHydration * 100).toFixed(1) + '%');

  // Calculate actual water-only hydration (accounting for all liquid sources)
  const totalWater = totalLevainWater + doughWater + totalEnrichmentLiquid;
  const waterHydration = (totalWater / totalFlour) * 100;

  console.log('Actual final hydration:', waterHydration.toFixed(1) + '%');
  console.log('Verification: Should match original hydration of ' + (originalHydration * 100).toFixed(1) + '%');
  
  // Get flour breakdown from original recipe for multi-flour support
  const flourIngredients = recipe.ingredients.filter(i => i.type === 'flour');
  
  // Calculate how much flour goes in levain (20% of total) and dough (80%)
  // CRITICAL: Use levainFlour (not totalLevainFlour) to get the ADDED flour amount
  // This ensures 100% hydration: if we add 200g flour + 200g water to 40g starter, we get 100% hydration
  const flourProportions = flourIngredients.map(f => ({
    ...f,
    proportionOfTotal: f.amount / totalFlour,
    levainAmount: Math.round((f.amount / totalFlour) * levainFlour),  // Use levainFlour for 100% hydration
    doughAmount: Math.round((f.amount / totalFlour) * doughFlour)
  }));
  
  // Build LEVAIN section with proportional flour mix
  const levainIngredients: ParsedIngredient[] = [
    {
      name: `active sourdough starter (${starterHydration}% hydration)`,
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
    ...flourProportions.map(f => ({
      name: f.name,
      amount: f.levainAmount,
      unit: 'g' as const,
      type: 'flour' as const
    }))
  ];
  
  // Build DOUGH section with remaining flour proportions
  const doughIngredients: ParsedIngredient[] = [
    {
      name: 'all of the levain',
      amount: levainTotal,
      unit: 'g',
      type: 'starter'
    },
    ...flourProportions.map(f => ({
      name: f.name,
      amount: f.doughAmount,
      unit: 'g' as const,
      type: 'flour' as const
    }))
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
  
  // Add milk if present - but adjust for levain water usage!
  // When the original recipe has little/no water and we build a levain with water,
  // we need to reduce milk proportionally to maintain original hydration
  if (milkIngredients.length > 0) {
    const levainWaterFromNonWaterSources = Math.max(0, totalLevainWater - originalWater);
    const adjustedMilkIngredients = milkIngredients.map(milk => ({
      ...milk,
      amount: Math.max(0, milk.amount - (levainWaterFromNonWaterSources * (milk.amount / milkAmount)))
    }));

    if (levainWaterFromNonWaterSources > 0) {
      console.log('Adjusting milk to account for levain water:');
      console.log('- Original milk:', milkAmount + 'g');
      console.log('- Levain water (not from original water):', levainWaterFromNonWaterSources.toFixed(1) + 'g');
      console.log('- Adjusted milk:', adjustedMilkIngredients.map(m => m.amount).reduce((a,b) => a+b, 0).toFixed(1) + 'g');
    }

    doughIngredients.push(...adjustedMilkIngredients);
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

  // RECALCULATE final hydration from actual ingredients (after milk adjustment!)
  const allIngredients = [...levainIngredients, ...doughIngredients];
  const finalTotalWater = allIngredients.reduce((sum, ing) => {
    // Skip "all of the levain" composite ingredient to avoid double-counting
    if (ing.name.toLowerCase().includes('all of the levain')) {
      return sum;
    }

    if (ing.type === 'liquid') {
      return sum + ing.amount;
    } else if (ing.type === 'enrichment' || ing.name.toLowerCase().includes('egg')) {
      return sum + (ing.amount * 0.75); // Eggs are 75% water
    } else if (ing.type === 'starter') {
      // Starter contains water based on its hydration
      return sum + (ing.amount * (starterHydration / (100 + starterHydration)));
    }
    return sum;
  }, 0);

  const finalHydration = (finalTotalWater / totalFlour) * 100;

  console.log('=== FINAL HYDRATION VERIFICATION ===');
  console.log('Total liquid (recalculated from actual ingredients):', finalTotalWater.toFixed(1) + 'g');
  console.log('Total flour:', totalFlour + 'g');
  console.log('Final hydration:', finalHydration.toFixed(1) + '%');
  console.log('Should match original:', (originalHydration * 100).toFixed(1) + '%');

  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: allIngredients,
    yeastAmount: 0,
    starterAmount: levainTotal,
    totalFlour: totalFlour,
    totalLiquid: finalTotalWater,
    hydration: finalHydration
  };
  
  console.log('Converted recipe hydration (final):', finalHydration.toFixed(1) + '%');
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
  const smartWarnings = generateSmartWarnings(recipe);
  const allWarnings = [...smartWarnings, ...warnings];
  const substitutions = generateSubstitutions(converted);
  
  // Add special technique warnings if original recipe text provided
  if (originalRecipeText) {
    const techniqueWarnings = detectSpecialTechniques(originalRecipeText);
    allWarnings.unshift(...techniqueWarnings);
  }

  return {
    original: recipe,
    converted,
    direction: 'yeast-to-sourdough',
    methodChanges,
    troubleshootingTips,
    warnings: allWarnings,
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
