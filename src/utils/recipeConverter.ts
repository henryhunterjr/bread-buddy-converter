import { ParsedRecipe, ConvertedRecipe, MethodChange, ParsedIngredient } from '@/types/recipe';

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

  return {
    original: recipe,
    converted,
    direction: 'sourdough-to-yeast',
    methodChanges,
    troubleshootingTips
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

  // Remove yeast and add starter
  if (recipe.yeastAmount > 0 || recipe.yeastAmount === 0) {
    // Remove yeast from ingredients
    converted.ingredients = converted.ingredients.filter(i => i.type !== 'yeast');
    
    // Add 20% starter (100% hydration)
    const starterAmount = recipe.totalFlour * 0.20;
    converted.starterAmount = starterAmount;
    
    // Add starter to ingredients
    converted.ingredients.push({
      name: 'active starter (100% hydration)',
      amount: starterAmount,
      unit: 'g',
      type: 'starter'
    });

    // Adjust flour and water for the starter
    converted.totalFlour = recipe.totalFlour + (starterAmount / 2);
    converted.totalLiquid = recipe.totalLiquid + (starterAmount / 2);
  }

  // Recalculate hydration
  converted.hydration = (converted.totalLiquid / converted.totalFlour) * 100;

  const methodChanges: MethodChange[] = [
    {
      step: '1. LEVAIN BUILD (Night Before)',
      change: 'Mix 50g active starter, 100g water (80–85°F), and 100g flour. Rest covered overnight until doubled and bubbly.',
      timing: '8-12 hours'
    },
    {
      step: '2. AUTOLYSE',
      change: 'Mix flour and water from main dough. Rest 30–60 minutes to hydrate.',
      timing: '30-60 min'
    },
    {
      step: '3. ADD LEVAIN & SALT',
      change: 'Add levain to autolysed dough, mix to combine, then add salt. Rest 20–30 minutes.',
      timing: '20-30 min rest'
    },
    {
      step: '4. BULK FERMENTATION',
      change: 'Rest 4–6 hours at 75–78°F, performing stretch and folds every 30–45 minutes for first 2–3 hours, until dough rises ~50%.',
      timing: '4-6 hours with folds'
    },
    {
      step: '5. SHAPE',
      change: 'Turn out onto lightly floured surface, pre-shape, rest 20 minutes, then do final shape (round or loaf).',
      timing: '20 min bench rest + shaping'
    },
    {
      step: '6. PROOF',
      change: '2–4 hours at room temp or overnight in refrigerator (8–12 hours) for flavor development.',
      timing: '2-4 hours (room) or 8-12 hours (cold)'
    },
    {
      step: '7. BAKE',
      change: 'Bake in covered Dutch oven at 450°F (232°C): 20 minutes covered, then 25–30 minutes uncovered, until internal temperature reaches 205–210°F.',
      timing: '45-50 min total at 450°F (232°C)'
    },
    {
      step: '8. COOL',
      change: 'Cool at least 2 hours before slicing.',
      timing: '2 hours minimum'
    }
  ];

  const troubleshootingTips = [
    {
      issue: 'Tight Crumb',
      solution: 'Dough was under-fermented or starter too weak. Build a strong, bubbly levain (should double in 6-8 hours) and extend bulk fermentation until dough rises ~50%.'
    },
    {
      issue: 'Gummy Interior',
      solution: 'Sliced too soon or dough overhydrated. Always cool sourdough at least 2 hours (preferably 4+) and check hydration is appropriate for flour type.'
    },
    {
      issue: 'Pale Crust',
      solution: 'Oven temperature too low or insufficient steam. Preheat Dutch oven fully to 450°F and ensure lid is on for first 20 minutes to trap steam.'
    }
  ];

  return {
    original: recipe,
    converted,
    direction: 'yeast-to-sourdough',
    methodChanges,
    troubleshootingTips
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
