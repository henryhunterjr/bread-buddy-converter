import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail } from 'lucide-react';
import logo from '@/assets/logo.png';
import heroBanner from '@/assets/hero-banner.png';

interface LandingScreenProps {
  onSelectDirection: (direction: 'sourdough-to-yeast' | 'yeast-to-sourdough') => void;
}

export default function LandingScreen({ onSelectDirection }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex flex-col">
      {/* Hero Banner Section */}
      <div className="relative w-full h-[180px] md:h-[220px] overflow-hidden">
        <img 
          src={heroBanner} 
          alt="Baking workspace with rustic bread and baking tools" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-6 pt-4 md:pt-6">
        <div className="max-w-4xl w-full space-y-4 md:space-y-6">
          <Card className="w-full p-5 md:p-8 space-y-4 bg-background/95 backdrop-blur border-bread-medium/20 shadow-xl">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground font-serif">
                  Baking Great Bread at Home
                </h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none text-sm px-3 py-1 cursor-help">
                      BETA
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>We're testing! Found a bug? Let us know.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                Sourdough & Yeast Bread Recipe Converter
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Convert any bread recipe between commercial yeast and sourdough starter instantly with precise baker's percentages
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 md:pt-6">
                <Button
                  size="lg"
                  className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-gradient-to-r from-bread-gold to-bread-wheat hover:from-bread-wheat hover:to-bread-gold transition-all duration-300 shadow-lg hover:shadow-bread-gold/50 hover:scale-105 text-bread-earth font-semibold border-2 border-bread-earth/20"
                  onClick={() => onSelectDirection('sourdough-to-yeast')}
                >
                  Convert Sourdough → Yeast
                </Button>
                <Button
                  size="lg"
                  className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-gradient-to-r from-bread-terracotta to-bread-earth hover:from-bread-earth hover:to-bread-terracotta transition-all duration-300 shadow-lg hover:shadow-bread-terracotta/50 hover:scale-105 text-bread-cream font-semibold border-2 border-bread-cream/20"
                  onClick={() => onSelectDirection('yeast-to-sourdough')}
                >
                  Convert Yeast → Sourdough
                </Button>
              </div>
            </div>
          </Card>

          <Card className="w-full p-6 md:p-10 bg-background/95 backdrop-blur border-bread-medium/20 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">How do I convert a yeast recipe to sourdough?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Replace the commercial yeast with sourdough starter at 15-20% of the total flour weight. Adjust water and flour amounts to account for the hydration in your starter, and extend bulk fermentation time to 4-8 hours.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">How much sourdough starter equals 1 teaspoon of yeast?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Approximately 75-100g of active sourdough starter (at 100% hydration) can replace 1 teaspoon (3g) of instant yeast. The exact amount depends on your starter's activity and the recipe's total flour weight.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Can I convert any bread recipe to sourdough?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Yes! Most bread recipes can be converted to sourdough. Simple lean doughs convert easily, while enriched doughs (with butter, eggs, sugar) may require longer fermentation times due to the fats and sugars slowing down the sourdough activity.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <footer className="py-6 bg-bread-earth/5 border-t border-bread-medium/20">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-bread-medium/30 hover:bg-bread-light/50 transition-all"
          >
            <a href="mailto:henrysbreadkitchen@gmail.com?subject=Bread%20Buddy%20Beta%20Feedback">
              <Mail className="h-4 w-4 mr-2" />
              Report an Issue
            </a>
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
