import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseRecipe, validateRecipe } from '@/utils/recipeParser';
import { AlertCircle } from 'lucide-react';
import logo from '@/assets/logo.png';

interface InputScreenProps {
  direction: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  onConvert: (recipeText: string) => void;
  onBack: () => void;
}

const EXAMPLE_TEXT = `Example format:
500g bread flour
350g water
100g active starter (or 3g instant yeast)
10g salt

Method:
Mix flour and water, rest 30 min...`;

export default function InputScreen({ direction, onConvert, onBack }: InputScreenProps) {
  const [recipeText, setRecipeText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleConvert = () => {
    try {
      const parsed = parseRecipe(recipeText);
      const validationErrors = validateRecipe(parsed);
      
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors([]);
      onConvert(recipeText);
    } catch (error) {
      setErrors(['Could not parse recipe. Please check the format and try again.']);
    }
  };

  const directionText = direction === 'sourdough-to-yeast' 
    ? 'Sourdough → Yeast' 
    : 'Yeast → Sourdough';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <img src={logo} alt="Baking Great Bread at Home" className="h-16 md:h-20" />
      </div>
      
      <div className="flex-1 p-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              ← Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              Convert: {directionText}
            </h1>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Paste your recipe below
              </label>
              <Textarea
                placeholder={EXAMPLE_TEXT}
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Include ingredient amounts (grams preferred) and your method. Don't worry about perfect formatting—I'll figure it out.
              </p>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleConvert} 
              className="w-full"
              disabled={!recipeText.trim()}
            >
              Convert Recipe
            </Button>
          </Card>
        </div>
      </div>
      
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
