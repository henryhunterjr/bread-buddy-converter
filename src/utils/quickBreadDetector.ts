/**
 * Quick Bread Detection Utility
 *
 * Automatically detects recipes that are quick breads (no yeast, chemical leaveners present)
 * and determines if they're suitable for sourdough discard conversion.
 *
 * Detection Logic - A recipe is a quick bread IF all of the following are true:
 * 1. Recipe contains flour (any type)
 * 2. Recipe contains at least one chemical leavener (baking soda, baking powder)
 * 3. Recipe contains NO yeast of any kind
 * 4. Recipe contains NO indicators of a yeasted dough process
 */

export interface QuickBreadDetectionResult {
  isQuickBread: boolean;
  hasFlour: boolean;
  hasChemicalLeavener: boolean;
  chemicalLeaveners: string[];
  hasYeast: boolean;
  yeastIndicators: string[];
  hasYeastProcessLanguage: boolean;
  yeastProcessIndicators: string[];
  hasExistingSourdough: boolean;
  confidenceSignals: string[];
  confidenceScore: number; // 0-100
  detectionReason: string;
  isNotBakedGood: boolean;
}

// Chemical leavener patterns
const CHEMICAL_LEAVENER_PATTERNS = [
  /baking\s*soda/i,
  /bicarbonate\s*of\s*soda/i,
  /sodium\s*bicarbonate/i,
  /baking\s*powder/i,
];

// Yeast patterns - must NOT be present for quick bread
const YEAST_PATTERNS = [
  /\byeast\b/i,
  /instant\s*yeast/i,
  /active\s*dry\s*yeast/i,
  /fresh\s*yeast/i,
  /rapid\s*rise\s*yeast/i,
  /bread\s*machine\s*yeast/i,
  /sourdough\s*starter(?!\s*discard)/i,  // Active starter, not discard
  /\blevain\b/i,
  /\bstarter\b(?!\s*discard)/i,  // "starter" but not "starter discard"
];

// Yeasted dough process language - must NOT be present for quick bread
const YEAST_PROCESS_PATTERNS = [
  /\bproof(?:ing|ed)?\b/i,
  /\brise\b/i,
  /\blet\s+rise\b/i,
  /\brising\b/i,
  /bulk\s*ferment(?:ation|ed|ing)?\b/i,
  /double(?:d)?\s+in\s+size/i,
  /until\s+doubled/i,
  /ferment(?:ation|ed|ing)?\b/i,
  /punch\s+down/i,
  /knead(?:ing|ed)?\s+(?:for\s+)?\d+\s*(?:min|minute)/i,  // Extended kneading typical of yeasted bread
];

// Flour patterns
const FLOUR_PATTERNS = [
  /\bflour\b/i,
  /\bwheat\b/i,
  /\brye\b/i,
  /\bspelt\b/i,
  /\beinkorn\b/i,
  /\bkamut\b/i,
];

// Existing sourdough patterns - skip conversion if already has sourdough
const EXISTING_SOURDOUGH_PATTERNS = [
  /sourdough\s*starter/i,
  /sourdough\s*discard/i,
  /starter\s*discard/i,
  /unfed\s*starter/i,
  /discard(?:ed)?\s*starter/i,
];

