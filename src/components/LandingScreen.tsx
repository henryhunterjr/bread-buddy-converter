import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import logo from '@/assets/logo.png';

interface LandingScreenProps {
  onSelectDirection: (direction: 'sourdough-to-yeast' | 'yeast-to-sourdough') => void;
}

export default function LandingScreen({ onSelectDirection }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-bread-light flex flex-col">
      <div className="p-4">
        <img src={logo} alt="Baking Great Bread at Home logo - Sourdough and Yeast Recipe Converter Tool" className="h-16 md:h-20" />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-12">
          <Card className="w-full p-8 md:p-12 space-y-8 bg-background/95 backdrop-blur border-bread-medium/20">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Sourdough & Yeast Bread Recipe Converter
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Convert any bread recipe between commercial yeast and sourdough starter instantly
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6"
                  onClick={() => onSelectDirection('sourdough-to-yeast')}
                >
                  Convert Sourdough → Yeast
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-6"
                  onClick={() => onSelectDirection('yeast-to-sourdough')}
                >
                  Convert Yeast → Sourdough
                </Button>
              </div>
            </div>
          </Card>

          <Card className="w-full p-8 md:p-10 bg-background/95 backdrop-blur border-bread-medium/20">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
            
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
      
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
