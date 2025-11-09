// Test script for Japanese Hokkaido Milk Bread parsing
import { parseRecipe } from './src/utils/recipeParser.ts';

const hokkaidoRecipe = `Japanese Hokkaido Milk Bread

Ingredients:

TANGZHONG (Water Roux):
25g (3 tablespoons) bread flour
125ml (1/2 cup) whole milk

DOUGH:
All of the tangzhong (150g)
350g (2 3/4 cups) bread flour, plus extra for dusting
50g (1/4 cup) granulated sugar
7g (2 1/4 teaspoons / 1 packet) instant yeast
8g (1 1/4 teaspoons) fine sea salt
1 large egg, room temperature (about 50g)
120ml (1/2 cup) whole milk, warmed to 105-110°F (40-43°C)
40g (3 tablespoons) unsalted butter, softened to room temperature
2 tablespoons heavy cream (30ml)
1 tablespoon milk powder (optional, for extra richness)

FOR FINISHING:
1 large egg, beaten with 1 tablespoon water (for egg wash)
2 tablespoons melted butter (for brushing after baking)

INSTRUCTIONS:
[Make tangzhong first, cool completely, combine with dough ingredients,
knead until smooth, bulk fermentation 1 hour, divide into 3 pieces,
shape and place in loaf pan, final proof 45 minutes, brush with egg wash,
bake at 350°F for 30-35 minutes, brush with melted butter immediately]`;

console.log('========================================');
console.log('TESTING JAPANESE HOKKAIDO MILK BREAD');
console.log('========================================\n');

const result = parseRecipe(hokkaidoRecipe);

console.log('\n========================================');
console.log('PARSING RESULTS:');
console.log('========================================\n');

console.log('ALL INGREDIENTS:');
result.ingredients.forEach((ing, idx) => {
  console.log(`${idx + 1}. [${ing.type}] ${ing.amount}g ${ing.name}`);
});

console.log('\n========================================');
console.log('INGREDIENT TOTALS BY TYPE:');
console.log('========================================');

const flourIngredients = result.ingredients.filter(i => i.type === 'flour');
const liquidIngredients = result.ingredients.filter(i => i.type === 'liquid');
const eggIngredients = result.ingredients.filter(i => i.type === 'enrichment' && i.name.toLowerCase().includes('egg'));
const butterIngredients = result.ingredients.filter(i => i.type === 'fat' && i.name.toLowerCase().includes('butter'));

console.log('\nFLOUR:');
flourIngredients.forEach(i => console.log(`  - ${i.amount}g ${i.name}`));
console.log(`  TOTAL: ${flourIngredients.reduce((sum, i) => sum + i.amount, 0)}g`);

console.log('\nLIQUID:');
liquidIngredients.forEach(i => console.log(`  - ${i.amount}g ${i.name}`));
console.log(`  TOTAL: ${liquidIngredients.reduce((sum, i) => sum + i.amount, 0)}g`);

console.log('\nEGGS:');
eggIngredients.forEach(i => console.log(`  - ${i.amount}g ${i.name}`));
console.log(`  TOTAL: ${eggIngredients.reduce((sum, i) => sum + i.amount, 0)}g`);

console.log('\nBUTTER:');
butterIngredients.forEach(i => console.log(`  - ${i.amount}g ${i.name}`));
console.log(`  TOTAL: ${butterIngredients.reduce((sum, i) => sum + i.amount, 0)}g`);

console.log('\n========================================');
console.log('EXPECTED vs ACTUAL:');
console.log('========================================');

const expectations = {
  flour: 375,  // 25g tangzhong + 350g dough
  liquid: 275, // 125ml tangzhong + 120ml + 30ml cream
  eggs: 50,    // Only dough egg, NO egg wash
  butter: 40   // Only dough butter, NO finishing butter
};

const actual = {
  flour: flourIngredients.reduce((sum, i) => sum + i.amount, 0),
  liquid: liquidIngredients.reduce((sum, i) => sum + i.amount, 0),
  eggs: eggIngredients.reduce((sum, i) => sum + i.amount, 0),
  butter: butterIngredients.reduce((sum, i) => sum + i.amount, 0)
};

console.log(`\nFlour:  Expected ${expectations.flour}g, Got ${actual.flour}g ${actual.flour === expectations.flour ? '✓' : '✗ FAIL'}`);
console.log(`Liquid: Expected ${expectations.liquid}g, Got ${actual.liquid}g ${actual.liquid === expectations.liquid ? '✓' : '✗ FAIL'}`);
console.log(`Eggs:   Expected ${expectations.eggs}g, Got ${actual.eggs}g ${actual.eggs === expectations.eggs ? '✓' : '✗ FAIL'}`);
console.log(`Butter: Expected ${expectations.butter}g, Got ${actual.butter}g ${actual.butter === expectations.butter ? '✓' : '✗ FAIL'}`);

const allPassed =
  actual.flour === expectations.flour &&
  actual.liquid === expectations.liquid &&
  actual.eggs === expectations.eggs &&
  actual.butter === expectations.butter;

console.log('\n========================================');
if (allPassed) {
  console.log('✓ ALL TESTS PASSED');
} else {
  console.log('✗ TESTS FAILED - BUGS FOUND');
}
console.log('========================================\n');
