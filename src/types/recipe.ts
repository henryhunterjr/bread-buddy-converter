export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  type: 'flour' | 'liquid' | 'starter' | 'yeast' | 'salt' | 'fat' | 'enrichment' | 'sweetener' | 'other';
  confidence?: 'high' | 'medium' | 'low';
  source?: 'regex' | 'ai' | 'corrected' | 'estimated';
  aiSuggestion?: string;
  isLevainReference?: boolean; // True when referencing levain built in separate section
  isFinishing?: boolean; // Brine/topping/glaze items: preserved and displayed, but excluded from dough math
  section?: RecipeSection;
  role?: IngredientRole;
  gramWeight?: number;
  hydrationContribution?: number;
  flourContribution?: number;
  saltContribution?: number;
  inDough?: boolean;
  confidenceScore?: number;
  sourceLocation?: { line?: number; text?: string };
}

export type RecipeSection =
  | 'dough' | 'levain' | 'brine' | 'pan-preparation' | 'topping' | 'filling'
  | 'glaze' | 'wash' | 'tangzhong' | 'soaker' | 'garnish' | 'finishing' | 'unknown';

export type IngredientRole =
  | 'flour' | 'liquid' | 'salt' | 'leavener' | 'fat' | 'sweetener' | 'enrichment'
  | 'filling' | 'topping' | 'brine' | 'pan-coating' | 'wash' | 'glaze' | 'garnish' | 'other';

export interface RecipeClassification {
  type: 'lean-hearth-loaf' | 'sandwich-loaf' | 'focaccia' | 'pizza' | 'rolls' | 'baguette'
    | 'enriched-bread' | 'brioche' | 'challah' | 'cinnamon-rolls' | 'flatbread' | 'bagels'
    | 'pretzels' | 'laminated-dough' | 'batter-bread' | 'unknown';
  confidence: number;
  signals: string[];
  reviewRequired: boolean;
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
  title?: string;
  classification?: RecipeClassification;
  sections?: Record<RecipeSection, ParsedIngredient[]>;
  sourceIngredients?: ParsedIngredient[];
}

export interface ConvertedRecipe {
  original: ParsedRecipe;
  converted: ParsedRecipe;
  direction: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  methodChanges: MethodChange[];
  troubleshootingTips: TroubleshootingTip[];
  warnings: RecipeWarning[];
  substitutions: IngredientSubstitution[];
  exportBlocked?: boolean;
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
  isFinishing?: boolean;
  formulaNote?: string;
}
