# BGB Recipe Converter - Test Execution Guide

## 🎯 Purpose

This guide provides step-by-step instructions to test the enhanced AI features end-to-end with the two provided recipes.

---

## 📋 Pre-Test Checklist

- ✅ Edge functions deployed (`ai-parse-recipe`, `ai-validate-recipe`, `log-correction`)
- ✅ LOVABLE_API_KEY configured in Supabase secrets
- ✅ Enhanced confidence scoring algorithm implemented
- ✅ Smart warnings (8 categories) implemented
- ✅ Confidence UI with badges implemented
- ✅ App running without console errors

---

## 🧪 Test 1: Cranberry Walnut Sourdough (Sourdough → Yeast)

### Recipe Text to Paste

```
Cranberry Walnut Sourdough Loaf Recipe

EQUIPMENT
- Mixing bowl
- Banneton or bowl lined with a towel
- Wire rack

INGREDIENTS

For the Levain:
- 50 g (1/4 cup) active sourdough starter
- 100 g (1/2 cup) warm water
- 100 g (3/4 cup) bread flour

For the Dough:
- 375 g (1 1/2 cups) warm water
- All of the levain
- 500 g (4 cups) bread flour
- 10 g (1 1/2 tsp) salt
- 75 g (1/2 cup) dried cranberries
- 75 g (1/2 cup) walnuts, coarsely chopped

INSTRUCTIONS

1. Prepare the Levain (Night Before):
   - Combine 50g sourdough starter with 100g warm water and 100g bread flour.
   - Cover and let it rest at room temperature for 12 hours.

2. Mixing the Dough:
   - In a large bowl, dissolve the levain in 375g warm water.
   - Add 500g bread flour to the mixture, ensuring there's no dry flour left. 
   - Allow it to rest for 45 minutes (autolyse stage).
   - While the dough is autolysing, soak your cranberries or Craisins.

3. Adding Salt and Flavor:
   - Add 10g salt and initially mix until the salt is evenly distributed, approximately 10 minutes.

4. Bulk Fermentation:
   - Cover the bowl and let the dough rest at room temperature for 45 minutes.
   - Incorporate 75g dried cranberries and 75g chopped walnuts into the dough. 
   - Fold the dough over itself several times to integrate the additions.
   - Perform three sets of stretch and folds or coil folds every 45 minutes.

5. Shaping:
   - Turn the dough onto a lightly floured surface.
   - Gently shape it into a round loaf.

6. Second Rise:
   - Place the shaped loaf into a well-floured banneton or a bowl lined with a floured towel.
   - Cover and let it rise for 1 hour or until it's slightly puffy but not doubled in size.
   - Refrigerate overnight, or for 6 hours.

7. Baking:
   - Preheat your oven to 450°F (232°C) with a Dutch oven inside.
   - Carefully transfer the dough into the hot Dutch oven, seam side down.
   - Score the top, cover, and bake for 20 minutes.
   - Remove the lid and continue to bake for another 25-30 minutes, or until deep golden brown.
   - Internal temperature should reach 200°F (93°C).

8. Cooling:
   - Let the bread cool on a wire rack for at least an hour before slicing.
   - Enjoy your Cranberry Walnut Sourdough Bread!
```

### Expected Results

#### Step 1: Parsing (Input Screen)

**What Should Happen:**
- Both parsers run in parallel (regex + AI)
- Parsing completes in 1-3 seconds
- System automatically proceeds to confirmation screen

**Expected Console Logs:**
```
=== PARSING STARTED ===
Regex parser: Running...
AI parser: Calling edge function...
AI Validation: Comparing results...
=== VALIDATION COMPLETE ===
Parser used: hybrid
Confidence: 90-98%
```

**Verify:**
- [ ] No console errors
- [ ] Toast notification: "Parsing recipe..."
- [ ] Toast notification: "Recipe parsed successfully"
- [ ] Redirect to confirmation screen

---

#### Step 2: Confirmation Screen

**Expected Ingredient List:**

