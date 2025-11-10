import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from '@/utils/recipeConverter';
import { generatePDF } from '@/utils/pdfGenerator';
import { saveRecipe } from '@/utils/recipeStorage';
import logo from '@/assets/logo.png';
import { Save } from 'lucide-react';
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

interface OutputScreenProps {
  result: ConvertedRecipe;
  originalRecipeText: string;
  onStartOver: () => void;
  onEditExtraction: () => void;
}

export default function OutputScreen({ result, originalRecipeText, onStartOver, onEditExtraction }: OutputScreenProps) {
  const [recipeName, setRecipeName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const originalPercentages = calculateBakersPercentages(result.original);
  const convertedPercentages = calculateBakersPercentages(result.converted);

  const handleDownloadPDF = () => {
    const name = recipeName.trim() || 'Converted Recipe';
    generatePDF(result, name);
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
      <div className="p-4 flex items-center justify-between">
        <img 
          src={logo} 
          alt="Baking Great Bread at Home" 
          className="h-16 md:h-20 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={onStartOver}
        />
        
        {/* Action buttons in upper right - hidden from PDF */}
        <div className="hidden md:flex gap-2 print:hidden">
          <Button variant="outline" onClick={onEditExtraction}>
            Edit Extraction
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
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
          <Button onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          <Button onClick={onStartOver} variant="secondary">
            Start Over
          </Button>
        </div>
      </div>
      <div className="flex-1 p-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Recipe Converted: {result.direction === 'sourdough-to-yeast' ? 'Sourdough → Yeast' : 'Yeast → Sourdough'}
          </h1>
          
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((warning, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg border text-sm ${
                    warning.type === 'caution' 
                      ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200' 
                      : warning.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-200'
                      : 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200'
                  }`}
                >
                  <span className="font-semibold">
                    {warning.type === 'caution' ? '⚠️ Caution' : warning.type === 'warning' ? '⚡ Note' : 'ℹ️ Info'}:
                  </span>{' '}
                  {warning.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Original Recipe */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Original Recipe</h2>
            <div className="space-y-2">
              {originalPercentages.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.ingredient}</span>
                  <span className="text-muted-foreground">
                    {item.amount.toFixed(0)}g ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-foreground">Hydration</span>
                  <span className="text-foreground">{result.original.hydration.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Converted Recipe */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Converted Recipe</h2>
            <div className="space-y-2">
              {result.direction === 'yeast-to-sourdough' && convertedPercentages.length > 3 ? (
                <>
                  {/* LEVAIN Section */}
                  <div className="mb-4">
                    <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">
                      Levain (build night before)
                    </div>
                    {convertedPercentages.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm pl-2">
                        <span className="text-foreground">{item.ingredient}</span>
                        <span className="text-muted-foreground">
                          {item.amount.toFixed(0)}g ({item.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* DOUGH Section */}
                  <div>
                    <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">
                      Dough
                    </div>
                    {convertedPercentages.slice(3).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm pl-2">
                        <span className="text-foreground">{item.ingredient}</span>
                        <span className="text-muted-foreground">
                          {item.amount.toFixed(0)}g ({item.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Single list for yeast conversions */
                convertedPercentages.map((item, i) => {
                  const isChanged = !originalPercentages.find(
                    orig => orig.ingredient === item.ingredient && Math.abs(orig.amount - item.amount) < 1
                  );
                  return (
                    <div 
                      key={i} 
                      className={`flex justify-between text-sm ${isChanged ? 'bg-highlight rounded px-2 py-1' : ''}`}
                    >
                      <span className="text-foreground">{item.ingredient}</span>
                      <span className="text-muted-foreground">
                        {item.amount.toFixed(0)}g ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-foreground">Total Hydration</span>
                  <span className="text-foreground">{result.converted.hydration.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Method Updates */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Method Updates</h2>
            <div className="space-y-3">
              {result.methodChanges.map((change, i) => (
                <div key={i} className="text-sm">
                  <div className="font-bold text-foreground">✓ {change.step}</div>
                  <div className="text-muted-foreground">{change.change}</div>
                  {change.timing && (
                    <div className="text-xs text-muted-foreground italic mt-1">
                      Timing: {change.timing}
                    </div>
                  )}
                </div>
              ))}
              
              {result.direction === 'sourdough-to-yeast' && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm">
                    <div className="font-bold text-foreground">💡 Tip: Sourdough Flavor</div>
                    <div className="text-muted-foreground">
                      To mimic sourdough tang, add 15g (1 tbsp) lemon juice or plain yogurt to the liquid ingredients.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Troubleshooting Tips */}
        <Card className="p-6 bg-muted/30">
          <h2 className="text-xl font-bold mb-4 text-foreground">🔧 Troubleshooting Tips</h2>
          <div className="space-y-4">
            {result.troubleshootingTips.map((tip, i) => (
              <div key={i} className="text-sm">
                <div className="font-bold text-foreground">{tip.issue}</div>
                <div className="text-muted-foreground mt-1">{tip.solution}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground italic">
            💡 Remember: Watch the dough, not the clock. Fermentation times vary with temperature and flour type.
          </div>
        </Card>

        {/* Ingredient Substitutions */}
        {result.substitutions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">🔄 Ingredient Substitutions</h2>
            <div className="space-y-4">
              {result.substitutions.map((sub, i) => (
                <div key={i} className="text-sm border-l-2 border-primary/30 pl-4">
                  <div className="font-bold text-foreground">
                    {sub.original} → {sub.substitute}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    <span className="font-semibold">Ratio:</span> {sub.ratio}
                  </div>
                  {sub.hydrationAdjustment !== 0 && (
                    <div className="text-muted-foreground mt-1">
                      <span className="font-semibold">Hydration:</span>{' '}
                      {sub.hydrationAdjustment > 0 ? '+' : ''}{sub.hydrationAdjustment}%
                    </div>
                  )}
                  <div className="text-muted-foreground mt-1 text-xs">
                    {sub.notes}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Method Text */}
        {result.original.method && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">Original Method</h2>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {result.original.method}
            </div>
          </Card>
        )}

        {/* Actions - Bottom (always visible, hidden from PDF) */}
        <div className="flex gap-4 justify-center flex-wrap print:hidden">
          <Button onClick={onEditExtraction} variant="outline" size="lg">
            Edit Extraction
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
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
          <Button onClick={handleDownloadPDF} size="lg">
            Download PDF
          </Button>
          <Button onClick={onStartOver} variant="secondary" size="lg">
            Start Over
          </Button>
        </div>
      </div>
      </div>
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
