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

  const handleSelectDirection = (selectedDirection: 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    setDirection(selectedDirection);
    setScreen('input');
  };

  const handleConvert = (recipeText: string) => {
    const parsed = parseRecipe(recipeText);
    const converted = direction === 'sourdough-to-yeast' 
      ? convertSourdoughToYeast(parsed)
      : convertYeastToSourdough(parsed);
    
    setResult(converted);
    setScreen('output');
  };

  const handleStartOver = () => {
    setScreen('landing');
    setResult(null);
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
        />
      )}
      {screen === 'output' && result && (
        <OutputScreen 
          result={result} 
          onStartOver={handleStartOver}
        />
      )}
    </>
  );
};

export default Index;
