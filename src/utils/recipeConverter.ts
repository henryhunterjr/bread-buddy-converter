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
  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: [...recipe.ingredients],
    starterAmount: 0,
    yeastAmount: 0,
    totalFlour: recipe.totalFlour,
    totalLiquid: recipe.totalLiquid
  };

  // Remove starter and adjust flour/water
  if (recipe.starterAmount > 0) {
    // Remove starter from ingredients
    converted.ingredients = converted.ingredients.filter(i => i.type !== 'starter');
    
    // Starter is already accounted for in totalFlour and totalLiquid
    // Add yeast - show both instant and active dry options
    const instantYeastAmount = recipe.totalFlour * 0.007; // 0.7%
    const activeDryYeastAmount = recipe.totalFlour * 0.009; // 0.9%
    converted.yeastAmount = instantYeastAmount;
    
    converted.ingredients.push({
      name: `instant yeast (${instantYeastAmount.toFixed(0)}g) OR active dry yeast (${activeDryYeastAmount.toFixed(0)}g)`,
      amount: instantYeastAmount,
      unit: 'g',
      type: 'yeast'
    });
  }

  // Reduce hydration by 8% for yeast (multiply by 0.92)
  const adjustedHydration = converted.hydration * 0.92;
  
  // Check if recipe has enrichments (oil, eggs, honey) and add 2% per enrichment
  const hasOil = converted.ingredients.some(i => 
    i.name.toLowerCase().includes('oil') || i.name.toLowerCase().includes('butter')
  );
  const hasEggs = converted.ingredients.some(i => 
    i.name.toLowerCase().includes('egg')
  );
  const hasHoney = converted.ingredients.some(i => 
    i.name.toLowerCase().includes('honey') || i.name.toLowerCase().includes('sugar')
  );
  
  let enrichmentBoost = 0;
  if (hasOil) enrichmentBoost += 2;
  if (hasEggs) enrichmentBoost += 2;
  if (hasHoney) enrichmentBoost += 2;
  
  converted.hydration = adjustedHydration + enrichmentBoost;
  
  // Adjust water amount to match new hydration
  const newWaterAmount = (converted.hydration / 100) * converted.totalFlour;
  const waterIndex = converted.ingredients.findIndex(i => i.type === 'liquid');
  if (waterIndex !== -1) {
    converted.ingredients[waterIndex].amount = newWaterAmount;
  }
  converted.totalLiquid = newWaterAmount;

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
  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: [...recipe.ingredients],
    yeastAmount: 0,
    starterAmount: 0,
    totalFlour: recipe.totalFlour,
    totalLiquid: recipe.totalLiquid
  };

  // Remove yeast completely (any type)
  converted.ingredients = converted.ingredients.filter(i => i.type !== 'yeast');
  
  // Build levain: 20-25% of total flour weight (default to 20%)
  // For a 1000g flour recipe, this is 200g levain (50g starter + 100g water + 100g flour)
  const starterAmount = recipe.totalFlour * 0.20;
  converted.starterAmount = starterAmount;
  
  // Add levain to ingredients with proper description
  converted.ingredients.push({
    name: 'levain (50g active starter + 100g water + 100g flour, built overnight until doubled)',
    amount: starterAmount,
    unit: 'g',
    type: 'starter'
  });

  // Adjust flour and water for the levain
  // Levain adds half flour, half water to totals
  converted.totalFlour = recipe.totalFlour + (starterAmount / 2);
  converted.totalLiquid = recipe.totalLiquid + (starterAmount / 2);
  
  // Increase hydration by 5-8% for sourdough (multiply by 1.08)
  const adjustedHydration = recipe.hydration * 1.08;
  converted.hydration = adjustedHydration;
  
  // Adjust water amount to match new hydration
  const newWaterAmount = (converted.hydration / 100) * converted.totalFlour;
  const waterIndex = converted.ingredients.findIndex(i => i.type === 'liquid');
  if (waterIndex !== -1) {
    converted.ingredients[waterIndex].amount = newWaterAmount;
    converted.ingredients[waterIndex].name = 'water (80-85°F for levain and main dough)';
  }
  converted.totalLiquid = newWaterAmount;

  const methodChanges: MethodChange[] = [
    {
      step: '1. BUILD LEVAIN (Night Before)',
      change: 'Mix 50g active starter, 100g water (80–85°F), and 100g flour. Cover loosely and rest overnight until doubled and bubbly. If you don\'t have active starter, feed yours 6–8 hours before mixing so it\'s at peak activity.',
      timing: '8-12 hours overnight'
    },
    {
      step: '2. MIX DOUGH (Morning)',
      change: 'In a large bowl, dissolve levain into 375–400g warm water. Add flour and mix until shaggy. Rest 45–60 minutes (autolyse) to allow flour to fully hydrate.',
      timing: '45-60 min autolyse'
    },
    {
      step: '3. ADD SALT & DEVELOP STRENGTH',
      change: 'Sprinkle in salt, mix or pinch to incorporate throughout the dough. Rest 20–30 minutes to allow salt to dissolve and gluten to relax.',
      timing: '20-30 min rest'
    },
    {
      step: '4. BULK FERMENTATION',
      change: 'Perform 3–4 sets of stretch and folds every 30–45 minutes during the first 2–3 hours. Then let rest undisturbed for 4–6 hours total at 75–78°F. Stop when dough has risen ~50%, looks airy, and holds its shape. Fermentation is guided by dough strength and temperature, not the clock.',
      timing: '4-6 hours at 75-78°F'
    },
    {
      step: '5. SHAPE',
      change: 'Turn dough onto lightly floured surface. Pre-shape into a round, rest 20 minutes, then perform final shape (boule or batard). Build surface tension by pulling dough toward you while rotating.',
      timing: '20 min bench rest + shaping'
    },
    {
      step: '6. FINAL PROOF',
      change: 'Place shaped dough seam-side up in a floured banneton or bowl. Proof 2–4 hours at room temperature until dough springs back slowly when pressed, OR refrigerate overnight (8–12 hours) for enhanced flavor development.',
      timing: '2-4 hours room temp or 8-12 hours cold'
    },
    {
      step: '7. BAKE',
      change: 'Preheat Dutch oven to 450°F (232°C). Score the top of the dough with a sharp blade. Bake covered for 20 minutes to trap steam, then uncover and bake 25–30 minutes more until deep golden brown and internal temperature reaches 205–210°F.',
      timing: '45-50 min at 450°F (232°C)'
    },
    {
      step: '8. COOL',
      change: 'Remove from Dutch oven and cool on a wire rack for minimum 2 hours before slicing. This allows the crumb to set properly.',
      timing: '2 hours minimum'
    }
  ];

  const troubleshootingTips = [
    {
      issue: 'Tight Crumb',
      solution: 'Dough was under-fermented or starter too weak. Build a strong, bubbly levain that doubles in 6–8 hours and extend bulk fermentation until dough rises ~50% and looks airy.'
    },
    {
      issue: 'Gummy Crumb',
      solution: 'Sliced too soon or dough overhydrated. Always cool sourdough minimum 2 hours (preferably 4+) before slicing, and verify hydration is appropriate for your flour type.'
    },
    {
      issue: 'Pale Crust',
      solution: 'Oven temperature too low or insufficient steam. Preheat Dutch oven fully to 450°F and keep lid on for first 20 minutes to trap steam for proper oven spring and color.'
    },
    {
      issue: 'Weak Rise',
      solution: 'Inactive starter or cold dough temperature. Ensure starter is at peak activity (doubled and bubbly) before mixing, and maintain dough temperature at 75–78°F during bulk fermentation.'
    }
  ];
  
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
  const baseFlour = recipe.totalFlour;
  const percentages = recipe.ingredients.map(ing => ({
    ingredient: ing.name,
    amount: ing.amount,
    percentage: (ing.amount / baseFlour) * 100
  }));

  return percentages;
}
