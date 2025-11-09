import { useState } from 'react';
import LandingScreen from '@/components/LandingScreen';
import InputScreen from '@/components/InputScreen';
import OutputScreen from '@/components/OutputScreen';
import { parseRecipe } from '@/utils/recipeParser';
import { convertSourdoughToYeast, convertYeastToSourdough } from '@/utils/recipeConverter';
import { ConvertedRecipe } from '@/types/recipe';

type Screen = 'landing' | 'input' | 'output';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [direction, setDirection] = useState<'sourdough-to-yeast' | 'yeast-to-sourdough'>('sourdough-to-yeast');
  const [result, setResult] = useState<ConvertedRecipe | null>(null);
  const [originalRecipeText, setOriginalRecipeText] = useState<string>('');

  const handleSelectDirection = (selectedDirection: 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    setDirection(selectedDirection);
    setScreen('input');
  };

  const handleConvert = (recipeText: string) => {
    const parsed = parseRecipe(recipeText);
    const converted = direction === 'sourdough-to-yeast' 
      ? convertSourdoughToYeast(parsed)
      : convertYeastToSourdough(parsed);
    
    setOriginalRecipeText(recipeText);
    setResult(converted);
    setScreen('output');
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
      {screen === 'output' && result && (
        <OutputScreen 
          result={result}
          originalRecipeText={originalRecipeText}
          onStartOver={handleStartOver}
        />
      )}
    </>
  );
};

export default Index;
