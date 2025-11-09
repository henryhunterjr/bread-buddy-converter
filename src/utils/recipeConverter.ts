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
  
  console.log('=== YEAST TO SOURDOUGH CONVERSION ===');
  console.log('Total flour:', totalFlour);
  console.log('Input ingredients:', recipe.ingredients.map(i => `${i.amount}g ${i.name} (type: ${i.type})`));
  
  // STEP 2: Separate ingredients by type
  const waterIngredients = recipe.ingredients.filter(i => 
    i.type === 'liquid' && !i.name.toLowerCase().includes('milk')
  );
  const milkIngredients = recipe.ingredients.filter(i => 
    i.type === 'liquid' && i.name.toLowerCase().includes('milk')
  );
  const saltIngredients = recipe.ingredients.filter(i => i.type === 'salt');
  const allOtherIngredients = recipe.ingredients.filter(i => i.type === 'other');
  
  const originalWater = waterIngredients.reduce((sum, i) => sum + i.amount, 0);
  const milkAmount = milkIngredients.reduce((sum, i) => sum + i.amount, 0);
  
  console.log('Original water:', originalWater);
  console.log('Milk amount:', milkAmount);
  console.log('Other ingredients:', allOtherIngredients);
  
  // Calculate enrichment percentages
  const sugarAmount = allOtherIngredients
    .filter(i => i.name.toLowerCase().includes('sugar') || i.name.toLowerCase().includes('honey'))
    .reduce((sum, i) => sum + i.amount, 0);
  const fatAmount = allOtherIngredients
    .filter(i => i.name.toLowerCase().includes('butter') || i.name.toLowerCase().includes('oil'))
    .reduce((sum, i) => sum + i.amount, 0);
  
  const sugarPercentage = (sugarAmount / totalFlour) * 100;
  const fatPercentage = (fatAmount / totalFlour) * 100;
  const isEnrichedDough = sugarAmount > 0 || fatAmount > 0 || milkAmount > 0;
  
  console.log('Sugar:', sugarAmount, `(${sugarPercentage.toFixed(1)}%)`);
  console.log('Fat:', fatAmount, `(${fatPercentage.toFixed(1)}%)`);
  console.log('Is enriched:', isEnrichedDough);
  
  // STEP 3: Calculate proper starter amount (20% of flour for enriched, 15% for lean)
  const starterPercentage = isEnrichedDough ? 0.20 : 0.15;
  const targetLevainFlour = Math.round(totalFlour * starterPercentage);
  
  console.log('Target levain flour:', targetLevainFlour, `(${starterPercentage * 100}% of ${totalFlour}g)`);
  
  // Build levain: 1:1:1 ratio
  // To get targetLevainFlour (e.g., 100g) total flour in levain:
  // activeStarter (100% hydration) = X, so X/2 is flour
  // addedFlour = X
  // Total flour = X/2 + X = 1.5X = targetLevainFlour
  // Therefore X = targetLevainFlour / 1.5
  const activeStarterWeight = Math.round(targetLevainFlour / 1.5);
  const levainWater = activeStarterWeight;
  const levainFlour = activeStarterWeight;
  const levainTotal = activeStarterWeight + levainWater + levainFlour;
  
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
  
  // Add ALL other ingredients exactly as they were
  doughIngredients.push(...milkIngredients); // Milk
  doughIngredients.push(...saltIngredients); // Salt
  doughIngredients.push(...allOtherIngredients); // Butter, eggs, sugar, etc.
  
  console.log('Final dough ingredients:', doughIngredients.map(i => `${i.amount}g ${i.name}`));
  
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
        ? `In a large bowl, dissolve levain into ${doughWater}g warm water. Add flour and mix until shaggy. Rest 30-45 minutes (autolyse). Then add enrichments (butter should be softened, eggs at room temperature). Mix until just combined.`
        : `In a large bowl, dissolve levain into ${doughWater}g warm water. Add flour and mix until shaggy. Rest 45–60 minutes (autolyse) to allow flour to fully hydrate.`,
      timing: isEnrichedDough ? '30-45 min autolyse' : '45-60 min autolyse'
    },
    {
      step: '3. ADD SALT & DEVELOP STRENGTH',
      change: 'Sprinkle in salt, mix or pinch to incorporate throughout the dough. Rest 20–30 minutes to allow salt to dissolve and gluten to relax.',
      timing: '20-30 min rest'
    },
    {
      step: '4. BULK FERMENTATION',
      change: isEnrichedDough
        ? `Perform 3-4 sets of stretch and folds every 30-45 minutes during the first 2-3 hours. Enriched doughs ferment more slowly due to sugar and fat. Bulk fermentation may take 5-7 hours at 75-78°F. Stop when dough has risen 50-75% and looks airy.`
        : 'Perform 3–4 sets of stretch and folds every 30–45 minutes during the first 2–3 hours. Then let rest undisturbed for 4–6 hours total at 75–78°F. Stop when dough has risen ~50%, looks airy, and holds its shape. Fermentation is guided by dough strength and temperature, not the clock.',
      timing: isEnrichedDough ? '5-7 hours at 75-78°F' : '4-6 hours at 75-78°F'
    },
    {
      step: '5. SHAPE',
      change: 'Turn dough onto lightly floured surface. Pre-shape into a round, rest 20 minutes, then perform final shape (boule or batard). Build surface tension by pulling dough toward you while rotating.',
      timing: '20 min bench rest + shaping'
    },
    {
      step: '6. FINAL PROOF',
      change: isEnrichedDough
        ? 'Place shaped dough in a greased pan or banneton. Proof 2-3 hours at room temperature until dough springs back slowly when pressed. Enriched doughs are more delicate—avoid over-proofing.'
        : 'Place shaped dough seam-side up in a floured banneton or bowl. Proof 2–4 hours at room temperature until dough springs back slowly when pressed, OR refrigerate overnight (8–12 hours) for enhanced flavor development.',
      timing: isEnrichedDough ? '2-3 hours room temp' : '2-4 hours room temp or 8-12 hours cold'
    },
    {
      step: '7. BAKE',
      change: isEnrichedDough
        ? 'Preheat oven to 375°F (190°C). Optionally brush with egg wash for shine. Bake 35-40 minutes until deep golden and internal temperature reaches 190-195°F. Enriched doughs bake at lower temperature to prevent burning the sugars.'
        : 'Preheat Dutch oven to 450°F (232°C). Score the top of the dough with a sharp blade. Bake covered for 20 minutes to trap steam, then uncover and bake 25–30 minutes more until deep golden brown and internal temperature reaches 205–210°F.',
      timing: isEnrichedDough ? '35-40 min at 375°F (190°C)' : '45-50 min at 450°F (232°C)'
    },
    {
      step: '8. COOL',
      change: isEnrichedDough
        ? 'Remove from pan and cool on a wire rack for at least 1 hour before slicing. Enriched breads set faster than lean sourdoughs.'
        : 'Remove from Dutch oven and cool on a wire rack for minimum 2 hours before slicing. This allows the crumb to set properly.',
      timing: isEnrichedDough ? '1 hour minimum' : '2 hours minimum'
    }
  ];

  const troubleshootingTips = [
    {
      issue: 'Tight Crumb',
      solution: isEnrichedDough
        ? 'Dough was under-fermented. Enriched doughs take longer—extend bulk fermentation by 1-2 hours and watch for 50-75% rise.'
        : 'Dough was under-fermented or starter too weak. Build a strong, bubbly levain that doubles in 6–8 hours and extend bulk fermentation until dough rises ~50% and looks airy.'
    },
    {
      issue: 'Gummy Crumb',
      solution: isEnrichedDough
        ? 'Sliced too soon. Cool enriched breads at least 1 hour (preferably 2+) before slicing.'
        : 'Sliced too soon or dough overhydrated. Always cool sourdough minimum 2 hours (preferably 4+) before slicing, and verify hydration is appropriate for your flour type.'
    },
    {
      issue: 'Dark/Burnt Crust',
      solution: isEnrichedDough
        ? 'Sugar causes faster browning. Lower oven temperature to 350-375°F and tent with foil if browning too quickly.'
        : 'Oven temperature too high. Reduce to 425°F and check internal temperature (should reach 205-210°F).'
    },
    {
      issue: 'Weak Rise',
      solution: 'Inactive starter or cold dough temperature. Ensure starter is at peak activity (doubled and bubbly) before mixing, and maintain dough temperature at 75–78°F during bulk fermentation.'
    }
  ];
  
  // Add enrichment-specific warnings
  if (sugarPercentage > 10) {
    troubleshootingTips.push({
      issue: 'High Sugar Content Detected',
      solution: `Sugar content is ${Math.round(sugarPercentage)}% of flour. This will slow fermentation significantly. Consider increasing starter to 25% or extending bulk fermentation by 2-3 hours.`
    });
  }
  
  if (fatPercentage > 15) {
    troubleshootingTips.push({
      issue: 'High Fat Content Detected',
      solution: `Fat content is ${Math.round(fatPercentage)}% of flour. Add butter AFTER initial mixing (during first fold) to prevent coating flour particles and inhibiting gluten development.`
    });
  }
  
  // Add reminder note about watching the dough
  troubleshootingTips.push({
    issue: 'Remember',
    solution: 'Watch the dough, not the clock. Fermentation times vary with temperature, starter strength, and flour type.'
  });

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
