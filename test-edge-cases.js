// Test edge cases for bread-buddy-converter parsing
import { parseRecipe } from './src/utils/recipeParser.ts';

console.log('========================================');
console.log('EDGE CASE TESTS');
console.log('========================================\n');

// Test 1: Compound ingredients on same line (water + butter)
console.log('TEST 1: Compound line with water and butter');
const test1 = `
Ingredients:
500g bread flour
120ml water (temp) 57g butter
10g salt
`;
const result1 = parseRecipe(test1);
const water1 = result1.ingredients.filter(i => i.type === 'liquid' && i.name.includes('water'));
const butter1 = result1.ingredients.filter(i => i.type === 'fat' && i.name.includes('butter'));
console.log(`Water: ${water1.length > 0 ? water1[0].amount + 'g' : 'NOT FOUND'} ${water1.length > 0 && water1[0].amount === 120 ? '✓' : '✗'}`);
console.log(`Butter: ${butter1.length > 0 ? butter1[0].amount + 'g' : 'NOT FOUND'} ${butter1.length > 0 && butter1[0].amount === 57 ? '✓' : '✗'}\n`);

// Test 2: Egg wash should be skipped
console.log('TEST 2: Egg wash variations should be skipped');
const test2 = `
Ingredients:
500g flour
2 eggs
1 egg beaten for egg wash
1 egg, beaten with 1 tablespoon water
`;
const result2 = parseRecipe(test2);
const eggs2 = result2.ingredients.filter(i => i.type === 'enrichment' && i.name.includes('egg'));
const totalEggs = eggs2.reduce((sum, i) => sum + i.amount, 0);
console.log(`Total eggs: ${totalEggs}g ${totalEggs === 100 ? '✓ (correctly skipped egg wash)' : '✗ FAIL - egg wash was counted'}\n`);

// Test 3: Finishing ingredients should be skipped
console.log('TEST 3: Finishing/topping ingredients');
const test3 = `
Ingredients:
500g flour
300ml water
50g butter, softened
2 tablespoons melted butter for brushing after baking
1 tablespoon honey for topping
`;
const result3 = parseRecipe(test3);
const butter3 = result3.ingredients.filter(i => i.type === 'fat' && i.name.includes('butter'));
const honey3 = result3.ingredients.filter(i => i.type === 'sweetener' && i.name.includes('honey'));
console.log(`Butter: ${butter3.reduce((sum, i) => sum + i.amount, 0)}g ${butter3.length === 1 && butter3[0].amount === 50 ? '✓' : '✗ FAIL - finishing butter counted'}`);
console.log(`Honey: ${honey3.length} items ${honey3.length === 0 ? '✓ (topping correctly skipped)' : '✗ FAIL - topping counted'}\n`);

// Test 4: Ingredient name cleaning
console.log('TEST 4: Ingredient name contamination');
const test4 = `
Ingredients:
350g bread flour, plus extra for dusting
120ml milk, warmed to 105°F
40g butter, softened to room temperature
1 egg, room temperature
`;
const result4 = parseRecipe(test4);
const flour4 = result4.ingredients.find(i => i.type === 'flour');
const milk4 = result4.ingredients.find(i => i.type === 'liquid');
const butter4 = result4.ingredients.find(i => i.type === 'fat');
const egg4 = result4.ingredients.find(i => i.type === 'enrichment');
console.log(`Flour name: "${flour4?.name}" ${flour4?.name === 'bread flour' ? '✓' : '✗ FAIL'}`);
console.log(`Milk name: "${milk4?.name}" ${milk4?.name === 'whole milk' ? '✓' : '✗ FAIL'}`);
console.log(`Butter name: "${butter4?.name}" ${butter4?.name === 'unsalted butter' ? '✓' : '✗ FAIL'}`);
console.log(`Egg name: "${egg4?.name}" ${egg4?.name.includes('egg') ? '✓' : '✗ FAIL'}\n`);

// Test 5: Optional ingredients
console.log('TEST 5: Optional ingredients should be skipped');
const test5 = `
Ingredients:
500g flour
300ml water
1 tablespoon honey (optional, for sweetness)
2 tablespoons seeds (optional)
`;
const result5 = parseRecipe(test5);
const hasOptional = result5.ingredients.some(i => i.name.includes('optional') || i.name.includes('honey') || i.name.includes('seeds'));
console.log(`Optional ingredients skipped: ${!hasOptional ? '✓' : '✗ FAIL - optional ingredients were counted'}\n`);

// Test 6: Multiple measurement formats
console.log('TEST 6: Heavy cream conversions');
const test6 = `
Ingredients:
500g flour
2 tablespoons heavy cream
1/4 cup heavy cream
`;
const result6 = parseRecipe(test6);
const cream6 = result6.ingredients.filter(i => i.type === 'liquid' && i.name.includes('cream'));
const totalCream = cream6.reduce((sum, i) => sum + i.amount, 0);
// 2 tbsp = 30g, 1/4 cup = 60g, total = 90g
console.log(`Total cream: ${totalCream}g ${totalCream === 90 ? '✓' : `✗ FAIL - expected 90g`}\n`);

console.log('========================================');
console.log('EDGE CASE TESTS COMPLETE');
console.log('========================================');
