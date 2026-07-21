import { describe, it, expect } from 'vitest';
import {
  convertSourdoughToYeast,
  convertYeastToSourdough,
  computeLevainTotal,
  cleanIngredientName,
  calculateBakersPercentages,
} from '../recipeConverter';
import { parseRecipe } from '../recipeParser';
import { ParsedRecipe, ParsedIngredient } from '@/types/recipe';

function makeRecipe(ingredients: ParsedIngredient[], starterHydration = 100): ParsedRecipe {
  const flour = ingredients.filter(i => i.type === 'flour').reduce((s, i) => s + i.amount, 0);
  const liquid = ingredients.filter(i => i.type === 'liquid').reduce((s, i) => s + i.amount, 0);
  const starter = ingredients.filter(i => i.type === 'starter').reduce((s, i) => s + i.amount, 0);
  const yeast = ingredients.filter(i => i.type === 'yeast').reduce((s, i) => s + i.amount, 0);
  const salt = ingredients.filter(i => i.type === 'salt').reduce((s, i) => s + i.amount, 0);
  // Mirror Index.tsx handleConfirmIngredients: totals include starter contents
  const starterFlour = starter * (100 / (100 + starterHydration));
  const starterWater = starter * (starterHydration / (100 + starterHydration));
  const totalFlour = flour + starterFlour;
  const totalLiquid = liquid + starterWater;
  return {
    ingredients,
    method: '',
    totalFlour,
    totalLiquid,
    starterAmount: starter,
    yeastAmount: yeast,
    saltAmount: salt,
    hydration: totalFlour > 0 ? (totalLiquid / totalFlour) * 100 : 0,
  };
}

const g = (name: string, amount: number, type: ParsedIngredient['type']): ParsedIngredient =>
  ({ name, amount, unit: 'g', type });

describe('convertYeastToSourdough — lean dough at 70% hydration', () => {
  const recipe = makeRecipe([
    g('bread flour', 500, 'flour'),
    g('water', 350, 'liquid'),
    g('salt', 10, 'salt'),
    g('instant yeast', 7, 'yeast'),
  ]);
  const result = convertYeastToSourdough(recipe, undefined, 100);

  it('preserves total flour', () => {
    expect(result.converted.totalFlour).toBe(500);
  });

  it('preserves original hydration within 1%', () => {
    expect(result.converted.hydration).toBeGreaterThan(69);
    expect(result.converted.hydration).toBeLessThan(71);
  });

  it('levain is genuinely 100% hydration', () => {
    const levain = result.converted.ingredients.filter(i =>
      !i.name.includes('all of the levain'));
    const starter = levain.find(i => i.type === 'starter')!;
    const levainWater = levain.filter(i => i.type === 'liquid')[0];
    // starter at 100% hydration contributes equal flour and water,
    // added water must equal added flour
    expect(starter.amount).toBe(40);
    expect(levainWater.amount).toBe(80);
  });

  it('removes commercial yeast entirely', () => {
    expect(result.converted.ingredients.some(i => i.type === 'yeast')).toBe(false);
    expect(result.converted.yeastAmount).toBe(0);
  });

  it('keeps salt unchanged', () => {
    const salt = result.converted.ingredients.find(i => i.type === 'salt');
    expect(salt?.amount).toBe(10);
  });

  it('starter inoculation lands in the 15-25% window', () => {
    // 100g levain flour of 500g total = 20%
    const lowWarning = result.troubleshootingTips.find(t => t.issue.includes('Inoculation'));
    expect(lowWarning).toBeUndefined();
  });
});

describe('convertYeastToSourdough — non-100% starter hydration', () => {
  it('accounts for starter flour/water correctly at 80% hydration', () => {
    const recipe = makeRecipe([
      g('bread flour', 500, 'flour'),
      g('water', 350, 'liquid'),
      g('salt', 10, 'salt'),
      g('instant yeast', 7, 'yeast'),
    ]);
    const result = convertYeastToSourdough(recipe, undefined, 80);
    // Whatever the levain build, conservation must hold:
    // total flour in converted recipe (dough flour + levain added flour + flour inside starter seed)
    const ings = result.converted.ingredients.filter(i => !i.name.includes('all of the levain'));
    const starterSeed = ings.find(i => i.type === 'starter')!;
    const flourInSeed = starterSeed.amount * (100 / (100 + 80));
    const explicitFlour = ings.filter(i => i.type === 'flour').reduce((s, i) => s + i.amount, 0);
    const totalFlour = explicitFlour + flourInSeed;
    expect(totalFlour).toBeGreaterThan(495);
    expect(totalFlour).toBeLessThan(505);
    // Hydration preserved
    expect(result.converted.hydration).toBeGreaterThan(68.5);
    expect(result.converted.hydration).toBeLessThan(71.5);
  });
});

