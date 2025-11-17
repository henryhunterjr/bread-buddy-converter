# Bread Buddy Converter

A professional sourdough↔yeast recipe converter built for home bakers. Accurately extracts ingredients, calculates baker's percentages, and provides reliable conversions using proper bread science.

## What It Does

- Converts commercial yeast recipes to sourdough starter (and vice versa)
- Extracts ingredients with smart parsing (handles parenthetical measurements, compound ingredients, finishing ingredients)
- Calculates accurate hydration percentages
- Provides detailed conversion instructions
- Handles enriched doughs (eggs, butter, milk, sugar)

## How It Works

1. Paste your recipe (any format)
2. Select conversion direction (sourdough→yeast or yeast→sourdough)
3. Get your converted recipe with baker's percentages and method adjustments

## Live Demo

https://bread-buddy-converter.lovable.app/

## Built With

- React + TypeScript
- Tailwind CSS
- Vite
- shadcn/ui components

## Key Features

- **Smart Ingredient Detection**: Distinguishes between dough ingredients and finishing ingredients (egg wash, finishing butter, etc.)
- **Baker's Math**: Accurate calculations using industry-standard percentages
- **Enriched Dough Support**: Handles milk, eggs, butter, sugar, honey
- **Flexible Parsing**: Works with metric, volume, or mixed measurements
- **Hydration Validation**: Warns about unusual hydration levels

## Testing

Thoroughly tested with:
- Simple lean doughs
- Enriched doughs (brioche, challah, milk bread)
- Complex multi-stage recipes (tangzhong, levain builds)
- Edge cases (compound ingredients, optional ingredients, finishing ingredients)

## Known Limitations

- Conversions are estimates based on standard baker's percentages
- Some recipe formats may require manual cleanup
- Assumes 100% hydration sourdough starter
- **Recipe Formatting:** Works best with straightforward ingredient lists. Complex recipes with separate topping/filling sections or unusual formatting may require manual review.
- **OCR Accuracy:** Image uploads work best with clear, printed recipes. Handwritten or complex multi-section recipes may need verification.
- **Validation:** Unusually high hydration (>150%) triggers a warning for user verification.

## Changelog

### Version 1.1 (November 2024)
- **FIX**: Flour display inconsistency in sourdough→yeast conversion (ISSUE-003) - Flour amount in ingredients list now correctly includes flour from starter
- **FIX**: Text input validation false error messages (ISSUE-002/005) - Validation now only triggers onBlur instead of during typing
- **FIX**: Dynamic instruction generation based on actual ingredients (ISSUE-001) - Method instructions now mention only ingredients present in the recipe
- **AUDIT**: Independent QA completed (4.4/5.0 score)

### Version 1.0 (October 2024)
- Initial public launch
- Full yeast ↔ sourdough conversion
- PDF export functionality
- OCR image parsing
- Ingredient confidence scoring
- Biga/poolish detection
- Multi-liquid hydration tracking
- Not suitable for unleavened breads or flatbreads

## Contributing

Built and maintained by Henry Hunter for the Baking Great Bread at Home community.

Bug reports and suggestions: henrysbreadkitchen@gmail.com

## License

MIT License - See LICENSE file for details

## Disclaimer

This tool provides recipe conversions as estimates. Always use your judgment and adjust based on your specific flour, environment, and experience. Not responsible for baking outcomes. See DISCLAIMER.md for full terms.

## About

Created by Henry Hunter
Blog: https://www.BakingGreatBread.com
Community: Baking Great Bread at Home (50,000+ members)
