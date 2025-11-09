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
  const savedRecipes = getSavedRecipes();
  
  const newRecipe: SavedRecipe = {
    id: Date.now().toString(),
    name: name.trim() || `Recipe ${savedRecipes.length + 1}`,
    originalText,
    convertedRecipe,
    savedAt: Date.now()
  };
  
  savedRecipes.push(newRecipe);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRecipes));
  
  return newRecipe;
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
  const savedRecipes = getSavedRecipes();
  const filtered = savedRecipes.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getRecipeById(id: string): SavedRecipe | null {
  const savedRecipes = getSavedRecipes();
  return savedRecipes.find(r => r.id === id) || null;
}

export function clearAllRecipes(): void {
  localStorage.removeItem(STORAGE_KEY);
}
