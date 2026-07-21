/**
 * Smart Recipe Preprocessing
 * Automatically fixes common formatting issues before parsing
 */

export interface PreprocessResult {
  cleanedText: string;
  appliedFixes: string[];
  confidence: number;
}

export function preprocessRecipeText(recipeText: string): PreprocessResult {
  let cleaned = recipeText;
  const appliedFixes: string[] = [];

  // Fix 1: Concatenated ingredients (flour egg yolks → flour\negg yolks)
  const concatenationPatterns = [
    { pattern: /(\d+g?\s+)?(bread\s+)?flour\s+yolks/gi, fix: 'flour\negg yolks', name: 'flour-yolks concatenation' },
    { pattern: /flour\s+and\s+(?!water)/gi, fix: 'flour\n', name: 'flour-and concatenation' },
    { pattern: /sugar\s+and\s+/gi, fix: 'sugar\n', name: 'sugar-and concatenation' },
    { pattern: /salt\s+and\s+/gi, fix: 'salt\n', name: 'salt-and concatenation' },
  ];

  concatenationPatterns.forEach(({ pattern, fix, name }) => {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, fix);
      appliedFixes.push(`Fixed ${name}`);
    }
  });

  // Fix 2: Missing units (500 flour → 500g flour)
  const missingUnitPattern = /(\d+)\s+(flour|water|milk|salt|yeast|sugar|butter|oil)/gi;
  if (missingUnitPattern.test(cleaned)) {
    cleaned = cleaned.replace(missingUnitPattern, '$1g $2');
    appliedFixes.push('Added missing gram units');
  }

  // Fix 3: Inconsistent spacing around numbers.
  // [^\S\n] = whitespace EXCEPT newline — line breaks are load-bearing for the
  // parser (one ingredient per line) and must never be collapsed here.
  cleaned = cleaned.replace(/(\d+)[^\S\n]*-[^\S\n]*(\d+)/g, '$1-$2'); // "500 - 600" → "500-600"
  cleaned = cleaned.replace(/(\d+)[^\S\n]+([a-z])/gi, '$1 $2'); // Ensure single space between number and word

  // Fix 4: Remove extra whitespace — WITHIN lines only. Collapsing newlines
  // here used to merge blog-style recipes into mega-lines, which made the
  // parser lose water/yeast entirely (an ingredient sharing a line with
  // "egg wash" got the whole line discarded). Keep the line structure.
  const originalLength = cleaned.length;
  cleaned = cleaned
    .replace(/[^\S\n]+/g, ' ')   // collapse runs of spaces/tabs, keep newlines
    .replace(/ *\n */g, '\n')    // trim spaces around each line break
    .replace(/\n{3,}/g, '\n\n')  // cap blank runs at one empty line
    .trim();
  if (originalLength !== cleaned.length) {
    appliedFixes.push('Cleaned extra whitespace');
  }

  // Fix 5: Normalize ingredient separators (semicolons to newlines)
  if (cleaned.includes(';')) {
    cleaned = cleaned.replace(/;\s*/g, '\n');
    appliedFixes.push('Converted semicolons to newlines');
  }

  // Fix 6: Common typos
  const typoFixes = [
    { from: /\bflour\s+yolks\b/gi, to: 'flour\negg yolks', name: 'flour yolks typo' },
    { from: /\blevian\b/gi, to: 'levain', name: 'levian → levain' },
    { from: /\bstater\b/gi, to: 'starter', name: 'stater → starter' },
    { from: /\byeasst\b/gi, to: 'yeast', name: 'yeasst → yeast' },
  ];

  typoFixes.forEach(({ from, to, name }) => {
    if (from.test(cleaned)) {
      cleaned = cleaned.replace(from, to);
      appliedFixes.push(`Fixed ${name}`);
    }
  });

  // Fix 7: Ensure flour is properly formatted
  const flourVariations = [
    /\ball[\s-]?purpose\s+flour\b/gi,
    /\bap\s+flour\b/gi,
    /\bbread\s+flour\b/gi,
    /\bwhole\s+wheat\b/gi,
  ];
  
  let hasFlourFormat = flourVariations.some(pattern => pattern.test(cleaned));
  if (!hasFlourFormat && /\bflour\b/i.test(cleaned)) {
    // If we see "flour" but no proper format, ensure it's properly separated
    cleaned = cleaned.replace(/(\d+[a-z]*)\s*flour/gi, '$1 all-purpose flour');
    appliedFixes.push('Standardized flour terminology');
  }

  // Calculate confidence score
  let confidence = 100;
  if (appliedFixes.length > 5) confidence = 70; // Many fixes needed
  else if (appliedFixes.length > 2) confidence = 85; // Some fixes needed
  else if (appliedFixes.length > 0) confidence = 95; // Minor fixes

  return {
    cleanedText: cleaned,
    appliedFixes,
    confidence
  };
}

/**
 * Check if recipe likely needs AI vision instead of text parsing
 */
export function shouldUseAIVision(recipeText: string): { useVision: boolean; reason: string } {
  // Very short text suggests incomplete OCR
  if (recipeText.length < 100) {
    return { useVision: true, reason: 'Text too short - likely incomplete OCR' };
  }

  // No numbers suggests OCR failure
  if (!/\d/.test(recipeText)) {
    return { useVision: true, reason: 'No measurements detected - OCR may have failed' };
  }

  // No flour indicators
  if (!/flour|bread|wheat/i.test(recipeText)) {
    return { useVision: true, reason: 'No flour keywords detected' };
  }

  // Excessive special characters suggests OCR noise
  const specialCharRatio = (recipeText.match(/[^a-zA-Z0-9\s.,;:\-]/g) || []).length / recipeText.length;
  if (specialCharRatio > 0.15) {
    return { useVision: true, reason: 'Excessive special characters - noisy OCR' };
  }

  return { useVision: false, reason: '' };
}

/**
 * Generate user-friendly correction suggestions
 */
export function generateCorrectionSuggestions(error: string, recipeText: string): string[] {
  const suggestions: string[] = [];

  if (error.includes('flour')) {
    suggestions.push('✓ Make sure flour amounts are clearly specified (e.g., "500g all-purpose flour")');
    suggestions.push('✓ Check if flour is mentioned by other names (bread flour, AP flour, wheat flour)');
  }

  if (error.includes('rate limit') || error.includes('429')) {
    suggestions.push('⏱️ Server is busy - please wait 5 seconds and try again');
    suggestions.push('⏱️ The system will automatically retry for you');
  }

  if (error.includes('vision') || error.includes('image')) {
    suggestions.push('📸 Try taking a clearer photo with better lighting');
    suggestions.push('📸 Ensure the recipe is flat and all text is visible');
    suggestions.push('📸 Alternatively, type the recipe manually for best results');
  }

  if (error.includes('JSON') || error.includes('parse')) {
    suggestions.push('🔄 System encountered a technical issue - retrying automatically');
    suggestions.push('🔄 If this persists, try simplifying the recipe format');
  }

  if (recipeText.length < 150) {
    suggestions.push('📝 Recipe seems very short - make sure all ingredients are included');
    suggestions.push('📝 Include amounts for flour, water, and yeast/starter');
  }

  return suggestions;
}
