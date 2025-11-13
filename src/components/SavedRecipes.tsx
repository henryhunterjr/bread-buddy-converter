import { useState, useEffect } from 'react';
import { SavedRecipe, getSavedRecipes, deleteRecipe } from '@/utils/recipeStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Clock, ChevronRight, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SavedRecipesProps {
  onLoadRecipe: (recipe: SavedRecipe) => void;
}

export function SavedRecipes({ onLoadRecipe }: SavedRecipesProps) {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);

  const loadRecipes = () => {
    setSavedRecipes(getSavedRecipes());
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRecipe(id);
    loadRecipes();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (savedRecipes.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>My Recipes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Info Alert */}
          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Local Storage:</strong> Recipes are saved locally on this device in your browser. 
              They will not sync across devices and will be deleted if you clear your browser data.
            </AlertDescription>
          </Alert>
          
          <p className="text-muted-foreground text-center py-8">
            No saved recipes yet. Convert a recipe and click "Save to My Recipes" to store it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Recipes ({savedRecipes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Info Alert */}
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Local Storage:</strong> Recipes are saved locally on this device in your browser. 
            They will not sync across devices and will be deleted if you clear your browser data.
          </AlertDescription>
        </Alert>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {savedRecipes.map((recipe) => (
              <Card 
                key={recipe.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onLoadRecipe(recipe)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {recipe.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(recipe.savedAt)}</span>
                        <span className="mx-1">•</span>
                        <span className="capitalize">
                          {recipe.convertedRecipe.direction.replace('-', ' → ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{recipe.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => handleDelete(recipe.id, e)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
