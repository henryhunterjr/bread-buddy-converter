import { useState } from 'react';
import LandingScreen from '@/components/LandingScreen';
import InputScreen from '@/components/InputScreen';
import OutputScreen from '@/components/OutputScreen';
import { parseRecipe } from '@/utils/recipeParser';
import { convertSourdoughToYeast, convertYeastToSourdough } from '@/utils/recipeConverter';
import { validateConversion } from '@/utils/recipeValidator';
import { ConvertedRecipe, ParsedIngredient, ParsedRecipe } from '@/types/recipe';
import { IngredientConfirmation } from '@/components/IngredientConfirmation';
import { supabase } from '@/integrations/supabase/client';
import { extractRecipeInfo } from '@/utils/titleExtractor';
import { HelpModal } from '@/components/HelpModal';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

type Screen = 'landing' | 'input' | 'confirmation' | 'output';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [direction, setDirection] = useState<'sourdough-to-yeast' | 'yeast-to-sourdough'>('sourdough-to-yeast');
  const [result, setResult] = useState<ConvertedRecipe | null>(null);
  const [originalRecipeText, setOriginalRecipeText] = useState<string>('');
  const [extractedIngredients, setExtractedIngredients] = useState<ParsedIngredient[]>([]);
  const [parsedRecipeForConfirmation, setParsedRecipeForConfirmation] = useState<any>(null);
  const [recipeName, setRecipeName] = useState<string>('Converted Recipe');
  const [recipeDescription, setRecipeDescription] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [validationAutoFixes, setValidationAutoFixes] = useState<string[]>([]);

  const handleSelectDirection = (selectedDirection: 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    setDirection(selectedDirection);
    setScreen('input');
  };

  const handleConvert = async (recipeText: string, starterHydration: number, aiParsedData?: ParsedRecipe) => {
    // Use AI-parsed data if provided, otherwise parse with regex
    const parsed = aiParsedData || parseRecipe(recipeText, starterHydration);
    
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
    // CRITICAL: These are the ORIGINAL parsed ingredients, NOT converted ingredients
    // No starter decomposition should happen here - that happens after confirmation
    console.log('=== INGREDIENTS FOR CONFIRMATION SCREEN ===');
    console.log('Showing', parsed.ingredients.length, 'original ingredients to user:');
    parsed.ingredients.forEach((ing, idx) => {
      console.log(`  ${idx + 1}. ${ing.amount}g ${ing.name} [${ing.type}]`);
    });
    console.log('=== (No conversion has happened yet) ===');
    
    setOriginalRecipeText(recipeText);
    setExtractedIngredients(parsed.ingredients);
    setParsedRecipeForConfirmation({ ...parsed, starterHydration });
    setRecipeName(title);
    setRecipeDescription(description);
    setScreen('confirmation');
  };

  const handleConfirmIngredients = async (confirmedIngredients: ParsedIngredient[]) => {
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
    setOriginalRecipeText('');
  };

  const handleBack = () => {
    setScreen('landing');
  };

  return (
    <>
      {/* Global Help Button - visible on all screens */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHelp(true)}
        className="fixed top-4 right-4 z-50 bg-background/95 backdrop-blur shadow-lg border-bread-medium/30 hover:bg-bread-light/50 transition-all"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </Button>

      {/* Help Modal */}
      <HelpModal open={showHelp} onOpenChange={setShowHelp} />

      {screen === 'landing' && (
        <LandingScreen onSelectDirection={handleSelectDirection} />
      )}
      {screen === 'input' && (
        <InputScreen 
          direction={direction} 
          onConvert={handleConvert}
          onBack={handleBack}
          onLoadSaved={handleLoadSaved}
        />
      )}
      {screen === 'confirmation' && (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <IngredientConfirmation
            ingredients={extractedIngredients}
            onConfirm={handleConfirmIngredients}
            onReject={handleRejectIngredients}
          />
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
        />
      )}
    </>
  );
};

export default Index;
