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
      step: 'MIX & KNEAD',
      change: 'Combine all ingredients in a bowl. Knead by hand for 8-10 minutes or with a stand mixer (dough hook) for 5-6 minutes until smooth and elastic. The dough should pass the windowpane test.',
      timing: '8-10 min by hand'
    },
    {
      step: 'FIRST RISE',
      change: 'Place dough in a lightly greased bowl, cover with plastic wrap or a damp towel. Let rise at room temperature (75-78°F) until doubled in size.',
      timing: '1-1.5 hours'
    },
    {
      step: 'SHAPE',
      change: 'Punch down the dough to release air. Shape into desired form (loaf, round, braid, etc.). If making a loaf, flatten into a rectangle and roll tightly. For round loaves, create surface tension by pulling edges to center.',
      timing: '5-10 min'
    },
    {
      step: 'FINAL PROOF',
      change: 'Place shaped dough in greased pan or on parchment. Cover and let rise until nearly doubled and springs back slowly when gently poked.',
      timing: '45-60 min'
    },
    {
      step: 'BAKE',
      change: 'Preheat oven to 375°F (190°C). Optional: brush with egg wash for golden crust. Bake until deep golden brown and internal temperature reaches 190-195°F.',
      timing: '35-40 min'
    },
    {
      step: 'COOL',
      change: 'Remove from pan immediately and cool on wire rack for at least 1 hour before slicing. This allows the crumb to set properly.',
      timing: '1 hour minimum'
    }
  ];

  return {
    original: recipe,
    converted,
    direction: 'sourdough-to-yeast',
    methodChanges
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
      step: 'AUTOLYSE EXTENDED',
      change: 'Mix flour and water. Rest 1-2 hours. Add starter.',
      timing: '1-2 hours'
    },
    {
      step: 'FERMENTOLYSE ADDED',
      change: 'After adding starter, mix well and rest 20-30 minutes before adding salt.',
      timing: '20-30 min'
    },
    {
      step: 'BULK FERMENT',
      change: '6-8 hours at 75-78°F until dough has risen 75% and feels airy, OR overnight (12-18 hours) in fridge at 38-40°F',
      timing: '6-8 hours (room) or 12-18 hours (cold)'
    },
    {
      step: 'STRETCH AND FOLDS',
      change: 'Every 30-45 min for first 2-3 hours',
      timing: 'Every 30-45 min'
    },
    {
      step: 'PROOF',
      change: '2-4 hours at room temp, OR overnight cold proof (8-18 hours)',
      timing: '2-4 hours (room) or 8-18 hours (cold)'
    }
  ];

  return {
    original: recipe,
    converted,
    direction: 'yeast-to-sourdough',
    methodChanges
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