| Ingredient | Amount | Type | Confidence Badge |
|------------|--------|------|------------------|
| Active sourdough starter | 50g | starter | 🟢 High |
| Warm water (levain) | 100g | liquid | 🟢 High |
| Bread flour (levain) | 100g | flour | 🟢 High |
| Warm water (dough) | 375g | liquid | 🟢 High |
| Bread flour (dough) | 500g | flour | 🟢 High |
| Salt | 10g | salt | 🟢 High |
| Dried cranberries | 75g | other | 🟢 High |
| Walnuts | 75g | other | 🟢 High |

**Expected Confidence Summary:**
```
Overall Confidence: 95% (High)

Confidence Breakdown:
✓ Both parsers agreed on flour amount (+15)
✓ Clear leavening type (+10)
✓ Salt detected (+5)
✓ Good ingredient coverage (+5)
✓ Detailed method provided (+10)

Total Score: 95/100
```

**Calculated Totals:**
- **Total Flour:** 625g (100g levain + 500g dough + 25g from starter)
- **Total Water:** 500g (100g levain + 375g dough + 25g from starter)
- **Hydration:** 80%
- **Starter Amount:** 50g
- **Salt:** 10g (1.6% baker's percentage)

**Verify:**
- [ ] All 8 ingredients detected
- [ ] Confidence badges show "High" (green)
- [ ] Overall confidence score: 90-98%
- [ ] Confidence reasons listed and accurate
- [ ] Calculated totals match expectations
- [ ] Edit buttons functional

---

#### Step 3: Conversion to Yeast

**Click:** "Confirm & Convert"

**Expected Converted Recipe:**

**YEAST VERSION:**

| Ingredient | Amount | Baker's % |
|------------|--------|-----------|
| Bread flour | 625g | 100% |
| Water | 500g | 80% |
| Salt | 10g | 1.6% |
| Instant yeast | 7g | 1.1% |
| Dried cranberries | 75g | 12% |
| Walnuts | 75g | 12% |

**Method Changes Highlighted:**

✅ **REMOVED:**
- Levain preparation (12 hour ferment)
- Stretch and folds
- Overnight cold ferment

✅ **ADDED:**
- Instant yeast (7g / 1.1% of flour)
- Standard bulk fermentation: 1-1.5 hours at 80-85°F
- Final proof: 45-60 minutes
- Reduced total time: ~3 hours vs 18+ hours

**Expected Smart Warnings:**

Since this is a clean, well-structured sourdough recipe converting to yeast, there should be **minimal warnings** (0-2):

```
ℹ INFO: High hydration (80%) creates extensible dough. 
Expect sticky texture during mixing and shaping.

ℹ INFO: Inclusions (cranberries, walnuts) add 24% to flour weight. 
Fold gently to distribute without breaking dough structure.
```

**Verify:**
- [ ] Flour total preserved: 625g
- [ ] Hydration maintained: 80%
- [ ] Yeast calculated: 7g (1.1% of flour)
- [ ] Cranberries + walnuts preserved
- [ ] Method changes clearly highlighted
- [ ] Baker's percentages accurate
- [ ] 0-2 warnings (clean recipe)

---

#### Step 4: PDF Generation

**Click:** "Download PDF"

**Expected PDF Content:**
- ✅ Recipe title: "Cranberry Walnut Bread (Yeast Version)"
- ✅ Ingredient table with amounts and baker's %
- ✅ Method with updated timing
- ✅ Smart warnings section (if any)
- ✅ BGB branding/logo
- ✅ Professional formatting

**Verify:**
- [ ] PDF downloads successfully
- [ ] All ingredients present
- [ ] Baker's percentages visible
- [ ] Method readable and formatted
- [ ] No rendering errors

---

## 🧪 Test 2: Ultimate Dinner Rolls (Yeast → Sourdough)

### Recipe Text to Paste

```
Ultimate Dinner Rolls with Rosemary and Sea Salt

Soft, Fluffy Rolls with Fresh Rosemary and Maldon Sea Salt - Perfect for Thanksgiving

EQUIPMENT
- Stand mixer with dough hook (or large bowl for hand mixing)
- Baking sheet (13x18 inch)
- Digital kitchen scale
- Instant-read thermometer
- Pastry brush
- Clean kitchen towel

INGREDIENTS (In Order of Use)

- 240ml (1 cup) whole milk
- 120ml (1/2 cup) warm water, 105-110°F (40-43°C)
- 1/4 cup (57g / 4 tablespoons) unsalted butter, melted and cooled slightly
- 50g (1/4 cup) granulated sugar
- 7g (2 1/4 teaspoons / 1 packet) active dry yeast
- 500g (4 cups) all-purpose flour, plus 25-50g more for kneading
- 9g (1 1/2 teaspoons) kosher salt
- 2 tablespoons fresh rosemary, finely chopped
- Flaky sea salt (Maldon) for finishing
- Additional melted butter for brushing

INSTRUCTIONS

1. Activate the Yeast:
   - In the bowl of your stand mixer, combine warm water (105-110°F) and sugar.
   - Sprinkle yeast over the top and let sit for 5-10 minutes until foamy.

2. Mix the Dough:
   - Add milk, melted butter, 500g flour, and salt to the yeast mixture.
   - Using the dough hook, mix on low speed for 2 minutes until combined.
   - Increase to medium speed and knead for 8-10 minutes.
   - The dough should be soft and slightly tacky but not sticky.
   - Add extra flour (25-50g) if needed, 1 tablespoon at a time.

3. Add Rosemary:
   - In the last minute of kneading, add the chopped fresh rosemary.
   - Mix until evenly distributed.

4. First Rise:
   - Transfer dough to a lightly oiled bowl.
   - Cover with plastic wrap or a damp towel.
   - Let rise in a warm place (75-80°F) for 1-1.5 hours, until doubled in size.

5. Shape the Rolls:
   - Turn dough out onto a lightly floured surface.
   - Divide into 12 equal pieces (about 85g each).
   - Shape each piece into a smooth ball by rolling on the work surface.
   - Place rolls on a parchment-lined baking sheet, spacing 2 inches apart.

6. Second Rise:
   - Cover rolls loosely with plastic wrap or a towel.
   - Let rise for 45-60 minutes until puffy and nearly doubled.

7. Bake:
   - Preheat oven to 375°F (190°C).
   - Brush tops of rolls generously with melted butter.
   - Sprinkle with flaky Maldon sea salt.
   - Bake for 18-22 minutes until golden brown.
   - Internal temperature should reach 190°F (88°C).

8. Finish:
   - Brush warm rolls with additional melted butter.
   - Serve immediately or store in an airtight container for up to 3 days.

NOTES:
- For extra soft rolls, use whole milk (not low-fat)
- Don't skip the butter brushing - it creates the signature soft crust
- Best served warm or reheated in a 350°F oven for 5 minutes
```

### Expected Results

#### Step 1: Parsing (Input Screen)

**What Should Happen:**
- Regex parser struggles with mixed units (cups + grams + ml)
- AI parser excels at messy format
- AI Validator chooses AI result with high confidence

**Expected Console Logs:**
```
=== PARSING STARTED ===
Regex parser: Found some ingredients but mixed units problematic
AI parser: Successfully parsed all ingredients
AI Validation: AI result more complete, choosing AI
=== VALIDATION COMPLETE ===
Parser used: hybrid (AI-dominant)
Confidence: 85-92%
```

**Verify:**
- [ ] AI parser handles mixed units correctly
- [ ] Toast: "Parsing recipe with AI..."
- [ ] Toast: "Recipe parsed successfully"
- [ ] Redirect to confirmation screen

---

#### Step 2: Confirmation Screen

**Expected Ingredient List:**

| Ingredient | Amount | Type | Confidence Badge |
|------------|--------|------|------------------|
| Whole milk | 240ml (~240g) | liquid | 🟢 High |
| Warm water | 120ml (~120g) | liquid | 🟢 High |
| Unsalted butter | 57g | fat | 🟢 High |
| Granulated sugar | 50g | sweetener | 🟢 High |
| Active dry yeast | 7g | yeast | 🟢 High |
| All-purpose flour | 500g | flour | 🟢 High |
| Kosher salt | 9g | salt | 🟢 High |
| Fresh rosemary | 2 tbsp (~6g) | other | 🟡 Medium |
| Flaky sea salt | finishing | other | 🟡 Medium |

**Expected Confidence Summary:**
```
Overall Confidence: 88% (Medium-High)

Confidence Breakdown:
✓ Both parsers agreed on flour amount (+15)
✓ Clear leavening type (+10)
✓ Salt detected (+5)
✓ Good ingredient coverage (+5)
✓ Detailed method provided (+10)
⚠ Mixed units required AI interpretation (-7)

Total Score: 88/100
```

**Calculated Totals:**
- **Total Flour:** 500g (may detect extra 25-50g for kneading or exclude it)
- **Total Liquid:** ~410g (240g milk + 120g water + ~50g from butter/eggs if detected)
- **Hydration:** ~72-75% (accounting for milk and butter)
- **Yeast Amount:** 7g
- **Salt:** 9g (1.8% baker's percentage)
- **Enrichments:** 57g butter + 50g sugar = enriched dough

**Verify:**
- [ ] All major ingredients detected
- [ ] Enrichments (butter, sugar, milk) classified correctly
- [ ] Confidence badges mostly "High" (green) with some "Medium" (yellow)
- [ ] Overall confidence score: 85-92%
- [ ] Confidence reasons mention mixed units
- [ ] Edit buttons functional

---

#### Step 3: Conversion to Sourdough

**Click:** "Confirm & Convert"

**Expected Converted Recipe:**

**SOURDOUGH VERSION:**

**LEVAIN:**
| Ingredient | Amount | Baker's % |
|------------|--------|-----------|
| Active sourdough starter | 50g | - |
| Water | 100g | - |
| All-purpose flour | 100g | - |

**DOUGH:**
| Ingredient | Amount | Baker's % |
|------------|--------|-----------|
| All levain | 250g | - |
| Whole milk | 240g | 48% |
| Water | 20g | 4% |
| All-purpose flour | 400g | 80% |
| Unsalted butter | 57g | 11.4% |
| Granulated sugar | 50g | 10% |
| Kosher salt | 9g | 1.8% |
| Fresh rosemary | 6g | 1.2% |

**TOTAL FLOUR:** 500g (100%)
**TOTAL HYDRATION:** ~72% (adjusted for milk, butter, starter)

**Method Changes Highlighted:**

✅ **REMOVED:**
- Instant yeast (7g)
- Quick 1.5 hour bulk fermentation
- 45-60 minute proof

✅ **ADDED:**
- Levain build: 12 hours at room temp
- Fermentolyse: 30-minute rest before adding levain
- Extended bulk fermentation: 6-9 hours (or overnight cold ferment)
- Longer final proof: 2-4 hours
- Stretch and folds: 3 sets during bulk ferment

**Expected Smart Warnings (6-8 warnings):**

```
⚠ CAUTION: High fat content (11% of flour). Fat inhibits gluten 
development and slows fermentation. Knead longer to develop structure, 
and expect a rich, tender crumb with shorter shelf life.

ℹ INFO: High sugar content (10% of flour). Sugar slows fermentation 
and creates tender crumb. Allow extra time for rises, and watch for 
over-browning in the oven - tent with foil if needed.

ℹ INFO: Milk adds richness and browning but can slow yeast activity 
slightly. If using cold milk, warm it to room temperature for better 
fermentation.

ℹ INFO: Enriched sourdough doughs ferment slower due to sugar and fat. 
Allow 50% longer for bulk ferment (6-9 hours instead of 4-6), or use 
warmer environment (78-80°F).

ℹ INFO: Enriched sourdough benefits from slightly warmer environment 
(78-82°F vs standard 75-78°F). The extra warmth helps offset 
fermentation slowdown from fats and sugars.

ℹ INFO: High-fat enriched doughs benefit from stand mixer with dough 
hook. Hand kneading is possible but takes 15-20 minutes to fully 
develop gluten through the fat barrier.

⚠ CAUTION: Enriched doughs brown faster due to milk proteins and sugars. 
Start baking at 375-400°F (not 450°F). Watch closely after 20 minutes 
and tent with foil if browning too quickly.

ℹ INFO: Enriched sourdough breads need shallower scoring (1/4 inch vs 
1/2 inch deep). Rich doughs have weaker gluten structure and won't 
spring as dramatically in the oven.
```

**Verify:**
- [ ] Levain section created (50g starter + 100g water + 100g flour)
- [ ] Yeast removed completely
- [ ] Total flour preserved: 500g
- [ ] Enrichments preserved (butter, sugar, milk)
- [ ] Hydration adjusted for sourdough (~72%)
- [ ] Method timing extended dramatically (1.5h → 6-9h bulk)
- [ ] 6-8 smart warnings displayed
- [ ] Warnings are context-specific (enrichment, fermentation, temperature, mixing, scoring)
- [ ] Baker's percentages accurate

---

#### Step 4: PDF Generation

**Click:** "Download PDF"

**Expected PDF Content:**
- ✅ Recipe title: "Ultimate Dinner Rolls (Sourdough Version)"
- ✅ Levain section clearly separated
- ✅ Dough ingredients with baker's %
- ✅ Method with updated timing (much longer)
- ✅ Smart warnings section (6-8 warnings)
- ✅ Troubleshooting tips
- ✅ BGB branding/logo

**Verify:**
- [ ] PDF downloads successfully
- [ ] Levain and dough sections clear
- [ ] All enrichments present
- [ ] Method reflects longer fermentation
- [ ] Warnings visible and formatted
- [ ] No rendering errors

---

## 🔍 Edge Function Verification

After running both tests, check edge function logs:

### Check AI Parse Recipe Logs
```bash
# Look for successful parsing
✓ AI parse complete
✓ Ingredients extracted: X
✓ Total flour: Xg
```

### Check AI Validate Recipe Logs
```bash
# Look for validation decisions
✓ Regex result: X ingredients
✓ AI result: X ingredients
✓ Chosen: hybrid/regex/ai
✓ Confidence: X%
✓ Confidence reasons: [...]
```

### Check Log Correction Logs
```bash
# Only if user edited ingredients
✓ Corrections logged: X
✓ Parser used: regex/ai/hybrid
```

---

## 📊 Success Criteria

### Test 1: Cranberry Walnut Sourdough
- ✅ Confidence: 90-98% (High)
- ✅ Parser: Hybrid (both agree)
- ✅ Warnings: 0-2 (clean recipe)
- ✅ Conversion: Accurate math
- ✅ PDF: Clean output

### Test 2: Ultimate Dinner Rolls
- ✅ Confidence: 85-92% (Medium-High)
- ✅ Parser: AI-dominant (mixed units)
- ✅ Warnings: 6-8 (enriched dough)
- ✅ Conversion: Accurate math with enrichments
- ✅ PDF: Detailed warnings included

---

## 🐛 Troubleshooting

### If Parsing Fails
1. Check console for errors
2. Verify LOVABLE_API_KEY is set
3. Check edge function logs
4. Try "Try AI Parser" button

### If Confidence Score is Wrong
1. Review confidence breakdown
2. Check ingredient detection
3. Verify flour total calculation
4. Check hydration calculation

### If Warnings Don't Appear
1. Check dough composition analysis
2. Verify enrichment detection
3. Check hydration thresholds
4. Review flour type detection

### If Conversion Math is Wrong
1. Verify total flour calculation
2. Check starter composition (50/50 flour/water)
3. Verify hydration formula
4. Check baker's percentage calculation

---

## 📝 Notes

- **AI Response Time:** 1-3 seconds per parsing operation
- **Rate Limits:** Lovable AI has rate limits; if hit, wait 60 seconds
- **Confidence Variability:** AI may give slightly different confidence reasons on repeated runs (temperature=0.2)
- **Warning Thresholds:** Smart warnings trigger at specific composition thresholds (see `smartWarnings.ts`)

---

## ✅ Final Checklist

After completing both tests:

- [ ] Test 1 (Cranberry Walnut) completed successfully
- [ ] Test 2 (Ultimate Dinner Rolls) completed successfully
- [ ] Confidence scoring working correctly
- [ ] Smart warnings displaying (8 categories)
- [ ] Conversion math accurate
- [ ] PDF generation working
- [ ] Edge function logs show success
- [ ] No console errors
- [ ] All features functioning as documented

---

**Test Completion Date:** ___________

**Tested By:** ___________

**Result:** ✅ PASS / ❌ FAIL

**Notes:** _______________________________________________________

---

*For detailed technical documentation, see AI_FEATURES_DOCUMENTATION.md*
*For implementation summary, see ENHANCED_FEATURES_SUMMARY.md*
