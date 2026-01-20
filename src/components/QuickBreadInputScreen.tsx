import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Upload,
  FileText,
  Image,
  Info,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Home,
  CookingPot,
} from 'lucide-react';
import { HeroHeader } from '@/components/HeroHeader';
import { extractTextFromFile, ExtractedContent } from '@/utils/lazyFileExtractor';
import { useToast } from '@/hooks/use-toast';
import { detectQuickBread } from '@/utils/quickBreadDetector';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAnalytics } from '@/hooks/useAnalytics';

interface QuickBreadInputScreenProps {
  onConvert: (recipeText: string) => void;
  onBack: () => void;
  onHome: () => void;
}

export default function QuickBreadInputScreen({
  onConvert,
  onBack,
  onHome,
}: QuickBreadInputScreenProps) {
  const { trackEvent } = useAnalytics();
  const [recipeText, setRecipeText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [detectionPreview, setDetectionPreview] = useState<{
    isQuickBread: boolean;
    reason: string;
    confidence: number;
  } | null>(null);
  const { toast } = useToast();

  const handleTextChange = (text: string) => {
    if (recipeText.length === 0 && text.length > 0) {
      trackEvent('funnel_input_started', { input_method: 'text', conversion_type: 'quick-bread' });
    }

    setRecipeText(text);
    if (errors.length > 0) {
      setErrors([]);
    }

    // Live detection preview
    if (text.length > 50) {
      const detection = detectQuickBread(text);
      setDetectionPreview({
        isQuickBread: detection.isQuickBread,
        reason: detection.detectionReason,
        confidence: detection.confidenceScore,
      });
    } else {
      setDetectionPreview(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (JPG, PNG, WEBP)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 20MB',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setUploadedFileName(file.name);

    trackEvent('funnel_input_started', { input_method: 'file', conversion_type: 'quick-bread' });
    trackEvent('file_uploaded', {
      file_type: file.type,
      file_size: file.size,
    });

    try {
      const result: ExtractedContent = await extractTextFromFile(file);
      setRecipeText(result.text);

      // Run detection on extracted text
      const detection = detectQuickBread(result.text);
      setDetectionPreview({
        isQuickBread: detection.isQuickBread,
        reason: detection.detectionReason,
        confidence: detection.confidenceScore,
      });

      toast({
        title: 'Recipe extracted',
        description: `From ${file.name}${result.confidence < 100 ? ` (${result.confidence.toFixed(0)}% confidence)` : ''} - Review and edit if needed`,
      });
    } catch (error) {
      setUploadedFileName('');
      const errorMsg = error instanceof Error ? error.message : 'Could not extract text from file';
      toast({
        title: 'Extraction failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleConvert = async () => {
    if (!recipeText.trim()) {
      setErrors(['Please enter a recipe to convert.']);
      return;
    }

    // Run detection
    const detection = detectQuickBread(recipeText);

    // Check for existing sourdough
    if (detection.hasExistingSourdough) {
      toast({
        title: 'Already has sourdough',
        description: 'This recipe already includes sourdough starter or discard.',
      });
    }

    // Check if not a baked good
    if (detection.isNotBakedGood) {
      setErrors(["This recipe doesn't appear to be a quick bread. Please check your recipe."]);
      return;
    }

    // Check for yeast (probably a yeast bread)
    if (detection.hasYeast) {
      setErrors([
        'This recipe appears to contain yeast. For yeast bread conversion, please use the main converter.',
        `Detected: ${detection.yeastIndicators.join(', ')}`,
      ]);
      return;
    }

    // Check for missing flour
    if (!detection.hasFlour) {
      setErrors(["I couldn't find any flour in this recipe. Please make sure the recipe includes flour amounts."]);
      return;
    }

    // Check for chemical leavener
    if (!detection.hasChemicalLeavener) {
      toast({
        title: 'No chemical leavener detected',
        description: 'This recipe may not have baking soda/powder, but we\'ll convert it anyway.',
      });
    }

    setIsProcessing(true);
    trackEvent('funnel_parsing_started', { conversion_direction: 'quick-bread-discard' });

    try {
      await onConvert(recipeText);
    } catch (error) {
      console.error('Conversion error:', error);
      setErrors(['Could not convert recipe. Please check the format.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigation = (route: 'home' | 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    if (route === 'home') {
      onHome();
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex flex-col">
      {/* Hero Header */}
      <HeroHeader
        pageTitle="Add Sourdough Discard to Quick Bread"
        pageSubtitle="Convert your quick bread recipe to use sourdough discard for extra flavor"
        showNav={true}
        onNavigate={handleNavigation}
      />

      {/* Progress Indicator */}
      <div className="w-full bg-bread-cream/50 border-b border-bread-medium/30 py-4">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-bread-earth">Step 1 of 2</span>
            <span className="text-xs text-muted-foreground">Enter Recipe</span>
          </div>
          <div className="w-full h-2 bg-bread-medium/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-burnt-orange to-warm-orange rounded-full transition-all duration-500"
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-[800px] mx-auto space-y-6">
          {/* Main Input Card */}
          <Card className="bg-bread-light/90 backdrop-blur border-bread-medium/40 shadow-xl rounded-lg p-8 space-y-8">
            {/* Card Header */}
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CookingPot className="h-6 w-6 text-burnt-orange" />
                <h2 className="font-serif text-3xl font-bold text-bread-earth">
                  Enter Your Quick Bread Recipe
                </h2>
              </div>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                Paste your banana bread, muffin, scone, or other quick bread recipe. We'll
                automatically add sourdough discard and adjust the flour and liquid amounts.
              </p>
            </div>

            {/* Text Area */}
            <div className="space-y-3">
              <label
                htmlFor="recipe-input"
                className="text-base font-semibold text-bread-earth flex items-center gap-2"
              >
                <FileText className="h-5 w-5 text-burnt-orange" />
                Recipe Text
              </label>
              <Textarea
                id="recipe-input"
                placeholder={`Paste your quick bread recipe here...\n\nExample:\nBanana Bread\n\n2 cups all-purpose flour\n1 cup sugar\n1/2 cup butter, softened\n2 eggs\n4 ripe bananas, mashed\n1/4 cup sour cream\n1 tsp baking soda\n1/2 tsp salt\n1 tsp vanilla`}
                value={recipeText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="min-h-[300px] bg-background border-bread-medium text-base resize-none rounded-lg shadow-sm hover:border-burnt-orange transition-colors focus-visible:ring-burnt-orange"
              />
            </div>

            {/* Detection Preview */}
            {detectionPreview && (
              <Alert
                variant={detectionPreview.isQuickBread ? 'default' : 'destructive'}
                className={
                  detectionPreview.isQuickBread
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }
              >
                {detectionPreview.isQuickBread ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Info className="h-4 w-4 text-amber-600" />
                )}
                <AlertDescription
                  className={detectionPreview.isQuickBread ? 'text-green-800' : 'text-amber-800'}
                >
                  {detectionPreview.isQuickBread ? (
                    <>
                      <strong>Quick bread detected!</strong> Confidence:{' '}
                      {detectionPreview.confidence}%
                    </>
                  ) : (
                    detectionPreview.reason
                  )}
                </AlertDescription>
              </Alert>
            )}

            {uploadedFileName && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-green-800 font-medium truncate">
                  Uploaded: {uploadedFileName}
                </span>
              </div>
            )}

            {/* Upload Section */}
            <div className="space-y-3">
              <label className="text-base font-semibold text-bread-earth flex items-center gap-2">
                <Upload className="h-5 w-5 text-burnt-orange" />
                Or Upload a File
              </label>

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
                      Supports PDF, JPG, PNG, WEBP
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

            {/* Convert Button */}
            <div className="pt-4">
              <Button
                onClick={handleConvert}
                size="lg"
                className="w-full sm:w-4/5 mx-auto block min-h-[48px] h-14 text-lg font-bold bg-burnt-orange hover:bg-burnt-orange/90 text-white shadow-lg rounded-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                disabled={!recipeText.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Converting Recipe...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Add Sourdough Discard
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Help Section */}
          <Card className="border border-primary/20 bg-primary/5">
            <Collapsible open={showHelp} onOpenChange={setShowHelp}>
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2 text-base font-medium text-foreground">
                  <HelpCircle className="h-5 w-5" />
                  <span>How does this work?</span>
                </div>
                {showHelp ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">What is sourdough discard?</p>
                  <p>
                    Sourdough discard is the portion of starter you remove before feeding. Instead
                    of throwing it away, you can add it to quick breads for subtle tang and
                    complexity.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">What gets adjusted?</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Discard is added (40% of flour for small recipes, 30% for larger)</li>
                    <li>Flour is reduced by 50% of discard amount</li>
                    <li>Liquid is reduced by 50% of discard amount</li>
                    <li>Leavening stays the same (discard adds flavor, not rise)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Works best with:</p>
                  <p>Banana bread, zucchini bread, muffins, scones, biscuits, pancakes, waffles</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </main>

      {/* Floating Help Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-card border-2 border-warm-orange z-50"
        onClick={() => setShowHelp(!showHelp)}
      >
        <HelpCircle className="h-5 w-5 text-warm-orange" />
      </Button>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        Copyright 2025 Henry Hunter Baking Great Bread at Home. All Rights Reserved
      </footer>
    </div>
  );
}
