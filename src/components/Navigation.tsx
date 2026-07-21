import { Button } from '@/components/ui/button';
import { Home, BookOpen } from 'lucide-react';

interface NavigationProps {
  onHome: () => void;
  onMyRecipes?: () => void;
  onSelectDirection?: (dir: 'sourdough-to-yeast' | 'yeast-to-sourdough') => void;
}

export const Navigation = ({ onHome, onMyRecipes, onSelectDirection }: NavigationProps) => {
  return (
    <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground whitespace-nowrap">Bread Buddy</h1>
          <span className="hidden md:inline text-xs text-muted-foreground truncate">by Baking Great Bread at Home</span>
        </div>
        <div className="flex items-center gap-2">
          {onSelectDirection && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onSelectDirection('sourdough-to-yeast')} className="gap-2 hidden md:inline-flex">
                Convert Sourdough → Yeast
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSelectDirection('yeast-to-sourdough')} className="gap-2 hidden md:inline-flex">
                Convert Yeast → Sourdough
              </Button>
            </>
          )}
          {onMyRecipes && (
            <Button variant="ghost" size="sm" onClick={onMyRecipes} className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">My Recipes</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onHome} className="gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
