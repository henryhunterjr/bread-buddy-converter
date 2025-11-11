# Recipe Validation Layer - Implementation Guide

## What Was Implemented

A comprehensive validation system that catches and fixes common AI converter errors **AFTER** conversion but **BEFORE** displaying results to users.

## Validation Checks

### 1. Salt Validation ✓
- **Check**: Does the recipe include salt?
- **Action**: If missing or zero → Adds default 2% of flour weight
- **Range**: Warns if < 1.5% (bland) or > 3% (too salty)
- **Example**: 500g flour with missing salt → Adds 10g salt automatically

### 2. Flour Structure Validation ✓
- **Check**: Are all flours in the correct section?
- **Action**: Flags flours with suspicious names (dusting, topping, finishing)
- **Note**: All flours are counted in total flour calculations regardless of intended use

### 3. Hydration Math Validation ✓
- **Check**: Does displayed hydration match calculated hydration?
- **Formula**: (total water / total flour) × 100
- **Action**: If difference > 2% → Recalculates and fixes display
- **Warning**: If adjustment > 10% → Alerts user to verify ingredient amounts

### 4. Ingredient Total Validation ✓
- **Check**: Do component totals match claimed totals?
- **Focus**: Levain total = starter + levain water + levain flour
- **Action**: Logs validation data for debugging (display logic handles the rest)

### 5. Baker's Percentage Validation ✓
- **Check**: Can percentages be calculated correctly?
- **Action**: Validates total flour isn't zero (would cause division by zero)
- **Note**: Actual percentage calculation happens in display/PDF generation

### 6. Essential Ingredients Check ✓
- **Check**: Are core bread-making ingredients present?
- **Must have**: Flour, liquid, leavening (yeast or starter)
- **Should have**: Salt
- **Action**: Warns if any essential ingredient is missing

## How It Works

### Flow
1. User confirms ingredients
2. Recipe is converted (sourdough→yeast or yeast→sourdough)
3. **→ VALIDATION RUNS HERE ←**
4. Auto-fixes are applied
5. Validation warnings are added
6. User sees validated recipe with prominent "Quality Check Complete" alert

### Code Location
- **Validator**: `src/utils/recipeValidator.ts`
- **Integration**: `src/pages/Index.tsx` (lines 180-200)
- **Display**: `src/components/OutputScreen.tsx` (lines 185-208)

### Auto-Fix Display
When validation makes corrections, users see:

```
✓ Quality Check Complete

We caught and fixed the following issues:
• Added 10g salt (2% of flour) - please verify this matches your original recipe
• Corrected hydration calculation: 78.0% (was showing 76.5%)

Please review the recipe and adjust amounts if needed.
```

## Testing Instructions

### Test Case 1: Missing Salt
**Recipe**: 500g flour, 350g water, 5g yeast (NO SALT)

**Expected Result**:
- ✓ Auto-adds 10g salt (2% of 500g flour)
- ✓ Shows "Quality Check Complete" alert
- ✓ Lists: "Added 10g salt (2% of flour) - please verify"

### Test Case 2: Timothy's Enriched Recipe
**Recipe**: 480g flour, 300g milk, 100g eggs, 10g yeast, 28g butter, 75g sugar (NO SALT)

**Expected Result**:
- ✓ Auto-adds 10g salt (2% of 480g flour)
- ✓ Validates hydration calculation
- ✓ Shows quality check alert

### Test Case 3: Hydration Mismatch
**Recipe**: Intentionally miscalculated hydration in converter

**Expected Result**:
- ✓ Detects mismatch > 2%
- ✓ Recalculates and fixes display
- ✓ If difference > 10% → Shows warning to verify amounts

### Test Case 4: Missing Essential Ingredients
**Recipe**: Only "500g flour" (no liquid, no leavening)

**Expected Result**:
- ✓ Warns: "No liquid detected"
- ✓ Warns: "No leavening agent detected"
- ✓ Info: "No salt detected"

### Test Case 5: Low Salt Amount
**Recipe**: 500g flour, 350g water, 5g yeast, 5g salt (1% - too low)

**Expected Result**:
- ✓ Caution warning: "Salt amount (5g, 1.0%) is lower than typical 1.5-2%"
- ✓ NO auto-fix (salt is present, just low)

## Debugging

### Console Logs
When validation runs, check console for:
```
=== RUNNING VALIDATION ===
✓ Auto-fixes applied: ["Added 10g salt (2% of flour)"]
Levain validation: { starter: 50, water: 100, flour: 100, total: 250 }
```

### Validation Result Structure
```typescript
{
  recipe: ConvertedRecipe,           // Validated recipe with fixes applied
  validationWarnings: RecipeWarning[], // Warnings to display
  autoFixes: string[]                  // List of fixes made
}
```

## Benefits

1. **Builds Trust**: Users see the system is double-checking the work
2. **Prevents Errors**: Catches missing salt before user starts baking
3. **Transparent**: Clear explanations of what was fixed
4. **Flexible**: Auto-fixes when possible, warns when manual review needed

## Future Enhancements

Consider adding:
- Yeast amount validation (typical 0.7-1.1% of flour)
- Temperature validation (room temp water should be 75-85°F)
- Timing validation (proof times should be realistic)
- Ingredient name validation (catch typos in common ingredients)
- Multi-flour ratio validation (preserve original flour blend percentages)

## Notes

- Validation is NON-BLOCKING - always allows conversion to proceed
- Auto-fixes are logged to console for debugging
- Validation warnings appear alongside existing recipe warnings
- All validation happens AFTER conversion but BEFORE display
- Users always have final say - can adjust amounts after seeing results
