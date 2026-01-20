import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  RotateCcw,
  Printer,
  Download,
  Info,
  AlertTriangle,
  Eye,
  EyeOff,
  CookingPot,
  Sparkles,
} from 'lucide-react';
import { HeroHeader } from '@/components/HeroHeader';
import { QuickBreadConversionResult, QuickBreadIngredient } from '@/utils/quickBreadConverter';
import { formatVolumeAmount, gramsToVolume, formatDiscardIngredient } from '@/utils/quickBreadConverter';

interface QuickBreadOutputScreenProps {
  result: QuickBreadConversionResult;
  originalRecipeText: string;
  onStartOver: () => void;
  onHome: () => void;
}

export function QuickBreadOutputScreen({
  result,
  originalRecipeText,
  onStartOver,
  onHome,
}: QuickBreadOutputScreenProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showWhyThisWorks, setShowWhyThisWorks] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const formatIngredient = (ing: QuickBreadIngredient): string => {
    let amountStr: string;

    if (result.isVolumeBasedRecipe && ing.unit !== 'g') {
      amountStr = formatVolumeAmount(ing.amount, ing.unit);
    } else if (result.isVolumeBasedRecipe && ing.unit === 'g') {
      const ingredientType = ing.type === 'flour' ? 'flour' : 'liquid';
      const volume = gramsToVolume(ing.amount, ingredientType);
      amountStr = volume.display;
    } else {
      amountStr = `${Math.round(ing.amount)}g`;
    }

    let display = `${amountStr} ${ing.name}`;

    if (ing.isAdjusted && ing.adjustmentNote) {
      display += ` (${ing.adjustmentNote})`;
    }

    return display;
  };

  // Insert discard into ingredients at the appropriate position (with wet ingredients)
  const getIngredientsWithDiscard = () => {
    const ingredients = [...result.convertedIngredients];
    const discardLine = formatDiscardIngredient(result.discardAmount, result.isVolumeBasedRecipe);

    // Find the first liquid ingredient position to insert discard nearby
    const firstLiquidIndex = ingredients.findIndex(i => i.type === 'liquid');
    const insertIndex = firstLiquidIndex >= 0 ? firstLiquidIndex : Math.floor(ingredients.length / 2);

    return {
      ingredients,
      discardLine,
      insertIndex,
    };
  };

  const { ingredients, discardLine, insertIndex } = getIngredientsWithDiscard();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex flex-col print:bg-white">
      {/* Hero Header - hide in print */}
      <div className="print:hidden">
        <HeroHeader
          pageTitle={result.recipeName}
          pageSubtitle="Your recipe has been converted to use sourdough discard"
          showNav={true}
          onNavigate={(route) => {
            if (route === 'home') onHome();
          }}
        />
      </div>

      {/* Print Header */}
      <div className="hidden print:block p-4 border-b">
        <h1 className="text-2xl font-bold">{result.recipeName}</h1>
        <p className="text-sm text-muted-foreground">Converted for Sourdough Discard</p>
      </div>

      {/* Progress Indicator - hide in print */}
      <div className="w-full bg-bread-cream/50 border-b border-bread-medium/30 py-4 print:hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-bread-earth">Conversion Complete</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Quick Bread
            </Badge>
          </div>
          <div className="w-full h-2 bg-bread-medium/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-4 print:py-4">
        <div className="max-w-[800px] mx-auto space-y-6">
          {/* Summary Box */}
          <Card className="bg-green-50 border-green-200 p-6 print:bg-white print:border print:border-gray-300">
            <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Conversion Summary
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>{result.summary.discardAdded}</span>
              </div>
              <div className="flex items-center gap-2 text-green-800">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>{result.summary.flourReduced}</span>
              </div>
              <div className="flex items-center gap-2 text-green-800">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>{result.summary.liquidReduced}</span>
              </div>
            </div>
          </Card>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-3 print:hidden">
              {result.warnings.map((warning, index) => (
                <Alert
                  key={index}
                  variant={warning.type === 'caution' ? 'destructive' : 'default'}
                  className={
                    warning.type === 'info'
                      ? 'bg-blue-50 border-blue-200'
                      : warning.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200'
                        : ''
                  }
                >
                  {warning.type === 'info' ? (
                    <Info className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>{warning.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Notes */}
          {result.notes.length > 0 && (
            <Card className="bg-amber-50 border-amber-200 p-4 print:bg-white">
              <h4 className="font-medium text-amber-900 mb-2">Notes:</h4>
              <ul className="space-y-1 text-amber-800 text-sm">
                {result.notes.map((note, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="flex-shrink-0">-</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Toggle Original Recipe */}
          <Button
            variant="outline"
            onClick={() => setShowOriginal(!showOriginal)}
            className="w-full print:hidden"
          >
            {showOriginal ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Original Recipe
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View Original Recipe
              </>
            )}
          </Button>

          {showOriginal && (
            <Card className="bg-gray-50 border-gray-200 p-6 print:hidden">
              <h4 className="font-medium text-gray-900 mb-4">Original Recipe</h4>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {originalRecipeText}
              </pre>
            </Card>
          )}

          {/* Converted Ingredients */}
          <Card className="bg-bread-light/90 border-bread-medium/40 p-6">
            <h3 className="font-semibold text-bread-earth mb-4 flex items-center gap-2">
              <CookingPot className="h-5 w-5 text-burnt-orange" />
              Ingredients
            </h3>
            <ul className="space-y-2">
              {ingredients.slice(0, insertIndex).map((ing, index) => (
                <li
                  key={`before-${index}`}
                  className={`text-bread-earth ${ing.isAdjusted ? 'font-medium' : ''}`}
                >
                  - {formatIngredient(ing)}
                </li>
              ))}

              {/* Discard ingredient - highlighted */}
              <li className="text-burnt-orange font-semibold bg-burnt-orange/10 -mx-2 px-2 py-1 rounded">
                - {discardLine}
              </li>

              {ingredients.slice(insertIndex).map((ing, index) => (
                <li
                  key={`after-${index}`}
                  className={`text-bread-earth ${ing.isAdjusted ? 'font-medium' : ''}`}
                >
                  - {formatIngredient(ing)}
                </li>
              ))}
            </ul>
          </Card>

          {/* Method */}
          <Card className="bg-bread-light/90 border-bread-medium/40 p-6">
            <h3 className="font-semibold text-bread-earth mb-4">Method</h3>
            <div className="prose prose-sm max-w-none text-bread-earth">
              {result.convertedMethod.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3">
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>

          {/* Tip */}
          <Card className="bg-bread-cream border-bread-medium/30 p-4">
            <p className="text-sm text-bread-earth italic">
              <strong>Tip:</strong> Unfed (discard) starter works perfectly here. The natural
              tang adds depth without affecting the rise.
            </p>
          </Card>

          {/* Why This Works - Expandable */}
          <Collapsible open={showWhyThisWorks} onOpenChange={setShowWhyThisWorks}>
            <CollapsibleTrigger className="w-full">
              <Card className="bg-bread-light border-bread-medium/40 p-4 hover:bg-bread-cream transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-bread-earth flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Why this works
                  </span>
                  {showWhyThisWorks ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-bread-light border-bread-medium/40 border-t-0 rounded-t-none p-6 -mt-2">
                <p className="text-sm text-bread-earth leading-relaxed">
                  Sourdough discard is roughly 50% flour and 50% water by weight. By reducing
                  the recipe's flour and liquid proportionally, the texture stays balanced
                  while you gain the subtle complexity and tang that discard provides. The
                  existing baking soda/powder still handles the rise—discard is here for
                  flavor, not leavening.
                </p>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center print:hidden">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-bread-medium hover:bg-bread-light"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Recipe
            </Button>
            <Button
              variant="outline"
              onClick={onStartOver}
              className="border-bread-medium hover:bg-bread-light"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Convert Another
            </Button>
            <Button
              onClick={onHome}
              className="bg-burnt-orange hover:bg-burnt-orange/90 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border print:hidden">
        Copyright 2025 Henry Hunter Baking Great Bread at Home. All Rights Reserved
      </footer>
    </div>
  );
}

export default QuickBreadOutputScreen;
