import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface NavigationProps {
  onHome: () => void;
}

export const Navigation = ({ onHome }: NavigationProps) => {
  return (
    <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">BGB Recipe Converter</h1>
        <Button variant="ghost" size="sm" onClick={onHome} className="gap-2">
          <Home className="h-4 w-4" />
          Home
        </Button>
      </div>
    </nav>
  );
};
