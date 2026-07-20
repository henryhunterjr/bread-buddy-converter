import { describe, it, expect } from 'vitest';
import {
  convertSourdoughToYeast,
  convertYeastToSourdough,
  computeLevainTotal,
  cleanIngredientName,
  calculateBakersPercentages,
} from '../recipeConverter';
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
