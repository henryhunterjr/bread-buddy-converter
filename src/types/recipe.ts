export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  type: 'flour' | 'liquid' | 'starter' | 'yeast' | 'salt' | 'fat' | 'enrichment' | 'sweetener' | 'other';
  confidence?: 'high' | 'medium' | 'low';
  source?: 'regex' | 'ai' | 'corrected' | 'estimated';
  aiSuggestion?: string;
  isLevainReference?: boolean; // True when referencing levain built in separate section
}

export interface ParsedRecipe {
  ingredients: ParsedIngredient[];
  method: string;
  totalFlour: number;
  totalLiquid: number;
  starterAmount: number;
  yeastAmount: number;
  saltAmount: number;
  hydration: number;
  parserUsed?: 'regex' | 'ai' | 'hybrid';
  confidence?: number; // 0-100
  corrections?: string[];
}

export interface ConvertedRecipe {
  original: ParsedRecipe;
  converted: ParsedRecipe;
  direction: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  methodChanges: MethodChange[];
  troubleshootingTips: TroubleshootingTip[];
  warnings: RecipeWarning[];
  substitutions: IngredientSubstitution[];
}

export interface TroubleshootingTip {
  issue: string;
  solution: string;
}

export interface RecipeWarning {
  type: 'info' | 'warning' | 'caution';
  message: string;
}

export interface IngredientSubstitution {
  original: string;
  substitute: string;
  ratio: string;
  hydrationAdjustment: number;
  notes: string;
}

export interface MethodChange {
  step: string;
  change: string;
  timing?: string;
}

export interface BakersPercentage {
  ingredient: string;
  amount: number;
  percentage: number;
}

// Quick Bread Discard Conversion Types
export interface QuickBreadParsedIngredient {
  name: string;
  amount: number;
  originalAmount: number;
  unit: string;
  originalUnit: string;
  type: 'flour' | 'liquid' | 'leavener' | 'fat' | 'sweetener' | 'other';
  isAdjusted: boolean;
  adjustmentNote?: string;
}

export interface QuickBreadConvertedRecipe {
  recipeName: string;
  originalIngredients: QuickBreadParsedIngredient[];
  convertedIngredients: QuickBreadParsedIngredient[];
  discardAmount: number;
  discardUnit: string;
  flourReduction: number;
  flourReductionUnit: string;
  liquidReductions: Array<{ name: string; amount: number; unit: string }>;
  originalMethod: string;
  convertedMethod: string;
  warnings: RecipeWarning[];
  notes: string[];
  summary: {
    discardAdded: string;
    flourReduced: string;
    liquidReduced: string;
  };
  isVolumeBasedRecipe: boolean;
  hasBakingSoda: boolean;
}

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
  confidenceScore: number;
  detectionReason: string;
  isNotBakedGood: boolean;
}

export type RecipeType = 'yeast-bread' | 'sourdough-bread' | 'quick-bread' | 'unknown';
