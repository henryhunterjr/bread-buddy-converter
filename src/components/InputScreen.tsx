import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseRecipe, validateRecipe } from '@/utils/recipeParser';
import { AlertCircle, Upload, FileText, Image, Info, Sparkles, HelpCircle, ChevronDown, ChevronUp, Loader2, CheckCircle2, Archive, Mail, Home, Wheat, ChefHat } from 'lucide-react';
import { HeroHeader } from '@/components/HeroHeader';
import { extractTextFromFile, ExtractedContent } from '@/utils/lazyFileExtractor';
import { useToast } from '@/hooks/use-toast';
import { SavedRecipes } from '@/components/SavedRecipes';
import { SavedRecipe } from '@/utils/recipeStorage';
import { ConvertedRecipe, ParsedRecipe } from '@/types/recipe';
import { MeasurementConverter } from '@/components/MeasurementConverter';
import { InlineMeasurementConverter } from '@/components/InlineMeasurementConverter';
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
import { useAnalytics } from '@/hooks/useAnalytics';

interface InputScreenProps {
  direction: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  onConvert: (recipeText: string, starterHydration: number, aiParsedData?: ParsedRecipe) => void;
  onBack: () => void;
  onLoadSaved: (recipeText: string, savedResult: ConvertedRecipe) => void;
  onHome: () => void;
}

const getPlaceholderText = (direction: string) => 
  direction === 'yeast-to-sourdough' 
    ? 'Paste your yeasted recipe here...' 
    : 'Paste your sourdough recipe here...';

const getConversionTitle = (direction: string) =>
  direction === 'yeast-to-sourdough' 
    ? 'sourdough' 
    : 'yeasted';

const getButtonText = (direction: string) =>
  direction === 'yeast-to-sourdough'
    ? 'Convert to Sourdough'
    : 'Convert to Yeast';

