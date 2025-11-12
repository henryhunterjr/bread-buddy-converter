import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from '@/utils/recipeConverter';
import { generatePDF } from '@/utils/pdfGenerator';
import { saveRecipe } from '@/utils/recipeStorage';
import logo from '@/assets/logo.png';
import { Save, Info, Mail } from 'lucide-react';
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

interface OutputScreenProps {
  result: ConvertedRecipe;
  recipeName: string;
  recipeDescription?: string;
  originalRecipeText: string;
  onStartOver: () => void;
  onEditExtraction: () => void;
  validationAutoFixes?: string[];
}

export default function OutputScreen({ result, recipeName: initialRecipeName, recipeDescription, originalRecipeText, onStartOver, onEditExtraction, validationAutoFixes = [] }: OutputScreenProps) {
  const [recipeName, setRecipeName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const originalPercentages = calculateBakersPercentages(result.original);
  const convertedPercentages = calculateBakersPercentages(result.converted);

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
      title: "Recipe saved",
      description: `"${recipeName}" has been saved to your browser`,
    });
    setSaveDialogOpen(false);
    setRecipeName('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            
            {/* Action buttons - hidden from PDF and on small mobile */}
            <div className="hidden md:flex gap-2 print:hidden">
              <Button 
                variant="ghost" 
                size="sm"
                asChild
              >
                <a href="mailto:henrysbreadkitchen@gmail.com?subject=Bread%20Buddy%20Beta%20Feedback">
                  <Mail className="h-4 w-4 mr-2" />
                  Report Issue
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={onEditExtraction}>
                Edit Extraction
              </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Recipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Recipe</DialogTitle>
                <DialogDescription>
                  Give this recipe a name so you can easily find it later
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name-top">Recipe Name</Label>
                  <Input
                    id="name-top"
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
          <Button onClick={handleDownloadPDF} size="sm">
            Download PDF
          </Button>
          <Button onClick={onStartOver} variant="secondary" size="sm">
            Start Over
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
          
        {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2 px-1 sm:px-2">
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
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <span className="font-semibold">
                          {warning.type === 'caution' ? '⚠️ Caution' : warning.type === 'warning' ? '⚡ Note' : 'ℹ️ Info'}:
                        </span>{' '}
                        <span className="break-words">{warning.message}</span>
                      </div>
                      {isHydrationWarning && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 flex-shrink-0 cursor-help mt-0.5" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] sm:max-w-xs">
                              <p className="text-xs sm:text-sm">
                                This calculation assumes your starter is 100% hydration (equal parts flour and water) by default. 
                                If your starter uses a different hydration level, you can adjust it in the input screen.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
                        {convertedPercentages.slice(0, 3).map((item, i) => (
                          <tr key={`levain-${i}`} className="border-b border-border/30">
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-foreground break-words">{item.ingredient}</td>
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.amount.toFixed(0)}g</td>
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-right text-muted-foreground whitespace-nowrap">{item.percentage.toFixed(0)}%</td>
                          </tr>
                        ))}
                        
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
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-foreground break-words">{item.ingredient}</td>
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
                        return (
                          <tr 
                            key={i} 
                            className={`border-b border-border/30 ${isChanged ? 'bg-highlight' : ''}`}
                          >
                            <td className="py-2 px-1 sm:px-2 text-xs sm:text-sm text-foreground break-words">{item.ingredient}</td>
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

          {/* Troubleshooting Tips */}
          <Card className="p-3 sm:p-4 md:p-6 bg-muted/30 print:shadow-none print:border-2 print:bg-white">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-foreground print:text-black">Baker's Notes</h2>
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

        {/* Actions - Bottom (always visible, hidden from PDF) */}
        <div className="flex gap-2 sm:gap-4 justify-center flex-wrap print:hidden px-2">
          <Button onClick={onEditExtraction} variant="outline" size="sm" className="sm:text-base">
            Edit Extraction
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="sm:text-base">
                <Save className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Save Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Save Recipe</DialogTitle>
                <DialogDescription>
                  Give this recipe a name so you can easily find it later
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name-bottom">Recipe Name</Label>
                  <Input
                    id="name-bottom"
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
          <Button onClick={handleDownloadPDF} size="sm" className="sm:text-base">
            Download PDF
          </Button>
          <Button onClick={onStartOver} variant="secondary" size="sm" className="sm:text-base">
            Start Over
          </Button>
        </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="text-center py-3 sm:py-4 text-xs text-muted-foreground border-t border-border print:border-0 print:text-black print:mt-8 px-2">
        <p>Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved</p>
      </footer>
    </div>
  );
}