describe('convertYeastToSourdough — enriched dough', () => {
  const recipe = makeRecipe([
    g('bread flour', 500, 'flour'),
    g('water', 100, 'liquid'),
    g('whole milk', 200, 'liquid'),
    g('butter', 100, 'fat'),
    g('eggs', 100, 'enrichment'),
    g('sugar', 75, 'sweetener'),
    g('salt', 10, 'salt'),
    g('instant yeast', 7, 'yeast'),
  ]);
  const result = convertYeastToSourdough(recipe, undefined, 100);

  it('preserves butter, eggs, and sugar', () => {
    const names = result.converted.ingredients.map(i => i.name.toLowerCase()).join(' ');
    expect(names).toContain('butter');
    expect(names).toContain('egg');
    expect(names).toContain('sugar');
  });

  it('preserves total flour', () => {
    expect(result.converted.totalFlour).toBe(500);
  });

  it('does not produce negative liquid amounts', () => {
    for (const ing of result.converted.ingredients) {
      expect(ing.amount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('convertSourdoughToYeast — lean dough', () => {
  const recipe = makeRecipe([
    g('bread flour', 400, 'flour'),
    g('water', 280, 'liquid'),
    g('sourdough starter', 100, 'starter'),
    g('salt', 9, 'salt'),
  ]);
  const result = convertSourdoughToYeast(recipe, undefined, 100);

  it('folds starter flour into the flour total (400 + 50 = 450)', () => {
    const flour = result.converted.ingredients.filter(i => i.type === 'flour');
    expect(flour.reduce((s, i) => s + i.amount, 0)).toBe(450);
  });

  it('folds starter water into the liquid total (280 + 50 = 330)', () => {
    const liquid = result.converted.ingredients.filter(i => i.type === 'liquid');
    expect(liquid.reduce((s, i) => s + i.amount, 0)).toBe(330);
  });

  it('removes the starter and adds yeast', () => {
    expect(result.converted.ingredients.some(i => i.type === 'starter')).toBe(false);
    const yeast = result.converted.ingredients.find(i => i.type === 'yeast');
    expect(yeast).toBeDefined();
    // yeast should be a sane % of flour (0.5% - 1.5%)
    expect(yeast!.amount / 450).toBeGreaterThan(0.004);
    expect(yeast!.amount / 450).toBeLessThan(0.016);
  });

  it('hydration is preserved (330/450 ≈ 73.3%)', () => {
    expect(result.converted.hydration).toBeGreaterThan(72.5);
    expect(result.converted.hydration).toBeLessThan(74);
  });
});

describe('convertSourdoughToYeast — multiple liquids preserved proportionally', () => {
  it('splits liquid across water and milk by original ratio', () => {
    const recipe = makeRecipe([
      g('bread flour', 500, 'flour'),
      g('water', 200, 'liquid'),
      g('milk', 100, 'liquid'),
      g('sourdough starter', 100, 'starter'),
      g('salt', 10, 'salt'),
    ]);
    const result = convertSourdoughToYeast(recipe, undefined, 100);
    const liquids = result.converted.ingredients.filter(i => i.type === 'liquid');
    expect(liquids.length).toBe(2);
    const total = liquids.reduce((s, i) => s + i.amount, 0);
    // 300 original + 50 starter water = 350
    expect(total).toBeGreaterThanOrEqual(349);
    expect(total).toBeLessThanOrEqual(351);
    // Starter water returns to the WATER line only — milk must stay at its
    // original 100g (the starter never contained milk)
    const water = liquids.find(i => i.name.toLowerCase().includes('water'))!;
    const milk = liquids.find(i => i.name.toLowerCase().includes('milk'))!;
    expect(milk.amount).toBe(100);
    expect(water.amount).toBe(250);
  });
});

describe('edge cases', () => {
  it('handles zero-flour recipe without crashing or NaN', () => {
    const recipe = makeRecipe([g('water', 350, 'liquid')]);
    const result = convertYeastToSourdough(recipe, undefined, 100);
    expect(Number.isNaN(result.converted.hydration)).toBe(false);
  });

  it('handles recipe with starter already present in yeast→sourdough', () => {
    const recipe = makeRecipe([
      g('bread flour', 500, 'flour'),
      g('water', 350, 'liquid'),
      g('sourdough starter', 50, 'starter'),
      g('salt', 10, 'salt'),
    ]);
    const result = convertYeastToSourdough(recipe, undefined, 100);
    // must not duplicate the starter
    const starters = result.converted.ingredients.filter(
      i => i.type === 'starter' && !i.name.includes('all of the levain'));
    expect(starters.length).toBe(1);
  });
});

describe('helpers', () => {
  it('computeLevainTotal sums components', () => {
    expect(computeLevainTotal({ starter: 40, flour: 80, water: 80 })).toBe(200);
  });

  it('cleanIngredientName strips stage labels', () => {
    expect(cleanIngredientName('bread flour for levain')).toBe('bread flour');
    expect(cleanIngredientName('water (main dough)')).toBe('water');
  });

  it('calculateBakersPercentages uses flour as 100% baseline', () => {
    const recipe = makeRecipe([
      g('bread flour', 500, 'flour'),
      g('water', 350, 'liquid'),
      g('salt', 10, 'salt'),
    ]);
    const pcts = calculateBakersPercentages(recipe);
    expect(pcts.find(p => p.ingredient === 'water')?.percentage).toBe(70);
    expect(pcts.find(p => p.ingredient === 'salt')?.percentage).toBe(2);
  });
});

describe('Ligurian focaccia regression — sections, oil, brine, method preservation', () => {
  // Real-world failure (July 2026): converting the yeasted Ligurian focaccia
  // produced a generic enriched-dough recipe — brine folded into hydration
  // (92% instead of 80%), dough oil lost, canned 375°F egg-wash method.
  const focaccia = `Ligurian-Style Focaccia

Golden, crispy perfection with an impossibly soft interior featuring the traditional brine technique.

Ingredients:

Dough
500g bread-flour
400g Warm water (100F)
10g Fine sea salt
7g instant-yeast
20g Honey or barley malt syrup
30g Extra-virgin olive oil

Brine
60g Warm water
3g Fine sea salt

For Pan & Topping
60g Extra-virgin olive oil, divided

Instructions

1. Mix the Dough
In a large bowl, combine warm water, honey, and instant-yeast. Let sit 5 minutes until slightly foamy.
Add bread-flour, salt, and olive oil. Mix with a spatula until no dry flour remains. The dough will be very wet and shaggy.
Cover and rest 15 minutes.

2. Building Strength
With wet hands, lift the dough from the center, letting the sides fold under. Rotate the bowl 90 degrees and repeat. Cover and rest 30 minutes. Repeat for 4 total coil-fold sets.

3. Bulk Fermentation
After the final fold, cover and let rise at room temperature for 1-2 hours until doubled. The dough should be puffy and jiggly.

4. Shaping and Final Proof
Pour 2 Tbsp olive oil into a 9x13-inch metal pan. Tip the pan to coat the bottom evenly.
Gently scrape the dough into the oiled pan. Using oiled hands, press and stretch the dough toward the corners.
Drizzle another 1 Tbsp oil over the dough. Cover loosely and let rise 45-60 minutes until puffy and nearly filling the pan.

5. Pre-Bake Prep
Oil your fingertips generously. Press deep dimples into the dough, all the way to the bottom of the pan.
Stir together the warm water and salt until dissolved. Pour the brine evenly over the dimpled dough.
Scatter fresh rosemary and flaky sea salt over the top.

6. Bake
Preheat your oven to 450F with a rack in the lower third. Bake 25-30 minutes until deeply golden brown.`;

  const parsed = parseRecipe(focaccia);

  it('brine and pan oil are flagged as finishing, not dough', () => {
    const finishing = parsed.ingredients.filter(i => i.isFinishing);
    expect(finishing.length).toBeGreaterThanOrEqual(3); // brine water, brine salt, pan oil
    const brineWater = finishing.find(i => i.type === 'liquid');
    expect(brineWater?.amount).toBe(60);
  });

  it('dough totals exclude the brine: 80% hydration, 10g salt', () => {
    expect(parsed.totalFlour).toBe(500);
    expect(parsed.totalLiquid).toBe(400);
    expect(parsed.hydration).toBeCloseTo(80, 0);
    expect(parsed.saltAmount).toBe(10);
  });

  it('the 30g dough olive oil survives as a dough ingredient', () => {
    const doughOil = parsed.ingredients.find(i => !i.isFinishing && i.type === 'fat');
    expect(doughOil?.amount).toBe(30);
  });

  it('instruction lines never leak into ingredients', () => {
    const garbled = parsed.ingredients.find(i => /into a 9x13|tip the pan/i.test(i.name));
    expect(garbled).toBeUndefined();
  });
});

describe('Ligurian focaccia — the converted sourdough version', () => {
  const focacciaText = `Dough
500g bread-flour
400g Warm water
10g Fine sea salt
7g instant-yeast
20g Honey
30g Extra-virgin olive oil

Brine
60g Warm water
3g Fine sea salt

Instructions

1. Mix the Dough
In a large bowl, combine warm water, honey, and instant-yeast. Let sit 5 minutes until slightly foamy. Add bread-flour, salt, and olive oil. Mix until no dry flour remains. Cover and rest 15 minutes.

2. Bulk Fermentation
After the final fold, cover and let rise at room temperature for 1-2 hours until doubled. The dough should be puffy and jiggly.

3. Shaping and Final Proof
Pour 2 Tbsp olive oil into a 9x13-inch metal pan. Gently scrape the dough into the oiled pan and stretch toward the corners. Cover loosely and let rise 45-60 minutes until puffy and nearly filling the pan.

4. Pre-Bake Prep
Press deep dimples into the dough. Stir together the warm water and salt until dissolved. Pour the brine evenly over the dimpled dough. Scatter fresh rosemary and flaky sea salt.

5. Bake
Preheat your oven to 450F with a rack in the lower third. Bake 25-30 minutes until deeply golden brown.`;

  const parsed = parseRecipe(focacciaText);
  const result = convertYeastToSourdough(parsed, focacciaText, 100);

  it('hydration stays 80% — brine never inflates it', () => {
    expect(result.converted.hydration).toBeGreaterThan(78.5);
    expect(result.converted.hydration).toBeLessThan(81.5);
  });

  it('dough olive oil is preserved in the converted recipe', () => {
    const oil = result.converted.ingredients.find(i => !i.isFinishing && i.type === 'fat');
    expect(oil?.amount).toBe(30);
  });

  it('brine survives conversion as finishing ingredients', () => {
    const finishing = result.converted.ingredients.filter(i => i.isFinishing);
    expect(finishing.some(i => i.type === 'liquid' && i.amount === 60)).toBe(true);
  });

  it('method preserves dimples, brine, and the 450F bake', () => {
    const methodText = result.methodChanges.map(m => `${m.step} ${m.change}`).join(' ');
    expect(methodText).toMatch(/dimple/i);
    expect(methodText).toMatch(/brine/i);
    expect(methodText).toMatch(/450/);
    expect(methodText).toMatch(/9x13/i);
  });

  it('method contains NO enriched-template artifacts', () => {
    const methodText = result.methodChanges.map(m => `${m.step} ${m.change}`).join(' ');
    expect(methodText).not.toMatch(/egg wash/i);
    expect(methodText).not.toMatch(/375/);
    expect(methodText).not.toMatch(/butter/i);
    expect(methodText).not.toMatch(/rolls, loaf/i);
    expect(methodText).not.toMatch(/banneton/i);
  });

  it('method starts with the levain build and swaps yeast for levain', () => {
    expect(result.methodChanges[0].step).toMatch(/levain/i);
    const mixStep = result.methodChanges.find(m => /mix the dough/i.test(m.step));
    expect(mixStep?.change).toMatch(/levain/i);
    expect(mixStep?.change).not.toMatch(/\byeast\b/i);
  });

  it('fermentation times are stretched, bake time is not', () => {
    const bulk = result.methodChanges.find(m => /bulk/i.test(m.step));
    expect(bulk?.change).toMatch(/3\s*(hours?)?\s*[-–]\s*6 hours/i);
    // The 25-30 minute bake window must survive unscaled somewhere in the method
    const allText = result.methodChanges.map(m => m.change).join(' ');
    expect(allText).toMatch(/25-30 minutes/);
    expect(allText).not.toMatch(/75[-–]90 minutes/); // i.e. bake time was NOT tripled
  });
});