export default function InputScreen({ direction, onConvert, onBack, onLoadSaved, onHome }: InputScreenProps) {
  const { trackEvent } = useAnalytics();
  const [recipeText, setRecipeText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [starterHydration, setStarterHydration] = useState(100);
  const [aiParseAvailable, setAiParseAvailable] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [showAIRetryButton, setShowAIRetryButton] = useState(false);
  const [doughType, setDoughType] = useState<'plain' | 'enriched' | 'whole-grain'>('plain');
  const [multipleRecipes, setMultipleRecipes] = useState<Array<{title: string, text: string}>>([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const { toast } = useToast();
  
  // BUG FIX #2: Validate only on blur, not on every keystroke
  const validateInputOnBlur = (text: string): string[] => {
    const errors: string[] = [];
    
    // Only validate if field has content
    if (!text || text.trim().length === 0) {
      return errors;
    }
    
    // Check for negative amounts (more precise regex)
    // Matches: start of line or whitespace, then minus sign, optional space, then digits
    // Examples: "-500", "- 500", "\n-100" 
    // Won't match: "5-7g" (range), "all-purpose" (no digits), "2024-11-15" (preceded by digit)
    const negativePattern = /(?:^|\s)-\s*\d+/;
    if (negativePattern.test(text)) {
      console.log('[InputScreen] Negative number detected in recipe text');
      errors.push("Recipe amounts can't be negative");
    }
    
    return errors;
  };
  
  const handleTextChange = (text: string) => {
    setRecipeText(text);
    // Clear errors when user is typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };
  
  const handleTextBlur = () => {
    // Validate only when user leaves the field
    console.log('[InputScreen] Text blur triggered, validating:', recipeText.substring(0, 100));
    const validationErrors = validateInputOnBlur(recipeText);
    console.log('[InputScreen] Validation errors:', validationErrors);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Invalid input",
        description: validationErrors[0],
        variant: "destructive"
      });
    }
  };

  const handleInlineReplace = (original: string, replacement: string) => {
    const newText = recipeText.replace(original, replacement);
    setRecipeText(newText);
  };
  
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
    setShowAIRetryButton(false);
    
    // Track file upload
    trackEvent('file_uploaded', {
      file_type: file.type,
      file_size: file.size
    });
    
    try {
      const result: ExtractedContent = await extractTextFromFile(file);
      setRecipeText(result.text);
      setOcrConfidence(result.confidence);
      
      // Store image file for potential AI vision retry
      if (file.type.startsWith('image/')) {
        setUploadedImageFile(file);
      }

      // Check if AI vision fallback is needed
      if (result.requiresAIFallback && file.type.startsWith('image/')) {
        toast({
          title: "⚠️ Low OCR confidence",
          description: `Confidence: ${result.confidence.toFixed(0)}%. Handwritten recipe detected. Using AI vision to improve accuracy...`,
        });
        
        // Automatically trigger AI vision for better results
        await parseImageWithAI(file);
        return;
      }

      toast({
        title: "✓ Recipe extracted",
        description: `From ${file.name}${result.confidence < 100 ? ` (${result.confidence.toFixed(0)}% confidence)` : ''} - Review and edit if needed`,
      });
      
      // Show retry button for images with moderate confidence
      if (file.type.startsWith('image/') && result.confidence < 90) {
        setShowAIRetryButton(true);
      }
      
    } catch (error) {
      setUploadedFileName('');
      setUploadedImageFile(null);
      
      // Check if this is a parsing failure that needs AI vision
      const errorMsg = error instanceof Error ? error.message : "Could not extract text from file";
      
      if (file.type.startsWith('image/') && errorMsg.includes('No text found')) {
        toast({
          title: "OCR failed",
          description: "Trying AI vision to read handwritten text...",
        });
        
        setUploadedImageFile(file);
        await parseImageWithAI(file);
        return;
      }
      
      toast({
        title: "Extraction failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const parseImageWithAI = async (file: File) => {
    setIsAIParsing(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const imageBase64 = await base64Promise;
      
      // Track AI vision usage
      trackEvent('ai_vision_parsing', {
        file_name: file.name,
        ocr_confidence: ocrConfidence
      });
      
      const { data, error } = await supabase.functions.invoke('ai-parse-image', {
        body: { 
          imageBase64,
          fileName: file.name
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'AI vision parsing failed');

      // Check if multiple recipes were detected
      if (data.multipleRecipes && data.multipleRecipes.length > 1) {
        setMultipleRecipes(data.multipleRecipes);
        setShowRecipeSelector(true);
        toast({
          title: "📋 Multiple recipes detected",
          description: `Found ${data.multipleRecipes.length} recipes. Please select which one to convert.`,
        });
        return;
      }

      setRecipeText(data.text);
      setOcrConfidence(100); // AI vision is considered high confidence
      setShowAIRetryButton(false);
      
      toast({
        title: "✓ AI vision successful",
        description: "Recipe extracted using AI - Review and edit if needed",
      });
      
    } catch (error) {
      console.error('AI vision error:', error);
      toast({
        title: "AI vision failed",
        description: error instanceof Error ? error.message : "Could not process image with AI",
        variant: "destructive",
      });
      
      // Keep the retry button visible
      setShowAIRetryButton(true);
    } finally {
      setIsAIParsing(false);
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
      // Track AI parsing failure
      trackEvent('ai_parsing_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
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
      // Check for essential ingredients upfront
      const hasFlour = /\d+\s*(g|grams?|oz|ounces?|cups?|lbs?|pounds?).*?(flour|bread|wheat|rye|spelt)/i.test(recipeText);
      const hasWater = /\d+\s*(g|grams?|oz|ounces?|cups?|ml|milliliters?).*?(water|liquid|milk)/i.test(recipeText);
      const hasLeavening = /\d+\s*(g|grams?|oz|ounces?|tsp|teaspoons?|tbsp|tablespoons?).*?(yeast|starter|levain|sourdough)/i.test(recipeText);
      
      if (!hasFlour || !hasWater || !hasLeavening) {
        // If user uploaded an image and parsing failed, try AI vision
        if (uploadedImageFile) {
          toast({
            title: "Having trouble parsing",
            description: "Using AI vision to interpret recipe... (5-10 seconds)",
          });
          await parseImageWithAI(uploadedImageFile);
          return;
        }
        
        setErrors(['🤔 Need flour, water, and yeast/starter amounts to convert. Add those and try again!']);
        return;
      }
      
      const [regexResult, aiResult] = await Promise.all([
        Promise.resolve(parseRecipe(recipeText, starterHydration)),
        parseWithAI()
      ]);

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
        // If parsing failed and user uploaded an image, try AI vision
        if (uploadedImageFile && validated.totalFlour === 0) {
          toast({
            title: "Parser found < 3 ingredients",
            description: "Using AI vision to interpret recipe... (5-10 seconds)",
          });
          await parseImageWithAI(uploadedImageFile);
          return;
        }
        
        setErrors(validationErrors);
        setAiParseAvailable(true);
        return;
      }

      setErrors([]);
      onConvert(recipeText, starterHydration, validated);
      
    } catch (error) {
      console.error('Parsing error:', error);
      
      // If parsing error occurred and user uploaded an image, try AI vision
      if (uploadedImageFile) {
        toast({
          title: "Having trouble parsing",
          description: "Using AI vision to interpret recipe... (5-10 seconds)",
        });
        await parseImageWithAI(uploadedImageFile);
        return;
      }
      
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

  const handleNavigation = (route: 'home' | 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    if (route === 'home') {
      onHome();
    } else {
      onBack();
    }
  };

  const pageTitle = direction === 'sourdough-to-yeast' 
    ? 'Convert Your Sourdough Recipe'
    : 'Convert Your Yeast Recipe';
  
  const pageSubtitle = direction === 'sourdough-to-yeast'
    ? "We'll turn your sourdough recipe into a perfectly leavened yeast loaf"
    : "We'll transform your commercial yeast recipe into artisan sourdough";

  const handleRecipeSelection = (selectedRecipe: {title: string, text: string}) => {
    setRecipeText(selectedRecipe.text);
    setShowRecipeSelector(false);
    setMultipleRecipes([]);
    setOcrConfidence(100);
    setShowAIRetryButton(false);
    
    toast({
      title: "✓ Recipe selected",
      description: `Loaded: ${selectedRecipe.title}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex flex-col">
      {/* Multiple Recipe Selector Modal */}
      {showRecipeSelector && multipleRecipes.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold mb-4">Multiple Recipes Detected</h3>
            <p className="text-muted-foreground mb-6">
              We found {multipleRecipes.length} recipes on this card. Which one would you like to convert?
            </p>
            
            <div className="space-y-3">
              {multipleRecipes.map((recipe, index) => (
                <button
                  key={index}
                  onClick={() => handleRecipeSelection(recipe)}
                  className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium mb-2">{recipe.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {recipe.text.substring(0, 150)}...
                  </div>
                </button>
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setShowRecipeSelector(false);
                setMultipleRecipes([]);
              }}
              className="mt-4 w-full"
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}

      {/* Hero Header */}
      <HeroHeader 
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        showNav={true}
        onNavigate={handleNavigation}
      />
      
      {/* Progress Indicator */}
      <div className="w-full bg-bread-cream/50 border-b border-bread-medium/30 py-4">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-bread-earth">Step 1 of 3</span>
            <span className="text-xs text-muted-foreground">Enter Recipe</span>
          </div>
          <div className="w-full h-2 bg-bread-medium/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-burnt-orange to-warm-orange rounded-full transition-all duration-500"
              style={{ width: '33%' }}
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-[800px] mx-auto space-y-6">

          {/* Main Input Card - Warm Beige Design */}
          <Card className="bg-bread-light/90 backdrop-blur border-bread-medium/40 shadow-xl rounded-lg p-8 space-y-8">
            {/* Card Header */}
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <ChefHat className="h-6 w-6 text-burnt-orange" />
                <h2 className="font-serif text-3xl font-bold text-bread-earth">
                  Enter Your Recipe
                </h2>
              </div>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                Paste your recipe text, or upload a PDF or image. We'll extract the ingredients and convert it for you.
              </p>
            </div>

            {/* Dough Type Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-base font-semibold text-bread-earth flex items-center gap-2">
                  <Wheat className="h-5 w-5 text-burnt-orange" />
                  Dough Type
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-background z-50">
                      <p className="text-sm">
                        <strong>Straight:</strong> Basic bread.<br/>
                        <strong>Enriched:</strong> Has butter/eggs/sugar.<br/>
                        <strong>Whole-grain:</strong> 50%+ whole wheat/rye.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Select 
                value={doughType} 
                onValueChange={(value: any) => setDoughType(value)}
              >
                <SelectTrigger className="w-full bg-background text-foreground font-medium border-bread-medium h-14 text-base rounded-lg shadow-sm hover:border-burnt-orange transition-colors">
                  <SelectValue placeholder="Select dough type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 border-bread-medium">
                  <SelectItem value="plain" className="font-medium text-base">
                    <div className="flex items-center gap-2">
                      🍞 Straight Dough - Basic bread
                    </div>
                  </SelectItem>
                  <SelectItem value="enriched" className="font-medium text-base">
                    <div className="flex items-center gap-2">
                      🥐 Enriched Dough - Butter, eggs, or sugar
                    </div>
                  </SelectItem>
                  <SelectItem value="whole-grain" className="font-medium text-base">
                    <div className="flex items-center gap-2">
                      🌾 Whole-Grain - 50%+ whole wheat/rye
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Area */}
            <div className="space-y-3">
              <label htmlFor="recipe-input" className="text-base font-semibold text-bread-earth flex items-center gap-2">
                <FileText className="h-5 w-5 text-burnt-orange" />
                Recipe Text
              </label>
              <Textarea
                id="recipe-input"
                placeholder={`${getPlaceholderText(direction)}\n\nExample:\n500g bread flour\n325g water\n10g salt\n7g instant yeast\n5g sugar`}
                value={recipeText}
                onChange={(e) => handleTextChange(e.target.value)}
                onBlur={handleTextBlur}
                className="min-h-[300px] bg-background border-bread-medium text-base resize-none rounded-lg shadow-sm hover:border-burnt-orange transition-colors focus-visible:ring-burnt-orange"
              />
            </div>

            {uploadedFileName && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-green-800 font-medium truncate">Uploaded: {uploadedFileName}</span>
              </div>
            )}

            {/* Upload Section */}
            <div className="space-y-3">
              <label className="text-base font-semibold text-bread-earth flex items-center gap-2">
                <Upload className="h-5 w-5 text-burnt-orange" />
                Or Upload a File
              </label>
              
              {/* Visual Drag-and-Drop Zone */}
              <div className="border-2 border-dashed border-bread-medium rounded-lg p-8 bg-background/50 hover:bg-background hover:border-burnt-orange transition-all">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-burnt-orange/10">
                    <Upload className="h-8 w-8 text-burnt-orange" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-bread-earth">
                      Drop your file here, or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, JPG, PNG, WEBP • Max 20MB
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 text-base font-medium border-bread-medium hover:bg-bread-light hover:border-burnt-orange"
                      disabled={isProcessing}
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Choose PDF
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
                      variant="outline"
                      className="h-12 text-base font-medium border-bread-medium hover:bg-bread-light hover:border-burnt-orange"
                      disabled={isProcessing}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Image className="mr-2 h-5 w-5" />
                      Choose Image
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Vision Retry Button */}
            {showAIRetryButton && uploadedImageFile && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-burnt-orange bg-burnt-orange/10 hover:bg-burnt-orange hover:text-white"
                  disabled={isAIParsing}
                  onClick={() => parseImageWithAI(uploadedImageFile)}
                >
                  {isAIParsing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing with AI Vision...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Try AI Parse (for handwritten recipes)
                    </>
                  )}
                </Button>
                {ocrConfidence && (
                  <p className="text-sm text-muted-foreground text-center">
                    Current OCR confidence: {ocrConfidence.toFixed(0)}% - AI vision may provide better results
                  </p>
                )}
              </div>
            )}

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
              <div className="p-6 bg-background rounded-lg border border-bread-medium space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-bread-earth">Starter Hydration</h3>
                    <p className="text-sm text-muted-foreground">Most starters are 100% hydration</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-background z-50">
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
                  <SelectTrigger className="w-full bg-background h-12 border-bread-medium">
                    <SelectValue placeholder="100% (default)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 border-bread-medium">
                    <SelectItem value="50">50% (stiff starter)</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="100">100% (equal parts - default)</SelectItem>
                    <SelectItem value="125">125% (liquid starter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Convert Button - Primary CTA */}
            <div className="pt-4">
              <Button 
                onClick={handleConvert}
                size="lg"
                className="w-full sm:w-4/5 mx-auto block min-h-[48px] h-14 text-lg font-bold bg-burnt-orange hover:bg-burnt-orange/90 text-white shadow-lg rounded-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                disabled={!recipeText.trim() || isProcessing || isAIParsing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Converting Recipe...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Next: Review Ingredients
                  </>
                )}
              </Button>
            </div>
            
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
      
      {/* Floating Help Button - Bottom Right */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-card border-2 border-warm-orange z-50"
        onClick={() => setShowHelp(!showHelp)}
      >
        <HelpCircle className="h-5 w-5 text-warm-orange" />
      </Button>

      {/* Floating Measurement Converter */}
      <MeasurementConverter />

      {/* Inline Smart Converter */}
      <InlineMeasurementConverter text={recipeText} onReplace={handleInlineReplace} />

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        Copyright 2025 Henry Hunter Baking Great Bread at Home. All Rights Reserved
      </footer>
    </div>
  );
}
