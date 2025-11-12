import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseRecipe, validateRecipe } from '@/utils/recipeParser';
import { AlertCircle, Upload, FileText, Image, Info, Sparkles, HelpCircle, ChevronDown, ChevronUp, Loader2, CheckCircle2, Archive, Mail, Home, Wheat } from 'lucide-react';
import bgbLogo from '@/assets/bgb-logo.jpg';
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
  onHome: () => void;
}

const PLACEHOLDER_TEXT = `Paste your yeasted recipe here...`;

export default function InputScreen({ direction, onConvert, onBack, onLoadSaved, onHome }: InputScreenProps) {
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

      return data.validatedRecipe;
    } catch (error) {
      console.error('Validation error:', error);
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
      {/* Premium Header with Breadcrumb */}
      <header className="w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={bgbLogo} alt="Baking Great Bread" className="h-12 w-12 rounded-full object-cover" />
            <div className="flex items-center gap-2 text-sm text-breadcrumb-text">
              <button onClick={onHome} className="hover:text-foreground transition-colors">Home</button>
              <span>/</span>
              <span className="text-foreground font-medium">Convert {directionText}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Wheat className="h-4 w-4 text-warm-orange" />
              <span>Powered by BakingGreatBread.com</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Help
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Page Title */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground">
              Convert {directionText}
            </h1>
            <p className="text-lg text-muted-foreground">
              We'll expertly transform your recipe into a perfect {direction === 'yeast-to-sourdough' ? 'sourdough' : 'yeasted'} version.
            </p>
          </div>

          {/* Main Input Card - Premium Design */}
          <Card className="border-2 border-card-border shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Card Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-warm-orange" />
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  Paste or Upload a Recipe
                </h2>
              </div>
              <p className="text-muted-foreground">
                Simply paste, type, or upload – we'll handle the rest.
              </p>
            </div>

            {/* Textarea Label */}
            <div className="space-y-2">
              <label htmlFor="recipe-input" className="text-sm font-medium text-foreground">
                Textarea
              </label>
              <Textarea
                id="recipe-input"
                placeholder={PLACEHOLDER_TEXT}
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                className="min-h-[200px] bg-muted/30 border-input text-sm resize-none"
              />
            </div>

            {uploadedFileName && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-muted-foreground truncate">Uploaded: {uploadedFileName}</span>
              </div>
            )}

            {/* Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                className="bg-warm-orange hover:bg-warm-orange-hover text-white h-12 text-base font-medium shadow-md transition-all hover:shadow-lg"
                disabled={isProcessing}
                onClick={() => document.getElementById('pdf-upload')?.click()}
              >
                <FileText className="mr-2 h-5 w-5" />
                Upload PDF
              </Button>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                type="button"
                className="bg-warm-orange hover:bg-warm-orange-hover text-white h-12 text-base font-medium shadow-md transition-all hover:shadow-lg"
                disabled={isProcessing}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Image className="mr-2 h-5 w-5" />
                Upload Image
              </Button>
              <input
                id="image-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* File Info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Max 20MB • Accepts: PDF, JPG, WEBP</span>
              <button className="flex items-center gap-1 text-burnt-orange hover:underline">
                <HelpCircle className="h-3 w-3" />
                See example
              </button>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Starter Hydration (Conditional) */}
            {hasStarter && (
              <div className="p-4 bg-accent/50 rounded-lg border border-accent space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Starter Hydration</h3>
                    <p className="text-sm text-muted-foreground">Most starters are 100% hydration</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          We assume 100% hydration by default. If your starter uses a different ratio, select it here.
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
              </div>
            )}

            {/* Convert Button - Premium Gradient */}
            <Button 
              onClick={handleConvert}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-burnt-orange to-golden-yellow hover:from-burnt-orange/90 hover:to-golden-yellow/90 text-white shadow-lg transition-all hover:shadow-xl"
              disabled={!recipeText.trim() || isProcessing || isAIParsing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Convert to Sourdough
                  <Wheat className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            
            {aiParseAvailable && (
              <Button 
                onClick={handleManualAIParse}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={!recipeText.trim() || isAIParsing}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isAIParsing ? 'Running advanced parser...' : 'Try Advanced Parser'}
              </Button>
            )}
          </Card>

          {/* Help Section */}
          <Card className="border border-primary/20 bg-primary/5">
            <Collapsible open={showHelp} onOpenChange={setShowHelp}>
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2 text-base font-medium text-foreground">
                  <HelpCircle className="h-5 w-5" />
                  <span>How does this work?</span>
                </div>
                {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">✓ What we need:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Ingredient amounts (grams work best)</li>
                    <li>Your method/instructions</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">✓ Example format:</p>
                  <pre className="bg-background/50 p-3 rounded text-xs overflow-x-auto">
500g bread flour
350g water  
10g salt
3g instant yeast

Method:
Mix flour and water, rest 30 min...
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Saved Recipes */}
          {showSavedRecipes && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Saved Recipes</h3>
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
      </main>
      
      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        Copyright 2025 Henry Hunter Baking Great Bread at Home. All Rights Reserved
      </footer>
    </div>
  );
}
