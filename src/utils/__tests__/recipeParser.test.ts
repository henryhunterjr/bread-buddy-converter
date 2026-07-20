import { describe, it, expect } from 'vitest';
import { parseRecipe } from '../recipeParser';

function ingredientNamed(recipe: ReturnType<typeof parseRecipe>, fragment: string) {
  return recipe.ingredients.find(i => i.name.toLowerCase().includes(fragment));
}

describe('gram-based parsing', () => {
  it('parses a simple metric recipe', () => {
    const r = parseRecipe('500g bread flour\n350g water\n10g salt\n7g instant yeast');
    expect(r.totalFlour).toBe(500);
    expect(r.totalLiquid).toBe(350);
    expect(r.saltAmount).toBe(10);
    expect(r.yeastAmount).toBe(7);
    expect(r.hydration).toBeCloseTo(70, 0);
  });

  it('folds starter flour/water into totals at 100% hydration', () => {
    const r = parseRecipe('400g bread flour\n280g water\n100g sourdough starter\n9g salt', 100);
    expect(r.totalFlour).toBe(450);
    expect(r.totalLiquid).toBe(330);
  });

  it('folds starter correctly at 80% hydration', () => {
    const r = parseRecipe('400g bread flour\n280g water\n90g sourdough starter\n9g salt', 80);
    expect(r.totalFlour).toBeCloseTo(400 + 50, 0); // 90 × 100/180 = 50 flour
    expect(r.totalLiquid).toBeCloseTo(280 + 40, 0); // 90 × 80/180 = 40 water
  });
});

describe('volume unit conversion — the plural-units regression', () => {
  it('converts plural cups of bread flour', () => {
    const r = parseRecipe('2 cups bread flour\n1 cup water\n1 teaspoon salt');
    const flour = ingredientNamed(r, 'flour');
    expect(flour?.amount).toBe(254); // 2 × 127g
  });

  it('converts plural teaspoons of salt', () => {
    const r = parseRecipe('3 cups flour\n1 cup water\n2 teaspoons salt');
    const salt = ingredientNamed(r, 'salt');
    expect(salt?.amount).toBe(12); // 2 × 6g
  });

  it('converts tablespoons of honey', () => {
    const r = parseRecipe('3 cups flour\n1 cup water\n2 tablespoons honey\n1 tsp salt');
    const honey = ingredientNamed(r, 'honey');
    expect(honey?.amount).toBeCloseTo(42.6, 0); // 2 × 340/16
  });

  it('converts cups of all-purpose flour', () => {
    const r = parseRecipe('2 cups all-purpose flour\n1 cup water\n1 tsp salt');
    const flour = ingredientNamed(r, 'flour');
    expect(flour?.amount).toBe(240); // 2 × 120g
  });

  it('converts teaspoons of instant yeast', () => {
    const r = parseRecipe('3 cups flour\n1 cup water\n2 teaspoons instant yeast\n1 tsp salt');
    const yeast = ingredientNamed(r, 'yeast');
    expect(yeast?.amount).toBe(6); // 2 × 3g
  });

  it('kosher salt converts at kosher density, not table-salt density', () => {
    const r = parseRecipe('4 cups bread flour\n1.5 cups water\n1 tablespoon kosher salt');
    const salt = ingredientNamed(r, 'salt');
    // Morton kosher ≈ 14.4 g/tbsp — the old table gave 20g (2x Diamond Crystal)
    expect(salt!.amount).toBeGreaterThan(12);
    expect(salt!.amount).toBeLessThan(16);
  });

  it('fractions still work: 1/2 cup water', () => {
    const r = parseRecipe('2 cups flour\n1/2 cup water\n1 tsp salt');
    const water = ingredientNamed(r, 'water');
    expect(water?.amount).toBeCloseTo(118.5, 0);
  });
});

describe('ml density handling', () => {
  it('treats ml of water as 1g/ml', () => {
    const r = parseRecipe('500g flour\n240ml water\n10g salt');
    expect(ingredientNamed(r, 'water')?.amount).toBe(240);
  });

  it('converts ml of honey with honey density', () => {
    const r = parseRecipe('500g flour\n300g water\n120ml honey\n10g salt');
    const honey = ingredientNamed(r, 'honey');
    expect(honey?.amount).toBeCloseTo(170.4, 0); // 120 × 1.42
  });

  it('converts ml of oil with oil density', () => {
    const r = parseRecipe('500g flour\n300g water\n50ml olive oil\n10g salt');
    const oil = ingredientNamed(r, 'oil');
    expect(oil?.amount).toBeCloseTo(46, 0); // 50 × 0.92
  });
});

describe('weight units', () => {
  it('converts ounces', () => {
    const r = parseRecipe('16 oz bread flour\n10 oz water\n0.4 oz salt');
    expect(ingredientNamed(r, 'flour')?.amount).toBeCloseTo(453.6, 0);
  });

  it('converts kilograms', () => {
    const r = parseRecipe('1 kg bread flour\n700g water\n20g salt');
    expect(r.totalFlour).toBe(1000);
  });
});

describe('optional ingredients are kept', () => {
  it('does not silently drop "(optional)" dough ingredients', () => {
    const r = parseRecipe('500g flour\n350g water\n30g honey (optional)\n10g salt');
    const honey = ingredientNamed(r, 'honey');
    expect(honey).toBeDefined();
    expect(honey?.amount).toBe(30);
  });
});

describe('eggs', () => {
  it('counts eggs at 50g each', () => {
    const r = parseRecipe('500g flour\n250g milk\n2 large eggs\n10g salt\n7g yeast');
    const egg = r.ingredients.find(i => i.type === 'enrichment');
    expect(egg?.amount).toBe(100);
  });

  it('skips egg wash', () => {
    const r = parseRecipe('500g flour\n350g water\n10g salt\n1 egg for egg wash');
    const egg = r.ingredients.find(i => i.type === 'enrichment');
    expect(egg).toBeUndefined();
  });
});

describe('degenerate input', () => {
  it('empty text produces no NaN', () => {
    const r = parseRecipe('');
    expect(Number.isNaN(r.hydration)).toBe(false);
    expect(r.totalFlour).toBe(0);
  });

  it('no-flour recipe produces zero hydration, not NaN/Infinity', () => {
    const r = parseRecipe('350g water\n10g salt');
    expect(Number.isFinite(r.hydration)).toBe(true);
  });
});
