import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hardcoded conversion chart (all-purpose flour: 120g/cup, bread flour: 127g/cup, etc.)
const CONVERSIONS: Record<string, Record<string, number>> = {
  'flour': { cup: 120, tbsp: 7.5, tsp: 2.5, tablespoon: 7.5, teaspoon: 2.5 },
  'all-purpose flour': { cup: 120, tbsp: 7.5, tsp: 2.5, tablespoon: 7.5, teaspoon: 2.5 },
  'bread flour': { cup: 127, tbsp: 7.9, tsp: 2.6, tablespoon: 7.9, teaspoon: 2.6 },
  'whole wheat flour': { cup: 113, tbsp: 7.1, tsp: 2.4, tablespoon: 7.1, teaspoon: 2.4 },
  'sugar': { cup: 200, tbsp: 12.5, tsp: 4.2, tablespoon: 12.5, teaspoon: 4.2 },
  'white sugar': { cup: 200, tbsp: 12.5, tsp: 4.2, tablespoon: 12.5, teaspoon: 4.2 },
  'brown sugar': { cup: 200, tbsp: 12.5, tsp: 4.2, tablespoon: 12.5, teaspoon: 4.2 },
  'butter': { cup: 227, tbsp: 14.2, tsp: 4.7, tablespoon: 14.2, teaspoon: 4.7 },
  'water': { cup: 240, tbsp: 15, tsp: 5, tablespoon: 15, teaspoon: 5 },
  'milk': { cup: 245, tbsp: 15.3, tsp: 5.1, tablespoon: 15.3, teaspoon: 5.1 },
  'oil': { cup: 218, tbsp: 13.6, tsp: 4.5, tablespoon: 13.6, teaspoon: 4.5 },
  'salt': { cup: 292, tbsp: 18, tsp: 6, tablespoon: 18, teaspoon: 6 },
  'yeast': { cup: 128, tbsp: 8, tsp: 2.7, tablespoon: 8, teaspoon: 2.7 },
  'honey': { cup: 340, tbsp: 21.3, tsp: 7.1, tablespoon: 21.3, teaspoon: 7.1 },
};

interface Detection {
  amount: number;
  unit: string;
  ingredient: string;
  text: string;
  startIndex: number;
  endIndex: number;
  grams: number;
}

interface InlineMeasurementConverterProps {
  text: string;
  onReplace: (original: string, replacement: string) => void;
}

export function InlineMeasurementConverter({ text, onReplace }: InlineMeasurementConverterProps) {
  const [detection, setDetection] = useState<Detection | null>(null);
  const [showButton, setShowButton] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state
    setShowButton(false);
    setDetection(null);

    // Detect measurements in text
    const detected = detectMeasurement(text);
    
    if (detected) {
      // Set 5-second delay before showing button
      timeoutRef.current = setTimeout(() => {
        setDetection(detected);
        setShowButton(true);
      }, 5000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text]);

  const detectMeasurement = (text: string): Detection | null => {
    // Pattern: number + unit + ingredient
    // Examples: "2 cups flour", "1/2 cup sugar", "3 tbsp butter", "1.5 teaspoons salt"
    const pattern = /(\d+(?:\/\d+)?(?:\.\d+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?)\s+((?:all-purpose |bread |whole wheat |white |brown )?(?:flour|sugar|butter|water|milk|oil|salt|yeast|honey))/gi;
    
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length === 0) return null;

    // Get the last match (most recent typing)
    const match = matches[matches.length - 1];
    const [fullText, amountStr, unit, ingredient] = match;
    
    // Parse fraction or decimal
    let amount = 0;
    if (amountStr.includes('/')) {
      const [num, denom] = amountStr.split('/').map(Number);
      amount = num / denom;
    } else {
      amount = parseFloat(amountStr);
    }

    // Normalize unit and ingredient
    const normalizedUnit = unit.toLowerCase().replace('tablespoon', 'tbsp').replace('teaspoon', 'tsp');
    const normalizedIngredient = ingredient.toLowerCase().trim();

    // Find conversion
    const conversions = CONVERSIONS[normalizedIngredient];
    if (!conversions) return null;

    const gramsPerUnit = conversions[normalizedUnit];
    if (!gramsPerUnit) return null;

    const grams = Math.round(amount * gramsPerUnit);

    return {
      amount,
      unit: normalizedUnit,
      ingredient: normalizedIngredient,
      text: fullText,
      startIndex: match.index!,
      endIndex: match.index! + fullText.length,
      grams,
    };
  };

  const handleConvert = () => {
    if (!detection) return;

    // Replace with gram measurement
    const replacement = `${detection.grams}g ${detection.ingredient}`;
    onReplace(detection.text, replacement);

    // Hide button
    setShowButton(false);
    setDetection(null);
  };

  if (!showButton || !detection) return null;

  return (
    <div className="fixed top-1/2 right-8 z-50 animate-in fade-in slide-in-from-right-2 duration-300">
      <Button
        onClick={handleConvert}
        size="sm"
        className="bg-warm-orange hover:bg-warm-orange-hover text-white shadow-lg border-2 border-golden-yellow hover:scale-105 transition-all"
      >
        <Zap className="h-4 w-4 mr-2" />
        Convert → {detection.grams}g
      </Button>
      <div className="text-xs text-center text-muted-foreground mt-1">
        Tap to convert
      </div>
    </div>
  );
}
