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
 * - Converter uses instant yeast at 1.1% of total flour for a reliable
 *   same-day rise (typical published range is 0.7–1.1%)
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

/**
 * Detects if recipe is a multi-day sourdough requiring complex conversion
 */
function detectMultiDaySourdough(recipeText: string): boolean {
  const text = recipeText.toLowerCase();
  
  // Check for multi-day patterns
  const multiDayPatterns = [
    /day\s*1.*day\s*2/s,
    /day\s*2.*day\s*3/s,
    /primo\s+impasto.*secondo\s+impasto/s,
    /first\s+dough.*second\s+dough/s,
    /lievito\s+madre/i,
    /mother\s+yeast/i
  ];
  
  const hasMultiDay = multiDayPatterns.some(pattern => pattern.test(text));
  
  // Check for multiple long fermentation periods
  const longFermPattern = /\d+[-–]\d+\s*hours/gi;
  const matches = text.match(longFermPattern);
  const multipleLongFerments = matches && matches.length >= 3;
  
  // Check for starter feeding instructions
  const starterFeeding = /feed.*starter|refresh.*starter|starter.*feeding/i.test(text);
  
  return hasMultiDay || (multipleLongFerments && starterFeeding);
}

/**
 * Converts sourdough-specific language to yeast equivalents
 */
