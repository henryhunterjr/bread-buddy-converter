import { Button } from '@/components/ui/button';
import { Home, BookOpen } from 'lucide-react';

interface NavigationProps {
  onHome: () => void;
  onMyRecipes?: () => void;
}

export const Navigation = ({ onHome, onMyRecipes }: NavigationProps) => {
  return (
    <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">Baking Great Bread at Home</h1>
        <div className="flex items-center gap-2">
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
