/**
 * Smart Context-Aware Warnings
 * 
 * Generates intelligent warnings based on dough type, flour composition,
 * and baking science principles. Goes beyond basic validation to provide
 * expert baker guidance.
 */

import { ParsedRecipe, RecipeWarning } from '@/types/recipe';

export function generateSmartWarnings(recipe: ParsedRecipe): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  // Analyze dough composition
  const composition = analyzeDoughComposition(recipe);
  
  // 1. HYDRATION WARNINGS (context-aware)
  warnings.push(...getHydrationWarnings(recipe, composition));
  
  // 2. ENRICHMENT WARNINGS
  warnings.push(...getEnrichmentWarnings(recipe, composition));
  
  // 3. FLOUR TYPE WARNINGS
  warnings.push(...getFlourTypeWarnings(recipe, composition));
  
  // 4. FERMENTATION WARNINGS
  warnings.push(...getFermentationWarnings(recipe, composition));
  
  // 5. HANDLING WARNINGS
  warnings.push(...getHandlingWarnings(recipe, composition));
  
  // 6. TEMPERATURE & ENVIRONMENT WARNINGS
  warnings.push(...getTemperatureWarnings(recipe, composition));
  
  // 7. MIXING METHOD WARNINGS
  warnings.push(...getMixingWarnings(recipe, composition));
  
  // 8. SCORING PATTERN WARNINGS
  warnings.push(...getScoringWarnings(recipe, composition));
  
  return warnings;
}

interface DoughComposition {
  isEnriched: boolean;
  hasEggs: boolean;
  hasButter: boolean;
  hasMilk: boolean;
  hasSugar: boolean;
  sugarPercentage: number;
  fatPercentage: number;
  enrichmentTotal: number;
  flourTypes: string[];
  hasAllPurpose: boolean;
  hasBreadFlour: boolean;
  hasWholeWheat: boolean;
}

function analyzeDoughComposition(recipe: ParsedRecipe): DoughComposition {
  const totalFlour = recipe.totalFlour;
  
  // Find enrichment ingredients
  const eggs = recipe.ingredients.find(i => i.type === 'enrichment' && i.name.toLowerCase().includes('egg'));
  const butter = recipe.ingredients.find(i => i.type === 'fat' && i.name.toLowerCase().includes('butter'));
  const milk = recipe.ingredients.find(i => i.type === 'liquid' && i.name.toLowerCase().includes('milk'));
  const sugar = recipe.ingredients.find(i => i.type === 'sweetener' && (
    i.name.toLowerCase().includes('sugar') || 
    i.name.toLowerCase().includes('honey')
  ));
  
  const sugarAmount = sugar?.amount || 0;
  const fatAmount = (butter?.amount || 0) + (eggs ? eggs.amount * 0.3 : 0); // Eggs are ~30% fat
  const enrichmentTotal = sugarAmount + fatAmount + (milk?.amount || 0);
  
  // Calculate percentages
  const sugarPercentage = totalFlour > 0 ? (sugarAmount / totalFlour) * 100 : 0;
  const fatPercentage = totalFlour > 0 ? (fatAmount / totalFlour) * 100 : 0;
  
  // Detect flour types
  const flourTypes = recipe.ingredients
    .filter(i => i.type === 'flour')
    .map(i => i.name.toLowerCase());
    
  const hasAllPurpose = flourTypes.some(f => 
    f.includes('all-purpose') || 
    f.includes('ap flour') || 
    (f.includes('flour') && !f.includes('bread') && !f.includes('whole'))
  );
  const hasBreadFlour = flourTypes.some(f => f.includes('bread'));
  const hasWholeWheat = flourTypes.some(f => f.includes('whole wheat') || f.includes('wholemeal'));
  
  return {
    isEnriched: enrichmentTotal > totalFlour * 0.05, // >5% enrichment
    hasEggs: !!eggs,
    hasButter: !!butter,
    hasMilk: !!milk,
    hasSugar: !!sugar,
    sugarPercentage,
    fatPercentage,
    enrichmentTotal,
    flourTypes,
    hasAllPurpose,
    hasBreadFlour,
    hasWholeWheat
  };
}

function getHydrationWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  const hydration = recipe.hydration;
  
  // HIGH HYDRATION WARNINGS (context-aware)
  if (hydration > 75) {
    if (comp.isEnriched) {
      warnings.push({
        type: 'caution',
        message: `High hydration (${hydration.toFixed(0)}%) with enrichments makes sticky dough. Enriched doughs typically work best at 60-68% hydration. Consider reducing water by 5-10% for easier handling.`
      });
    } else if (comp.hasAllPurpose && !comp.hasBreadFlour) {
      warnings.push({
        type: 'caution',
        message: `All-purpose flour at ${hydration.toFixed(0)}% hydration can be challenging. All-purpose handles 70-75% max. Consider switching to bread flour or reducing hydration to 72-75%.`
      });
    } else if (hydration > 85) {
      warnings.push({
        type: 'warning',
        message: `Very high hydration (${hydration.toFixed(0)}%) creates extremely sticky dough. This requires excellent gluten development and gentle handling techniques. Consider autolyse and stretch-and-fold instead of kneading.`
      });
    } else if (hydration > 78 && !comp.hasBreadFlour) {
      warnings.push({
        type: 'info',
        message: `High hydration (${hydration.toFixed(0)}%) works best with high-protein bread flour. Expect a very extensible, sticky dough that benefits from coil folds rather than traditional kneading.`
      });
    }
  }
  
  // LOW HYDRATION WARNINGS
  if (hydration < 60 && !comp.isEnriched) {
    warnings.push({
      type: 'info',
      message: `Lower hydration (${hydration.toFixed(0)}%) creates a stiffer dough. This is typical for bagels or some artisan loaves, but may be drier than expected for standard bread. Increase water if you want a softer crumb.`
    });
  }
  
  // WHOLE WHEAT HYDRATION
  if (comp.hasWholeWheat && hydration < 70) {
    warnings.push({
      type: 'info',
      message: 'Whole wheat flour absorbs more water than white flour. Consider increasing hydration by 5-10% for a softer texture, or allow longer autolyse time for better water absorption.'
    });
  }
  
  return warnings;
}

function getEnrichmentWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (comp.sugarPercentage > 15) {
    warnings.push({
      type: 'info',
      message: `High sugar content (${comp.sugarPercentage.toFixed(0)}% of flour). Sugar slows fermentation and creates tender crumb. Allow extra time for rises, and watch for over-browning in the oven - tent with foil if needed.`
    });
  }
  
  if (comp.fatPercentage > 20) {
    warnings.push({
      type: 'info',
      message: `High fat content (${comp.fatPercentage.toFixed(0)}% of flour). Fat inhibits gluten development and slows fermentation. Knead longer to develop structure, and expect a rich, tender crumb with shorter shelf life.`
    });
  }
  
  if (comp.hasMilk && !comp.hasSugar) {
    warnings.push({
      type: 'info',
      message: 'Milk adds richness and browning but can slow yeast activity slightly. If using cold milk, warm it to room temperature for better fermentation.'
    });
  }
  
  if (comp.hasEggs && recipe.hydration > 65) {
    warnings.push({
      type: 'info',
      message: 'Eggs contribute to hydration (75% water). The dough may be stickier than expected. Dust work surface generously and use bench scraper for easier handling.'
    });
  }
  
  return warnings;
}

function getFlourTypeWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (comp.hasWholeWheat && comp.hasBreadFlour) {
    warnings.push({
      type: 'info',
      message: 'Whole wheat + bread flour blend creates hearty texture with good rise. The whole wheat adds nutty flavor but shortens shelf life—best eaten within 2-3 days.'
    });
  }
  
  if (comp.hasAllPurpose && recipe.yeastAmount > 0 && recipe.hydration > 70) {
    warnings.push({
      type: 'caution',
      message: 'All-purpose flour with high hydration can struggle to hold structure. Reduce mixing time to avoid overworking the weaker gluten network, or increase bread flour proportion.'
    });
  }
  
  return warnings;
}

function getFermentationWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (comp.isEnriched && recipe.starterAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'Enriched sourdough doughs ferment slower due to sugar and fat. Allow 50% longer for bulk ferment (6-9 hours instead of 4-6), or use warmer environment (78-80°F).'
    });
  }
  
  if (comp.sugarPercentage > 10 && recipe.yeastAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'High sugar content osmotically stresses yeast. First rise may take 25% longer than standard recipes. Be patient—yeast will adapt and ferment successfully.'
    });
  }
  
  if (comp.hasWholeWheat && recipe.starterAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'Whole wheat accelerates sourdough fermentation due to extra nutrients. Watch bulk ferment closely—it may be ready 30-60 minutes earlier than white flour versions.'
    });
  }
  
  return warnings;
}

function getHandlingWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (recipe.hydration > 75 && comp.isEnriched) {
    warnings.push({
      type: 'caution',
      message: 'Sticky enriched dough at high hydration requires confident handling. Use well-oiled hands, work quickly, and avoid adding excess flour which toughens the crumb. Embrace the stickiness!'
    });
  }
  
  if (comp.hasButter && comp.fatPercentage > 15) {
    warnings.push({
      type: 'info',
      message: 'High butter content creates very soft dough. Chill dough for 15-30 minutes if too soft to handle. Cold butter firms up, making shaping much easier.'
    });
  }
  
  if (recipe.hydration > 80 && !comp.isEnriched) {
    warnings.push({
      type: 'info',
      message: 'Very wet dough requires gentle touch. Use stretch-and-fold technique instead of traditional kneading. Flour your hands, not the dough, and work with confidence to maintain structure.'
    });
  }
  
  return warnings;
}

function getTemperatureWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (comp.isEnriched && recipe.starterAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'Enriched sourdough benefits from slightly warmer environment (78-82°F vs standard 75-78°F). The extra warmth helps offset fermentation slowdown from fats and sugars.'
    });
  }
  
  if (recipe.hydration > 75 && !comp.isEnriched) {
    warnings.push({
      type: 'info',
      message: 'High-hydration doughs are temperature-sensitive. Keep environment at 75-78°F for best control. Warmer temps speed fermentation but can make sticky dough even harder to handle.'
    });
  }
  
  if (comp.hasMilk && recipe.yeastAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'Milk-based doughs create softer crumb but can slow yeast activity if milk is cold. Warm milk to 100-110°F before mixing for optimal fermentation speed.'
    });
  }
  
  return warnings;
}

function getMixingWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (comp.isEnriched && comp.fatPercentage > 15) {
    warnings.push({
      type: 'info',
      message: 'High-fat enriched doughs benefit from stand mixer with dough hook. Hand kneading is possible but takes 15-20 minutes to fully develop gluten through the fat barrier.'
    });
  }
  
  if (recipe.hydration > 80 && !comp.isEnriched) {
    warnings.push({
      type: 'caution',
      message: 'Very wet doughs are difficult to knead traditionally. Use stretch-and-fold or coil fold technique instead. These gentle methods build strength without overworking the delicate gluten network.'
    });
  }
  
  if (comp.hasWholeWheat && recipe.hydration < 65) {
    warnings.push({
      type: 'info',
      message: 'Whole wheat flour benefits from 30-60 minute autolyse (flour + water rest) before adding salt and leavening. This allows bran particles to hydrate fully and softens the final texture.'
    });
  }
  
  if (comp.hasButter && comp.hasSugar && recipe.yeastAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'Enriched yeast doughs work best when butter is added after initial gluten development. Mix flour, liquid, yeast, and sugar first for 3-5 minutes, then gradually add softened butter.'
    });
  }
  
  return warnings;
}

function getScoringWarnings(recipe: ParsedRecipe, comp: DoughComposition): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  
  if (comp.isEnriched && recipe.starterAmount > 0) {
    warnings.push({
      type: 'info',
      message: 'Enriched sourdough breads need shallower scoring (1/4 inch vs 1/2 inch deep). Rich doughs have weaker gluten structure and won\'t spring as dramatically in the oven.'
    });
  }
  
  if (recipe.hydration > 78 && !comp.isEnriched) {
    warnings.push({
      type: 'info',
      message: 'High-hydration doughs spread rather than rise when scored. Use confident, swift cuts at 30-45° angle. Hesitant scoring can deflate airy structure you\'ve built during fermentation.'
    });
  }
  
  if (comp.hasMilk || comp.hasSugar) {
    warnings.push({
      type: 'caution',
      message: 'Enriched doughs brown faster due to milk proteins and sugars. Start baking at 375-400°F (not 450°F). Watch closely after 20 minutes and tent with foil if browning too quickly.'
    });
  }
  
  return warnings;
}