// Confidence signals - not required but strengthen detection
const CONFIDENCE_SIGNALS = {
  mixIns: [
    /mashed\s*banana/i,
    /shredded\s*zucchini/i,
    /pumpkin\s*puree/i,
    /applesauce/i,
    /shredded\s*carrot/i,
    /grated\s*carrot/i,
    /blueberr(?:y|ies)/i,
    /chocolate\s*chip/i,
    /cranberr(?:y|ies)/i,
    /walnut/i,
    /pecan/i,
    /raisin/i,
  ],
  creamingMethod: [
    /cream(?:ed)?\s+(?:the\s+)?butter\s+(?:and|with)\s+sugar/i,
    /beat(?:en)?\s+(?:the\s+)?butter\s+(?:and|with)\s+sugar/i,
    /mix(?:ed)?\s+(?:the\s+)?butter\s+(?:and|with)\s+sugar/i,
  ],
  quickBakeTime: [
    /bake\s+(?:for\s+)?(?:about\s+)?\d{1,2}(?:\s*-\s*\d{1,2})?\s*(?:min|minute)/i,  // Under 90 minutes
  ],
  quickBreadPans: [
    /loaf\s*pan/i,
    /muffin\s*(?:tin|pan|cups?)/i,
    /sheet\s*pan/i,
    /9\s*x\s*5/i,  // Standard loaf pan size
    /8\s*x\s*4/i,
    /cupcake/i,
  ],
  noKneading: [
    /mix(?:ed)?\s+until\s+just\s+combined/i,
    /stir(?:red)?\s+until\s+just\s+combined/i,
    /do\s+not\s+over\s*mix/i,
    /don't\s+over\s*mix/i,
    /fold(?:ed)?\s+(?:in|together)/i,
  ],
  quickBreadTypes: [
    /banana\s*bread/i,
    /zucchini\s*bread/i,
    /pumpkin\s*bread/i,
    /quick\s*bread/i,
    /\bmuffin/i,
    /\bscone/i,
    /\bbiscuit/i,
    /coffee\s*cake/i,
    /pound\s*cake/i,
    /corn\s*bread/i,
    /soda\s*bread/i,
    /beer\s*bread/i,
  ],
};

// Patterns indicating this is NOT a baked good (pasta, pizza dough without leavener, etc.)
const NOT_BAKED_GOOD_PATTERNS = [
  /\bpasta\b(?!\s*sauce)/i,
  /\bnoodle/i,
  /\bdumpling/i,
  /\bpie\s*crust\b/i,
  /\btart\s*(?:shell|dough)\b/i,
  /pizza\s*dough/i,  // Usually needs yeast, shouldn't get discard conversion
  /\btortilla/i,
  /\bcracker/i,
  /\bgravy\b/i,
  /\bsauce\b(?!\s*(?:apple|cranberry))/i,  // Skip sauces except fruit sauces
];

/**
 * Detect if a recipe is a quick bread suitable for sourdough discard conversion
 */
