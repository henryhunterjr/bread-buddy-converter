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
        <img src={logo} alt="Baking Great Bread at Home" className="h-16 md:h-20" />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 space-y-8 bg-background/95 backdrop-blur border-bread-medium/20">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Recipe Converter: Sourdough ↔ Yeast
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Convert any bread recipe between sourdough and instant yeast. The math is handled. You just bake.
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
      </div>
      
      <footer className="text-center py-4 text-xs text-muted-foreground">
        Copyright 2025 Henry Hunter Baking Great Bread at Home All Rights Reserved
      </footer>
    </div>
  );
}
