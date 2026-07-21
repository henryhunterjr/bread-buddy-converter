import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../recipeParser';
import { convertYeastToSourdough, convertSourdoughToYeast, calculateBakersPercentages } from '../recipeConverter';
import { validateConversion } from '../recipeValidator';
import { classifyRecipe } from '../recipeClassification';

const ligurianFocaccia = `Ligurian Focaccia

Dough
500g bread flour
400g warm water
10g fine sea salt
7g instant yeast
20g honey
30g olive oil in the dough

Brine
60g water
3g salt

Pan & Topping
60g olive oil for the pan and topping

Instructions
1. Mix the dough with the water, honey, yeast, flour, salt, and olive oil. Rest 15 minutes.
2. Perform coil folds every 30 minutes during bulk fermentation, until puffy and jiggly.
3. Pour oil into a 9x13-inch metal pan. Scrape the dough into the pan and stretch toward the corners. Proof until puffy.
4. Dimple the dough deeply. Stir together the brine water and salt and pour the brine into the dimples.
5. Bake at 450°F for 25-30 minutes until deeply golden.`;

describe('structured recipe safety regressions', () => {
  it.each([
    ['lean hearth loaf', 'boule in a banneton, score and bake in a Dutch oven', 'lean-hearth-loaf'],
    ['sandwich loaf', 'proof in a loaf pan for a sandwich loaf', 'sandwich-loaf'],
    ['focaccia', 'oil a 9x13 pan, stretch to corners, dimple and pour brine', 'focaccia'],
    ['pizza', 'stretch the pizza dough and bake on a pizza stone', 'pizza'],
    ['rolls', 'divide into dinner rolls and proof on a sheet pan', 'rolls'],
    ['baguette', 'shape as a baguette and make three coupes', 'baguette'],
    ['brioche', 'brioche with high butter percentage', 'brioche'],
    ['challah', 'braid the challah and brush with egg wash', 'challah'],
    ['cinnamon rolls', 'spread filling, roll up, slice into rolls and glaze', 'cinnamon-rolls'],
    ['flatbread', 'roll the flatbread and cook on a griddle', 'flatbread'],
    ['bagels', 'boil the bagels in water before baking', 'bagels'],
    ['pretzels', 'dip pretzels in a baking soda bath', 'pretzels'],
    ['laminated dough', 'make four turns and laminate the dough', 'laminated-dough'],
    ['batter bread', 'pour the quick bread batter into a tin', 'batter-bread'],
  ])('classifies %s from method signals', (_name, method, expected) => {
    expect(classifyRecipe(method).type).toBe(expected);
  });

  it('marks ambiguous recipes for review instead of guessing a loaf family', () => {
    const classification = classifyRecipe('500g flour, 350g water, 10g salt. Mix and bake.');
    expect(classification.type).toBe('unknown');
    expect(classification.reviewRequired).toBe(true);
  });

  it('keeps focaccia sections and excludes brine from dough hydration', () => {
    const parsed = parseRecipe(ligurianFocaccia);
    expect(parsed.classification?.type).toBe('focaccia');
    expect(parsed.totalFlour).toBe(500);
    expect(parsed.totalLiquid).toBe(400);
    expect(parsed.hydration).toBe(80);
    expect(parsed.sections?.brine?.map(i => i.amount)).toEqual([60, 3]);
    expect(parsed.sections?.['pan-preparation']?.[0].amount).toBe(60);
    expect(parsed.ingredients.find(i => i.name.includes('olive oil in'))?.amount).toBe(30);
  });

  it('preserves focaccia method in both conversion directions', () => {
    const parsed = parseRecipe(ligurianFocaccia);
    const toSourdough = convertYeastToSourdough(parsed, ligurianFocaccia);
    const toYeast = convertSourdoughToYeast(parsed, ligurianFocaccia);
    for (const result of [toSourdough, toYeast]) {
      const method = result.methodChanges.map(m => `${m.step} ${m.change}`).join(' ');
      expect(method).toMatch(/9x13-inch metal pan/i);
      expect(method).toMatch(/dimple/i);
      expect(method).toMatch(/brine/i);
      expect(method).toMatch(/450°F|450F/i);
      expect(method).not.toMatch(/dutch oven|banneton|boule|batard|score/i);
      expect(method).not.toMatch(/egg wash|375°F|butter/i);
    }
  });

  it('does not emit zero-percent claims for finishing components', () => {
    const parsed = parseRecipe(ligurianFocaccia);
    const oil = calculateBakersPercentages(parsed).find(i => /pan and topping/i.test(i.ingredient));
    expect(oil?.percentage).toBeGreaterThan(0);
    expect(oil?.formulaNote).toBe('not part of dough formula');
  });

  it('blocks export when a finishing section is dropped from the method', () => {
    const parsed = parseRecipe(ligurianFocaccia);
    const converted = convertYeastToSourdough(parsed, ligurianFocaccia);
    converted.methodChanges = [{ step: 'MIX', change: 'Mix flour, water, salt, and levain.' }];
    const validation = validateConversion(converted);
    expect(validation.blockingIssues.some(i => /finishing section/i.test(i))).toBe(true);
    expect(validation.recipe.exportBlocked).toBe(true);
  });
});