export function detectQuickBread(recipeText: string, ingredients?: string[]): QuickBreadDetectionResult {
  const textToAnalyze = recipeText.toLowerCase();
  const ingredientText = ingredients?.join(' ').toLowerCase() || '';
  const combinedText = `${textToAnalyze} ${ingredientText}`;

  // Check for flour
  const hasFlour = FLOUR_PATTERNS.some(pattern => pattern.test(combinedText));

  // Check for chemical leaveners
  const chemicalLeaveners: string[] = [];
  for (const pattern of CHEMICAL_LEAVENER_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      chemicalLeaveners.push(match[0].toLowerCase());
    }
  }
  const hasChemicalLeavener = chemicalLeaveners.length > 0;

  // Check for yeast
  const yeastIndicators: string[] = [];
  for (const pattern of YEAST_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      yeastIndicators.push(match[0].toLowerCase());
    }
  }
  const hasYeast = yeastIndicators.length > 0;

  // Check for yeasted process language
  const yeastProcessIndicators: string[] = [];
  for (const pattern of YEAST_PROCESS_PATTERNS) {
    const match = textToAnalyze.match(pattern);
    if (match) {
      yeastProcessIndicators.push(match[0].toLowerCase());
    }
  }
  const hasYeastProcessLanguage = yeastProcessIndicators.length > 0;

  // Check for existing sourdough
  const hasExistingSourdough = EXISTING_SOURDOUGH_PATTERNS.some(pattern => pattern.test(combinedText));

  // Check if this is NOT a baked good
  const isNotBakedGood = NOT_BAKED_GOOD_PATTERNS.some(pattern => pattern.test(combinedText));

  // Calculate confidence signals
  const confidenceSignals: string[] = [];

  // Check mix-ins
  for (const pattern of CONFIDENCE_SIGNALS.mixIns) {
    if (pattern.test(combinedText)) {
      const match = combinedText.match(pattern);
      if (match) confidenceSignals.push(`Mix-in: ${match[0]}`);
    }
  }

  // Check creaming method
  for (const pattern of CONFIDENCE_SIGNALS.creamingMethod) {
    if (pattern.test(textToAnalyze)) {
      confidenceSignals.push('Creaming method detected');
      break;
    }
  }

  // Check quick bread pans
  for (const pattern of CONFIDENCE_SIGNALS.quickBreadPans) {
    if (pattern.test(textToAnalyze)) {
      const match = textToAnalyze.match(pattern);
      if (match) confidenceSignals.push(`Pan type: ${match[0]}`);
    }
  }

  // Check no-kneading indicators
  for (const pattern of CONFIDENCE_SIGNALS.noKneading) {
    if (pattern.test(textToAnalyze)) {
      confidenceSignals.push('No-knead/gentle mixing method');
      break;
    }
  }

  // Check quick bread type names
  for (const pattern of CONFIDENCE_SIGNALS.quickBreadTypes) {
    if (pattern.test(combinedText)) {
      const match = combinedText.match(pattern);
      if (match) confidenceSignals.push(`Quick bread type: ${match[0]}`);
    }
  }

  // Determine if this is a quick bread
  const isQuickBread = hasFlour &&
                       hasChemicalLeavener &&
                       !hasYeast &&
                       !hasYeastProcessLanguage &&
                       !hasExistingSourdough &&
                       !isNotBakedGood;

  // Calculate confidence score
  let confidenceScore = 0;
  if (isQuickBread) {
    // Base score for meeting all required conditions
    confidenceScore = 70;

    // Add points for confidence signals (up to 30 more points)
    const signalPoints = Math.min(confidenceSignals.length * 6, 30);
    confidenceScore += signalPoints;
  }

  // Determine detection reason
  let detectionReason = '';
  if (isQuickBread) {
    detectionReason = 'Quick bread detected: Has flour, chemical leaveners, no yeast or yeasted process language.';
  } else if (hasExistingSourdough) {
    detectionReason = 'This recipe already includes sourdough.';
  } else if (!hasFlour) {
    detectionReason = 'No flour detected in recipe.';
  } else if (!hasChemicalLeavener) {
    detectionReason = 'No chemical leaveners (baking soda/powder) detected.';
  } else if (hasYeast) {
    detectionReason = `Yeast detected (${yeastIndicators.join(', ')}). This appears to be a yeast bread.`;
  } else if (hasYeastProcessLanguage) {
    detectionReason = `Yeasted bread process language detected (${yeastProcessIndicators.join(', ')}). This appears to be a yeast bread.`;
  } else if (isNotBakedGood) {
    detectionReason = "This recipe doesn't appear to be a quick bread. Need help with something else?";
  }

  return {
    isQuickBread,
    hasFlour,
    hasChemicalLeavener,
    chemicalLeaveners,
    hasYeast,
    yeastIndicators,
    hasYeastProcessLanguage,
    yeastProcessIndicators,
    hasExistingSourdough,
    confidenceSignals,
    confidenceScore,
    detectionReason,
    isNotBakedGood,
  };
}

/**
 * Check if recipe has only baking powder (no baking soda)
 * Used to provide the optional note about swapping for baking soda
 */
export function hasOnlyBakingPowder(recipeText: string): boolean {
  const text = recipeText.toLowerCase();
  const hasBakingPowder = /baking\s*powder/i.test(text);
  const hasBakingSoda = /baking\s*soda|bicarbonate\s*of\s*soda|sodium\s*bicarbonate/i.test(text);
  return hasBakingPowder && !hasBakingSoda;
}

/**
 * Detect if recipe contains gluten-free flour
 */
export function hasGlutenFreeFlour(recipeText: string): boolean {
  const gfPatterns = [
    /gluten[\s-]*free\s*flour/i,
    /almond\s*flour/i,
    /coconut\s*flour/i,
    /rice\s*flour/i,
    /oat\s*flour/i,
    /tapioca\s*flour/i,
    /cassava\s*flour/i,
    /chickpea\s*flour/i,
    /buckwheat\s*flour/i,
    /gf\s*flour/i,
  ];
  return gfPatterns.some(pattern => pattern.test(recipeText));
}
