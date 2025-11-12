import { useState, useEffect } from 'react';
import { ParsedIngredient } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Navigation } from './Navigation';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check, AlertCircle, CheckCircle, HelpCircle, Mail } from 'lucide-react';
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
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState(ingredients);

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

  const getConfidenceBadge = (ingredient: ParsedIngredient) => {
    if (ingredient.source === 'estimated') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Estimated
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm max-w-xs">
                This ingredient was not found in the recipe. A standard amount has been added - please verify.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (ingredient.confidence === 'low') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-700 border-orange-500/20">
                <HelpCircle className="h-3 w-3 mr-1" />
                Low confidence
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm max-w-xs">
                {ingredient.aiSuggestion || "Please verify this ingredient's amount and type."}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (ingredient.confidence === 'medium') {
      return (
        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Medium
        </Badge>
      );
    }

    // High confidence or no confidence info
    return (
      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        High
      </Badge>
    );
  };

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...edited];
    updated[index] = { ...updated[index], [field]: value };
    setEdited(updated);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation onHome={onHome} />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-background rounded-lg shadow-lg border p-6">
          <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none text-xs px-2 py-0.5">
            BETA
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          asChild
          className="flex items-center gap-2"
        >
          <a href="mailto:henrysbreadkitchen@gmail.com?subject=Bread%20Buddy%20Beta%20Feedback">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Report Issue</span>
          </a>
        </Button>
      </div>
      
      <Alert className="mb-4">
        <AlertDescription>
          <strong>Review extracted ingredients:</strong> I found these from your recipe. 
          {confidenceStats.low > 0 || confidenceStats.estimated > 0 ? (
            <span className="text-orange-600 font-medium">
              {' '}Please verify {confidenceStats.low + confidenceStats.estimated} ingredient(s) marked with warnings.
            </span>
          ) : (
            <span> All ingredients detected with high confidence!</span>
          )}
        </AlertDescription>
      </Alert>

      {/* Confidence Summary */}
      {(confidenceStats.low > 0 || confidenceStats.medium > 0 || confidenceStats.estimated > 0) && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-md border text-sm">
          <span className="text-muted-foreground">Confidence:</span>
          {confidenceStats.high > 0 && (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              {confidenceStats.high} High
            </Badge>
          )}
          {confidenceStats.medium > 0 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
              {confidenceStats.medium} Medium
            </Badge>
          )}
          {confidenceStats.low > 0 && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
              {confidenceStats.low} Low
            </Badge>
          )}
          {confidenceStats.estimated > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
              {confidenceStats.estimated} Estimated
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {edited.map((ing, idx) => (
          <div 
            key={idx} 
            className={`flex items-center gap-3 p-3 rounded transition-colors ${
              ing.confidence === 'low' || ing.source === 'estimated'
                ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900'
                : 'bg-muted border border-transparent'
            }`}
          >
            {editMode ? (
              <>
                <Input
                  value={ing.amount}
                  onChange={(e) => updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-24"
                  type="number"
                />
                <span className="text-sm text-muted-foreground">g</span>
                <Input
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground bg-muted-foreground/10 px-2 py-1 rounded">
                  {ing.type}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono font-semibold w-24 text-right">
                  {ing.amount}g
                </span>
                <span className="flex-1">{ing.name}</span>
                <span className="text-xs text-muted-foreground bg-muted-foreground/10 px-2 py-1 rounded">
                  {ing.type}
                </span>
                {getConfidenceBadge(ing)}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {editMode ? (
          <>
            <Button 
              onClick={() => setEditMode(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel Edit
            </Button>
            <Button 
              onClick={() => {
                setEditMode(false);
                onConfirm(edited);
              }}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Save & Convert
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={onReject}
              variant="outline"
              className="flex-1"
            >
              Start Over
            </Button>
            <Button 
              onClick={() => setEditMode(true)}
              variant="outline"
              className="flex-1"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Values
            </Button>
            <Button 
              onClick={() => onConfirm(edited)}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Looks Good
            </Button>
          </>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
