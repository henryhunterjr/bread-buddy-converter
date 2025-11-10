import { useState } from 'react';
import LandingScreen from '@/components/LandingScreen';
import InputScreen from '@/components/InputScreen';
import OutputScreen from '@/components/OutputScreen';
import { parseRecipe } from '@/utils/recipeParser';
import { convertSourdoughToYeast, convertYeastToSourdough } from '@/utils/recipeConverter';
import { ConvertedRecipe, ParsedIngredient, ParsedRecipe } from '@/types/recipe';
import { IngredientConfirmation } from '@/components/IngredientConfirmation';
import { supabase } from '@/integrations/supabase/client';

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

  const handleSelectDirection = (selectedDirection: 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    setDirection(selectedDirection);
    setScreen('input');
  };

  const handleConvert = (recipeText: string, starterHydration: number, aiParsedData?: ParsedRecipe) => {
    // Use AI-parsed data if provided, otherwise parse with regex
    const parsed = aiParsedData || parseRecipe(recipeText, starterHydration);
    
    console.log('handleConvert - using', aiParsedData ? 'AI-parsed data' : 'regex-parsed data');
    console.log('Parsed recipe:', {
      totalFlour: parsed.totalFlour,
      totalLiquid: parsed.totalLiquid,
      hydration: parsed.hydration,
      ingredientCount: parsed.ingredients.length
    });
    
    // Extract recipe name and description from first lines
    const lines = recipeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const firstLine = lines[0] || 'Converted Recipe';
    
    // Split first line at first sentence ending (period, exclamation, or question mark)
    const sentenceMatch = firstLine.match(/^([^.!?]+[.!?])\s*(.*)$/);
    let extractedName: string;
    let extractedDescription: string;
    
    if (sentenceMatch) {
      // If we found a sentence ending, split there
      extractedName = sentenceMatch[1].trim();
      extractedDescription = sentenceMatch[2].trim();
    } else {
      // If no sentence ending, use the whole first line as title
      extractedName = firstLine;
      extractedDescription = '';
    }
    
    // If description is still empty, try to grab the second line
    if (!extractedDescription && lines.length > 1) {
      extractedDescription = lines.slice(1, 4).join(' '); // Take up to 3 more lines
    }
    
    // Show confirmation screen before converting
    setOriginalRecipeText(recipeText);
    setExtractedIngredients(parsed.ingredients);
    setParsedRecipeForConfirmation({ ...parsed, starterHydration });
    setRecipeName(extractedName);
    setRecipeDescription(extractedDescription);
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
    
    setResult(converted);
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
        />
      )}
    </>
  );
};

export default Index;
