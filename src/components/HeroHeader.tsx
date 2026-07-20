import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import heroBanner from '@/assets/hero-banner.webp';

interface HeroHeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  showNav?: boolean;
  onNavigate?: (route: 'home' | 'sourdough-to-yeast' | 'yeast-to-sourdough') => void;
  onSelectDirection?: (dir: 'sourdough-to-yeast' | 'yeast-to-sourdough') => void;
}

export const HeroHeader = ({
  pageTitle,
  pageSubtitle,
  showNav = true,
  onNavigate,
  onSelectDirection
}: HeroHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (route: 'home' | 'sourdough-to-yeast' | 'yeast-to-sourdough') => {
    if (route !== 'home' && onSelectDirection) {
      onSelectDirection(route);
    } else {
      onNavigate?.(route);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="w-full">
      {/* Navigation Bar */}
      {showNav && (
        <nav className="w-full bg-bread-cream/80 backdrop-blur-sm border-b border-bread-medium/30 relative z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <button 
                onClick={() => handleNavClick('home')}
                className="text-lg md:text-xl font-serif font-bold text-bread-earth hover:text-burnt-orange transition-colors"
              >
                Baking Great Bread at Home
              </button>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick('home')}
                  className="text-bread-earth hover:text-burnt-orange hover:bg-bread-light transition-all"
                >
                  Home
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick('sourdough-to-yeast')}
                  className="text-bread-earth hover:text-burnt-orange hover:bg-bread-light transition-all"
                >
                  Convert Sourdough → Yeast
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick('yeast-to-sourdough')}
                  className="text-bread-earth hover:text-burnt-orange hover:bg-bread-light transition-all"
                >
                  Convert Yeast → Sourdough
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-bread-earth hover:text-burnt-orange transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mt-4 pb-4 space-y-2 animate-fade-in">
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick('home')}
                  className="w-full justify-start text-bread-earth hover:text-burnt-orange hover:bg-bread-light transition-all"
                >
                  Home
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick('sourdough-to-yeast')}
                  className="w-full justify-start text-bread-earth hover:text-burnt-orange hover:bg-bread-light transition-all"
                >
                  Convert Sourdough → Yeast
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick('yeast-to-sourdough')}
                  className="w-full justify-start text-bread-earth hover:text-burnt-orange hover:bg-bread-light transition-all"
                >
                  Convert Yeast → Sourdough
                </Button>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <div 
        className="relative w-full h-[200px] sm:h-[280px] md:h-[340px] lg:h-[400px]"
        style={{
          backgroundImage: `url(${heroBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        role="img"
        aria-label="Warm bread baking background"
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-bread-earth/40 via-bread-earth/30 to-bread-earth/50" />
        
        {/* Hero Content */}
        <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-bread-cream mb-3 md:mb-4 drop-shadow-lg">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-sans text-bread-cream/95 max-w-3xl drop-shadow-md">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
