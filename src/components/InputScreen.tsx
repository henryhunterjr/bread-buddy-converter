import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseRecipe, validateRecipe } from '@/utils/recipeParser';
import { AlertCircle, Upload, FileText, Image, Info, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';
import { extractTextFromFile } from '@/utils/fileExtractor';
import { useToast } from '@/hooks/use-toast';
import { SavedRecipes } from '@/components/SavedRecipes';
import { SavedRecipe } from '@/utils/recipeStorage';
import { ConvertedRecipe, ParsedRecipe } from '@/types/recipe';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface InputScreenProps {
  direction: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  onConvert: (recipeText: string, starterHydration: number, aiParsedData?: ParsedRecipe) => void;
  onBack: () => void;
  onLoadSaved: (recipeText: string, savedResult: ConvertedRecipe) => void;
}

const EXAMPLE_TEXT = `Example format:
500g bread flour
350g water
100g active starter (or 3g instant yeast)
10g salt

Method:
Mix flour and water, rest 30 min...`;

export default function InputScreen({ direction, onConvert, onBack, onLoadSaved }: InputScreenProps) {
  const [recipeText, setRecipeText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [starterHydration, setStarterHydration] = useState(100);
  const [aiParseAvailable, setAiParseAvailable] = useState(false);
  const { toast } = useToast();
  
  // Detect if recipe contains starter/levain
  const hasStarter = /starter|levain|sourdough starter/i.test(recipeText);

  const handleLoadRecipe = (recipe: SavedRecipe) => {
    onLoadSaved(recipe.originalText, recipe.convertedRecipe);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 20MB",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    
    try {
      const extractedText = await extractTextFromFile(file);
      setRecipeText(extractedText);
      toast({
        title: "Recipe extracted",
        description: "Review the text below and edit if needed before converting",
      });
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Could not extract text from file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const parseWithAI = async (): Promise<ParsedRecipe | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-parse-recipe', {
        body: { 
          recipeText, 
          starterHydration 
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'AI parsing failed');

      return data.recipe;
    } catch (error) {
      console.error('AI parse error:', error);
      return null;
    }
  };

  const validateAndCombine = async (
    regexResult: ParsedRecipe, 
    aiResult: ParsedRecipe
  ): Promise<ParsedRecipe> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-validate-recipe', {
        body: {
          regexParsed: regexResult,
          aiParsed: aiResult,
          recipeText,
          starterHydration
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error('Validation failed');

      console.log('✓ Validation complete:', {
        confidence: data.validatedRecipe.confidence,
        parserUsed: data.validatedRecipe.parserUsed,
        improvements: data.improvements
      });

      if (data.improvements?.length > 0) {
        toast({
          title: "Recipe validated",
          description: data.improvements[0],
          duration: 3000,
        });
      }

      return data.validatedRecipe;
    } catch (error) {
      console.error('Validation error:', error);
      // Fallback: prefer AI if regex failed to find flour
      if (regexResult.totalFlour === 0 && aiResult.totalFlour > 0) {
        return { ...aiResult, parserUsed: 'ai', confidence: 70 };
      }
      return { ...regexResult, parserUsed: 'regex', confidence: 60 };
    }
  };

  const handleConvert = async () => {
    setIsProcessing(true);
    setAiParseAvailable(false);
    
    try {
      console.log('=== DUAL PARSER MODE ===');
      
      // ALWAYS run both parsers in parallel
      const [regexResult, aiResult] = await Promise.all([
        Promise.resolve(parseRecipe(recipeText, starterHydration)),
        parseWithAI()
      ]);

      console.log('Regex result:', {
        flour: regexResult.totalFlour,
        hydration: regexResult.hydration,
        ingredients: regexResult.ingredients.length
      });
      console.log('AI result:', {
        flour: aiResult?.totalFlour,
        hydration: aiResult?.hydration,
        ingredients: aiResult?.ingredients.length
      });

      // If AI parsing failed, fall back to regex only
      if (!aiResult) {
        toast({
          title: "Using regex parser",
          description: "AI validation unavailable",
          variant: "default"
        });
        
        const validationErrors = validateRecipe(regexResult);
        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          return;
        }
        
        onConvert(recipeText, starterHydration, {
          ...regexResult,
          parserUsed: 'regex',
          confidence: 70
        });
        return;
      }

      // Both parsers succeeded - validate and combine
      toast({
        title: "Validating recipe...",
        description: "Comparing regex and AI results",
        duration: 2000,
      });

      const validated = await validateAndCombine(regexResult, aiResult);
      
      const validationErrors = validateRecipe(validated);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setAiParseAvailable(true);
        return;
      }

      setErrors([]);
      onConvert(recipeText, starterHydration, validated);
      
    } catch (error) {
      console.error('Parsing error:', error);
      setErrors(['Could not parse recipe. Please check the format.']);
      setAiParseAvailable(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAIParse = async () => {
    setIsAIParsing(true);
    const aiParsed = await parseWithAI();
    setIsAIParsing(false);
    
    if (aiParsed) {
      const aiValidationErrors = validateRecipe(aiParsed);
      if (aiValidationErrors.length === 0) {
        setErrors([]);
        onConvert(recipeText, starterHydration, {
          ...aiParsed,
          parserUsed: 'ai',
          confidence: 80
        });
      } else {
        setErrors(aiValidationErrors);
      }
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
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={onBack}>
              ← Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              Convert: {directionText}
            </h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column: Recipe Input */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Upload Recipe
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-auto py-4"
                      disabled={isProcessing}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      <span className="text-base">{isProcessing ? 'Processing...' : 'Choose File to Upload'}</span>
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>PDF Documents</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <Image className="h-4 w-4" />
                        <span>Images (JPG, PNG, WEBP)</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">Maximum file size: 20MB</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

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

                  {hasStarter && (
                    <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-foreground">
                          Starter Hydration (optional)
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                We assume your starter is 100% hydration (equal parts flour and water) by default. 
                                If your starter uses a different ratio, select it here for accurate calculations.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select 
                        value={starterHydration.toString()} 
                        onValueChange={(value) => setStarterHydration(Number(value))}
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="100% (default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50% (stiff starter)</SelectItem>
                          <SelectItem value="75">75%</SelectItem>
                          <SelectItem value="100">100% (equal parts - default)</SelectItem>
                          <SelectItem value="125">125% (liquid starter)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Most sourdough starters are maintained at 100% hydration.
                      </p>
                    </div>
                  )}

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

                  <div className="space-y-2">
                    <Button 
                      onClick={handleConvert} 
                      className="w-full"
                      disabled={!recipeText.trim() || isProcessing || isAIParsing}
                    >
                      {isProcessing ? 'Processing...' : 'Convert Recipe'}
                    </Button>
                    
                    {aiParseAvailable && (
                      <Button 
                        onClick={handleManualAIParse}
                        variant="outline"
                        className="w-full"
                        disabled={!recipeText.trim() || isAIParsing}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isAIParsing ? 'Parsing with AI...' : 'Try AI Parser'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column: Saved Recipes */}
            <div className="lg:col-span-1">
              <SavedRecipes onLoadRecipe={handleLoadRecipe} />
            </div>
          </div>
        </div>
      </div>
      
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
