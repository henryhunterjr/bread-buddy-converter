import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseRecipe, validateRecipe } from '@/utils/recipeParser';
import { AlertCircle, Upload, FileText, Image, Info, Sparkles, HelpCircle, ChevronDown, ChevronUp, Loader2, CheckCircle2, Archive, Mail } from 'lucide-react';
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
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface InputScreenProps {
  direction: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  onConvert: (recipeText: string, starterHydration: number, aiParsedData?: ParsedRecipe) => void;
  onBack: () => void;
  onLoadSaved: (recipeText: string, savedResult: ConvertedRecipe) => void;
}

const PLACEHOLDER_TEXT = `Paste your recipe here...

Example:
500g flour, 350g water, 10g salt, 3g yeast

Method: Mix, rest 30 min, fold, shape, proof, bake`;

export default function InputScreen({ direction, onConvert, onBack, onLoadSaved }: InputScreenProps) {
  const [recipeText, setRecipeText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [starterHydration, setStarterHydration] = useState(100);
  const [aiParseAvailable, setAiParseAvailable] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
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
    setUploadedFileName(file.name);
    
    try {
      const extractedText = await extractTextFromFile(file);
      setRecipeText(extractedText);
      toast({
        title: "✓ Recipe extracted",
        description: `From ${file.name} - Review and edit if needed`,
      });
    } catch (error) {
      setUploadedFileName('');
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
          title: "Using standard parser",
          description: "Advanced validation unavailable",
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
        description: "Running validation checks",
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
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Baking Great Bread" className="h-12 sm:h-14 md:h-16" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none text-xs px-2 py-0.5 cursor-help">
                  BETA
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>We're testing! Found a bug? Let us know.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              asChild
              className="hidden sm:flex items-center gap-2"
            >
              <a href="mailto:henrysbreadkitchen@gmail.com?subject=Bread%20Buddy%20Beta%20Feedback">
                <Mail className="h-4 w-4" />
                <span className="hidden md:inline">Report Issue</span>
              </a>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSavedRecipes(!showSavedRecipes)}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Saved</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-6 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          
          {/* Back Button and Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="outline" onClick={onBack} size="sm" className="shrink-0">
              ← Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Convert: {directionText}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Paste any bread recipe below. We handle all the math automatically.
              </p>
            </div>
          </div>

          {/* Help Section */}
          <Card className="border-primary/20 bg-primary/5">
            <Collapsible open={showHelp} onOpenChange={setShowHelp}>
              <CollapsibleTrigger className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-foreground">
                  <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>How does this work?</span>
                </div>
                {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 text-xs sm:text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">✓ What we need:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Ingredient amounts (grams work best)</li>
                    <li>Your method/instructions</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">✓ Example format:</p>
                  <pre className="bg-background/50 p-2 sm:p-3 rounded text-xs overflow-x-auto">
500g bread flour
350g water  
10g salt
3g instant yeast

Method:
Mix flour and water, rest 30 min...
                  </pre>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">✓ What you'll get:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Converted ingredient list with baker's percentages</li>
                    <li>Updated method with new timing</li>
                    <li>Downloadable PDF recipe</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Step 1: Paste Recipe */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-base shrink-0">
                1
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Paste Your Recipe</h2>
            </div>
            
            <Textarea
              placeholder={PLACEHOLDER_TEXT}
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              className="min-h-[200px] sm:min-h-[280px] font-mono text-xs sm:text-sm resize-none"
            />

            {uploadedFileName && (
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-md text-xs sm:text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-muted-foreground truncate">Uploaded: {uploadedFileName}</span>
              </div>
            )}

            {/* Upload Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or Upload File</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-auto py-3 sm:py-4"
              disabled={isProcessing}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span className="text-sm sm:text-base">Extracting recipe...</span>
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  <span className="text-sm sm:text-base">Choose PDF or Image</span>
                </>
              )}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="text-xs text-center text-muted-foreground">
              Max 20MB • Accepts: PDF, JPG, PNG, WEBP
            </p>
          </Card>

          {/* Step 2: Starter Hydration (Conditional) */}
          {hasStarter && (
            <Card className="p-4 sm:p-6 space-y-4 border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-base shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Starter Hydration</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Most starters are 100% hydration (equal parts flour/water)</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        We assume 100% hydration by default. If your starter uses a different ratio, select it here for accurate calculations.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Select 
                value={starterHydration.toString()} 
                onValueChange={(value) => setStarterHydration(Number(value))}
              >
                <SelectTrigger className="w-full bg-background h-11 sm:h-12 text-sm sm:text-base">
                  <SelectValue placeholder="100% (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50% (stiff starter)</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100% (equal parts - default)</SelectItem>
                  <SelectItem value="125">125% (liquid starter)</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Step 3: Convert */}
          <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4 border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-base shrink-0">
                {hasStarter ? '3' : '2'}
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Convert Recipe</h2>
            </div>

            {/* Sticky convert button on mobile */}
            <div className="space-y-2">
              <Button 
                onClick={handleConvert} 
                size="lg"
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold sticky bottom-4 z-10 shadow-lg"
                disabled={!recipeText.trim() || isProcessing || isAIParsing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  '⚡ Convert Recipe'
                )}
              </Button>
              
              {aiParseAvailable && (
                <Button 
                  onClick={handleManualAIParse}
                  variant="outline"
                  size="lg"
                  className="w-full h-11 sm:h-12"
                  disabled={!recipeText.trim() || isAIParsing}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isAIParsing ? 'Running advanced parser...' : 'Try Advanced Parser'}
                </Button>
              )}
            </div>
          </Card>

          {/* Saved Recipes (Mobile/Tablet Drawer) */}
          {showSavedRecipes && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Saved Recipes</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSavedRecipes(false)}
                >
                  Close
                </Button>
              </div>
              <SavedRecipes onLoadRecipe={handleLoadRecipe} />
            </Card>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="text-center py-3 sm:py-4 text-[10px] sm:text-xs text-muted-foreground border-t border-border">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
