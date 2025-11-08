export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  type: 'flour' | 'liquid' | 'starter' | 'yeast' | 'salt' | 'other';
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
