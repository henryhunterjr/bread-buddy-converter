# PDF Validation Protocol - Bread Buddy Converter

## Test Date: ___________
## Tester: ___________

---

## Test Recipes (Complete All 3)

### Test 1: Simple Lean Dough (Yeast → Sourdough)

**Input Recipe:**
```
500g flour
350g water
10g salt
5g instant yeast
```

**Expected Output:**

**LEVAIN:**
- Starter: 26g (100% hydration)
- Water: 84g
- Flour: 90g
- **Total: 200g** ← VERIFY THIS MATCHES SUM (26+84+90)

**DOUGH:**
- All of the levain: 200g
- Water: 269g
- Flour: 410g
- Salt: 10g

**Baker's Percentages:**
- Flour: 500g (100%)
- Water: 350g (70%)
- Salt: 10g (2%)

**Hydration: 70%**

---

### Test 2: Enriched Dough - Timothy's Recipe (Yeast → Sourdough)

**Input Recipe:**
```
480g flour
300g milk
100g eggs
10g instant yeast
28g butter
75g sugar
```

**Expected Output:**

**LEVAIN:**
- Starter: 25g (100% hydration)
- Water: 81g
- Flour: 87g
- **Total: 193g** ← VERIFY THIS MATCHES SUM (25+81+87)

**DOUGH:**
- All of the levain: 193g
- Flour: 393g
- Milk: ~219g (adjusted for levain water)
- Eggs: 100g
- Butter: 28g
- Sugar: 75g

**Baker's Percentages:**
- Flour: 480g (100%)
- Liquid (milk+eggs): 400g (83.3%)
- Butter: 28g (5.8%)
- Sugar: 75g (15.6%)

**Hydration: ~83%** (including eggs as liquid)

---

### Test 3: Multi-Flour Sourdough (Sourdough → Yeast)

**Input Recipe:**
```
400g bread flour
100g whole wheat flour
50g rye flour
350g water
100g sourdough starter (100% hydration)
10g salt
```

**Expected Output:**

**Converted to Yeast:**
- Bread flour: 400g
- Whole wheat flour: 100g
- Rye flour: 50g
- Water: 350g
- Salt: 10g
- Instant yeast: 6g (or Active dry yeast: 8g)

**Baker's Percentages:**
- Total flour: 550g (100%)
  - Bread flour: 400g (72.7%)
  - Whole wheat: 100g (18.2%)
  - Rye: 50g (9.1%)
- Water: 350g (63.6%)
- Salt: 10g (1.8%)
- Yeast: 6g (1.1%)

**Hydration: 63.6%**

---

## PDF Validation Checklist

For each test recipe, complete this checklist after downloading the PDF:

### ✓ HEADER SECTION
- [ ] Recipe title displays correctly (no truncation)
- [ ] Conversion direction label shows (e.g., "Yeast to Sourdough")
- [ ] Hydration percentage correct
- [ ] Date shows current date
- [ ] Divider lines display properly

### ✓ INGREDIENTS SECTION
- [ ] Section heading "INGREDIENTS" visible
- [ ] Subsections labeled (Levain, Dough, or Finishing)
- [ ] All ingredients listed with amounts
- [ ] Amounts are in grams (g)
- [ ] Baker's percentages shown for each ingredient
- [ ] **CRITICAL**: Levain total equals sum of components
  - Example: 26g + 84g + 90g = 200g ✓
- [ ] No duplicate ingredients
- [ ] Multi-flour ratios preserved correctly

### ✓ CHARACTER ENCODING
Check for corrupted characters:
- [ ] Bullet points show as dashes (-), not broken symbols (•, ●)
- [ ] Degree symbols converted (°F → F, °C → C)
- [ ] Em dashes show as hyphens (— → -)
- [ ] Smart quotes show as straight quotes (" → ", ' → ')
- [ ] Percent signs display correctly (%)
- [ ] Parentheses display correctly ()
- [ ] No random boxes or question marks (□, �)

### ✓ METHOD SECTION
- [ ] Section heading "METHOD" visible
- [ ] Steps are numbered
- [ ] Step labels bold (e.g., "Step 1:")
- [ ] Step descriptions readable
- [ ] Timing information shows if applicable
- [ ] Line breaks between steps
- [ ] Text wraps properly (no overflow)

