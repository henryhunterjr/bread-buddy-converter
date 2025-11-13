import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from '@/utils/recipeConverter';
import { generatePDF } from '@/utils/pdfGenerator';
import { Navigation } from '@/components/Navigation';
import { saveRecipe } from '@/utils/recipeStorage';
import logo from '@/assets/logo.png';
import { Save, Info, Mail, Droplets, Download, Printer, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
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
import { MeasurementConverter } from '@/components/MeasurementConverter';

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

export default function OutputScreen({ result, recipeName: initialRecipeName, recipeDescription, originalRecipeText, onStartOver, onEditExtraction, validationAutoFixes = [], onHome, onMyRecipes }: OutputScreenProps) {
  const [recipeName, setRecipeName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [waterAdjustmentOpen, setWaterAdjustmentOpen] = useState(false);
  const [adjustedWaterAmount, setAdjustedWaterAmount] = useState(result.converted.totalLiquid);
  const { toast } = useToast();
  
  const originalPercentages = calculateBakersPercentages(result.original);
  const convertedPercentages = calculateBakersPercentages(result.converted);
  
  // Calculate adjusted hydration
  const adjustedHydration = (adjustedWaterAmount / result.converted.totalFlour) * 100;
  const waterDifference = adjustedWaterAmount - result.converted.totalLiquid;
  
  // Calculate recommended water range (+2% to +5% hydration)
  const currentHydration = result.converted.hydration;
  const recommendedMinWater = Math.ceil((result.converted.totalFlour * (currentHydration + 2)) / 100);
  const recommendedMaxWater = Math.ceil((result.converted.totalFlour * (currentHydration + 5)) / 100);
  const recommendedMinHydration = currentHydration + 2;
  const recommendedMaxHydration = currentHydration + 5;
  
  // Determine slider color based on hydration level
  const getSliderColor = () => {
    if (adjustedHydration >= 65 && adjustedHydration <= 75) return 'bg-green-500';
    if (adjustedHydration >= 60 && adjustedHydration <= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const name = recipeName.trim() || initialRecipeName || 'Converted Recipe';
    
    // Show loading state for mobile (PDF generation can take a moment)
    toast({
      title: "Generating PDF...",
      description: "Please wait a moment",
    });
    
    // Small delay to ensure toast shows
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
    toast({
      title: "✅ Saved!",
      description: `Find it under "My Recipes" in the menu.`,
    });
    setSaveDialogOpen(false);
    setRecipeName('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation onHome={onHome} onMyRecipes={onMyRecipes} />
      {/* Header - optimized for mobile and print */}
      <div className="p-4 sm:p-6 border-b border-border print:border-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 print:gap-0">
              <img 
                src={logo} 
                alt="Baking Great Bread at Home" 
                className="h-12 sm:h-14 md:h-16 print:h-12" 
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none text-xs px-2 py-0.5 cursor-help print:hidden">
                    BETA
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>We're testing! Found a bug? Let us know.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Report Issue button - top right */}
            <div className="hidden md:flex gap-2 print:hidden">
              <Button 
                variant="ghost" 
                size="sm"
                asChild
              >
                <a href="mailto:henrysbreadkitchen@gmail.com?subject=BGB%20Beta%20Feedback">
                  <Mail className="h-4 w-4 mr-2" />
                  Report Issue
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Recipe Title and Description - Professional Cookbook Style */}
          <div className="text-center space-y-2 sm:space-y-3 py-3 sm:py-4 md:py-6 print:py-3 border-b border-border/30 print:border-b-0">
            {/* Recipe Title - Large Serif */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground break-words px-2 sm:px-4 print:text-4xl print:text-black leading-tight">
              {initialRecipeName}
            </h1>
            
            {/* Conversion Direction - Small Caps */}
            <p className="text-xs sm:text-sm tracking-wide uppercase text-muted-foreground print:text-xs print:text-gray-600 px-2">
              {result.direction === 'sourdough-to-yeast' ? 'Converted from Sourdough → Yeast' : 'Converted from Yeast → Sourdough'} • Hydration {result.converted.hydration.toFixed(0)}% • {new Date().toLocaleDateString()}
            </p>
            
            {/* Recipe Description - Smaller Sans-Serif */}
            {recipeDescription && (
              <p className="text-xs sm:text-sm md:text-base max-w-3xl mx-auto text-muted-foreground leading-relaxed px-3 sm:px-4 pt-1 sm:pt-2 print:text-sm print:text-gray-800">
                {recipeDescription}
              </p>
            )}
          </div>
          
          {/* Validation Auto-Fixes - Show prominently if any were made */}
          {validationAutoFixes.length > 0 && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 dark:bg-green-950/30 dark:border-green-700 print:bg-white print:border-black">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 dark:text-green-200 print:text-black mb-3">
                    Validation Complete
                  </h3>
                  <div className="space-y-1 text-sm text-green-900 dark:text-green-200 print:text-black">
                    {validationAutoFixes.map((fix, i) => (
                      <div key={i}>• {fix}</div>
                    ))}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400 print:text-gray-600 mt-3 italic">
                    Review the recipe and adjust amounts if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Beta Testing Feedback Reminder */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/20 dark:border-blue-800/30 print:hidden">
            <div className="flex items-start gap-3">
              <div className="text-lg">📝</div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">
                  Beta Testing Note
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  How did this conversion look? Does the hydration make sense? 
                  Reply to the email I sent you or post in the group with any feedback!
                </p>
              </div>
            </div>
          </div>

          {/* Ingredients Table - PDF Style */}
          <Card className="p-3 sm:p-4 md:p-6 print:shadow-none print:border-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-foreground print:text-black">Ingredients</h2>
            
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle px-3 sm:px-4 md:px-0">
                <table className="w-full border-collapse min-w-[320px]">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-2 px-1 sm:px-2 text-xs sm:text-sm font-bold text-foreground">Ingredient</th>
                      <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">Amount</th>
                      <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">Baker's %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.direction === 'yeast-to-sourdough' && convertedPercentages.length > 3 ? (
                      <>
                        {/* Levain Section */}
                        <tr className="border-b border-border/50">
                          <td colSpan={3} className="py-2 sm:py-3 px-1 sm:px-2">
                            <div className="text-xs font-bold text-primary uppercase tracking-wide">
                              Levain / Starter
                            </div>
                          </td>
                        </tr>
                        {convertedPercentages.slice(0, 3).map((item, i) => {
                          // Generate tooltips for levain ingredients
                          const getTooltipText = (ingredient: string): string | null => {
                            const lower = ingredient.toLowerCase();
                            if (lower.includes('starter')) {
                              return "This is your active, bubbly starter—the heart of sourdough! It replaces commercial yeast.";
                            }
                            if (lower.includes('water') && i === 1) {
                              return "Levain water helps build a strong starter culture that ferments your dough over 4-6 hours.";
                            }
                            if (lower.includes('flour') && i === 2) {
                              return "Levain flour feeds your starter culture, creating flavor and leavening power naturally.";
                            }
                            return null;
                          };
                          
                          const tooltipText = getTooltipText(item.ingredient);
                          
                          return (
                           <tr key={`levain-${i}`} className="border-b border-border/30">
                              <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-foreground break-words">
                                {tooltipText ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted decoration-muted-foreground">
                                          {item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-sm">{tooltipText}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)
                                )}
                              </td>
                              <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.amount.toFixed(0)}g</td>
                              <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.percentage.toFixed(0)}%</td>
                            </tr>
                          );
                        })}
                        
                        {/* Dough Section */}
                        <tr className="border-b border-border/50">
                          <td colSpan={3} className="py-2 sm:py-3 px-1 sm:px-2">
                            <div className="text-xs font-bold text-primary uppercase tracking-wide">
                              Dough
                            </div>
                          </td>
                        </tr>
                        {convertedPercentages.slice(3).map((item, i) => (
                          <tr key={`dough-${i}`} className="border-b border-border/30">
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-foreground break-words">{item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)}</td>
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.amount.toFixed(0)}g</td>
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.percentage.toFixed(0)}%</td>
                          </tr>
                        ))}
                      </>
                     ) : (
                      /* Single list for sourdough-to-yeast conversions */
                      convertedPercentages.map((item, i) => {
                        const isChanged = !originalPercentages.find(
                          orig => orig.ingredient === item.ingredient && Math.abs(orig.amount - item.amount) < 1
                        );
                        
                        // Generate helpful tooltips explaining changes
                        const getTooltipText = (ingredient: string): string | null => {
                          const lower = ingredient.toLowerCase();
                          if (lower.includes('yeast') || lower.includes('instant')) {
                            return "Replaced starter with yeast for a faster rise—typically 1-2 hours instead of 4-6!";
                          }
                          if (lower.includes('water') && result.direction === 'sourdough-to-yeast') {
                            return "Yeast breads often need slightly less water than sourdough for the perfect texture.";
                          }
                          if (lower.includes('starter') || lower.includes('levain')) {
                            return "Active starter feeds the dough slowly, giving deeper flavor and a chewy crumb.";
                          }
                          if (lower.includes('sugar') || lower.includes('honey')) {
                            return "Sugar feeds the yeast for a faster rise, but can slow down sourdough—that's why we adjust starter amounts!";
                          }
                          if (lower.includes('butter') || lower.includes('oil')) {
                            return "Fat makes dough tender and rich, but can slow fermentation—we account for this in rise times.";
                          }
                          if (lower.includes('egg')) {
                            return "Eggs add richness and structure, plus about 75% of their weight counts as liquid!";
                          }
                          if (lower.includes('milk')) {
                            return "Milk adds softness and flavor. We count it as 100% liquid in our hydration calculations.";
                          }
                          return null;
                        };
                        
                        const tooltipText = getTooltipText(item.ingredient);
                        
                        return (
                          <tr 
                            key={i} 
                            className={`border-b border-border/30 ${isChanged ? 'bg-highlight' : ''}`}
                          >
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-foreground break-words">
                              {tooltipText ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help underline decoration-dotted decoration-muted-foreground">
                                        {item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-sm">{tooltipText}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                item.ingredient.charAt(0).toUpperCase() + item.ingredient.slice(1)
                              )}
                            </td>
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.amount.toFixed(0)}g</td>
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.percentage.toFixed(0)}%</td>
                          </tr>
                        );
                      })
                    )}
                    
                    {/* Total Hydration Row */}
                    <tr className="border-t-2 border-border">
                      <td className="py-3 px-1 sm:px-2 text-xs sm:text-sm font-bold text-foreground" colSpan={2}>
                        Total Hydration
                      </td>
                      <td className="py-3 px-1 sm:px-2 text-xs sm:text-sm font-bold text-right text-foreground whitespace-nowrap">
                        {result.converted.hydration.toFixed(0)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Highlighting Legend */}
            {result.direction === 'sourdough-to-yeast' && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/30">
                <TooltipProvider>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-highlight rounded flex-shrink-0"></div>
                    <span>Highlighted ingredients are new or changed from the original recipe</span>
                  </div>
                </TooltipProvider>
              </div>
            )}
          </Card>

          {/* Method Steps */}
          <Card className="p-3 sm:p-4 md:p-6 print:shadow-none print:border-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-foreground print:text-black">Method</h2>
            <div className="space-y-3 sm:space-y-4">
              {result.methodChanges.map((change, i) => (
                <div key={i} className="border-l-4 border-primary/30 pl-3 sm:pl-4">
                  <div className="font-bold text-foreground mb-2 text-sm sm:text-base">
                    {i + 1}. {change.step}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {change.change}
                  </div>
                  {change.timing && (
                    <div className="text-xs text-muted-foreground italic mt-2 opacity-75">
                      ⏱ {change.timing}
                    </div>
                  )}
                </div>
              ))}
              
              {result.direction === 'sourdough-to-yeast' && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/30 bg-muted/20 -mx-3 sm:-mx-4 md:-mx-4 -mb-3 sm:-mb-4 md:-mb-4 px-3 sm:px-4 py-3 sm:py-4 rounded-b-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-base sm:text-lg">💡</span>
                    <div>
                      <div className="font-bold text-foreground text-xs sm:text-sm">Tip: Mimic Sourdough Flavor</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Add 15g (1 tbsp) lemon juice or plain yogurt to the liquid ingredients for a subtle tang.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons - Consolidated after recipe content */}
          <Card className="p-4 sm:p-6 bg-gradient-to-r from-warm-orange/10 to-golden-yellow/10 print:hidden">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save to My Recipes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Save to My Recipes</DialogTitle>
                    <DialogDescription>
                      Give this recipe a name so you can easily find it later
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name-action">Recipe Name</Label>
                      <Input
                        id="name-action"
                        placeholder="e.g. Cranberry Walnut Sourdough"
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRecipe();
                          }
                        }}
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
              
              <Button onClick={handleDownloadPDF} variant="default" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              
              <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              
              <Button onClick={onStartOver} variant="secondary" className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </div>
          </Card>

          {/* Baker's Notes and Warnings - Moved to bottom */}
          <div className="border-t-2 border-border/50 pt-6 mt-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-foreground print:text-black">Baker's Notes & Tips</h2>
            
            {/* Warnings Section */}
            {result.warnings.length > 0 && (
              <Card className="p-4 sm:p-6 mb-4 print:shadow-none print:border-2">
                <h3 className="text-base sm:text-lg font-bold mb-3 text-foreground print:text-black">Important Notes</h3>
                <div className="space-y-3">
                  {result.warnings.map((warning, i) => {
                    const isHydrationWarning = /hydration/i.test(warning.message);
                    
                    return (
                      <div 
                        key={i} 
                        className={`p-3 sm:p-4 rounded-lg border text-xs sm:text-sm print:border-2 print:p-3 ${
                          warning.type === 'caution' 
                            ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200 print:bg-white print:border-black print:text-black' 
                            : warning.type === 'warning'
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-200 print:bg-white print:border-black print:text-black'
                            : 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200 print:bg-white print:border-black print:text-black'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <span className="font-semibold">
                                {warning.type === 'caution' ? '⚠️ Caution' : warning.type === 'warning' ? '⚡ Note' : 'ℹ️ Info'}:
                              </span>{' '}
                              <span className="break-words">{warning.message}</span>
                            </div>
                            {isHydrationWarning && !waterAdjustmentOpen && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setWaterAdjustmentOpen(true)}
                                className="ml-2 shrink-0 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 print:hidden"
                              >
                                <Droplets className="h-3 w-3 mr-1" />
                                Adjust Water
                              </Button>
                            )}
                          </div>
                          
                          {/* Enhanced Water Adjustment Slider with Recommendations */}
                          {isHydrationWarning && waterAdjustmentOpen && (
                            <div className="bg-white/80 dark:bg-gray-900/80 p-4 rounded-md border border-gray-300 dark:border-gray-600 print:hidden">
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-sm font-semibold">Adjust Water Amount</Label>
                                <button 
                                  onClick={() => setWaterAdjustmentOpen(false)}
                                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  Close ×
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {/* Recommended Range Display */}
                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 p-2 rounded text-xs">
                                  <div className="font-semibold text-green-900 dark:text-green-200 mb-1">💡 Recommended Range:</div>
                                  <div className="text-green-800 dark:text-green-300">
                                    Add <strong>{recommendedMinWater - result.converted.totalLiquid}g to {recommendedMaxWater - result.converted.totalLiquid}g</strong> more water
                                  </div>
                                  <div className="text-green-700 dark:text-green-400 mt-1">
                                    Target: {recommendedMinWater}g - {recommendedMaxWater}g ({recommendedMinHydration.toFixed(0)}% - {recommendedMaxHydration.toFixed(0)}% hydration)
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span>Water: <span className="font-bold">{adjustedWaterAmount}g</span></span>
                                  <span>Hydration: <span className={`font-bold ${getSliderColor() === 'bg-green-500' ? 'text-green-600' : getSliderColor() === 'bg-yellow-500' ? 'text-yellow-600' : 'text-red-600'}`}>{adjustedHydration.toFixed(0)}%</span></span>
                                </div>
                                
                                <div className="relative">
                                  <Slider
                                    value={[adjustedWaterAmount]}
                                    onValueChange={(values) => setAdjustedWaterAmount(values[0])}
                                    min={Math.floor(result.converted.totalFlour * 0.5)}
                                    max={Math.ceil(result.converted.totalFlour * 1.0)}
                                    step={5}
                                    className="w-full"
                                  />
                                  {/* Visual safe zone indicator */}
                                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                    <div 
                                      className="absolute h-full bg-green-400/50 dark:bg-green-600/50"
                                      style={{
                                        left: `${((recommendedMinWater - Math.floor(result.converted.totalFlour * 0.5)) / (Math.ceil(result.converted.totalFlour * 1.0) - Math.floor(result.converted.totalFlour * 0.5))) * 100}%`,
                                        width: `${((recommendedMaxWater - recommendedMinWater) / (Math.ceil(result.converted.totalFlour * 1.0) - Math.floor(result.converted.totalFlour * 0.5))) * 100}%`
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    <span>50%</span>
                                    <span className="text-green-600 dark:text-green-400">← Safe Zone →</span>
                                    <span>100%</span>
                                  </div>
                                </div>
                                
                                {waterDifference !== 0 && (
                                  <div className={`text-xs p-2 rounded border ${
                                    adjustedHydration >= recommendedMinHydration && adjustedHydration <= recommendedMaxHydration
                                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                                      : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                                  }`}>
                                    {waterDifference > 0 ? (
                                      <span>✓ Add <strong>{waterDifference}g</strong> more water</span>
                                    ) : (
                                      <span>✓ Reduce water by <strong>{Math.abs(waterDifference)}g</strong></span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            
            {/* Troubleshooting Tips */}
            <Card className="p-3 sm:p-4 md:p-6 bg-muted/30 print:shadow-none print:border-2 print:bg-white">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-foreground print:text-black">Troubleshooting</h3>
              <div className="space-y-3 sm:space-y-4">
                {result.troubleshootingTips.map((tip, i) => (
                  <div key={i} className="border-l-4 border-primary/30 pl-3 sm:pl-4">
                    <div className="font-bold text-foreground text-xs sm:text-sm">{tip.issue}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{tip.solution}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/30 text-xs text-muted-foreground italic flex items-center gap-2">
                <span>💡</span>
                <span>Watch the dough, not the clock. Fermentation times vary with temperature and flour type.</span>
              </div>
            </Card>
          </div>

          {/* Ingredient Substitutions */}
          {result.substitutions.length > 0 && (
            <Card className="p-3 sm:p-4 md:p-6 print:shadow-none print:border-2">
              <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-foreground print:text-black">Substitutions</h2>
              <div className="space-y-3 sm:space-y-4">
                {result.substitutions.map((sub, i) => (
                  <div key={i} className="border-l-4 border-primary/30 pl-3 sm:pl-4">
                    <div className="font-bold text-foreground text-xs sm:text-sm mb-2">
                      {sub.original} → {sub.substitute}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <div><span className="font-semibold">Ratio:</span> {sub.ratio}</div>
                      {sub.hydrationAdjustment !== 0 && (
                        <div>
                          <span className="font-semibold">Hydration adjustment:</span>{' '}
                          {sub.hydrationAdjustment > 0 ? '+' : ''}{sub.hydrationAdjustment}%
                        </div>
                      )}
                      <div className="text-xs opacity-75 mt-2">{sub.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
      
      {/* Floating Measurement Converter */}
      <MeasurementConverter />
      
      {/* Footer */}
      <footer className="text-center py-3 sm:py-4 text-xs text-muted-foreground border-t border-border print:border-0 print:text-black print:mt-8 px-2">
        <p>Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved</p>
      </footer>
    </div>
  );
}