function convertSourdoughLanguage(text: string): string {
  let result = text;
  
  // Handle fermentation time conversion with callback
  result = result.replace(/ferment\s+(\d+)[-–](\d+)\s*hours/gi, (match, low, high) => {
    const avgHours = (parseInt(low) + parseInt(high)) / 2;
    const yeastHours = Math.round(avgHours / 4); // Yeast is ~4x faster
    return `rise ${yeastHours}-${yeastHours + 1} hours`;
  });
  
  // Simple string replacements
  const replacements: [RegExp, string][] = [
    [/lievito\s+madre/gi, 'instant yeast'],
    [/sourdough\s+starter/gi, 'yeast'],
    [/mother\s+yeast/gi, 'instant yeast'],
    [/refreshed\s+starter/gi, 'proofed yeast'],
    [/active\s+starter/gi, 'activated yeast'],
    [/enriched\s+sourdough/gi, 'enriched yeasted dough'],
    [/primo\s+impasto/gi, 'first mix'],
    [/secondo\s+impasto/gi, 'final dough'],
    [/26[-–]28°C/g, '24-27°C'],
    [/77[-–]82°F/g, '75-80°F']
  ];
  
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Restructures multi-day timeline to yeast-appropriate schedule
 */
function generateYeastTimeline(
  classification: { type: 'lean' | 'enriched' | 'sweet' },
  isComplex: boolean
): MethodChange[] {
  const { type } = classification;
  
  if (type === 'sweet' || isComplex) {
    // Complex enriched doughs (like panettone)
    return [
      {
        step: 'TIMELINE OVERVIEW',
        change: '🔄 **CONVERTED TO YEASTED VERSION** — Original recipe used sourdough starter over 2-3 days. This version uses commercial yeast and completes in 18-24 hours (overnight bulk + same-day finish).',
        timing: '18-24 hours total'
      },
      {
        step: '1. EVENING: MIX DOUGH',
        change: 'Dissolve instant yeast in warm water (105-110°F). Let stand 5 minutes until foamy. Mix with flour and other dry ingredients until combined. Add eggs at room temperature. Mix until shaggy, then knead 8-10 minutes until smooth. Add softened butter gradually in the last 2-3 minutes of kneading.',
        timing: '15-20 min'
      },
      {
        step: '2. OVERNIGHT BULK FERMENTATION',
        change: 'Cover dough and place in refrigerator (38-40°F). Let ferment overnight (10-14 hours). The cold fermentation develops flavor while controlling yeast activity. Dough should rise 50-75%.',
        timing: '10-14 hours cold'
      },
      {
        step: '3. MORNING: REMOVE FROM FRIDGE',
        change: 'Remove dough from refrigerator. Let stand at room temperature 1-2 hours to warm up and continue rising. Dough should be soft and expanded.',
        timing: '1-2 hours'
      },
      {
        step: '4. ADD ENRICHMENTS & SHAPE',
        change: 'If using dried fruit, nuts, or chocolate, fold them in gently. Shape dough into desired form (panettone mold, loaf pan, etc.). Work quickly to prevent butter from melting.',
        timing: '10-15 min'
      },
      {
        step: '5. FINAL PROOF',
        change: 'Cover shaped dough loosely. Proof at room temperature (75-78°F) until nearly doubled and very puffy, 2-3 hours. Dough should spring back slowly when pressed. Don\'t rush this step—enriched doughs need time.',
        timing: '2-3 hours'
      },
      {
        step: '6. BAKE',
        change: 'Preheat oven to 350-375°F (175-190°C). Brush with egg wash if desired. Bake 35-50 minutes (depending on size) until deep golden brown and internal temperature reaches 190-195°F. Tent with foil if browning too quickly.',
        timing: '35-50 min at 350-375°F'
      },
      {
        step: '7. COOL COMPLETELY',
        change: 'Cool in pan 10 minutes, then turn out onto wire rack. Cool completely (2-3 hours) before slicing. Enriched breads continue to set as they cool.',
        timing: '2-3 hours'
      }
    ];
  }
  
  if (type === 'enriched') {
    // Standard enriched doughs
    return [
      {
        step: 'TIMELINE OVERVIEW',
        change: '🔄 **CONVERTED TO YEASTED VERSION** — Original sourdough timeline simplified. This version completes in 4-6 hours same-day.',
        timing: '4-6 hours total'
      },
      {
        step: '1. MIX DOUGH',
        change: 'Dissolve instant yeast in warm liquids (105-110°F). Let stand 5 minutes. Add flour and mix until shaggy. Rest 20-30 minutes (autolyse). Add salt, then knead 8-10 minutes. Add softened butter in final 2 minutes.',
        timing: '30-40 min'
      },
      {
        step: '2. FIRST RISE',
        change: 'Cover and let rise in warm spot (75-78°F) until doubled, about 1.5-2 hours. Enriched doughs rise slower than lean doughs due to sugar and fat.',
        timing: '1.5-2 hours'
      },
      {
        step: '3. SHAPE',
        change: 'Turn dough onto lightly floured surface. Shape into desired form. Place in greased pan.',
        timing: '10 min'
      },
      {
        step: '4. FINAL PROOF',
        change: 'Cover and proof until puffy and nearly doubled, 1-1.5 hours. Should spring back slowly when pressed.',
        timing: '1-1.5 hours'
      },
      {
        step: '5. BAKE',
        change: 'Preheat oven to 375°F. Brush with egg wash if desired. Bake 25-35 minutes until golden and internal temp reaches 190°F.',
        timing: '25-35 min at 375°F'
      }
    ];
  }
  
  // Lean doughs
  return [
    {
      step: 'TIMELINE OVERVIEW',
      change: '🔄 **CONVERTED TO YEASTED VERSION** — Original sourdough timeline simplified. This version completes in 3-4 hours same-day.',
      timing: '3-4 hours total'
    },
    {
      step: '1. MIX DOUGH',
      change: 'Dissolve instant yeast in warm water (105-110°F). Let stand 5 minutes until foamy. Add flour and salt, mix until shaggy. Knead 10 minutes until smooth and elastic.',
      timing: '15-20 min'
    },
    {
      step: '2. FIRST RISE',
      change: 'Cover and let rise in warm spot (75-78°F) until doubled, about 1-1.5 hours.',
      timing: '1-1.5 hours'
    },
    {
      step: '3. SHAPE & FINAL PROOF',
      change: 'Shape dough and place in pan or on baking sheet. Cover and proof 45-60 minutes until puffy.',
      timing: '45-60 min'
    },
    {
      step: '4. BAKE',
      change: 'Preheat oven to 450°F. Score if desired. Bake with steam 25-35 minutes until golden and hollow-sounding.',
      timing: '25-35 min at 450°F'
    }
  ];
}

/**
 * Computes the total levain weight from its components
 * This ensures consistency across the application and prevents display mismatches
 */
export function computeLevainTotal(levain: { starter: number; flour: number; water: number }): number {
  const starter = Number(levain.starter || 0);
  const flour = Number(levain.flour || 0);
  const water = Number(levain.water || 0);
  return starter + flour + water;
}

/**
 * Remove redundant stage labels from ingredient names
 * Cleans up text like "bread flour for levain" → "bread flour"
 * EXPORTED for use in consolidation logic
 */
export function cleanIngredientName(name: string): string {
  return name
    .replace(/\s+(for|in|from)\s+(levain|dough|starter)/gi, '')
    .replace(/\s+\(levain\)/gi, '')
    .replace(/\s+\(main\s+dough\)/gi, '')
    .replace(/\s+\(dough\)/gi, '')
    .trim();
}

export function convertSourdoughToYeast(recipe: ParsedRecipe, originalRecipeText?: string, starterHydration: number = 100): ConvertedRecipe {
  // DETECT if this is a complex multi-day sourdough
  const isMultiDay = originalRecipeText ? detectMultiDaySourdough(originalRecipeText) : false;
  
  // STEP 1: Calculate TRUE total ingredients from sourdough recipe
  // CRITICAL FIX: Only sum starter amounts that are NOT levain references
  // Levain references point to levain builds already counted elsewhere
  const actualStarterAmount = recipe.ingredients
    .filter(i => i.type === 'starter' && !i.isLevainReference)
    .reduce((sum, i) => sum + i.amount, 0);
  
  // Starter hydration ratio calculation
  const starterFlourRatio = 100 / (100 + starterHydration);
  const starterWaterRatio = starterHydration / (100 + starterHydration);
  const starterFlour = actualStarterAmount * starterFlourRatio;
  const starterWater = actualStarterAmount * starterWaterRatio;
  
  // TRUE totals including what's IN the starter
  const trueFlour = recipe.totalFlour; // Already includes starter flour from parser
  const trueWater = recipe.totalLiquid; // Already includes starter water from parser
  const trueHydration = trueFlour > 0 ? (trueWater / trueFlour) * 100 : 0;
  
  // STEP 2: Build clean ingredient list for yeast version - PRESERVE multi-flour ratios
  // Separate flour ingredients from non-flour ingredients
  const flourIngredients = recipe.ingredients.filter(i => i.type === 'flour');
  const nonStarterIngredients = recipe.ingredients.filter(
    i => i.type !== 'starter' && i.type !== 'liquid' && i.type !== 'flour'
  );
  
  // LIQUID PRESERVATION: Extract original liquid ingredients (excluding starter)
  const originalLiquids = recipe.ingredients.filter(i => i.type === 'liquid');
  const totalOriginalLiquid = originalLiquids.reduce((sum, l) => sum + l.amount, 0);
  
  // Calculate yeast amount: 0.7-1.1% of flour weight
  const instantYeastAmount = Math.round(trueFlour * 0.011); // 1.1%
  const activeDryYeastAmount = Math.round(instantYeastAmount * 1.25);
  
  // BUG FIX #1: Add starter flour back into flour display
  // If recipe has multiple flours, add proportionally to the largest flour
  // If single flour, add all starter flour to it
  const adjustedFlourIngredients = flourIngredients.map((f, idx, arr) => {
    if (arr.length === 1 || idx === 0) {
      // Single flour, or the first (typically largest) of multiple flours:
      // fold the starter's flour back in
      return {
        ...f,
        amount: Math.round(f.amount + starterFlour),
        name: cleanIngredientName(f.name)
      };
    }
    return {
      ...f,
      name: cleanIngredientName(f.name)
    };
  });
  
  // LIQUID PRESERVATION: Distribute total liquid proportionally across original liquid types
  let adjustedLiquidIngredients: ParsedIngredient[];
  
  if (originalLiquids.length === 0) {
    // No liquids in original recipe - default to water (rare case)
    adjustedLiquidIngredients = [{
      name: 'water (80-85°F)',
      amount: Math.round(trueWater),
      unit: 'g',
      type: 'liquid'
    }];
  } else if (originalLiquids.length === 1) {
    const liquid = originalLiquids[0];
    const liquidName = liquid.name.toLowerCase();
    let displayName = liquid.name;

    // Add temperature guidance
    if (liquidName.includes('water')) {
      displayName = displayName.replace(/water/i, 'water (80-85°F)');
    } else if (liquidName.includes('milk')) {
      displayName = displayName.replace(/milk/i, 'milk (80-85°F)');
    }

    if (liquidName.includes('water')) {
      // Single water line absorbs the starter's water
      adjustedLiquidIngredients = [{
        ...liquid,
        name: displayName,
        amount: Math.round(trueWater)
      }];
    } else {
      // Single non-water liquid (e.g. milk): keep it at its original amount and
      // return the starter's water as a separate water line — the starter never
      // contained milk, so milk must not grow.
      const starterWaterToReturn = Math.max(0, trueWater - liquid.amount);
      adjustedLiquidIngredients = [
        { ...liquid, name: displayName },
        {
          name: 'water (80-85°F)',
          amount: Math.round(starterWaterToReturn),
          unit: 'g',
          type: 'liquid'
        }
      ];
    }
  } else {
    // Multiple liquids: keep every non-water liquid (milk, etc.) at its ORIGINAL
    // amount and return the starter's water to the water line only. The starter
    // contained flour and water — never milk — so milk must not grow.
    const starterWaterToReturn = Math.max(0, trueWater - totalOriginalLiquid);
    const waterLine = originalLiquids.find(l => l.name.toLowerCase().includes('water'));
    if (waterLine) {
      adjustedLiquidIngredients = originalLiquids.map(liquid =>
        liquid === waterLine
          ? { ...liquid, amount: Math.round(liquid.amount + starterWaterToReturn) }
          : { ...liquid }
      );
    } else {
      // No explicit water line — add one for the starter's water
      adjustedLiquidIngredients = [
        ...originalLiquids.map(l => ({ ...l })),
        {
          name: 'water (80-85°F)',
          amount: Math.round(starterWaterToReturn),
          unit: 'g',
          type: 'liquid' as const
        }
      ];
    }
  }
  
  // Build final ingredient list - PRESERVE multi-flour ratios AND liquid types
  const convertedIngredients: ParsedIngredient[] = [
    ...adjustedFlourIngredients,
    ...adjustedLiquidIngredients,
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

  // Calculate ingredient amounts for classification
  const sugarAmount = nonStarterIngredients
    .filter(i => i.type === 'sweetener' || i.name.toLowerCase().includes('sugar'))
    .reduce((sum, i) => sum + i.amount, 0);
  const fatAmount = nonStarterIngredients
    .filter(i => i.type === 'fat' || i.name.toLowerCase().includes('butter'))
    .reduce((sum, i) => sum + i.amount, 0);
  const milkAmount = nonStarterIngredients
    .filter(i => i.name.toLowerCase().includes('milk'))
    .reduce((sum, i) => sum + i.amount, 0);
  const saltAmount = nonStarterIngredients
    .filter(i => i.type === 'salt')
    .reduce((sum, i) => sum + i.amount, 0);

  // STEP 5: Generate method instructions based on dough type
  const classification = classifyDough(sugarAmount, fatAmount, milkAmount, trueFlour);
  
  let methodChanges: MethodChange[];
  
  if (isMultiDay) {
    // Use restructured timeline for multi-day sourdough conversions
    methodChanges = generateYeastTimeline(classification, true);
  } else {
    // Standard conversion: detect special techniques
    const specialTechniques = originalRecipeText ? detectSpecialTechniques(originalRecipeText) : [];
    const hasTangzhong = specialTechniques.some(t => t.message.includes('Tangzhong'));
    const hasAutolyse = specialTechniques.some(t => t.message.includes('Autolyse'));
    
    const hasEggs = convertedIngredients.some(i => 
      i.type === 'enrichment' || i.name.toLowerCase().includes('egg')
    );
    const butterAmount = nonStarterIngredients
      .filter(i => i.type === 'fat' || i.name.toLowerCase().includes('butter'))
      .reduce((sum, i) => sum + i.amount, 0);
    const isEnriched = hasEggs || butterAmount > 0 || sugarAmount > 0;

    methodChanges = [
      // Step 0: Tangzhong (if detected)
      ...(hasTangzhong ? [{
        step: 'TANGZHONG (WATER ROUX)',
        change: 'Combine 1 part flour with 5 parts liquid (water or milk from recipe). Cook over medium heat, stirring constantly, until thick paste forms (149-150°F). Cool completely before using.',
        timing: '5-10 min cook + 30 min cool'
      }] : []),
      {
        step: 'PREPARE YEAST',
        change: `Dissolve ${instantYeastAmount}g instant yeast (or ${activeDryYeastAmount}g active dry yeast) in 1/4 cup of the recipe's water, warmed to 105-110°F, for 5-10 minutes until foamy. This ensures yeast viability without adding extra water.`,
        timing: '5-10 minutes'
      },
      {
        step: 'MIX' + (hasAutolyse ? ' & AUTOLYSE' : ' & KNEAD'),
        change: hasAutolyse 
          ? `Mix ${trueFlour}g flour and ${trueWater}g water only. Rest 20-60 minutes (autolyse). Then add proofed yeast, ${saltAmount}g salt, and other ingredients. Knead 8-10 minutes by hand or 5-6 minutes by mixer until smooth and elastic.`
          : `Combine proofed yeast with ${trueWater}g water (or other liquids), ${trueFlour}g flour, ${saltAmount}g salt${sugarAmount > 0 ? `, ${sugarAmount}g sugar` : ''}${butterAmount > 0 ? `, ${butterAmount}g butter (add softened butter last 2 min)` : ''}. Knead by hand for 8–10 minutes or with stand mixer for 5–6 minutes until smooth and elastic. Dough should pass windowpane test.`,
        timing: hasAutolyse ? '20-60 min autolyse + 8-10 min knead' : '8-10 min by hand, 5-6 min mixer'
      },
      {
        step: 'FIRST RISE',
        change: isEnriched 
          ? 'Place in lightly oiled bowl, cover, and let rise 1.5-2 hours at 75–78°F until doubled. Enriched doughs rise slower due to sugar and fat.'
          : 'Place in lightly oiled bowl, cover, and let rise 1–1.5 hours at 75–78°F until doubled in size.',
        timing: isEnriched ? '1.5-2 hours' : '1-1.5 hours'
      },
      {
        step: 'SHAPE',
        change: 'Punch down gently, shape as desired (loaf, braid, or boule), and place on greased pan or parchment.',
        timing: '5-10 min'
      },
      {
        step: 'FINAL PROOF',
        change: isEnriched
          ? 'Cover and let rise 1-1.5 hours until puffy and nearly doubled. Should spring back slowly when pressed.'
          : 'Cover and let rise 45–60 minutes until dough springs back slowly when gently pressed.',
        timing: isEnriched ? '1-1.5 hours' : '45-60 min'
      },
      {
        step: 'BAKE',
        change: isEnriched
          ? 'Preheat oven to 350-375°F (175-190°C). Brush with egg wash if desired. Bake 25-40 minutes until deep golden and internal temperature is 190–195°F. Tent with foil if browning too quickly.'
          : 'Preheat oven to 450°F (230°C). Score the top and spray with water for steam. Bake 25-35 minutes until deep brown and internal temperature is 200-205°F.',
        timing: isEnriched ? '25-40 min at 350-375°F' : '25-35 min at 450°F'
      },
      {
        step: 'COOL',
        change: 'Remove from pan and cool on wire rack at least 1 hour before slicing.',
        timing: '1 hour minimum'
      }
    ];
  }

  // Generate troubleshooting tips - YEAST SPECIFIC
  const troubleshootingTips = [
    {
      issue: 'Dough not rising',
      solution: 'Check yeast expiration date. Ensure water temperature was 105-110°F (not too hot—above 120°F kills yeast). Give dough more time in a warmer spot.'
    },
    {
      issue: 'Dense texture',
      solution: 'Ensure adequate kneading (dough should pass windowpane test). Allow full rise times—don\'t rush fermentation. Check oven temperature with thermometer.'
    },
    {
      issue: 'Too much rise/overflow',
      solution: 'Reduce yeast slightly or shorten rise time. Yeasted doughs can over-proof quickly in warm environments.'
    },
    {
      issue: 'Yeast not foaming during proofing',
      solution: 'Water may be too hot (killed yeast) or too cold (yeast inactive). Yeast may be expired. Try fresh yeast and correct water temperature (105-110°F).'
    },
    {
      issue: 'Crust Too Hard',
      solution: 'Loaf may be overbaked or hydration too low. Check internal temperature (target 190-195°F for enriched, 200-205°F for lean) and consider increasing water by 2-3%.'
    },
    {
      issue: 'Flat Loaf',
      solution: 'Over-proofed dough. Watch for the "slow spring back" test during final proof—if dough doesn\'t spring back at all, it\'s gone too far.'
    }
  ];

  const warnings = generateSmartWarnings(converted);
  const substitutions = generateSubstitutions(converted);
  
  // Add multi-day conversion notice if applicable
  if (isMultiDay) {
    warnings.unshift({
      type: 'info',
      message: '🔄 This recipe was originally a multi-day sourdough process. The conversion restructures the timeline for commercial yeast, completing in 18-24 hours with overnight bulk fermentation instead of 2-3 days with sourdough starter.'
    });
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

export function convertYeastToSourdough(recipe: ParsedRecipe, originalRecipeText?: string, starterHydration: number = 100): ConvertedRecipe {
  // STEP 1: Identify total flour
  const totalFlour = recipe.totalFlour;
  
  // STEP 2: Separate ingredients by category
  // Use WORKING PATTERN from convertSourdoughToYeast: filter OUT what we don't want
  // CRITICAL: Also filter out any existing starter to prevent duplication
  const nonFlourLiquidYeastIngredients = recipe.ingredients.filter(
    i => i.type !== 'flour' && i.type !== 'liquid' && i.type !== 'yeast' && i.type !== 'starter'
  );
  
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
  
  // Determine if enriched
  const isEnrichedDough = butterAmount > 0 || eggAmount > 0 || sugarAmount > 0 || milkAmount > 0;
  
  // Calculate percentages for warnings
  const sugarPercentage = (sugarAmount / totalFlour) * 100;
  const fatPercentage = (butterAmount / totalFlour) * 100;

  // STEP 2.5: Calculate ORIGINAL recipe hydration FIRST (before levain build)
  // This is the KEY FIX - we must maintain the original recipe's hydration!
  const liquidFromEggs = eggAmount * 0.75;  // whole egg ≈ 75% water
  const liquidFromMilk = milkAmount * 0.87; // whole milk ≈ 87% water
  const totalEnrichmentLiquid = liquidFromEggs + liquidFromMilk;
  const originalTotalLiquid = originalWater + totalEnrichmentLiquid;
  const originalHydration = totalFlour > 0 ? originalTotalLiquid / totalFlour : 0; // e.g., 0.78125 for 78.125%

  // STEP 3: Calculate starter amount (20% of flour)
  // For 20% inoculation, we need starter flour to be ~20% of total flour
  const starterPercentage = 0.20;
  const starterFlourNeeded = Math.round(totalFlour * starterPercentage); // 100g for 500g flour

  // LEVAIN BUILD FORMULA - ALWAYS 100% HYDRATION:
  // For 20% inoculation:
  // - Target total levain flour: 20% of total flour (e.g., 112g for 562g flour)
  // - Starter seed: 40% of target levain flour (e.g., 45g for 112g)
  // - Flour to ADD: Target minus flour from starter (e.g., 112g - 22.5g = 89.5g)
  // - Water to ADD: Equal to flour to add for 100% hydration (e.g., 89.5g)
  // Result: Levain always at 100% hydration, matching typical home baker starter maintenance
  const activeStarterWeight = Math.round(starterFlourNeeded * 0.4); // 40% of target = 8% of total flour
  // A starter at H% hydration is flour × (100/(100+H)) and water × (H/(100+H))
  const starterFlourInLevain = activeStarterWeight * (100 / (100 + starterHydration));
  const starterWaterInLevain = activeStarterWeight * (starterHydration / (100 + starterHydration));
  const levainFlour = Math.round(starterFlourNeeded - starterFlourInLevain); // Flour to ADD
  // Water to ADD so the finished levain lands at 100% hydration overall:
  // total levain water must equal total levain flour (= starterFlourNeeded).
  // When the seed starter is 100% hydration this equals levainFlour exactly.
  const levainWater = Math.round(starterFlourNeeded - starterWaterInLevain);

  // Calculate levain total using helper function to ensure consistency
  const levainTotal = computeLevainTotal({
    starter: activeStarterWeight,
    flour: levainFlour,
    water: levainWater
  });

  // Dev-mode validation to catch any display mismatches
  if (process.env.NODE_ENV !== 'production') {
    const expectedTotal = activeStarterWeight + levainWater + levainFlour;
    if (expectedTotal !== levainTotal) {
      console.warn(`Levain total mismatch: expected ${expectedTotal}g but computed ${levainTotal}g`);
    }
  }
  
  // Total flour and water in levain (using values calculated above)
  const totalLevainFlour = levainFlour + starterFlourInLevain;
  const totalLevainWater = levainWater + starterWaterInLevain;
  
  // STEP 4: Calculate remaining dough ingredients
  const doughFlour = Math.round(totalFlour - totalLevainFlour);

  // Calculate adjusted water needed to MAINTAIN ORIGINAL HYDRATION
  // Total water needed = (total flour × ORIGINAL hydration) - water from levain - liquid from enrichments
  const totalWaterNeeded = Math.round(totalFlour * originalHydration);
  const doughWater = Math.round(Math.max(0, totalWaterNeeded - totalLevainWater - totalEnrichmentLiquid));

  // Calculate actual water-only hydration (accounting for all liquid sources)
  const totalWater = totalLevainWater + doughWater + totalEnrichmentLiquid;
  const waterHydration = (totalWater / totalFlour) * 100;
  
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
      name: cleanIngredientName(f.name),
      amount: f.levainAmount,
      unit: 'g' as const,
      type: 'flour' as const
    }))
  ];
  
  // Build DOUGH section with remaining flour proportions
  // Validate levain total before adding to dough ingredients
  // CRITICAL FIX: Sum the ACTUAL flour amounts shown in levain (not the theoretical levainFlour)
  // This accounts for rounding when multiple flours are broken down proportionally
  const actualLevainFlourTotal = flourProportions.reduce((sum, f) => sum + f.levainAmount, 0);
  
  const validatedLevainTotal = computeLevainTotal({
    starter: activeStarterWeight,
    flour: actualLevainFlourTotal,
    water: levainWater
  });

  if (process.env.NODE_ENV !== 'production' && validatedLevainTotal !== levainTotal) {
    console.error(`❌ CRITICAL: Levain total mismatch when creating dough ingredient!`);
    console.error(`Expected: ${validatedLevainTotal}g (${activeStarterWeight}g + ${actualLevainFlourTotal}g + ${levainWater}g)`);
    console.error(`Got: ${levainTotal}g`);
  }

  const doughIngredients: ParsedIngredient[] = [
    {
      name: 'all of the levain',
      amount: validatedLevainTotal,
      unit: 'g',
      type: 'starter'
    },
    ...flourProportions.map(f => ({
      name: cleanIngredientName(f.name),
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
    // Milk is ~87% water, so replacing X g of water requires removing X/0.87 g of milk
    const milkToRemove = levainWaterFromNonWaterSources / 0.87;
    const adjustedMilkIngredients = milkIngredients.map(milk => ({
      ...milk,
      amount: Math.round(Math.max(0, milk.amount - (milkToRemove * (milk.amount / milkAmount))))
    }));

    doughIngredients.push(...adjustedMilkIngredients);
  }
  
  // WORKING PATTERN: Add ALL non-flour/liquid/yeast ingredients (salt, fat, enrichment, sweetener, other)
  doughIngredients.push(...nonFlourLiquidYeastIngredients);
  
  // Validation: enrichments must survive the conversion
  const hasButterInDough = doughIngredients.some(i =>
    i.type === 'fat' || i.name.toLowerCase().includes('butter')
  );
  const hasEggsInDough = doughIngredients.some(i =>
    i.type === 'enrichment' || i.name.toLowerCase().includes('egg')
  );
  const hasSugarInDough = doughIngredients.some(i =>
    i.type === 'sweetener' || i.name.toLowerCase().includes('sugar')
  );

  if (butterAmount > 0 && !hasButterInDough) {
    console.error('Butter was lost in conversion');
  }
  if (eggAmount > 0 && !hasEggsInDough) {
    console.error('Eggs were lost in conversion');
  }
  if (sugarAmount > 0 && !hasSugarInDough) {
    console.error('Sugar was lost in conversion');
  }

  // RECALCULATE final hydration from actual ingredients (after milk adjustment!)
  const allIngredients = [...levainIngredients, ...doughIngredients];
  const finalTotalWater = allIngredients.reduce((sum, ing) => {
    // Skip "all of the levain" composite ingredient to avoid double-counting
    if (ing.name.toLowerCase().includes('all of the levain')) {
      return sum;
    }

    if (ing.type === 'liquid') {
      // Milk is ~87% water; other liquids counted at 100%
      return sum + (ing.name.toLowerCase().includes('milk') ? ing.amount * 0.87 : ing.amount);
    } else if (ing.type === 'enrichment' || ing.name.toLowerCase().includes('egg')) {
      return sum + (ing.amount * 0.75); // Eggs are 75% water
    } else if (ing.type === 'starter') {
      // Starter contains water based on its hydration
      return sum + (ing.amount * (starterHydration / (100 + starterHydration)));
    }
    return sum;
  }, 0);

  const finalHydration = totalFlour > 0 ? (finalTotalWater / totalFlour) * 100 : 0;

  const converted: ParsedRecipe = {
    ...recipe,
    ingredients: allIngredients,
    yeastAmount: 0,
    starterAmount: levainTotal,
    totalFlour: totalFlour,
    totalLiquid: finalTotalWater,
    hydration: finalHydration
  };
  
  // Calculate actual starter percentage for validation
  const actualStarterPercentage = totalFlour > 0 ? (totalLevainFlour / totalFlour) * 100 : 0;

  // Classify dough type
  const classification = classifyDough(
    sugarAmount,
    butterAmount,
    milkAmount,
    totalFlour
  );

  // Get appropriate method template
  const methodChanges = getMethodTemplate(
    classification,
    {
      starter: activeStarterWeight,
      water: levainWater,
      flour: levainFlour,
      total: validatedLevainTotal // Use validated total for consistency
    },
    {
      flour: doughFlour,
      water: doughWater,
      salt: recipe.saltAmount
    },
    // BUG FIX #3: Pass ingredients for dynamic instruction generation
    [...levainIngredients, ...doughIngredients, ...nonFlourLiquidYeastIngredients]
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
  if (baseFlour <= 0) {
    return recipe.ingredients.map(ing => ({ ingredient: ing.name, amount: ing.amount, percentage: 0 }));
  }

  return recipe.ingredients
    // The composite "all of the levain" row re-lists the levain-build rows above
    // it; including it would double-count 40% of the formula.
    .filter(ing => !ing.name.toLowerCase().includes('all of the levain'))
    .map(ing => ({
      ingredient: ing.name,
      amount: ing.amount,
      percentage: Math.round((ing.amount / baseFlour) * 1000) / 10 // 1 decimal
    }));
}
