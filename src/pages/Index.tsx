import { useState, lazy, Suspense } from 'react';
import LandingScreen from '@/components/LandingScreen';
import { parseRecipe, parseQuickBreadRecipe } from '@/utils/recipeParser';
import { convertSourdoughToYeast, convertYeastToSourdough, cleanIngredientName } from '@/utils/recipeConverter';
import { validateConversion } from '@/utils/recipeValidator';
import { ConvertedRecipe, ParsedIngredient, ParsedRecipe, QuickBreadConvertedRecipe } from '@/types/recipe';
import { supabase } from '@/integrations/supabase/client';
import { extractRecipeInfo } from '@/utils/titleExtractor';
import { HelpModal } from '@/components/HelpModal';
import { Button } from '@/components/ui/button';
import { HelpCircle, Loader2 } from 'lucide-react';
import { SavedRecipe } from '@/utils/recipeStorage';
import { Navigation } from '@/components/Navigation';
import { useAnalytics } from '@/hooks/useAnalytics';
import { detectQuickBread } from '@/utils/quickBreadDetector';
import { convertQuickBreadToDiscard, QuickBreadConversionResult } from '@/utils/quickBreadConverter';

// Lazy load heavy components for better initial load performance
const InputScreen = lazy(() => import('@/components/InputScreen'));
const OutputScreen = lazy(() => import('@/components/OutputScreen'));
const IngredientConfirmation = lazy(() => import('@/components/IngredientConfirmation').then(module => ({ default: module.IngredientConfirmation })));
const SavedRecipes = lazy(() => import('@/components/SavedRecipes').then(module => ({ default: module.SavedRecipes })));
const QuickBreadOutputScreen = lazy(() => import('@/components/QuickBreadOutputScreen'));
const QuickBreadInputScreen = lazy(() => import('@/components/QuickBreadInputScreen'));

type Screen = 'landing' | 'input' | 'confirmation' | 'output' | 'saved' | 'quick-bread-input' | 'quick-bread-output';

