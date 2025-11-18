import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from '@/utils/recipeConverter';
import { generatePDF } from '@/utils/lazyPdfGenerator';
import { Navigation } from '@/components/Navigation';
import { saveRecipe } from '@/utils/recipeStorage';
import logo from '@/assets/logo.png';
import heroBanner from '@/assets/hero-banner.png';
import { Save, Info, Mail, Download, Printer, RotateCcw, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from 'lucide-react';
import { MeasurementConverter } from '@/components/MeasurementConverter';
import { useAnalytics } from '@/hooks/useAnalytics';

interface OutputScreenProps {
  result: ConvertedRecipe;
  recipeName: string;
  recipeDescription?: string;
  originalRecipeText: string;
  onStartOver: () => void;
  onEditExtraction: () => void;
  validationAutoFixes?: string[];
  onHome: () => void;
  onMyRecipes?: () => void;
}

export default function OutputScreen({ 
  result, 
  recipeName: initialRecipeName, 
  recipeDescription, 
  originalRecipeText, 
  onStartOver, 
  validationAutoFixes = [], 
  onHome, 
  onMyRecipes 
}: OutputScreenProps) {
  const { trackEvent } = useAnalytics();
  const [recipeName, setRecipeName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const convertedPercentages = calculateBakersPercentages(result.converted);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const name = recipeName.trim() || initialRecipeName || 'Converted Recipe';
    
    // Track PDF download
    trackEvent('pdf_downloaded', {
      conversion_direction: result.direction
    });
    
    toast({
      title: "Generating PDF...",
      description: "Please wait a moment",
    });
    
    setTimeout(() => {
      generatePDF(result, name, recipeDescription || '');
    }, 100);
  };

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this recipe",
        variant: "destructive",
      });
      return;
    }

    saveRecipe(recipeName, originalRecipeText, result);
    
    // Track recipe saved
    trackEvent('recipe_saved', {
      conversion_direction: result.direction
    });
    
    toast({
      title: "✅ Saved!",
      description: `Find it under "My Recipes" in the menu.`,
    });
    setSaveDialogOpen(false);
    setRecipeName('');
  };

  // Group ingredients into Dough and Finishing
  const doughIngredients = convertedPercentages.filter(item => 
    !['cranberries', 'raisins', 'walnuts', 'pecans', 'chocolate', 'seeds', 'nuts', 'inclusions'].some(
      finish => item.ingredient.toLowerCase().includes(finish)
    )
  );

  const finishingIngredients = convertedPercentages.filter(item => 
    ['cranberries', 'raisins', 'walnuts', 'pecans', 'chocolate', 'seeds', 'nuts', 'inclusions'].some(
      finish => item.ingredient.toLowerCase().includes(finish)
    )
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print-page-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          .hero-image {
            max-height: 200px;
          }
          
          h1, h2, h3 {
            page-break-after: avoid;
          }
        }
      `}</style>

      <Navigation onHome={onHome} onMyRecipes={onMyRecipes} />
      
      {/* Hero Image */}
      <div className="w-full h-[300px] overflow-hidden relative no-print hero-image">
        <img 
          src={heroBanner} 
          alt="Artisan bread" 
          className="w-full h-full object-cover"
        />
        {/* Small logo overlay in corner */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
          <img 
            src={logo} 
            alt="BGB Logo" 
            className="h-8 w-8"
          />
        </div>
      </div>

      {/* Report Issue button - top right, fixed position */}
      <div className="fixed top-4 right-4 z-50 no-print">
        <Button 
          variant="ghost" 
          size="sm"
          className="bg-white/90 backdrop-blur-sm shadow-md hover:bg-white"
          asChild
        >
          <a href="mailto:henrysbreadkitchen@gmail.com?subject=BGB%20Beta%20Feedback">
            <Mail className="h-4 w-4 mr-2" />
            Report Issue
          </a>
        </Button>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Recipe Header Section */}
          <div className="text-center space-y-3 py-6 print-page-break">
            {/* Recipe Title - Large Serif */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-[hsl(var(--foreground))] leading-tight">
              {initialRecipeName}
            </h1>
            
            {/* Metadata Line */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm text-[hsl(var(--muted-foreground))]">
              <span>Converted from {result.direction === 'sourdough-to-yeast' ? 'Sourdough → Yeast' : 'Yeast → Sourdough'}</span>
              <span className="hidden sm:inline">•</span>
              <span>Hydration: {result.converted.hydration.toFixed(0)}%</span>
              <span className="hidden sm:inline">•</span>
              <span>Yield: {(result.converted.totalFlour + result.converted.totalLiquid + result.converted.saltAmount).toFixed(0)}g</span>
              <span className="hidden sm:inline">•</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            
            {/* Recipe Description */}
            {recipeDescription && (
              <p className="text-base sm:text-lg max-w-3xl mx-auto text-[hsl(var(--muted-foreground))] italic leading-relaxed pt-2">
                {recipeDescription}
              </p>
            )}
          </div>

          {/* Validation Auto-Fixes */}
          {validationAutoFixes.length > 0 && (
            <Card className="bg-green-50 border-2 border-green-500 p-4 dark:bg-green-950/30 dark:border-green-700 no-print">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 dark:text-green-200 mb-2">
                    Validation Complete
                  </h3>
                  <div className="space-y-1 text-sm text-green-900 dark:text-green-200">
                    {validationAutoFixes.map((fix, i) => (
                      <div key={i}>• {fix}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {/* Ingredients Section */}
          <div className="print-page-break">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-6 text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--primary))] pb-2">
              Ingredients
            </h2>
            
            <div className="space-y-6">
              {/* Dough Table */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-[hsl(var(--foreground))] bg-[hsl(var(--primary))]/10 px-4 py-2 rounded-t-lg border-l-4 border-[hsl(var(--primary))]">
                  Dough
                </h3>
                <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-b-lg shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[hsl(var(--muted))]">
                        <th className="py-3 px-4 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Ingredient</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-[hsl(var(--foreground))]">Amount</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-[hsl(var(--foreground))]">Baker's %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doughIngredients.map((item, index) => {
                        const isStarter = item.ingredient.toLowerCase().includes('starter') || 
                                         item.ingredient.toLowerCase().includes('levain');
                        const starterAmount = item.amount;
                        const starterFlour = starterAmount / 2; // 100% hydration = 50% flour
                        const starterWater = starterAmount / 2; // 100% hydration = 50% water
                        
                        return (
                          <React.Fragment key={index}>
                            <tr 
                              className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-[hsl(var(--muted))]/30'}
                            >
                              <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                                {item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)}
                              </td>
                              <td className="py-3 px-4 text-sm text-right text-[hsl(var(--foreground))]">{item.amount.toFixed(0)}g</td>
                              <td className="py-3 px-4 text-sm text-right text-[hsl(var(--muted-foreground))]">{item.percentage.toFixed(0)}%</td>
                            </tr>
                            
                            {/* Starter Breakdown - Only show for yeast-to-sourdough conversions */}
                            {isStarter && result.direction === 'yeast-to-sourdough' && (
                              <tr className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-[hsl(var(--muted))]/30'}>
                                <td colSpan={3} className="px-4 pb-3">
                                  <Collapsible>
                                    <CollapsibleTrigger className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors w-full">
                                      <ChevronDown className="h-3 w-3" />
                                      <span className="italic">What's in the starter? (Click to expand)</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2 ml-5 text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/20 p-3 rounded border border-[hsl(var(--border))]">
                                      <p className="mb-2 font-semibold text-[hsl(var(--foreground))]">
                                        Starter Composition (100% hydration):
                                      </p>
                                      <ul className="space-y-1 ml-4">
                                        <li>• Flour: {starterFlour.toFixed(1)}g</li>
                                        <li>• Water: {starterWater.toFixed(1)}g</li>
                                      </ul>
                                      <p className="mt-2 text-[hsl(var(--muted-foreground))]">
                                        This flour is included in the total flour calculation.
                                      </p>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <tr className="border-t-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 font-bold">
                        <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]" colSpan={2}>
                          Total Hydration
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-[hsl(var(--foreground))]">
                          {result.converted.hydration.toFixed(0)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Finishing Table - if applicable */}
              {finishingIngredients.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))]/20 px-4 py-2 rounded-t-lg border-l-4 border-[hsl(var(--secondary))]">
                    Finishing
                  </h3>
                  <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-b-lg shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[hsl(var(--muted))]">
                          <th className="py-3 px-4 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Ingredient</th>
                          <th className="py-3 px-4 text-right text-sm font-semibold text-[hsl(var(--foreground))]">Amount</th>
                          <th className="py-3 px-4 text-right text-sm font-semibold text-[hsl(var(--foreground))]">Baker's %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finishingIngredients.map((item, index) => (
                          <tr 
                            key={index}
                            className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-[hsl(var(--muted))]/30'}
                          >
                            <td className="py-3 px-4 text-sm text-[hsl(var(--foreground))]">
                              {item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right text-[hsl(var(--foreground))]">{item.amount.toFixed(0)}g</td>
                            <td className="py-3 px-4 text-sm text-right text-[hsl(var(--muted-foreground))]">{item.percentage.toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Explanation Note */}
            {result.direction === 'yeast-to-sourdough' && (
              <div className="mt-4 flex items-start gap-2 text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/30 p-4 rounded-lg">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Note:</strong> The levain flour and water are included in both the levain section and the total calculations. This is standard practice in baker's formulas.
                </p>
              </div>
            )}
          </div>

          {/* Method Section */}
          <div className="print-page-break">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-6 text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--primary))] pb-2">
              Method
            </h2>
            <div className="space-y-6">
              {result.methodChanges.map((change, i) => (
                <div key={i} className="flex gap-4 print-page-break">
                  {/* Burnt orange circular icon with step number */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center font-bold text-lg shadow-md">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold text-[hsl(var(--foreground))] mb-2 text-base sm:text-lg">
                      {change.step}
                    </h3>
                    <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] leading-relaxed mb-2">
                      {change.change}
                    </p>
                    {change.timing && (
                      <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] italic flex items-center gap-1">
                        ⏱ {change.timing}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Troubleshooting Tips */}
            {result.troubleshootingTips && result.troubleshootingTips.length > 0 && (
              <Card className="mt-8 bg-[hsl(var(--muted))]/30 p-6 border-[hsl(var(--primary))]/20">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Baker's Notes</h3>
                </div>
                <div className="space-y-4">
                  {result.troubleshootingTips.map((tip, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-semibold text-[hsl(var(--foreground))] mb-1">{tip.issue}</div>
                      <div className="text-[hsl(var(--muted-foreground))]">{tip.solution}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Substitutions */}
          {result.substitutions && result.substitutions.length > 0 && (
            <Card className="p-6 border-[hsl(var(--primary))]/20 print-page-break">
              <h2 className="text-xl font-bold mb-4 text-[hsl(var(--foreground))]">Ingredient Substitutions</h2>
              <div className="space-y-4">
                {result.substitutions.map((sub, i) => (
                  <div key={i} className="border-l-4 border-[hsl(var(--secondary))] pl-4 py-2">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-[hsl(var(--foreground))]">{sub.original}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">→</span>
                      <span className="font-semibold text-[hsl(var(--foreground))]">{sub.substitute}</span>
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      Ratio: {sub.ratio}
                      {sub.hydrationAdjustment !== 0 && (
                        <span className="ml-2">
                          (Hydration {sub.hydrationAdjustment > 0 ? '+' : ''}{sub.hydrationAdjustment}%)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sub.notes}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="border-t border-[hsl(var(--border))] bg-white dark:bg-gray-900 px-4 py-6 no-print">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            {/* Print Recipe */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handlePrint}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Printer className="h-5 w-5" />
                    <span className="hidden sm:inline">Print Recipe</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print this recipe</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Download PDF */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Download className="h-5 w-5" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download as PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Save Recipe */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto gap-2"
                >
                  <Save className="h-5 w-5" />
                  <span className="hidden sm:inline">Save Recipe</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Recipe</DialogTitle>
                  <DialogDescription>
                    Give this recipe a name to save it for later
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipe-name">Recipe Name</Label>
                    <Input
                      id="recipe-name"
                      placeholder="My Sourdough Recipe"
                      value={recipeName}
                      onChange={(e) => setRecipeName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRecipe}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Start Another Conversion - Primary */}
            <Button 
              size="lg"
              onClick={onStartOver}
              className="w-full sm:w-auto gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
            >
              <RotateCcw className="h-5 w-5" />
              Start Another Conversion
            </Button>

            {/* Return to Home - Secondary */}
            <Button 
              variant="outline"
              size="lg"
              onClick={onHome}
              className="w-full sm:w-auto gap-2"
            >
              <Home className="h-5 w-5" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
      
      {/* Floating Measurement Converter */}
      <MeasurementConverter />
      
      {/* Footer */}
      <footer className="text-center py-4 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]">
        <p>Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved</p>
      </footer>
    </div>
  );
}
