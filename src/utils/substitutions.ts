import { ParsedRecipe, IngredientSubstitution } from '@/types/recipe';

export function generateSubstitutions(recipe: ParsedRecipe): IngredientSubstitution[] {
  const substitutions: IngredientSubstitution[] = [];
  
  // Check each ingredient for possible substitutions
  recipe.ingredients.forEach(ingredient => {
    const lowerName = ingredient.name.toLowerCase();
    
    // Flour substitutions
    if (lowerName.includes('bread flour') || lowerName.includes('strong flour')) {
      substitutions.push({
        original: 'Bread flour',
        substitute: 'All-purpose flour',
        ratio: '1:1',
        hydrationAdjustment: 0,
        notes: 'Slightly less protein (10-11% vs 12-14%). May result in softer texture. No hydration adjustment needed.'
      });
      
      substitutions.push({
        original: 'Bread flour',
        substitute: 'Whole wheat flour (50/50 blend)',
        ratio: '1:1 (replace up to 50%)',
        hydrationAdjustment: 5,
        notes: 'Replace half the bread flour with whole wheat. Add 5-7% more water (e.g., if recipe uses 300g water, add 15-20g more). Dough will be denser and nuttier.'
      });
    }
    
    if (lowerName.includes('all-purpose') || lowerName.includes('plain flour')) {
      substitutions.push({
        original: 'All-purpose flour',
        substitute: 'Bread flour',
        ratio: '1:1',
        hydrationAdjustment: 0,
        notes: 'Higher protein content (12-14% vs 10-11%). Will produce chewier texture. No hydration adjustment needed.'
      });
    }
    
    // Sugar/sweetener substitutions
    if (lowerName.includes('sugar') && !lowerName.includes('brown')) {
      substitutions.push({
        original: 'Granulated sugar',
        substitute: 'Honey',
        ratio: '1:0.75 (use 25% less honey)',
        hydrationAdjustment: -2,
        notes: 'Honey is liquid. For every 100g sugar replaced, reduce water by 20-25g (about 2% of flour weight). Adds moisture and deeper flavor.'
      });
      
      substitutions.push({
        original: 'Granulated sugar',
        substitute: 'Brown sugar',
        ratio: '1:1',
        hydrationAdjustment: 0,
        notes: 'Brown sugar adds molasses flavor and slightly more moisture. Use equal amounts.'
      });
    }
    
    if (lowerName.includes('honey')) {
      substitutions.push({
        original: 'Honey',
        substitute: 'Granulated sugar',
        ratio: '1:1.25 (use 25% more sugar)',
        hydrationAdjustment: 2,
        notes: 'Sugar is dry. For every 100g honey replaced, add 20-25g more water (about 2% of flour weight). Less complex flavor.'
      });
    }
    
    // Fat substitutions
    if (lowerName.includes('butter')) {
      substitutions.push({
        original: 'Butter',
        substitute: 'Olive oil or neutral oil',
        ratio: '1:0.75 (use 25% less oil)',
        hydrationAdjustment: 0,
        notes: 'Butter is ~80% fat, 20% water/milk solids. Use 75g oil for every 100g butter. Texture will be slightly softer but less rich.'
      });
    }
    
    if (lowerName.includes('oil')) {
      substitutions.push({
        original: 'Oil',
        substitute: 'Butter (melted)',
        ratio: '1:1.25 (use 25% more butter)',
        hydrationAdjustment: 0,
        notes: 'Use 125g melted butter for every 100g oil. Adds richer flavor and flakier texture.'
      });
    }
    
    // Yeast substitutions
    if (lowerName.includes('instant yeast')) {
      substitutions.push({
        original: 'Instant yeast',
        substitute: 'Active dry yeast',
        ratio: '1:1.25',
        hydrationAdjustment: 0,
        notes: 'Use 25% more active dry yeast. Dissolve in warm water (105-110°F) for 5-10 minutes before adding to dough.'
      });
    }
    
    if (lowerName.includes('active dry yeast') || (lowerName.includes('yeast') && lowerName.includes('dry'))) {
      substitutions.push({
        original: 'Active dry yeast',
        substitute: 'Instant yeast',
        ratio: '1:0.75',
        hydrationAdjustment: 0,
        notes: 'Use 25% less instant yeast. Can be mixed directly with flour—no need to dissolve first.'
      });
    }
    
    // Egg substitutions (for enriched doughs)
    if (lowerName.includes('egg') && !lowerName.includes('wash')) {
      substitutions.push({
        original: 'Eggs (whole)',
        substitute: 'Flax eggs (vegan)',
        ratio: '1 egg : 1 tbsp ground flaxseed + 3 tbsp water',
        hydrationAdjustment: 0,
        notes: 'Mix ground flaxseed with water, let sit 5 minutes until gel-like. Works best in dense breads. Provides binding but not leavening.'
      });
      
      substitutions.push({
        original: 'Eggs (whole)',
        substitute: 'Aquafaba (chickpea liquid)',
        ratio: '1 egg : 3 tbsp aquafaba',
        hydrationAdjustment: 0,
        notes: 'Use liquid from canned chickpeas. Best for enriched doughs. Provides structure and some lift.'
      });
    }
    
    // Milk substitutions (for enriched doughs)
    if (lowerName.includes('milk') && !lowerName.includes('powder')) {
      substitutions.push({
        original: 'Whole milk',
        substitute: 'Water',
        ratio: '1:1',
        hydrationAdjustment: 0,
        notes: 'Direct 1:1 replacement. Bread will be slightly less rich and tender. Add 1 tbsp butter per cup of milk for richer flavor.'
      });
      
      substitutions.push({
        original: 'Whole milk',
        substitute: 'Plant-based milk (soy, oat, almond)',
        ratio: '1:1',
        hydrationAdjustment: 0,
        notes: 'Use unsweetened varieties. Soy milk is closest to dairy milk in protein. Oat adds sweetness. Almond is thinner.'
      });
      
      substitutions.push({
        original: 'Whole milk',
        substitute: 'Buttermilk',
        ratio: '1:1 (add 1/4 tsp baking soda per cup)',
        hydrationAdjustment: 0,
        notes: 'Adds tanginess and tenderness. Add 1/4 tsp baking soda per cup to neutralize acidity.'
      });
    }
  });
  
  // Remove duplicates based on original + substitute combination
  const uniqueSubstitutions = substitutions.filter((sub, index, self) =>
    index === self.findIndex((s) => 
      s.original === sub.original && s.substitute === sub.substitute
    )
  );
  
  return uniqueSubstitutions;
}
