import { useState, useEffect } from 'react';
import { ParsedIngredient } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroHeader } from '@/components/HeroHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pencil, Check, AlertCircle, Mail, ArrowRight, ArrowLeft, Droplet, Wheat, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IngredientConfirmationProps {
  ingredients: ParsedIngredient[];
  onConfirm: (confirmed: ParsedIngredient[]) => void;
  onReject: () => void;
  onHome: () => void;
}

export function IngredientConfirmation({ 
  ingredients, 
  onConfirm, 
  onReject,
  onHome 
}: IngredientConfirmationProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Auto-fill defaults for low-confidence or estimated ingredients
  const autoFilledIngredients = ingredients.map(ing => {
    if ((ing.confidence === 'low' || ing.source === 'estimated') && (!ing.amount || ing.amount === 0)) {
      const name = ing.name.toLowerCase();
      if (name.includes('milk') || name.includes('egg wash') || name.includes('wash')) {
        return { ...ing, amount: 50 };
      }
      if (name.includes('butter') && name.includes('brush')) {
        return { ...ing, amount: 30 };
      }
      if (name.includes('seed') || name.includes('topping') || name.includes('garnish')) {
        return { ...ing, amount: 20 };
      }
    }
    return ing;
  });
  
  const [edited, setEdited] = useState(autoFilledIngredients);

  // 🧪 DIAGNOSTIC TEST: Check flour consolidation
  useEffect(() => {
    console.log('INGREDIENT CHECK:', {
      totalIngredients: ingredients.length,
      flourEntries: ingredients.filter(i => 
        i.name.toLowerCase().includes('flour')
      ).length,
      samples: ingredients.map(i => i.name).slice(0, 5)
    });
  }, [ingredients]);

  // Calculate confidence statistics
  const confidenceStats = {
    high: ingredients.filter(i => i.confidence === 'high').length,
    medium: ingredients.filter(i => i.confidence === 'medium').length,
    low: ingredients.filter(i => i.confidence === 'low').length,
    estimated: ingredients.filter(i => i.source === 'estimated').length
  };

  // Group ingredients by category
  const groupedIngredients = {
    starter: edited.filter(i => i.type === 'starter'),
    liquid: edited.filter(i => i.type === 'liquid'),
    flour: edited.filter(i => i.type === 'flour'),
    salt: edited.filter(i => i.type === 'salt'),
    yeast: edited.filter(i => i.type === 'yeast'),
    fat: edited.filter(i => i.type === 'fat'),
    enrichment: edited.filter(i => i.type === 'enrichment'),
    sweetener: edited.filter(i => i.type === 'sweetener'),
    other: edited.filter(i => i.type === 'other' || !i.type)
  };

  const getConfidenceBadge = (ingredient: ParsedIngredient) => {
    const needsValue = (!ingredient.amount || ingredient.amount === 0);
    
    if (ingredient.source === 'estimated' || (ingredient.confidence === 'low' && needsValue)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs bg-red-500/20 text-red-700 border-red-500/50 font-bold">
                <AlertCircle className="h-3 w-3 mr-1" />
                {needsValue ? 'Needs value' : 'Estimated'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm max-w-xs">
                {needsValue 
                  ? "This ingredient needs a value. A default has been added - please verify or set to 0g to skip."
                  : "This ingredient was not found in the recipe. A standard amount has been added - please verify."}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (ingredient.confidence === 'low') {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-700 border-yellow-500/40">
          Medium
        </Badge>
      );
    }

    if (ingredient.confidence === 'medium') {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-700 border-yellow-500/40">
          Medium
        </Badge>
      );
    }

    // High confidence
    return (
      <Badge variant="outline" className="text-xs bg-green-500/20 text-green-700 border-green-500/40">
        High
      </Badge>
    );
  };

  const getCategoryColor = (type: string) => {
    const colors: Record<string, string> = {
      starter: 'bg-burnt-orange/10 border-burnt-orange/30',
      liquid: 'bg-blue-500/10 border-blue-500/30',
      flour: 'bg-bread-wheat/20 border-bread-wheat/40',
      salt: 'bg-gray-500/10 border-gray-500/30',
      yeast: 'bg-purple-500/10 border-purple-500/30',
      fat: 'bg-yellow-500/10 border-yellow-500/30',
      enrichment: 'bg-pink-500/10 border-pink-500/30',
      sweetener: 'bg-orange-500/10 border-orange-500/30',
      other: 'bg-muted border-border'
    };
    return colors[type] || colors.other;
  };

  const getCategoryIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      starter: <Sparkles className="h-4 w-4 text-burnt-orange" />,
      liquid: <Droplet className="h-4 w-4 text-blue-600" />,
      flour: <Wheat className="h-4 w-4 text-bread-wheat" />,
      salt: <span className="text-sm">🧂</span>,
      yeast: <span className="text-sm">🦠</span>,
      fat: <span className="text-sm">🧈</span>,
      enrichment: <span className="text-sm">🥚</span>,
      sweetener: <span className="text-sm">🍯</span>,
      other: <span className="text-sm">📦</span>
    };
    return icons[type] || icons.other;
  };

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...edited];
    const flatIndex = edited.findIndex((_, i) => i === index);
    updated[flatIndex] = { ...updated[flatIndex], [field]: value };
    setEdited(updated);
  };

  const renderIngredientRow = (ing: ParsedIngredient, idx: number, isOdd: boolean) => {
    const globalIndex = edited.findIndex((item) => item === ing);
    const isEditing = editingIndex === globalIndex;
    const needsValue = (!ing.amount || ing.amount === 0) && (ing.confidence === 'low' || ing.source === 'estimated');

    return (
      <div 
        key={globalIndex}
        className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
          needsValue
            ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-500'
            : isOdd
            ? 'bg-bread-cream/40'
            : 'bg-white'
        } hover:shadow-md`}
      >
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={ing.amount}
                onChange={(e) => updateIngredient(globalIndex, 'amount', parseFloat(e.target.value) || 0)}
                className="w-24 h-10"
                type="number"
              />
              <span className="text-sm font-medium text-muted-foreground">g</span>
              <Input
                value={ing.name}
                onChange={(e) => updateIngredient(globalIndex, 'name', e.target.value)}
                className="flex-1 h-10"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setEditingIndex(null)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <span className="text-2xl font-bold text-bread-earth w-24 shrink-0">
                {ing.amount}g
              </span>
              <span className="text-base text-foreground flex-1">{ing.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-xs ${getCategoryColor(ing.type)}`}>
                  {getCategoryIcon(ing.type)}
                  <span className="ml-1 capitalize">{ing.type}</span>
                </Badge>
                {getConfidenceBadge(ing)}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingIndex(globalIndex)}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderCategory = (title: string, items: ParsedIngredient[], type: string) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className={`flex items-center gap-2 py-2 px-4 rounded-lg border ${getCategoryColor(type)}`}>
          {getCategoryIcon(type)}
          <h3 className="font-semibold text-base text-bread-earth capitalize">{title}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {items.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {items.map((ing, idx) => renderIngredientRow(ing, idx, idx % 2 === 1))}
        </div>
      </div>
    );
  };

  const handleNavigation = (route: 'home' | 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    if (route === 'home') {
      onHome();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-bread-cream via-bread-light to-bread-cream">
      <HeroHeader 
        pageTitle="Review Extracted Ingredients"
        pageSubtitle="We've parsed your recipe. Confirm or edit the ingredients below."
        showNav={true}
        onNavigate={handleNavigation}
      />
      
      {/* Progress Indicator */}
      <div className="w-full bg-bread-cream/50 border-b border-bread-medium/30 py-4">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-bread-earth">Step 2 of 3</span>
            <span className="text-xs text-muted-foreground">Review Ingredients</span>
          </div>
          <Progress value={66} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Top Bar with Report Issue */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {(confidenceStats.low > 0 || confidenceStats.estimated > 0) && (
                <span className="text-sm text-muted-foreground">
                  ⚠️ Please verify {confidenceStats.low + confidenceStats.estimated} ingredient(s) with warnings
                </span>
              )}
            </div>
            <a 
              href="mailto:henrysbreadkitchen@gmail.com?subject=BGB%20Feedback"
              className="text-sm text-muted-foreground hover:text-burnt-orange underline-offset-4 hover:underline flex items-center gap-1"
            >
              <Mail className="h-3 w-3" />
              Report Issue
            </a>
          </div>

          {/* Confidence Summary */}
          {(confidenceStats.low > 0 || confidenceStats.medium > 0 || confidenceStats.estimated > 0) && (
            <Card className="mb-6 p-4 bg-bread-light/80 border-bread-medium/40">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-bread-earth">Confidence Summary:</span>
                {confidenceStats.high > 0 && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/40">
                    {confidenceStats.high} High
                  </Badge>
                )}
                {confidenceStats.medium > 0 && (
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/40">
                    {confidenceStats.medium} Medium
                  </Badge>
                )}
                {confidenceStats.low > 0 && (
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/40">
                    {confidenceStats.low} Low
                  </Badge>
                )}
                {confidenceStats.estimated > 0 && (
                  <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-500/40">
                    {confidenceStats.estimated} Estimated
                  </Badge>
                )}
              </div>
            </Card>
          )}

          {/* Ingredient Categories - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              {renderCategory('Starter', groupedIngredients.starter, 'starter')}
              {renderCategory('Flours', groupedIngredients.flour, 'flour')}
              {renderCategory('Liquids', groupedIngredients.liquid, 'liquid')}
            </div>
            <div className="space-y-6">
              {renderCategory('Salt', groupedIngredients.salt, 'salt')}
              {renderCategory('Yeast', groupedIngredients.yeast, 'yeast')}
              {renderCategory('Fats', groupedIngredients.fat, 'fat')}
              {renderCategory('Enrichments', groupedIngredients.enrichment, 'enrichment')}
              {renderCategory('Sweeteners', groupedIngredients.sweetener, 'sweetener')}
              {renderCategory('Other', groupedIngredients.other, 'other')}
            </div>
          </div>

          {/* Validation Warning for Missing Amounts */}
          {edited.some(ing => !ing.amount || ing.amount === 0) && (
            <Card className="p-4 mb-4 bg-destructive/10 border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-destructive mb-1">Missing ingredient amounts detected</p>
                  <p className="text-muted-foreground">
                    Some ingredients are missing amounts (shown in red above). 
                    Please fill them in or set to 0g to skip them before generating your recipe. 
                    Continuing without amounts may cause errors.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Bottom Action Buttons */}
          <Card className="p-6 bg-bread-light/80 border-bread-medium/40">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={onReject}
                variant="outline"
                size="lg"
                className="flex-1 h-12 border-bread-medium hover:bg-bread-cream"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
              <Button 
                onClick={() => onConfirm(edited)}
                size="lg"
                className="flex-1 h-12 bg-burnt-orange hover:bg-burnt-orange/90 text-white shadow-lg hover:shadow-xl transition-all"
              >
                Generate Recipe
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