const Index = () => {
  const { trackEvent } = useAnalytics();
  const [screen, setScreen] = useState<Screen>('landing');
  const [direction, setDirection] = useState<'sourdough-to-yeast' | 'yeast-to-sourdough' | 'quick-bread-discard'>('sourdough-to-yeast');
  const [result, setResult] = useState<ConvertedRecipe | null>(null);
  const [quickBreadResult, setQuickBreadResult] = useState<QuickBreadConversionResult | null>(null);
  const [originalRecipeText, setOriginalRecipeText] = useState<string>('');
  const [extractedIngredients, setExtractedIngredients] = useState<ParsedIngredient[]>([]);
  const [parsedRecipeForConfirmation, setParsedRecipeForConfirmation] = useState<any>(null);
  const [recipeName, setRecipeName] = useState<string>('Converted Recipe');
  const [recipeDescription, setRecipeDescription] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [validationAutoFixes, setValidationAutoFixes] = useState<string[]>([]);

  const handleSelectDirection = (selectedDirection: 'sourdough-to-yeast' | 'yeast-to-sourdough' | 'quick-bread-discard') => {
    setDirection(selectedDirection);
    if (selectedDirection === 'quick-bread-discard') {
      setScreen('quick-bread-input');
    } else {
      setScreen('input');
    }
    trackEvent('conversion_started', { conversion_direction: selectedDirection });
  };

  /**
   * Consolidate duplicate ingredients by cleaning names and summing amounts
   * This prevents showing "bread flour (levain)" and "bread flour (dough)" as separate entries
   */
  const consolidateIngredients = (ingredients: ParsedIngredient[]): ParsedIngredient[] => {
    const consolidationMap = new Map<string, ParsedIngredient>();

    for (const ingredient of ingredients) {
      const cleanedName = cleanIngredientName(ingredient.name);
      const key = `${cleanedName}|${ingredient.type}`; // Use name + type as key to preserve different types

      if (consolidationMap.has(key)) {
        // Sum amounts for duplicate ingredients
        const existing = consolidationMap.get(key)!;
        existing.amount += ingredient.amount;
      } else {
        // Add new ingredient with cleaned name
        consolidationMap.set(key, {
          ...ingredient,
          name: cleanedName
        });
      }
    }

    return Array.from(consolidationMap.values());
  };

  const handleConvert = async (recipeText: string, starterHydration: number, aiParsedData?: ParsedRecipe) => {
    // Use AI-parsed data if provided, otherwise parse with regex
    const parsed = aiParsedData || parseRecipe(recipeText, starterHydration);
    
    // Track parsing method used
    trackEvent(aiParsedData ? 'ai_parsing_success' : 'regex_parsing_used', {
      conversion_direction: direction,
      parser_used: aiParsedData ? 'ai' : 'regex'
    });
    
    console.log('handleConvert - using', aiParsedData ? 'AI-parsed data' : 'regex-parsed data');
    console.log('Parsed recipe:', {
      totalFlour: parsed.totalFlour,
      totalLiquid: parsed.totalLiquid,
      hydration: parsed.hydration,
      ingredientCount: parsed.ingredients.length
    });
    
    // Extract recipe name and description using AI
    let title = 'Converted Bread Recipe';
    let description = '';
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-extract-title', {
        body: { recipeText }
      });
      
      if (!error && data?.success) {
        title = data.title;
        description = data.description;
      } else {
        // Fallback to local extraction
        const fallback = extractRecipeInfo(recipeText);
        title = fallback.title;
        description = fallback.description;
      }
    } catch (error) {
      console.error('AI title extraction failed, using fallback:', error);
      // Fallback to local extraction
      const fallback = extractRecipeInfo(recipeText);
      title = fallback.title;
      description = fallback.description;
    }
    
    console.log('Extracted title:', title);
    console.log('Extracted description:', description);
    
    // Show confirmation screen before converting
    // CRITICAL: Consolidate duplicate ingredients BEFORE showing to user
    console.log('=== INGREDIENTS BEFORE CONSOLIDATION ===');
    console.log('Raw ingredients:', parsed.ingredients.length);
    parsed.ingredients.forEach((ing, idx) => {
      console.log(`  ${idx + 1}. ${ing.amount}g ${ing.name} [${ing.type}]`);
    });
    
    const consolidatedIngredients = consolidateIngredients(parsed.ingredients);
    
    console.log('=== INGREDIENTS AFTER CONSOLIDATION ===');
    console.log('Consolidated ingredients:', consolidatedIngredients.length);
    consolidatedIngredients.forEach((ing, idx) => {
      console.log(`  ${idx + 1}. ${ing.amount}g ${ing.name} [${ing.type}]`);
    });
    
    setOriginalRecipeText(recipeText);
    setExtractedIngredients(consolidatedIngredients);
    setParsedRecipeForConfirmation({ ...parsed, starterHydration });
    setRecipeName(title);
    setRecipeDescription(description);
    setScreen('confirmation');
    
    // Scroll to top when confirmation screen loads
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleConfirmIngredients = async (confirmedIngredients: ParsedIngredient[]) => {
    // Scroll to top when moving to output screen
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Detect if user made corrections
    const userCorrections = confirmedIngredients
      .map((confirmed, idx) => {
        const original = extractedIngredients[idx];
        if (!original) return null;
        
        const changes = [];
        if (confirmed.amount !== original.amount) {
          changes.push({ field: 'amount', from: original.amount, to: confirmed.amount });
        }
        if (confirmed.type !== original.type) {
          changes.push({ field: 'type', from: original.type, to: confirmed.type });
        }
        if (confirmed.name !== original.name) {
          changes.push({ field: 'name', from: original.name, to: confirmed.name });
        }
        
        return changes.length > 0 ? { name: confirmed.name, changes } : null;
      })
      .filter(Boolean);
    
    // Log corrections for learning if any were made
    if (userCorrections.length > 0) {
      console.log('User made corrections:', userCorrections);
      
      // Send to learning system (non-blocking)
      supabase.functions.invoke('log-correction', {
        body: {
          recipeText: originalRecipeText,
          originalParsed: parsedRecipeForConfirmation,
          correctedIngredients: confirmedIngredients,
          userCorrections,
          timestamp: new Date().toISOString()
        }
      }).then(({ data, error }) => {
        if (error) console.error('Failed to log correction:', error);
        else console.log('✓ Correction logged for learning:', data?.correctionId);
      });
    }
    
    // Update the parsed recipe with confirmed ingredients
    const updatedRecipe = {
      ...parsedRecipeForConfirmation,
      ingredients: confirmedIngredients
    };
    
    // Get starter hydration from parsed recipe
    const starterHydration = parsedRecipeForConfirmation?.starterHydration || 100;
    
    // Recalculate totals based on confirmed ingredients
    const totalFlour = confirmedIngredients
      .filter(i => i.type === 'flour')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalLiquid = confirmedIngredients
      .filter(i => i.type === 'liquid')
      .reduce((sum, i) => sum + i.amount, 0);
    const starterAmount = confirmedIngredients
      .filter(i => i.type === 'starter')
      .reduce((sum, i) => sum + i.amount, 0);
    const yeastAmount = confirmedIngredients
      .filter(i => i.type === 'yeast')
      .reduce((sum, i) => sum + i.amount, 0);
    const saltAmount = confirmedIngredients
      .filter(i => i.type === 'salt')
      .reduce((sum, i) => sum + i.amount, 0);

    // Adjust for starter using specified hydration
    const starterFlourRatio = 100 / (100 + starterHydration);
    const starterWaterRatio = starterHydration / (100 + starterHydration);
    const adjustedFlour = totalFlour + (starterAmount * starterFlourRatio);
    const adjustedLiquid = totalLiquid + (starterAmount * starterWaterRatio);
    const hydration = adjustedFlour > 0 ? (adjustedLiquid / adjustedFlour) * 100 : 0;

    updatedRecipe.totalFlour = adjustedFlour;
    updatedRecipe.totalLiquid = adjustedLiquid;
    updatedRecipe.starterAmount = starterAmount;
    updatedRecipe.yeastAmount = yeastAmount;
    updatedRecipe.saltAmount = saltAmount;
    updatedRecipe.hydration = hydration;
    
    // Now run the actual conversion with original recipe text for technique detection
    const converted = direction === 'sourdough-to-yeast' 
      ? convertSourdoughToYeast(updatedRecipe, originalRecipeText, starterHydration)
      : convertYeastToSourdough(updatedRecipe, originalRecipeText, starterHydration);
    
    // CRITICAL: Run validation AFTER conversion but BEFORE displaying to user
    console.log('=== RUNNING VALIDATION ===');
    const validationResult = validateConversion(converted);
    
    // Log any auto-fixes made
    if (validationResult.autoFixes.length > 0) {
      console.log('✓ Auto-fixes applied:', validationResult.autoFixes);
    }
    
    // Add validation warnings to the recipe warnings
    const validatedRecipe = {
      ...validationResult.recipe,
      warnings: [
        ...validationResult.validationWarnings,
        ...validationResult.recipe.warnings
      ]
    };
    
    setValidationAutoFixes(validationResult.autoFixes);
    setResult(validatedRecipe);
    setScreen('output');
    
    // Track conversion completed
    trackEvent('conversion_completed', {
      conversion_direction: direction,
      ingredient_count: confirmedIngredients.length,
      had_corrections: userCorrections.length > 0,
      had_auto_fixes: validationResult.autoFixes.length > 0
    });
  };

  const handleRejectIngredients = () => {
    setScreen('input');
  };
  
  const handleEditExtraction = () => {
    setScreen('confirmation');
  };

  const handleLoadSaved = (recipeText: string, savedResult: ConvertedRecipe) => {
    setOriginalRecipeText(recipeText);
    setResult(savedResult);
    setDirection(savedResult.direction);
    setScreen('output');
  };

  const handleStartOver = () => {
    setScreen('landing');
    setResult(null);
    setQuickBreadResult(null);
    setOriginalRecipeText('');
  };

  /**
   * Handle quick bread conversion
   */
  const handleQuickBreadConvert = async (recipeText: string) => {
    setOriginalRecipeText(recipeText);

    // Extract recipe title
    let title = 'Quick Bread Recipe';
    try {
      const { data, error } = await supabase.functions.invoke('ai-extract-title', {
        body: { recipeText }
      });

      if (!error && data?.success) {
        title = data.title;
      } else {
        const fallback = extractRecipeInfo(recipeText);
        title = fallback.title;
      }
    } catch (error) {
      console.error('AI title extraction failed, using fallback:', error);
      const fallback = extractRecipeInfo(recipeText);
      title = fallback.title;
    }

    // Parse the quick bread recipe
    const parsed = parseQuickBreadRecipe(recipeText);

    // Detect if it's a valid quick bread
    const detection = detectQuickBread(recipeText);

    if (detection.hasExistingSourdough) {
      // Recipe already has sourdough
      setQuickBreadResult({
        recipeName: title,
        originalIngredients: [],
        convertedIngredients: [],
        discardAmount: 0,
        discardUnit: 'g',
        flourReduction: 0,
        flourReductionUnit: 'g',
        liquidReductions: [],
        originalMethod: parsed.method,
        convertedMethod: parsed.method,
        warnings: [{ type: 'info', message: 'This recipe already includes sourdough.' }],
        notes: [],
        summary: {
          discardAdded: 'No conversion needed',
          flourReduced: 'N/A',
          liquidReduced: 'N/A',
        },
        isVolumeBasedRecipe: parsed.isVolumeBasedRecipe,
        hasBakingSoda: false,
      });
      setScreen('quick-bread-output');
      return;
    }

    if (detection.isNotBakedGood) {
      // Not a baked good
      setQuickBreadResult({
        recipeName: title,
        originalIngredients: [],
        convertedIngredients: [],
        discardAmount: 0,
        discardUnit: 'g',
        flourReduction: 0,
        flourReductionUnit: 'g',
        liquidReductions: [],
        originalMethod: parsed.method,
        convertedMethod: parsed.method,
        warnings: [{ type: 'warning', message: "This recipe doesn't appear to be a quick bread. Need help with something else?" }],
        notes: [],
        summary: {
          discardAdded: 'No conversion performed',
          flourReduced: 'N/A',
          liquidReduced: 'N/A',
        },
        isVolumeBasedRecipe: parsed.isVolumeBasedRecipe,
        hasBakingSoda: false,
      });
      setScreen('quick-bread-output');
      return;
    }

    // Convert the parsed ingredients to the format needed by the converter
    const ingredientsForConverter: ParsedIngredient[] = parsed.ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amountInGrams,
      unit: 'g',
      type: ing.type === 'leavener' ? 'other' : ing.type as ParsedIngredient['type'],
    }));

    // Perform the conversion
    const conversionResult = convertQuickBreadToDiscard(
      title,
      ingredientsForConverter,
      parsed.method,
      recipeText
    );

    setQuickBreadResult(conversionResult);
    setRecipeName(title);
    setScreen('quick-bread-output');

    trackEvent('quick_bread_converted', {
      flour_amount: parsed.totalFlourGrams,
      is_volume_based: parsed.isVolumeBasedRecipe,
      confidence_score: detection.confidenceScore,
    });
  };

  const handleBack = () => {
    setScreen('landing');
  };
  
  const handleViewSavedRecipes = () => {
    setScreen('saved');
  };
  
  const handleLoadRecipe = (recipe: SavedRecipe) => {
    setOriginalRecipeText(recipe.originalText);
    setResult(recipe.convertedRecipe);
    setDirection(recipe.convertedRecipe.direction);
    setRecipeName(recipe.name);
    setScreen('output');
  };

  return (
    <>
      {/* Global Help Button - fixed bottom-right, always accessible */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-background/95 backdrop-blur shadow-lg border-bread-medium/30 hover:bg-bread-light/50 transition-all print:hidden"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {/* Help Modal */}
      <HelpModal open={showHelp} onOpenChange={setShowHelp} />

      {screen === 'landing' && (
        <LandingScreen onSelectDirection={handleSelectDirection} />
      )}
      
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }>
        {screen === 'input' && (
          <InputScreen
            direction={direction as 'sourdough-to-yeast' | 'yeast-to-sourdough'}
            onConvert={handleConvert}
            onBack={handleBack}
            onLoadSaved={handleLoadSaved}
            onHome={handleStartOver}
            onQuickBreadDetected={handleQuickBreadConvert}
          />
        )}
        {screen === 'confirmation' && (
          <IngredientConfirmation
            ingredients={extractedIngredients}
            onConfirm={handleConfirmIngredients}
            onReject={handleRejectIngredients}
            onHome={handleStartOver}
          />
        )}
        {screen === 'saved' && (
          <div className="min-h-screen bg-background flex flex-col">
            <Navigation onHome={handleStartOver} />
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-3xl w-full">
                <SavedRecipes onLoadRecipe={handleLoadRecipe} />
              </div>
            </div>
          </div>
        )}
        {screen === 'output' && result && (
          <OutputScreen
            result={result}
            recipeName={recipeName}
            recipeDescription={recipeDescription}
            originalRecipeText={originalRecipeText}
            onStartOver={handleStartOver}
            onEditExtraction={handleEditExtraction}
            validationAutoFixes={validationAutoFixes}
            onHome={handleStartOver}
            onMyRecipes={handleViewSavedRecipes}
          />
        )}
        {screen === 'quick-bread-input' && (
          <QuickBreadInputScreen
            onConvert={handleQuickBreadConvert}
            onBack={handleBack}
            onHome={handleStartOver}
          />
        )}
        {screen === 'quick-bread-output' && quickBreadResult && (
          <QuickBreadOutputScreen
            result={quickBreadResult}
            originalRecipeText={originalRecipeText}
            onStartOver={handleStartOver}
            onHome={handleStartOver}
          />
        )}
      </Suspense>
    </>
  );
};

export default Index;