### ✓ NOTES SECTION
- [ ] Section heading "NOTES" visible
- [ ] Background box displays (light beige)
- [ ] Border around box
- [ ] Tips listed with dashes
- [ ] Issue/solution format readable
- [ ] Text wraps properly within box

### ✓ SUBSTITUTIONS SECTION
- [ ] Section heading "SUBSTITUTIONS" visible
- [ ] Background box displays
- [ ] Original → Substitute format
- [ ] Ratios shown
- [ ] Notes text readable
- [ ] Text wraps properly

### ✓ FOOTER
- [ ] Top border line visible
- [ ] "Converted with Bread Buddy - BakingGreatBread.com" text shows
- [ ] Page number shows (e.g., "Page 1")
- [ ] Text is light gray (not too bold)

### ✓ OVERALL QUALITY
- [ ] Professional appearance
- [ ] Consistent spacing
- [ ] No overlapping text
- [ ] Margins look balanced
- [ ] Font sizes appropriate
- [ ] PDF file size reasonable (<500KB for typical recipe)

---

## Testing Procedure

### Step 1: Generate the Recipe
1. Open Bread Buddy: https://d0f5bbed-853d-4f28-90ba-7781f1963723.lovableproject.com
2. Select conversion direction
3. Paste test recipe
4. Click through to output screen

### Step 2: Download PDF
1. Click "Download PDF" button
2. Save to your Downloads folder
3. Note the filename format

### Step 3: Open & Inspect
1. Open PDF in a PDF reader (Adobe, Preview, Chrome, etc.)
2. Zoom to 100% (actual size)
3. Check each section against checklist above
4. Take screenshots of any issues

### Step 4: Verify Calculations
Use calculator to verify:
- Levain total = starter + water + flour
- Baker's percentages = (ingredient / total flour) × 100
- Total flour = 100%
- Hydration = (total water / total flour) × 100

### Step 5: Document Issues
For each issue found, note:
- Which recipe test it occurred in
- What section (Header, Ingredients, Method, etc.)
- Specific problem (screenshot helpful)
- Expected vs. Actual

---

## Issue Reporting Template

**Recipe**: [Test 1, 2, or 3]  
**Section**: [Header / Ingredients / Method / Notes / Substitutions / Footer]  
**Issue**: [Describe what's wrong]  
**Expected**: [What should appear]  
**Actual**: [What actually appears]  
**Screenshot**: [Attach if visual]  

Example:
```
Recipe: Test 1 - Simple Lean Dough
Section: Ingredients - Levain
Issue: Levain total shows 240g but should be 200g
Expected: Total: 200g (26g + 84g + 90g)
Actual: Total: 240g
Screenshot: [attached]
```

---

## Known Issues (Fixed)

### ✅ UTF-8 Encoding Issues (FIXED)
- Smart quotes → Straight quotes
- Em dashes → Hyphens
- Degree symbols → Text
- All non-ASCII characters cleaned

### ✅ Levain Total Calculation (FIXED)
- Now sums actual flour components shown in levain
- Accounts for rounding with multiple flours
- Validation in development mode

---

## Pass/Fail Criteria

### PASS ✅
- All 3 recipes generate PDFs without errors
- All text is readable (no corrupted characters)
- Levain totals are mathematically correct
- Baker's percentages accurate
- Method steps clear and formatted

### FAIL ❌ (Requires Fix)
- Any corrupted characters in text
- Incorrect calculations (levain total, percentages)
- Missing sections or ingredients
- Overlapping text or broken layout
- PDF won't open or crashes reader

---

## Testing Tips

1. **Use Multiple PDF Readers**: Test in at least 2 different readers
   - Adobe Acrobat Reader
   - Mac Preview
   - Chrome browser
   - Windows PDF viewer

2. **Print Preview**: Check print layout (File → Print → Preview)

3. **Zoom Test**: Zoom in/out to check text sharpness

4. **Copy Text**: Try copying text from PDF to verify encoding

5. **File Size**: Check PDF file size (should be <500KB)

---

## Next Steps After Testing

1. If ALL PASS ✅:
   - Document success
   - Ready for beta launch
   - Monitor for user-reported PDF issues

2. If ANY FAIL ❌:
   - Document all issues
   - Report to developer with screenshots
   - Re-test after fixes
   - Do NOT launch until all critical issues fixed
