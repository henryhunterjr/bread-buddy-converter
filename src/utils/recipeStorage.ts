import { ConvertedRecipe } from '@/types/recipe';

export interface SavedRecipe {
  id: string;
  name: string;
  originalText: string;
  convertedRecipe: ConvertedRecipe;
  savedAt: number;
}

const STORAGE_KEY = 'bgb_saved_recipes';

export function saveRecipe(name: string, originalText: string, convertedRecipe: ConvertedRecipe): SavedRecipe {
  try {
    const savedRecipes = getSavedRecipes();
    
    const newRecipe: SavedRecipe = {
      id: Date.now().toString(),
      name: name.trim() || `Recipe ${savedRecipes.length + 1}`,
      originalText,
      convertedRecipe,
      savedAt: Date.now()
    };
    
    savedRecipes.push(newRecipe);
    
    // Check if localStorage is available and has space
    const recipeData = JSON.stringify(savedRecipes);
    if (recipeData.length > 5000000) { // ~5MB limit
      throw new Error('Storage quota exceeded. Please delete some older recipes.');
    }
    
    localStorage.setItem(STORAGE_KEY, recipeData);
    return newRecipe;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some older recipes to make space.');
    }
    throw new Error(`Failed to save recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getSavedRecipes(): SavedRecipe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading saved recipes:', error);
    return [];
  }
}

export function deleteRecipe(id: string): void {
  try {
    const savedRecipes = getSavedRecipes();
    const filtered = savedRecipes.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw new Error(`Failed to delete recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getRecipeById(id: string): SavedRecipe | null {
  const savedRecipes = getSavedRecipes();
  return savedRecipes.find(r => r.id === id) || null;
}

export function clearAllRecipes(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recipes:', error);
    throw new Error(`Failed to clear recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
