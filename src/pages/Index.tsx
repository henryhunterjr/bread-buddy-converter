import { useState } from 'react';
import LandingScreen from '@/components/LandingScreen';
import InputScreen from '@/components/InputScreen';
import OutputScreen from '@/components/OutputScreen';
import { parseRecipe } from '@/utils/recipeParser';
import { convertSourdoughToYeast, convertYeastToSourdough } from '@/utils/recipeConverter';
import { ConvertedRecipe, ParsedIngredient } from '@/types/recipe';
import { IngredientConfirmation } from '@/components/IngredientConfirmation';

type Screen = 'landing' | 'input' | 'confirmation' | 'output';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [direction, setDirection] = useState<'sourdough-to-yeast' | 'yeast-to-sourdough'>('sourdough-to-yeast');
  const [result, setResult] = useState<ConvertedRecipe | null>(null);
  const [originalRecipeText, setOriginalRecipeText] = useState<string>('');
  const [extractedIngredients, setExtractedIngredients] = useState<ParsedIngredient[]>([]);
  const [parsedRecipeForConfirmation, setParsedRecipeForConfirmation] = useState<any>(null);

  const handleSelectDirection = (selectedDirection: 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    setDirection(selectedDirection);
    setScreen('input');
  };

  const handleConvert = (recipeText: string) => {
    const parsed = parseRecipe(recipeText);
    
    // Show confirmation screen before converting
    setOriginalRecipeText(recipeText);
    setExtractedIngredients(parsed.ingredients);
    setParsedRecipeForConfirmation(parsed);
    setScreen('confirmation');
  };

  const handleConfirmIngredients = (confirmedIngredients: ParsedIngredient[]) => {
    // Update the parsed recipe with confirmed ingredients
    const updatedRecipe = {
      ...parsedRecipeForConfirmation,
      ingredients: confirmedIngredients
    };
    
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

    // Adjust for starter (100% hydration)
    const adjustedFlour = totalFlour + (starterAmount / 2);
    const adjustedLiquid = totalLiquid + (starterAmount / 2);
    const hydration = adjustedFlour > 0 ? (adjustedLiquid / adjustedFlour) * 100 : 0;

    updatedRecipe.totalFlour = adjustedFlour;
    updatedRecipe.totalLiquid = adjustedLiquid;
    updatedRecipe.starterAmount = starterAmount;
    updatedRecipe.yeastAmount = yeastAmount;
    updatedRecipe.saltAmount = saltAmount;
    updatedRecipe.hydration = hydration;
    
    // Now run the actual conversion
    const converted = direction === 'sourdough-to-yeast' 
      ? convertSourdoughToYeast(updatedRecipe)
      : convertYeastToSourdough(updatedRecipe);
    
    setResult(converted);
    setScreen('output');
  };

  const handleRejectIngredients = () => {
    setScreen('input');
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

  // FIX #7: Add handler to edit extraction from output screen
  const handleEditExtraction = () => {
    setScreen('confirmation');
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
          originalRecipeText={originalRecipeText}
          onStartOver={handleStartOver}
          onEditExtraction={handleEditExtraction}
        />
      )}
    </>
  );
};

export default Index;
