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
    // Add yeast (0.65% of flour weight)
    const yeastAmount = recipe.totalFlour * 0.0065;
    converted.yeastAmount = yeastAmount;
    
    converted.ingredients.push({
      name: 'instant yeast',
      amount: yeastAmount,
      unit: 'g',
      type: 'yeast'
    });
  }

  // Recalculate hydration
  converted.hydration = (converted.totalLiquid / converted.totalFlour) * 100;

  const methodChanges: MethodChange[] = [
    {
      step: 'FERMENTOLYSE ADDED',
      change: 'Mix flour, water, and yeast. Rest 20-30 minutes. Add salt and continue mixing.',
      timing: '20-30 min'
    },
    {
      step: 'BULK FERMENT',
      change: '1.5-2 hours at 75-78°F, until dough has nearly doubled',
      timing: '1.5-2 hours'
    },
    {
      step: 'PROOF',
      change: '45-75 minutes at room temp, until dough springs back slowly when poked',
      timing: '45-75 min'
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
